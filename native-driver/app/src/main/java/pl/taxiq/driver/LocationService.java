package pl.taxiq.driver;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.location.Location;
import android.os.Build;
import android.os.Handler;
import android.os.HandlerThread;
import android.os.IBinder;
import android.os.Looper;
import android.util.Log;
import android.webkit.CookieManager;
import android.webkit.WebView;

import androidx.annotation.Nullable;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationCompat;

import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationCallback;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationResult;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.Priority;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.lang.ref.WeakReference;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Locale;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

public class LocationService extends Service {

    private static final String TAG = "TaxiQ_Location";
    private static final int NOTIFICATION_ID = 9001;
    private static final long UPDATE_INTERVAL_MS = 5000;
    private static final long FASTEST_INTERVAL_MS = 3000;

    private static WeakReference<WebView> webViewRef;

    public static void setWebView(WebView webView) {
        webViewRef = new WeakReference<>(webView);
    }

    private FusedLocationProviderClient fusedClient;
    private LocationCallback locationCallback;
    private HandlerThread locationThread;
    private ScheduledExecutorService executor;
    private String driverId = null;
    private volatile long lastLocationCallbackTime = 0;

    @Override
    public void onCreate() {
        super.onCreate();
        Log.i(TAG, "[GPS] service onCreate");
        fusedClient = LocationServices.getFusedLocationProviderClient(this);
        executor = Executors.newSingleThreadScheduledExecutor();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.i(TAG, "[GPS] service onStartCommand");
        startForeground(NOTIFICATION_ID, buildNotification());
        Log.i(TAG, "[GPS] startForeground ACTIVE");
        executor.execute(this::fetchDriverId);
        startLocationUpdates();
        lastLocationCallbackTime = System.currentTimeMillis();
        executor.scheduleAtFixedRate(() -> {
            long elapsed = System.currentTimeMillis() - lastLocationCallbackTime;
            if (elapsed > 15000) {
                Log.e(TAG, "[GPS] NO LOCATION CALLBACK >" + elapsed + "ms");
            }
        }, 15, 15, TimeUnit.SECONDS);
        return START_STICKY;
    }

