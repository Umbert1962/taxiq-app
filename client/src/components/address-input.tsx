import { useState, useRef, forwardRef, useImperativeHandle, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { useGoogleMaps } from "@/hooks/use-google-maps";
import { MapPin, Loader2 } from "lucide-react";

interface AddressInputProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect?: (place: any) => void;
  placeholder?: string;
  className?: string;
  "data-testid"?: string;
}

export interface AddressInputRef {
  focus: () => void;
}

interface Prediction {
  place_id: string;
  description: string;
  structured_formatting?: {
    main_text: string;
    secondary_text?: string;
  };
}

export const AddressInput = forwardRef<AddressInputRef, AddressInputProps>(
  ({ value, onChange, onPlaceSelect, placeholder, className, "data-testid": testId }, ref) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const autocompleteServiceRef = useRef<any>(null);
    const placesServiceRef = useRef<any>(null);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);
    
    const [predictions, setPredictions] = useState<Prediction[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    
    const { ready } = useGoogleMaps();

    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
    }));

    // Pobierz lokalizację użytkownika dla lepszych wyników wyszukiwania
    useEffect(() => {
      if (navigator.geolocation && !userLocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setUserLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            });
          },
          () => {
            // Fallback do Poznania jeśli nie ma dostępu do GPS
            setUserLocation({ lat: 52.4064, lng: 16.9252 });
          },
          { enableHighAccuracy: false, timeout: 5000 }
        );
      }
    }, []);

    // Initialize services
    useEffect(() => {
      if (!ready) return;
      
      if (!autocompleteServiceRef.current && (window as any).google?.maps?.places?.AutocompleteService) {
        autocompleteServiceRef.current = new (window as any).google.maps.places.AutocompleteService();
      }
      
      // PlacesService needs a DOM element or map
      if (!placesServiceRef.current && (window as any).google?.maps?.places?.PlacesService) {
        const div = document.createElement('div');
        placesServiceRef.current = new (window as any).google.maps.places.PlacesService(div);
      }
    }, [ready]);

    // Close dropdown when clicking outside
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setShowDropdown(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Fetch predictions
    const fetchPredictions = useCallback((input: string) => {
      if (!autocompleteServiceRef.current || input.length < 2) {
        setPredictions([]);
        setShowDropdown(false);
        return;
      }

      setIsLoading(true);
      
      // Utwórz opcje z locationBias dla wyników blisko użytkownika
      const requestOptions: any = {
        input,
        componentRestrictions: { country: 'pl' },
        types: ['geocode', 'establishment'],
      };

      // Dodaj locationBias jeśli mamy lokalizację użytkownika
      if (userLocation && (window as any).google?.maps?.LatLng) {
        requestOptions.locationBias = {
          center: new (window as any).google.maps.LatLng(userLocation.lat, userLocation.lng),
          radius: 50000, // 50km - priorytetyzuj wyniki w tym promieniu
        };
      }
      
      autocompleteServiceRef.current.getPlacePredictions(
        requestOptions,
        (results: any[], status: string) => {
          setIsLoading(false);
          if (status === 'OK' && results) {
            setPredictions(results.map((r: any) => ({
              place_id: r.place_id,
              description: r.description,
              structured_formatting: r.structured_formatting,
            })));
            setShowDropdown(true);
            setSelectedIndex(-1);
          } else {
            setPredictions([]);
            setShowDropdown(false);
          }
        }
      );
    }, [userLocation]);

    // Handle input change with debounce
    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      onChange(newValue);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        fetchPredictions(newValue);
      }, 300);
    }, [onChange, fetchPredictions]);

    // Select a prediction
    const selectPrediction = useCallback((prediction: Prediction) => {
      console.log("[AddressInput] Selected prediction:", prediction.description);
      
      if (!placesServiceRef.current) {
        // Fallback if places service not ready
        onChange(prediction.description);
        setShowDropdown(false);
        setPredictions([]);
        return;
      }

      // Get full place details
      placesServiceRef.current.getDetails(
        {
          placeId: prediction.place_id,
          fields: ['formatted_address', 'geometry', 'name', 'address_components', 'types'],
        },
        (place: any, status: string) => {
          if (status === 'OK' && place) {
            const fullAddress = place.formatted_address || prediction.description;
            console.log("[AddressInput] Got place details:", fullAddress, place);
            
            onChange(fullAddress);
            onPlaceSelect?.(place);
          } else {
            // Fallback to prediction description
            console.log("[AddressInput] Failed to get details, using description");
            onChange(prediction.description);
          }
          
          setShowDropdown(false);
          setPredictions([]);
        }
      );
    }, [onChange, onPlaceSelect]);

    // Handle keyboard navigation
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
      if (!showDropdown || predictions.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, predictions.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, -1));
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0) {
            selectPrediction(predictions[selectedIndex]);
          }
          break;
        case 'Escape':
          setShowDropdown(false);
          break;
      }
    }, [showDropdown, predictions, selectedIndex, selectPrediction]);

    // Handle focus
    const handleFocus = useCallback(() => {
      if (predictions.length > 0) {
        setShowDropdown(true);
      }
    }, [predictions.length]);

    return (
      <div ref={containerRef} className="relative">
        <Input
          ref={inputRef}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          placeholder={placeholder}
          className={className}
          data-testid={testId}
          autoComplete="off"
        />
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
        
        {/* Dropdown */}
        {showDropdown && predictions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-auto">
            {predictions.map((prediction, index) => (
              <button
                key={prediction.place_id}
                type="button"
                className={`w-full px-3 py-2 text-left flex items-start gap-2 hover:bg-muted transition-colors ${
                  index === selectedIndex ? 'bg-muted' : ''
                }`}
                onClick={() => selectPrediction(prediction)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  {prediction.structured_formatting ? (
                    <>
                      <div className="font-medium truncate">
                        {prediction.structured_formatting.main_text}
                      </div>
                      {prediction.structured_formatting.secondary_text && (
                        <div className="text-sm text-muted-foreground truncate">
                          {prediction.structured_formatting.secondary_text}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="truncate">{prediction.description}</div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }
);

AddressInput.displayName = "AddressInput";
