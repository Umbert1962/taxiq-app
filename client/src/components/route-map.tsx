import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useGoogleMaps } from "@/hooks/use-google-maps";
import { Loader2, LocateFixed } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Driver } from "@shared/schema";

const DEFAULT_RADIUS_KM = 10;

type OnlineDriver = Pick<Driver, 'id' | 'name' | 'vehiclePlate' | 'vehicleModel'> & {
  currentLat: number | null;
  currentLng: number | null;
};

function calculateDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

interface RouteMapProps {
  pickup?: google.maps.places.PlaceResult | null;
  destination?: google.maps.places.PlaceResult | null;
  stops?: Array<{ address: string; lat: string; lng: string }>;
  className?: string;
  onLocationFound?: (lat: number, lng: number) => void;
  showMyLocation?: boolean;
  showNearbyDrivers?: boolean;
  trackingDriverId?: string | null;
  trackingDriverLat?: number | null;
  trackingDriverLng?: number | null;
  // Tryb kierowcy - pokazuje dwie trasy
  driverMode?: boolean;
  rideStatus?: string;
}

export function RouteMap({ 
  pickup, 
  destination, 
  stops = [],
  className = "", 
  onLocationFound, 
  showMyLocation = true,
  showNearbyDrivers = true,
  trackingDriverId,
  trackingDriverLat,
  trackingDriverLng,
  driverMode = false,
  rideStatus = "accepted"
}: RouteMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const { ready } = useGoogleMaps();
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer | null>(null);
  const [rideRouteRenderer, setRideRouteRenderer] = useState<google.maps.DirectionsRenderer | null>(null);
  const [userMarker, setUserMarker] = useState<google.maps.Marker | null>(null);
  const [pickupMarker, setPickupMarker] = useState<google.maps.Marker | null>(null);
  const [destMarker, setDestMarker] = useState<google.maps.Marker | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [initialLocationSet, setInitialLocationSet] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState(false);
  const driverMarkersRef = useRef<google.maps.Marker[]>([]);
  const trackingMarkerRef = useRef<google.maps.Marker | null>(null);

  // Pobierz kierowców online
  const { data: onlineDrivers } = useQuery<OnlineDriver[]>({
    queryKey: ["/api/drivers/online"],
    refetchInterval: 5000,
    enabled: ready && showNearbyDrivers,
  });

  const nearbyDrivers = onlineDrivers?.filter((driver) => {
    if (driver.currentLat == null || driver.currentLng == null || !userLocation) return true;
    const distance = calculateDistanceKm(
      userLocation.lat, userLocation.lng,
      driver.currentLat, driver.currentLng
    );
    return distance <= DEFAULT_RADIUS_KM;
  }) || [];

  const locateUser = () => {
    if (!map || !navigator.geolocation) return;
    
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const userPos = { lat: latitude, lng: longitude };
        
        map.setCenter(userPos);
        map.setZoom(15);
        
        if (userMarker) {
          userMarker.setPosition(userPos);
        } else {
          const marker = new google.maps.Marker({
            position: userPos,
            map: map,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: "#4285F4",
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 3,
            },
            title: "Twoja lokalizacja",
          });
          setUserMarker(marker);
        }
        
        if (onLocationFound) {
          onLocationFound(latitude, longitude);
        }
        setUserLocation(userPos);
        setIsLocating(false);
      },
      (error) => {
        console.error("Błąd GPS:", error);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Odśwież mapę gdy użytkownik wraca do aplikacji
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && map && mapRef.current) {
        console.log("[RouteMap] Page became visible, forcing map refresh");
        
        // Wymuszamy przerysowanie kontenera mapy
        const container = mapRef.current;
        const currentDisplay = container.style.display;
        container.style.display = 'none';
        // Wymuszenie reflow przez odczyt właściwości
        void container.offsetHeight;
        container.style.display = currentDisplay || 'block';
        
        // Opóźnione wywołanie resize
        setTimeout(() => {
          if (map) {
            google.maps.event.trigger(map, 'resize');
            // Przywróć centrum mapy
            const center = map.getCenter();
            if (center) {
              map.setCenter(center);
            }
            console.log("[RouteMap] Map refreshed after visibility change");
          }
        }, 100);
      }
    };
    
    // Obsługuj też pageshow dla iOS Safari
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted && map && mapRef.current) {
        console.log("[RouteMap] Page restored from bfcache, refreshing map");
        setTimeout(() => {
          if (map) {
            google.maps.event.trigger(map, 'resize');
            const center = map.getCenter();
            if (center) {
              map.setCenter(center);
            }
          }
        }, 100);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', handlePageShow);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [map]);

  useEffect(() => {
    console.log("[RouteMap] Init effect - ready:", ready, "mapRef:", !!mapRef.current, "map exists:", !!map);
    if (!ready || !mapRef.current || map) return;

    console.log("[RouteMap] Creating new Google Map...");
    try {
      const newMap = new google.maps.Map(mapRef.current, {
        center: { lat: 52.2297, lng: 21.0122 },
        zoom: 12,
        gestureHandling: 'greedy',
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        styles: [],
      });
      console.log("[RouteMap] Map created successfully");

      const renderer = new google.maps.DirectionsRenderer({
        map: newMap,
        polylineOptions: {
          strokeColor: "#4285F4",
          strokeWeight: 5,
          strokeOpacity: 0.8,
        },
        suppressMarkers: driverMode,
      });
      console.log("[RouteMap] DirectionsRenderer created");

      // Drugi renderer dla trasy zamówienia (zielona) w trybie kierowcy
      const rideRenderer = new google.maps.DirectionsRenderer({
        map: newMap,
        polylineOptions: {
          strokeColor: "#bfff00",
          strokeWeight: 4,
          strokeOpacity: 0.7,
        },
        suppressMarkers: true,
      });

      setMap(newMap);
      setDirectionsRenderer(renderer);
      setRideRouteRenderer(rideRenderer);
    } catch (err) {
      console.error("[RouteMap] Error creating map:", err);
    }
  }, [ready]);

  // Automatycznie pobierz lokalizację przy starcie
  useEffect(() => {
    if (map && !initialLocationSet && showMyLocation && navigator.geolocation) {
      setInitialLocationSet(true);
      setLocationError(false);
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const userPos = { lat: latitude, lng: longitude };
          
          // W trybie kierowcy nie centruj na użytkowniku - dopasuj do całej trasy
          if (!driverMode) {
            map.setCenter(userPos);
            map.setZoom(14);
          }
          
          const marker = new google.maps.Marker({
            position: userPos,
            map: map,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: "#4285F4",
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 3,
            },
            title: driverMode ? "Twoja pozycja" : "Twoja lokalizacja",
          });
          setUserMarker(marker);
          
          if (onLocationFound) {
            onLocationFound(latitude, longitude);
          }
          setUserLocation(userPos);
          setLocationError(false);
        },
        (error) => {
          console.error("Geolocation error:", error);
          setLocationError(true);
          
          // W trybie kierowcy - dopasuj mapę do pickup i destination mimo braku lokalizacji
          if (driverMode && pickup?.geometry?.location && destination?.geometry?.location) {
            const pickupLat = typeof pickup.geometry.location.lat === 'function' 
              ? pickup.geometry.location.lat() 
              : pickup.geometry.location.lat;
            const pickupLng = typeof pickup.geometry.location.lng === 'function' 
              ? pickup.geometry.location.lng() 
              : pickup.geometry.location.lng;
            const destLat = typeof destination.geometry.location.lat === 'function' 
              ? destination.geometry.location.lat() 
              : destination.geometry.location.lat;
            const destLng = typeof destination.geometry.location.lng === 'function' 
              ? destination.geometry.location.lng() 
              : destination.geometry.location.lng;
              
            const bounds = new google.maps.LatLngBounds();
            bounds.extend({ lat: pickupLat, lng: pickupLng });
            bounds.extend({ lat: destLat, lng: destLng });
            map.fitBounds(bounds, 50);
          }
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, [map, initialLocationSet, showMyLocation, onLocationFound, driverMode, pickup, destination]);

  // Rysuj markery kierowców w pobliżu
  useEffect(() => {
    if (!map || !showNearbyDrivers) return;

    // Usuń stare markery
    driverMarkersRef.current.forEach((marker) => marker.setMap(null));
    driverMarkersRef.current = [];

    // Dodaj nowe markery
    const infoWindow = new google.maps.InfoWindow();

    nearbyDrivers.forEach((driver) => {
      if (driver.currentLat == null || driver.currentLng == null) return;
      
      // Nie pokazuj kierowcy który jest śledzony osobno
      if (trackingDriverId && driver.id === trackingDriverId) return;

      const marker = new google.maps.Marker({
        position: { lat: driver.currentLat, lng: driver.currentLng },
        map: map,
        title: driver.name,
        icon: {
          url: "data:image/svg+xml," + encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="#bfff00" stroke="#000" stroke-width="1">
              <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C1.4 11.3 1 12.1 1 13v3c0 .6.4 1 1 1h2"/>
              <circle cx="7" cy="17" r="2"/>
              <circle cx="17" cy="17" r="2"/>
            </svg>
          `),
          scaledSize: new google.maps.Size(28, 28),
          anchor: new google.maps.Point(14, 14),
        },
      });

      marker.addListener("click", () => {
        const model = driver.vehicleModel || "Nieznany model";
        const plate = driver.vehiclePlate || "Brak numeru";
        infoWindow.setContent(`
          <div style="color:#000;font-family:Inter,sans-serif;padding:4px 2px;min-width:120px;">
            <div style="font-weight:700;font-size:13px;margin-bottom:4px;">${model}</div>
            <div style="font-size:12px;color:#333;">${plate}</div>
          </div>
        `);
        infoWindow.open(map, marker);
      });

      driverMarkersRef.current.push(marker);
    });

    return () => { infoWindow.close(); };
  }, [map, nearbyDrivers, showNearbyDrivers, trackingDriverId]);

  // Śledzenie zbliżającej się taksówki
  useEffect(() => {
    if (!map || !trackingDriverLat || !trackingDriverLng) {
      if (trackingMarkerRef.current) {
        trackingMarkerRef.current.setMap(null);
        trackingMarkerRef.current = null;
      }
      return;
    }

    const driverPos = { lat: trackingDriverLat, lng: trackingDriverLng };

    if (trackingMarkerRef.current) {
      trackingMarkerRef.current.setPosition(driverPos);
    } else {
      trackingMarkerRef.current = new google.maps.Marker({
        position: driverPos,
        map: map,
        title: "Twoja taksówka",
        icon: {
          url: "data:image/svg+xml," + encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="#bfff00" stroke="#000" stroke-width="1">
              <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C1.4 11.3 1 12.1 1 13v3c0 .6.4 1 1 1h2"/>
              <circle cx="7" cy="17" r="2"/>
              <circle cx="17" cy="17" r="2"/>
            </svg>
          `),
          scaledSize: new google.maps.Size(40, 40),
          anchor: new google.maps.Point(20, 20),
        },
        zIndex: 1000,
      });
    }
  }, [map, trackingDriverLat, trackingDriverLng]);

  // Dodaj markery pasażera i celu w trybie kierowcy
  useEffect(() => {
    if (!map || !driverMode) {
      if (pickupMarker) {
        pickupMarker.setMap(null);
        setPickupMarker(null);
      }
      if (destMarker) {
        destMarker.setMap(null);
        setDestMarker(null);
      }
      return;
    }

    // Marker pasażera (zielony)
    if (pickup?.geometry?.location) {
      const pickupLat = typeof pickup.geometry.location.lat === 'function' 
        ? pickup.geometry.location.lat() 
        : pickup.geometry.location.lat;
      const pickupLng = typeof pickup.geometry.location.lng === 'function' 
        ? pickup.geometry.location.lng() 
        : pickup.geometry.location.lng;

      if (pickupMarker) {
        pickupMarker.setPosition({ lat: pickupLat, lng: pickupLng });
      } else {
        const marker = new google.maps.Marker({
          position: { lat: pickupLat, lng: pickupLng },
          map: map,
          title: "Lokalizacja pasażera",
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 12,
            fillColor: "#bfff00",
            fillOpacity: 1,
            strokeColor: "#000",
            strokeWeight: 2,
          },
          zIndex: 999,
        });
        setPickupMarker(marker);
      }
    }

    // Marker celu (czerwony)
    if (destination?.geometry?.location) {
      const destLat = typeof destination.geometry.location.lat === 'function' 
        ? destination.geometry.location.lat() 
        : destination.geometry.location.lat;
      const destLng = typeof destination.geometry.location.lng === 'function' 
        ? destination.geometry.location.lng() 
        : destination.geometry.location.lng;

      if (destMarker) {
        destMarker.setPosition({ lat: destLat, lng: destLng });
      } else {
        const marker = new google.maps.Marker({
          position: { lat: destLat, lng: destLng },
          map: map,
          title: "Cel podróży",
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: "#ff4444",
            fillOpacity: 1,
            strokeColor: "#fff",
            strokeWeight: 2,
          },
          zIndex: 998,
        });
        setDestMarker(marker);
      }
    }
  }, [map, driverMode, pickup, destination]);

  useEffect(() => {
    console.log("[RouteMap] Directions effect - map:", !!map, "renderer:", !!directionsRenderer, 
      "pickup:", !!pickup?.geometry?.location, "dest:", !!destination?.geometry?.location, "driverMode:", driverMode);
    
    if (!map || !directionsRenderer) return;

    const directionsService = new google.maps.DirectionsService();

    // W trybie kierowcy - rysuj dwie trasy
    if (driverMode && pickup?.geometry?.location && destination?.geometry?.location) {
      const pickupLat = typeof pickup.geometry.location.lat === 'function' 
        ? pickup.geometry.location.lat() 
        : pickup.geometry.location.lat;
      const pickupLng = typeof pickup.geometry.location.lng === 'function' 
        ? pickup.geometry.location.lng() 
        : pickup.geometry.location.lng;
      const destLat = typeof destination.geometry.location.lat === 'function' 
        ? destination.geometry.location.lat() 
        : destination.geometry.location.lat;
      const destLng = typeof destination.geometry.location.lng === 'function' 
        ? destination.geometry.location.lng() 
        : destination.geometry.location.lng;

      // Trasa zamówienia (zielona) - od pasażera do celu
      if (rideRouteRenderer) {
        const waypoints = stops.map(stop => ({
          location: { lat: parseFloat(stop.lat), lng: parseFloat(stop.lng) } as google.maps.LatLngLiteral,
          stopover: true,
        }));

        directionsService.route(
          {
            origin: { lat: pickupLat, lng: pickupLng },
            destination: { lat: destLat, lng: destLng },
            travelMode: google.maps.TravelMode.DRIVING,
            region: "PL",
            ...(waypoints.length > 0 ? { waypoints } : {}),
          },
          (result, status) => {
            if (status === google.maps.DirectionsStatus.OK && result) {
              rideRouteRenderer.setDirections(result);
              console.log("[RouteMap] Ride route rendered (green)");
            }
          }
        );
      }

      // Trasa do pasażera (niebieska) - od kierowcy do pasażera
      if (userLocation && rideStatus === "accepted") {
        directionsService.route(
          {
            origin: { lat: userLocation.lat, lng: userLocation.lng },
            destination: { lat: pickupLat, lng: pickupLng },
            travelMode: google.maps.TravelMode.DRIVING,
            region: "PL",
          },
          (result, status) => {
            if (status === google.maps.DirectionsStatus.OK && result) {
              directionsRenderer.setDirections(result);
              console.log("[RouteMap] Driver to pickup route rendered (blue)");
              
              // Dopasuj mapę do trasy
              const bounds = new google.maps.LatLngBounds();
              bounds.extend({ lat: userLocation.lat, lng: userLocation.lng });
              bounds.extend({ lat: pickupLat, lng: pickupLng });
              bounds.extend({ lat: destLat, lng: destLng });
              map.fitBounds(bounds, 50);
            }
          }
        );
      } else if (rideStatus === "in_progress" && userLocation) {
        // W trakcie kursu - trasa od kierowcy do celu
        const waypoints = stops.map(stop => ({
          location: { lat: parseFloat(stop.lat), lng: parseFloat(stop.lng) } as google.maps.LatLngLiteral,
          stopover: true,
        }));

        directionsService.route(
          {
            origin: { lat: userLocation.lat, lng: userLocation.lng },
            destination: { lat: destLat, lng: destLng },
            travelMode: google.maps.TravelMode.DRIVING,
            region: "PL",
            ...(waypoints.length > 0 ? { waypoints } : {}),
          },
          (result, status) => {
            if (status === google.maps.DirectionsStatus.OK && result) {
              directionsRenderer.setDirections(result);
              console.log("[RouteMap] Driver to destination route rendered");
            }
          }
        );
        // Ukryj trasę zamówienia gdy kurs w toku
        if (rideRouteRenderer) {
          rideRouteRenderer.setDirections({ routes: [] } as any);
        }
      }
      return;
    }

    // Standardowy tryb - jedna trasa od pickup do destination
    if (!pickup?.geometry?.location || !destination?.geometry?.location) {
      directionsRenderer.setDirections({ routes: [] } as any);
      return;
    }

    console.log("[RouteMap] Calculating directions...");

    const waypoints = stops.map(stop => ({
      location: { lat: parseFloat(stop.lat), lng: parseFloat(stop.lng) } as google.maps.LatLngLiteral,
      stopover: true,
    }));
    console.log("[RouteMap] Waypoints:", waypoints.length);

    directionsService.route(
      {
        origin: pickup.geometry.location,
        destination: destination.geometry.location,
        travelMode: google.maps.TravelMode.DRIVING,
        region: "PL",
        ...(waypoints.length > 0 ? { waypoints } : {}),
      },
      (result, status) => {
        console.log("[RouteMap] Directions result:", status);
        if (status === google.maps.DirectionsStatus.OK && result) {
          directionsRenderer.setDirections(result);
          console.log("[RouteMap] Directions rendered successfully");
        } else {
          console.error("[RouteMap] Directions failed:", status);
        }
      }
    );
  }, [pickup, destination, stops, map, directionsRenderer, rideRouteRenderer, driverMode, userLocation, rideStatus]);

  if (!ready) {
    return (
      <div className={`flex items-center justify-center bg-card ${className}`}>
        <div className="text-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">Ładowanie mapy...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div
        ref={mapRef}
        className="absolute inset-0"
        data-testid="map-route"
      />
      {/* Komunikat o błędzie lokalizacji w trybie kierowcy */}
      {driverMode && locationError && (
        <div className="absolute top-2 left-2 right-2 bg-destructive/90 text-destructive-foreground px-3 py-2 rounded-md text-xs z-20 flex items-center gap-2">
          <span>Brak dostępu do GPS - trasa od kierowcy niedostępna</span>
          <Button size="sm" variant="secondary" onClick={locateUser} disabled={isLocating} className="ml-auto">
            {isLocating ? <Loader2 className="w-3 h-3 animate-spin" /> : "Spróbuj ponownie"}
          </Button>
        </div>
      )}
      {showMyLocation && (
        <Button
          size="icon"
          variant="secondary"
          className="absolute bottom-4 right-4 shadow-lg z-10"
          onClick={locateUser}
          disabled={isLocating}
          data-testid="button-locate-me"
        >
          {isLocating ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <LocateFixed className="w-5 h-5" />
          )}
        </Button>
      )}
    </div>
  );
}