    private void fetchDriverId() {
        try {
            URL url = new URL("https://taxiq.com.pl/api/drivers/session");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setRequestProperty("Content-Type", "application/json");

            String cookies = CookieManager.getInstance().getCookie("https://taxiq.com.pl");
            if (cookies != null) {
                conn.setRequestProperty("Cookie", cookies);
            }

            int code = conn.getResponseCode();
            if (code == 200) {
                BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) sb.append(line);
                reader.close();

                JSONObject json = new JSONObject(sb.toString());
                if (json.has("id")) {
                    driverId = json.getString("id");
                    Log.i(TAG, "[GPS] fetched driverId=" + driverId);
                } else {
                    Log.w(TAG, "[GPS] session response has no 'id' field");
                }
            } else {
                Log.w(TAG, "fetchDriverId failed: HTTP " + code);
            }
            conn.disconnect();
        } catch (Exception e) {
            Log.e(TAG, "fetchDriverId error: " + e.getMessage());
        }
    }

    private Notification buildNotification() {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(this, 0, notificationIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        return new NotificationCompat.Builder(this, "taxiq_location_2")
                .setContentTitle("TaxiQ Kierowca")
                .setContentText("Śledzenie lokalizacji aktywne")
                .setSmallIcon(android.R.drawable.ic_menu_mylocation)
                .setContentIntent(pendingIntent)
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .build();
    }

    private void startLocationUpdates() {
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
                != PackageManager.PERMISSION_GRANTED) {
            Log.w(TAG, "No location permission");
            stopSelf();
            return;
        }

        LocationRequest request = new LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, UPDATE_INTERVAL_MS)
                .setMinUpdateIntervalMillis(FASTEST_INTERVAL_MS)
                .setWaitForAccurateLocation(false)
                .setMaxUpdateDelayMillis(10000)
                .build();

        locationCallback = new LocationCallback() {
            @Override
            public void onLocationResult(LocationResult result) {
                if (result == null) return;

                Location location = result.getLastLocation();
                if (location == null) return;

                lastLocationCallbackTime = System.currentTimeMillis();
                Log.i(TAG, "[GPS] location callback lat=" + String.format(Locale.US, "%.6f", location.getLatitude())
                    + " lng=" + String.format(Locale.US, "%.6f", location.getLongitude())
                    + " acc=" + String.format(Locale.US, "%.1f", location.getAccuracy()));

                long ageMs = System.currentTimeMillis() - location.getTime();

                if (ageMs > 30000) {
                    Log.w(TAG, "Stale location ignored: age=" + ageMs);
                    return;
                }

                if (location.getAccuracy() > 150) {
                    Log.w(TAG, "Low accuracy ignored: " + location.getAccuracy());
                    return;
                }

                Log.d(TAG, "GPS OK lat=" + location.getLatitude() +
                        " age=" + ageMs +
                        " acc=" + location.getAccuracy());

                sendLocationToServer(location);
            }
        };

        locationThread = new HandlerThread("TaxiQ_LocationThread");
        locationThread.start();
        fusedClient.requestLocationUpdates(request, locationCallback, locationThread.getLooper());
    }

    private void sendLocationToServer(Location location) {
        executor.execute(() -> {
            boolean success = attemptSendLocation(location);
            if (!success) {
                try {
                    Thread.sleep(3000);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    return;
                }
                Log.d(TAG, "Retrying location send after 401...");
                attemptSendLocation(location);
            }
        });
    }

    private boolean attemptSendLocation(Location location) {
        Log.i(TAG, "[GPS] attemptSendLocation start");
        if (driverId == null) {
            Log.w(TAG, "[GPS] driverId unknown — fetching from session...");
            fetchDriverId();
            if (driverId == null) {
                Log.e(TAG, "[GPS] driverId still null after session fetch — cannot send location");
                return false;
            }
        }

        try {
            CookieManager.getInstance().flush();

            String json = String.format(Locale.US,
                "{\"lat\":%.6f,\"lng\":%.6f,\"speed\":%.6f,\"heading\":%.6f,\"accuracy\":%.6f,\"source\":\"native\"}",
                location.getLatitude(),
                location.getLongitude(),
                location.getSpeed(),
                location.getBearing(),
                location.getAccuracy()
            );

            byte[] bodyBytes = json.getBytes("UTF-8");

            Log.i(TAG, "[GPS] PATCH start lat=" + String.format(Locale.US, "%.6f", location.getLatitude())
                + " lng=" + String.format(Locale.US, "%.6f", location.getLongitude())
                + " bodyLen=" + bodyBytes.length);

            URL url = new URL("https://taxiq.com.pl/api/drivers/" + driverId.trim() + "/location");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("PATCH");
            conn.setFixedLengthStreamingMode(bodyBytes.length);
            conn.setRequestProperty("Content-Length", String.valueOf(bodyBytes.length));
            conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
            conn.setDoOutput(true);

            String cookies = CookieManager.getInstance().getCookie("https://taxiq.com.pl");
            if (cookies != null) {
                conn.setRequestProperty("Cookie", cookies);
            }

            OutputStream os = conn.getOutputStream();
            os.write(bodyBytes);
            os.flush();
            os.close();

            int responseCode = conn.getResponseCode();

            if (responseCode >= 400) {
                try {
                    java.io.InputStream errStream = conn.getErrorStream();
                    if (errStream != null) {
                        BufferedReader br = new BufferedReader(new InputStreamReader(errStream));
                        StringBuilder errBody = new StringBuilder();
                        String line;
                        while ((line = br.readLine()) != null) errBody.append(line);
                        br.close();
                        Log.e(TAG, "PATCH error body=" + errBody.toString());
                    }
                } catch (Exception ignored) {}
            }

            conn.disconnect();

            Log.i(TAG, "[GPS] PATCH response code=" + responseCode);

            if (responseCode == 200) {
                WebView webView = webViewRef != null ? webViewRef.get() : null;
                if (webView != null) {
                    new Handler(Looper.getMainLooper()).post(() ->
                        webView.evaluateJavascript(
                            "window.__renewNativeGps && window.__renewNativeGps();", null
                        )
                    );
                }
                return true;
            } else if (responseCode == 401) {
                Log.w(TAG, "[GPS] location PATCH 401 — session expired, will retry after 3s");
                return false;
            } else {
                Log.e(TAG, "[GPS] location PATCH unexpected code=" + responseCode);
                return true;
            }
        } catch (Exception e) {
            Log.e(TAG, "[GPS] location PATCH error: " + e.getMessage());
            return true;
        }
    }

    @Override
    public void onDestroy() {
        if (fusedClient != null && locationCallback != null) {
            fusedClient.removeLocationUpdates(locationCallback);
        }
        if (locationThread != null) {
            locationThread.quitSafely();
        }
        if (executor != null) {
            executor.shutdown();
        }
        Log.e(TAG, "[GPS] SERVICE DESTROYED");
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
