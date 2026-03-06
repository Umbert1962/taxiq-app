import { useState, useEffect, useRef, useCallback } from "react";
import { Helmet } from "react-helmet";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { 
  Car, MapPin, Navigation, Users, Clock, CheckCircle2, XCircle, X,
  Loader2, Power, Phone, MessageCircle, TrendingUp,
  DollarSign, BarChart3, LogOut, Route, Menu, List, History, CreditCard, ArrowLeft, AlertTriangle, Bell, BellOff, Camera, User, Mail, Banknote, Pencil, Share2, Copy, Download, QrCode, WifiOff, Heart, Send, ShieldCheck, Upload, ShieldOff, Ban, Zap, Plus, Shield, BookOpen
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useGeolocation } from "@/hooks/use-geolocation";
import { LocationRequired } from "@/components/location-required";
import { SystemMessagesTab, RequiredMessagesModal, useUnreadSystemMessageCount } from "@/components/user-system-messages";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { QRCodeCanvas } from "qrcode.react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { POLISH_MUNICIPALITIES } from "@/lib/polish-municipalities";
import { RideChat } from "@/components/ride-chat";
import { DriverNavigation } from "@/components/driver-navigation";
import { SubscriptionManager } from "@/components/subscription-manager";
import { PricingManager } from "@/components/pricing-manager";
import { useLocationTracking } from "@/hooks/use-location-tracking";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { useCapacitorPush, isCapacitorNative } from "@/hooks/use-capacitor-push";
import { useNotificationSound } from "@/hooks/use-notification-sound";
import { LiveTrackingMap } from "@/components/live-tracking-map";
import logoImage from "@assets/logo/logo-taxiq-neon.jpg";
import type { Ride, Driver } from "@shared/schema";

interface DriverStats {
  totalRides: number;
  totalEarnings: number;
  todayRides: number;
  todayEarnings: number;
}

