import { useEffect, useRef, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface UseLocationTrackingOptions {
  rideId: string | null;
  role: "driver" | "passenger";
  enabled?: boolean;
  intervalMs?: number;
}

export function useLocationTracking({
  rideId,
  role,
  enabled = true,
  intervalMs = 5000,
}: UseLocationTrackingOptions) {
  const watchIdRef = useRef<number | null>(null);
  const lastPositionRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);

  const updateLocationMutation = useMutation({
    mutationFn: async ({ lat, lng }: { lat: number; lng: number }) => {
      if (!rideId) return null;
      const endpoint = role === "driver" 
        ? `/api/rides/${rideId}/driver-location`
        : `/api/rides/${rideId}/passenger-location`;
      return apiRequest("PATCH", endpoint, { lat: String(lat), lng: String(lng) });
    },
  });

  const handlePosition = useCallback((position: GeolocationPosition) => {
    const { latitude, longitude } = position.coords;
    const now = Date.now();
    
    if (now - lastUpdateTimeRef.current < intervalMs) {
      return;
    }
    
    const last = lastPositionRef.current;
    if (last && last.lat === latitude && last.lng === longitude) {
      return;
    }
    
    lastPositionRef.current = { lat: latitude, lng: longitude };
    lastUpdateTimeRef.current = now;
    
    if (rideId && enabled) {
      updateLocationMutation.mutate({ lat: latitude, lng: longitude });
    }
  }, [rideId, enabled, intervalMs, updateLocationMutation]);

  const handleError = useCallback((error: GeolocationPositionError) => {
    console.error("Geolocation error:", error.message);
  }, []);

  useEffect(() => {
    if (!enabled || !rideId) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    if (!navigator.geolocation) {
      console.error("Geolocation not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(handlePosition, handleError, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });

    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePosition,
      handleError,
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: intervalMs,
      }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [enabled, rideId, handlePosition, handleError, intervalMs]);

  return {
    isTracking: enabled && rideId !== null && watchIdRef.current !== null,
    lastPosition: lastPositionRef.current,
    isUpdating: updateLocationMutation.isPending,
  };
}
