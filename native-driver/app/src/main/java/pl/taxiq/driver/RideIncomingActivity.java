package pl.taxiq.driver;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Typeface;
import android.os.Build;
import android.os.Bundle;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.WindowManager;
import android.widget.LinearLayout;
import android.widget.TextView;

public class RideIncomingActivity extends Activity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        } else {
            getWindow().addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
            );
        }
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        String message = getIntent().getStringExtra("message");
        if (message == null || message.isEmpty()) {
            message = "Przyjedź po mnie";
        }

        buildUI(message);
    }

    private void buildUI(String message) {
        int dp = (int) getResources().getDisplayMetrics().density;

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER);
        root.setBackgroundColor(0xFF0A0A0A);

        TextView msgText = new TextView(this);
        msgText.setText(message);
        msgText.setTextColor(0xFFFFFFFF);
        msgText.setTextSize(TypedValue.COMPLEX_UNIT_SP, 32);
        msgText.setTypeface(null, Typeface.BOLD);
        msgText.setGravity(Gravity.CENTER);
        msgText.setPadding(32 * dp, 0, 32 * dp, 0);
        root.addView(msgText);

        TextView subText = new TextView(this);
        subText.setText("Dotknij, aby otworzyć aplikację");
        subText.setTextColor(0xAAFFFFFF);
        subText.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14);
        subText.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams subParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        subParams.topMargin = 16 * dp;
        root.addView(subText, subParams);

        root.setOnClickListener(v -> openApp());
        setContentView(root);
    }

    private void openApp() {
        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        startActivity(intent);
        finish();
    }

    @Override
    public void onBackPressed() {
        openApp();
    }
}
