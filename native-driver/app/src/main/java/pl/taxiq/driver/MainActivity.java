package pl.taxiq.driver;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.AlertDialog;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Log;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.webkit.GeolocationPermissions;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.CookieManager;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.activity.EdgeToEdge;
import androidx.activity.ComponentActivity;
import androidx.annotation.NonNull;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;

import java.io.File;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.Locale;

import com.google.firebase.messaging.FirebaseMessaging;

public class MainActivity extends ComponentActivity {

    private WebView webView;
    private FrameLayout rootLayout;
    private LinearLayout splashView;
    private LinearLayout errorView;
    private ValueCallback<Uri[]> fileUploadCallback;
    private Uri cameraPhotoUri;
    private static final int FILE_CHOOSER_REQUEST = 1001;
    private static final int CAMERA_REQUEST = 1005;
    private static final int LOCATION_PERMISSION_REQUEST = 1002;
    private static final int NOTIFICATION_PERMISSION_REQUEST = 1003;
    private static final int BACKGROUND_LOCATION_REQUEST = 1004;
    private static final String BASE_URL = "https://taxiq.com.pl/driver";
    private boolean pageLoaded = false;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        EdgeToEdge.enable(this);
        super.onCreate(savedInstanceState);

        getWindow().setStatusBarColor(0xFF0A0A0A);
        getWindow().setNavigationBarColor(0xFF0A0A0A);

        createNotificationChannels();

        rootLayout = new FrameLayout(this);
        rootLayout.setBackgroundColor(0xFF0A0A0A);

