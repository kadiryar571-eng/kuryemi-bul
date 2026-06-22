/* ============================================================
   KuryemiBul — webrtc.js
   In-app sesli/görüntülü arama — WebRTC + Supabase Realtime
   ============================================================ */
window.KBCall = (function () {
  'use strict';

  var ICE_SERVERS = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'turn:openrelay.metered.ca:80',              username: 'openrelayproject', credential: 'openrelayproject' },
      { urls: 'turn:openrelay.metered.ca:443',             username: 'openrelayproject', credential: 'openrelayproject' },
      { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' }
    ]
  };

  /* ── State ─────────────────────────────────────────────── */
  var _state        = 'idle'; // idle | calling | ringing | active
  var _pc           = null;
  var _sigCh        = null;   // webrtc signaling channel (broadcast)
  var _globalCh     = null;   // global incoming call listener (postgres_changes)
  var _convId       = null;
  var _callType     = 'video';
  var _callerName   = '';
  var _otherUserId  = null;
  var _localStream  = null;
  var _remoteStream = null;
  var _iceBuf       = [];     // buffered ICE candidates (before answer)
  var _answered     = false;
  var _timerItv     = null;
  var _pendingOffer = null;   // { sdp } stored until user accepts

  /* ── CSS (injected once) ────────────────────────────────── */
  function _injectCSS() {
    if (document.getElementById('kb-call-css')) return;
    var s = document.createElement('style');
    s.id = 'kb-call-css';
    s.textContent = [
      '#kb-call-overlay{position:fixed;inset:0;z-index:9999;display:none;flex-direction:column;align-items:center;justify-content:center;background:rgba(8,12,24,.97);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px)}',
      '.kbcall{display:flex;flex-direction:column;align-items:center;width:100%;height:100%;position:relative;padding:60px 24px 48px}',
      '.kbcall--active{padding:0;background:#000}',
      '.kbcall__ava{width:96px;height:96px;border-radius:50%;background:linear-gradient(135deg,#6C4DFF,#9B6DFF);display:flex;align-items:center;justify-content:center;font-size:2.4rem;font-weight:800;color:#fff;margin-bottom:20px;flex-shrink:0}',
      '.kbcall__name{font-size:1.4rem;font-weight:800;color:#fff;margin-bottom:6px;text-align:center}',
      '.kbcall__status{font-size:.85rem;color:rgba(255,255,255,.55);margin-bottom:48px;text-align:center}',
      '.kbcall--active .kbcall__name,.kbcall--active .kbcall__status{color:#fff}',
      '.kbcall__active-info{position:absolute;top:52px;left:0;right:0;text-align:center;z-index:3}',
      '.kbcall__timer{font-size:.8rem;color:rgba(255,255,255,.7);font-variant-numeric:tabular-nums}',
      '#kbcall-remote{width:100%;height:100%;object-fit:cover;position:absolute;inset:0;z-index:1;background:#111}',
      '#kbcall-local{position:absolute;bottom:120px;right:16px;width:100px;height:140px;object-fit:cover;border-radius:14px;z-index:3;border:2px solid rgba(255,255,255,.15)}',
      '.kbcall__actions{display:flex;align-items:center;justify-content:center;gap:20px}',
      '.kbcall__actions--active{position:absolute;bottom:44px;left:0;right:0;z-index:4}',
      '.kbcall__btn{width:64px;height:64px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:none;cursor:pointer;transition:transform .15s,opacity .15s}',
      '.kbcall__btn:active{transform:scale(.88)}',
      '.kbcall__btn--accept{background:#22C55E;color:#fff}',
      '.kbcall__btn--reject,.kbcall__btn--end{background:#EF4444;color:#fff;transform:rotate(135deg)}',
      '.kbcall__btn--reject:active,.kbcall__btn--end:active{transform:rotate(135deg) scale(.88)}',
      '.kbcall__btn--mute,.kbcall__btn--cam{background:rgba(255,255,255,.12);color:#fff}',
      '.kbcall__btn--mute.is-off,.kbcall__btn--cam.is-off{background:rgba(255,255,255,.06);opacity:.45}'
    ].join('');
    document.head.appendChild(s);
  }

  function _overlay() {
    var el = document.getElementById('kb-call-overlay');
    if (!el) { el = document.createElement('div'); el.id = 'kb-call-overlay'; document.body.appendChild(el); }
    return el;
  }

  var PHONE_ICON = '<svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.32.57 3.58.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.01L6.6 10.8z"/></svg>';
  var MIC_ICON   = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>';
  var CAM_ICON   = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>';

  /* ── UI renders ─────────────────────────────────────────── */
  function _showCalling(name, type) {
    var el = _overlay();
    el.innerHTML = '<div class="kbcall">' +
      '<div class="kbcall__ava">' + (name ? name[0].toUpperCase() : '?') + '</div>' +
      '<div class="kbcall__name">' + _esc(name) + '</div>' +
      '<div class="kbcall__status">' + (type === 'video' ? '📹 Görüntülü aranıyor…' : '🔊 Sesli aranıyor…') + '</div>' +
      '<div class="kbcall__actions">' +
        '<button class="kbcall__btn kbcall__btn--end" onclick="KBCall.hangup()">' + PHONE_ICON + '</button>' +
      '</div>' +
    '</div>';
    el.style.display = 'flex';
  }

  function _showIncoming(name, type) {
    var el = _overlay();
    el.innerHTML = '<div class="kbcall">' +
      '<div class="kbcall__ava">' + (name ? name[0].toUpperCase() : '?') + '</div>' +
      '<div class="kbcall__name">' + _esc(name) + '</div>' +
      '<div class="kbcall__status">' + (type === 'video' ? '📹 Görüntülü arama' : '🔊 Sesli arama') + '</div>' +
      '<div class="kbcall__actions">' +
        '<button class="kbcall__btn kbcall__btn--reject" onclick="KBCall.reject()">' + PHONE_ICON + '</button>' +
        '<button class="kbcall__btn kbcall__btn--accept" onclick="KBCall.accept()">' + PHONE_ICON + '</button>' +
      '</div>' +
    '</div>';
    el.style.display = 'flex';
  }

  function _showActive(name, type) {
    var hasVideo = type === 'video';
    var el = _overlay();
    el.innerHTML = '<div class="kbcall kbcall--active">' +
      (hasVideo ? '<video id="kbcall-remote" autoplay playsinline></video>' : '<div style="position:absolute;inset:0;background:#181c2e;z-index:1;display:flex;align-items:center;justify-content:center"><div style="font-size:4rem">' + (name ? name[0].toUpperCase() : '?') + '</div></div>') +
      (hasVideo ? '<video id="kbcall-local" autoplay playsinline muted></video>' : '') +
      '<div class="kbcall__active-info">' +
        '<div class="kbcall__name">' + _esc(name) + '</div>' +
        '<div class="kbcall__status kbcall__timer" id="kbcall-timer">00:00</div>' +
      '</div>' +
      '<div class="kbcall__actions kbcall__actions--active">' +
        '<button class="kbcall__btn kbcall__btn--mute" id="kbcall-mute-btn" onclick="KBCall.toggleMute()" title="Mikrofon">' + MIC_ICON + '</button>' +
        (hasVideo ? '<button class="kbcall__btn kbcall__btn--cam" id="kbcall-cam-btn" onclick="KBCall.toggleCam()" title="Kamera">' + CAM_ICON + '</button>' : '') +
        '<button class="kbcall__btn kbcall__btn--end" onclick="KBCall.hangup()">' + PHONE_ICON + '</button>' +
      '</div>' +
    '</div>';
    el.style.display = 'flex';

    if (hasVideo) {
      var rv = document.getElementById('kbcall-remote');
      var lv = document.getElementById('kbcall-local');
      if (rv && _remoteStream) rv.srcObject = _remoteStream;
      if (lv && _localStream)  lv.srcObject = _localStream;
    }

    var secs = 0;
    _timerItv = setInterval(function () {
      secs++;
      var m = Math.floor(secs / 60), s = secs % 60;
      var el2 = document.getElementById('kbcall-timer');
      if (el2) el2.textContent = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
    }, 1000);
  }

  function _hideUI() { var el = document.getElementById('kb-call-overlay'); if (el) el.style.display = 'none'; }
  function _esc(s) { return String(s || '').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  /* ── Signaling channel (broadcast, per-conv) ────────────── */
  function _openSig(convId) {
    if (_sigCh) { try { _sigCh.unsubscribe(); } catch (e) {} }
    _sigCh = SB.openChannel('kb-webrtc-' + convId);
    _sigCh.on('broadcast', { event: 'sig' }, function (p) { _onSig(p.payload); }).subscribe();
  }

  function _sig(type, data) {
    if (!_sigCh) return;
    _sigCh.send({ type: 'broadcast', event: 'sig', payload: { type: type, data: data || {} } });
  }

  function _onSig(msg) {
    if (!msg || !msg.type) return;
    if (msg.type === 'answer' && _pc) {
      _pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: msg.data.sdp }))
        .then(function () {
          _answered = true;
          _iceBuf.forEach(function (c) { _sig('ice', { candidate: c }); });
          _iceBuf = [];
        }).catch(function (e) { console.warn('setRemoteDesc answer:', e); });

    } else if (msg.type === 'ice' && _pc) {
      _pc.addIceCandidate(new RTCIceCandidate(msg.data.candidate)).catch(function () {});

    } else if (msg.type === 'end' || msg.type === 'reject') {
      _cleanup();
    }
  }

  /* ── RTCPeerConnection ──────────────────────────────────── */
  function _createPC() {
    _pc = new RTCPeerConnection(ICE_SERVERS);

    _pc.onicecandidate = function (e) {
      if (!e.candidate) return;
      var c = e.candidate.toJSON();
      if (_answered) { _sig('ice', { candidate: c }); }
      else            { _iceBuf.push(c); }
    };

    _pc.ontrack = function (e) {
      _remoteStream = e.streams[0];
      var rv = document.getElementById('kbcall-remote');
      if (rv) rv.srcObject = _remoteStream;
    };

    _pc.onconnectionstatechange = function () {
      if (_pc.connectionState === 'connected' && _state !== 'active') {
        _state = 'active';
        _showActive(_callerName, _callType);
      } else if (_pc.connectionState === 'failed' || _pc.connectionState === 'disconnected') {
        _cleanup();
      }
    };
  }

  async function _getMedia(video) {
    try {
      _localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: video ? { facingMode: 'user' } : false });
    } catch (e) {
      if (video) {
        _localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        _callType = 'audio';
      } else throw e;
    }
  }

  /* ── Global incoming call listener (postgres_changes) ─────  */
  function _startGlobal() {
    if (!window.SB || !SB.isOn()) return;
    if (_globalCh) { try { _globalCh.unsubscribe(); } catch (e) {} }
    _globalCh = SB.openChannel('kb-call-global-' + Date.now())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conv_messages', filter: 'message_type=eq.webrtc_call' },
        function (p) {
          var row = p.new;
          if (!row) return;
          var meta = row.metadata || {};
          /* ignore if I'm the sender */
          var myId = window.APP && APP.user && APP.user.id;
          if (row.sender_user === myId) return;
          if (_state !== 'idle') return;
          _convId       = row.conversation_id;
          _callerName   = meta.callerName || 'Arayan';
          _callType     = meta.callType  || 'video';
          _pendingOffer = meta.offerSdp  ? { sdp: meta.offerSdp } : null;
          _state        = 'ringing';
          _openSig(_convId);
          _showIncoming(_callerName, _callType);
        })
      .subscribe();
  }

  /* ── Public API ─────────────────────────────────────────── */
  async function startCall(convId, otherName, type) {
    if (_state !== 'idle') return;
    if (!window.SB || !SB.isOn()) {
      if (typeof KBMotion !== 'undefined') KBMotion.showErrorToast('Çevrimiçi değilsiniz');
      return;
    }

    _convId      = convId;
    _callerName  = otherName || 'Kullanıcı';
    _callType    = type || 'video';
    _answered    = false;
    _iceBuf      = [];
    _state       = 'calling';

    try { await _getMedia(_callType === 'video'); }
    catch (e) {
      if (typeof KBMotion !== 'undefined') KBMotion.showErrorToast('Mikrofon/kamera erişimi reddedildi');
      _state = 'idle'; return;
    }

    _openSig(convId);
    _showCalling(otherName, _callType);
    _createPC();
    _localStream.getTracks().forEach(function (t) { _pc.addTrack(t, _localStream); });

    _pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: _callType === 'video' })
      .then(function (offer) {
        return _pc.setLocalDescription(offer).then(function () { return offer; });
      })
      .then(function (offer) {
        var myProfile = window.APP && APP.profile;
        var myName = (myProfile && (myProfile.ad || myProfile.company_name || myProfile.business_name)) || 'Arayan';
        return SB.sendConvMessage(convId, 'Arama başlatıldı', 'webrtc_call', {
          callType: _callType, callerName: myName, offerSdp: offer.sdp
        });
      })
      .catch(function (e) { console.warn('startCall offer:', e); _cleanup(); });

    setTimeout(function () { if (_state === 'calling') _cleanup(); }, 60000);
  }

  async function accept() {
    if (_state !== 'ringing') return;
    _state = 'active';

    try { await _getMedia(_callType === 'video'); }
    catch (e) {
      if (typeof KBMotion !== 'undefined') KBMotion.showErrorToast('Mikrofon/kamera erişimi reddedildi');
      reject(); return;
    }

    _createPC();
    _localStream.getTracks().forEach(function (t) { _pc.addTrack(t, _localStream); });

    var offerSdp = _pendingOffer && _pendingOffer.sdp;
    _pendingOffer = null;

    if (!offerSdp) {
      /* offer delayed — wait up to 10s for caller to send it via sig channel */
      var waited = 0;
      var wait = setInterval(function () {
        waited += 300;
        if (_pendingOffer) { clearInterval(wait); _doAnswer(_pendingOffer.sdp); }
        else if (waited > 10000) { clearInterval(wait); _cleanup(); }
      }, 300);
      return;
    }
    _doAnswer(offerSdp);
  }

  function _doAnswer(offerSdp) {
    _pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: offerSdp }))
      .then(function () { return _pc.createAnswer(); })
      .then(function (answer) {
        return _pc.setLocalDescription(answer).then(function () { return answer; });
      })
      .then(function (answer) {
        _answered = true;
        _sig('answer', { sdp: answer.sdp });
        _iceBuf.forEach(function (c) { _sig('ice', { candidate: c }); });
        _iceBuf = [];
      })
      .catch(function (e) { console.warn('accept answer:', e); _cleanup(); });
  }

  function reject() {
    _sig('reject', {});
    _cleanup();
  }

  function hangup() {
    _sig('end', {});
    _cleanup();
  }

  function toggleMute() {
    if (!_localStream) return;
    var tracks = _localStream.getAudioTracks();
    tracks.forEach(function (t) { t.enabled = !t.enabled; });
    var off = tracks.length && !tracks[0].enabled;
    var btn = document.getElementById('kbcall-mute-btn');
    if (btn) btn.classList.toggle('is-off', off);
  }

  function toggleCam() {
    if (!_localStream) return;
    var tracks = _localStream.getVideoTracks();
    tracks.forEach(function (t) { t.enabled = !t.enabled; });
    var off = tracks.length && !tracks[0].enabled;
    var btn = document.getElementById('kbcall-cam-btn');
    if (btn) btn.classList.toggle('is-off', off);
  }

  function _cleanup() {
    _state = 'idle';
    _pendingOffer = null;
    _answered = false;
    _iceBuf = [];
    if (_timerItv) { clearInterval(_timerItv); _timerItv = null; }
    if (_localStream)  { _localStream.getTracks().forEach(function (t) { t.stop(); }); _localStream = null; }
    if (_remoteStream) { _remoteStream.getTracks().forEach(function (t) { t.stop(); }); _remoteStream = null; }
    if (_pc)    { try { _pc.close(); } catch (e) {} _pc = null; }
    if (_sigCh) { try { _sigCh.unsubscribe(); } catch (e) {} _sigCh = null; }
    _hideUI();
  }

  /* ── Init ────────────────────────────────────────────────── */
  function _init() {
    _injectCSS();
    /* Wait for SB to be ready, then start global listener */
    var t = setInterval(function () {
      if (window.SB && SB.isOn() && window.APP && APP.user) {
        clearInterval(t);
        _startGlobal();
      }
    }, 1500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }

  return {
    startCall  : startCall,
    accept     : accept,
    reject     : reject,
    hangup     : hangup,
    toggleMute : toggleMute,
    toggleCam  : toggleCam
  };
})();
