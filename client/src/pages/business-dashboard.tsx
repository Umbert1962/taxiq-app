import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useGoogleMaps, useAutocomplete } from "@/hooks/use-google-maps";
import { useGeolocation } from "@/hooks/use-geolocation";
import { AddressInput } from "@/components/address-input";
import { NearbyTaxisMap } from "@/components/nearby-taxis-map";
import { 
  Building2, LogOut, Plus, Users, Car, Receipt, BarChart3, 
  Phone, MapPin, User, Trash2, Edit, FileText, Calendar,
  TrendingUp, DollarSign, Download, Crosshair, Loader2,
  Navigation, Clock, Star, Sun, Moon, ChevronDown, ChevronUp, Zap, Percent, Check, Send, FileCode
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SiGoogleplay, SiAppstore } from "react-icons/si";

const bookRideSchema = z.object({
  pickupLocation: z.string().min(1, "Adres odbioru jest wymagany"),
  destination: z.string().min(1, "Cel podróży jest wymagany"),
  passengerCount: z.number().min(1).max(8),
  guestName: z.string().optional(),
  guestPhone: z.string().optional(),
  roomNumber: z.string().optional(),
  costCenter: z.string().optional(),
  notes: z.string().optional(),
});

const employeeSchema = z.object({
  name: z.string().min(2, "Imię jest wymagane"),
  email: z.string().email("Nieprawidłowy email"),
  password: z.string().min(4, "Hasło musi mieć min. 4 znaki"),
  phone: z.string().optional(),
  role: z.enum(["admin", "employee"]),
});

type BookRideForm = z.infer<typeof bookRideSchema>;
type EmployeeForm = z.infer<typeof employeeSchema>;

interface BusinessUser {
  type: "company" | "employee";
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  taxId?: string;
  role?: string;
  companyId?: string;
  companyName?: string;
  companyType?: string;
  companyAddress?: string;
}

