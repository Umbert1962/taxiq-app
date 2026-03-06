import { useState } from "react";
import { ArrowLeft, Navigation, MapPin, CheckCircle2, MessageCircle, DollarSign, X, Plus, Loader2, Car, Zap, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { AddressInput } from "@/components/address-input";
import { RouteMap } from "@/components/route-map";
import { useLocationTracking } from "@/hooks/use-location-tracking";
import { useToast } from "@/hooks/use-toast";
import type { Ride } from "@shared/schema";

interface DriverNavigationProps {
  ride: Ride;
  onBack: () => void;
  onStart?: () => void;
  onComplete?: (negotiatedPrice?: number) => void;
  onOpenChat?: () => void;
  isPending?: boolean;
  preferredNavigation?: string;
}

export function DriverNavigation({ ride, onBack, onStart, onComplete, onOpenChat, isPending, preferredNavigation = "google" }: DriverNavigationProps) {
  const [showNegotiatedInput, setShowNegotiatedInput] = useState(false);
  const [negotiatedPrice, setNegotiatedPrice] = useState("");
  const { toast } = useToast();
  const [showAddStop, setShowAddStop] = useState(false);
  const [newStopAddress, setNewStopAddress] = useState("");
  const [newStopPlace, setNewStopPlace] = useState<{ 
    geometry?: { location?: { lat: () => number; lng: () => number } };
    formatted_address?: string;
  } | null>(null);
  const queryClient = useQueryClient();

  const isActiveRide = ride.status === "accepted" || ride.status === "in_progress";

  useLocationTracking({
    rideId: isActiveRide ? ride.id : null,
    role: "driver",
    enabled: isActiveRide,
    intervalMs: 3000,
  });

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/rides", ride.id, "messages", "unread"],
    queryFn: async () => {
      const res = await fetch(`/api/rides/${ride.id}/messages/unread?recipientType=driver`, { credentials: "include" });
      return res.json();
    },
    enabled: isActiveRide,
    refetchInterval: 3000,
  });

  const unreadCount = unreadData?.count || 0;

  const addStopMutation = useMutation({
    mutationFn: async (stop: { address: string; lat: string; lng: string }) => {
      return await apiRequest("POST", `/api/rides/${ride.id}/stops`, stop);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/driver/rides"] });
      setShowAddStop(false);
      setNewStopAddress("");
      setNewStopPlace(null);
    },
  });

  const removeStopMutation = useMutation({
    mutationFn: async (stop: { address: string; lat: string; lng: string }) => {
      return await apiRequest("POST", `/api/rides/${ride.id}/stops/remove`, stop);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/driver/rides"] });
    },
  });

  const canStart = ride.status === "accepted";
  const canComplete = ride.status === "in_progress";
  const isPhoneOrder = ride.orderSource === "phone";

  const handleCompleteWithPrice = () => {
    if (negotiatedPrice && parseFloat(negotiatedPrice) > 0) {
      onComplete?.(parseFloat(negotiatedPrice) * 100);
      setShowNegotiatedInput(false);
      setNegotiatedPrice("");
    }
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <header className="shrink-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="px-3 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={onBack} data-testid="button-back">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Wróć
              </Button>
              <div className="border-l border-border pl-2">
                <p className="font-semibold text-sm">Nawigacja</p>
                <p className="text-xs text-muted-foreground">
                  {ride.status === "accepted" ? "Do pasażera" : "Do celu"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                size="icon" 
                variant="outline" 
                onClick={() => window.open("tel:+48732125585", "_self")}
                data-testid="button-call-passenger-nav"
              >
                <Phone className="w-4 h-4" />
              </Button>
              {onOpenChat && (
                <div className="relative">
                  <Button size="icon" variant="outline" onClick={onOpenChat} data-testid="button-chat">
                    <MessageCircle className="w-4 h-4" />
                  </Button>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full animate-pulse" data-testid="badge-unread-messages-nav">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 relative min-h-0">
        {ride.pickupLat && ride.pickupLng && ride.destLat && ride.destLng ? (
          <RouteMap
            pickup={{
              geometry: {
                location: {
                  lat: () => parseFloat(ride.pickupLat!),
                  lng: () => parseFloat(ride.pickupLng!),
                },
              },
              formatted_address: ride.pickupLocation,
            } as any}
            destination={{
              geometry: {
                location: {
                  lat: () => parseFloat(ride.destLat!),
                  lng: () => parseFloat(ride.destLng!),
                },
              },
              formatted_address: ride.destination,
            } as any}
            stops={(ride.stops as any[]) || []}
            className="w-full h-full"
            showMyLocation={true}
            showNearbyDrivers={false}
            driverMode={true}
            rideStatus={ride.status}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/20 text-muted-foreground">
            Brak danych lokalizacji
          </div>
        )}
      </div>

      <footer className="shrink-0 bg-card border-t border-border p-2 space-y-2 max-h-[40vh] overflow-y-auto">
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <MapPin className="w-3 h-3 text-primary shrink-0" />
            <span className="text-muted-foreground">Od:</span>
            <span className="font-medium truncate">{ride.pickupLocation}</span>
          </div>
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <Navigation className="w-3 h-3 text-primary shrink-0" />
            <span className="text-muted-foreground">Do:</span>
            <span className="font-medium truncate">{ride.destination}</span>
          </div>
        </div>

        {/* Przystanki */}
        {((ride.stops as Array<{ address: string; lat: string; lng: string }>) || []).length > 0 && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Przystanki:</p>
            {((ride.stops as Array<{ address: string; lat: string; lng: string }>) || []).map((stop, index) => (
              <div key={`${stop.address}-${stop.lat}-${stop.lng}`} className="flex items-center gap-2 text-xs bg-muted/50 rounded px-2 py-1">
                <MapPin className="w-3 h-3 text-orange-500 shrink-0" />
                <span className="flex-1 truncate">{stop.address}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={() => removeStopMutation.mutate({ address: stop.address, lat: stop.lat, lng: stop.lng })}
                  disabled={removeStopMutation.isPending}
                  data-testid={`button-remove-stop-${index}`}
                >
                  <X className="w-3 h-3 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Dodaj przystanek */}
        {!showAddStop ? (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setShowAddStop(true)}
            data-testid="button-add-stop"
          >
            <Plus className="w-4 h-4 mr-2" />
            Dodaj przystanek
          </Button>
        ) : (
          <div className="space-y-2 p-2 border rounded-md bg-muted/30">
            <AddressInput
              value={newStopAddress}
              onChange={setNewStopAddress}
              onPlaceSelect={(place) => {
                setNewStopPlace(place as any);
                const addr = (place as any).formatted_address || place.name || "";
                if (addr) setNewStopAddress(addr);
              }}
              placeholder="Adres przystanku"
              data-testid="input-new-stop"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1"
                onClick={() => {
                  if (newStopPlace?.geometry?.location) {
                    addStopMutation.mutate({
                      address: newStopAddress,
                      lat: newStopPlace.geometry.location.lat().toString(),
                      lng: newStopPlace.geometry.location.lng().toString(),
                    });
                  }
                }}
                disabled={!newStopPlace || addStopMutation.isPending}
                data-testid="button-confirm-stop"
              >
                {addStopMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Dodaj"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowAddStop(false);
                  setNewStopAddress("");
                  setNewStopPlace(null);
                }}
                data-testid="button-cancel-stop"
              >
                Anuluj
              </Button>
            </div>
          </div>
        )}

        {(ride.isCito && ride.citoPrice) ? (
          <div className="text-center text-orange-500 font-bold flex items-center justify-center gap-1">
            <Zap className="w-4 h-4" />
            {ride.citoPrice} PLN (CITO)
          </div>
        ) : ride.estimatedPrice ? (
          <div className="text-center text-primary font-semibold">
            {ride.estimatedPrice} PLN
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {canStart && onStart && (
            <Button 
              className="flex-1"
              onClick={onStart} 
              disabled={isPending}
              data-testid="button-start-ride"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Car className="w-4 h-4 mr-2" />}
              Rozpocznij przejazd
            </Button>
          )}
          
          {canComplete && onComplete && !showNegotiatedInput && (
            <>
              <Button 
                className="flex-1"
                onClick={() => onComplete()} 
                disabled={isPending}
                data-testid="button-complete-ride"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Zakończ
              </Button>
              <Button 
                variant="outline"
                onClick={() => setShowNegotiatedInput(true)} 
                disabled={isPending}
                data-testid="button-negotiated-price"
              >
                <DollarSign className="w-4 h-4 mr-1" />
                Cena umowna
              </Button>
            </>
          )}

          {canComplete && showNegotiatedInput && (
            <div className="flex gap-2 w-full">
              <Input
                type="number"
                placeholder="Cena w PLN"
                value={negotiatedPrice}
                onChange={(e) => setNegotiatedPrice(e.target.value)}
                className="flex-1"
                data-testid="input-negotiated-price"
              />
              <Button 
                onClick={handleCompleteWithPrice}
                disabled={isPending || !negotiatedPrice}
                data-testid="button-complete-with-price"
              >
                <CheckCircle2 className="w-4 h-4 mr-1" />
                Zakończ
              </Button>
              <Button 
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowNegotiatedInput(false);
                  setNegotiatedPrice("");
                }}
                data-testid="button-cancel-negotiated"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        <Button 
          variant="outline"
          className="w-full" 
          onClick={() => {
            if (ride.status === "accepted") {
              const pickup = encodeURIComponent(ride.pickupLocation);
              if (preferredNavigation === "waze") {
                const lat = ride.pickupLat || "";
                const lng = ride.pickupLng || "";
                window.open(`https://waze.com/ul?ll=${lat},${lng}&navigate=yes`, '_blank');
              } else {
                window.open(`https://www.google.com/maps/dir/?api=1&destination=${pickup}&travelmode=driving`, '_blank');
              }
            } else {
              const dest = encodeURIComponent(ride.destination);
              const stops = ride.stops as Array<{ address: string; lat: string; lng: string }> | null;
              
              if (preferredNavigation === "waze") {
                const lat = ride.destLat || "";
                const lng = ride.destLng || "";
                window.open(`https://waze.com/ul?ll=${lat},${lng}&navigate=yes`, '_blank');
              } else if (stops && stops.length > 0) {
                const waypointsStr = stops.map(s => encodeURIComponent(s.address)).join('|');
                window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}&waypoints=${waypointsStr}&travelmode=driving`, '_blank');
              } else {
                window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`, '_blank');
              }
            }
          }}
          data-testid="button-open-maps-nav"
        >
          <Navigation className="w-4 h-4 mr-2" />
          Nawiguj do {ride.status === "accepted" ? "pasażera" : "celu"}
        </Button>
      </footer>
    </div>
  );
}
