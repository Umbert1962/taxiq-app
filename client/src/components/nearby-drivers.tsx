import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Car, 
  MapPin, 
  Clock, 
  Sun, 
  Moon, 
  Calendar,
  ChevronDown,
  ChevronUp,
  Navigation,
  Zap,
  Percent,
  X
} from "lucide-react";

interface NearbyDriver {
  id: string;
  name: string;
  vehiclePlate: string;
  vehicleModel: string | null;
  rating: string | null;
  languages: string[];
  currentRateCity: number;
  currentRateSuburb: number;
  rateType: "day" | "night" | "holiday";
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
  distance?: number;
  estimatedTime?: number;
}

interface NearbyDriversProps {
  userLocation: { lat: number; lng: number } | null;
  onClose: () => void;
  onSelectDriver?: (driver: NearbyDriver) => void;
}

function formatPrice(grosze: number): string {
  return (grosze / 100).toFixed(2);
}

function getRateTypeIcon(rateType: string) {
  switch (rateType) {
    case "night":
      return <Moon className="w-3 h-3 text-blue-400" />;
    case "holiday":
      return <Calendar className="w-3 h-3 text-red-400" />;
    default:
      return <Sun className="w-3 h-3 text-yellow-500" />;
  }
}

function getRateTypeLabel(rateType: string) {
  switch (rateType) {
    case "night":
      return "Nocna";
    case "holiday":
      return "Świąteczna";
    default:
      return "Dzienna";
  }
}

function DriverCard({ 
  driver, 
  onSelect,
  expanded,
  onToggleExpand
}: { 
  driver: NearbyDriver; 
  onSelect?: () => void;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  return (
    <Card className="hover-elevate cursor-pointer" data-testid={`card-driver-${driver.id}`}>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Car className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="font-medium text-sm">{driver.name}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <span>{driver.vehiclePlate}</span>
                {driver.vehicleModel && (
                  <>
                    <span>·</span>
                    <span>{driver.vehicleModel}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs flex items-center gap-1">
              {getRateTypeIcon(driver.rateType)}
              <span>{getRateTypeLabel(driver.rateType)}</span>
            </Badge>
            <div className="text-primary font-semibold text-sm">
              {formatPrice(driver.currentRateCity)} zł/km
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {driver.discountPercent > 0 && (
              <Badge className="bg-green-500/20 text-green-500 text-xs">
                <Percent className="w-3 h-3 mr-0.5" />
                -{driver.discountPercent}%
              </Badge>
            )}
            {driver.distance !== undefined && (
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Navigation className="w-3 h-3" />
                <span>{(driver.distance / 1000).toFixed(1)} km</span>
              </div>
            )}
            {driver.estimatedTime !== undefined && (
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{Math.ceil(driver.estimatedTime / 60)} min</span>
              </div>
            )}
          </div>
        </div>

        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full h-6 text-xs"
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand();
          }}
          data-testid="button-toggle-rates"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-3 h-3 mr-1" />
              Ukryj cennik
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3 mr-1" />
              Pokaż pełny cennik
            </>
          )}
        </Button>

        {expanded && (
          <div className="border-t border-border pt-2 mt-2 space-y-2">
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Sun className="w-3 h-3 text-yellow-500" />
                  Dzień
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Miasto:</span>
                  <span className="font-medium">{formatPrice(driver.rateDayCity)} zł</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Poza:</span>
                  <span className="font-medium">{formatPrice(driver.rateDaySuburb)} zł</span>
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Moon className="w-3 h-3 text-blue-400" />
                  Noc
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Miasto:</span>
                  <span className="font-medium">{formatPrice(driver.rateNightCity)} zł</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Poza:</span>
                  <span className="font-medium">{formatPrice(driver.rateNightSuburb)} zł</span>
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Calendar className="w-3 h-3 text-red-400" />
                  Święta
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Miasto:</span>
                  <span className="font-medium">{formatPrice(driver.rateHolidayCity)} zł</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Poza:</span>
                  <span className="font-medium">{formatPrice(driver.rateHolidaySuburb)} zł</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between text-xs pt-1 border-t border-border">
              <div className="flex items-center gap-1 text-orange-500">
                <Zap className="w-3 h-3" />
                <span>CITO: {formatPrice(driver.rateCito)} zł/km</span>
              </div>
              <div className="text-muted-foreground">
                Poza miastem: &gt;{driver.suburbRadiusKm} km od centrum
              </div>
            </div>

            {driver.languages && driver.languages.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap pt-1">
                <span className="text-xs text-muted-foreground">Języki:</span>
                {driver.languages.map(lang => (
                  <Badge key={lang} variant="secondary" className="text-xs">
                    {lang}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function NearbyDrivers({ userLocation, onClose, onSelectDriver }: NearbyDriversProps) {
  const [expandedDriverId, setExpandedDriverId] = useState<string | null>(null);

  const { data: drivers = [], isLoading } = useQuery<NearbyDriver[]>({
    queryKey: ["/api/drivers/nearby"],
    refetchInterval: 10000,
  });

  const sortedDrivers = [...drivers].sort((a, b) => {
    if (a.distance !== undefined && b.distance !== undefined) {
      return a.distance - b.distance;
    }
    return 0;
  });

  return (
    <Card className="w-full max-w-md" data-testid="panel-nearby-drivers">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Car className="w-5 h-5 text-primary" />
            Kierowcy w pobliżu
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-nearby">
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="text-xs text-muted-foreground">
          {drivers.length > 0 
            ? `${drivers.length} dostępnych kierowców`
            : "Brak dostępnych kierowców"
          }
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px] px-4 pb-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : sortedDrivers.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Car className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Brak dostępnych kierowców</p>
              <p className="text-xs mt-1">Sprawdź ponownie za chwilę</p>
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              {sortedDrivers.map(driver => (
                <DriverCard
                  key={driver.id}
                  driver={driver}
                  expanded={expandedDriverId === driver.id}
                  onToggleExpand={() => 
                    setExpandedDriverId(prev => prev === driver.id ? null : driver.id)
                  }
                  onSelect={() => onSelectDriver?.(driver)}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
