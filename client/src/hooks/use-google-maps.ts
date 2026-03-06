import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";

declare global {
  interface Window {
    google: typeof google;
    initGoogleMaps?: () => void;
  }
}

let isLoading = false;
let isLoaded = false;
let loadPromise: Promise<void> | null = null;
const listeners: Set<() => void> = new Set();

function notifyListeners() {
  listeners.forEach(listener => listener());
}

export function useGoogleMaps() {
  const [ready, setReady] = useState(isLoaded);

  const { data: config } = useQuery<{ apiKey: string }>({
    queryKey: ["/api/config/maps"],
    staleTime: Infinity,
  });

  useEffect(() => {
    console.log("[useGoogleMaps] Effect - isLoaded:", isLoaded, "isLoading:", isLoading, "hasApiKey:", !!config?.apiKey);
    
    if (isLoaded) {
      console.log("[useGoogleMaps] Already loaded, setting ready");
      setReady(true);
      return;
    }

    const listener = () => {
      console.log("[useGoogleMaps] Listener triggered, setting ready");
      setReady(true);
    };
    listeners.add(listener);

    if (!isLoading && config?.apiKey) {
      isLoading = true;
      console.log("[useGoogleMaps] Starting to load Google Maps API...");

      window.initGoogleMaps = () => {
        console.log("[useGoogleMaps] Google Maps API loaded successfully!");
        isLoaded = true;
        isLoading = false;
        notifyListeners();
      };

      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (!existingScript) {
        console.log("[useGoogleMaps] Adding script tag to load Maps API");
        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${config.apiKey}&libraries=places&callback=initGoogleMaps`;
        script.async = true;
        script.defer = true;
        script.onerror = (e) => console.error("[useGoogleMaps] Script load error:", e);
        document.head.appendChild(script);
      } else if (window.google?.maps) {
        console.log("[useGoogleMaps] Script exists and google.maps available");
        isLoaded = true;
        isLoading = false;
        notifyListeners();
      } else {
        console.log("[useGoogleMaps] Script exists but google.maps not ready yet");
      }
    }

    return () => {
      listeners.delete(listener);
    };
  }, [config?.apiKey]);

  return { ready, isLoaded: ready, loadError: null, apiKey: config?.apiKey };
}

export function useAutocomplete(
  inputRef: React.RefObject<HTMLInputElement>,
  onPlaceSelect: (place: google.maps.places.PlaceResult) => void,
  options?: google.maps.places.AutocompleteOptions
) {
  const { ready } = useGoogleMaps();
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  
  // Use ref to always have the latest callback - fixes stale closure issue
  const onPlaceSelectRef = useRef(onPlaceSelect);
  onPlaceSelectRef.current = onPlaceSelect;

  // Pobierz lokalizację użytkownika dla lepszych wyników wyszukiwania
  useEffect(() => {
    if (navigator.geolocation && !userLocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          // Fallback do Poznania jeśli nie ma dostępu do GPS
          setUserLocation({ lat: 52.4064, lng: 16.9252 });
        },
        { enableHighAccuracy: false, timeout: 5000 }
      );
    }
  }, []);

  useEffect(() => {
    if (!ready || !inputRef.current || autocomplete) return;

    console.log("[useAutocomplete] Creating autocomplete instance");
    
    // Utwórz opcje z locationBias jeśli mamy lokalizację użytkownika
    const autocompleteOptions: google.maps.places.AutocompleteOptions = {
      types: ["geocode", "establishment"],
      componentRestrictions: { country: "pl" },
      fields: ["formatted_address", "geometry", "name", "address_components"],
      ...options,
    };

    // Dodaj locationBias dla lepszych wyników w pobliżu użytkownika
    if (userLocation) {
      (autocompleteOptions as any).locationBias = {
        center: userLocation,
        radius: 50000, // 50km radius - priorytetyzuj wyniki w tym promieniu
      };
    }
    
    const ac = new google.maps.places.Autocomplete(inputRef.current, autocompleteOptions);

    ac.addListener("place_changed", () => {
      const place = ac.getPlace() as any;
      console.log("[useAutocomplete] place_changed event, place:", place);
      
      if (place.geometry) {
        // Build full address - prefer formatted_address, then name with locality
        let fullAddress = place.formatted_address || "";
        
        console.log("[useAutocomplete] Initial formatted_address:", fullAddress);
        
        // If formatted_address is missing or too short, build from components
        if ((!fullAddress || fullAddress.length < 10) && place.address_components) {
          const components = place.address_components as any[];
          const streetNumber = components.find((c: any) => c.types.includes("street_number"))?.long_name || "";
          const route = components.find((c: any) => c.types.includes("route"))?.long_name || "";
          const locality = components.find((c: any) => c.types.includes("locality"))?.long_name || "";
          const adminArea = components.find((c: any) => c.types.includes("administrative_area_level_1"))?.long_name || "";
          const postalCode = components.find((c: any) => c.types.includes("postal_code"))?.long_name || "";
          const country = components.find((c: any) => c.types.includes("country"))?.long_name || "";
          
          const parts: string[] = [];
          
          // For establishments (airports, etc), use name first
          if (place.name && place.types?.includes("airport")) {
            parts.push(place.name);
          } else if (route) {
            parts.push(route + (streetNumber ? " " + streetNumber : ""));
          } else if (place.name) {
            parts.push(place.name);
          }
          
          if (locality) parts.push(locality);
          else if (adminArea) parts.push(adminArea);
          if (postalCode) parts.push(postalCode);
          if (country) parts.push(country);
          
          if (parts.length > 0) {
            fullAddress = parts.join(", ");
          }
        }
        
        // Fallback: use name + locality for establishments
        if ((!fullAddress || fullAddress.length < 5) && place.name) {
          const locality = place.address_components?.find((c: any) => c.types.includes("locality"))?.long_name;
          fullAddress = locality ? `${place.name}, ${locality}` : place.name;
        }
        
        console.log("[useAutocomplete] Final fullAddress:", fullAddress);
        
        // Force update the input value to match our constructed address
        if (inputRef.current) {
          inputRef.current.value = fullAddress;
        }
        
        // Create modified place with full address
        const modifiedPlace = {
          ...place,
          formatted_address: fullAddress
        };
        
        // Use ref to call the latest callback
        onPlaceSelectRef.current(modifiedPlace);
      }
    });

    setAutocomplete(ac);

    return () => {
      google.maps.event.clearInstanceListeners(ac);
    };
  }, [ready, inputRef.current]);

  return autocomplete;
}
