package com.kuryemibul.app;

import android.content.Context;
import android.media.AudioDeviceInfo;
import android.media.AudioManager;
import android.os.Build;
import android.os.PowerManager;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.List;

/**
 * CallAudio — sesli/görüntülü arama sırasında ses yönlendirmesi.
 *
 * NEDEN YERLİ KOD GEREKİYOR
 * WebView sesi varsayılan olarak medya akışından (STREAM_MUSIC) çalar; bu da
 * hoparlöre gider. Sesli aramada telefonu kulağa götürmek işe yaramaz, ses
 * hoparlörden çıkmaya devam eder. Kulaklık hoparlörüne (earpiece) geçmek için
 * AudioManager'ın MODE_IN_COMMUNICATION moduna alınması gerekir ve bu moda
 * JavaScript'ten erişilemez — WebRTC API'si ses yönlendirmesini kontrol etmez.
 *
 * NE YAPAR
 *   start({ speaker })  ses modunu aramaya alır, çıkışı seçer ve kulaklık
 *                       modunda yakınlık sensörünü devreye sokar
 *   setSpeaker({ on })  arama sürerken hoparlör/kulaklık arası geçiş
 *   stop()              önceki ses modunu ve çıkışı geri yükler
 *
 * İKİ AYRI YÖNLENDİRME YOLU
 * Android 12 (API 31) ile setSpeakerphoneOn kullanımdan kaldırıldı; yerine
 * setCommunicationDevice geldi. Eski çağrı bazı Android 12+ cihazlarda
 * sessizce etkisiz kalıyor — yani ses hoparlörde kalmaya devam ediyor.
 * Bu yüzden API 31+ için yeni yol kullanılıyor, altındaki sürümlerde ve
 * istenen çıkış bulunamazsa eski yola düşülüyor.
 *
 * YAKINLIK SENSÖRÜ
 * Telefon kulağa götürüldüğünde ekranı kapatır. Bunsuz yanak ekrana değip
 * "kapat" butonuna basabiliyor. Yalnız kulaklık modunda açılır; hoparlörde
 * ya da görüntülü aramada ekranın kapanması istenmez.
 */
@CapacitorPlugin(name = "CallAudio")
public class CallAudioPlugin extends Plugin {

    private AudioManager audioManager;
    private PowerManager.WakeLock proximityLock;

    /** Aramadan önceki durum — stop() ile aynen geri yüklenir. */
    private int previousMode = AudioManager.MODE_NORMAL;
    private boolean previousSpeaker = false;
    private boolean active = false;

    private AudioManager am() {
        if (audioManager == null) {
            audioManager = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
        }
        return audioManager;
    }

    @PluginMethod
    public void start(PluginCall call) {
        boolean speaker = Boolean.TRUE.equals(call.getBoolean("speaker", false));
        try {
            AudioManager m = am();
            if (m == null) { call.reject("AudioManager yok"); return; }

            if (!active) {
                previousMode = m.getMode();
                previousSpeaker = m.isSpeakerphoneOn();
                active = true;
            }

            // Aramaya özgü mod: ses akışı VOICE_CALL'a taşınır, yankı/kazanç
            // işleme devreye girer ve kulaklık hoparlörü kullanılabilir olur.
            m.setMode(AudioManager.MODE_IN_COMMUNICATION);
            route(m, speaker);
            applyProximity(!speaker);
            call.resolve();
        } catch (Exception e) {
            call.reject("ses modu ayarlanamadi: " + e.getMessage());
        }
    }

    @PluginMethod
    public void setSpeaker(PluginCall call) {
        boolean on = Boolean.TRUE.equals(call.getBoolean("on", false));
        try {
            AudioManager m = am();
            if (m == null) { call.reject("AudioManager yok"); return; }
            route(m, on);
            applyProximity(!on);
            call.resolve();
        } catch (Exception e) {
            call.reject("hoparlor degistirilemedi: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        try {
            releaseProximity();
            restore();
            call.resolve();
        } catch (Exception e) {
            active = false;
            call.reject("eski ses modu geri yuklenemedi: " + e.getMessage());
        }
    }

    /* ── Ses çıkışı seçimi ─────────────────────────────────────────────── */

    private void route(AudioManager m, boolean speaker) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            int want = speaker
                    ? AudioDeviceInfo.TYPE_BUILTIN_SPEAKER
                    : AudioDeviceInfo.TYPE_BUILTIN_EARPIECE;
            try {
                List<AudioDeviceInfo> devices = m.getAvailableCommunicationDevices();
                for (AudioDeviceInfo d : devices) {
                    if (d.getType() == want) {
                        m.setCommunicationDevice(d);
                        return;
                    }
                }
                // İstenen çıkış yoksa (ör. tablette kulaklık hoparlörü yok)
                // eski yola düşülür.
            } catch (Exception ignored) { }
        }
        setSpeakerLegacy(m, speaker);
    }

    @SuppressWarnings("deprecation")
    private void setSpeakerLegacy(AudioManager m, boolean speaker) {
        m.setSpeakerphoneOn(speaker);
    }

    @SuppressWarnings("deprecation")
    private void restore() {
        AudioManager m = am();
        if (m == null || !active) { active = false; return; }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            try { m.clearCommunicationDevice(); } catch (Exception ignored) { }
        }
        m.setSpeakerphoneOn(previousSpeaker);
        m.setMode(previousMode);
        active = false;
    }

    /* ── Yakınlık sensörü ──────────────────────────────────────────────── */

    private void applyProximity(boolean enable) {
        if (enable) acquireProximity(); else releaseProximity();
    }

    private void acquireProximity() {
        try {
            if (proximityLock != null && proximityLock.isHeld()) return;
            PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
            if (pm == null) return;
            // Bu kilit türü her cihazda desteklenmiyor; desteklenmiyorsa
            // sessizce vazgeçiyoruz — arama yine de çalışır.
            if (!pm.isWakeLockLevelSupported(PowerManager.PROXIMITY_SCREEN_OFF_WAKE_LOCK)) return;
            proximityLock = pm.newWakeLock(
                    PowerManager.PROXIMITY_SCREEN_OFF_WAKE_LOCK, "KuryemiBul:call");
            proximityLock.acquire(60 * 60 * 1000L); // güvenlik tavanı: 1 saat
        } catch (Exception ignored) { }
    }

    private void releaseProximity() {
        try {
            if (proximityLock != null && proximityLock.isHeld()) proximityLock.release();
        } catch (Exception ignored) {
        } finally {
            proximityLock = null;
        }
    }

    /** Uygulama kapanırken ses modu aramada takılı kalmasın. */
    @Override
    protected void handleOnDestroy() {
        try {
            releaseProximity();
            restore();
        } catch (Exception ignored) { }
        super.handleOnDestroy();
    }
}
