import admin from "firebase-admin";

let fcmInitialized = false;

export function initializeFCM() {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  
  if (!serviceAccount) {
    console.log("[FCM] Firebase not configured: FIREBASE_SERVICE_ACCOUNT_JSON not set");
    console.log("[FCM] FCM push notifications disabled. Web Push will continue to work.");
    return false;
  }

  try {
    const parsed = JSON.parse(serviceAccount);
    
    if (!admin.apps || admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert(parsed),
      });
    }
    
    fcmInitialized = true;
    console.log("[FCM] Firebase Admin SDK initialized successfully");
    return true;
  } catch (error) {
    console.error("[FCM] Failed to initialize Firebase:", error);
    return false;
  }
}

export function isFCMReady(): boolean {
  return fcmInitialized;
}

interface FCMPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export async function sendFCMNotification(
  tokens: string[],
  payload: FCMPayload,
  highPriority: boolean = false
): Promise<{ success: number; failure: number; expiredTokens: string[] }> {
  if (!fcmInitialized) {
    console.log("[FCM] Not initialized, skipping FCM send");
    return { success: 0, failure: 0, expiredTokens: [] };
  }

  if (tokens.length === 0) {
    return { success: 0, failure: 0, expiredTokens: [] };
  }

  const expiredTokens: string[] = [];
  let successCount = 0;
  let failureCount = 0;

  const message: admin.messaging.MulticastMessage = {
    tokens,
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data: payload.data || {},
    android: {
      priority: highPriority ? "high" : "normal",
      notification: {
        channelId: highPriority ? "ride_requests" : "default",
        priority: highPriority ? "max" : "default",
        sound: "default",
        vibrateTimingsMillis: highPriority ? [0, 500, 200, 500, 200, 500] : [0, 250, 250, 250],
        visibility: "public",
        defaultVibrateTimings: false,
        defaultSound: true,
      },
    },
    apns: {
      headers: {
        "apns-priority": highPriority ? "10" : "5",
      },
      payload: {
        aps: {
          alert: {
            title: payload.title,
            body: payload.body,
          },
          sound: "default",
          "content-available": 1,
          "mutable-content": 1,
          ...(highPriority ? { "interruption-level": "time-sensitive" } : {}),
        },
      },
    },
    webpush: {
      headers: {
        Urgency: highPriority ? "high" : "normal",
      },
      notification: {
        title: payload.title,
        body: payload.body,
        requireInteraction: highPriority,
        vibrate: highPriority ? [500, 200, 500, 200, 500] : [200, 100, 200],
      },
    },
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(message);
    
    console.log(`[FCM_RESULT] success=${response.successCount}, failure=${response.failureCount}`);
    
    successCount = response.successCount;
    failureCount = response.failureCount;

    response.responses.forEach((resp, idx) => {
      if (!resp.success && resp.error) {
        const errorCode = resp.error.code;
        if (
          errorCode === "messaging/invalid-registration-token" ||
          errorCode === "messaging/registration-token-not-registered"
        ) {
          expiredTokens.push(tokens[idx]);
          console.log(`[FCM_EXPIRED] token=${tokens[idx].substring(0, 20)}...`);
        } else {
          console.error(`[FCM_ERROR] token=${tokens[idx].substring(0, 20)}..., error=${errorCode}: ${resp.error.message}`);
        }
      }
    });
  } catch (error: any) {
    console.error(`[FCM_SEND_ERROR] ${error.message}`);
    failureCount = tokens.length;
  }

  return { success: successCount, failure: failureCount, expiredTokens };
}
