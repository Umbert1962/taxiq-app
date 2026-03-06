import { useState, useEffect, useCallback, useRef } from "react";

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  loading: boolean;
  permissionDenied: boolean;
  permissionGranted: boolean;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    error: null,
    loading: true,
    permissionDenied: false,
    permissionGranted: false,
  });

  const watchIdRef = useRef<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearWatcher = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: "Twoja przeglądarka nie wspiera geolokalizacji",
      }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));
    clearWatcher();

    let gotPosition = false;

    const handleSuccess = (position: GeolocationPosition) => {
      if (gotPosition) return;
      gotPosition = true;
      clearWatcher();
      
      setState({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        error: null,
        loading: false,
        permissionDenied: false,
        permissionGranted: true,
      });
    };

    const handleError = (error: GeolocationPositionError) => {
      if (gotPosition) return;
      gotPosition = true;
      clearWatcher();

      let errorMessage = "Nie udało się pobrać lokalizacji";
      let denied = false;

      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage = "Dostęp do lokalizacji został zablokowany. Włącz lokalizację w ustawieniach przeglądarki.";
          denied = true;
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage = "Lokalizacja niedostępna. Sprawdź czy GPS jest włączony.";
          break;
        case error.TIMEOUT:
          errorMessage = "Przekroczono limit czasu. Spróbuj ponownie.";
          break;
      }

      setState({
        latitude: null,
        longitude: null,
        error: errorMessage,
        loading: false,
        permissionDenied: denied,
        permissionGranted: false,
      });
    };

    const options: PositionOptions = {
      enableHighAccuracy: false,
      timeout: 30000,
      maximumAge: 300000,
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      options
    );

    timeoutRef.current = setTimeout(() => {
      if (!gotPosition) {
        gotPosition = true;
        clearWatcher();
        setState({
          latitude: null,
          longitude: null,
          error: "Przekroczono limit czasu. Upewnij się, że lokalizacja jest włączona i spróbuj ponownie.",
          loading: false,
          permissionDenied: false,
          permissionGranted: false,
        });
      }
    }, 35000);

  }, [clearWatcher]);

  useEffect(() => {
    requestLocation();
    
    return () => {
      clearWatcher();
    };
  }, [requestLocation, clearWatcher]);

  return { ...state, requestLocation };
}
