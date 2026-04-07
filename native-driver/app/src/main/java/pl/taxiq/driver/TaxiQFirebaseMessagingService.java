package pl.taxiq.driver;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

public class TaxiQFirebaseMessagingService extends FirebaseMessagingService {

    private static final String TAG = "TaxiQ_FCM";
    private static final String PREFS_NAME = "TaxiQDriverPrefs";
    private static final String PREF_FCM_TOKEN = "fcm_token";
    private static final String PREF_TOKEN_SENT = "fcm_token_sent";

    private static final String CHANNEL_PHONE_ORDER = "taxiq_phone_order_2";
    private static final String CHANNEL_RIDES = "taxiq_rides_2";
    private static final String CHANNEL_CITO = "taxiq_cito_2";
    private static final String CHANNEL_MESSAGES = "taxiq_messages_2";
    private static final String CHANNEL_INFO = "taxiq_info_2";
    private static final String CHANNEL_SELECTED = "taxiq_selected_driver_alert";

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        Log.d(TAG, "Message received from: " + remoteMessage.getFrom());
        Log.d(TAG, "[FCM-DUMP] data=" + remoteMessage.getData());
        Log.d(TAG, "[FCM-DUMP] notificationTitle=" + (remoteMessage.getNotification() != null ? remoteMessage.getNotification().getTitle() : "null"));
        Log.d(TAG, "[FCM-DUMP] notificationBody=" + (remoteMessage.getNotification() != null ? remoteMessage.getNotification().getBody() : "null"));

        String title = "TaxiQ";
        String body = "Nowe zlecenie";

        if (remoteMessage.getNotification() != null) {
            title = remoteMessage.getNotification().getTitle() != null ? remoteMessage.getNotification().getTitle() : title;
            body = remoteMessage.getNotification().getBody() != null ? remoteMessage.getNotification().getBody() : body;
        }

        if (remoteMessage.getData().containsKey("title")) {
            title = remoteMessage.getData().get("title");
        }
        if (remoteMessage.getData().containsKey("body")) {
            body = remoteMessage.getData().get("body");
        }

        String type = remoteMessage.getData().get("type");
        String channelId = remoteMessage.getData().get("channelId");

        Log.d(TAG, "[FCM-SELECTED] data=" + remoteMessage.getData().toString());
        Log.d(TAG, "[FCM-SELECTED] type=" + type);
        Log.d(TAG, "[FCM-SELECTED] channelId=" + channelId);
        Log.d(TAG, "[FCM-SELECTED] title=" + title);
        Log.d(TAG, "[FCM-SELECTED] body=" + body);