function MunicipalitySearch({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  const [search, setSearch] = useState(value);
  const [showList, setShowList] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setSearch(value); }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setShowList(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = search.length >= 2
    ? POLISH_MUNICIPALITIES.filter(m => m.toLowerCase().includes(search.toLowerCase())).slice(0, 10)
    : [];

  return (
    <div className="relative" ref={ref}>
      <Input
        value={search}
        onChange={(e) => { setSearch(e.target.value); onChange(e.target.value); setShowList(true); }}
        onFocus={() => { if (search.length >= 2) setShowList(true); }}
        placeholder="Wpisz nazwę gminy, np. Poznań"
        data-testid="input-municipality-search"
      />
      {showList && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
          {filtered.map((m) => (
            <button
              key={m}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-primary/10 hover:text-primary transition-colors"
              onClick={() => { onChange(m); setSearch(m); setShowList(false); }}
            >
              {m}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function RideCard({ 
  ride, 
  driverId, 
  onAccept, 
  onStart, 
  onComplete,
  onRelease,
  onCall,
  onSetNegotiatedPrice,
  onOpenChat,
  onOpenNav,
  isPending,
  isCallingInProgress,
  preferredNavigation = "google"
}: { 
  ride: Ride & { driver?: Driver | null }; 
  driverId: string;
  onAccept?: () => void;
  onStart?: () => void;
  onComplete?: (negotiatedPrice?: number) => void;
  onRelease?: () => void;
  onCall?: () => void;
  onSetNegotiatedPrice?: (price: number) => void;
  onOpenChat?: () => void;
  onOpenNav?: () => void;
  isPending?: boolean;
  isCallingInProgress?: boolean;
  preferredNavigation?: string;
}) {
  const [showNegotiatedInput, setShowNegotiatedInput] = useState(false);
  const [negotiatedPrice, setNegotiatedPrice] = useState("");
  const [showBanDialog, setShowBanDialog] = useState(false);
  const [navStepIndex, setNavStepIndex] = useState(0);
  const { toast: rideToast } = useToast();

  const navTargets = (() => {
    const targets: { lat: string; lng: string; label: string }[] = [];
    if (ride.stops && ride.stops.length > 0) {
      ride.stops.forEach((stop: { address: string; lat: string; lng: string }, i: number) => {
        targets.push({ lat: stop.lat, lng: stop.lng, label: `Przystanek ${i + 1}` });
      });
    }
    if (ride.destLat && ride.destLng) {
      targets.push({ lat: ride.destLat, lng: ride.destLng, label: "Cel końcowy" });
    }
    return targets;
  })();
  const currentNavTarget = navTargets[navStepIndex] || navTargets[0];
  
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
    enabled: isCompleted && !!ride.passengerId,
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
      rideToast({ title: "Blokada aktywna", description: `Pasażer zablokowany na ${label}` });
    },
    onError: (error: Error) => {
      rideToast({ title: "Błąd", description: error.message, variant: "destructive" });
    },
  });

  const isActiveRideForChat = String(ride.driverId) === String(driverId) && (ride.status === "accepted" || ride.status === "in_progress");
  
  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/rides", ride.id, "messages", "unread"],
    queryFn: async () => {
      const res = await fetch(`/api/rides/${ride.id}/messages/unread?recipientType=driver`, { credentials: "include" });
      return res.json();
    },
    enabled: isActiveRideForChat,
    refetchInterval: 3000,
  });
  
  const unreadCount = unreadData?.count || 0;
  
  const isMyRide = String(ride.driverId) === String(driverId);
  const isActiveRideForRelation = isMyRide || (String(ride.preferredDriverId) === String(driverId) && ride.status === "pending");

  const { data: relationshipData } = useQuery<{ completedRides: number; message: string; passengerEligible: boolean }>({
    queryKey: ["/api/driver/passenger-relationship", ride.passengerId],
    queryFn: async () => {
      const res = await fetch(`/api/driver/passenger-relationship/${ride.passengerId}`, { credentials: "include" });
      if (!res.ok) return { completedRides: 0, message: "", passengerEligible: false };
      return res.json();
    },
    enabled: !!ride.passengerId && !!driverId && isActiveRideForRelation,
    staleTime: 30000,
  });
  const isSelectedForMe = String(ride.preferredDriverId) === String(driverId) && ride.status === "pending";
  const canAccept = ride.status === "pending" && !ride.driverId;
  const canStart = isMyRide && ride.status === "accepted";
  const canComplete = isMyRide && ride.status === "in_progress";
  const isActiveRide = isMyRide && (ride.status === "accepted" || ride.status === "in_progress");
  const isPhoneOrder = ride.orderSource === "phone";
  const canRelease = isMyRide && ride.status === "accepted" && isPhoneOrder;

  useLocationTracking({
    rideId: isActiveRide ? ride.id : null,
    role: "driver",
    enabled: isActiveRide,
    intervalMs: 3000,
  });

  const handleCompleteWithPrice = () => {
    if (negotiatedPrice && parseFloat(negotiatedPrice) > 0) {
      onComplete?.(parseFloat(negotiatedPrice));
      setShowNegotiatedInput(false);
      setNegotiatedPrice("");
    }
  };

  return (
    <>
    <Card className="glow-border" data-testid={`card-ride-${ride.id}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0 space-y-2">
            {(ride as any).passengerFirstName && (
              <div className="flex items-center gap-2 text-sm min-w-0" data-testid={`text-passenger-name-${ride.id}`}>
                <User className="w-4 h-4 text-primary shrink-0" />
                <span className="font-medium text-primary">{(ride as any).passengerFirstName}</span>
              </div>
            )}
            <div className="flex items-start gap-2 text-sm min-w-0">
              <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span className="text-muted-foreground shrink-0">Od:</span>
              <span className="font-medium break-words">{ride.pickupLocation}</span>
            </div>
            <div className="flex items-start gap-2 text-sm min-w-0">
              <Navigation className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span className="text-muted-foreground shrink-0">Do:</span>
              <span className="font-medium break-words">{ride.destination}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <Badge 
                variant={ride.status === "pending" ? "secondary" : ride.status === "in_progress" ? "default" : "outline"}
                data-testid={`badge-status-${ride.status}`}
              >
                {ride.status === "pending" && "Nowe"}
                {ride.status === "accepted" && "Zaakceptowane"}
                {ride.status === "in_progress" && "W trakcie"}
                {ride.status === "completed" && "Zakończone"}
                {ride.status === "cancelled" && "Anulowane"}
                {ride.status === "cancelled_by_passenger" && "Anulowane przez pasażera"}
                {ride.status === "cancelled_by_driver" && "Anulowane przez kierowcę"}
                {ride.status === "no_driver_found" && "Brak kierowcy"}
              </Badge>
              {isMyRide && (ride.status === "accepted" || ride.status === "in_progress") && onRelease && (
                <button
                  onClick={onRelease}
                  disabled={isPending}
                  className="w-7 h-7 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shrink-0"
                  data-testid="button-cancel-ride"
                  title="Anuluj"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {isSelectedForMe && (
              <div 
                className="bg-green-500 text-white text-xl px-6 py-4 rounded-lg animate-pulse font-bold flex items-center gap-3 shadow-lg shadow-green-500/50 cursor-pointer border-2 border-green-300"
                onClick={onAccept}
                data-testid="badge-selected-for-driver"
              >
                <CheckCircle2 className="w-8 h-8" />
                <div className="flex flex-col">
                  <span className="text-2xl">WYBRANY!</span>
                  <span className="text-sm font-normal">Kliknij aby zaakceptować</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4" />
            <span>{ride.passengerCount} os.</span>
          </div>
          {(ride.isCito && ride.citoPrice) ? (
            <div className="flex items-center gap-1.5 text-orange-500 font-bold">
              <Zap className="w-4 h-4" />
              <span>{ride.citoPrice} PLN (CITO)</span>
            </div>
          ) : ride.estimatedPrice ? (
            <div className="flex items-center gap-1.5 text-primary font-semibold">
              <span>{ride.estimatedPrice} PLN</span>
            </div>
          ) : null}
        </div>

        {ride.notes && typeof ride.notes === 'string' && ride.notes.includes("Dopłaty:") && (
          <div className="flex items-center gap-2 text-xs text-blue-400 bg-blue-500/5 border border-blue-500/10 rounded-lg px-2 py-1" data-testid={`text-surcharges-${ride.id}`}>
            <DollarSign className="w-3.5 h-3.5 shrink-0" />
            <span>{ride.notes.split("Dopłaty: ")[1]}</span>
          </div>
        )}

        {ride.status === "in_progress" && (
          <div className="p-2 rounded-lg bg-card border border-primary/20" data-testid={`meter-display-${ride.id}`}>
            {ride.estimatedPrice ? (
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Cennik:</span>
                <span className="font-bold text-primary">{ride.estimatedPrice} zł</span>
              </div>
            ) : null}
            <div className="flex items-center justify-between text-xs mt-0.5">
              <span className="text-muted-foreground">
                Postój/korki: {Math.floor((ride.meterWaitingSeconds || 0) / 60)} min {(ride.meterWaitingSeconds || 0) % 60}s
              </span>
              <span className="font-bold text-yellow-400">{ride.meterWaitingCost || 0} zł</span>
            </div>
            {ride.estimatedPrice ? (
              <div className="border-t border-primary/20 mt-1 pt-1 flex items-center justify-between">
                <span className="font-bold text-xs">RAZEM:</span>
                <span className="font-bold text-sm text-primary">{(ride.estimatedPrice || 0) + (ride.meterWaitingCost || 0)} zł</span>
              </div>
            ) : null}
          </div>
        )}

        {relationshipData && relationshipData.completedRides > 0 && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/10" data-testid="driver-relationship-info">
            <Heart className="w-4 h-4 text-primary shrink-0" />
            <span className="text-xs text-muted-foreground">
              {relationshipData.message || (
                relationshipData.completedRides === 1
                  ? `1 wspólny kurs z tym pasażerem`
                  : `${relationshipData.completedRides} wspólnych kursów z tym pasażerem`
              )}
            </span>
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-2">
          {canAccept && onAccept && (
            <Button 
              size="sm" 
              onClick={onAccept} 
              disabled={isPending}
              className="flex-1"
              data-testid="button-accept-ride"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
              Akceptuj
            </Button>
          )}
          {canComplete && onComplete && !showNegotiatedInput && !isPhoneOrder && (
            <>
              <Button 
                size="sm" 
                onClick={() => onComplete()} 
                disabled={isPending}
                className="flex-1"
                data-testid="button-complete-ride"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
                Zakończ
              </Button>
              <Button 
                size="sm" 
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
          {canComplete && onComplete && isPhoneOrder && !showNegotiatedInput && (
            <Button 
              size="sm" 
              variant="default"
              onClick={() => setShowNegotiatedInput(true)} 
              disabled={isPending}
              className="flex-1"
              data-testid="button-enter-taximeter-price"
            >
              <DollarSign className="w-4 h-4 mr-1" />
              Wpisz cenę z taksometru
            </Button>
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
                size="sm" 
                onClick={handleCompleteWithPrice}
                disabled={isPending || !negotiatedPrice}
                data-testid="button-complete-with-price"
              >
                <CheckCircle2 className="w-4 h-4 mr-1" />
                Zakończ
              </Button>
              <Button 
                size="sm" 
                variant="ghost"
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
          {canStart && onStart && (
            <Button 
              size="sm" 
              onClick={onStart} 
              disabled={isPending}
              className="w-full bg-primary hover:bg-primary/90"
              data-testid="button-start-ride"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Car className="w-4 h-4 mr-1" />}
              Rozpocznij kurs
            </Button>
          )}
          {isMyRide && (ride.status === "accepted" || ride.status === "in_progress") && (
            <>
              <div className="flex gap-2 w-full">
                <Button 
                  size="sm" 
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => {
                    if (ride.pickupLat && ride.pickupLng) {
                      const dest = `${ride.pickupLat},${ride.pickupLng}`;
                      if (preferredNavigation === "waze") {
                        window.open(`https://waze.com/ul?ll=${dest}&navigate=yes`, '_blank');
                      } else {
                        window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`, '_blank');
                      }
                    }
                  }}
                  data-testid="button-nav-to-passenger"
                >
                  <Navigation className="w-4 h-4 mr-1" />
                  Do pasażera
                </Button>
                {currentNavTarget && (
                  <Button 
                    size="sm" 
                    className={`flex-1 text-white ${navStepIndex < navTargets.length - 1 ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                    onClick={() => {
                      const dest = `${currentNavTarget.lat},${currentNavTarget.lng}`;
                      if (preferredNavigation === "waze") {
                        window.open(`https://waze.com/ul?ll=${dest}&navigate=yes`, '_blank');
                      } else {
                        window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`, '_blank');
                      }
                      if (navStepIndex < navTargets.length - 1) {
                        setNavStepIndex(navStepIndex + 1);
                      }
                    }}
                    data-testid="button-nav-to-destination"
                  >
                    <Route className="w-4 h-4 mr-1" />
                    {currentNavTarget.label}
                    {navTargets.length > 1 && ` (${navStepIndex + 1}/${navTargets.length})`}
                  </Button>
                )}
              </div>
              <div className="flex gap-2 w-full">
                <Button 
                  size="sm" 
                  className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black"
                  onClick={() => window.open("tel:+48732125585", "_self")}
                  data-testid="button-call-passenger"
                >
                  <Phone className="w-4 h-4 mr-1" />
                  Zadzwoń
                </Button>
                <div className="relative flex-1">
                  <Button 
                    size="sm" 
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                    onClick={onOpenChat} 
                    data-testid="button-chat"
                  >
                    <MessageCircle className="w-4 h-4 mr-1" />
                    Czat
                  </Button>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full animate-pulse" data-testid="badge-unread-messages">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {isActiveRide && ride.pickupLat && ride.pickupLng && (
          <div className="mt-3 space-y-2">
            <LiveTrackingMap
              rideId={ride.id}
              pickupLat={ride.pickupLat}
              pickupLng={ride.pickupLng}
              destLat={ride.destLat}
              destLng={ride.destLng}
              role="driver"
              driverName={undefined}
              stops={ride.stops || []}
            />
          </div>
        )}
        {isActiveRide && (!ride.pickupLat || !ride.pickupLng) && (
          <div className="mt-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30" data-testid="phone-order-address-warning">
            <div className="flex items-center gap-2 text-yellow-400 text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Adres odbioru wymaga potwierdzenia. Ustal właściwą lokalizację w trakcie rozmowy telefonicznej.</span>
            </div>
          </div>
        )}

        {isCompleted && ride.passengerId && (
          <div className="flex gap-2 mt-3">
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
                data-testid="button-ban-passenger"
              >
                <Ban className="w-4 h-4 mr-1" />
                Zablokuj
              </Button>
            )}
          </div>
        )}

      </CardContent>
    </Card>

    <Dialog open={showBanDialog} onOpenChange={setShowBanDialog}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-400">
            <Ban className="w-5 h-5" />
            Zablokuj pasażera
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
    </>
  );
}

export default function DriverDashboard() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const geolocation = useGeolocation();
  const [driverId, setDriverId] = useState<string | null>(null);
  const [driverName, setDriverName] = useState<string>("");
  const [isOnline, setIsOnline] = useState(false);
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [showNav, setShowNav] = useState(false);
  const [showSubscription, setShowSubscription] = useState(false);

  const [showPricing, setShowPricing] = useState(false);
  const [activeTab, setActiveTab] = useState("available");
  const [showRideAlert, setShowRideAlert] = useState(false);
  const [alertRide, setAlertRide] = useState<Ride | null>(null);
  const previousSelectedRideIdRef = useRef<string | null>(null);
  const [phoneOrderBadgeDismissed, setPhoneOrderBadgeDismissed] = useState(false);
  const previousPhoneOrderCountRef = useRef<number>(0);
  const phoneOrderNotifiedRef = useRef(false);
  const [showPhoneOrderBanner, setShowPhoneOrderBanner] = useState(false);

  // System messages
  const { data: unreadSysMsgData } = useUnreadSystemMessageCount();
  const unreadSysMsgCount = unreadSysMsgData?.count || 0;

  // Notification sound hook
  const { playNotificationSound } = useNotificationSound();

  // Scheduled ride reminders
  const [scheduledReminder, setScheduledReminder] = useState<{ ride: Ride; type: '60min' | '30min' | '20min' } | null>(null);
  const scheduledReminderAckedRef = useRef<Set<string>>(new Set());
  const scheduledSoundIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const scheduledAutoRevokeRef = useRef<NodeJS.Timeout | null>(null);

  // Push notifications hook (Web Push for browsers)
  const pushNotifications = usePushNotifications(driverId);
  
  // Capacitor native push (for Android/iOS native apps)
  const handleCapacitorPush = useCallback((data: any) => {
    if (data.type === "NEW_RIDE_REQUEST" || data.type === "ride_request") {
      queryClient.invalidateQueries({ queryKey: ["/api/rides/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/driver/rides/available"] });
      setActiveTab("available");
      playNotificationSound();
    } else if (data.type === "phone_order") {
      queryClient.invalidateQueries({ queryKey: ["/api/driver/rides/available"] });
      setActiveTab("available");
      setPhoneOrderBadgeDismissed(false);
      playNotificationSound();
    }
  }, [playNotificationSound]);
  
  const capacitorPush = useCapacitorPush(driverId, "driver", handleCapacitorPush);
  const previousPendingCountRef = useRef<number>(0);

  const [isNetworkOffline, setIsNetworkOffline] = useState(!navigator.onLine);
  const [authFailed, setAuthFailed] = useState(false);

  useEffect(() => {
    const goOffline = () => setIsNetworkOffline(true);
    const goOnline = () => setIsNetworkOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  // Check session from server instead of localStorage
  // WAŻNE: Nie odpytuj sesji gdy brak sieci - zachowaj dane sesji i czekaj na przywrócenie
  const { data: sessionData, isLoading: sessionLoading, isError: sessionError } = useQuery({
    queryKey: ["/api/drivers/session"],
    queryFn: async () => {
      if (!navigator.onLine) {
        throw new Error("Offline - skip session check");
      }
      const res = await fetch("/api/drivers/session", { credentials: 'include' });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setAuthFailed(true);
        }
        const text = await res.text().catch(() => "");
        throw new Error(`${res.status}: ${text || "Not authenticated"}`);
      }
      setAuthFailed(false);
      return res.json();
    },
    retry: (failureCount, error) => {
      if (authFailed) return false;
      return failureCount < 3;
    },
    retryDelay: 2000,
    staleTime: 60000,
    refetchOnReconnect: true,
    refetchInterval: isNetworkOffline ? false : 5000,
  });

  useEffect(() => {
    if (sessionError && authFailed) {
      navigate("/driver");
    } else if (sessionData) {
      if (!sessionData.profileCompleted && !sessionData.taxiLicenseNumber) {
        navigate("/driver/complete-profile");
        return;
      }
      setDriverId(sessionData.id);
      setDriverName(sessionData.firstName ? `${sessionData.firstName} ${sessionData.lastName || ''}`.trim() : (sessionData.name || ""));
    }
  }, [sessionData, sessionError, authFailed, navigate]);

  // Subscribe to push notifications when driver logs in
  useEffect(() => {
    if (driverId && pushNotifications.isSupported && !pushNotifications.isSubscribed) {
      pushNotifications.subscribe();
    }
  }, [driverId, pushNotifications.isSupported, pushNotifications.isSubscribed]);

  // State for pending ride acceptance from push notification
  const [pendingAcceptRideId, setPendingAcceptRideId] = useState<string | null>(null);

  // Listen for messages from service worker (e.g., accept ride, new ride request)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const msgType = event.data?.type;
      const rideId = event.data?.rideId;
      
      if (msgType === "ACCEPT_RIDE" && rideId) {
        setPendingAcceptRideId(rideId);
        queryClient.invalidateQueries({ queryKey: ["/api/driver/rides/available"] });
        queryClient.invalidateQueries({ queryKey: ["/api/rides/pending"] });
      } else if (msgType === "NEW_RIDE_REQUEST" && rideId) {
        console.log("[PUSH] New ride request received:", rideId);
        queryClient.invalidateQueries({ queryKey: ["/api/rides/pending"] });
        queryClient.invalidateQueries({ queryKey: ["/api/driver/rides/available"] });
        setActiveTab("available");
        playNotificationSound();
      } else if (msgType === "PHONE_ORDER_AVAILABLE") {
        console.log("[PUSH] Phone order available notification");
        queryClient.invalidateQueries({ queryKey: ["/api/driver/rides/available"] });
        setActiveTab("available");
        setPhoneOrderBadgeDismissed(false);
        setShowPhoneOrderBanner(false);
        playNotificationSound();
      } else if (msgType === "OPEN_RIDE" && rideId) {
        console.log("[PUSH] Open ride from notification:", rideId);
        queryClient.invalidateQueries({ queryKey: ["/api/rides/pending"] });
        queryClient.invalidateQueries({ queryKey: ["/api/driver/rides/available"] });
        setActiveTab("available");
      }
    };

    navigator.serviceWorker?.addEventListener("message", handleMessage);
    return () => {
      navigator.serviceWorker?.removeEventListener("message", handleMessage);
    };
  }, [playNotificationSound]);

  // Check URL for ride/action parameters (when opening from notification without existing window)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const acceptRideId = params.get("acceptRide");
    const rideParam = params.get("ride");
    const actionParam = params.get("action");
    
    const tabParam = params.get("tab");
    
    if (acceptRideId) {
      setPendingAcceptRideId(acceptRideId);
    } else if (rideParam && actionParam === "accept") {
      setPendingAcceptRideId(rideParam);
    } else if (tabParam === "available") {
      setActiveTab("available");
      setPhoneOrderBadgeDismissed(false);
      queryClient.invalidateQueries({ queryKey: ["/api/driver/rides/available"] });
    } else if (tabParam === "referral") {
      setActiveTab("referral");
    } else if (rideParam) {
      setActiveTab("available");
      queryClient.invalidateQueries({ queryKey: ["/api/rides/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/driver/rides/available"] });
    }
    
    if (acceptRideId || rideParam || tabParam) {
      window.history.replaceState({}, "", "/driver/dashboard");
    }
  }, []);

  const { data: driver } = useQuery<Driver>({
    queryKey: ["/api/drivers", driverId],
    queryFn: async () => {
      const res = await fetch(`/api/drivers/${driverId}`, {
        credentials: "include",
      });
      return res.json();
    },
    enabled: !!driverId,
    refetchInterval: 5000,
  });

  const { data: mainVehicles = [] } = useQuery<any[]>({
    queryKey: ["/api/drivers", driverId, "vehicles"],
    queryFn: async () => {
      const res = await fetch(`/api/drivers/${driverId}/vehicles`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!driverId,
  });
  const hasActiveVehicle = mainVehicles.some((v: any) => v.isActive);

  // Fetch initial online status from server profile
  // SECURITY: Force offline if driver is not approved
  useEffect(() => {
    if (driver) {
      const isApproved = driver.verificationStatus === "approved";
      
      if (!isApproved) {
        setIsOnline(false);
      } else {
        setIsOnline(driver.isOnline === true);
      }
    }
  }, [driver]);


  const { data: stats } = useQuery<DriverStats>({
    queryKey: ["/api/drivers", driverId, "stats"],
    queryFn: async () => {
      const res = await fetch(`/api/drivers/${driverId}/stats`, {
        credentials: "include",
      });
      return res.json();
    },
    enabled: !!driverId,
    refetchInterval: 10000,
  });

  // Check if email verification is enabled
  const { data: emailVerificationSettings } = useQuery<{ enabled: boolean }>({
    queryKey: ["/api/settings/email-verification-enabled"],
    queryFn: async () => {
      const res = await fetch("/api/settings/email-verification-enabled", { credentials: "include" });
      return res.json();
    },
  });
  const isEmailVerificationEnabled = emailVerificationSettings?.enabled ?? false;

  const { data: pendingRides, isLoading: pendingLoading } = useQuery<Ride[]>({
    queryKey: ["/api/rides/pending", driverId],
    queryFn: async () => {
      const res = await fetch(`/api/rides/pending?driverId=${driverId}`, {
        credentials: "include",
      });
      return res.json();
    },
    refetchInterval: isOnline ? 3000 : false,
    enabled: isOnline && !!driverId,
  });

  // Giełda zamówień telefonicznych - dostępne dla wszystkich kierowców
  const { data: availablePhoneOrders, isLoading: phoneOrdersLoading } = useQuery<Ride[]>({
    queryKey: ["/api/driver/rides/available"],
    queryFn: async () => {
      const res = await fetch("/api/driver/rides/available", {
        credentials: "include",
      });
      return res.json();
    },
    refetchInterval: isOnline ? 3000 : false,
    enabled: isOnline && !!driverId,
  });

  // Phone order notification system
  const phoneOrderCount = availablePhoneOrders?.length ?? 0;
  const hasPhoneOrders = phoneOrderCount > 0;

  // Auto-switch to "available" tab on login when phone orders exist
  useEffect(() => {
    if (driverId && hasPhoneOrders && !phoneOrderNotifiedRef.current) {
      setActiveTab("available");
      phoneOrderNotifiedRef.current = true;
      setPhoneOrderBadgeDismissed(false);
    }
  }, [driverId, hasPhoneOrders]);

  // Reset tracking when all phone orders are cleared
  useEffect(() => {
    if (!hasPhoneOrders) {
      phoneOrderNotifiedRef.current = false;
      previousPhoneOrderCountRef.current = 0;
      setPhoneOrderBadgeDismissed(false);
      setShowPhoneOrderBanner(false);
    }
  }, [hasPhoneOrders]);

  // Detect new phone orders arriving while driver is on different tab
  useEffect(() => {
    const prevCount = previousPhoneOrderCountRef.current;
    if (phoneOrderCount > prevCount && prevCount >= 0 && phoneOrderNotifiedRef.current) {
      if (activeTab !== "available") {
        setShowPhoneOrderBanner(true);
        setPhoneOrderBadgeDismissed(false);
        playNotificationSound();
      }
    }
    previousPhoneOrderCountRef.current = phoneOrderCount;
  }, [phoneOrderCount, activeTab, playNotificationSound]);

  // Dismiss banner when entering the "available" tab
  useEffect(() => {
    if (activeTab === "available") {
      setShowPhoneOrderBanner(false);
    }
  }, [activeTab]);

  // Mutation do akceptacji zamówienia z giełdy
  const claimOrderMutation = useMutation({
    mutationFn: async (rideId: string) => {
      const response = await apiRequest("POST", `/api/driver/rides/${rideId}/claim`);
      const ride = await response.json();
      return ride as Ride;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/driver/rides/available"] });
      queryClient.invalidateQueries({ queryKey: ["/api/driver/rides"] });
      setActiveTab("active");
    },
    onError: (error: Error) => {
      toast({
        title: "Błąd",
        description: error.message || "Nie udało się przyjąć zlecenia",
        variant: "destructive",
      });
    },
  });

  // Mutation do zwalniania zlecenia telefonicznego (wraca na giełdę)
  const releaseOrderMutation = useMutation({
    mutationFn: async (rideId: string) => {
      return apiRequest("POST", `/api/driver/rides/${rideId}/release`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/driver/rides/available"] });
      queryClient.invalidateQueries({ queryKey: ["/api/drivers", driverId, "rides"] });
      setActiveTab("available");
    },
    onError: (error: Error) => {
      toast({
        title: "Błąd",
        description: error.message || "Nie udało się zwolnić zlecenia",
        variant: "destructive",
      });
    },
  });

  const cancelRideMutation = useMutation({
    mutationFn: async (rideId: string) => {
      return apiRequest("PATCH", `/api/rides/${rideId}/cancel`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/drivers", driverId, "rides"] });
      toast({
        title: "Anulowano",
        description: "Przejazd został anulowany",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Błąd",
        description: error.message || "Nie udało się anulować przejazdu",
        variant: "destructive",
      });
    },
  });

  // Mutation do wywołania połączenia przez TaxiQ (ukryte numery)
  const [callingOrderId, setCallingOrderId] = useState<string | null>(null);
  const callPassengerMutation = useMutation({
    mutationFn: async (rideId: string) => {
      setCallingOrderId(rideId);
      return apiRequest("POST", `/api/driver/call/${rideId}`);
    },
    onSuccess: (data: any) => {
      toast({
        title: "Dzwonimy do Ciebie!",
        description: "Za chwilę zadzwonimy na Twój telefon i połączymy z klientem.",
      });
      setCallingOrderId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Błąd połączenia",
        description: error.message || "Nie udało się zainicjować połączenia",
        variant: "destructive",
      });
      setCallingOrderId(null);
    },
  });

  // Play sound when new ride appears
  useEffect(() => {
    if (pendingRides && pendingRides.length > 0) {
      const currentCount = pendingRides.length;
      if (currentCount > previousPendingCountRef.current) {
        // New ride appeared - play sound
        playNotificationSound();
      }
      previousPendingCountRef.current = currentCount;
    } else {
      previousPendingCountRef.current = 0;
    }
  }, [pendingRides, playNotificationSound]);

  // Show big alert when driver is selected by passenger
  useEffect(() => {
    if (pendingRides && driverId) {
      const selectedRide = pendingRides.find(r => r.preferredDriverId === driverId && r.status === "pending");
      
      if (selectedRide && selectedRide.id !== previousSelectedRideIdRef.current) {
        // New selection - show alert with sound
        setAlertRide(selectedRide);
        setShowRideAlert(true);
        playNotificationSound();
        previousSelectedRideIdRef.current = selectedRide.id;
      } else if (!selectedRide) {
        previousSelectedRideIdRef.current = null;
      }
    }
  }, [pendingRides, driverId, playNotificationSound]);

  // Send driver location to server when online (every 10 seconds)
  useEffect(() => {
    if (!isOnline || !driverId || !geolocation.latitude || !geolocation.longitude) return;
    
    const sendLocation = async () => {
      try {
        await apiRequest("PATCH", `/api/drivers/${driverId}/location`, {
          lat: geolocation.latitude,
          lng: geolocation.longitude
        });
      } catch (error) {
        console.error("Failed to send location:", error);
      }
    };
    
    // Send immediately when going online
    sendLocation();
    
    // Then send every 10 seconds
    const interval = setInterval(sendLocation, 10000);
    
    // Resend location immediately when app regains focus (mobile browser throttles intervals in background)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        sendLocation();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isOnline, driverId, geolocation.latitude, geolocation.longitude]);

  const { data: myRides, isLoading: myRidesLoading } = useQuery<Ride[]>({
    queryKey: ["/api/drivers", driverId, "rides"],
    queryFn: async () => {
      const res = await fetch(`/api/drivers/${driverId}/rides`, {
        credentials: "include",
      });
      return res.json();
    },
    enabled: !!driverId,
    refetchInterval: 5000,
  });

  const statusMutation = useMutation({
    mutationFn: async (online: boolean) => {
      let body: Record<string, unknown> = { isOnline: online };
      if (online && geolocation.latitude && geolocation.longitude) {
        body.lat = geolocation.latitude;
        body.lng = geolocation.longitude;
      }
      const res = await apiRequest("PATCH", `/api/drivers/${driverId}/status`, body);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Nie udało się zmienić statusu");
      }
      return res.json();
    },
    onSuccess: (_, online) => {
      setIsOnline(online);
      if (!online) {
        toast({
          title: "Jesteś offline",
          description: "Nie otrzymujesz nowych zleceń",
        });
      } else {
        toast({
          title: "Jesteś online",
          description: "Możesz przyjmować zlecenia",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Nie można przejść online",
        description: error.message || "Uzupełnij dane i przejdź do statusu weryfikacji.",
        variant: "destructive",
      });
    },
  });

  const acceptMutation = useMutation({
    mutationFn: async (rideId: string) => {
      const response = await apiRequest("PATCH", `/api/rides/${rideId}/accept`, { driverId });
      const ride = await response.json();
      return ride as Ride;
    },
    onSuccess: (ride: Ride) => {
      queryClient.invalidateQueries({ queryKey: ["/api/rides/pending", driverId] });
      queryClient.invalidateQueries({ queryKey: ["/api/drivers", driverId, "rides"] });
      queryClient.invalidateQueries({ queryKey: ["/api/drivers", driverId, "phone-orders"] });
      setPendingAcceptRideId(null);
      
      if (ride && ride.scheduledAt) {
        toast({
          title: "Zlecenie terminowe przyjęte",
          description: `Przejazd zaplanowany na ${new Date(ride.scheduledAt).toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit" })} o ${new Date(ride.scheduledAt).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}. Otrzymasz przypomnienia.`,
        });
        setActiveTab("scheduled");
      } else if (ride) {
        setSelectedRide(ride);
        setActiveTab("active");
      }
    },
    onError: () => {
      toast({ 
        title: "Nie udało się zaakceptować zlecenia", 
        description: "Zlecenie mogło zostać już przyjęte lub anulowane",
        variant: "destructive" 
      });
      setPendingAcceptRideId(null);
    },
  });

  // Auto-accept ride from push notification
  useEffect(() => {
    if (pendingAcceptRideId && driverId && !acceptMutation.isPending) {
      acceptMutation.mutate(pendingAcceptRideId);
    }
  }, [pendingAcceptRideId, driverId]);

  const startMutation = useMutation({
    mutationFn: async (rideId: string) => {
      await apiRequest("PATCH", `/api/rides/${rideId}/status`, { status: "in_progress" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/drivers", driverId, "rides"] });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (ride: Ride) => {
      await apiRequest("PATCH", `/api/rides/${ride.id}/complete`, { 
        finalPrice: (ride.isCito && ride.citoPrice) ? ride.citoPrice : ride.estimatedPrice 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/drivers", driverId, "rides"] });
      queryClient.invalidateQueries({ queryKey: ["/api/drivers", driverId, "stats"] });
      setActiveTab("available"); // Automatyczne przejście na giełdę
    },
  });

  const handleLogout = async () => {
    try {
      await fetch("/api/drivers/logout", { 
        method: "POST",
        credentials: 'include'
      });
    } catch (error) {
      console.error("Logout error:", error);
    }
    queryClient.clear();
    window.location.href = "/driver";
  };

  const scheduledRides = myRides?.filter(r => r.status === "accepted" && r.scheduledAt && new Date(r.scheduledAt) > new Date()) || [];
  const activeRides = myRides?.filter(r => (r.status === "accepted" && !r.scheduledAt) || r.status === "in_progress" || (r.status === "accepted" && r.scheduledAt && new Date(r.scheduledAt) <= new Date())) || [];
  const completedRides = myRides?.filter(r => r.status === "completed") || [];

  // Scheduled ride reminder system
  useEffect(() => {
    if (!scheduledRides || scheduledRides.length === 0) return;

    const checkInterval = setInterval(() => {
      const now = new Date().getTime();
      // Don't replace an active 20min alarm with a quieter reminder
      if (scheduledReminder?.type === '20min') return;

      let mostUrgent: { ride: Ride; type: '60min' | '30min' | '20min'; minutesBefore: number } | null = null;

      for (const ride of scheduledRides) {
        if (!ride.scheduledAt) continue;
        const scheduledTime = new Date(ride.scheduledAt).getTime();
        const minutesBefore = (scheduledTime - now) / (1000 * 60);

        const key20 = `${ride.id}-20min`;
        const key30 = `${ride.id}-30min`;
        const key60 = `${ride.id}-60min`;

        let type: '60min' | '30min' | '20min' | null = null;
        if (minutesBefore <= 20 && minutesBefore > 0 && !scheduledReminderAckedRef.current.has(key20)) {
          type = '20min';
        } else if (minutesBefore <= 30 && minutesBefore > 20 && !scheduledReminderAckedRef.current.has(key30)) {
          type = '30min';
        } else if (minutesBefore <= 60 && minutesBefore > 30 && !scheduledReminderAckedRef.current.has(key60)) {
          type = '60min';
        }

        if (type && (!mostUrgent || minutesBefore < mostUrgent.minutesBefore)) {
          mostUrgent = { ride, type, minutesBefore };
        }
      }

      if (mostUrgent && (!scheduledReminder || scheduledReminder.ride.id !== mostUrgent.ride.id || scheduledReminder.type !== mostUrgent.type)) {
        setScheduledReminder({ ride: mostUrgent.ride, type: mostUrgent.type });
      }
    }, 10000);

    return () => clearInterval(checkInterval);
  }, [scheduledRides, scheduledReminder]);

  // Play sound repeatedly for 20min reminder
  useEffect(() => {
    if (scheduledReminder?.type === '20min') {
      playNotificationSound();
      scheduledSoundIntervalRef.current = setInterval(() => {
        playNotificationSound();
      }, 5000);

      // Auto-revoke after 1 minute if not acknowledged
      const rideIdToRevoke = scheduledReminder.ride.id;
      scheduledAutoRevokeRef.current = setTimeout(async () => {
        try {
          const checkRes = await fetch(`/api/rides/${rideIdToRevoke}`, { credentials: "include" });
          if (checkRes.ok) {
            const currentRide = await checkRes.json();
            if (currentRide.status === "accepted" && currentRide.driverId) {
              await apiRequest("PATCH", `/api/rides/${rideIdToRevoke}/revoke-scheduled`, { driverId });
              queryClient.invalidateQueries({ queryKey: ["/api/drivers", driverId, "rides"] });
              toast({
                title: "Zlecenie odebrane",
                description: "Nie potwierdziłeś zlecenia terminowego na czas. Wróciło na giełdę.",
                variant: "destructive",
              });
            }
          }
        } catch (e) {
          console.error("Failed to revoke scheduled ride:", e);
        }
        setScheduledReminder(null);
      }, 60000);
    }

    return () => {
      if (scheduledSoundIntervalRef.current) {
        clearInterval(scheduledSoundIntervalRef.current);
        scheduledSoundIntervalRef.current = null;
      }
      if (scheduledAutoRevokeRef.current) {
        clearTimeout(scheduledAutoRevokeRef.current);
        scheduledAutoRevokeRef.current = null;
      }
    };
  }, [scheduledReminder]);

  // Clear reminder if ride is no longer in scheduled rides (started, revoked, etc.)
  useEffect(() => {
    if (scheduledReminder && myRides) {
      const ride = myRides.find(r => r.id === scheduledReminder.ride.id);
      if (!ride || ride.status !== "accepted") {
        if (scheduledSoundIntervalRef.current) {
          clearInterval(scheduledSoundIntervalRef.current);
          scheduledSoundIntervalRef.current = null;
        }
        if (scheduledAutoRevokeRef.current) {
          clearTimeout(scheduledAutoRevokeRef.current);
          scheduledAutoRevokeRef.current = null;
        }
        setScheduledReminder(null);
      }
    }
  }, [myRides, scheduledReminder]);

  const handleAckScheduledReminder = () => {
    if (!scheduledReminder) return;
    const key = `${scheduledReminder.ride.id}-${scheduledReminder.type}`;
    scheduledReminderAckedRef.current.add(key);

    if (scheduledReminder.type === '20min') {
      if (scheduledSoundIntervalRef.current) {
        clearInterval(scheduledSoundIntervalRef.current);
        scheduledSoundIntervalRef.current = null;
      }
      if (scheduledAutoRevokeRef.current) {
        clearTimeout(scheduledAutoRevokeRef.current);
        scheduledAutoRevokeRef.current = null;
      }
    }
    setScheduledReminder(null);
  };

  const handleStartScheduledRide = () => {
    if (!scheduledReminder) return;
    const key = `${scheduledReminder.ride.id}-${scheduledReminder.type}`;
    scheduledReminderAckedRef.current.add(key);
    if (scheduledSoundIntervalRef.current) {
      clearInterval(scheduledSoundIntervalRef.current);
      scheduledSoundIntervalRef.current = null;
    }
    if (scheduledAutoRevokeRef.current) {
      clearTimeout(scheduledAutoRevokeRef.current);
      scheduledAutoRevokeRef.current = null;
    }
    const ride = scheduledReminder.ride;
    setScheduledReminder(null);
    setSelectedRide(ride);
    setShowNav(true);
  };

  useEffect(() => {
    if (selectedRide && myRides) {
      const updatedRide = myRides.find(r => r.id === selectedRide.id);
      if (updatedRide && (updatedRide.status === "cancelled_by_passenger" || updatedRide.status === "cancelled")) {
        setShowNav(false);
        setShowChat(false);
        setSelectedRide(null);
        toast({
          title: "Kurs anulowany",
          description: "Pasażer anulował przejazd.",
          variant: "destructive",
        });
      }
    }
  }, [myRides, selectedRide]);

  const [uploading, setUploading] = useState(false);

  const handleAcceptFromAlert = () => {
    if (alertRide) {
      acceptMutation.mutate(alertRide.id);
      setShowRideAlert(false);
      setAlertRide(null);
    }
  };

  const profile = driver;
  const isApproved = profile?.verificationStatus === "approved";

  // Wymuszenie udostępnienia lokalizacji
  if (!geolocation.permissionGranted) {
    return (
      <LocationRequired
        error={geolocation.error}
        loading={geolocation.loading}
        permissionDenied={geolocation.permissionDenied}
        onRetry={geolocation.requestLocation}
      />
    );
  }

  // Show loading while checking session
  if (sessionLoading || !driverId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Ładowanie...</p>
        </div>
      </div>
    );
  }

  if (showChat && selectedRide) {
    return (
      <RideChat 
        ride={selectedRide} 
        senderId={driverId} 
        senderType="driver"
        onBack={() => { setShowChat(false); setSelectedRide(null); }}
      />
    );
  }

  if (showNav && selectedRide) {
    const currentRide = myRides?.find(r => r.id === selectedRide.id) || selectedRide;
    return (
      <DriverNavigation 
        ride={currentRide}
        onBack={() => { setShowNav(false); setSelectedRide(null); setActiveTab("active"); }}
        onStart={() => startMutation.mutate(currentRide.id as string)}
        onComplete={(negotiatedPrice) => {
          if (negotiatedPrice) {
            completeMutation.mutate({ ...currentRide, estimatedPrice: negotiatedPrice } as Ride);
          } else {
            completeMutation.mutate(currentRide as Ride);
          }
          setShowNav(false);
          setSelectedRide(null);
        }}
        onOpenChat={() => {
          setShowNav(false);
          setShowChat(true);
        }}
        isPending={startMutation.isPending || completeMutation.isPending}
        preferredNavigation={driver?.preferredNavigation || "google"}
      />
    );
  }

  if (showSubscription && driverId) {
    return (
      <div className="min-h-screen bg-background p-4">
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border -mx-4 -mt-4 mb-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setShowSubscription(false)} data-testid="button-back-subscription">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-semibold">Zarządzanie abonamentem</h1>
          </div>
        </header>
        <SubscriptionManager 
          driverId={driverId} 
          onClose={() => setShowSubscription(false)} 
          onPayClick={() => {
            setShowSubscription(false);
            setActiveTab("payments");
          }}
        />
      </div>
    );
  }

  if (showPricing && driverId) {
    return (
      <div className="min-h-screen bg-background p-4">
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border -mx-4 -mt-4 mb-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setShowPricing(false)} data-testid="button-back-pricing">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-semibold">Cennik</h1>
          </div>
        </header>
        <PricingManager driverId={driverId} onClose={() => setShowPricing(false)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen min-h-[100dvh] h-screen h-[100dvh] bg-background flex flex-col overflow-hidden">
      <RequiredMessagesModal />
      <Helmet>
        <title>TaxiQ Kierowca</title>
      </Helmet>

      {!isApproved && (
        <div className="bg-yellow-500/10 border-b border-yellow-500/20 p-3 flex items-center justify-between gap-3 sticky top-0 z-50 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-yellow-500 text-sm font-medium">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Twój profil wymaga uzupełnienia. Przejdź do zakładki Profil i uzupełnij dane, aby móc przyjmować zlecenia.</span>
          </div>
          <Button 
            size="sm" 
            variant="outline" 
            className="border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10 h-8 text-xs whitespace-nowrap"
            onClick={() => setActiveTab("profile")}
          >
            Profil
          </Button>
        </div>
      )}
      {/* Push notification status banner */}
      {pushNotifications.isSupported && !pushNotifications.isSubscribed && (
        <div className="bg-amber-500 text-black px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BellOff className="w-5 h-5 shrink-0" />
            <span className="text-sm font-medium">
              Powiadomienia wyłączone - nie otrzymasz alertu o nowych zleceniach!
            </span>
          </div>
          <Button 
            size="sm" 
            variant="secondary"
            onClick={() => pushNotifications.subscribe()}
            className="shrink-0"
            data-testid="button-enable-notifications"
          >
            <Bell className="w-4 h-4 mr-1" />
            Włącz
          </Button>
        </div>
      )}
      
      {/* Big alert dialog when passenger selects this driver */}
      <Dialog open={showRideAlert} onOpenChange={setShowRideAlert}>
        <DialogContent className="max-w-md bg-white text-black border-4 border-primary shadow-2xl">
          <DialogHeader className="text-center space-y-4">
            <div className="mx-auto w-20 h-20 bg-primary rounded-full flex items-center justify-center animate-pulse">
              <AlertTriangle className="w-12 h-12 text-black" />
            </div>
            <DialogTitle className="text-2xl font-bold text-black">
              NOWE ZLECENIE!
            </DialogTitle>
          </DialogHeader>
          
          {alertRide && (
            <div className="space-y-4 py-4">
              <div className="bg-gray-100 p-4 rounded-lg space-y-2 overflow-hidden">
                <div className="flex items-center gap-2 min-w-0">
                  <MapPin className="w-5 h-5 text-primary shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-gray-500">Z:</p>
                    <p className="font-medium text-sm break-words">{alertRide.pickupLocation}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 min-w-0">
                  <Navigation className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-gray-500">Do:</p>
                    <p className="font-medium text-sm break-words">{alertRide.destination}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 pt-2 border-t">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4 text-gray-500" />
                    <span className="text-sm">{alertRide.passengerCount} os.</span>
                  </div>
                  {(alertRide.isCito && alertRide.citoPrice) ? (
                    <div className="font-bold text-orange-500 text-lg flex items-center gap-1">
                      <Zap className="w-5 h-5" />
                      {alertRide.citoPrice} PLN (CITO)
                    </div>
                  ) : alertRide.estimatedPrice ? (
                    <div className="font-bold text-primary text-lg">
                      {alertRide.estimatedPrice} PLN
                    </div>
                  ) : null}
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button 
                  onClick={handleAcceptFromAlert}
                  className="flex-1 h-14 text-lg font-bold"
                  disabled={acceptMutation.isPending}
                  data-testid="button-accept-alert"
                >
                  {acceptMutation.isPending ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-6 h-6 mr-2" />
                      AKCEPTUJ
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setShowRideAlert(false);
                    setAlertRide(null);
                  }}
                  className="h-14 px-6"
                  data-testid="button-dismiss-alert"
                >
                  <X className="w-6 h-6" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {isNetworkOffline && (
        <div className="shrink-0 z-50 bg-destructive text-destructive-foreground px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium" data-testid="banner-network-offline">
          <WifiOff className="w-4 h-4" />
          Brak połączenia z internetem — czekam na przywrócenie sieci...
        </div>
      )}

      <header className="shrink-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <a href="/" data-testid="link-back-home">
                <img 
                  src={logoImage} 
                  alt="TaxiQ - Strona główna" 
                  className="w-auto"
                  style={{
                    height: "40px",
                    filter: "drop-shadow(0 0 8px rgba(230, 255, 63, 0.4)) drop-shadow(0 0 20px rgba(230, 255, 63, 0.15))",
                  }}
                />
              </a>
              <div>
                <p className="font-semibold text-sm">{driverName}</p>
                <p className="text-xs text-muted-foreground">Kierowca <span className="opacity-50">v2.1.0</span></p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 sm:gap-3 text-sm font-semibold">
                <span className="text-primary font-bold">{stats?.todayEarnings || 0} PLN</span>
                <span className="text-muted-foreground">{stats?.todayRides || 0}</span>
              </div>
              <button
                onClick={() => {
                  if (driver?.verificationStatus !== "approved") {
                    toast({
                      title: "Weryfikacja wymagana",
                      description: "Konto wymaga weryfikacji. Prześlij zdjęcie identyfikatora taksówkarza.",
                      variant: "destructive",
                    });
                    return;
                  }
                  if (!isOnline && !hasActiveVehicle) {
                    toast({
                      title: "Wybierz pojazd",
                      description: "Dodaj i aktywuj pojazd w zakładce Profil → Moje pojazdy.",
                      variant: "destructive",
                    });
                    return;
                  }
                  statusMutation.mutate(!isOnline);
                }}
                disabled={statusMutation.isPending || driver?.verificationStatus !== "approved"}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold ${
                  driver?.verificationStatus !== "approved"
                    ? "opacity-50 cursor-not-allowed bg-muted text-muted-foreground"
                    : isOnline 
                      ? "bg-green-600 text-white cursor-pointer" 
                      : "bg-red-600 text-white cursor-pointer"
                }`}
                data-testid="button-toggle-online"
              >
                <Power className="w-5 h-5" />
                <span>{isOnline ? "Online" : "Offline"}</span>
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-10 w-10" data-testid="button-menu">
                    <Menu className="w-6 h-6" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="flex items-center gap-2">
                    <Car className="w-4 h-4 text-primary" />
                    {driverName}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem onClick={() => setActiveTab("available")} data-testid="menu-available">
                    <List className="w-4 h-4 mr-2" />
                    Dostępne zlecenia
                    {pendingRides && pendingRides.length > 0 && (
                      <Badge variant="secondary" className="ml-auto">{pendingRides.length}</Badge>
                    )}
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem onClick={() => setActiveTab("scheduled")} data-testid="menu-scheduled">
                    <Clock className="w-4 h-4 mr-2" />
                    Terminowe
                    {scheduledRides.length > 0 && (
                      <Badge variant="secondary" className="ml-auto bg-blue-500/20 text-blue-400">{scheduledRides.length}</Badge>
                    )}
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem onClick={() => setActiveTab("active")} data-testid="menu-active">
                    <Car className="w-4 h-4 mr-2" />
                    Aktywne przejazdy
                    {activeRides.length > 0 && (
                      <Badge variant="default" className="ml-auto">{activeRides.length}</Badge>
                    )}
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem onClick={() => setActiveTab("history")} data-testid="menu-history">
                    <History className="w-4 h-4 mr-2" />
                    Historia
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem onClick={() => setActiveTab("profile")} data-testid="menu-profile">
                    <User className="w-4 h-4 mr-2" />
                    Mój profil
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem onClick={() => setShowSubscription(true)} data-testid="menu-subscription">
                    <CreditCard className="w-4 h-4 mr-2" />
                    Abonament
                  </DropdownMenuItem>
                  
                  
                  <DropdownMenuItem onClick={() => setShowPricing(true)} data-testid="menu-pricing">
                    <DollarSign className="w-4 h-4 mr-2" />
                    Cennik
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive" data-testid="menu-logout">
                    <LogOut className="w-4 h-4 mr-2" />
                    Wyloguj się
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 space-y-4 flex-1 overflow-y-auto">
        {showPhoneOrderBanner && activeTab !== "available" && (
          <div
            className="flex items-center justify-between gap-2 p-3 rounded-md border border-[hsl(70,100%,50%)] bg-[hsl(70,100%,50%,0.1)] cursor-pointer"
            onClick={() => { setActiveTab("available"); setShowPhoneOrderBanner(false); setPhoneOrderBadgeDismissed(true); }}
            data-testid="phone-order-banner"
          >
            <div className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-[hsl(70,100%,50%)]" />
              <span className="text-sm font-medium">
                Nowe zlecenia na giełdzie ({phoneOrderCount}) - kliknij aby zobaczyć
              </span>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={(e) => { e.stopPropagation(); setShowPhoneOrderBanner(false); setPhoneOrderBadgeDismissed(true); }}
              data-testid="button-dismiss-phone-banner"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}
        {scheduledReminder && (
          <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/70 ${scheduledReminder.type === '20min' ? 'animate-pulse' : ''}`} data-testid="scheduled-reminder-modal">
            <div className={`mx-4 w-full max-w-sm rounded-xl border-2 p-6 space-y-4 ${scheduledReminder.type === '20min' ? 'border-red-500 bg-red-950/90 shadow-[0_0_30px_rgba(255,0,0,0.3)]' : 'border-blue-500 bg-background/95'}`}>
              <div className="text-center space-y-2">
                <Clock className={`w-12 h-12 mx-auto ${scheduledReminder.type === '20min' ? 'text-red-500' : 'text-blue-400'}`} />
                <h3 className="text-lg font-bold">
                  {scheduledReminder.type === '60min' && 'Zlecenie terminowe za 1 godzinę'}
                  {scheduledReminder.type === '30min' && 'Zlecenie terminowe za 30 minut'}
                  {scheduledReminder.type === '20min' && 'Zlecenie terminowe za 20 minut!'}
                </h3>
                {scheduledReminder.type === '20min' && (
                  <p className="text-red-400 text-sm font-semibold">Potwierdź w ciągu 1 minuty lub zlecenie wróci na giełdę!</p>
                )}
              </div>
              <div className="text-sm space-y-1">
                <p className="text-blue-400 font-bold">
                  {new Date(scheduledReminder.ride.scheduledAt!).toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit" })} o {new Date(scheduledReminder.ride.scheduledAt!).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}
                </p>
                <p className="font-medium">
                  <MapPin className="w-3.5 h-3.5 inline mr-1 text-primary" />
                  {scheduledReminder.ride.pickupLocation || "Lokalizacja nieznana"}
                </p>
                {scheduledReminder.ride.destination && (
                  <p className="text-muted-foreground">→ {scheduledReminder.ride.destination}</p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                {scheduledReminder.type === '20min' ? (
                  <>
                    <Button className="w-full" size="lg" onClick={handleStartScheduledRide} data-testid="button-start-scheduled-from-reminder">
                      <Navigation className="w-5 h-5 mr-2" />
                      Rozpocznij nawigację
                    </Button>
                    <Button variant="outline" className="w-full" onClick={handleAckScheduledReminder} data-testid="button-ack-scheduled-reminder">
                      Potwierdzam — jadę za chwilę
                    </Button>
                  </>
                ) : (
                  <Button className="w-full" onClick={handleAckScheduledReminder} data-testid="button-ack-scheduled-reminder">
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    Rozumiem, pamiętam
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex w-full gap-0 px-0.5">
            <TabsTrigger value="available" data-testid="tab-available" className="flex-1 px-0 min-w-0" onClick={() => { if (hasPhoneOrders) setPhoneOrderBadgeDismissed(true); }}>
              <List className="w-5 h-5 sm:w-6 sm:h-6 sm:mr-1" />
              <span className="hidden sm:inline">Dostępne</span>
              {hasPhoneOrders && !phoneOrderBadgeDismissed && (
                <span className="relative ml-1 flex h-3 w-3" data-testid="phone-order-pulse">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[hsl(70,100%,50%)] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-[hsl(70,100%,50%)]"></span>
                </span>
              )}
              {hasPhoneOrders && (
                <Badge variant="secondary" className="ml-1" data-testid="badge-phone-orders">{phoneOrderCount}</Badge>
              )}
              {pendingRides && pendingRides.length > 0 && !hasPhoneOrders && (
                <Badge variant="secondary" className="ml-1">{pendingRides.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="scheduled" data-testid="tab-scheduled" className="flex-1 px-0 min-w-0">
              <Clock className="w-5 h-5 sm:w-6 sm:h-6 sm:mr-1" />
              <span className="hidden sm:inline">Terminowe</span>
              {scheduledRides.length > 0 && (
                <Badge variant="secondary" className="ml-1 bg-blue-500/20 text-blue-400">{scheduledRides.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="active" data-testid="tab-active" className="flex-1 px-0 min-w-0">
              <Car className="w-5 h-5 sm:w-6 sm:h-6 sm:mr-1" />
              <span className="hidden sm:inline">Aktywne</span>
              {activeRides.length > 0 && (
                <Badge variant="default" className="ml-1">{activeRides.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="history" data-testid="tab-history" className="flex-1 px-0 min-w-0">
              <History className="w-5 h-5 sm:w-6 sm:h-6 sm:mr-1" />
              <span className="hidden sm:inline">Historia</span>
            </TabsTrigger>
            <TabsTrigger value="payments" data-testid="tab-payments" className="flex-1 px-0 min-w-0">
              <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 sm:mr-1" />
              <span className="hidden sm:inline">Płatności</span>
            </TabsTrigger>
            <TabsTrigger value="referral" data-testid="tab-referral" className="flex-1 px-0 min-w-0">
              <Share2 className="w-5 h-5 sm:w-6 sm:h-6 sm:mr-1" />
              <span className="hidden sm:inline">Polecenia</span>
            </TabsTrigger>
            <TabsTrigger value="profile" data-testid="tab-profile" className="flex-1 px-0 min-w-0">
              <User className="w-5 h-5 sm:w-6 sm:h-6 sm:mr-1" />
              <span className="hidden sm:inline">Profil</span>
            </TabsTrigger>
            <TabsTrigger value="messages" data-testid="tab-messages" className="flex-1 px-0 min-w-0">
              <Mail className="w-5 h-5 sm:w-6 sm:h-6 sm:mr-1" />
              <span className="hidden sm:inline">Komunikaty</span>
              {unreadSysMsgCount > 0 && (
                <Badge variant="destructive" className="ml-1 text-xs">{unreadSysMsgCount}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="available" className="mt-4 space-y-4">
            {!driver?.photoUrl ? (
              <Card className="border-destructive">
                <CardContent className="p-6 text-center">
                  <Camera className="w-12 h-12 mx-auto text-destructive mb-4" />
                  <p className="font-semibold text-destructive mb-2">Brak zdjęcia profilowego</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Aby otrzymywać zlecenia, musisz dodać swoje zdjęcie profilowe. 
                    Pasażerowie muszą wiedzieć jak wyglądasz.
                  </p>
                  <Button onClick={() => setActiveTab("profile")} data-testid="button-go-to-profile">
                    <Camera className="w-4 h-4 mr-2" />
                    Dodaj zdjęcie
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Giełda zamówień */}
                <Card className="border-primary/50 bg-primary/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Phone className="w-5 h-5 text-primary" />
                      Giełda zamówień
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Zamówienia telefoniczne i terminowe. Przyjmij zlecenie aby je obsłużyć.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {phoneOrdersLoading ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      </div>
                    ) : availablePhoneOrders && availablePhoneOrders.length > 0 ? (
                      availablePhoneOrders.map((order: any) => (
                        <div key={order.id} className="flex items-center gap-2 py-2 border-b border-border last:border-b-0" data-testid={`phone-order-${order.id}`}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 text-xs mb-0.5">
                              {order.scheduledAt ? (
                                <span className="text-blue-400 font-semibold">
                                  {new Date(order.scheduledAt).toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit" })} {new Date(order.scheduledAt).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}
                                </span>
                              ) : (
                                <span className="text-primary font-semibold">TEL</span>
                              )}
                              {order.distanceKm !== null && order.distanceKm !== undefined && (
                                <span className="text-muted-foreground">{order.distanceKm} km</span>
                              )}
                            </div>
                            <p className="text-sm font-medium leading-tight">
                              {order.pickupLocation && 
                               !order.pickupLocation.includes("oczekuje") && 
                               !order.pickupLocation.includes("transkrypcję") ? (
                                order.pickupLocation
                              ) : (
                                <span className="text-muted-foreground italic">Położenie nieznane</span>
                              )}
                            </p>
                            {order.destination && (
                              <p className="text-xs text-muted-foreground leading-tight">→ {order.destination}</p>
                            )}
                          </div>
                          <Button
                            size="sm"
                            className="shrink-0 px-4"
                            onClick={() => claimOrderMutation.mutate(order.id)}
                            disabled={claimOrderMutation.isPending}
                            data-testid={`claim-order-${order.id}`}
                          >
                            {claimOrderMutation.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : "Przyjmij"}
                          </Button>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-muted-foreground text-sm">
                        Brak zamówień na giełdzie
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Zlecenia od pasażerów z aplikacji */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground">Zlecenia z aplikacji</h3>
                  {pendingLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                  ) : pendingRides && pendingRides.length > 0 ? (
                    pendingRides.map((ride) => (
                      <RideCard 
                        key={ride.id} 
                        ride={ride} 
                        driverId={driverId}
                        onAccept={() => acceptMutation.mutate(ride.id)}
                        isPending={acceptMutation.isPending}
                      />
                    ))
                  ) : (
                    <div className="text-center py-6">
                      <Clock className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                      <p className="text-muted-foreground text-sm">Brak zleceń z aplikacji</p>
                      <p className="text-xs text-muted-foreground mt-1">Nowe zlecenia pojawią się automatycznie</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="scheduled" className="mt-4 space-y-3">
            {myRidesLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : scheduledRides.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Brak przyjętych zleceń terminowych</p>
              </div>
            ) : (
              scheduledRides.map((ride) => {
                const scheduledDate = new Date(ride.scheduledAt!);
                const now = new Date();
                const minutesUntil = Math.round((scheduledDate.getTime() - now.getTime()) / (1000 * 60));
                const hoursUntil = Math.floor(minutesUntil / 60);
                const minsRemainder = minutesUntil % 60;
                return (
                  <Card key={ride.id} className="border-blue-500/30" data-testid={`scheduled-ride-${ride.id}`}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-blue-400" />
                          <span className="text-blue-400 font-bold text-lg">
                            {scheduledDate.toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit" })} o {scheduledDate.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {minutesUntil > 0
                            ? hoursUntil > 0
                              ? `za ${hoursUntil}h ${minsRemainder}min`
                              : `za ${minutesUntil} min`
                            : "Teraz!"}
                        </Badge>
                      </div>
                      <div className="text-sm space-y-0.5">
                        <p className="font-medium">
                          <MapPin className="w-3.5 h-3.5 inline mr-1 text-primary" />
                          {ride.pickupLocation || "Lokalizacja nieznana"}
                        </p>
                        {ride.destination && (
                          <p className="text-muted-foreground">→ {ride.destination}</p>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span><Users className="w-3.5 h-3.5 inline mr-0.5" />{ride.passengerCount} os.</span>
                          {ride.estimatedPrice && <span className="text-primary font-semibold">{ride.estimatedPrice} PLN</span>}
                        </div>
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedRide(ride);
                            setShowNav(true);
                          }}
                          data-testid={`start-scheduled-${ride.id}`}
                        >
                          <Navigation className="w-4 h-4 mr-1" />
                          Rozpocznij teraz
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="active" className="mt-4 space-y-3">
            {myRidesLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : activeRides.length > 0 ? (
              activeRides.map((ride) => (
                <RideCard 
                  key={ride.id} 
                  ride={ride} 
                  driverId={driverId}
                  onStart={() => startMutation.mutate(ride.id)}
                  onComplete={(negotiatedPrice) => {
                    if (negotiatedPrice) {
                      completeMutation.mutate({ ...ride, estimatedPrice: negotiatedPrice } as Ride);
                    } else {
                      completeMutation.mutate(ride);
                    }
                  }}
                  onRelease={() => {
                    if (ride.orderSource === 'phone' && ride.status === 'accepted') {
                      releaseOrderMutation.mutate(ride.id);
                    } else {
                      cancelRideMutation.mutate(ride.id);
                    }
                  }}
                  onCall={undefined}
                  isCallingInProgress={false}
                  onOpenChat={() => { setSelectedRide(ride); setShowChat(true); }}
                  onOpenNav={() => { setSelectedRide(ride); setShowNav(true); }}
                  isPending={startMutation.isPending || completeMutation.isPending || releaseOrderMutation.isPending || cancelRideMutation.isPending}
                  preferredNavigation={driver?.preferredNavigation || "google"}
                />
              ))
            ) : (
              <div className="text-center py-8">
                <Car className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Brak aktywnych przejazdów</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-4 space-y-3">
            {completedRides.length > 0 ? (
              completedRides.slice(0, 10).map((ride) => (
                <RideCard key={ride.id} ride={ride} driverId={driverId} />
              ))
            ) : (
              <div className="text-center py-8">
                <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Brak zakończonych przejazdów</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="payments" className="mt-4">
            <DriverPaymentSection driverId={driverId} />
          </TabsContent>

          <TabsContent value="referral" className="mt-4">
            <DriverReferralSection driverId={driverId} />
          </TabsContent>

          <TabsContent value="profile" className="mt-4 space-y-4">
            <DriverProfileSection 
                driverId={driverId} 
                onShowSubscription={() => setShowSubscription(true)} 
                onGoToPayments={() => setActiveTab("payments")}
              />
            <div className="flex justify-center mt-4">
              <Button
                variant="outline"
                onClick={() => navigate("/driver/guide")}
                data-testid="button-driver-guide"
                className="gap-2"
              >
                <BookOpen className="w-4 h-4" />
                Przewodnik kierowcy
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="messages" className="mt-4">
            <SystemMessagesTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function DriverPaymentSection({ driverId }: { driverId: string }) {
  const { toast } = useToast();
  const [transactionId, setTransactionId] = useState("");
  const [selectedMethod, setSelectedMethod] = useState<"bank" | "blik">("bank");
  const [submitting, setSubmitting] = useState(false);

  const { data: paymentSettings } = useQuery<{
    bankAccount: string;
    blikPhone: string;
    recipientName: string;
  }>({
    queryKey: ["/api/payment-settings"],
  });

  // Fetch driver subscription info (includes assigned plan from admin)
  const { data: subscriptionInfo, refetch: refetchSubscription } = useQuery<{
    status: string;
    subscriptionDiscount: number;
    assignedPlan: {
      id: string;
      name: string;
      durationDays: number;
      price: number;
      description: string | null;
    } | null;
    assignedPlanId: string | null;
    priceToPay: number | null;
  }>({
    queryKey: ["/api/drivers", driverId, "subscription"],
    queryFn: async () => {
      const res = await fetch(`/api/drivers/${driverId}/subscription`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  // Use assigned plan from admin
  const assignedPlan = subscriptionInfo?.assignedPlan || null;
  
  const priceToPayInCents = assignedPlan ? assignedPlan.price : 0;

  const { data: myPaymentRequests, refetch: refetchRequests } = useQuery<Array<{
    id: string;
    amount: number;
    planName: string;
    paymentMethod: string;
    status: string;
    createdAt: string;
  }>>({
    queryKey: ["/api/drivers", driverId, "payment-requests"],
    queryFn: async () => {
      const res = await fetch(`/api/drivers/${driverId}/payment-requests`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const handleSubmitPayment = async () => {
    if (!assignedPlan) {
      toast({ title: "Błąd", description: "Brak przydzielonego planu subskrypcji", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      await apiRequest("POST", "/api/payment-requests", {
        driverId,
        amount: priceToPayInCents,
        planId: assignedPlan.id,
        planName: assignedPlan.name,
        durationDays: assignedPlan.durationDays,
        paymentMethod: selectedMethod,
        transactionId: transactionId || undefined,
      });
      toast({ title: "Zgłoszenie wysłane", description: "Czekaj na potwierdzenie płatności przez administratora" });
      setTransactionId("");
      refetchRequests();
    } catch (error) {
      toast({ title: "Błąd", description: "Nie udało się zgłosić płatności", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const formatIBAN = (iban: string) => {
    return iban.replace(/(.{4})/g, "$1 ").trim();
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Skopiowano", description: `${label} skopiowano do schowka` });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Płatność za subskrypcję
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {assignedPlan ? (
            <>
              {/* Assigned plan display */}
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="text-sm text-muted-foreground mb-2">Twój przydzielony abonament:</div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Plan:</span>
                  <span className="font-medium">{assignedPlan.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Okres:</span>
                  <span className="font-medium">{assignedPlan.durationDays} dni</span>
                </div>
                {assignedPlan.description && (
                  <div className="text-sm text-muted-foreground pt-2 border-t">
                    {assignedPlan.description}
                  </div>
                )}
                <div className="border-t pt-2 mt-2 flex justify-between text-lg font-bold">
                  <span>Do zapłaty:</span>
                  <span className="text-primary" data-testid="text-price-to-pay">{(priceToPayInCents / 100).toFixed(2)} PLN</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="font-medium">Wybierz metodę płatności:</div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={selectedMethod === "bank" ? "default" : "outline"}
                    onClick={() => setSelectedMethod("bank")}
                    className="h-auto py-3"
                    data-testid="button-payment-bank"
                  >
                    <div className="text-center">
                      <div className="font-medium">Przelew bankowy</div>
                    </div>
                  </Button>
                  <Button
                    variant={selectedMethod === "blik" ? "default" : "outline"}
                    onClick={() => setSelectedMethod("blik")}
                    className="h-auto py-3"
                    disabled={!paymentSettings?.blikPhone}
                    data-testid="button-payment-blik"
                  >
                    <div className="text-center">
                      <div className="font-medium">BLIK na telefon</div>
                    </div>
                  </Button>
                </div>

                {selectedMethod === "bank" && paymentSettings?.bankAccount && (
                  <div className="bg-muted p-4 rounded-lg space-y-3">
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Numer konta:</div>
                      <div 
                        className="font-mono text-sm bg-background p-2 rounded cursor-pointer hover:bg-accent"
                        onClick={() => copyToClipboard(paymentSettings.bankAccount, "Numer konta")}
                        data-testid="text-bank-account"
                      >
                        {formatIBAN(paymentSettings.bankAccount)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">Kliknij, aby skopiować</div>
                    </div>
                    {paymentSettings.recipientName && (
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">Odbiorca:</div>
                        <div className="font-medium" data-testid="text-recipient">{paymentSettings.recipientName}</div>
                      </div>
                    )}
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Tytuł przelewu:</div>
                      <div 
                        className="font-mono text-sm bg-background p-2 rounded cursor-pointer hover:bg-accent"
                        onClick={() => copyToClipboard(`Subskrypcja TaxiQ - ${driverId}`, "Tytuł przelewu")}
                      >
                        Subskrypcja TaxiQ - {driverId.slice(0, 8)}
                      </div>
                    </div>
                  </div>
                )}

                {selectedMethod === "blik" && paymentSettings?.blikPhone && (
                  <div className="bg-muted p-4 rounded-lg space-y-3">
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Numer telefonu do BLIK:</div>
                      <div 
                        className="font-mono text-lg bg-background p-2 rounded cursor-pointer hover:bg-accent text-center"
                        onClick={() => copyToClipboard(paymentSettings.blikPhone, "Numer telefonu")}
                        data-testid="text-blik-phone"
                      >
                        {paymentSettings.blikPhone}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 text-center">Kliknij, aby skopiować</div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      1. Otwórz aplikację bankową<br/>
                      2. Wybierz BLIK → Przelew na telefon<br/>
                      3. Wpisz powyższy numer i kwotę {(priceToPayInCents / 100).toFixed(2)} PLN
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-sm text-muted-foreground">Numer transakcji (opcjonalnie):</label>
                  <Input
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="Np. numer operacji z banku"
                    data-testid="input-transaction-id"
                  />
                </div>

                <Button 
                  className="w-full" 
                  onClick={handleSubmitPayment}
                  disabled={submitting || (!paymentSettings?.bankAccount && !paymentSettings?.blikPhone)}
                  data-testid="button-submit-payment"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Wysyłanie...
                    </>
                  ) : (
                    "Zgłoś płatność"
                  )}
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center text-muted-foreground py-8 space-y-2">
              <div className="text-lg font-medium">Brak przydzielonego planu</div>
              <div className="text-sm">Administrator musi przydzielić Ci plan abonamentowy zanim będziesz mógł opłacić subskrypcję.</div>
            </div>
          )}
        </CardContent>
      </Card>

      {myPaymentRequests && myPaymentRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Historia zgłoszeń</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {myPaymentRequests.map((req) => (
                <div key={req.id} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <div>
                    <div className="font-medium">{req.planName || "Subskrypcja"}</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(req.createdAt).toLocaleDateString("pl-PL")} • {req.paymentMethod === "bank" ? "Przelew" : "BLIK"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{(req.amount / 100).toFixed(2)} PLN</div>
                    <Badge variant={
                      req.status === "approved" ? "default" : 
                      req.status === "rejected" ? "destructive" : 
                      "secondary"
                    }>
                      {req.status === "approved" ? "Zatwierdzone" : 
                       req.status === "rejected" ? "Odrzucone" : 
                       "Oczekuje"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function DriverProfileSection({ driverId, onShowSubscription, onGoToPayments }: { driverId: string; onShowSubscription: () => void; onGoToPayments: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  const [phoneCodeSent, setPhoneCodeSent] = useState(false);
  const [phoneCode, setPhoneCode] = useState("");
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [emailCode, setEmailCode] = useState("");
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    languages: [] as string[],
    taxiLicenseNumber: "",
    licenseIssuingAuthority: "",
  });

  const { data: profile, isLoading, refetch } = useQuery({
    queryKey: ["/api/drivers", driverId, "profile"],
    queryFn: async () => {
      const res = await fetch(`/api/drivers/${driverId}/profile`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch profile");
      return res.json();
    },
  });

  // Check if email verification is enabled
  const { data: emailVerificationSettings } = useQuery<{ enabled: boolean }>({
    queryKey: ["/api/settings/email-verification-enabled"],
    queryFn: async () => {
      const res = await fetch("/api/settings/email-verification-enabled", { credentials: "include" });
      return res.json();
    },
  });
  const isEmailVerificationEnabled = emailVerificationSettings?.enabled ?? false;

  // Subscription info query
  const { data: subscriptionInfo, isLoading: loadingSubscription, refetch: refetchSubscription } = useQuery<{
    status: string;
    trialEndsAt: string | null;
    subscriptionEndsAt: string | null;
    subscriptionDiscount: number;
    assignedPlan: {
      id: string;
      name: string;
      durationDays: number;
      price: number;
      description: string | null;
    } | null;
    priceToPay: number | null;
  }>({
    queryKey: ["/api/drivers", driverId, "subscription"],
    queryFn: async () => {
      const res = await fetch(`/api/drivers/${driverId}/subscription`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch subscription");
      return res.json();
    },
    refetchInterval: 5000,
    staleTime: 2000,
  });

  const sendEmailVerificationMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/drivers/${driverId}/send-email-verification`);
    },
    onSuccess: () => {
      setEmailCodeSent(true);
      toast({
        title: "Kod wysłany",
        description: "Sprawdź swoją skrzynkę email i wpisz 6-cyfrowy kod.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Błąd",
        description: error?.message || "Nie udało się wysłać kodu weryfikacyjnego.",
        variant: "destructive",
      });
    },
  });

  const verifyEmailCodeMutation = useMutation({
    mutationFn: async (code: string) => {
      await apiRequest("POST", `/api/drivers/${driverId}/verify-email-code`, { code });
    },
    onSuccess: () => {
      setEmailCodeSent(false);
      setEmailCode("");
      toast({
        title: "Email zweryfikowany",
        description: "Twój adres email został pomyślnie zweryfikowany.",
      });
      refetch();
    },
    onError: () => {
      toast({
        title: "Błąd",
        description: "Nieprawidłowy kod weryfikacyjny. Spróbuj ponownie.",
        variant: "destructive",
      });
    },
  });

  const sendPhoneVerificationMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/drivers/${driverId}/send-phone-verification`);
    },
    onSuccess: () => {
      setPhoneCodeSent(true);
      toast({
        title: "SMS wysłany",
        description: "Wpisz 6-cyfrowy kod który otrzymałeś na telefon.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Błąd",
        description: error?.message || "Nie udało się wysłać SMS. Spróbuj później.",
        variant: "destructive",
      });
    },
  });

  const verifyPhoneCodeMutation = useMutation({
    mutationFn: async (code: string) => {
      await apiRequest("POST", `/api/drivers/${driverId}/verify-phone-code`, { code });
    },
    onSuccess: () => {
      setPhoneCodeSent(false);
      setPhoneCode("");
      toast({
        title: "Telefon zweryfikowany",
        description: "Twój numer telefonu został pomyślnie zweryfikowany.",
      });
      refetch();
    },
    onError: () => {
      toast({
        title: "Błąd",
        description: "Nieprawidłowy kod weryfikacyjny. Spróbuj ponownie.",
        variant: "destructive",
      });
    },
  });
  
  const acceptTermsMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/drivers/${driverId}/accept-terms`);
    },
    onSuccess: () => {
      toast({
        title: "Regulamin zaakceptowany",
        description: "Dziękujemy za akceptację regulaminu.",
      });
      setShowTermsDialog(false);
      refetch();
    },
    onError: () => {
      toast({
        title: "Błąd",
        description: "Nie udało się zapisać akceptacji regulaminu.",
        variant: "destructive",
      });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof editForm) => {
      const res = await apiRequest("PATCH", `/api/drivers/${driverId}/profile`, data);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Profil zaktualizowany",
        description: data.phoneVerificationReset || data.emailVerificationReset 
          ? "Dane zostały zmienione. Wymagana ponowna weryfikacja zmienionych pól."
          : "Dane zostały zaktualizowane.",
      });
      setShowEditDialog(false);
      refetch();
      queryClient.invalidateQueries({ queryKey: ["/api/drivers", driverId, "profile"] });
    },
    onError: () => {
      toast({
        title: "Błąd",
        description: "Nie udało się zaktualizować profilu.",
        variant: "destructive",
      });
    },
  });

  const openEditDialog = () => {
    setEditForm({
      name: profile?.name || "",
      firstName: profile?.firstName || "",
      lastName: profile?.lastName || "",
      phone: profile?.phone || "",
      email: profile?.email || "",
      languages: profile?.languages || [],
      taxiLicenseNumber: profile?.taxiLicenseNumber || "",
      licenseIssuingAuthority: profile?.licenseIssuingAuthority || "",
    });
    setShowEditDialog(true);
  };

  const handleSaveProfile = () => {
    updateProfileMutation.mutate(editForm);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("photo", file);

    try {
      const res = await fetch(`/api/drivers/${driverId}/photo`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!res.ok) throw new Error("Upload failed");
      
      toast({
        title: "Zdjęcie przesłane",
        description: "Twoje zdjęcie profilowe zostało zaktualizowane",
      });
      refetch();
    } catch (error) {
      toast({
        title: "Błąd",
        description: "Nie udało się przesłać zdjęcia",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const { data: vehicles = [], refetch: refetchVehicles } = useQuery<any[]>({
    queryKey: ["/api/drivers", driverId, "vehicles"],
    queryFn: async () => {
      const res = await fetch(`/api/drivers/${driverId}/vehicles`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const [showVehicleDialog, setShowVehicleDialog] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<any>(null);
  const [vehicleForm, setVehicleForm] = useState({ vehiclePlate: "", vehicleBrand: "", vehicleModel: "", vehicleColor: "", vehicleYear: "" });

  const resetVehicleForm = () => {
    setVehicleForm({ vehiclePlate: "", vehicleBrand: "", vehicleModel: "", vehicleColor: "", vehicleYear: "" });
    setEditingVehicle(null);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const hasPhoto = !!profile?.photoUrl;
  const hasIdCard = !!profile?.idCardImageUrl;
  const hasLicenseNumber = !!profile?.taxiLicenseNumber;
  const hasVehicle = !!profile?.vehiclePlate || vehicles.length > 0;
  const isVerified = profile?.verificationStatus === "approved";
  const isPendingVerification = profile?.verificationStatus === "pending_verification" || profile?.verificationStatus === "pending_admin_review";
  const allDone = hasPhoto && hasIdCard && hasLicenseNumber && hasVehicle && isVerified;

  return (
    <div className="space-y-4">
      {!allDone && (
        <Card className="glow-border border-yellow-500/30" data-testid="checklist-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Uzupełnij dane aby przyjmować zlecenia
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              {hasLicenseNumber ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" /> : <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
              <span className={hasLicenseNumber ? "text-muted-foreground" : ""}>Uzupełnij numer ID identyfikatora taxi</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              {hasVehicle ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" /> : <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
              <span className={hasVehicle ? "text-muted-foreground" : ""}>Uzupełnij dane pojazdu</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              {hasPhoto ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" /> : <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
              <span className={hasPhoto ? "text-muted-foreground" : ""}>Prześlij zdjęcie profilowe</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              {hasIdCard ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" /> : <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
              <span className={hasIdCard ? "text-muted-foreground" : ""}>Prześlij zdjęcie identyfikatora taxi</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              {isVerified ? (
                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
              ) : isPendingVerification ? (
                <Clock className="w-4 h-4 text-yellow-500 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-red-500 shrink-0" />
              )}
              <span className={isVerified ? "text-muted-foreground" : ""}>
                {isVerified ? "Weryfikacja zatwierdzona" : isPendingVerification ? "Oczekuje na weryfikację administratora" : "Weryfikacja administratora"}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="glow-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" />
            Zdjęcie profilowe
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <div className="relative">
            {profile?.photoUrl ? (
              <img 
                src={profile.photoUrl} 
                alt="Zdjęcie profilowe"
                className="w-32 h-32 rounded-full object-cover border-4 border-primary"
                data-testid="img-driver-photo"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center border-4 border-dashed border-muted-foreground">
                <User className="w-12 h-12 text-muted-foreground" />
              </div>
            )}
            {profile?.photoVerifiedAt && (
              <div className="absolute -bottom-1 -right-1">
                <Badge className="bg-green-600">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Zweryfikowane
                </Badge>
              </div>
            )}
          </div>
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={handlePhotoUpload}
            accept="image/*"
            className="hidden"
            data-testid="input-photo-upload"
          />
          <Button 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            data-testid="button-upload-photo"
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Camera className="w-4 h-4 mr-2" />
            )}
            {profile?.photoUrl ? "Zmień zdjęcie" : "Dodaj zdjęcie"}
          </Button>
          
          <p className="text-xs text-muted-foreground text-center">
            Zdjęcie jest widoczne dla pasażerów. Po przesłaniu zostanie zweryfikowane przez administratora.
          </p>
        </CardContent>
      </Card>

      <IdCardUploadSection driverId={driverId} currentStatus={profile?.verificationStatus} currentImageUrl={profile?.idCardImageUrl} />

      <Card className="glow-border" data-testid="navigation-preference-section">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Navigation className="w-5 h-5 text-primary" />
            Preferowana nawigacja
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              variant={profile?.preferredNavigation === "waze" ? "outline" : "default"}
              size="sm"
              className="flex-1"
              onClick={() => {
                if (profile?.preferredNavigation !== "google") {
                  apiRequest("PATCH", `/api/drivers/${driverId}/profile`, { preferredNavigation: "google" }).then(() => {
                    refetch();
                    queryClient.invalidateQueries({ queryKey: ["/api/drivers", driverId, "profile"] });
                    toast({ title: "Zapisano", description: "Nawigacja ustawiona na Google Maps" });
                  });
                }
              }}
              data-testid="button-nav-google"
            >
              <MapPin className="w-4 h-4 mr-2" />
              Google Maps
            </Button>
            <Button
              variant={profile?.preferredNavigation === "waze" ? "default" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => {
                if (profile?.preferredNavigation !== "waze") {
                  apiRequest("PATCH", `/api/drivers/${driverId}/profile`, { preferredNavigation: "waze" }).then(() => {
                    refetch();
                    queryClient.invalidateQueries({ queryKey: ["/api/drivers", driverId, "profile"] });
                    toast({ title: "Zapisano", description: "Nawigacja ustawiona na Waze" });
                  });
                }
              }}
              data-testid="button-nav-waze"
            >
              <Navigation className="w-4 h-4 mr-2" />
              Waze
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="glow-border" data-testid="vehicles-section">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Car className="w-5 h-5 text-primary" />
              Moje pojazdy
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { resetVehicleForm(); setShowVehicleDialog(true); }}
              data-testid="button-add-vehicle"
            >
              <Plus className="h-4 w-4 mr-1" />
              Dodaj
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {vehicles.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4" data-testid="text-no-vehicles">
              Brak pojazdów. Dodaj swój pierwszy pojazd.
            </p>
          ) : (
            <div className="space-y-3">
              {vehicles.map((v: any) => (
                <div
                  key={v.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${v.isActive ? "border-primary bg-primary/5" : "border-border"}`}
                  data-testid={`vehicle-card-${v.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{v.vehiclePlate}</span>
                      {v.isActive && <Badge className="bg-green-600 text-xs" data-testid={`badge-active-${v.id}`}>Aktywny</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {[v.vehicleBrand, v.vehicleModel, v.vehicleColor, v.vehicleYear].filter(Boolean).join(" · ") || "Brak szczegółów"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {!v.isActive && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            await apiRequest("POST", `/api/drivers/${driverId}/vehicles/${v.id}/activate`);
                            refetchVehicles();
                            refetch();
                          } catch {
                          }
                        }}
                        data-testid={`button-activate-${v.id}`}
                      >
                        <Power className="h-3 w-3 mr-1" />
                        Aktywuj
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingVehicle(v);
                        setVehicleForm({
                          vehiclePlate: v.vehiclePlate || "",
                          vehicleBrand: v.vehicleBrand || "",
                          vehicleModel: v.vehicleModel || "",
                          vehicleColor: v.vehicleColor || "",
                          vehicleYear: v.vehicleYear || "",
                        });
                        setShowVehicleDialog(true);
                      }}
                      data-testid={`button-edit-vehicle-${v.id}`}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    {!v.isActive && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={async () => {
                          try {
                            await apiRequest("DELETE", `/api/drivers/${driverId}/vehicles/${v.id}`);
                            refetchVehicles();
                            toast({ title: "Pojazd usunięty" });
                          } catch {
                            toast({ title: "Błąd", description: "Nie udało się usunąć pojazdu", variant: "destructive" });
                          }
                        }}
                        data-testid={`button-delete-vehicle-${v.id}`}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showVehicleDialog} onOpenChange={(open) => { if (!open) { setShowVehicleDialog(false); resetVehicleForm(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingVehicle ? "Edytuj pojazd" : "Dodaj pojazd"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Numer rejestracyjny *</Label>
              <Input
                value={vehicleForm.vehiclePlate}
                onChange={(e) => setVehicleForm({ ...vehicleForm, vehiclePlate: e.target.value })}
                placeholder="PO 12345"
                data-testid="input-vehicle-plate"
              />
            </div>
            <div>
              <Label>Marka</Label>
              <Input
                value={vehicleForm.vehicleBrand}
                onChange={(e) => setVehicleForm({ ...vehicleForm, vehicleBrand: e.target.value })}
                placeholder="Toyota"
                data-testid="input-vehicle-brand"
              />
            </div>
            <div>
              <Label>Model</Label>
              <Input
                value={vehicleForm.vehicleModel}
                onChange={(e) => setVehicleForm({ ...vehicleForm, vehicleModel: e.target.value })}
                placeholder="Corolla"
                data-testid="input-vehicle-model"
              />
            </div>
            <div>
              <Label>Kolor</Label>
              <Select value={vehicleForm.vehicleColor} onValueChange={(val) => setVehicleForm({ ...vehicleForm, vehicleColor: val })}>
                <SelectTrigger data-testid="select-vehicle-color-dialog">
                  <SelectValue placeholder="Wybierz kolor" />
                </SelectTrigger>
                <SelectContent>
                  {["Biały", "Czarny", "Srebrny", "Szary", "Czerwony", "Niebieski", "Granatowy", "Zielony", "Żółty", "Brązowy", "Beżowy", "Bordowy", "Pomarańczowy", "Złoty", "Inny"].map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Rocznik</Label>
              <Input
                value={vehicleForm.vehicleYear}
                onChange={(e) => setVehicleForm({ ...vehicleForm, vehicleYear: e.target.value })}
                placeholder="2020"
                data-testid="input-vehicle-year"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => { setShowVehicleDialog(false); resetVehicleForm(); }}>Anuluj</Button>
            <Button
              onClick={async () => {
                if (!vehicleForm.vehiclePlate.trim()) {
                  toast({ title: "Podaj numer rejestracyjny", variant: "destructive" });
                  return;
                }
                try {
                  if (editingVehicle) {
                    await apiRequest("PATCH", `/api/drivers/${driverId}/vehicles/${editingVehicle.id}`, vehicleForm);
                    toast({ title: "Pojazd zaktualizowany" });
                  } else {
                    await apiRequest("POST", `/api/drivers/${driverId}/vehicles`, vehicleForm);
                    toast({ title: "Pojazd dodany" });
                  }
                  refetchVehicles();
                  refetch();
                  setShowVehicleDialog(false);
                  resetVehicleForm();
                } catch {
                  toast({ title: "Błąd", description: "Nie udało się zapisać pojazdu", variant: "destructive" });
                }
              }}
              data-testid="button-save-vehicle"
            >
              {editingVehicle ? "Zapisz" : "Dodaj pojazd"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card className="glow-border mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="w-5 h-5 text-primary" />
            Status konta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(() => {
            const checks = [
              { done: !!(profile?.taxiLicenseNumber && profile?.licenseIssuingAuthority), label: "Profil uzupełniony (numer ID, gmina)" },
              { done: !!profile?.photoUrl, label: "Zdjęcie profilowe przesłane" },
              { done: !!profile?.idCardImageUrl, label: "Zdjęcie identyfikatora taxi przesłane" },
              { done: profile?.verificationStatus === "approved", label: "Weryfikacja zatwierdzona przez admina" },
              { done: vehicles.some((v: any) => v.isActive), label: "Pojazd dodany i aktywny" },
            ];
            const allDone = checks.every(c => c.done);
            return (
              <>
                {checks.map((check, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm" data-testid={`status-check-${i}`}>
                    {check.done ? (
                      <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    )}
                    <span className={check.done ? "text-green-400" : "text-muted-foreground"}>{check.label}</span>
                  </div>
                ))}
                {!allDone && (
                  <p className="text-xs text-yellow-500 mt-2 pt-2 border-t border-border">
                    Uzupełnij brakujące elementy, aby móc włączyć tryb Online i przyjmować zlecenia.
                  </p>
                )}
                {allDone && (
                  <p className="text-xs text-green-400 mt-2 pt-2 border-t border-border">
                    Wszystko gotowe! Możesz włączyć tryb Online.
                  </p>
                )}
              </>
            );
          })()}
        </CardContent>
      </Card>

      <Card className="glow-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Dane kierowcy
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={openEditDialog}
              data-testid="button-edit-driver-profile"
            >
              <Pencil className="h-4 w-4 mr-2" />
              Edytuj
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Imię:</span>
            <span className={`font-medium ${profile?.firstName ? "text-green-400" : ""}`}>{profile?.firstName || "-"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Nazwisko:</span>
            <span className={`font-medium ${profile?.lastName ? "text-green-400" : ""}`}>{profile?.lastName || "-"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Email:</span>
            <span className={`font-medium ${profile?.email ? "text-green-400" : ""}`}>{profile?.email || "-"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Telefon:</span>
            <span className={`font-medium ${profile?.phone ? "text-green-400" : ""}`}>{profile?.phone || "-"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Nr ID identyfikatora:</span>
            <span className={`font-medium ${profile?.taxiLicenseNumber ? "text-green-400" : ""}`}>{profile?.taxiLicenseNumber && profile?.licenseIssuingAuthority ? `${profile.taxiLicenseNumber}/${profile.licenseIssuingAuthority}` : profile?.taxiLicenseNumber || "-"}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Języki:</span>
            <div className="flex gap-1">
              {profile?.languages?.length > 0 ? (
                profile.languages.map((lang: string) => (
                  <Badge key={lang} variant="outline">{lang}</Badge>
                ))
              ) : (
                <span className="text-muted-foreground">-</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Profile Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edytuj dane profilu</DialogTitle>
            <DialogDescription>
              Zmień swoje dane kontaktowe. Po zmianie telefonu lub emaila wymagana będzie ponowna weryfikacja.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Imię</Label>
              <Input
                value={editForm.firstName}
                onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                placeholder="Imię"
                data-testid="input-driver-first-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Nazwisko</Label>
              <Input
                value={editForm.lastName}
                onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                placeholder="Nazwisko"
                data-testid="input-driver-last-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                placeholder="email@example.com"
                data-testid="input-driver-email"
              />
              <p className="text-xs text-muted-foreground">
                Zmiana emaila resetuje weryfikację - będziesz musiał zweryfikować nowy adres.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Numer ID z identyfikatora taxi</Label>
              <Input
                value={editForm.taxiLicenseNumber}
                onChange={(e) => setEditForm({ ...editForm, taxiLicenseNumber: e.target.value })}
                placeholder="np. 09039"
                data-testid="input-driver-taxi-id"
              />
              <p className="text-xs text-muted-foreground">
                Ten numer jest Twoim kodem polecającym.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Gmina wydania identyfikatora taxi</Label>
              <MunicipalitySearch
                value={editForm.licenseIssuingAuthority}
                onChange={(val) => setEditForm({ ...editForm, licenseIssuingAuthority: val })}
              />
            </div>
            <div className="space-y-2">
              <Label>Języki</Label>
              <div className="flex flex-wrap gap-2">
                {[
                  { code: "PL", label: "Polski" },
                  { code: "EN", label: "Angielski" },
                  { code: "DE", label: "Niemiecki" },
                  { code: "UK", label: "Ukraiński" },
                  { code: "RU", label: "Rosyjski" },
                  { code: "FR", label: "Francuski" },
                  { code: "ES", label: "Hiszpański" },
                ].map(({ code, label }) => (
                  <button
                    key={code}
                    type="button"
                    data-testid={`toggle-lang-${code}`}
                    className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                      editForm.languages.includes(code)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-border hover:border-primary/50"
                    }`}
                    onClick={() => {
                      const langs = editForm.languages.includes(code)
                        ? editForm.languages.filter((l: string) => l !== code)
                        : [...editForm.languages, code];
                      setEditForm({ ...editForm, languages: langs });
                    }}
                  >
                    {code} - {label}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Zmiana telefonu resetuje weryfikację - będziesz musiał zweryfikować nowy numer.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
              Anuluj
            </Button>
            <Button 
              onClick={handleSaveProfile} 
              disabled={updateProfileMutation.isPending}
              data-testid="button-save-driver-profile"
            >
              {updateProfileMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Zapisz
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="glow-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            Status weryfikacji
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Alert o brakujących weryfikacjach */}
          {(!profile?.emailVerifiedAt && isEmailVerificationEnabled) && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 mb-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-destructive">Wymagana weryfikacja</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Aby przyjmować zamówienia musisz zweryfikować:
                  </p>
                  <ul className="text-sm text-muted-foreground mt-1 list-disc list-inside">
                    {!profile?.emailVerifiedAt && isEmailVerificationEnabled && <li>Adres email</li>}
                  </ul>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex justify-between items-center flex-wrap gap-2">
            <span className="text-muted-foreground">Email:</span>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm">{profile?.email || "-"}</span>
              {profile?.emailVerifiedAt ? (
                <Badge className="bg-green-600">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Zweryfikowany
                </Badge>
              ) : !isEmailVerificationEnabled ? (
                <Badge variant="outline" className="text-muted-foreground">
                  Weryfikacja wyłączona
                </Badge>
              ) : emailCodeSent ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <Input
                    type="text"
                    placeholder="Wpisz 6-cyfrowy kod"
                    value={emailCode}
                    onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="w-32 h-8 text-center"
                    maxLength={6}
                    data-testid="input-email-code"
                  />
                  <Button
                    size="sm"
                    onClick={() => verifyEmailCodeMutation.mutate(emailCode)}
                    disabled={emailCode.length !== 6 || verifyEmailCodeMutation.isPending}
                    data-testid="button-verify-email-code"
                  >
                    {verifyEmailCodeMutation.isPending ? (
                      <Loader2 className="w-3 h-3 animate-spin mr-1" />
                    ) : (
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                    )}
                    Potwierdź
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => sendEmailVerificationMutation.mutate()}
                    disabled={sendEmailVerificationMutation.isPending}
                    data-testid="button-resend-email-code"
                  >
                    Wyślij ponownie
                  </Button>
                </div>
              ) : (
                <>
                  <Badge variant="outline" className="text-yellow-500 border-yellow-500">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Niezweryfikowany
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => sendEmailVerificationMutation.mutate()}
                    disabled={sendEmailVerificationMutation.isPending || !profile?.email}
                    data-testid="button-verify-email"
                  >
                    {sendEmailVerificationMutation.isPending ? (
                      <Loader2 className="w-3 h-3 animate-spin mr-1" />
                    ) : (
                      <Mail className="w-3 h-3 mr-1" />
                    )}
                    Wyślij kod
                  </Button>
                </>
              )}
            </div>
          </div>
          
          <div className="flex justify-between items-center flex-wrap gap-2">
            <span className="text-muted-foreground">Telefon:</span>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm">{profile?.phone || "-"}</span>
              <Badge className="bg-green-600">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Zweryfikowany
              </Badge>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Zdjęcie:</span>
            {profile?.photoVerifiedAt ? (
              <Badge className="bg-green-600">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Zweryfikowane
              </Badge>
            ) : profile?.photoUrl ? (
              <Badge variant="outline" className="text-yellow-500 border-yellow-500">
                <Clock className="w-3 h-3 mr-1" />
                Oczekuje na weryfikację
              </Badge>
            ) : (
              <Badge variant="outline" className="text-red-500 border-red-500">
                <XCircle className="w-3 h-3 mr-1" />
                Brak zdjęcia
              </Badge>
            )}
          </div>
          
          <div className="flex justify-between items-center flex-wrap gap-2">
            <span className="text-muted-foreground">Regulamin:</span>
            <div className="flex items-center gap-2 flex-wrap">
              {profile?.termsAcceptedAt ? (
                <Badge className="bg-green-600">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Zaakceptowany {new Date(profile.termsAcceptedAt).toLocaleDateString('pl-PL')}
                </Badge>
              ) : (
                <>
                  <Badge variant="outline" className="text-red-500 border-red-500">
                    <XCircle className="w-3 h-3 mr-1" />
                    Niezaakceptowany
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowTermsDialog(true)}
                    data-testid="button-show-terms"
                  >
                    Przeczytaj i zaakceptuj
                  </Button>
                </>
              )}
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground pt-2 border-t">
            Aby przyjmować zlecenia, wymagane jest zweryfikowane zdjęcie przez administratora.
          </p>
        </CardContent>
      </Card>
      
      {/* Karta abonamentu */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Abonament
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loadingSubscription ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant={subscriptionInfo?.status === "active" ? "default" : subscriptionInfo?.status === "trial" ? "secondary" : "destructive"}>
                  {subscriptionInfo?.status === "active" ? "Aktywny" : 
                   subscriptionInfo?.status === "trial" ? "Okres próbny" : 
                   subscriptionInfo?.status === "expired" ? "Wygasły" : "Brak"}
                </Badge>
              </div>
          
          {subscriptionInfo?.assignedPlan ? (
            <>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Plan:</span>
                <span className="font-medium">{subscriptionInfo.assignedPlan.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Okres:</span>
                <span className="font-medium">{subscriptionInfo.assignedPlan.durationDays} dni</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Cena:</span>
                <span className="font-medium">{(subscriptionInfo.assignedPlan.price / 100).toFixed(2)} PLN</span>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-2">
              Brak przydzielonego planu abonamentowego
            </p>
          )}
          
          {subscriptionInfo?.trialEndsAt && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Okres próbny do:</span>
              <span className="font-medium">{new Date(subscriptionInfo.trialEndsAt).toLocaleDateString('pl-PL')}</span>
            </div>
          )}
          
          {subscriptionInfo?.subscriptionEndsAt && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Abonament ważny do:</span>
              <span className="font-medium">{new Date(subscriptionInfo.subscriptionEndsAt).toLocaleDateString('pl-PL')}</span>
            </div>
          )}
          
          <div className="flex gap-2 pt-2">
            <Button 
              className="flex-1" 
              onClick={onShowSubscription}
              data-testid="button-manage-subscription"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Zarządzaj
            </Button>
            <Button 
              variant="outline"
              className="flex-1"
              onClick={onGoToPayments}
              data-testid="button-pay-subscription-profile"
            >
              <Banknote className="h-4 w-4 mr-2" />
              Opłać
            </Button>
          </div>
            </>
          )}
        </CardContent>
      </Card>
      
      {/* Dialog regulaminu */}
      <Dialog open={showTermsDialog} onOpenChange={setShowTermsDialog}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-primary">Regulamin TaxiQ</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <section>
              <h3 className="font-semibold text-primary mb-2">1. Postanowienia ogólne</h3>
              <p className="text-muted-foreground">
                Niniejszy regulamin określa zasady korzystania z platformy TaxiQ, 
                świadczącej usługi pośrednictwa w zamawianiu przewozu osób.
              </p>
            </section>
            
            <section>
              <h3 className="font-semibold text-primary mb-2">2. Definicje</h3>
              <ul className="text-muted-foreground space-y-1 list-disc pl-4">
                <li><strong>Platforma</strong> - aplikacja mobilna i strona internetowa TaxiQ</li>
                <li><strong>Pasażer</strong> - osoba zamawiająca przejazd</li>
                <li><strong>Kierowca</strong> - licencjonowany przewoźnik wykonujący przejazd</li>
              </ul>
            </section>
            
            <section>
              <h3 className="font-semibold text-primary mb-2">3. Zasady korzystania</h3>
              <p className="text-muted-foreground">
                Użytkownik zobowiązuje się do podania prawdziwych danych osobowych 
                oraz korzystania z platformy zgodnie z jej przeznaczeniem.
              </p>
            </section>
            
            <section>
              <h3 className="font-semibold text-primary mb-2">4. Płatności</h3>
              <p className="text-muted-foreground">
                Rozliczenia za przejazdy odbywają się bezpośrednio między pasażerem a kierowcą.
              </p>
            </section>
            
            <section>
              <h3 className="font-semibold text-primary mb-2">5. Ochrona danych</h3>
              <p className="text-muted-foreground">
                Dane osobowe użytkowników są przetwarzane zgodnie z RODO.
              </p>
            </section>
            
            <p className="text-xs text-muted-foreground pt-2 border-t">
              Ostatnia aktualizacja: Styczeń 2026
            </p>
          </div>
          
          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowTermsDialog(false)}
              className="flex-1"
            >
              Anuluj
            </Button>
            <Button
              onClick={() => acceptTermsMutation.mutate()}
              disabled={acceptTermsMutation.isPending}
              className="flex-1"
              data-testid="button-accept-terms"
            >
              {acceptTermsMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              )}
              Akceptuję regulamin
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DriverReferralSection({ driverId }: { driverId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showQr, setShowQr] = useState(false);
  const [editingBank, setEditingBank] = useState(false);
  const [bankNumber, setBankNumber] = useState("");
  const [bankHolder, setBankHolder] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [sendingSms, setSendingSms] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  const { data: referralStats, isLoading, error } = useQuery<{
    referralCode: string;
    referralPoints: number;
    referredDriversCount: number;
    referredPassengersCount: number;
    referrals: Array<{
      id: string;
      type: string;
      status: string;
      rewardDescription: string | null;
      createdAt: string;
      referredDriverName?: string;
      referredUserName?: string;
    }>;
  }>({
    queryKey: ["/api/driver/referrals"],
    queryFn: async () => {
      const res = await fetch(`/api/driver/referrals`, { credentials: "include" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.subscriptionRequired) {
          throw { subscriptionRequired: true, message: data.message };
        }
        throw new Error("Failed");
      }
      return res.json();
    },
    retry: false,
  });

  const { data: bankData } = useQuery<{
    bankAccountNumber: string | null;
    bankAccountHolder: string | null;
  }>({
    queryKey: ["/api/driver/bank-account"],
    queryFn: async () => {
      const res = await fetch(`/api/driver/bank-account`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: payouts } = useQuery<Array<{
    id: string;
    amount: number;
    description: string | null;
    status: string;
    createdAt: string;
    paidAt: string | null;
  }>>({
    queryKey: ["/api/driver/referral-payouts"],
    queryFn: async () => {
      const res = await fetch(`/api/driver/referral-payouts`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const saveBankMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/driver/bank-account`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ bankAccountNumber: bankNumber, bankAccountHolder: bankHolder }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Błąd zapisu");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Zapisano", description: "Dane konta bankowego zaktualizowane" });
      queryClient.invalidateQueries({ queryKey: ["/api/driver/bank-account"] });
      setEditingBank(false);
    },
    onError: (err: Error) => {
      toast({ title: "Błąd", description: err.message, variant: "destructive" });
    },
  });

  const referralCode = referralStats?.referralCode || "";
  const referralLink = referralCode ? `${window.location.origin}/driver?tab=register&ref=${encodeURIComponent(referralCode)}` : "";

  const copyCode = () => {
    navigator.clipboard.writeText(referralCode);
    toast({ title: "Skopiowano!", description: "Kod polecający skopiowany do schowka" });
  };

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast({ title: "Skopiowano!", description: "Link polecający skopiowany do schowka" });
  };

  const downloadQr = () => {
    const canvas = qrRef.current?.querySelector("canvas");
    if (canvas) {
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `TaxiQ-${referralCode}.png`;
      a.click();
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Show subscription required message
  if (error && (error as any).subscriptionRequired) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-6 text-center space-y-3">
            <AlertTriangle className="w-12 h-12 mx-auto text-yellow-500" />
            <h3 className="text-lg font-semibold">Wymagana aktywna subskrypcja</h3>
            <p className="text-sm text-muted-foreground">
              Aby korzystać z systemu poleceń i zarabiać na poleceniach, musisz mieć aktywną subskrypcję.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Twój kod polecający
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-muted rounded-md px-4 py-3 font-mono text-lg text-center tracking-widest" data-testid="text-referral-code">
              {referralCode}
            </div>
            <Button size="icon" variant="outline" onClick={copyCode} data-testid="button-copy-code">
              <Copy className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={copyLink} className="flex-1" disabled={!referralCode} data-testid="button-copy-link">
              <Copy className="w-4 h-4 mr-2" />
              Kopiuj link
            </Button>
            <Button variant="outline" onClick={() => setShowQr(!showQr)} className="flex-1" disabled={!referralCode} data-testid="button-show-qr">
              <QrCode className="w-4 h-4 mr-2" />
              {showQr ? "Ukryj QR" : "Pokaż QR"}
            </Button>
          </div>

          {showQr && referralLink && (
            <div className="flex flex-col items-center gap-3">
              <div className="p-4 bg-white rounded-lg" ref={qrRef}>
                <QRCodeDisplay value={referralLink} size={200} />
                <p className="text-xs text-center text-gray-600 font-mono mt-2">{referralCode}</p>
              </div>
              <Button size="sm" variant="outline" onClick={downloadQr} data-testid="button-download-qr">
                <Download className="w-4 h-4 mr-2" />
                Pobierz QR
              </Button>
            </div>
          )}

          <div className="text-sm text-muted-foreground space-y-1">
            <p>Poleć TaxiQ innym kierowcom i pasażerom:</p>
            <p>&#8226; Za poleconego <strong>kierowcę</strong>: 25% prowizji od jego pierwszej subskrypcji</p>
            <p>&#8226; Za poleconego <strong>pasażera</strong>: 50 punktów po jego pierwszym przejeździe</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Phone className="w-5 h-5" />
            Zaproś pasażera przez SMS
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Wpisz numer telefonu osoby, którą chcesz zaprosić do TaxiQ. Otrzyma SMS z linkiem do rejestracji i Twoim kodem polecającym.
          </p>
          <div className="flex gap-2">
            <Input
              type="tel"
              placeholder="np. 500 600 700"
              value={invitePhone}
              onChange={(e) => setInvitePhone(e.target.value)}
              data-testid="input-invite-phone"
              className="flex-1"
            />
            <Button
              onClick={async () => {
                if (!invitePhone.trim()) {
                  toast({ title: "Błąd", description: "Wpisz numer telefonu", variant: "destructive" });
                  return;
                }
                setSendingSms(true);
                try {
                  const res = await fetch("/api/driver/invite-passenger", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ phone: invitePhone.trim() }),
                  });
                  const data = await res.json();
                  if (res.ok) {
                    toast({ title: "Wysłano!", description: "SMS z zaproszeniem został wysłany" });
                    setInvitePhone("");
                  } else {
                    toast({ title: "Błąd", description: data.error || "Nie udało się wysłać SMS", variant: "destructive" });
                  }
                } catch {
                  toast({ title: "Błąd", description: "Nie udało się wysłać SMS", variant: "destructive" });
                } finally {
                  setSendingSms(false);
                }
              }}
              disabled={sendingSms || !invitePhone.trim()}
              data-testid="button-send-invite-sms"
            >
              {sendingSms ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span className="ml-2">Wyślij</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold" data-testid="text-referral-points">{referralStats?.referralPoints || 0}</p>
            <p className="text-xs text-muted-foreground">Punkty</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold" data-testid="text-referred-drivers">{referralStats?.referredDriversCount || 0}</p>
            <p className="text-xs text-muted-foreground">Kierowcy</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold" data-testid="text-referred-passengers">{referralStats?.referredPassengersCount || 0}</p>
            <p className="text-xs text-muted-foreground">Pasażerowie</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2 text-base">
            <div className="flex items-center gap-2">
              <Banknote className="w-5 h-5" />
              Konto bankowe (wypłaty)
            </div>
            {!editingBank && (
              <Button size="sm" variant="ghost" onClick={() => { 
                setBankNumber(bankData?.bankAccountNumber || ""); 
                setBankHolder(bankData?.bankAccountHolder || ""); 
                setEditingBank(true); 
              }} data-testid="button-edit-bank">
                <Pencil className="w-4 h-4" />
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {editingBank ? (
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Numer konta (IBAN PL)</Label>
                <Input 
                  value={bankNumber} 
                  onChange={(e) => setBankNumber(e.target.value)}
                  placeholder="00 0000 0000 0000 0000 0000 0000"
                  data-testid="input-bank-number"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Właściciel konta</Label>
                <Input 
                  value={bankHolder} 
                  onChange={(e) => setBankHolder(e.target.value)}
                  placeholder="Imię i Nazwisko"
                  data-testid="input-bank-holder"
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => saveBankMutation.mutate()} disabled={saveBankMutation.isPending} data-testid="button-save-bank">
                  {saveBankMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                  Zapisz
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditingBank(false)} data-testid="button-cancel-bank">
                  Anuluj
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-sm space-y-1">
              {bankData?.bankAccountNumber ? (
                <>
                  <p><span className="text-muted-foreground">Nr konta:</span> {bankData.bankAccountNumber}</p>
                  <p><span className="text-muted-foreground">Właściciel:</span> {bankData.bankAccountHolder}</p>
                </>
              ) : (
                <p className="text-muted-foreground">Brak danych konta bankowego. Dodaj dane, aby otrzymywać wypłaty za polecenia.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {payouts && payouts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Historia wypłat</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {payouts.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/50">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{(p.amount / 100).toFixed(2)} PLN</p>
                    <p className="text-xs text-muted-foreground truncate">{p.description}</p>
                  </div>
                  <Badge variant={p.status === 'paid' ? 'default' : p.status === 'cancelled' ? 'secondary' : 'outline'}>
                    {p.status === 'paid' ? 'Wypłacono' : p.status === 'cancelled' ? 'Anulowano' : 'Oczekuje'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {referralStats?.referrals && referralStats.referrals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Historia poleceń</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {referralStats.referrals.map((ref) => (
                <div key={ref.id} className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/50">
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge variant={ref.type === 'driver' ? 'default' : 'secondary'}>
                      {ref.type === 'driver' ? 'Kierowca' : 'Pasażer'}
                    </Badge>
                    <span className="text-sm truncate">
                      {ref.referredDriverName || ref.referredUserName || 'Nieznany'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant={ref.status === 'rewarded' ? 'default' : 'outline'}>
                      {ref.status === 'rewarded' ? 'Nagrodzono' : ref.status === 'pending' ? 'Oczekuje' : ref.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function IdCardUploadSection({ driverId, currentStatus, currentImageUrl }: { driverId: string; currentStatus?: string; currentImageUrl?: string | null }) {
  const { toast } = useToast();
  const queryClientLocal = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const status = currentStatus || "UNVERIFIED";
  const canUpload = status === "UNVERIFIED" || status === "rejected";
  const isPending = status === "pending_verification" || status === "pending_admin_review";

  const handleIdCardUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const metaRes = await fetch("/api/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      if (!metaRes.ok) throw new Error("Failed to get upload URL");
      const { uploadURL, objectPath } = await metaRes.json();

      const putRes = await fetch(uploadURL, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      if (!putRes.ok) throw new Error("File upload failed");

      const imageUrl = objectPath;
      await fetch("/api/driver/upload-id-card", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idCardImageUrl: imageUrl, driverId }),
      });

      toast({ title: "Sukces", description: "Zdjęcie identyfikatora przesłane do weryfikacji" });
      queryClientLocal.invalidateQueries({ queryKey: ["/api/drivers", driverId] });
    } catch {
      toast({ title: "Błąd", description: "Nie udało się przesłać zdjęcia", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <Card className="glow-border" data-testid="id-card-upload-section">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-primary" />
          Identyfikator taksówkarza
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        {currentImageUrl ? (
          <img
            src={currentImageUrl}
            alt="Identyfikator taksówkarza"
            className="w-full max-w-xs rounded-lg border-2 border-muted object-contain"
            data-testid="img-id-card"
          />
        ) : (
          <div className="w-full max-w-xs h-40 rounded-lg bg-muted flex items-center justify-center border-2 border-dashed border-muted-foreground">
            <CreditCard className="w-10 h-10 text-muted-foreground" />
          </div>
        )}

        {status === "approved" && (
          <Badge className="bg-green-600" data-testid="badge-id-approved">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Zweryfikowany
          </Badge>
        )}
        {isPending && (
          <Badge variant="secondary" data-testid="badge-id-pending">
            <Clock className="w-3 h-3 mr-1" />
            Oczekuje na weryfikację
          </Badge>
        )}
        {status === "rejected" && (
          <Badge variant="destructive" data-testid="badge-id-rejected">
            <XCircle className="w-3 h-3 mr-1" />
            Odrzucony — prześlij ponownie
          </Badge>
        )}

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleIdCardUpload}
          accept="image/*"
          className="hidden"
          data-testid="input-id-card-upload"
        />

        {(canUpload || isPending) && (
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            variant={canUpload ? "default" : "outline"}
            data-testid="button-upload-id-card"
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Camera className="w-4 h-4 mr-2" />
            )}
            {currentImageUrl ? "Zmień zdjęcie" : "Dodaj zdjęcie identyfikatora"}
          </Button>
        )}

        <p className="text-xs text-muted-foreground text-center">
          Zrób czytelne zdjęcie identyfikatora taksówkarza i prześlij do weryfikacji przez administratora.
        </p>
      </CardContent>
    </Card>
  );
}

function QRCodeDisplay({ value, size }: { value: string; size: number }) {
  return <QRCodeCanvas value={value} size={size} level="M" />;
}
