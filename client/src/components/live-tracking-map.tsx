import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Navigation, Clock, Car } from "lucide-react";
import { useGoogleMaps } from "@/hooks/use-google-maps";

interface DriverInfo {
  name: string;
  vehiclePlate?: string;
  photoUrl?: string | null;
  languages?: string[];
}

interface RideStop {
  address: string;
  lat: string;
  lng: string;
}

interface LiveTrackingMapProps {
  rideId: string;
  pickupLat?: string | null;
  pickupLng?: string | null;
  destLat?: string | null;
  destLng?: string | null;
  role: "driver" | "passenger";
  driverName?: string;
  driverInfo?: DriverInfo;
  stops?: RideStop[];
}

interface LocationData {
  driver: {
    lat: string | null;
    lng: string | null;
    updatedAt: string | null;
  };
  passenger: {
    lat: string | null;
    lng: string | null;
    updatedAt: string | null;
  };
}

export function LiveTrackingMap({
  rideId,
  pickupLat,
  pickupLng,
  destLat,
  destLng,
  role,
  driverName,
  driverInfo,
  stops,
}: LiveTrackingMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [etaToPickup, setEtaToPickup] = useState<string | null>(null);
  const [distToPickup, setDistToPickup] = useState<string | null>(null);
  const [etaToDestination, setEtaToDestination] = useState<string | null>(null);
  const [distToDestination, setDistToDestination] = useState<string | null>(null);
  const driverMarkerRef = useRef<google.maps.Marker | null>(null);
  const passengerMarkerRef = useRef<google.maps.Marker | null>(null);
  const pickupMarkerRef = useRef<google.maps.Marker | null>(null);
  const destMarkerRef = useRef<google.maps.Marker | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const lastRouteCalcRef = useRef<number>(0);
  const lastDriverPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const hasFittedBoundsRef = useRef<boolean>(false);
  const userInteractedRef = useRef<boolean>(false);
  const { ready } = useGoogleMaps();

  const { data: locations } = useQuery<LocationData>({
    queryKey: ["/api/rides", rideId, "locations"],
    queryFn: async () => {
      const res = await fetch(`/api/rides/${rideId}/locations`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch locations");
      return res.json();
    },
    refetchInterval: 3000,
    enabled: !!rideId,
  });

  // Odśwież mapę gdy użytkownik wraca do aplikacji
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && map) {
        console.log("[LiveTrackingMap] Page became visible, triggering resize");
        google.maps.event.trigger(map, 'resize');
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [map]);

  // Inicjalizacja mapy - tylko raz gdy ready
  useEffect(() => {
    if (!ready || !mapRef.current || map) return;

    const centerLat = pickupLat ? parseFloat(pickupLat) : 52.4064;
    const centerLng = pickupLng ? parseFloat(pickupLng) : 16.9252;

    const newMap = new google.maps.Map(mapRef.current, {
      center: { lat: centerLat, lng: centerLng },
      zoom: 14,
      gestureHandling: 'greedy',
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      styles: [],
    });

    newMap.addListener('dragstart', () => { userInteractedRef.current = true; });

    setMap(newMap);
  }, [ready]);

  // Dodaj markery po utworzeniu mapy
  useEffect(() => {
    if (!map) return;

    // Marker odbioru
    if (pickupLat && pickupLng && !pickupMarkerRef.current) {
      pickupMarkerRef.current = new google.maps.Marker({
        position: { lat: parseFloat(pickupLat), lng: parseFloat(pickupLng) },
        map: map,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: "#BFFF00",
          fillOpacity: 1,
          strokeColor: "#000",
          strokeWeight: 2,
        },
        title: "Odbiór",
      });
    }

    // Marker celu
    if (destLat && destLng && !destMarkerRef.current) {
      destMarkerRef.current = new google.maps.Marker({
        position: { lat: parseFloat(destLat), lng: parseFloat(destLng) },
        map: map,
        icon: {
          path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
          scale: 8,
          fillColor: "#FF6B6B",
          fillOpacity: 1,
          strokeColor: "#000",
          strokeWeight: 2,
        },
        title: "Cel",
      });
    }
  }, [map, pickupLat, pickupLng, destLat, destLng]);

  // Inicjalizuj DirectionsRenderer
  useEffect(() => {
    if (!map) return;
    
    if (!directionsRendererRef.current) {
      directionsRendererRef.current = new google.maps.DirectionsRenderer({
        map: map,
        suppressMarkers: true,
        preserveViewport: true,
        polylineOptions: {
          strokeColor: "#4285F4",
          strokeWeight: 5,
          strokeOpacity: 0.8,
        },
      });
    }
  }, [map]);

  // Aktualizuj markery kierowcy i pasażera oraz trasę
  useEffect(() => {
    if (!map || !locations) return;

    // Marker kierowcy (samochodzik)
    if (locations.driver.lat && locations.driver.lng) {
      const driverPos = {
        lat: parseFloat(locations.driver.lat),
        lng: parseFloat(locations.driver.lng),
      };

      if (driverMarkerRef.current) {
        driverMarkerRef.current.setPosition(driverPos);
      } else {
        driverMarkerRef.current = new google.maps.Marker({
          position: driverPos,
          map: map,
          icon: {
            url: "data:image/svg+xml," + encodeURIComponent(`
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="#bfff00" stroke="#000" stroke-width="1.5">
                <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C1.4 11.3 1 12.1 1 13v3c0 .6.4 1 1 1h2"/>
                <circle cx="7" cy="17" r="2"/>
                <circle cx="17" cy="17" r="2"/>
              </svg>
            `),
            scaledSize: new google.maps.Size(32, 32),
            anchor: new google.maps.Point(16, 16),
          },
          title: driverName || "Kierowca",
          zIndex: 1000,
        });
      }

      // Rysuj trasę - z throttlingiem
      if (pickupLat && pickupLng && directionsRendererRef.current) {
        const now = Date.now();
        const timeSinceLastCalc = now - lastRouteCalcRef.current;
        
        const lastPos = lastDriverPosRef.current;
        const movedEnough = !lastPos || 
          Math.abs(driverPos.lat - lastPos.lat) > 0.0005 || 
          Math.abs(driverPos.lng - lastPos.lng) > 0.0005;
        
        if (timeSinceLastCalc > 15000 || (movedEnough && timeSinceLastCalc > 5000)) {
          lastRouteCalcRef.current = now;
          lastDriverPosRef.current = { ...driverPos };
          
          const directionsService = new google.maps.DirectionsService();
          const pickupPos = { lat: parseFloat(pickupLat), lng: parseFloat(pickupLng) };
          const hasDestination = destLat && destLng;
          const destPos = hasDestination ? { lat: parseFloat(destLat), lng: parseFloat(destLng) } : null;
          
          const waypoints: google.maps.DirectionsWaypoint[] = [];
          waypoints.push({ location: pickupPos, stopover: true });
          if (stops && stops.length > 0) {
            for (const stop of stops) {
              waypoints.push({
                location: { lat: parseFloat(stop.lat), lng: parseFloat(stop.lng) },
                stopover: true,
              });
            }
          }

          const routeRequest: google.maps.DirectionsRequest = {
            origin: driverPos,
            destination: destPos || pickupPos,
            travelMode: google.maps.TravelMode.DRIVING,
            region: "PL",
          };

          if (destPos) {
            routeRequest.waypoints = waypoints;
          }
          
          directionsService.route(
            routeRequest,
            (result, status) => {
              if (status === google.maps.DirectionsStatus.OK && result) {
                directionsRendererRef.current?.setDirections(result);
                
                const formatTime = (secs: number) => {
                  const m = Math.ceil(secs / 60);
                  return m >= 60 ? `${Math.floor(m/60)} godz. ${m%60} min` : `${m} min`;
                };
                const formatDist = (meters: number) => {
                  return meters >= 1000 ? `${(meters/1000).toFixed(1)} km` : `${meters} m`;
                };

                const legs = result.routes[0]?.legs;
                if (legs && legs.length > 0) {
                  const firstLeg = legs[0];
                  setEtaToPickup(formatTime(firstLeg.duration?.value || 0));
                  setDistToPickup(formatDist(firstLeg.distance?.value || 0));

                  if (legs.length > 1) {
                    let destSeconds = 0;
                    let destMeters = 0;
                    for (let i = 1; i < legs.length; i++) {
                      destSeconds += legs[i].duration?.value || 0;
                      destMeters += legs[i].distance?.value || 0;
                    }
                    setEtaToDestination(formatTime(destSeconds));
                    setDistToDestination(formatDist(destMeters));
                  } else {
                    setEtaToDestination(null);
                    setDistToDestination(null);
                  }
                }
                
                if (!hasFittedBoundsRef.current && !userInteractedRef.current && map) {
                  const bounds = new google.maps.LatLngBounds();
                  bounds.extend(driverPos);
                  bounds.extend(pickupPos);
                  if (destPos) bounds.extend(destPos);
                  if (stops && stops.length > 0) {
                    for (const stop of stops) {
                      bounds.extend({ lat: parseFloat(stop.lat), lng: parseFloat(stop.lng) });
                    }
                  }
                  map.fitBounds(bounds, 60);
                  hasFittedBoundsRef.current = true;
                }
              }
            }
          );
        }
      }
    }

    // Marker pasażera (niebieska kropka)
    if (locations.passenger.lat && locations.passenger.lng) {
      const passengerPos = {
        lat: parseFloat(locations.passenger.lat),
        lng: parseFloat(locations.passenger.lng),
      };

      if (passengerMarkerRef.current) {
        passengerMarkerRef.current.setPosition(passengerPos);
      } else {
        passengerMarkerRef.current = new google.maps.Marker({
          position: passengerPos,
          map: map,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: "#4285F4",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 3,
          },
          title: "Pasażer",
          zIndex: 999,
        });
      }
    }
  }, [map, locations, role, driverName, pickupLat, pickupLng, destLat, destLng, stops]);

  if (!ready) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Navigation className="w-4 h-4 text-primary" />
            {role === "passenger" ? "Śledzenie kierowcy" : "Lokalizacja pasażera"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="h-64 flex items-center justify-center bg-muted/20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0 relative">
        {(etaToPickup || etaToDestination) && (
          <div className="absolute top-3 left-3 right-3 z-10 flex flex-col gap-1.5" data-testid="map-eta-info">
            {etaToPickup && (
              <div className="flex gap-1.5 flex-wrap">
                <Badge className="bg-[#BFFF00] text-black shadow-lg flex items-center gap-1 text-xs" data-testid="badge-eta-pickup">
                  <Clock className="w-3 h-3" />
                  Do pasażera: {etaToPickup}
                </Badge>
                {distToPickup && (
                  <Badge variant="secondary" className="shadow-lg flex items-center gap-1 text-xs" data-testid="badge-dist-pickup">
                    <Navigation className="w-3 h-3" />
                    {distToPickup}
                  </Badge>
                )}
              </div>
            )}
            {etaToDestination && (
              <div className="flex gap-1.5 flex-wrap">
                <Badge className="bg-[#FF6B6B] text-white shadow-lg flex items-center gap-1 text-xs" data-testid="badge-eta-dest">
                  <Clock className="w-3 h-3" />
                  Do celu: {etaToDestination}
                </Badge>
                {distToDestination && (
                  <Badge variant="secondary" className="shadow-lg flex items-center gap-1 text-xs" data-testid="badge-dist-dest">
                    <Navigation className="w-3 h-3" />
                    {distToDestination}
                  </Badge>
                )}
              </div>
            )}
          </div>
        )}
        <div 
          ref={mapRef} 
          className="h-[400px] w-full"
          style={{ minHeight: '400px' }}
          data-testid="map-live-tracking"
        />
        <div className="p-3 flex flex-wrap items-center justify-between gap-4 border-t border-border">
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Car className="w-3 h-3 text-[#BFFF00]" />
              Kierowca
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-[#BFFF00]" />
              Odbiór
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-[#FF6B6B]" />
              Cel
            </div>
          </div>
                  </div>
      </CardContent>
    </Card>
  );
}
