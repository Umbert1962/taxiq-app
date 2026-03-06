import { Helmet } from "react-helmet";
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { MapPin, Navigation, Users, Car, Clock, CheckCircle2, XCircle, Loader2, MessageCircle, Crosshair, Zap, CalendarClock, List, Edit2, User, Plus, X, Heart, Mail, Phone, DollarSign, Ban, ShieldOff, Info } from "lucide-react";
import { SystemMessagesTab, RequiredMessagesModal, useUnreadSystemMessageCount } from "@/components/user-system-messages";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useGeolocation } from "@/hooks/use-geolocation";
import { LocationRequired } from "@/components/location-required";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useGoogleMaps } from "@/hooks/use-google-maps";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { AddressInput } from "@/components/address-input";
import { RouteMap } from "@/components/route-map";
import { RideChat } from "@/components/ride-chat";
import { NearbyDrivers } from "@/components/nearby-drivers";
import { LanguageBadges } from "@/components/language-selector";
import { LiveTrackingMap } from "@/components/live-tracking-map";
import { useLocationTracking } from "@/hooks/use-location-tracking";
import type { Ride, Driver } from "@shared/schema";
import logoImage from "@assets/logo/logo-taxiq-neon.jpg";

type RideWithDriver = Ride & { driver?: Driver | null };

const bookingSchema = z.object({
  pickupLocation: z.string().min(3, "Podaj miejsce odbioru (min. 3 znaki)"),
  destination: z.string().min(3, "Podaj cel podróży (min. 3 znaki)"),
  passengerCount: z.string(),
  requiresCombi: z.boolean().default(false),
  isCito: z.boolean().default(false),
  citoPrice: z.string().optional(),
  isScheduled: z.boolean().default(false),
  scheduledDate: z.string().optional(),
  scheduledTime: z.string().optional(),
}).refine(
  (data) => !data.isScheduled || (data.scheduledDate && data.scheduledTime),
  {
    message: "Podaj datę i godzinę dla zamówienia terminowego",
    path: ["scheduledDate"],
  }
).refine(
  (data) => !data.isCito || (data.citoPrice && parseInt(data.citoPrice) >= 20),
  {
    message: "Podaj swoją cenę dla zamówienia CITO (min. 20 PLN)",
    path: ["citoPrice"],
  }
);

type BookingFormData = z.infer<typeof bookingSchema>;

