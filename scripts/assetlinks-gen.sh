#!/usr/bin/env bash
#
# assetlinks.json üretir — Android App Links doğrulaması için.
#
# Release keystore'un SHA-256 parmak izini okur ve
# .well-known/assetlinks.json dosyasına yazar.
#
# Kullanım:  bash scripts/assetlinks-gen.sh
# Parolayı sorar; hiçbir yere kaydetmez.

set -euo pipefail

KEYSTORE="android/app/release.keystore"
ALIAS="${KEY_ALIAS:-kuryemibul}"
OUT=".well-known/assetlinks.json"
PKG="com.kuryemibul.app"

BOLD=$(tput bold 2>/dev/null || echo ""); RESET=$(tput sgr0 2>/dev/null || echo "")
GREEN=$(tput setaf 2 2>/dev/null || echo ""); RED=$(tput setaf 1 2>/dev/null || echo "")

find_keytool() {
  if command -v keytool >/dev/null 2>&1; then command -v keytool; return; fi
  local c=(
    "/c/Program Files/Android/Android Studio/jbr/bin/keytool.exe"
    "/c/Program Files/Android/Android Studio/jre/bin/keytool.exe"
    "/c/Program Files/Java/jdk-17/bin/keytool.exe"
  )
  [[ -n "${JAVA_HOME:-}" ]] && c+=("$JAVA_HOME/bin/keytool" "$JAVA_HOME/bin/keytool.exe")
  for k in "${c[@]}"; do [[ -x "$k" ]] && { printf '%s' "$k"; return; }; done
  return 1
}

printf '\n%s  assetlinks.json üretici%s\n\n' "$BOLD" "$RESET"

[[ -f "$KEYSTORE" ]] || { printf '%s  ✗ %s bulunamadı. Önce scripts/keystore-setup.sh çalıştırın.%s\n' "$RED" "$KEYSTORE" "$RESET"; exit 1; }

KEYTOOL=$(find_keytool) || { printf '%s  ✗ keytool bulunamadı%s\n' "$RED" "$RESET"; exit 1; }
printf '  keytool : %s\n' "$KEYTOOL"
printf '  keystore: %s\n' "$KEYSTORE"
printf '  alias   : %s\n\n' "$ALIAS"

printf '  %sAnahtar deposu parolası:%s ' "$BOLD" "$RESET"
read -rs KS_PASS
printf '\n\n'

# Parmak izini çek
LISTING=$("$KEYTOOL" -list -v -keystore "$KEYSTORE" -alias "$ALIAS" -storepass "$KS_PASS" 2>/dev/null) || {
  printf '%s  ✗ Parola yanlış veya alias bulunamadı.%s\n' "$RED" "$RESET"; exit 1;
}

FP=$(printf '%s' "$LISTING" | grep -i 'SHA256:' | head -1 | sed 's/.*SHA256:[[:space:]]*//' | tr -d '[:space:]' | tr 'a-f' 'A-F')

if [[ -z "$FP" ]] || [[ ${#FP} -lt 90 ]]; then
  printf '%s  ✗ SHA-256 parmak izi okunamadı.%s\n' "$RED" "$RESET"; exit 1
fi

printf '  %s✓%s SHA-256: %s\n\n' "$GREEN" "$RESET" "$FP"

mkdir -p .well-known
cat > "$OUT" <<JSON
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "$PKG",
      "sha256_cert_fingerprints": [
        "$FP"
      ]
    }
  }
]
JSON

printf '  %s✓%s yazıldı: %s\n\n' "$GREEN" "$RESET" "$OUT"
cat "$OUT" | sed 's/^/    /'

cat <<'NOTE'

  SONRAKİ ADIMLAR
  ---------------
  1) Bu dosyayı canlıya alın (git push) — APK derlenmeden ÖNCE yayında olmalı.
     Doğrulama:  curl https://kuryemibul.com/.well-known/assetlinks.json

  2) Supabase → Authentication → URL Configuration → Redirect URLs'e ekleyin:
       https://kuryemibul.com/auth-callback.html

  3) APK'yı derleyin, cihaza kurun ve doğrulamayı kontrol edin:
       adb shell pm get-app-links com.kuryemibul.app
     "verified" görmelisiniz.

  PLAY APP SIGNING KULLANIRSANIZ
  ------------------------------
  Google APK'yı KENDİ anahtarıyla yeniden imzalar; parmak izi değişir.
  Play Console → Setup → App integrity → App signing key certificate
  altındaki SHA-256'yı da bu dosyadaki diziye EKLEYİN (ikisi bir arada durur).

NOTE
