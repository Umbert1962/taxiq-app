import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Sun, Moon, MapPin, Zap, Percent, CircleDot, Calendar, Clock, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface PricingData {
  baseFare: number;
  rateDayCity: number;
  rateDaySuburb: number;
  rateNightCity: number;
  rateNightSuburb: number;
  rateHolidayCity: number;
  rateHolidaySuburb: number;
  rateCito: number;
  rateWaitingPerMinute: number;
  suburbRadiusKm: number;
  discountPercent: number;
}

interface PricingManagerProps {
  driverId: string;
  onClose: () => void;
}

function formatPrice(grosze: number): string {
  return (grosze / 100).toFixed(2);
}

function parsePrice(pln: string): number {
  const val = parseFloat(pln);
  if (isNaN(val)) return 0;
  return Math.round(val * 100);
}

export function PricingManager({ driverId, onClose }: PricingManagerProps) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);

  const { data: pricing, isLoading } = useQuery<PricingData>({
    queryKey: ["/api/drivers", driverId, "pricing"],
    queryFn: async () => {
      const res = await fetch(`/api/drivers/${driverId}/pricing`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch pricing");
      return res.json();
    },
  });

  const [baseFare, setBaseFare] = useState("");
  const [rateDayCity, setRateDayCity] = useState("");
  const [rateDaySuburb, setRateDaySuburb] = useState("");
  const [rateNightCity, setRateNightCity] = useState("");
  const [rateNightSuburb, setRateNightSuburb] = useState("");
  const [rateHolidayCity, setRateHolidayCity] = useState("");
  const [rateHolidaySuburb, setRateHolidaySuburb] = useState("");
  const [rateCito, setRateCito] = useState("");
  const [rateWaitingPerMinute, setRateWaitingPerMinute] = useState("");
  const [suburbRadiusKm, setSuburbRadiusKm] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");

  const updateMutation = useMutation({
    mutationFn: async (data: PricingData) => {
      return apiRequest("PATCH", `/api/drivers/${driverId}/pricing`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/drivers", driverId, "pricing"] });
      toast({ title: "Zapisano", description: "Cennik został zaktualizowany" });
      setIsEditing(false);
    },
    onError: () => {
      toast({ title: "Błąd", description: "Nie udało się zapisać cennika", variant: "destructive" });
    },
  });

  const handleEdit = () => {
    if (pricing) {
      setBaseFare(formatPrice(pricing.baseFare || 900));
      setRateDayCity(formatPrice(pricing.rateDayCity));
      setRateDaySuburb(formatPrice(pricing.rateDaySuburb));
      setRateNightCity(formatPrice(pricing.rateNightCity));
      setRateNightSuburb(formatPrice(pricing.rateNightSuburb));
      setRateHolidayCity(formatPrice(pricing.rateHolidayCity || pricing.rateNightCity));
      setRateHolidaySuburb(formatPrice(pricing.rateHolidaySuburb || pricing.rateNightSuburb));
      setRateCito(formatPrice(pricing.rateCito));
      setRateWaitingPerMinute(formatPrice(pricing.rateWaitingPerMinute || 100));
      setSuburbRadiusKm(String(pricing.suburbRadiusKm));
      setDiscountPercent(String(pricing.discountPercent));
      setIsEditing(true);
    }
  };

  const handleSave = () => {
    const data: PricingData = {
      baseFare: parsePrice(baseFare),
      rateDayCity: parsePrice(rateDayCity),
      rateDaySuburb: parsePrice(rateDaySuburb),
      rateNightCity: parsePrice(rateNightCity),
      rateNightSuburb: parsePrice(rateNightSuburb),
      rateHolidayCity: parsePrice(rateHolidayCity),
      rateHolidaySuburb: parsePrice(rateHolidaySuburb),
      rateCito: parsePrice(rateCito),
      rateWaitingPerMinute: parsePrice(rateWaitingPerMinute),
      suburbRadiusKm: parseInt(suburbRadiusKm) || 15,
      discountPercent: parseInt(discountPercent) || 0,
    };
    updateMutation.mutate(data);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          Twój cennik
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2 pb-4 border-b border-border">
          <Label className="flex items-center gap-1 text-sm font-medium">
            <DollarSign className="w-4 h-4 text-primary" /> Opłata startowa (PLN)
          </Label>
          {isEditing ? (
            <Input
              type="text"
              inputMode="decimal"
              value={baseFare}
              onChange={(e) => setBaseFare(e.target.value)}
              data-testid="input-base-fare"
            />
          ) : (
            <div className="text-2xl font-bold text-primary" data-testid="display-base-fare">
              {formatPrice(pricing?.baseFare || 900)} zł
            </div>
          )}
          <p className="text-xs text-muted-foreground">Stała kwota naliczana przy każdym kursie</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Sun className="w-4 h-4 text-yellow-500" />
              <span className="font-medium text-sm">Stawki dzienne</span>
              <Badge variant="secondary" className="text-xs">6:00-22:00</Badge>
            </div>
            
            <div className="space-y-2">
              <Label className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3" /> Miasto (PLN/km)
              </Label>
              {isEditing ? (
                <Input
                  type="text"
                  inputMode="decimal"
                  value={rateDayCity}
                  onChange={(e) => setRateDayCity(e.target.value)}
                  data-testid="input-rate-day-city"
                />
              ) : (
                <div className="text-lg font-semibold" data-testid="display-rate-day-city">
                  {formatPrice(pricing?.rateDayCity || 0)} zł
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1 text-xs text-muted-foreground">
                <CircleDot className="w-3 h-3" /> Pozamiejska (PLN/km)
              </Label>
              {isEditing ? (
                <Input
                  type="text"
                  inputMode="decimal"
                  value={rateDaySuburb}
                  onChange={(e) => setRateDaySuburb(e.target.value)}
                  data-testid="input-rate-day-suburb"
                />
              ) : (
                <div className="text-lg font-semibold" data-testid="display-rate-day-suburb">
                  {formatPrice(pricing?.rateDaySuburb || 0)} zł
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Moon className="w-4 h-4 text-blue-400" />
              <span className="font-medium text-sm">Stawki nocne</span>
              <Badge variant="secondary" className="text-xs">22:00-6:00</Badge>
            </div>
            
            <div className="space-y-2">
              <Label className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3" /> Miasto (PLN/km)
              </Label>
              {isEditing ? (
                <Input
                  type="text"
                  inputMode="decimal"
                  value={rateNightCity}
                  onChange={(e) => setRateNightCity(e.target.value)}
                  data-testid="input-rate-night-city"
                />
              ) : (
                <div className="text-lg font-semibold" data-testid="display-rate-night-city">
                  {formatPrice(pricing?.rateNightCity || 0)} zł
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1 text-xs text-muted-foreground">
                <CircleDot className="w-3 h-3" /> Pozamiejska (PLN/km)
              </Label>
              {isEditing ? (
                <Input
                  type="text"
                  inputMode="decimal"
                  value={rateNightSuburb}
                  onChange={(e) => setRateNightSuburb(e.target.value)}
                  data-testid="input-rate-night-suburb"
                />
              ) : (
                <div className="text-lg font-semibold" data-testid="display-rate-night-suburb">
                  {formatPrice(pricing?.rateNightSuburb || 0)} zł
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-red-400" />
            <span className="font-medium text-sm">Stawki świąteczne</span>
            <Badge variant="secondary" className="text-xs">Niedziela + Święta</Badge>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3" /> Miasto (PLN/km)
              </Label>
              {isEditing ? (
                <Input
                  type="text"
                  inputMode="decimal"
                  value={rateHolidayCity}
                  onChange={(e) => setRateHolidayCity(e.target.value)}
                  data-testid="input-rate-holiday-city"
                />
              ) : (
                <div className="text-lg font-semibold text-red-400" data-testid="display-rate-holiday-city">
                  {formatPrice(pricing?.rateHolidayCity || pricing?.rateNightCity || 0)} zł
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1 text-xs text-muted-foreground">
                <CircleDot className="w-3 h-3" /> Pozamiejska (PLN/km)
              </Label>
              {isEditing ? (
                <Input
                  type="text"
                  inputMode="decimal"
                  value={rateHolidaySuburb}
                  onChange={(e) => setRateHolidaySuburb(e.target.value)}
                  data-testid="input-rate-holiday-suburb"
                />
              ) : (
                <div className="text-lg font-semibold text-red-400" data-testid="display-rate-holiday-suburb">
                  {formatPrice(pricing?.rateHolidaySuburb || pricing?.rateNightSuburb || 0)} zł
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-border pt-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1 text-xs text-muted-foreground">
                <Zap className="w-3 h-3 text-orange-500" /> CITO (PLN/km)
              </Label>
              {isEditing ? (
                <Input
                  type="text"
                  inputMode="decimal"
                  value={rateCito}
                  onChange={(e) => setRateCito(e.target.value)}
                  data-testid="input-rate-cito"
                />
              ) : (
                <div className="text-lg font-semibold text-orange-500" data-testid="display-rate-cito">
                  {formatPrice(pricing?.rateCito || 0)} zł
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3 text-purple-500" /> Oczekiwanie (PLN/min)
              </Label>
              {isEditing ? (
                <Input
                  type="text"
                  inputMode="decimal"
                  value={rateWaitingPerMinute}
                  onChange={(e) => setRateWaitingPerMinute(e.target.value)}
                  data-testid="input-rate-waiting"
                />
              ) : (
                <div className="text-lg font-semibold text-purple-500" data-testid="display-rate-waiting">
                  {formatPrice(pricing?.rateWaitingPerMinute || 100)} zł
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-2">
            <div className="space-y-2">
              <Label className="flex items-center gap-1 text-xs text-muted-foreground">
                <CircleDot className="w-3 h-3" /> Promień pozamiejski
              </Label>
              {isEditing ? (
                <Input
                  type="text"
                  inputMode="numeric"
                  value={suburbRadiusKm}
                  onChange={(e) => setSuburbRadiusKm(e.target.value)}
                  data-testid="input-suburb-radius"
                />
              ) : (
                <div className="text-lg font-semibold" data-testid="display-suburb-radius">
                  {pricing?.suburbRadiusKm || 15} km
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1 text-xs text-muted-foreground">
                <Percent className="w-3 h-3 text-green-500" /> Rabat
              </Label>
              {isEditing ? (
                <Input
                  type="text"
                  inputMode="numeric"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(e.target.value)}
                  data-testid="input-discount"
                />
              ) : (
                <div className="text-lg font-semibold text-green-500" data-testid="display-discount">
                  {pricing?.discountPercent || 0}%
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-2 border-t border-border">
          {isEditing ? (
            <>
              <Button 
                className="flex-1" 
                onClick={handleSave}
                disabled={updateMutation.isPending}
                data-testid="button-save-pricing"
              >
                {updateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Zapisz
              </Button>
              <Button 
                variant="outline" 
                onClick={handleCancel}
                data-testid="button-cancel-pricing"
              >
                Anuluj
              </Button>
            </>
          ) : (
            <Button 
              className="w-full" 
              variant="outline" 
              onClick={handleEdit}
              data-testid="button-edit-pricing"
            >
              Edytuj cennik
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