export default function BusinessDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [user, setUser] = useState<BusinessUser | null>(null);
  const [bookDialogOpen, setBookDialogOpen] = useState(false);
  const [employeeDialogOpen, setEmployeeDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("employees");
  
  const pickupRef = useRef<HTMLInputElement>(null);
  const destRef = useRef<HTMLInputElement>(null);
  const { ready: mapsReady } = useGoogleMaps();
  const geolocation = useGeolocation();
  
  const [pickupPlace, setPickupPlace] = useState<{ geometry?: { location?: { lat: () => number; lng: () => number } } } | null>(null);
  const [destinationPlace, setDestinationPlace] = useState<{ geometry?: { location?: { lat: () => number; lng: () => number } } } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [showEditProfileDialog, setShowEditProfileDialog] = useState(false);
  const [editProfileForm, setEditProfileForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    taxId: "",
  });

  const [companyAddressGeocoded, setCompanyAddressGeocoded] = useState(false);
  const [pendingRideId, setPendingRideId] = useState<string | null>(null);
  const [assigningDriverId, setAssigningDriverId] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("businessUser");
    if (!stored) {
      setLocation("/business");
      return;
    }
    setUser(JSON.parse(stored));
  }, [setLocation]);

  useEffect(() => {
    if (!user?.companyAddress || companyAddressGeocoded || !mapsReady || !window.google) return;
    setCompanyAddressGeocoded(true);
    
    const currentPickup = bookForm.getValues("pickupLocation");
    if (!currentPickup) {
      bookForm.setValue("pickupLocation", user.companyAddress);
    }

    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address: user.companyAddress }, (results, status) => {
      if (status === "OK" && results?.[0]?.geometry?.location) {
        const loc = results[0].geometry.location;
        setPickupPlace({ geometry: { location: { lat: () => loc.lat(), lng: () => loc.lng() } } });
      }
    });
  }, [user, mapsReady, companyAddressGeocoded]);

  const companyId = user?.type === "company" ? user.id : user?.companyId;
  const isAdmin = user?.type === "company" || user?.role === "admin";
  
  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem("businessToken");
    return token ? { "x-business-token": token } : {};
  };

  const { data: rides = [], refetch: refetchRides } = useQuery({
    queryKey: ["/api/business/company", companyId, "rides"],
    queryFn: async () => {
      if (!companyId) return [];
      const res = await fetch(`/api/business/company/${companyId}/rides`, {
        headers: getAuthHeaders()
      });
      if (res.status === 401) {
        localStorage.removeItem("businessUser");
        localStorage.removeItem("businessToken");
        setLocation("/business");
        return [];
      }
      return res.json();
    },
    enabled: !!companyId,
    refetchInterval: 5000,
  });

  const { data: employees = [], refetch: refetchEmployees } = useQuery({
    queryKey: ["/api/business/company", companyId, "employees"],
    queryFn: async () => {
      if (!companyId) return [];
      const res = await fetch(`/api/business/company/${companyId}/employees`, {
        headers: getAuthHeaders()
      });
      return res.json();
    },
    enabled: !!companyId && isAdmin,
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/business/company", companyId, "stats"],
    queryFn: async () => {
      if (!companyId) return { totalRides: 0, totalSpent: 0, thisMonthRides: 0, thisMonthSpent: 0 };
      const res = await fetch(`/api/business/company/${companyId}/stats`, {
        headers: getAuthHeaders()
      });
      return res.json();
    },
    enabled: !!companyId,
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["/api/business/company", companyId, "invoices"],
    queryFn: async () => {
      if (!companyId) return [];
      const res = await fetch(`/api/business/company/${companyId}/invoices`, {
        headers: getAuthHeaders()
      });
      return res.json();
    },
    enabled: !!companyId && isAdmin,
  });

  const { data: ksefStatus } = useQuery({
    queryKey: ["/api/ksef/status"],
    queryFn: async () => {
      const res = await fetch("/api/ksef/status");
      return res.json();
    },
    enabled: !!companyId && isAdmin,
  });

  // Query dla kierowców w pobliżu
  interface NearbyDriver {
    id: string;
    name: string;
    photoUrl: string | null;
    vehiclePlate: string;
    vehicleModel: string | null;
    vehicleColor: string | null;
    languages: string[];
    currentRateCity: number;
    rateType: "day" | "night" | "holiday";
    distanceToPickup?: number | null;
    distance?: number;
    estimatedTime?: number;
    estimatedPrice?: number | null;
  }

  const pickupLat = pickupPlace?.geometry?.location?.lat();
  const pickupLng = pickupPlace?.geometry?.location?.lng();
  const destLat = destinationPlace?.geometry?.location?.lat();
  const destLng = destinationPlace?.geometry?.location?.lng();

  const nearbyQueryParams = new URLSearchParams();
  if (pickupLat && pickupLng) {
    nearbyQueryParams.set("pickupLat", String(pickupLat));
    nearbyQueryParams.set("pickupLng", String(pickupLng));
  }
  if (destLat && destLng) {
    nearbyQueryParams.set("destLat", String(destLat));
    nearbyQueryParams.set("destLng", String(destLng));
  }

  const { data: nearbyDrivers = [], isLoading: isLoadingDrivers } = useQuery<NearbyDriver[]>({
    queryKey: ["/api/drivers/nearby", nearbyQueryParams.toString()],
    queryFn: async () => {
      const res = await fetch(`/api/drivers/nearby?${nearbyQueryParams.toString()}`);
      return res.json();
    },
    refetchInterval: 10000,
  });

  const sortedDrivers = [...nearbyDrivers].filter(d => !d.distance || d.distance <= 10000).sort((a, b) => {
    const distA = a.distanceToPickup ?? a.distance ?? Infinity;
    const distB = b.distanceToPickup ?? b.distance ?? Infinity;
    if (distA !== distB) return distA - distB;
    const priceA = a.estimatedPrice ?? Infinity;
    const priceB = b.estimatedPrice ?? Infinity;
    return priceA - priceB;
  });

  const bookForm = useForm<BookRideForm>({
    resolver: zodResolver(bookRideSchema),
    defaultValues: {
      pickupLocation: "",
      destination: "",
      passengerCount: 1,
      guestName: "",
      guestPhone: "",
      roomNumber: "",
      costCenter: "",
      notes: "",
    },
  });

  const employeeForm = useForm<EmployeeForm>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      phone: "",
      role: "employee",
    },
  });

  useAutocomplete(pickupRef, (place) => {
    if (place.formatted_address) {
      bookForm.setValue("pickupLocation", place.formatted_address);
    }
  });

  useAutocomplete(destRef, (place) => {
    if (place.formatted_address) {
      bookForm.setValue("destination", place.formatted_address);
    }
  });

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
                bookForm.setValue("pickupLocation", results[0].formatted_address || "");
                setPickupPlace({ geometry: { location: { lat: () => latitude, lng: () => longitude } } });
              } else {
                bookForm.setValue("pickupLocation", `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
              }
            }
          );
        } else {
          setIsLocating(false);
          bookForm.setValue("pickupLocation", `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        }
      },
      (error) => {
        setIsLocating(false);
        toast({ title: "Błąd", description: "Nie udało się pobrać lokalizacji", variant: "destructive" });
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 }
    );
  };

  const bookMutation = useMutation({
    mutationFn: async (data: BookRideForm) => {
      const res = await apiRequest("POST", "/api/business/rides", {
        ride: {
          pickupLocation: data.pickupLocation,
          destination: data.destination,
          passengerCount: data.passengerCount,
          orderSource: "business",
        },
        businessRide: {
          companyId,
          employeeId: user?.type === "employee" ? user.id : undefined,
          guestName: data.guestName,
          guestPhone: data.guestPhone,
          roomNumber: data.roomNumber,
          costCenter: data.costCenter,
          notes: data.notes,
        },
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Zamówienie utworzone", description: "Teraz wybierz kierowcę z listy poniżej" });
      setPendingRideId(data.ride?.id || data.id);
    },
    onError: () => {
      toast({ title: "Błąd", description: "Nie udało się zamówić taksówki", variant: "destructive" });
    },
  });

  const assignDriverMutation = useMutation({
    mutationFn: async ({ rideId, driverId, estimatedPrice }: { rideId: string; driverId: string; estimatedPrice?: number }) => {
      setAssigningDriverId(driverId);
      const res = await apiRequest("PATCH", `/api/rides/${rideId}/select-driver`, {
        preferredDriverId: driverId,
        estimatedPrice,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Kierowca wybrany", description: "Zlecenie wysłane do kierowcy — czekaj na akceptację" });
      setPendingRideId(null);
      setAssigningDriverId(null);
      setBookDialogOpen(false);
      bookForm.reset();
      refetchRides();
    },
    onError: () => {
      setAssigningDriverId(null);
      toast({ title: "Błąd", description: "Nie udało się przypisać kierowcy", variant: "destructive" });
    },
  });

  const addEmployeeMutation = useMutation({
    mutationFn: async (data: EmployeeForm) => {
      const res = await apiRequest("POST", `/api/business/company/${companyId}/employees`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Pracownik dodany" });
      setEmployeeDialogOpen(false);
      employeeForm.reset();
      refetchEmployees();
    },
    onError: () => {
      toast({ title: "Błąd", description: "Nie udało się dodać pracownika", variant: "destructive" });
    },
  });

  const deleteEmployeeMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/business/employees/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Pracownik usunięty" });
      refetchEmployees();
    },
  });

  const generateInvoiceMutation = useMutation({
    mutationFn: async () => {
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      const res = await apiRequest("POST", `/api/business/company/${companyId}/invoices/generate`, {
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Faktura wygenerowana" });
      queryClient.invalidateQueries({ queryKey: ["/api/business/company", companyId, "invoices"] });
    },
    onError: () => {
      toast({ title: "Błąd", description: "Brak przejazdów do zafakturowania", variant: "destructive" });
    },
  });

  const ksefSubmitMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      const res = await apiRequest("POST", `/api/business/invoices/${invoiceId}/ksef-submit`);
      return res.json();
    },
    onSuccess: (data: any) => {
      if (data.success) {
        toast({ title: "Wysłano do KSeF", description: data.ksefNumber ? `Nr referencyjny: ${data.ksefNumber}` : "Faktura wysłana pomyślnie" });
      } else {
        toast({ title: "KSeF", description: data.error || "Nie skonfigurowano KSeF", variant: "destructive" });
      }
    },
    onError: () => {
      toast({ title: "Błąd", description: "Nie udało się wysłać do KSeF", variant: "destructive" });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { name: string; email: string; phone: string; address: string; taxId: string }) => {
      if (user?.type === "company") {
        const res = await apiRequest("PATCH", `/api/business/company/${user.id}`, data);
        return res.json();
      } else if (user?.type === "employee" && user.id) {
        const res = await apiRequest("PATCH", `/api/business/my-profile`, data);
        return res.json();
      }
    },
    onSuccess: (updatedUser) => {
      toast({ title: "Profil zaktualizowany", description: "Dane zostały zapisane" });
      if (updatedUser) {
        const newUser = { ...user, ...updatedUser };
        setUser(newUser as BusinessUser);
        localStorage.setItem("businessUser", JSON.stringify(newUser));
      }
      setShowEditProfileDialog(false);
    },
    onError: () => {
      toast({ title: "Błąd", description: "Nie udało się zaktualizować profilu", variant: "destructive" });
    },
  });

  const handleLogout = () => {
    localStorage.removeItem("businessUser");
    setLocation("/business");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Oczekuje</Badge>;
      case "accepted":
        return <Badge className="bg-blue-500">Przyjęte</Badge>;
      case "in_progress":
        return <Badge className="bg-yellow-500">W trakcie</Badge>;
      case "completed":
        return <Badge className="bg-green-500">Zakończone</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Anulowane</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <a href="/" className="flex items-center gap-2" data-testid="link-back-home">
              <Building2 className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">
                <span className="text-primary">Taxi</span>Q Business
              </h1>
            </a>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {user.name} {user.type === "employee" && `(${user.companyName})`}
            </span>
            <Button variant="outline" size="sm" onClick={handleLogout} data-testid="button-logout">
              <LogOut className="h-4 w-4 mr-2" />
              Wyloguj
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Przejazdy ogółem</CardDescription>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Car className="h-5 w-5 text-primary" />
                {stats?.totalRides || 0}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Wydatki ogółem</CardDescription>
              <CardTitle className="text-2xl flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                {(stats?.totalSpent || 0)} zł
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Ten miesiąc</CardDescription>
              <CardTitle className="text-2xl flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                {stats?.thisMonthRides || 0} przejazdów
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Wydatki w tym miesiącu</CardDescription>
              <CardTitle className="text-2xl flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                {(stats?.thisMonthSpent || 0)} zł
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); setPendingRideId(null); setAssigningDriverId(null); }}>
          <TabsList className="mb-4">
            <TabsTrigger value="book" data-testid="tab-book">
              <Car className="h-4 w-4 mr-2" />
              Zamów taksówkę
            </TabsTrigger>
            <TabsTrigger value="history" data-testid="tab-history">
              <FileText className="h-4 w-4 mr-2" />
              Historia
            </TabsTrigger>
            <TabsTrigger value="profile" data-testid="tab-profile">
              <User className="h-4 w-4 mr-2" />
              Profil
            </TabsTrigger>
            {isAdmin && (
              <>
                <TabsTrigger value="employees" data-testid="tab-employees">
                  <Users className="h-4 w-4 mr-2" />
                  Pracownicy
                </TabsTrigger>
                <TabsTrigger value="invoices" data-testid="tab-invoices">
                  <Receipt className="h-4 w-4 mr-2" />
                  Faktury
                </TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="book">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Lewa kolumna - formularz + lista kierowców */}
              <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Zamów taksówkę dla gościa</CardTitle>
                  <CardDescription>
                    {user.type === "company" && user.companyType === "hotel" 
                      ? "Zamów taksówkę dla gościa hotelowego" 
                      : "Zamów taksówkę dla pracownika lub gościa"}
                  </CardDescription>
                  <div className="flex items-center gap-2 mt-2 px-4 py-2 rounded-lg bg-primary/10 border border-primary/20">
                    <Phone className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm text-muted-foreground">Zamów przez telefon:</span>
                    <a 
                      href="tel:+48732125585" 
                      className="text-sm font-semibold text-primary hover:underline"
                      data-testid="link-phone-order-dashboard"
                    >
                      +48 732 125 585
                    </a>
                    <span className="text-xs text-muted-foreground ml-1">24/7</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <Form {...bookForm}>
                    <form onSubmit={bookForm.handleSubmit((data) => bookMutation.mutate(data))} className="space-y-4">
                      {/* Miejsce odbioru z przyciskiem lokalizacji */}
                      <FormField
                        control={bookForm.control}
                        name="pickupLocation"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-primary" />
                              Miejsce odbioru
                            </FormLabel>
                            <div className="flex gap-2">
                              <FormControl className="flex-1">
                                <AddressInput
                                  value={field.value}
                                  onChange={field.onChange}
                                  onPlaceSelect={(place) => {
                                    setPickupPlace(place);
                                    if (place.formatted_address) {
                                      field.onChange(place.formatted_address);
                                    }
                                  }}
                                  placeholder="Wpisz adres odbioru..."
                                  data-testid="input-business-pickup"
                                />
                              </FormControl>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={getCurrentLocation}
                                disabled={isLocating}
                                data-testid="button-current-location"
                              >
                                {isLocating ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Crosshair className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Cel podróży */}
                      <FormField
                        control={bookForm.control}
                        name="destination"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-primary" />
                              Cel podróży
                            </FormLabel>
                            <FormControl>
                              <AddressInput
                                value={field.value}
                                onChange={field.onChange}
                                onPlaceSelect={(place) => {
                                  setDestinationPlace(place);
                                  if (place.formatted_address) {
                                    field.onChange(place.formatted_address);
                                  }
                                }}
                                placeholder="Wpisz adres docelowy..."
                                data-testid="input-business-destination"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={bookForm.control}
                        name="guestName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Imię gościa</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder="Jan Kowalski" 
                                data-testid="input-guest-name"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={bookForm.control}
                        name="guestPhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Telefon gościa</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder="+48 600 123 456" 
                                data-testid="input-guest-phone"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={bookForm.control}
                        name="roomNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nr pokoju / dział</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder="101" 
                                data-testid="input-room-number"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={bookForm.control}
                        name="passengerCount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Liczba pasażerów</FormLabel>
                            <Select 
                              onValueChange={(v) => field.onChange(parseInt(v))} 
                              defaultValue={String(field.value)}
                            >
                              <FormControl>
                                <SelectTrigger data-testid="select-passengers">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {[1,2,3,4,5,6,7,8].map(n => (
                                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={bookForm.control}
                        name="costCenter"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Centrum kosztów (opcjonalnie)</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder="CC-001" 
                                data-testid="input-cost-center"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    {pendingRideId && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/30">
                        <Check className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium text-primary">
                          Zamówienie utworzone — wybierz kierowcę z listy poniżej
                        </span>
                      </div>
                    )}
                    <FormField
                      control={bookForm.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Uwagi</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              placeholder="Dodatkowe informacje dla kierowcy..." 
                              data-testid="input-notes"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <div className="flex items-center justify-center gap-6 flex-wrap pt-4">
                      <a 
                        href="https://play.google.com/store/apps/details?id=pl.taxiq.passenger"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 px-5 py-3 rounded-lg border border-primary/30 bg-primary/5 cursor-pointer hover-elevate transition-all no-underline"
                        data-testid="link-google-play"
                      >
                        <SiGoogleplay className="h-6 w-6 text-primary" />
                        <div className="flex flex-col">
                          <span className="text-[10px] text-muted-foreground leading-tight">Pobierz z</span>
                          <span className="text-sm font-semibold leading-tight">Google Play</span>
                        </div>
                      </a>

                      <Button 
                        type="submit" 
                        disabled={bookMutation.isPending || !!pendingRideId}
                        data-testid="button-book-taxi"
                        size="lg"
                        className="px-8"
                      >
                        {bookMutation.isPending ? "Zamawianie..." : pendingRideId ? "Wybierz kierowcę ↓" : "Zamów taksówkę"}
                      </Button>

                      <div 
                        className="flex items-center gap-3 px-5 py-3 rounded-lg border border-primary/30 bg-primary/5 cursor-pointer hover-elevate transition-all"
                        data-testid="link-app-store"
                      >
                        <SiAppstore className="h-6 w-6 text-primary" />
                        <div className="flex flex-col">
                          <span className="text-[10px] text-muted-foreground leading-tight">Pobierz z</span>
                          <span className="text-sm font-semibold leading-tight">App Store</span>
                        </div>
                      </div>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Lista kierowców pod formularzem */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Car className="h-5 w-5 text-primary" />
                  {pendingRideId ? "Wybierz kierowcę dla zlecenia" : "Dostępni kierowcy"}
                </CardTitle>
                <CardDescription>
                  {!pendingRideId
                    ? "Najpierw zamów taksówkę, potem wybierz kierowcę"
                    : sortedDrivers.length > 0 
                      ? `${sortedDrivers.length} dostępnych kierowców — kliknij aby wysłać zlecenie`
                      : "Brak dostępnych kierowców w pobliżu"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingDrivers ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : sortedDrivers.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <Car className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Brak dostępnych kierowców</p>
                    <p className="text-xs mt-1">Sprawdź ponownie za chwilę</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-2">
                      {sortedDrivers.map((driver) => {
                        const isAssigning = assigningDriverId === driver.id;
                        const firstName = driver.name.split(" ")[0];
                        return (
                          <div 
                            key={driver.id}
                            className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                              pendingRideId
                                ? "cursor-pointer border-border hover:border-primary/50 hover:bg-primary/5"
                                : "cursor-default border-border opacity-60"
                            } ${isAssigning ? "border-primary bg-primary/10 ring-1 ring-primary" : ""}`}
                            onClick={() => {
                              if (pendingRideId && !assignDriverMutation.isPending) {
                                assignDriverMutation.mutate({
                                  rideId: pendingRideId,
                                  driverId: driver.id,
                                  estimatedPrice: driver.estimatedPrice,
                                });
                              }
                            }}
                            data-testid={`driver-row-${driver.id}`}
                          >
                            <div className="flex items-center gap-3">
                              {driver.photoUrl ? (
                                <img 
                                  src={driver.photoUrl} 
                                  alt={firstName}
                                  className="w-10 h-10 rounded-full object-cover border border-border"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                                  <User className="w-5 h-5 text-primary" />
                                </div>
                              )}
                              <div>
                                <div className="font-medium text-sm">{firstName}</div>
                                <div className="text-xs text-muted-foreground flex items-center gap-2">
                                  {driver.vehicleModel && <span>{driver.vehicleModel}</span>}
                                  {driver.vehicleColor && (
                                    <>
                                      {driver.vehicleModel && <span>·</span>}
                                      <span>{driver.vehicleColor}</span>
                                    </>
                                  )}
                                  {driver.distanceToPickup != null && (
                                    <>
                                      {(driver.vehicleModel || driver.vehicleColor) && <span>·</span>}
                                      <span className="flex items-center gap-1">
                                        <Navigation className="w-3 h-3" />
                                        {driver.distanceToPickup.toFixed(1)} km
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <div className="text-sm font-semibold text-primary">
                                  {driver.estimatedPrice != null && driver.estimatedPrice > 0 
                                    ? `~${driver.estimatedPrice} zł` 
                                    : "0 zł"}
                                </div>
                                <div className="text-[10px] text-muted-foreground">przybliżona cena</div>
                              </div>
                              {isAssigning && (
                                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
            </div>

              {/* Prawa kolumna - Mapa z kierowcami */}
              <Card className="h-fit lg:sticky lg:top-4">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    Dostępni kierowcy w pobliżu
                  </CardTitle>
                  <CardDescription>
                    Kierowcy w okolicy miejsca odbioru
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px] rounded-lg overflow-hidden">
                    <NearbyTaxisMap 
                      pickupLat={pickupLat || null} 
                      pickupLng={pickupLng || null} 
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Historia przejazdów</CardTitle>
                <CardDescription>Wszystkie zamówione przejazdy</CardDescription>
              </CardHeader>
              <CardContent>
                {rides.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Brak przejazdów</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Gość</TableHead>
                        <TableHead>Trasa</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Cena</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rides.map((br: any) => (
                        <TableRow key={br.id} data-testid={`row-ride-${br.id}`}>
                          <TableCell>
                            {br.createdAt ? new Date(br.createdAt).toLocaleString("pl-PL") : "-"}
                          </TableCell>
                          <TableCell>
                            <div>
                              {br.guestName || "Bez nazwy"}
                              {br.roomNumber && <span className="text-muted-foreground ml-2">(pok. {br.roomNumber})</span>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {br.ride?.pickupLocation}
                              </div>
                              <div className="text-muted-foreground">
                                → {br.ride?.destination}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(br.ride?.status || "pending")}</TableCell>
                          <TableCell>
                            {br.ride?.finalPrice 
                              ? `${br.ride.finalPrice} zł`
                              : br.ride?.estimatedPrice 
                                ? `~${br.ride.estimatedPrice} zł`
                                : "-"
                            }
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {isAdmin && (
            <TabsContent value="employees">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
                  <div>
                    <CardTitle>Pracownicy</CardTitle>
                    <CardDescription>Zarządzaj pracownikami firmy</CardDescription>
                  </div>
                  <Dialog open={employeeDialogOpen} onOpenChange={setEmployeeDialogOpen}>
                    <DialogTrigger asChild>
                      <Button data-testid="button-add-employee">
                        <Plus className="h-4 w-4 mr-2" />
                        Dodaj pracownika
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Nowy pracownik</DialogTitle>
                        <DialogDescription>
                          Dodaj nowego pracownika do systemu
                        </DialogDescription>
                      </DialogHeader>
                      <Form {...employeeForm}>
                        <form onSubmit={employeeForm.handleSubmit((data) => addEmployeeMutation.mutate(data))} className="space-y-4">
                          <FormField
                            control={employeeForm.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Imię i nazwisko</FormLabel>
                                <FormControl>
                                  <Input {...field} data-testid="input-employee-name" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={employeeForm.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                  <Input type="email" {...field} data-testid="input-employee-email" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={employeeForm.control}
                            name="password"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Hasło</FormLabel>
                                <FormControl>
                                  <Input type="password" {...field} data-testid="input-employee-password" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={employeeForm.control}
                            name="phone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Telefon (opcjonalnie)</FormLabel>
                                <FormControl>
                                  <Input {...field} data-testid="input-employee-phone" />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={employeeForm.control}
                            name="role"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Rola</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-employee-role">
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="employee">Pracownik</SelectItem>
                                    <SelectItem value="admin">Administrator</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )}
                          />
                          <DialogFooter>
                            <Button type="submit" disabled={addEmployeeMutation.isPending} data-testid="button-submit-employee">
                              {addEmployeeMutation.isPending ? "Dodawanie..." : "Dodaj pracownika"}
                            </Button>
                          </DialogFooter>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  {employees.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">Brak pracowników</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Imię</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Telefon</TableHead>
                          <TableHead>Rola</TableHead>
                          <TableHead>Akcje</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {employees.map((emp: any) => (
                          <TableRow key={emp.id} data-testid={`row-employee-${emp.id}`}>
                            <TableCell>{emp.name}</TableCell>
                            <TableCell>{emp.email}</TableCell>
                            <TableCell>{emp.phone || "-"}</TableCell>
                            <TableCell>
                              <Badge variant={emp.role === "admin" ? "default" : "secondary"}>
                                {emp.role === "admin" ? "Admin" : "Pracownik"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => deleteEmployeeMutation.mutate(emp.id)}
                                data-testid={`button-delete-employee-${emp.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="invoices">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
                  <div>
                    <CardTitle>Faktury</CardTitle>
                    <CardDescription>Historia faktur za przejazdy</CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button onClick={() => generateInvoiceMutation.mutate()} disabled={generateInvoiceMutation.isPending} data-testid="button-generate-invoice">
                      <Receipt className="h-4 w-4 mr-2" />
                      {generateInvoiceMutation.isPending ? "Generowanie..." : "Generuj fakturę za poprzedni miesiąc"}
                    </Button>
                    <Badge variant={ksefStatus?.configured ? "default" : "secondary"} className="text-xs" data-testid="badge-ksef-status">
                      KSeF: {ksefStatus?.configured ? `Aktywny (${ksefStatus.environment})` : "Nieskonfigurowany"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {invoices.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">Brak faktur</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nr faktury</TableHead>
                          <TableHead>Okres</TableHead>
                          <TableHead>Przejazdy</TableHead>
                          <TableHead>Kwota</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Termin płatności</TableHead>
                          <TableHead>KSeF</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoices.map((inv: any) => (
                          <TableRow key={inv.id} data-testid={`row-invoice-${inv.id}`}>
                            <TableCell className="font-mono">{inv.invoiceNumber}</TableCell>
                            <TableCell>
                              {new Date(inv.periodStart).toLocaleDateString("pl-PL")} - {new Date(inv.periodEnd).toLocaleDateString("pl-PL")}
                            </TableCell>
                            <TableCell>{inv.rideCount}</TableCell>
                            <TableCell className="font-semibold">{Number(inv.totalAmount).toFixed(2)} zł</TableCell>
                            <TableCell>
                              <Badge variant={inv.status === "paid" ? "default" : inv.status === "overdue" ? "destructive" : "secondary"}>
                                {inv.status === "paid" ? "Opłacona" : inv.status === "overdue" ? "Zaległa" : "Oczekuje"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("pl-PL") : "-"}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => ksefSubmitMutation.mutate(inv.id)}
                                  disabled={ksefSubmitMutation.isPending}
                                  title="Wyślij do KSeF"
                                  data-testid={`button-ksef-submit-${inv.id}`}
                                >
                                  <Send className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => window.open(`/api/business/invoices/${inv.id}/ksef-xml`, '_blank')}
                                  title="Podgląd XML"
                                  data-testid={`button-ksef-xml-${inv.id}`}
                                >
                                  <FileCode className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="profile">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    Mój profil
                  </CardTitle>
                  <CardDescription>
                    {user?.type === "company" ? "Dane firmy" : "Dane pracownika"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Imię i nazwisko / Firma</p>
                      <p className="font-medium" data-testid="text-profile-name">{user?.name || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium" data-testid="text-profile-email">{user?.email || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Telefon</p>
                      <p className="font-medium" data-testid="text-profile-phone">{user?.phone || "-"}</p>
                    </div>
                    {user?.type === "company" && (
                      <>
                        <div>
                          <p className="text-sm text-muted-foreground">NIP</p>
                          <p className="font-medium">{user?.taxId || "-"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Adres</p>
                          <p className="font-medium">{user?.address || "-"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Typ</p>
                          <p className="font-medium">{(user as any).companyType === "hotel" ? "Hotel" : "Firma"}</p>
                        </div>
                      </>
                    )}
                    {user?.type === "employee" && (
                      <div>
                        <p className="text-sm text-muted-foreground">Rola</p>
                        <p className="font-medium">{user?.role === "admin" ? "Administrator" : "Pracownik"}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter>
                  <Dialog open={showEditProfileDialog} onOpenChange={setShowEditProfileDialog}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="gap-2"
                        data-testid="button-edit-profile"
                        onClick={() => {
                          setEditProfileForm({
                            name: user?.name || "",
                            email: user?.email || "",
                            phone: user?.phone || "",
                            address: user?.address || "",
                            taxId: user?.taxId || "",
                          });
                        }}
                      >
                        <Edit className="h-4 w-4" />
                        Edytuj profil
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edytuj profil</DialogTitle>
                        <DialogDescription>
                          Zmiana email lub telefonu wymaga ponownej weryfikacji
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Imię i nazwisko / Nazwa</label>
                          <Input
                            value={editProfileForm.name}
                            onChange={(e) => setEditProfileForm(prev => ({ ...prev, name: e.target.value }))}
                            data-testid="input-profile-name"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Email</label>
                          <Input
                            type="email"
                            value={editProfileForm.email}
                            onChange={(e) => setEditProfileForm(prev => ({ ...prev, email: e.target.value }))}
                            data-testid="input-profile-email"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Telefon</label>
                          <Input
                            value={editProfileForm.phone}
                            onChange={(e) => setEditProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                            data-testid="input-profile-phone"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Adres</label>
                          <Input
                            value={editProfileForm.address}
                            onChange={(e) => setEditProfileForm(prev => ({ ...prev, address: e.target.value }))}
                            data-testid="input-profile-address"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">NIP</label>
                          <Input
                            value={editProfileForm.taxId}
                            onChange={(e) => setEditProfileForm(prev => ({ ...prev, taxId: e.target.value }))}
                            data-testid="input-profile-nip"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button 
                          variant="outline" 
                          onClick={() => setShowEditProfileDialog(false)}
                          data-testid="button-cancel-edit"
                        >
                          Anuluj
                        </Button>
                        <Button
                          onClick={() => updateProfileMutation.mutate(editProfileForm)}
                          disabled={updateProfileMutation.isPending}
                          data-testid="button-save-profile"
                        >
                          {updateProfileMutation.isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Zapisuję...
                            </>
                          ) : (
                            "Zapisz"
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
