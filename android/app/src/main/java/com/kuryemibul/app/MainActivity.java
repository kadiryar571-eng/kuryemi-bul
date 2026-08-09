package com.kuryemibul.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Yerel eklentiler köprü kurulmadan ÖNCE kaydedilmeli.
        // CallAudio: sesli aramada sesi hoparlör yerine kulaklık hoparlörüne
        // yönlendirir (bkz. CallAudioPlugin).
        registerPlugin(CallAudioPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
