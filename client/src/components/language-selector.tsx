import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Globe, Check } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Language {
  code: string;
  name: string;
}

const AVAILABLE_LANGUAGES: Language[] = [
  { code: "PL", name: "Polski" },
  { code: "EN", name: "English" },
  { code: "DE", name: "Deutsch" },
  { code: "UA", name: "Українська" },
  { code: "RU", name: "Русский" },
  { code: "FR", name: "Français" },
  { code: "ES", name: "Español" },
  { code: "IT", name: "Italiano" },
];

interface LanguageSelectorProps {
  driverId: string;
  currentLanguages?: string[];
  onClose?: () => void;
}

export function LanguageSelector({ driverId, currentLanguages = [], onClose }: LanguageSelectorProps) {
  const { toast } = useToast();
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(currentLanguages);

  useEffect(() => {
    setSelectedLanguages(currentLanguages);
  }, [currentLanguages]);

  const updateMutation = useMutation({
    mutationFn: async (languages: string[]) => {
      return apiRequest("PATCH", `/api/drivers/${driverId}/languages`, { languages });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/drivers", driverId] });
      toast({ title: "Zapisano", description: "Języki zostały zaktualizowane" });
      onClose?.();
    },
    onError: () => {
      toast({ title: "Błąd", description: "Nie udało się zapisać języków", variant: "destructive" });
    },
  });

  const toggleLanguage = (code: string) => {
    setSelectedLanguages(prev => 
      prev.includes(code) 
        ? prev.filter(l => l !== code)
        : [...prev, code]
    );
  };

  return (
    <Card className="bg-card border-border" data-testid="card-languages">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-primary" />
          Języki komunikacji
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Wybierz języki którymi możesz się komunikować z pasażerami. Pasażer zobaczy te informacje przy akceptacji zlecenia.
        </p>
        
        <div className="grid grid-cols-2 gap-2">
          {AVAILABLE_LANGUAGES.map((lang) => {
            const isSelected = selectedLanguages.includes(lang.code);
            return (
              <Button
                key={lang.code}
                variant={isSelected ? "default" : "outline"}
                className="justify-start gap-2 h-auto py-3"
                onClick={() => toggleLanguage(lang.code)}
                data-testid={`button-lang-${lang.code}`}
              >
                <Badge variant="outline" className="font-bold text-xs px-1.5">{lang.code}</Badge>
                <span className="flex-1 text-left text-sm">{lang.name}</span>
                {isSelected && <Check className="w-4 h-4" />}
              </Button>
            );
          })}
        </div>

        {selectedLanguages.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
            <span className="text-sm text-muted-foreground mr-2">Wybrane:</span>
            {selectedLanguages.map(code => {
              return (
                <Badge key={code} variant="secondary" className="font-bold">
                  {code.toUpperCase()}
                </Badge>
              );
            })}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button 
            className="flex-1"
            onClick={() => updateMutation.mutate(selectedLanguages)}
            disabled={updateMutation.isPending}
            data-testid="button-save-languages"
          >
            Zapisz
          </Button>
          {onClose && (
            <Button variant="outline" onClick={onClose} data-testid="button-cancel-languages">
              Anuluj
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function LanguageBadges({ languages }: { languages?: string[] | null }) {
  if (!languages || languages.length === 0) return null;
  
  return (
    <div className="flex flex-wrap gap-1 mt-1" data-testid="driver-languages">
      {languages.map(code => (
        <Badge key={code} variant="outline" className="text-xs px-1.5 py-0.5 font-bold">
          {code.toUpperCase()}
        </Badge>
      ))}
    </div>
  );
}
