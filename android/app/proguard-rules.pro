# ============================================================
# KuryemiBul — R8 / ProGuard kuralları
# minifyEnabled true ile birlikte kullanılır.
# ============================================================

# --- Capacitor köprüsü ---------------------------------------
# Capacitor plugin metotları JS tarafından REFLECTION ile çağrılır.
# Bunlar obfuscate edilirse köprü sessizce kırılır (Camera, Geolocation,
# Push vb. çalışmaz ama derleme başarılı görünür).
-keep class com.getcapacitor.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keep class * extends com.getcapacitor.Plugin { *; }
-keepclassmembers class * extends com.getcapacitor.Plugin {
    @com.getcapacitor.PluginMethod public <methods>;
}

# Cordova uyumluluk katmanı (capacitor-cordova-android-plugins)
-keep class org.apache.cordova.** { *; }

# Uygulamanın kendi plugin/aktivite sınıfları
-keep class com.kuryemibul.app.** { *; }

# --- WebView JavaScript arayüzü ------------------------------
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# --- Firebase / Push -----------------------------------------
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.**

# --- Genel ---------------------------------------------------
# Anotasyonlar reflection için gerekli
-keepattributes *Annotation*, Signature, InnerClasses, EnclosingMethod

# Crash raporlarının okunabilir kalması için satır numaralarını koru,
# ama orijinal dosya adını gizle.
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Release'te log çağrılarını tamamen kaldır (bilgi sızıntısı önlemi)
-assumenosideeffects class android.util.Log {
    public static *** d(...);
    public static *** v(...);
    public static *** i(...);
}
