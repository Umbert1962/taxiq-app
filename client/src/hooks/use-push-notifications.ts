import { useEffect, useState, useCallback } from "react";
import { apiRequest } from "@/lib/queryClient";

export function usePushNotifications(driverId: string | null) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
    }
  }, []);

  const subscribe = useCallback(async () => {
    if (!isSupported || !driverId) return false;

    try {
      // Request notification permission
      const perm = await Notification.requestPermission();
      setPermission(perm);
      
      if (perm !== "granted") {
        console.log("Push notification permission denied");
        return false;
      }

      // Get VAPID public key
      const vapidResponse = await fetch("/api/config/vapid");
      if (!vapidResponse.ok) {
        console.error("Failed to get VAPID key");
        return false;
      }
      const { publicKey } = await vapidResponse.json();

      // Wait for service worker to be ready
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });

      // Send subscription to server
      await apiRequest("POST", "/api/push/subscribe", {
        driverId,
        subscription: subscription.toJSON()
      });

      setIsSubscribed(true);
      console.log("Push notification subscription successful");
      return true;
    } catch (error) {
      console.error("Push subscription error:", error);
      return false;
    }
  }, [isSupported, driverId]);

  const checkSubscription = useCallback(async () => {
    if (!isSupported) return false;
    
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
      return !!subscription;
    } catch (error) {
      return false;
    }
  }, [isSupported]);

  useEffect(() => {
    if (isSupported && driverId) {
      checkSubscription();
    }
  }, [isSupported, driverId, checkSubscription]);

  return {
    isSupported,
    isSubscribed,
    permission,
    subscribe,
    checkSubscription
  };
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
