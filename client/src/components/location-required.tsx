import { MapPin, RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import logoImage from "@assets/logo/logo-taxiq-neon.jpg";

interface LocationRequiredProps {
  error: string | null;
  loading: boolean;
  permissionDenied: boolean;
  onRetry: () => void;
  onSkip?: () => void;
}

export function LocationRequired({ error, loading, permissionDenied, onRetry, onSkip }: LocationRequiredProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img src={logoImage} alt="TaxiQ" className="h-16 w-auto" />
          </div>
          <CardTitle className="flex items-center justify-center gap-2 text-xl">
            <MapPin className="w-6 h-6 text-primary" />
            Wymagana lokalizacja
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="text-center py-8 space-y-4">
              <div className="animate-pulse">
                <MapPin className="w-12 h-12 mx-auto text-primary mb-4" />
              </div>
              <p className="text-muted-foreground">Pobieranie lokalizacji...</p>
              {onSkip && (
                <Button 
                  variant="outline" 
                  className="mt-4" 
                  onClick={onSkip}
                  data-testid="button-skip-location"
                >
                  Pomiń i wpisz adres ręcznie
                </Button>
              )}
            </div>
          ) : permissionDenied ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-destructive/10 rounded-lg border border-destructive/30">
                <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-destructive">Dostęp zablokowany</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Aby korzystać z TaxiQ, musisz zezwolić na dostęp do lokalizacji.
                  </p>
                </div>
              </div>
              
              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="font-medium">Jak włączyć lokalizację:</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Kliknij ikonę kłódki obok adresu strony</li>
                  <li>Znajdź opcję "Lokalizacja"</li>
                  <li>Zmień na "Zezwól"</li>
                  <li>Odśwież stronę</li>
                </ol>
              </div>
              
              <Button 
                className="w-full" 
                onClick={onRetry}
                data-testid="button-retry-location"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Spróbuj ponownie
              </Button>
              
              {onSkip && (
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={onSkip}
                  data-testid="button-skip-location-denied"
                >
                  Kontynuuj bez lokalizacji
                </Button>
              )}
            </div>
          ) : error ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
                <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">{error}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Upewnij się, że GPS jest włączony na urządzeniu.
                  </p>
                </div>
              </div>
              
              <Button 
                className="w-full" 
                onClick={onRetry}
                data-testid="button-retry-location"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Spróbuj ponownie
              </Button>
              
              {onSkip && (
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={onSkip}
                  data-testid="button-skip-location-error"
                >
                  Kontynuuj bez lokalizacji
                </Button>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