        webView = new WebView(this);
        webView.setBackgroundColor(0xFF0A0A0A);
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        webView.setVisibility(View.INVISIBLE);
        rootLayout.addView(webView, new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));

        splashView = createSplashView();
        rootLayout.addView(splashView, new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));

        errorView = createErrorView();
        errorView.setVisibility(View.GONE);
        rootLayout.addView(errorView, new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));

        setContentView(rootLayout);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setGeolocationEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setUserAgentString(settings.getUserAgentString() + " TaxiQDriverNative/1.2.5");
        settings.setDatabaseEnabled(true);

        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(webView, true);

        webView.addJavascriptInterface(new NativeBridge(this), "TaxiQNative");
        // Przekazuje WebView do LocationService — potrzebne do odnowienia GPS timestamp po stronie JS
        LocationService.setWebView(webView);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                if (url.startsWith("tel:")) {
                    Intent intent = new Intent(Intent.ACTION_DIAL, request.getUrl());
                    startActivity(intent);
                    return true;
                }
                if (url.startsWith("https://taxiq.com.pl")) {
                    return false;
                }
                Intent intent = new Intent(Intent.ACTION_VIEW, request.getUrl());
                startActivity(intent);
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                injectNativeBridgeJS();
                if (!pageLoaded) {
                    pageLoaded = true;
                    webView.setVisibility(View.VISIBLE);
                    splashView.setVisibility(View.GONE);
                    errorView.setVisibility(View.GONE);
                }
                sendFcmTokenToServer();
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
                if (request.isForMainFrame() && !pageLoaded) {
                    splashView.setVisibility(View.GONE);
                    errorView.setVisibility(View.VISIBLE);
                }
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                callback.invoke(origin, true, false);
            }

            @Override
            public void onPermissionRequest(PermissionRequest request) {
                request.grant(request.getResources());
            }

            @Override
            public void onReceivedTitle(WebView view, String title) {
                setTitle("KIEROWCA");
            }

            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileUploadCallback != null) {
                    fileUploadCallback.onReceiveValue(null);
                }
                fileUploadCallback = callback;

                ArrayList<Intent> extraIntents = new ArrayList<>();

                if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
                    Intent cameraIntent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
                    if (cameraIntent.resolveActivity(getPackageManager()) != null) {
                        File photoFile = null;
                        try {
                            String timeStamp = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(new Date());
                            File storageDir = getExternalCacheDir();
                            photoFile = File.createTempFile("PHOTO_" + timeStamp + "_", ".jpg", storageDir);
                        } catch (IOException e) {
                            Log.e("TaxiQ", "Cannot create temp file for camera", e);
                        }
                        if (photoFile != null) {
                            cameraPhotoUri = FileProvider.getUriForFile(MainActivity.this,
                                getPackageName() + ".fileprovider", photoFile);
                            cameraIntent.putExtra(MediaStore.EXTRA_OUTPUT, cameraPhotoUri);
                            cameraIntent.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
                            extraIntents.add(cameraIntent);
                        }
                    }
                } else {
                    ActivityCompat.requestPermissions(MainActivity.this,
                        new String[]{Manifest.permission.CAMERA}, 1006);
                }

                Intent fileIntent = new Intent(Intent.ACTION_GET_CONTENT);
                fileIntent.addCategory(Intent.CATEGORY_OPENABLE);
                fileIntent.setType("image/*");

                Intent chooserIntent = Intent.createChooser(fileIntent, "Wybierz zdjęcie");
                if (!extraIntents.isEmpty()) {
                    chooserIntent.putExtra(Intent.EXTRA_INITIAL_INTENTS, extraIntents.toArray(new Intent[0]));
                }

                try {
                    startActivityForResult(chooserIntent, FILE_CHOOSER_REQUEST);
                } catch (Exception e) {
                    fileUploadCallback = null;
                    cameraPhotoUri = null;
                    return false;
                }
                return true;
            }
        });

        requestPermissions();
        webView.loadUrl(BASE_URL);
    }

    private LinearLayout createSplashView() {
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setGravity(Gravity.CENTER);
        layout.setBackgroundColor(0xFF0A0A0A);

        TextView title = new TextView(this);
        title.setText("TaxiQ Driver");
        title.setTextColor(0xFFD2E626);
        title.setTextSize(TypedValue.COMPLEX_UNIT_SP, 28);
        title.setTypeface(null, Typeface.BOLD);
        title.setGravity(Gravity.CENTER);
        layout.addView(title);

        TextView subtitle = new TextView(this);
        subtitle.setText("Ładowanie...");
        subtitle.setTextColor(0xAAFFFFFF);
        subtitle.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14);
        subtitle.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams stParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        stParams.topMargin = 24;
        layout.addView(subtitle, stParams);

        ProgressBar progressBar = new ProgressBar(this);
        progressBar.setIndeterminate(true);
        LinearLayout.LayoutParams pbParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        pbParams.topMargin = 48;
        layout.addView(progressBar, pbParams);

        return layout;
    }

    private LinearLayout createErrorView() {
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setGravity(Gravity.CENTER);
        layout.setBackgroundColor(0xFF0A0A0A);
        int pad = (int) TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, 32, getResources().getDisplayMetrics());
        layout.setPadding(pad, pad, pad, pad);

        TextView title = new TextView(this);
        title.setText("Brak połączenia");
        title.setTextColor(0xFFFFFFFF);
        title.setTextSize(TypedValue.COMPLEX_UNIT_SP, 22);
        title.setTypeface(null, Typeface.BOLD);
        title.setGravity(Gravity.CENTER);
        layout.addView(title);

        TextView msg = new TextView(this);
        msg.setText("Sprawdź połączenie internetowe i spróbuj ponownie.");
        msg.setTextColor(0xAAFFFFFF);
        msg.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14);
        msg.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams msgParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        msgParams.topMargin = 16;
        layout.addView(msg, msgParams);

        Button retryBtn = new Button(this);
        retryBtn.setText("Spróbuj ponownie");
        retryBtn.setBackgroundColor(0xFFD2E626);
        retryBtn.setTextColor(0xFF0A0A0A);
        retryBtn.setTypeface(null, Typeface.BOLD);
        LinearLayout.LayoutParams btnParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        btnParams.topMargin = 48;
        retryBtn.setOnClickListener(v -> {
            errorView.setVisibility(View.GONE);
            splashView.setVisibility(View.VISIBLE);
            pageLoaded = false;
            webView.loadUrl(BASE_URL);
        });
        layout.addView(retryBtn, btnParams);

        return layout;
    }

    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = getSystemService(NotificationManager.class);

            // Usuń stare kanały jeśli wersja aplikacji się zmieniła — wymusza nowe dźwięki
            android.content.SharedPreferences prefs = getSharedPreferences("taxiq_prefs", MODE_PRIVATE);
            int lastChannelVersion = prefs.getInt("channel_version", 0);
            int currentVersion = 16;
            if (lastChannelVersion != currentVersion) {
                String[] oldChannels = {
                    "taxiq_phone_order", "taxiq_cito", "taxiq_rides",
                    "taxiq_messages", "taxiq_info", "taxiq_location",
                    "taxiq_phone_order_2", "taxiq_cito_2", "taxiq_rides_2",
                    "taxiq_messages_2", "taxiq_info_2", "taxiq_location_2"
                };
                for (String ch : oldChannels) {
                    manager.deleteNotificationChannel(ch);
                }
                prefs.edit().putInt("channel_version", currentVersion).apply();
            }

            AudioAttributes alarmAudioAttr = new AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_ALARM)
                .build();

            AudioAttributes notifAudioAttr = new AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                .build();

            String pkg = getPackageName();
            Uri soundZlecenie = Uri.parse("android.resource://" + pkg + "/" + R.raw.sound_zlecenie);
            Uri soundCito     = Uri.parse("android.resource://" + pkg + "/" + R.raw.sound_cito);
            Uri soundTelefon  = Uri.parse("android.resource://" + pkg + "/" + R.raw.sound_telefon);
            Uri soundInfo     = Uri.parse("android.resource://" + pkg + "/" + R.raw.sound_info);

            NotificationChannel phoneOrderChannel = new NotificationChannel(
                "taxiq_phone_order_2", "Zlecenia telefoniczne", NotificationManager.IMPORTANCE_HIGH
            );
            phoneOrderChannel.setDescription("Nowe zlecenia z telefonu — głośny alarm");
            phoneOrderChannel.enableVibration(true);
            phoneOrderChannel.setVibrationPattern(new long[]{0, 800, 400, 800, 400, 800});
            phoneOrderChannel.setSound(soundTelefon, alarmAudioAttr);
            phoneOrderChannel.enableLights(true);
            phoneOrderChannel.setLightColor(0xFF00CC00);
            phoneOrderChannel.setBypassDnd(true);
            manager.createNotificationChannel(phoneOrderChannel);

            NotificationChannel citoChannel = new NotificationChannel(
                "taxiq_cito_2", "Zlecenia CITO", NotificationManager.IMPORTANCE_HIGH
            );
            citoChannel.setDescription("Pilne zlecenia CITO — alarm z czerwonym oznaczeniem");
            citoChannel.enableVibration(true);
            citoChannel.setVibrationPattern(new long[]{0, 500, 200, 500, 200, 500, 200, 500});
            citoChannel.setSound(soundCito, alarmAudioAttr);
            citoChannel.enableLights(true);
            citoChannel.setLightColor(0xFFFF0000);
            citoChannel.setBypassDnd(true);
            manager.createNotificationChannel(citoChannel);

            NotificationChannel ridesChannel = new NotificationChannel(
                "taxiq_rides_2", "Zlecenia od pasażerów", NotificationManager.IMPORTANCE_HIGH
            );
            ridesChannel.setDescription("Nowe zlecenia od pasażerów");
            ridesChannel.enableVibration(true);
            ridesChannel.setVibrationPattern(new long[]{0, 500, 200, 500});
            ridesChannel.setSound(soundZlecenie, notifAudioAttr);
            ridesChannel.enableLights(true);
            ridesChannel.setLightColor(0xFFD2E626);
            manager.createNotificationChannel(ridesChannel);

            NotificationChannel messagesChannel = new NotificationChannel(
                "taxiq_messages_2", "Wiadomości", NotificationManager.IMPORTANCE_DEFAULT
            );
            messagesChannel.setDescription("Wiadomości od pasażerów");
            messagesChannel.enableVibration(true);
            messagesChannel.setVibrationPattern(new long[]{0, 200, 100, 200});
            messagesChannel.setSound(soundInfo, notifAudioAttr);
            manager.createNotificationChannel(messagesChannel);

            NotificationChannel infoChannel = new NotificationChannel(
                "taxiq_info_2", "Informacje", NotificationManager.IMPORTANCE_LOW
            );
            infoChannel.setDescription("Informacje systemowe i statusy");
            infoChannel.enableVibration(false);
            infoChannel.setSound(soundInfo, notifAudioAttr);
            manager.createNotificationChannel(infoChannel);

            NotificationChannel locationChannel = new NotificationChannel(
                "taxiq_location_2", "Lokalizacja", NotificationManager.IMPORTANCE_LOW
            );
            locationChannel.setDescription("Śledzenie lokalizacji w tle");
            manager.createNotificationChannel(locationChannel);
        }
    }

    private void requestPermissions() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
                != PackageManager.PERMISSION_GRANTED) {
            showLocationDisclosure();
        } else {
            requestBackgroundLocationWithDisclosure();
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                    != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this,
                    new String[]{Manifest.permission.POST_NOTIFICATIONS},
                    NOTIFICATION_PERMISSION_REQUEST);
            }
        }
    }

    private void showLocationDisclosure() {
        new AlertDialog.Builder(this)
            .setTitle("Dostęp do lokalizacji")
            .setMessage("Aplikacja TaxiQ Driver wymaga dostępu do Twojej lokalizacji, " +
                "aby umożliwić pasażerom śledzenie pozycji taksówki w czasie rzeczywistym " +
                "oraz aby przydzielać Ci najbliższe zlecenia.\n\n" +
                "Lokalizacja jest zbierana gdy jesteś w trybie Online, " +
                "nawet gdy aplikacja działa w tle.\n\n" +
                "Dane lokalizacyjne są wykorzystywane wyłącznie do obsługi przejazdów " +
                "i nie są udostępniane podmiotom trzecim.")
            .setPositiveButton("Rozumiem, kontynuuj", (dialog, which) -> {
                ActivityCompat.requestPermissions(this,
                    new String[]{
                        Manifest.permission.ACCESS_FINE_LOCATION,
                        Manifest.permission.ACCESS_COARSE_LOCATION
                    }, LOCATION_PERMISSION_REQUEST);
            })
            .setNegativeButton("Odmów", (dialog, which) -> {
                Toast.makeText(this,
                    "Lokalizacja jest wymagana do działania aplikacji kierowcy",
                    Toast.LENGTH_LONG).show();
            })
            .setCancelable(false)
            .show();
    }

    private void requestBackgroundLocationWithDisclosure() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_BACKGROUND_LOCATION)
                    != PackageManager.PERMISSION_GRANTED) {
                new AlertDialog.Builder(this)
                    .setTitle("Lokalizacja w tle")
                    .setMessage("Aby prawidłowo śledzić Twoją pozycję podczas przejazdów, " +
                        "aplikacja potrzebuje dostępu do lokalizacji w tle.\n\n" +
                        "Dzięki temu pasażerowie widzą Twoją pozycję w czasie rzeczywistym, " +
                        "a system może przydzielać Ci zlecenia nawet gdy aplikacja " +
                        "działa w tle.\n\n" +
                        "Na następnym ekranie wybierz opcję \"Zezwalaj przez cały czas\".")
                    .setPositiveButton("Rozumiem, kontynuuj", (dialog, which) -> {
                        ActivityCompat.requestPermissions(this,
                            new String[]{Manifest.permission.ACCESS_BACKGROUND_LOCATION},
                            BACKGROUND_LOCATION_REQUEST);
                    })
                    .setNegativeButton("Nie teraz", (dialog, which) -> {
                        Toast.makeText(this,
                            "Bez lokalizacji w tle śledzenie pozycji może nie działać prawidłowo",
                            Toast.LENGTH_LONG).show();
                    })
                    .setCancelable(false)
                    .show();
            }
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] results) {
        super.onRequestPermissionsResult(requestCode, permissions, results);
        if (requestCode == LOCATION_PERMISSION_REQUEST) {
            if (results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED) {
                requestBackgroundLocationWithDisclosure();
            }
        }
    }

    private void sendFcmTokenToServer() {
        FirebaseMessaging.getInstance().getToken()
            .addOnCompleteListener(task -> {
                if (!task.isSuccessful()) {
                    Log.e("TaxiQ_FCM", "Failed to get FCM token", task.getException());
                    return;
                }
                String token = task.getResult();
                Log.d("TaxiQ_FCM", "FCM token obtained: " + token.substring(0, 20) + "...");

                android.content.SharedPreferences prefs = getSharedPreferences("TaxiQDriverPrefs", MODE_PRIVATE);
                String savedToken = prefs.getString("fcm_token", null);
                boolean tokenSent = prefs.getBoolean("fcm_token_sent", false);

                prefs.edit().putString("fcm_token", token).apply();

                if (token.equals(savedToken) && tokenSent) {
                    Log.d("TaxiQ_FCM", "Token already sent to server, skipping");
                    return;
                }

                String js = "fetch('/api/fcm/register', {" +
                    "method: 'POST'," +
                    "headers: {'Content-Type': 'application/json'}," +
                    "credentials: 'include'," +
                    "body: JSON.stringify({token: '" + token.replace("'", "\\'") + "', platform: 'android'})" +
                    "}).then(function(r){return r.json()}).then(function(d){" +
                    "if(d.success){window.TaxiQNative && window.TaxiQNative.onFcmTokenSent && window.TaxiQNative.onFcmTokenSent();" +
                    "console.log('[FCM] Token registered successfully')}" +
                    "}).catch(function(e){console.error('[FCM] Token register failed:', e)});";

                runOnUiThread(() -> {
                    webView.evaluateJavascript(js, result -> {
                        prefs.edit().putBoolean("fcm_token_sent", true).apply();
                        Log.d("TaxiQ_FCM", "FCM token registration request sent to server");
                    });
                });
            });
    }

    private void injectNativeBridgeJS() {
        String js = "window.isNativeApp = true; window.nativePlatform = 'android';";
        webView.evaluateJavascript(js, null);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == FILE_CHOOSER_REQUEST) {
            if (fileUploadCallback != null) {
                Uri[] result = null;
                if (resultCode == RESULT_OK) {
                    if (data != null && data.getData() != null) {
                        result = new Uri[]{data.getData()};
                    } else if (cameraPhotoUri != null) {
                        result = new Uri[]{cameraPhotoUri};
                    }
                }
                fileUploadCallback.onReceiveValue(result);
                fileUploadCallback = null;
                cameraPhotoUri = null;
            }
        }
    }

    @Override
    public void onBackPressed() {
        String url = webView.getUrl();
        if (url != null && (url.contains("/driver/dashboard") || url.equals(BASE_URL) || url.equals(BASE_URL + "/"))) {
            moveTaskToBack(true);
            return;
        }
        if (webView.canGoBack()) {
            android.webkit.WebBackForwardList history = webView.copyBackForwardList();
            if (history.getCurrentIndex() > 0) {
                String prevUrl = history.getItemAtIndex(history.getCurrentIndex() - 1).getUrl();
                if (prevUrl != null && !prevUrl.contains("/driver")) {
                    webView.loadUrl(BASE_URL);
                    return;
                }
            }
            webView.goBack();
        } else {
            moveTaskToBack(true);
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        webView.onResume();
        CookieManager.getInstance().flush();
    }

    @Override
    protected void onPause() {
        super.onPause();
        webView.onPause();
    }

    public WebView getWebView() {
        return webView;
    }
}
