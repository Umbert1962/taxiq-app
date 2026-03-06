import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useGoogleMaps } from "@/hooks/use-google-maps";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Car, Loader2, MapPin } from "lucide-react";
import type { Driver } from "@shared/schema";

const WARSAW_CENTER = { lat: 52.2297, lng: 21.0122 };
const MAX_DISTANCE_KM = 10;

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

interface NearbyTaxisMapProps {
  pickupLat?: number | null;
  pickupLng?: number | null;
}

export function NearbyTaxisMap({ pickupLat, pickupLng }: NearbyTaxisMapProps = {}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [geoFailed, setGeoFailed] = useState(false);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const { ready } = useGoogleMaps();

  const { data: onlineDrivers } = useQuery<OnlineDriver[]>({
    queryKey: ["/api/drivers/online"],
    refetchInterval: 5000,
    enabled: ready,
  });

  const effectiveCenter = userLocation 
    || (pickupLat && pickupLng ? { lat: pickupLat, lng: pickupLng } : null);

  const nearbyDrivers = onlineDrivers?.filter((driver) => {
    if (driver.currentLat == null || driver.currentLng == null || !effectiveCenter) return true;
    const distance = calculateDistanceKm(
      effectiveCenter.lat, effectiveCenter.lng,
      driver.currentLat, driver.currentLng
    );
    return distance <= MAX_DISTANCE_KM;
  }) || [];

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setGeoFailed(true),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      setGeoFailed(true);
    }
  }, []);

  useEffect(() => {
    if (!geoFailed || userLocation) return;
    if (pickupLat && pickupLng) {
      setUserLocation({ lat: pickupLat, lng: pickupLng });
    } else {
      setUserLocation(WARSAW_CENTER);
    }
  }, [geoFailed, pickupLat, pickupLng, userLocation]);

  useEffect(() => {
    if (!geoFailed || !mapInstanceRef.current || !window.google) return;
    if (pickupLat && pickupLng) {
      const newCenter = { lat: pickupLat, lng: pickupLng };
      mapInstanceRef.current.setCenter(newCenter);
      setUserLocation(newCenter);
    }
  }, [pickupLat, pickupLng, geoFailed]);

  const userMarkerRef = useRef<google.maps.Marker | null>(null);

  // Initialize map once Google is ready
  useEffect(() => {
    if (!ready || !mapRef.current || mapInstanceRef.current || !window.google) return;

    const center = userLocation || WARSAW_CENTER;
    const newMap = new window.google.maps.Map(mapRef.current, {
      center,
      zoom: 14,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      styles: [], // Pusta tablica stylów = domyślna jasna mapa Google
    });

    mapInstanceRef.current = newMap;
  }, [ready]);

  // Center map and add marker when user location is available
  useEffect(() => {
    if (!mapInstanceRef.current || !userLocation || !window.google) return;

    // Center map on user location
    // @ts-expect-error - Google Maps types conflict
    mapInstanceRef.current.setCenter(userLocation);

    // Remove old marker if exists
    if (userMarkerRef.current) {
      userMarkerRef.current.setMap(null);
    }

    // Add user location marker
    userMarkerRef.current = new window.google.maps.Marker({
      position: userLocation,
      map: mapInstanceRef.current,
      title: "Twoja lokalizacja",
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: "#bfff00",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 2,
      },
    });
  }, [userLocation]);

  useEffect(() => {
    if (!mapInstanceRef.current || !window.google) return;

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    nearbyDrivers.forEach((driver) => {
      if (driver.currentLat == null || driver.currentLng == null) return;

      const marker = new window.google.maps.Marker({
        position: { lat: driver.currentLat, lng: driver.currentLng },
        map: mapInstanceRef.current!,
        title: driver.name,
        icon: {
          url: "data:image/svg+xml," + encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#bfff00" stroke-width="2">
              <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C1.4 11.3 1 12.1 1 13v3c0 .6.4 1 1 1h2"/>
              <circle cx="7" cy="17" r="2"/>
              <circle cx="17" cy="17" r="2"/>
            </svg>
          `),
          scaledSize: new window.google.maps.Size(40, 40),
          anchor: new window.google.maps.Point(20, 20),
        },
      });

      markersRef.current.push(marker);
    });
  }, [nearbyDrivers]);

  if (!ready) {
    return (
      <Card className="glow-border">
        <CardContent className="h-64 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glow-border overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Car className="w-5 h-5 text-primary" />
          Taksówki w pobliżu
          {nearbyDrivers.length > 0 && (
            <span className="text-sm font-normal text-muted-foreground">
              ({nearbyDrivers.length} w promieniu {MAX_DISTANCE_KM} km)
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div ref={mapRef} className="h-64 w-full" data-testid="map-nearby-taxis" />
        {nearbyDrivers.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 pointer-events-none">
            <div className="text-center text-muted-foreground">
              <MapPin className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">Szukamy taksówek w promieniu {MAX_DISTANCE_KM} km...</p>
            </div>
          </div>
        )}
        {nearbyDrivers.length > 0 && nearbyDrivers.every(d => d.currentLat == null || d.currentLng == null) && (
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-center pointer-events-none">
            <div className="bg-background/90 rounded-md px-3 py-1.5 text-center text-muted-foreground text-xs">
              {nearbyDrivers.length} kierowców online - aktualizacja lokalizacji...
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