        if ("preferred_driver_selected".equals(type)) {
            String rideId = remoteMessage.getData().get("rideId");
            String driverId = remoteMessage.getData().get("driverId");
            String offerExpiresAt = remoteMessage.getData().get("offerExpiresAt");
            Log.d(TAG, "[FCM-SELECTED] preferred_driver_selected received: rideId=" + rideId + ", expiresAt=" + offerExpiresAt);
            Log.d(TAG, "[FCM-SELECTED] entering showSelectedDriverAlert");
            showSelectedDriverAlert(title, body, rideId, driverId, offerExpiresAt);
        } else {
            String resolvedChannelId = resolveChannel(remoteMessage);
            boolean isCito = "true".equals(remoteMessage.getData().get("isCito"));
            showNotification(title, body, resolvedChannelId, isCito);
        }
    }

    @Override
    public void onNewToken(String token) {
        Log.d(TAG, "New FCM token: " + token);
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit()
            .putString(PREF_FCM_TOKEN, token)
            .putBoolean(PREF_TOKEN_SENT, false)
            .apply();
        Log.d(TAG, "FCM token saved to prefs, will be sent when WebView is ready");
    }

    public static String getSavedToken(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        return prefs.getString(PREF_FCM_TOKEN, null);
    }

    public static void markTokenSent(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().putBoolean(PREF_TOKEN_SENT, true).apply();
    }

    public static boolean isTokenSent(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        return prefs.getBoolean(PREF_TOKEN_SENT, false);
    }

    private String resolveChannel(RemoteMessage remoteMessage) {
        String explicitChannel = remoteMessage.getData().get("channelId");
        if (explicitChannel != null && !explicitChannel.isEmpty()) {
            return explicitChannel;
        }

        String orderSource = remoteMessage.getData().get("orderSource");
        String isCito = remoteMessage.getData().get("isCito");
        String type = remoteMessage.getData().get("type");

        if ("phone".equals(orderSource)) {
            return CHANNEL_PHONE_ORDER;
        }
        if ("true".equals(isCito)) {
            return CHANNEL_CITO;
        }
        if ("preferred_driver_selected".equals(type)) {
            return CHANNEL_SELECTED;
        }
        if ("ride_request".equals(type) || "NEW_RIDE_REQUEST".equals(type)) {
            return CHANNEL_RIDES;
        }
        if ("chat_message".equals(type)) {
            return CHANNEL_MESSAGES;
        }
        return CHANNEL_INFO;
    }

    private void showSelectedDriverAlert(String title, String body, String rideId, String driverId, String offerExpiresAt) {
        Intent alertIntent = new Intent(this, SelectedDriverAlertActivity.class);
        alertIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        alertIntent.putExtra("rideId", rideId);
        alertIntent.putExtra("driverId", driverId);
        alertIntent.putExtra("offerExpiresAt", offerExpiresAt);

        PendingIntent fullScreenPendingIntent = PendingIntent.getActivity(
            this, (int) System.currentTimeMillis(), alertIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Bitmap largeIcon = null;
        try {
            largeIcon = BitmapFactory.decodeResource(getResources(), R.drawable.ic_alert_q);
        } catch (Exception e) {
            Log.e(TAG, "Failed to load ic_alert_q for large icon", e);
        }

        ensureSelectedDriverChannelExists();

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_SELECTED)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setFullScreenIntent(fullScreenPendingIntent, true)
            .setContentIntent(fullScreenPendingIntent)
            .setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM))
            .setVibrate(new long[]{0, 500, 200, 500, 200, 500})
            .setColorized(true)
            .setColor(0xFFD2E626);

        if (largeIcon != null) {
            builder.setLargeIcon(largeIcon);
        }

        NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        Log.d(TAG, "[FCM-SELECTED] full-screen notification notify() called, rideId=" + rideId);
        manager.notify((int) System.currentTimeMillis(), builder.build());

        Log.d(TAG, "[FCM-SELECTED] Full-screen notification shown for rideId=" + rideId);
    }

    private void showNotification(String title, String body, String channelId, boolean isCito) {
        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(this, 0, intent,
                PendingIntent.FLAG_ONE_SHOT | PendingIntent.FLAG_IMMUTABLE);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, channelId)
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentTitle(title)
                .setContentText(body)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent);

        switch (channelId) {
            case CHANNEL_PHONE_ORDER:
                Uri alarmSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
                builder.setSound(alarmSound)
                       .setVibrate(new long[]{0, 800, 400, 800, 400, 800})
                       .setPriority(NotificationCompat.PRIORITY_MAX)
                       .setCategory(NotificationCompat.CATEGORY_ALARM)
                       .setFullScreenIntent(createRideFullScreenIntent("Zlecenie telefoniczne"), true)
                       .setColorized(true)
                       .setColor(0xFF00CC00);
                break;

            case CHANNEL_CITO:
                builder.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM))
                       .setVibrate(new long[]{0, 500, 200, 500, 200, 500, 200, 500})
                       .setPriority(NotificationCompat.PRIORITY_MAX)
                       .setCategory(NotificationCompat.CATEGORY_ALARM)
                       .setFullScreenIntent(createRideFullScreenIntent("Pilne zlecenie"), true)
                       .setColorized(true)
                       .setColor(0xFFFF0000);
                break;

            case CHANNEL_RIDES:
                builder.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION))
                       .setVibrate(new long[]{0, 500, 200, 500})
                       .setPriority(NotificationCompat.PRIORITY_HIGH)
                       .setCategory(NotificationCompat.CATEGORY_ALARM)
                       .setFullScreenIntent(createRideFullScreenIntent("Przyjedź po mnie"), true)
                       .setColorized(true)
                       .setColor(0xFFD2E626);
                break;

            case CHANNEL_MESSAGES:
                builder.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION))
                       .setVibrate(new long[]{0, 200, 100, 200})
                       .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                       .setCategory(NotificationCompat.CATEGORY_MESSAGE);
                break;

            default:
                builder.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION))
                       .setVibrate(new long[]{0, 100})
                       .setPriority(NotificationCompat.PRIORITY_LOW);
                break;
        }

        NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        manager.notify((int) System.currentTimeMillis(), builder.build());
    }

    private PendingIntent createRideFullScreenIntent(String message) {
        Intent intent = new Intent(this, RideIncomingActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        intent.putExtra("message", message);
        return PendingIntent.getActivity(this, (int) System.currentTimeMillis(),
            intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private void ensureSelectedDriverChannelExists() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (manager == null) return;
        if (manager.getNotificationChannel(CHANNEL_SELECTED) != null) {
            Log.d(TAG, "[FCM-SELECTED] channel ensured: taxiq_selected_driver_alert (already exists)");
            return;
        }
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_SELECTED, "Wybrany kierowca", NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription("Pasażer wybrał Cię jako kierowcę — pełnoekranowy alert");
        channel.enableVibration(true);
        channel.setVibrationPattern(new long[]{0, 500, 200, 500, 200, 500});
        AudioAttributes alarmAudioAttr = new AudioAttributes.Builder()
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .setUsage(AudioAttributes.USAGE_ALARM)
            .build();
        channel.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM), alarmAudioAttr);
        channel.enableLights(true);
        channel.setLightColor(0xFFD2E626);
        channel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);
        channel.setBypassDnd(true);
        manager.createNotificationChannel(channel);
        Log.d(TAG, "[FCM-SELECTED] channel ensured: taxiq_selected_driver_alert (created now)");
    }
}
