package pl.taxiq.driver;

import android.content.Intent;
import android.webkit.JavascriptInterface;

public class NativeBridge {

    private final MainActivity activity;

    public NativeBridge(MainActivity activity) {
        this.activity = activity;
    }

    @JavascriptInterface
    public void startLocationService() {
        Intent intent = new Intent(activity, LocationService.class);
        activity.startForegroundService(intent);
    }

    @JavascriptInterface
    public void stopLocationService() {
        Intent intent = new Intent(activity, LocationService.class);
        activity.stopService(intent);
    }

    @JavascriptInterface
    public String getPlatform() {
        return "android-native";
    }

    @JavascriptInterface
    public String getAppVersion() {
        return "1.1.0";
    }
}
