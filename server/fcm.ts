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
  imageUrl?: string;
}

interface FCMDebugContext {
  driverId?: string;
  eventType?: string;
  platforms?: string[];
}

export async function sendFCMNotification(
  tokens: string[],
  payload: FCMPayload,
  highPriority: boolean = false,
  androidChannelId?: string,
  debug?: FCMDebugContext
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

  const driverTag = debug?.driverId ? `driver=${debug.driverId}, ` : '';
  const eventTag = debug?.eventType ? `eventType=${debug.eventType}, ` : '';

  for (let idx = 0; idx < tokens.length; idx++) {
    const token = tokens[idx];
    const platform = debug?.platforms?.[idx] || 'unknown';
    const maskedToken = token.substring(0, 20) + '...';

    const singleMessage: admin.messaging.Message = {
      token,
      data: {
        ...(payload.data || {}),
        title: payload.title,
        body: payload.body,
      },
      android: {
        priority: "high",
        ttl: 30000,
        notification: {
          channelId: androidChannelId,
        },
      },
      apns: {
        headers: {
          "apns-priority": highPriority ? "10" : "5",
          "apns-push-type": "alert",
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
        ...(payload.imageUrl ? { fcmOptions: { image: payload.imageUrl } } : {}),
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

    console.log(`[PUSH_TOKEN_SEND_BEGIN] ${driverTag}${eventTag}platform=${platform}, token=${maskedToken}`);

    try {
      const messageId = await admin.messaging().send(singleMessage);
      successCount++;
      console.log(`[PUSH_TOKEN_SEND_OK] ${driverTag}${eventTag}platform=${platform}, token=${maskedToken}, messageId=${messageId}`);
    } catch (error: any) {
      failureCount++;
      const errorCode = error.code || 'unknown_code';
      if (
        errorCode === "messaging/invalid-registration-token" ||
        errorCode === "messaging/registration-token-not-registered"
      ) {
        expiredTokens.push(token);
      }
      console.error(`[PUSH_TOKEN_SEND_ERR] ${driverTag}${eventTag}platform=${platform}, token=${maskedToken}, code=${errorCode}, msg=${error.message}, stack=${error.stack}`);
    }
  }

  console.log(`[PUSH_DISPATCH_DONE] ${driverTag}${eventTag}sent=${successCount}, failed=${failureCount}, expired=${expiredTokens.length}`);

  return { success: successCount, failure: failureCount, expiredTokens };
}
