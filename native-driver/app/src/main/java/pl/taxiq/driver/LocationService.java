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
import android.os.IBinder;
import android.os.Looper;
import android.util.Log;
import android.webkit.CookieManager;

import androidx.annotation.Nullable;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationCompat;

import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationCallback;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationResult;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.Priority;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;

public class LocationService extends Service {

    private static final String TAG = "TaxiQ_Location";
    private static final int NOTIFICATION_ID = 9001;
    private static final long UPDATE_INTERVAL_MS = 5000;
    private static final long FASTEST_INTERVAL_MS = 3000;

    private FusedLocationProviderClient fusedClient;
    private LocationCallback locationCallback;
    private ScheduledExecutorService executor;

    @Override
    public void onCreate() {
        super.onCreate();
        fusedClient = LocationServices.getFusedLocationProviderClient(this);
        executor = Executors.newSingleThreadScheduledExecutor();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        startForeground(NOTIFICATION_ID, buildNotification());
        startLocationUpdates();
        Log.i(TAG, "Location service started");
        return START_STICKY;
    }

    private Notification buildNotification() {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(this, 0, notificationIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        return new NotificationCompat.Builder(this, "taxiq_location")
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
                .build();

        locationCallback = new LocationCallback() {
            @Override
            public void onLocationResult(LocationResult result) {
                Location location = result.getLastLocation();
                if (location != null) {
                    sendLocationToServer(location);
                }
            }
        };

        fusedClient.requestLocationUpdates(request, locationCallback, Looper.getMainLooper());
    }

    private void sendLocationToServer(Location location) {
        executor.execute(() -> {
            try {
                URL url = new URL("https://taxiq.com.pl/api/drivers/location");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setDoOutput(true);

                String cookies = CookieManager.getInstance().getCookie("https://taxiq.com.pl");
                if (cookies != null) {
                    conn.setRequestProperty("Cookie", cookies);
                }

                String json = String.format(
                    "{\"lat\":%f,\"lng\":%f,\"speed\":%f,\"heading\":%f,\"accuracy\":%f}",
                    location.getLatitude(),
                    location.getLongitude(),
                    location.getSpeed(),
                    location.getBearing(),
                    location.getAccuracy()
                );

                OutputStream os = conn.getOutputStream();
                os.write(json.getBytes("UTF-8"));
                os.close();

                int responseCode = conn.getResponseCode();
                if (responseCode != 200) {
                    Log.w(TAG, "Location update failed: " + responseCode);
                }
                conn.disconnect();
            } catch (Exception e) {
                Log.e(TAG, "Error sending location: " + e.getMessage());
            }
        });
    }

    @Override
    public void onDestroy() {
        if (fusedClient != null && locationCallback != null) {
            fusedClient.removeLocationUpdates(locationCallback);
        }
        if (executor != null) {
            executor.shutdown();
        }
        Log.i(TAG, "Location service stopped");
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
