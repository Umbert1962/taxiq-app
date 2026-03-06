import { useEffect, useState, useCallback, useRef } from "react";
import { apiRequest } from "@/lib/queryClient";

declare global {
  interface Window {
    Capacitor?: {
      isNativePlatform: () => boolean;
      getPlatform: () => string;
      Plugins?: {
        PushNotifications?: any;
      };
    };
  }
}

export function isCapacitorNative(): boolean {
  return !!(window.Capacitor && window.Capacitor.isNativePlatform());
}

export function getCapacitorPlatform(): string {
  if (window.Capacitor) {
    return window.Capacitor.getPlatform();
  }
  return "web";
}

interface PushNotificationData {
  type?: string;
  rideId?: string;
  [key: string]: any;
}

type PushHandler = (data: PushNotificationData) => void;

export function useCapacitorPush(
  userId: string | null,
  userType: "driver" | "passenger",
  onPushReceived?: PushHandler
) {
  const [isRegistered, setIsRegistered] = useState(false);
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const onPushReceivedRef = useRef(onPushReceived);
  
  useEffect(() => {
    onPushReceivedRef.current = onPushReceived;
  }, [onPushReceived]);

  const registerNativePush = useCallback(async () => {
    if (!isCapacitorNative() || !userId) return false;

    try {
      const { PushNotifications } = await import("@capacitor/push-notifications");
      
      const permResult = await PushNotifications.requestPermissions();
      if (permResult.receive !== "granted") {
        console.log("[CAP_PUSH] Permission denied");
        return false;
      }

      await PushNotifications.register();

      PushNotifications.addListener("registration", async (token: { value: string }) => {
        console.log(`[CAP_PUSH] Token received: ${token.value.substring(0, 20)}...`);
        setFcmToken(token.value);

        try {
          await apiRequest("POST", "/api/fcm/register", {
            token: token.value,
            platform: getCapacitorPlatform(),
          });
          setIsRegistered(true);
          console.log(`[CAP_PUSH] Token registered with backend`);
        } catch (error) {
          console.error("[CAP_PUSH] Failed to register token:", error);
        }
      });

      PushNotifications.addListener("registrationError", (error: any) => {
        console.error("[CAP_PUSH] Registration error:", error);
      });

      PushNotifications.addListener("pushNotificationReceived", (notification: any) => {
        console.log("[CAP_PUSH] Notification received in foreground:", notification);
        const data = notification.data || {};
        if (onPushReceivedRef.current) {
          onPushReceivedRef.current(data);
        }
      });

      PushNotifications.addListener("pushNotificationActionPerformed", (action: any) => {
        console.log("[CAP_PUSH] Notification action:", action);
        const data = action.notification?.data || {};
        if (onPushReceivedRef.current) {
          onPushReceivedRef.current({ ...data, _action: action.actionId });
        }
      });

      return true;
    } catch (error) {
      console.error("[CAP_PUSH] Setup error:", error);
      return false;
    }
  }, [userId, userType]);

  const unregisterNativePush = useCallback(async () => {
    if (!fcmToken) return;
    
    try {
      await apiRequest("POST", "/api/fcm/unregister", { token: fcmToken });
      setIsRegistered(false);
      setFcmToken(null);
    } catch (error) {
      console.error("[CAP_PUSH] Unregister error:", error);
    }
  }, [fcmToken]);

  useEffect(() => {
    if (isCapacitorNative() && userId) {
      registerNativePush();
    }
  }, [userId, registerNativePush]);

  return {
    isNative: isCapacitorNative(),
    isRegistered,
    fcmToken,
    registerNativePush,
    unregisterNativePush,
    platform: getCapacitorPlatform(),
  };
}
