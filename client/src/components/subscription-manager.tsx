import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, CreditCard, Pause, Play, Clock, AlertTriangle, CheckCircle, FileText, RefreshCw } from "lucide-react";
import { format, addDays } from "date-fns";
import { pl } from "date-fns/locale";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface SubscriptionInfo {
  status: string;
  trialEndsAt: string | null;
  subscriptionEndsAt: string | null;
  suspendedAt: string | null;
  suspendedUntil: string | null;
  remainingDays: number;
  isActive: boolean;
  totalEarnings: number;
  subscriptionDiscount: number;
  assignedPlan: {
    id: string;
    name: string;
    durationDays: number;
    price: number;
    description: string | null;
  } | null;
  priceToPay: number | null;
}

interface SubscriptionManagerProps {
  driverId: string;
  onClose?: () => void;
  onPayClick?: () => void;
}

export function SubscriptionManager({ driverId, onClose, onPayClick }: SubscriptionManagerProps) {
  const { toast } = useToast();
  const [returnDate, setReturnDate] = useState<Date | undefined>(addDays(new Date(), 7));
  const [showCalendar, setShowCalendar] = useState(false);

  const { data: subscription, isLoading, refetch, isFetching } = useQuery<SubscriptionInfo>({
    queryKey: ["/api/drivers", driverId, "subscription"],
    queryFn: async () => {
      const res = await fetch(`/api/drivers/${driverId}/subscription`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch subscription");
      return res.json();
    },
  });

  const suspendMutation = useMutation({
    mutationFn: async (date: Date) => {
      return apiRequest("POST", `/api/drivers/${driverId}/subscription/suspend`, { returnDate: date.toISOString() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/drivers", driverId, "subscription"] });
      toast({ title: "Abonament zawieszony", description: "Twój abonament został zawieszony. Pozostałe dni zostaną zachowane." });
      setShowCalendar(false);
    },
    onError: () => {
      toast({ title: "Błąd", description: "Nie udało się zawiesić abonamentu", variant: "destructive" });
    },
  });

  const resumeMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/drivers/${driverId}/subscription/resume`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/drivers", driverId, "subscription"] });
      toast({ title: "Abonament wznowiony", description: "Twój abonament został wznowiony." });
    },
    onError: () => {
      toast({ title: "Błąd", description: "Nie udało się wznowić abonamentu", variant: "destructive" });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "trial":
        return <Badge className="bg-blue-500" data-testid="badge-status-trial">Okres próbny</Badge>;
      case "active":
        return <Badge className="bg-green-500" data-testid="badge-status-active">Aktywny</Badge>;
      case "suspended":
        return <Badge className="bg-yellow-500" data-testid="badge-status-suspended">Zawieszony</Badge>;
      case "grace":
        return <Badge className="bg-orange-500" data-testid="badge-status-grace">Karencja</Badge>;
      case "expired":
        return <Badge className="bg-red-500" data-testid="badge-status-expired">Wygasły</Badge>;
      default:
        return <Badge data-testid="badge-status-unknown">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-8 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!subscription) return null;

  const minReturnDate = addDays(new Date(), 7);

  const handleRefresh = async () => {
    // Clear browser cache
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }
    // Refetch data
    await refetch();
    toast({ title: "Odświeżono", description: "Dane zostały zaktualizowane" });
  };

  return (
    <Card className="bg-card border-border" data-testid="card-subscription">
      <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-primary" />
          Abonament
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleRefresh}
            disabled={isFetching}
            data-testid="button-refresh-subscription"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
          {getStatusBadge(subscription.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 text-sm">
          {subscription.assignedPlan ? (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plan:</span>
                <span className="font-semibold">{subscription.assignedPlan.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Okres:</span>
                <span className="font-semibold">{subscription.assignedPlan.durationDays} dni</span>
              </div>
              {subscription.assignedPlan.description && (
                <div className="text-xs text-muted-foreground">
                  {subscription.assignedPlan.description}
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-2">
                <span className="text-muted-foreground">Cena:</span>
                <span className="font-bold text-primary">{((subscription.assignedPlan?.price || 0) / 100).toFixed(2)} PLN</span>
              </div>
            </>
          ) : (
            <div className="text-center text-muted-foreground py-4">
              Brak przydzielonego planu abonamentowego
            </div>
          )}
          
          {subscription.status === "trial" && subscription.trialEndsAt && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Okres próbny do:</span>
              <span className="font-semibold">{format(new Date(subscription.trialEndsAt), "d MMMM yyyy", { locale: pl })}</span>
            </div>
          )}
          
          {subscription.status === "active" && subscription.subscriptionEndsAt && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Aktywny do:</span>
              <span className="font-semibold">{format(new Date(subscription.subscriptionEndsAt), "d MMMM yyyy", { locale: pl })}</span>
            </div>
          )}
          
          {subscription.status === "suspended" && (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Zawieszony od:</span>
                <span>{subscription.suspendedAt && format(new Date(subscription.suspendedAt), "d MMMM yyyy", { locale: pl })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Planowany powrót:</span>
                <span>{subscription.suspendedUntil && format(new Date(subscription.suspendedUntil), "d MMMM yyyy", { locale: pl })}</span>
              </div>
            </>
          )}
          
          <div className="flex justify-between">
            <span className="text-muted-foreground">Pozostałe dni:</span>
            <span className="font-semibold">{subscription.remainingDays}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-muted-foreground">Twój obrót:</span>
            <span className="font-semibold">{subscription.totalEarnings} zł</span>
          </div>
        </div>

        <div className="flex items-start gap-2 p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
          <FileText className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
          <div className="text-xs text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Faktura VAT</p>
            <p>Faktura wystawiana jest automatycznie w systemie KSeF (Krajowy System e-Faktur) i dostępna w Twoim profilu podatnika.</p>
          </div>
        </div>

        {onPayClick && (
          <Button 
            className="w-full" 
            onClick={onPayClick}
            data-testid="button-pay-subscription"
          >
            <CreditCard className="w-4 h-4 mr-2" />
            Opłać abonament
          </Button>
        )}

        <div className="border-t border-border pt-4 space-y-3">
          {subscription.status === "suspended" ? (
            <Button 
              className="w-full" 
              onClick={() => resumeMutation.mutate()}
              disabled={resumeMutation.isPending}
              data-testid="button-resume-subscription"
            >
              <Play className="w-4 h-4 mr-2" />
              Wznów abonament
            </Button>
          ) : subscription.status !== "expired" && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Możesz zawiesić abonament na czas przerwy (min. 7 dni). Pozostałe dni zostaną zachowane.
              </p>
              
              <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start" data-testid="button-suspend-subscription">
                    <Pause className="w-4 h-4 mr-2" />
                    Zawieś abonament
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-card" align="start">
                  <div className="p-3 border-b border-border">
                    <p className="text-sm font-medium">Wybierz datę powrotu</p>
                    <p className="text-xs text-muted-foreground">Minimum 7 dni od dziś</p>
                  </div>
                  <Calendar
                    mode="single"
                    selected={returnDate}
                    onSelect={setReturnDate}
                    disabled={(date) => date < minReturnDate}
                    locale={pl}
                    data-testid="calendar-return-date"
                  />
                  <div className="p-3 border-t border-border">
                    <Button 
                      className="w-full"
                      disabled={!returnDate || suspendMutation.isPending}
                      onClick={() => returnDate && suspendMutation.mutate(returnDate)}
                      data-testid="button-confirm-suspend"
                    >
                      <Clock className="w-4 h-4 mr-2" />
                      Potwierdź zawieszenie
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          )}

          {subscription.status === "expired" && (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 rounded-lg border border-red-500/30">
              <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                Twój abonament wygasł. Skontaktuj się z administratorem aby go przedłużyć.
              </p>
            </div>
          )}
        </div>

        {onClose && (
          <Button variant="outline" className="w-full" onClick={onClose} data-testid="button-close-subscription">
            Zamknij
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