function StatusBadge({ status }: { status: string }) {
  const statusConfig = {
    pending: { label: "Oczekuje", variant: "secondary" as const, icon: Clock },
    accepted: { label: "Zaakceptowano", variant: "default" as const, icon: CheckCircle2 },
    in_progress: { label: "W trakcie", variant: "default" as const, icon: Car },
    completed: { label: "Zakończono", variant: "secondary" as const, icon: CheckCircle2 },
    cancelled: { label: "Anulowano", variant: "destructive" as const, icon: XCircle },
    cancelled_by_passenger: { label: "Anulowano przez pasażera", variant: "destructive" as const, icon: XCircle },
    cancelled_by_driver: { label: "Anulowano przez kierowcę", variant: "destructive" as const, icon: XCircle },
    no_driver_found: { label: "Brak kierowcy", variant: "destructive" as const, icon: XCircle },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="gap-1.5" data-testid={`badge-status-${status}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  );
}

function RideCard({ ride, onOpenChat }: { ride: RideWithDriver; onOpenChat?: () => void }) {
  const [showEditDestination, setShowEditDestination] = useState(false);
  const [newDestination, setNewDestination] = useState("");
  const [newDestPlace, setNewDestPlace] = useState<{ geometry?: { location?: { lat: () => number; lng: () => number } } } | null>(null);
  const [showBanDialog, setShowBanDialog] = useState(false);
  const { ready: mapsReady } = useGoogleMaps();
  const { toast } = useToast();
  
  const isActiveRide = ride.status === "accepted" || ride.status === "in_progress";
  const isCompleted = ride.status === "completed";
  const completedAt = ride.completedAt ? new Date(ride.completedAt) : null;
  const isWithin24h = completedAt ? (Date.now() - completedAt.getTime()) < 24 * 60 * 60 * 1000 : false;

  const { data: banStatus } = useQuery<{ banned: boolean; ban: any }>({
    queryKey: ["/api/bans/check", ride.id],
    queryFn: async () => {
      const res = await fetch(`/api/bans/check/${ride.id}`, { credentials: "include" });
      if (!res.ok) return { banned: false, ban: null };
      return res.json();
    },
    enabled: isCompleted && !!ride.driverId,
    staleTime: 60000,
  });

  const banMutation = useMutation({
    mutationFn: async (durationDays: number) => {
      const res = await apiRequest("POST", "/api/bans", { rideId: ride.id, durationDays });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Błąd");
      }
      return res.json();
    },
    onSuccess: (_, durationDays) => {
      queryClient.invalidateQueries({ queryKey: ["/api/bans/check", ride.id] });
      setShowBanDialog(false);
      const label = durationDays === 7 ? "7 dni" : durationDays === 14 ? "14 dni" : "3 miesiące";
      toast({ title: "Blokada aktywna", description: `Kierowca zablokowany na ${label}` });
    },
    onError: (error: Error) => {
      toast({ title: "Błąd", description: error.message, variant: "destructive" });
    },
  });
  const canChat = ride.driver && isActiveRide;
  
  const { data: driverRideCount } = useQuery<{ completedRides: number; eligible: boolean }>({
    queryKey: ["/api/passenger/rides-with-driver", ride.driver?.id],
    queryFn: async () => {
      const res = await fetch(`/api/passenger/rides-with-driver/${ride.driver?.id}`, { credentials: "include" });
      if (!res.ok) return { completedRides: 0, eligible: false };
      return res.json();
    },
    enabled: !!ride.driver?.id && isActiveRide,
    staleTime: 30000,
  });

  // Pobierz liczbę nieprzeczytanych wiadomości
  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/rides", ride.id, "messages", "unread", "passenger"],
    queryFn: async () => {
      const res = await fetch(`/api/rides/${ride.id}/messages/unread?recipientType=passenger`, { credentials: "include" });
      return res.json();
    },
    enabled: !!canChat,
    refetchInterval: 3000,
  });
  
  const unreadCount = unreadData?.count || 0;
  
  useLocationTracking({
    rideId: isActiveRide ? ride.id : null,
    role: "passenger",
    enabled: isActiveRide,
    intervalMs: 5000,
  });
  
  const cancelMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/rides/${ride.id}/cancel`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rides"] });
      toast({
        title: "Przejazd anulowany",
        description: "Twoje zamówienie zostało anulowane.",
      });
    },
    onError: (error: Error) => {
      console.error("Cancel error:", error);
      toast({
        title: "Błąd anulowania",
        description: "Nie udało się anulować przejazdu. Spróbuj ponownie.",
        variant: "destructive",
      });
    },
  });

  const updateDestinationMutation = useMutation({
    mutationFn: async (data: { destination: string; destLat: string; destLng: string }) => {
      await apiRequest("PATCH", `/api/rides/${ride.id}/destination`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rides"] });
      setShowEditDestination(false);
      setNewDestination("");
      setNewDestPlace(null);
      toast({
        title: "Cel podróży zmieniony",
        description: "Nowy cel został zapisany. Cena może ulec zmianie.",
      });
    },
    onError: () => {
      toast({
        title: "Błąd",
        description: "Nie udało się zmienić celu podróży",
        variant: "destructive",
      });
    },
  });

  const canCancel = ride.status === "pending" || ride.status === "accepted" || ride.status === "in_progress";
  const canEditDestination = ride.status === "pending" || ride.status === "accepted" || ride.status === "in_progress";

  const handleSaveDestination = () => {
    if (!newDestination || !newDestPlace?.geometry?.location) {
      toast({
        title: "Błąd",
        description: "Wybierz nowy cel z listy adresów",
        variant: "destructive",
      });
      return;
    }
    
    updateDestinationMutation.mutate({
      destination: newDestination,
      destLat: newDestPlace.geometry.location.lat().toString(),
      destLng: newDestPlace.geometry.location.lng().toString(),
    });
  };

  return (
    <>
      <Card className="glow-border" data-testid={`card-ride-${ride.id}`}>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-primary shrink-0" />
                <span className="text-muted-foreground">Od:</span>
                <span className="font-medium" data-testid="text-pickup">{ride.pickupLocation}</span>
              </div>
              {/* Przystanki po drodze (waypoint) */}
              {ride.stops && Array.isArray(ride.stops) && (ride.stops as any[]).filter((s: any) => s.type === 'waypoint').map((stop: any, idx: number) => (
                <div key={`waypoint-${idx}`} className="flex items-center gap-2 text-sm pl-2 border-l-2 border-orange-500/50">
                  <MapPin className="w-3 h-3 text-orange-500 shrink-0" />
                  <span className="text-xs text-muted-foreground">Przystanek:</span>
                  <span className="text-sm" data-testid={`text-waypoint-${idx}`}>{stop.address}</span>
                </div>
              ))}
              <div className="flex items-center gap-2 text-sm">
                <Navigation className="w-4 h-4 text-primary shrink-0" />
                <span className="text-muted-foreground">Do:</span>
                <span className="font-medium" data-testid="text-destination">{ride.destination}</span>
                {canEditDestination && (
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-6 w-6 text-muted-foreground hover:text-primary"
                    onClick={() => setShowEditDestination(true)}
                    data-testid="button-edit-destination"
                  >
                    <Edit2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
              {/* Dodatkowe cele (extra_destination) */}
              {ride.stops && Array.isArray(ride.stops) && (ride.stops as any[]).filter((s: any) => s.type === 'extra_destination').map((stop: any, idx: number) => (
                <div key={`extra-${idx}`} className="flex items-center gap-2 text-sm pl-2 border-l-2 border-blue-500/50">
                  <Navigation className="w-3 h-3 text-blue-500 shrink-0" />
                  <span className="text-xs text-muted-foreground">Następnie:</span>
                  <span className="text-sm" data-testid={`text-extra-dest-${idx}`}>{stop.address}</span>
                </div>
              ))}
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground pt-1">
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  <span>{ride.passengerCount} os.</span>
                </div>
                {ride.isCito && ride.citoPrice ? (
                  <div className="flex items-center gap-1.5 font-bold">
                    <Zap className="w-4 h-4 text-orange-400" />
                    <span className="text-orange-400 text-lg">{ride.citoPrice} PLN (CITO)</span>
                  </div>
                ) : ride.status !== "pending" && ride.estimatedPrice ? (
                  <div className="flex items-center gap-1.5 font-bold">
                    <DollarSign className="w-4 h-4 text-primary" />
                    <span className="text-primary text-lg">{ride.estimatedPrice} PLN</span>
                  </div>
                ) : ride.status === "pending" ? (
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground text-sm">Wybierz kierowcę</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 font-bold">
                    <DollarSign className="w-4 h-4 text-yellow-400" />
                    <span className="text-yellow-400 text-base">Cena umowna</span>
                  </div>
                )}
              </div>
              {ride.notes && ride.notes.includes('Dopłaty:') && ride.status !== "pending" && (
                <div className="text-xs text-muted-foreground mt-1" data-testid="text-surcharges">
                  {ride.notes.split(';').filter((n: string) => n.includes('Dopłaty:')).map((n: string) => n.trim()).join('')}
                </div>
              )}
            </div>
            
            <div className="flex flex-col items-end gap-2">
              <StatusBadge status={ride.status} />
              {ride.status === "accepted" && (
                <Badge variant="outline" className="text-primary border-primary/20 bg-primary/5">
                  Kierowca jedzie
                </Badge>
              )}
              {ride.status === "in_progress" && (
                <Badge variant="outline" className="text-primary border-primary/20 bg-primary/5">
                  W trakcie jazdy
                </Badge>
              )}
            </div>
          </div>

          {ride.driver && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-primary/5 border border-primary/10 shadow-neon">
                {ride.driver.photoUrl ? (
                  <img 
                    src={ride.driver.photoUrl} 
                    alt={ride.driver.name}
                    className="w-20 h-20 rounded-full object-cover border-2 border-primary shrink-0"
                    data-testid="img-driver-photo"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary/30 shrink-0">
                    <User className="w-10 h-10 text-primary" />
                  </div>
                )}
                <div className="space-y-1">
                  <p className="font-bold text-lg" data-testid="text-driver-name">
                    {ride.driver.firstName || ride.driver.name?.split(' ')[0] || 'Kierowca'}
                  </p>
                  {ride.driver.taxiLicenseNumber && (
                    <p className="text-xs text-muted-foreground">
                      ID: <span className="font-medium text-foreground">{ride.driver.taxiLicenseNumber}</span>
                    </p>
                  )}
                  <p className="text-sm font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded inline-block">
                    {ride.driver.vehiclePlate}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {ride.driver.vehicleModel} • {ride.driver.vehicleColor}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                {canChat && onOpenChat && (
                  <div className="relative flex-1">
                    <Button 
                      size="sm"
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium text-sm"
                      onClick={onOpenChat}
                      data-testid="button-chat-driver"
                    >
                      <MessageCircle className="w-4 h-4 mr-1" />
                      Czat
                    </Button>
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full animate-pulse">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </div>
                )}
                {isActiveRide && (
                  <Button 
                    size="sm"
                    className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black font-medium text-sm"
                    onClick={() => window.open("tel:+48732125585", "_self")}
                    data-testid="button-call-driver"
                  >
                    <Phone className="w-4 h-4 mr-1" />
                    Zadzwoń
                  </Button>
                )}
                {canCancel && (
                  <Button
                    size="sm"
                    variant="destructive"
                    className="flex-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/40 font-medium text-sm"
                    onClick={() => cancelMutation.mutate()}
                    disabled={cancelMutation.isPending}
                    data-testid="button-cancel-ride"
                  >
                    {cancelMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <XCircle className="w-4 h-4 mr-1" />}
                    Anuluj
                  </Button>
                )}
              </div>

              {isCompleted && ride.driverId && (
                <div className="flex gap-2 mt-2">
                  {isWithin24h && (
                    <Button
                      size="sm"
                      className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black font-medium text-sm"
                      onClick={() => window.open("tel:+48732125585", "_self")}
                      data-testid="button-contact-24h"
                    >
                      <Phone className="w-4 h-4 mr-1" />
                      Kontakt 24h
                    </Button>
                  )}
                  {banStatus?.banned ? (
                    <Badge variant="outline" className="flex-1 flex items-center justify-center gap-1 border-red-500/40 text-red-400 py-1.5" data-testid="badge-ban-active">
                      <ShieldOff className="w-4 h-4" />
                      Zablokowany do {new Date(banStatus.ban.expiresAt).toLocaleDateString("pl-PL")}
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 border-red-500/40 text-red-400 hover:bg-red-500/10 font-medium text-sm"
                      onClick={() => setShowBanDialog(true)}
                      data-testid="button-ban-driver"
                    >
                      <Ban className="w-4 h-4 mr-1" />
                      Zablokuj
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          {ride.status === "in_progress" && (
            <div className="mt-3 p-3 rounded-xl bg-card border border-primary/20" data-testid="meter-display">
              {ride.estimatedPrice ? (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Cena z cennika:</span>
                  <span className="font-bold text-primary">{ride.estimatedPrice} zł</span>
                </div>
              ) : null}
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-muted-foreground">
                  Postój/korki: {Math.floor((ride.meterWaitingSeconds || 0) / 60)} min {(ride.meterWaitingSeconds || 0) % 60}s
                </span>
                <span className="font-bold text-yellow-400">{ride.meterWaitingCost || 0} zł</span>
              </div>
              {ride.estimatedPrice ? (
                <div className="border-t border-primary/20 mt-2 pt-2 flex items-center justify-between">
                  <span className="font-bold text-sm">RAZEM:</span>
                  <span className="font-bold text-lg text-primary">{(ride.estimatedPrice || 0) + (ride.meterWaitingCost || 0)} zł</span>
                </div>
              ) : null}
            </div>
          )}

          {isActiveRide && ride.driver && (
            <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
              <LiveTrackingMap
                rideId={ride.id}
                pickupLat={ride.pickupLat}
                pickupLng={ride.pickupLng}
                destLat={ride.destLat}
                destLng={ride.destLng}
                role="passenger"
                driverName={ride.driver.name}
                driverInfo={{
                  name: ride.driver.name,
                  vehiclePlate: ride.driver.vehiclePlate,
                  photoUrl: ride.driver.photoUrl || undefined,
                  languages: ride.driver.languages || undefined
                }}
                stops={ride.stops || []}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showBanDialog} onOpenChange={setShowBanDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <Ban className="w-5 h-5" />
              Zablokuj kierowcę
            </DialogTitle>
            <DialogDescription>
              Blokada jest wzajemna — przez wybrany okres nie będziecie widzieć się nawzajem w ofertach.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {[
              { days: 7, label: "7 dni" },
              { days: 14, label: "14 dni" },
              { days: 90, label: "3 miesiące" },
            ].map(({ days, label }) => (
              <Button
                key={days}
                variant="outline"
                className="w-full justify-between border-red-500/30 hover:bg-red-500/10 text-foreground"
                onClick={() => banMutation.mutate(days)}
                disabled={banMutation.isPending}
                data-testid={`button-ban-${days}`}
              >
                <span>{label}</span>
                <Ban className="w-4 h-4 text-red-400" />
              </Button>
            ))}
          </div>
          {banMutation.isPending && (
            <div className="flex justify-center py-2">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDestination} onOpenChange={setShowEditDestination}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-primary" />
              Zmień cel podróży
            </DialogTitle>
            <DialogDescription>
              Zmiana celu podróży w trakcie kursu spowoduje zwiększenie ceny o około 20%.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="text-sm text-muted-foreground">
              Aktualny cel: <span className="font-medium text-foreground">{ride.destination}</span>
            </div>
            
            {mapsReady ? (
              <AddressInput
                value={newDestination}
                onChange={setNewDestination}
                onPlaceSelect={setNewDestPlace}
                placeholder="Wpisz nowy adres docelowy"
                data-testid="input-new-destination"
              />
            ) : (
              <Input
                value={newDestination}
                onChange={(e) => setNewDestination(e.target.value)}
                placeholder="Wpisz nowy adres docelowy"
                data-testid="input-new-destination"
              />
            )}
            
            {newDestination && (
              <div className="p-3 bg-muted/50 rounded-lg text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Szacunkowa dopłata:</span>
                  <span className="font-semibold text-primary">
                    +{Math.round((ride.estimatedPrice || 0) * 0.2)} PLN
                  </span>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowEditDestination(false)}>
              Anuluj
            </Button>
            <Button 
              onClick={handleSaveDestination}
              disabled={updateDestinationMutation.isPending || !newDestination}
              data-testid="button-save-destination"
            >
              {updateDestinationMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Navigation className="w-4 h-4 mr-2" />
              )}
              Zapisz nowy cel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface NearbyDriverInfo {
  id: string;
  name: string;
  vehiclePlate: string;
  vehicleModel: string | null;
  rating: string | null;
  languages: string[];
  photoUrl?: string | null;
  currentRateCity: number;
  rateType: "day" | "night" | "holiday";
  distanceToPassenger?: number | null;
  estimatedArrivalMinutes?: number | null;
  estimatedPrice?: number | null;
}

function ActiveRideWithDrivers({ ride, onOpenChat }: { ride: RideWithDriver; onOpenChat?: () => void }) {
  const { toast } = useToast();
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(ride.preferredDriverId || null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [driverTimedOut, setDriverTimedOut] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const cancelMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/rides/${ride.id}/cancel`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rides"] });
      toast({
        title: "Przejazd anulowany",
        description: "Twoje zamówienie zostało anulowane.",
      });
    },
    onError: () => {
      toast({
        title: "Błąd anulowania",
        description: "Nie udało się anulować przejazdu. Spróbuj ponownie.",
        variant: "destructive",
      });
    },
  });

  // Sync selectedDriverId with server data
  useEffect(() => {
    if (ride.preferredDriverId) {
      setSelectedDriverId(ride.preferredDriverId);
    }
  }, [ride.preferredDriverId]);
  
  const isPending = ride.status === "pending";
  const hasCoordinates = Boolean(ride.pickupLat && ride.pickupLng && ride.destLat && ride.destLng);
  const isWaitingForDriver = ride.preferredDriverId && ride.status === "pending";
  
  // Check if driver timed out (10 seconds since request)
  useEffect(() => {
    if (ride.driverRequestedAt && ride.preferredDriverId && ride.status === "pending") {
      const requestTime = new Date(ride.driverRequestedAt).getTime();
      const now = Date.now();
      const elapsed = Math.floor((now - requestTime) / 1000);
      const remaining = Math.max(0, 10 - elapsed);
      
      if (remaining > 0) {
        setCountdown(remaining);
        setDriverTimedOut(false);
        
        timerRef.current = setInterval(() => {
          setCountdown(prev => {
            if (prev === null || prev <= 1) {
              if (timerRef.current) clearInterval(timerRef.current);
              setDriverTimedOut(true);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        setDriverTimedOut(true);
        setCountdown(0);
      }
    } else {
      setCountdown(null);
      setDriverTimedOut(false);
    }
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [ride.driverRequestedAt, ride.preferredDriverId, ride.status]);
  
  // Przygotuj przystanki z przejazdu do kalkulacji ceny
  const rideStops = ride.stops && Array.isArray(ride.stops) 
    ? (ride.stops as any[]).filter((s: any) => s.lat && s.lng).map((s: any) => ({
        lat: parseFloat(s.lat),
        lng: parseFloat(s.lng),
        type: s.type || 'waypoint'
      }))
    : [];

  const hasCombi = ride.notes?.includes('Kombi') || false;

  const { data: nearbyDrivers = [], isLoading: isLoadingDrivers } = useQuery<NearbyDriverInfo[]>({
    queryKey: ["/api/drivers/nearby", ride.id, ride.pickupLat, ride.pickupLng, ride.destLat, ride.destLng, JSON.stringify(rideStops), ride.passengerCount, hasCombi],
    queryFn: async (): Promise<NearbyDriverInfo[]> => {
      if (!ride.pickupLat || !ride.pickupLng || !ride.destLat || !ride.destLng) return [];
      const params = new URLSearchParams();
      params.set("pickupLat", ride.pickupLat);
      params.set("pickupLng", ride.pickupLng);
      params.set("destLat", ride.destLat);
      params.set("destLng", ride.destLng);
      params.set("passengerCount", String(ride.passengerCount || 1));
      if (hasCombi) params.set("requiresCombi", "true");
      if (rideStops.length > 0) {
        params.set("stops", JSON.stringify(rideStops));
      }
      const res = await fetch(`/api/drivers/nearby?${params.toString()}`, { credentials: "include" });
      return res.json();
    },
    enabled: isPending && hasCoordinates,
    refetchInterval: 5000,
  });

  const selectDriverMutation = useMutation({
    mutationFn: async (driverId: string) => {
      const driver = nearbyDrivers.find(d => d.id === driverId);
      await apiRequest("PATCH", `/api/rides/${ride.id}/select-driver`, {
        preferredDriverId: driverId,
        estimatedPrice: driver?.estimatedPrice || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rides"] });
      setDriverTimedOut(false);
      toast({
        title: "Kierowca wybrany!",
        description: "Oczekujemy na akceptację kierowcy (10 sekund).",
      });
    },
    onError: () => {
      toast({
        title: "Błąd",
        description: "Nie udało się wybrać kierowcy",
        variant: "destructive",
      });
    },
  });

  const resetDriverMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/rides/${ride.id}/select-driver`, {
        preferredDriverId: null,
        estimatedPrice: ride.estimatedPrice,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rides"] });
      setSelectedDriverId(null);
      setDriverTimedOut(false);
      setCountdown(null);
    },
  });

  const handleSelectDriver = (driverId: string) => {
    setSelectedDriverId(driverId);
    setDriverTimedOut(false);
    selectDriverMutation.mutate(driverId);
  };

  const handleResetDriver = () => {
    resetDriverMutation.mutate();
  };

  return (
    <div className="space-y-4">
      <RideCard ride={ride} onOpenChat={onOpenChat} />

      {isPending && !ride.driverId && (
        <Button
          variant="destructive"
          className="w-full bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/40 font-medium"
          onClick={() => cancelMutation.mutate()}
          disabled={cancelMutation.isPending}
          data-testid="button-cancel-pending-ride"
        >
          {cancelMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
          Anuluj zamówienie
        </Button>
      )}
      
      {isPending && ride.scheduledAt && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-blue-400" />
              Zamówienie terminowe
            </CardTitle>
            <CardDescription>
              {ride.preferredDriverId ? (
                <span className="text-primary font-medium">
                  Oczekiwanie na akceptację ulubionego kierowcy (max 10 min)
                </span>
              ) : (
                <span>Zlecenie jest na giełdzie — kierowcy mogą je przyjąć</span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 rounded-lg border border-blue-500/20 bg-blue-500/5 text-center">
              <CalendarClock className="w-10 h-10 mx-auto mb-2 text-blue-400" />
              <p className="font-medium">
                {new Date(ride.scheduledAt).toLocaleDateString("pl-PL", { weekday: "long", day: "numeric", month: "long" })}
              </p>
              <p className="text-lg font-bold text-primary">
                {new Date(ride.scheduledAt).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}
              </p>
              {ride.preferredDriverId ? (
                <p className="text-xs text-muted-foreground mt-2">
                  Jeśli kierowca nie zaakceptuje w ciągu 10 minut, zlecenie trafi na giełdę.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground mt-2">
                  Wszyscy kierowcy widzą to zlecenie. Kto pierwszy zaakceptuje — ten jedzie.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {isPending && !ride.scheduledAt && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Car className="w-5 h-5 text-primary" />
              {isWaitingForDriver ? "Oczekiwanie na kierowcę" : ride.isCito ? "Dostępni kierowcy — Twoja oferta CITO" : "Dostępni kierowcy - wybierz ofertę"}
            </CardTitle>
            <CardDescription>
              {isWaitingForDriver ? (
                countdown !== null && countdown > 0 ? (
                  <span className="text-primary font-medium">Kierowca ma {countdown}s na odpowiedź...</span>
                ) : driverTimedOut ? (
                  <span className="text-destructive">Kierowca nie odpowiedział w czasie</span>
                ) : (
                  "Czekamy na odpowiedź kierowcy..."
                )
              ) : ride.isCito ? (
                <span className="text-orange-400">Wybierz kierowcę — zobaczy Twoją ofertę {ride.citoPrice} PLN i zdecyduje</span>
              ) : nearbyDrivers.length > 0 
                ? `${nearbyDrivers.length} kierowców gotowych do realizacji`
                : hasCoordinates ? "Szukamy kierowców..." : "Brak współrzędnych trasy"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {driverTimedOut && (
              <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-center">
                <XCircle className="w-8 h-8 mx-auto mb-2 text-destructive" />
                <p className="font-medium text-destructive">Kierowca nie przyjął zamówienia</p>
                <p className="text-sm text-muted-foreground mb-3">Wybierz innego kierowcę lub ponów wezwanie</p>
                <div className="flex gap-2 justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetDriver}
                    disabled={resetDriverMutation.isPending}
                    data-testid="button-choose-other-driver"
                  >
                    Wybierz innego
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => ride.preferredDriverId && handleSelectDriver(ride.preferredDriverId)}
                    disabled={selectDriverMutation.isPending}
                    data-testid="button-retry-driver"
                  >
                    Ponów wezwanie
                  </Button>
                </div>
              </div>
            )}
            
            {isWaitingForDriver && !driverTimedOut && countdown !== null && countdown > 0 && (
              <div className="mb-4 p-4 bg-primary/10 border border-primary/20 rounded-lg text-center">
                <Loader2 className="w-8 h-8 mx-auto mb-2 text-primary animate-spin" />
                <p className="font-medium">Czekamy na odpowiedź kierowcy</p>
                <p className="text-2xl font-bold text-primary">{countdown}s</p>
              </div>
            )}
            
            {isLoadingDrivers ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : nearbyDrivers.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Car className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Brak dostępnych kierowców w tej chwili</p>
                <p className="text-xs">Sprawdzamy co 5 sekund...</p>
              </div>
            ) : (
              <ScrollArea className="max-h-[300px]">
                <div className="space-y-2">
                  {nearbyDrivers.map((driver, index) => {
                    // Only show as selected if local state matches AND not resetting
                    const isSelected = selectedDriverId === driver.id && !resetDriverMutation.isPending;
                    
                    return (
                      <div 
                        key={driver.id}
                        className={`p-3 rounded-lg border ${
                          isSelected 
                            ? "border-primary bg-primary/10" 
                            : "border-border hover-elevate cursor-pointer"
                        }`}
                        data-testid={`driver-offer-${driver.id}`}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {driver.photoUrl ? (
                              <img 
                                src={driver.photoUrl} 
                                alt={driver.name}
                                className={`w-10 h-10 rounded-full object-cover flex-shrink-0 ${isSelected ? "border-2 border-primary" : ""}`}
                                data-testid={`img-driver-photo-${driver.id}`}
                              />
                            ) : (
                              <div className={`w-10 h-10 rounded-full flex-shrink-0 ${isSelected ? "bg-primary" : "bg-primary/20"} flex items-center justify-center text-sm font-bold ${isSelected ? "text-primary-foreground" : "text-primary"}`}>
                                {index + 1}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="font-medium text-sm">{driver.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {driver.vehiclePlate}
                              </div>
                              <LanguageBadges languages={driver.languages} />
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-2">
                            {driver.estimatedArrivalMinutes !== null && driver.estimatedArrivalMinutes !== undefined && (
                              <Badge variant="secondary" className="text-xs">
                                <Clock className="w-3 h-3 mr-1" />
                                {driver.estimatedArrivalMinutes} min
                              </Badge>
                            )}
                            
                            {!ride.isCito && driver.estimatedPrice !== null && driver.estimatedPrice !== undefined && (
                              <Badge variant="default" className="text-sm font-bold">
                                {driver.estimatedPrice} PLN
                              </Badge>
                            )}
                            {ride.isCito && ride.citoPrice && (
                              <Badge className="bg-orange-500 text-white text-sm font-bold">
                                <Zap className="w-3 h-3 mr-1" />
                                {ride.citoPrice} PLN
                              </Badge>
                            )}
                            
                            {!isSelected && (
                              <Button
                                size="sm"
                                onClick={() => handleSelectDriver(driver.id)}
                                disabled={selectDriverMutation.isPending}
                                data-testid={`button-select-driver-${driver.id}`}
                              >
                                {selectDriverMutation.isPending && selectedDriverId === driver.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  "Wybierz"
                                )}
                              </Button>
                            )}
                            
                            {isSelected && (
                              <Badge className="bg-primary text-primary-foreground px-3 py-1 text-sm font-semibold animate-pulse">
                                <CheckCircle2 className="w-4 h-4 mr-1" />
                                Wybrany
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface PassengerSession {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  homeAddress?: string;
  homeLat?: string;
  homeLng?: string;
  termsAcceptedAt?: string;
  termsVersion?: string;
}

export default function Home() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const geolocation = useGeolocation();
  const [locationSkipped, setLocationSkipped] = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  const [showNearbyDrivers, setShowNearbyDrivers] = useState(false);
  const [pickupPlace, setPickupPlace] = useState<{ 
    geometry?: { location?: { lat: () => number; lng: () => number } };
    formatted_address?: string;
    name?: string;
  } | null>(null);
  const [destinationPlace, setDestinationPlace] = useState<{ 
    geometry?: { location?: { lat: () => number; lng: () => number } };
    formatted_address?: string;
    name?: string;
  } | null>(null);
  const [stops, setStops] = useState<Array<{
    address: string;
    lat: string;
    lng: string;
    type: 'waypoint' | 'extra_destination'; // waypoint = po drodze, extra_destination = dodatkowy cel
    place?: { geometry?: { location?: { lat: () => number; lng: () => number } }; formatted_address?: string; name?: string };
  }>>([]);
  const [selectedRide, setSelectedRide] = useState<RideWithDriver | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("book");
  const [isLocating, setIsLocating] = useState(false);

  // System messages
  const { data: unreadSysMsgData } = useUnreadSystemMessageCount();
  const unreadSysMsgCount = unreadSysMsgData?.count || 0;

  // Check passenger session
  const { data: passengerSession, isLoading: isLoadingSession } = useQuery<PassengerSession>({
    queryKey: ["/api/passengers/session"],
    retry: false,
    refetchInterval: 30000,
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoadingSession && !passengerSession) {
      navigate("/passenger");
    }
  }, [isLoadingSession, passengerSession, navigate]);

  // Redirect to complete profile if required fields missing
  useEffect(() => {
    if (passengerSession && (!passengerSession.firstName || !passengerSession.lastName || !passengerSession.termsAcceptedAt)) {
      navigate("/uzupelnij-profil");
    }
  }, [passengerSession, navigate]);

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/passengers/logout");
    },
    onSuccess: () => {
      queryClient.clear();
      window.location.href = "/passenger";
    },
  });

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      pickupLocation: "",
      destination: "",
      passengerCount: "1",
      requiresCombi: false,
      isCito: false,
      citoPrice: "",
      isScheduled: false,
      scheduledDate: "",
      scheduledTime: "",
    },
  });

  // Set home address as default pickup if available
  useEffect(() => {
    if (passengerSession?.homeAddress && !form.getValues("pickupLocation")) {
      form.setValue("pickupLocation", passengerSession.homeAddress);
      // Also set the pickup coordinates
      if (passengerSession.homeLat && passengerSession.homeLng) {
        setPickupPlace({
          geometry: {
            location: {
              lat: () => parseFloat(passengerSession.homeLat!),
              lng: () => parseFloat(passengerSession.homeLng!),
            }
          },
          formatted_address: passengerSession.homeAddress,
        });
      }
    }
  }, [passengerSession, form]);

  const { ready: mapsReady } = useGoogleMaps();

  const { data: rides, isLoading: ridesLoading } = useQuery<RideWithDriver[]>({
    queryKey: ["/api/rides"],
    refetchInterval: 2000,
    staleTime: 0,
  });

  // Interface dla kierowców w pobliżu
  interface NearbyDriverInfo {
    id: string;
    name: string;
    vehiclePlate: string;
    vehicleModel: string | null;
    rating: string | null;
    languages: string[];
    currentRateCity: number;
    rateType: "day" | "night" | "holiday";
    distanceToPassenger?: number | null;
    estimatedArrivalMinutes?: number | null;
    estimatedPrice?: number | null;
  }

  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);

  interface FavoriteDriverInfo {
    id: string;
    firstName: string | null;
    lastName: string | null;
    photoUrl: string | null;
    rating: string | null;
    isOnline: boolean;
  }

  const { data: favoriteDrivers = [] } = useQuery<FavoriteDriverInfo[]>({
    queryKey: ["/api/passenger/favorite-drivers"],
    enabled: form.watch("isScheduled"),
  });

  // Extract coordinates for query key dependencies
  const pickupLat = pickupPlace?.geometry?.location?.lat();
  const pickupLng = pickupPlace?.geometry?.location?.lng();
  const destLat = destinationPlace?.geometry?.location?.lat();
  const destLng = destinationPlace?.geometry?.location?.lng();
  const passengerLat = geolocation.latitude;
  const passengerLng = geolocation.longitude;

  // Query dla kierowców w pobliżu z cenami (uwzględniając przystanki)
  const stopsForQuery = stops.filter(s => s.address && s.lat && s.lng).map(s => ({
    lat: parseFloat(s.lat),
    lng: parseFloat(s.lng),
    type: s.type
  }));
  
  const { data: nearbyDrivers = [], isLoading: isLoadingDrivers } = useQuery<NearbyDriverInfo[]>({
    queryKey: ["/api/drivers/nearby", pickupLat, pickupLng, destLat, destLng, passengerLat, passengerLng, JSON.stringify(stopsForQuery)],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (pickupLat !== undefined && pickupLng !== undefined) {
        params.set("pickupLat", pickupLat.toString());
        params.set("pickupLng", pickupLng.toString());
      }
      if (destLat !== undefined && destLng !== undefined) {
        params.set("destLat", destLat.toString());
        params.set("destLng", destLng.toString());
      }
      if (passengerLat !== undefined && passengerLat !== null && passengerLng !== undefined && passengerLng !== null) {
        params.set("passengerLat", passengerLat.toString());
        params.set("passengerLng", passengerLng.toString());
      }
      // Add stops for price calculation
      if (stopsForQuery.length > 0) {
        params.set("stops", JSON.stringify(stopsForQuery));
      }
      const queryString = params.toString();
      const url = queryString ? `/api/drivers/nearby?${queryString}` : "/api/drivers/nearby";
      const res = await fetch(url, { credentials: "include" });
      return res.json();
    },
    refetchInterval: 10000,
  });

  // Sortuj kierowców - teraz już posortowane z backendu, ale możemy sortować po cenie
  const sortedDrivers = [...nearbyDrivers]
    .sort((a, b) => {
      // Najpierw po czasie dojazdu
      if (a.estimatedArrivalMinutes !== null && a.estimatedArrivalMinutes !== undefined && 
          b.estimatedArrivalMinutes !== null && b.estimatedArrivalMinutes !== undefined) {
        return a.estimatedArrivalMinutes - b.estimatedArrivalMinutes;
      }
      return 0;
    });

  const createRideMutation = useMutation({
    mutationFn: async (data: BookingFormData) => {
      let scheduledAt = null;
      if (data.isScheduled && data.scheduledDate && data.scheduledTime) {
        scheduledAt = new Date(`${data.scheduledDate}T${data.scheduledTime}`).toISOString();
      }
      
      const selectedDriver = selectedDriverId 
        ? nearbyDrivers.find(d => d.id === selectedDriverId) 
        : null;
      
      const isScheduledWithFavorite = data.isScheduled && selectedDriverId;
      
      // Use full address from autocomplete if available, fallback to form data
      const pickupAddress = pickupPlace?.formatted_address || data.pickupLocation;
      const destAddress = destinationPlace?.formatted_address || data.destination;
      
      const filteredStops = stops.filter(s => s.address && s.lat && s.lng).map(s => ({ address: s.address, lat: s.lat, lng: s.lng, type: s.type }));

      return await apiRequest("POST", "/api/rides", {
        pickupLocation: pickupAddress,
        destination: destAddress,
        passengerCount: parseInt(data.passengerCount),
        requiresCombi: data.requiresCombi,
        isCito: data.isCito,
        citoPrice: data.isCito && data.citoPrice ? parseInt(data.citoPrice) : null,
        pickupLat: pickupPlace?.geometry?.location?.lat()?.toString(),
        pickupLng: pickupPlace?.geometry?.location?.lng()?.toString(),
        destLat: destinationPlace?.geometry?.location?.lat()?.toString(),
        destLng: destinationPlace?.geometry?.location?.lng()?.toString(),
        stops: filteredStops,
        scheduledAt,
        preferredDriverId: !data.isCito && selectedDriverId ? selectedDriverId : null,
        estimatedPrice: !data.isCito && !isScheduledWithFavorite && selectedDriver?.estimatedPrice ? selectedDriver.estimatedPrice : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rides"] });
      form.reset();
      setPickupPlace(null);
      setDestinationPlace(null);
      setStops([]);
      setShowBooking(false);
      setSelectedDriverId(null);
      setActiveTab("active");
      toast({
        title: "Przejazd zamówiony!",
        description: "Przejdź do zakładki 'Aktywne' i wybierz kierowcę z listy ofert.",
      });
    },
    onError: (error: any) => {
      console.error("[createRide] Error:", error?.message || error);
      const errorMsg = error?.message || "";
      let description = "Nie udało się zamówić przejazdu. Spróbuj ponownie.";
      if (errorMsg.includes("401")) {
        description = "Sesja wygasła. Zaloguj się ponownie i spróbuj jeszcze raz.";
      } else if (errorMsg.includes("400")) {
        description = "Nieprawidłowe dane przejazdu. Sprawdź adres odbioru i cel podróży.";
      } else if (errorMsg.includes("details")) {
        try {
          const parsed = JSON.parse(errorMsg.split(": ").slice(1).join(": "));
          description = parsed.details || description;
        } catch {}
      }
      toast({
        title: "Błąd",
        description,
        variant: "destructive",
      });
    },
  });

  // Compute active rides for auto-tab switching
  const terminalStatuses = ["completed", "cancelled", "cancelled_by_passenger", "cancelled_by_driver", "no_driver_found"];
  const activeRidesCount = rides?.filter((r) => !terminalStatuses.includes(r.status)).length || 0;

  // Auto-switch to active tab when there are active rides on initial load
  useEffect(() => {
    if (activeRidesCount > 0 && activeTab === "book" && !ridesLoading) {
      setActiveTab("active");
    }
  }, [activeRidesCount, ridesLoading, activeTab]);

  // Wymuszenie udostępnienia lokalizacji (można pominąć)
  if (!geolocation.permissionGranted && !locationSkipped) {
    return (
      <LocationRequired
        error={geolocation.error}
        loading={geolocation.loading}
        permissionDenied={geolocation.permissionDenied}
        onRetry={geolocation.requestLocation}
        onSkip={() => setLocationSkipped(true)}
      />
    );
  }

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: "Błąd", description: "Geolokalizacja nie jest wspierana", variant: "destructive" });
      return;
    }
    
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        if (mapsReady && window.google) {
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode(
            { location: { lat: latitude, lng: longitude } }, 
            (results: google.maps.GeocoderResult[] | null, status: google.maps.GeocoderStatus) => {
              setIsLocating(false);
              if (status === "OK" && results?.[0]) {
                const address = results[0].formatted_address || "";
                form.setValue("pickupLocation", address);
                setPickupPlace({ 
                  geometry: { location: { lat: () => latitude, lng: () => longitude } },
                  formatted_address: address
                });
              } else {
                form.setValue("pickupLocation", `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
              }
            }
          );
        } else {
          setIsLocating(false);
          form.setValue("pickupLocation", `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        }
      },
      (error) => {
        setIsLocating(false);
        toast({ title: "Błąd lokalizacji", description: error.message, variant: "destructive" });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const onSubmit = (data: BookingFormData) => {
    createRideMutation.mutate(data);
  };

  const activeRides = rides?.filter((r) => !terminalStatuses.includes(r.status)) || [];
  const pastRides = rides?.filter((r) => terminalStatuses.includes(r.status)) || [];

  if (showChat && selectedRide) {
    return (
      <RideChat 
        ride={selectedRide} 
        senderId="passenger" 
        senderType="passenger"
        onBack={() => { setShowChat(false); setSelectedRide(null); }}
      />
    );
  }

  // Show loading while checking session
  if (isLoadingSession) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Ładowanie...</p>
        </div>
      </div>
    );
  }

  // Redirect handled by useEffect, but show nothing while redirecting
  if (!passengerSession) {
    return null;
  }

  return (
    <div className="min-h-screen min-h-[100dvh] h-screen h-[100dvh] bg-background flex flex-col overflow-hidden">
      <Helmet>
        <title>TaxiQ Pasażer</title>
      </Helmet>
      {/* Nagłówek z logo, zakładkami i przyciskami */}
      <header className="relative overflow-hidden shrink-0 z-50 bg-background">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent" />
        
        <div className="relative container mx-auto px-4 py-2">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex items-center justify-between gap-2">
              {/* Logo */}
              <a href="/" className="flex items-center gap-2 shrink-0" data-testid="link-back-home">
                <img 
                  src={logoImage} 
                  key={logoImage}
                  alt="TaxiQ - Strona główna" 
                  className="w-auto"
                  style={{
                    height: "40px",
                    filter: "drop-shadow(0 0 8px rgba(230, 255, 63, 0.4)) drop-shadow(0 0 20px rgba(230, 255, 63, 0.15))",
                  }}
                  data-testid="img-logo"
                />
                <h1 className="text-lg font-bold text-primary hidden sm:block">TaxiQ</h1>
                <span className="text-[10px] text-muted-foreground">v2.1.0</span>
              </a>

              {/* Zakładki w środku */}
              <TabsList className="flex-1 max-w-md gap-0 px-0.5">
                <TabsTrigger value="book" className="flex-1 px-0 min-w-0 text-xs sm:text-sm" data-testid="tab-book">
                  <Car className="w-5 h-5 sm:w-6 sm:h-6 sm:mr-1" />
                  <span className="hidden xs:inline">Zamów</span>
                </TabsTrigger>
                <TabsTrigger value="active" className="flex-1 px-0 min-w-0 text-xs sm:text-sm" data-testid="tab-active">
                  <Clock className="w-5 h-5 sm:w-6 sm:h-6 sm:mr-1" />
                  <span className="hidden xs:inline">Aktywne</span>
                  {activeRides.length > 0 && <span className="ml-1">({activeRides.length})</span>}
                </TabsTrigger>
                <TabsTrigger value="history" className="flex-1 px-0 min-w-0 text-xs sm:text-sm" data-testid="tab-history">
                  <List className="w-5 h-5 sm:w-6 sm:h-6 sm:mr-1" />
                  <span className="hidden xs:inline">Historia</span>
                </TabsTrigger>
                <TabsTrigger value="messages" className="flex-1 px-0 min-w-0 text-xs sm:text-sm" data-testid="tab-messages">
                  <Mail className="w-5 h-5 sm:w-6 sm:h-6 sm:mr-1" />
                  <span className="hidden xs:inline">Komunikaty</span>
                  {unreadSysMsgCount > 0 && <Badge variant="destructive" className="ml-1 text-xs">{unreadSysMsgCount}</Badge>}
                </TabsTrigger>
              </TabsList>

              {/* Przyciski po prawej */}
              <div className="flex items-center gap-1 shrink-0">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => navigate("/passenger/info")}
                  data-testid="button-price-info"
                  title="Informacja o cenach"
                >
                  <Info className="h-5 w-5" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => navigate("/passenger/profile")}
                  data-testid="button-profile"
                >
                  <User className="h-5 w-5" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => logoutMutation.mutate()}
                  disabled={logoutMutation.isPending}
                  data-testid="button-logout"
                  className="text-xs"
                >
                  Wyloguj
                </Button>
              </div>
            </div>
          </Tabs>
        </div>
      </header>

      <main className="px-2 py-2 flex-1 overflow-y-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="hidden"><TabsTrigger value="book" /><TabsTrigger value="active" /><TabsTrigger value="history" /><TabsTrigger value="messages" /></TabsList>
          <TabsContent value="book" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* Lewa kolumna - Formularz zamówienia */}
              <Card className="glow-border" data-testid="card-booking-form">
                <CardHeader className="py-2 px-3">
                  <CardTitle className="flex items-center gap-1 text-sm">
                    <Car className="w-4 h-4 text-primary" />
                    Nowy przejazd
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 py-2">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
                  <FormField
                    control={form.control}
                    name="pickupLocation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Miejsce odbioru</FormLabel>
                        <FormControl>
                          <div className="relative flex gap-2">
                            <div className="relative flex-1">
                              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary z-10" />
                              <AddressInput 
                                value={field.value}
                                onChange={field.onChange}
                                onPlaceSelect={(place) => {
                                  setPickupPlace(place as any);
                                  const addr = (place as any).formatted_address || place.name || "";
                                  if (addr) form.setValue("pickupLocation", addr);
                                }}
                                placeholder="np. Dworzec Główny" 
                                className="pl-10" 
                                data-testid="input-pickup"
                              />
                            </div>
                            <Button 
                              type="button" 
                              size="icon" 
                              variant="outline"
                              onClick={getCurrentLocation}
                              disabled={isLocating}
                              data-testid="button-gps-location"
                              title="Użyj mojej lokalizacji"
                            >
                              {isLocating ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Crosshair className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="destination"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cel podróży</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary z-10" />
                            <AddressInput 
                              value={field.value}
                              onChange={field.onChange}
                              onPlaceSelect={(place) => {
                                setDestinationPlace(place as any);
                                const addr = (place as any).formatted_address || place.name || "";
                                if (addr) form.setValue("destination", addr);
                              }}
                              placeholder="np. Lotnisko" 
                              className="pl-10" 
                              data-testid="input-destination"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Przystanki po drodze (między odbiorem a celem) */}
                  {stops.filter(s => s.type === 'waypoint').length > 0 && (
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Przystanki po drodze:</span>
                      {stops.map((stop, index) => stop.type === 'waypoint' && (
                        <div key={index} className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-500 z-10" />
                            <AddressInput 
                              value={stop.address}
                              onChange={(val) => {
                                const newStops = [...stops];
                                newStops[index].address = val;
                                setStops(newStops);
                              }}
                              onPlaceSelect={(place) => {
                                const newStops = [...stops];
                                const addr = (place as any).formatted_address || place.name || "";
                                const lat = (place as any).geometry?.location?.lat()?.toString() || "";
                                const lng = (place as any).geometry?.location?.lng()?.toString() || "";
                                newStops[index] = { ...newStops[index], address: addr, lat, lng, place: place as any };
                                setStops(newStops);
                              }}
                              placeholder="Przystanek po drodze"
                              className="pl-10"
                              data-testid={`input-waypoint-${index}`}
                            />
                          </div>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => setStops(stops.filter((_, i) => i !== index))}
                            data-testid={`button-remove-waypoint-${index}`}
                          >
                            <X className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Dodatkowe cele (po głównym celu) */}
                  {stops.filter(s => s.type === 'extra_destination').length > 0 && (
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Dodatkowe cele:</span>
                      {stops.map((stop, index) => stop.type === 'extra_destination' && (
                        <div key={index} className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 z-10" />
                            <AddressInput 
                              value={stop.address}
                              onChange={(val) => {
                                const newStops = [...stops];
                                newStops[index].address = val;
                                setStops(newStops);
                              }}
                              onPlaceSelect={(place) => {
                                const newStops = [...stops];
                                const addr = (place as any).formatted_address || place.name || "";
                                const lat = (place as any).geometry?.location?.lat()?.toString() || "";
                                const lng = (place as any).geometry?.location?.lng()?.toString() || "";
                                newStops[index] = { ...newStops[index], address: addr, lat, lng, place: place as any };
                                setStops(newStops);
                              }}
                              placeholder="Dodatkowy cel"
                              className="pl-10"
                              data-testid={`input-extra-dest-${index}`}
                            />
                          </div>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => setStops(stops.filter((_, i) => i !== index))}
                            data-testid={`button-remove-extra-dest-${index}`}
                          >
                            <X className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Przyciski dodawania */}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => setStops([...stops, { address: "", lat: "", lng: "", type: 'waypoint' }])}
                      data-testid="button-add-waypoint"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Przystanek po drodze
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => setStops([...stops, { address: "", lat: "", lng: "", type: 'extra_destination' }])}
                      data-testid="button-add-extra-dest"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Dodatkowy cel
                    </Button>
                  </div>
                  
                  <RouteMap 
                    pickup={pickupPlace as Parameters<typeof RouteMap>[0]['pickup']} 
                    destination={destinationPlace as Parameters<typeof RouteMap>[0]['destination']} 
                    className="h-64 w-full mt-1"
                    showNearbyDrivers={true}
                  />

                  <FormField
                    control={form.control}
                    name="passengerCount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Liczba pasażerów</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-passengers">
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-primary" />
                                <SelectValue placeholder="Wybierz liczbę" />
                              </div>
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="1">1 osoba</SelectItem>
                            <SelectItem value="2">2 osoby</SelectItem>
                            <SelectItem value="3">3 osoby</SelectItem>
                            <SelectItem value="4">4 osoby</SelectItem>
                            <SelectItem value="5">5 osób (+10 zł)</SelectItem>
                            <SelectItem value="6">6 osób (+20 zł)</SelectItem>
                            <SelectItem value="7">7 osób (+30 zł)</SelectItem>
                            <SelectItem value="8">8 osób (+40 zł)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="requiresCombi"
                    render={({ field }) => (
                      <FormItem className="rounded-lg border p-3 bg-blue-500/5 border-blue-500/20">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Car className="w-5 h-5 text-blue-500" />
                            <div>
                              <FormLabel className="text-base font-medium">Kombi</FormLabel>
                              <p className="text-xs text-muted-foreground">Samochód z większym bagażnikiem (+10 zł)</p>
                            </div>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-combi"
                            />
                          </FormControl>
                        </div>
                      </FormItem>
                    )}
                  />

                  {(() => {
                    const pCount = parseInt(form.watch("passengerCount") || "1");
                    const isCombi = form.watch("requiresCombi");
                    const stopsCount = stops.filter(s => s.address && s.lat && s.lng).length;
                    const extraPassenger = pCount > 4 ? (pCount - 4) * 10 : 0;
                    const combiCost = isCombi ? 10 : 0;
                    const stopsCost = stopsCount * 10;
                    const total = extraPassenger + combiCost + stopsCost;
                    if (total === 0) return null;
                    return (
                      <div className="rounded-lg border p-3 bg-primary/5 border-primary/20 space-y-1" data-testid="surcharge-summary">
                        <p className="text-sm font-medium text-primary">Dopłaty:</p>
                        {extraPassenger > 0 && (
                          <div className="flex justify-between text-sm" data-testid="surcharge-passengers">
                            <span className="text-muted-foreground">Dodatkowe osoby ({pCount - 4} × 10 zł)</span>
                            <span className="font-medium">+{extraPassenger} zł</span>
                          </div>
                        )}
                        {combiCost > 0 && (
                          <div className="flex justify-between text-sm" data-testid="surcharge-combi">
                            <span className="text-muted-foreground">Samochód kombi</span>
                            <span className="font-medium">+{combiCost} zł</span>
                          </div>
                        )}
                        {stopsCost > 0 && (
                          <div className="flex justify-between text-sm" data-testid="surcharge-stops">
                            <span className="text-muted-foreground">Przystanki ({stopsCount} × 10 zł)</span>
                            <span className="font-medium">+{stopsCost} zł</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm font-bold border-t border-primary/20 pt-1 mt-1" data-testid="surcharge-total">
                          <span>Łącznie dopłaty</span>
                          <span className="text-primary">+{total} zł</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* CITO option */}
                  <FormField
                    control={form.control}
                    name="isCito"
                    render={({ field }) => (
                      <FormItem className="rounded-lg border p-3 bg-orange-500/5 border-orange-500/20">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Zap className="w-5 h-5 text-orange-500" />
                            <div>
                              <FormLabel className="text-base font-medium">CITO - Pilne</FormLabel>
                              <p className="text-xs text-muted-foreground">Podaj swoją cenę — wybierz kierowcę, który zobaczy Twoją ofertę</p>
                            </div>
                          </div>
                          <FormControl>
                            <Switch 
                              checked={field.value} 
                              onCheckedChange={field.onChange}
                              data-testid="switch-cito"
                            />
                          </FormControl>
                        </div>
                      </FormItem>
                    )}
                  />
                  
                  {/* CITO price input */}
                  {form.watch("isCito") && (
                    <FormField
                      control={form.control}
                      name="citoPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-orange-500" />
                            Twoja cena za przejazd CITO (PLN)
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="20"
                              placeholder="np. 80"
                              {...field}
                              data-testid="input-cito-price"
                            />
                          </FormControl>
                          <p className="text-xs text-muted-foreground">
                            Minimalna cena: 20 PLN. Kierowcy zobaczą Twoją ofertę i zdecydują czy ją przyjąć.
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* Scheduled ride option */}
                  <FormField
                    control={form.control}
                    name="isScheduled"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex items-center gap-2">
                          <CalendarClock className="w-5 h-5 text-primary" />
                          <div>
                            <FormLabel className="text-base font-medium">Zamówienie terminowe</FormLabel>
                            <p className="text-xs text-muted-foreground">Zaplanuj na konkretny czas</p>
                          </div>
                        </div>
                        <FormControl>
                          <Switch 
                            checked={field.value} 
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              setSelectedDriverId(null);
                              if (checked) {
                                const now = new Date();
                                form.setValue("scheduledDate", now.toISOString().split('T')[0]);
                                const hours = String(now.getHours()).padStart(2, '0');
                                const minutes = String(now.getMinutes()).padStart(2, '0');
                                form.setValue("scheduledTime", `${hours}:${minutes}`);
                              }
                            }}
                            data-testid="switch-scheduled"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {form.watch("isScheduled") && (
                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="scheduledDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Data</FormLabel>
                            <FormControl>
                              <Input 
                                type="date" 
                                {...field}
                                min={new Date().toISOString().split('T')[0]}
                                data-testid="input-scheduled-date"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="scheduledTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Godzina</FormLabel>
                            <FormControl>
                              <Input 
                                type="time" 
                                {...field}
                                data-testid="input-scheduled-time"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {form.watch("isScheduled") && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium flex items-center gap-2">
                        <Heart className="w-4 h-4 text-primary" />
                        Wyślij do ulubionego kierowcy
                      </p>
                      {favoriteDrivers.length === 0 ? (
                        <div className="p-3 rounded-lg border border-dashed border-muted-foreground/30 text-center">
                          <p className="text-xs text-muted-foreground">
                            Brak ulubionych kierowców. Zlecenie trafi na giełdę dla wszystkich kierowców.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <div 
                            className={`p-2.5 rounded-lg border cursor-pointer transition-colors ${
                              !selectedDriverId ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                            }`}
                            onClick={() => setSelectedDriverId(null)}
                            data-testid="option-no-favorite"
                          >
                            <p className="text-sm">Nie wybieraj — zlecenie na giełdę</p>
                          </div>
                          {favoriteDrivers.map((driver) => (
                            <div
                              key={driver.id}
                              className={`p-2.5 rounded-lg border cursor-pointer transition-colors ${
                                selectedDriverId === driver.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                              }`}
                              onClick={() => setSelectedDriverId(driver.id)}
                              data-testid={`favorite-driver-${driver.id}`}
                            >
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                                  {driver.photoUrl ? (
                                    <img src={driver.photoUrl} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <User className="w-4 h-4 text-muted-foreground" />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-medium">{driver.firstName} {driver.lastName}</p>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span className={driver.isOnline ? "text-green-500" : "text-muted-foreground"}>
                                      {driver.isOnline ? "Online" : "Offline"}
                                    </span>
                                  </div>
                                </div>
                                <Heart className="w-4 h-4 text-primary fill-primary" />
                              </div>
                            </div>
                          ))}
                          {selectedDriverId && (
                            <p className="text-xs text-muted-foreground">
                              Kierowca ma 10 min na akceptację. Po tym czasie zlecenie trafi na giełdę.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={createRideMutation.isPending}
                    data-testid="button-submit-booking"
                  >
                    {createRideMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Car className="w-4 h-4 mr-2" />
                    )}
                    Zamów przejazd
                  </Button>
                </form>
              </Form>
                </CardContent>
              </Card>

            </div>
          </TabsContent>

          {/* Zakładka Aktywne zamówienia */}
          <TabsContent value="active">
            {ridesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : activeRides.length === 0 ? (
              <div className="text-center py-12 space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-primary" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Brak aktywnych zamówień</h3>
                  <p className="text-muted-foreground text-sm">
                    Zamów przejazd w zakładce "Zamów"
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {activeRides.map((ride) => (
                  <ActiveRideWithDrivers 
                    key={ride.id} 
                    ride={ride}
                    onOpenChat={() => { setSelectedRide(ride); setShowChat(true); }}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Zakładka Historia */}
          <TabsContent value="history">
            {ridesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : pastRides.length === 0 ? (
              <div className="text-center py-12 space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
                  <Clock className="w-8 h-8 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Brak historii przejazdów</h3>
                  <p className="text-muted-foreground text-sm">
                    Twoje zakończone przejazdy pojawią się tutaj
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {pastRides.map((ride) => (
                  <RideCard key={ride.id} ride={ride} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="messages" className="mt-0">
            <SystemMessagesTab />
          </TabsContent>
        </Tabs>
      </main>

      <RequiredMessagesModal />
    </div>
  );
}
