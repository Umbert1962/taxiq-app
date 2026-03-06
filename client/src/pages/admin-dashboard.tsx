import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Settings, Users, Car, Briefcase, LogOut, Loader2, Trash2, 
  TrendingUp, MapPin, Clock, AlertCircle, AlertTriangle, RefreshCw, Pencil, Key, CheckCircle2, ImageOff, ShieldCheck,
  ChevronDown, ChevronUp, Mail, Phone, CreditCard, Calendar, Ban, ShieldOff, Plus, Banknote, Check, X, Upload, Lock, Eye, EyeOff, Share2, Globe, Star, Search, Map
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import AdminSystemMessages from "@/components/admin-system-messages";
import AdminDriverVerification from "@/components/admin-driver-verification";
import { useGoogleMaps } from "@/hooks/use-google-maps";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleAdminError = (fallbackMessage: string) => (error: any) => {
    const msg = error?.message || "";
    if (msg.startsWith("401")) {
      toast({ title: "Sesja wygasła", description: "Zaloguj się ponownie.", variant: "destructive" });
      setLocation("/admin");
      return;
    }
    toast({ title: "Błąd", description: fallbackMessage, variant: "destructive" });
  };
  const [activeTab, setActiveTab] = useState("overview");
  
  // Edit states
  const [editingDriver, setEditingDriver] = useState<any>(null);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editingCompany, setEditingCompany] = useState<any>(null);
  
  // Password reset states
  const [resetPasswordUser, setResetPasswordUser] = useState<any>(null);
  const [resetPasswordDriver, setResetPasswordDriver] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");
  
  // Search state
  const [driverSearch, setDriverSearch] = useState("");
  
  // Expanded rows state
  const [expandedDrivers, setExpandedDrivers] = useState<Set<string>>(new Set());
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  
  // Ride history dialog state
  const [rideHistoryDialog, setRideHistoryDialog] = useState<{
    open: boolean;
    type: "passenger" | "driver";
    id: string;
    name: string;
  } | null>(null);
  
  const toggleDriverExpand = (driverId: string) => {
    setExpandedDrivers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(driverId)) {
        newSet.delete(driverId);
      } else {
        newSet.add(driverId);
      }
      return newSet;
    });
  };
  
  const toggleUserExpand = (userId: string) => {
    setExpandedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const { data: session, isLoading: loadingSession } = useQuery({
    queryKey: ["/api/admin/session"],
    queryFn: async () => {
      const res = await fetch("/api/admin/session", { credentials: "include" });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`${res.status}: ${text || "Nie zalogowany"}`);
      }
      return res.json();
    },
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (!loadingSession && !session) {
      setLocation("/admin");
    }
  }, [loadingSession, session, setLocation]);

  const { data: stats, isLoading: loadingStats } = useQuery<{
    totalUsers: number;
    onlineUsers: number;
    totalDrivers: number;
    onlineDrivers: number;
    totalCompanies: number;
    totalRides: number;
    completedRides: number;
    pendingRides: number;
    totalRevenue: number;
  }>({
    queryKey: ["/api/admin/stats"],
    enabled: !!session,
    refetchInterval: 5000, // Auto-refresh every 5 seconds
  });

  const { data: users, isLoading: loadingUsers, refetch: refetchUsers } = useQuery({
    queryKey: ["/api/admin/users"],
    enabled: !!session && activeTab === "users",
  });

  const { data: drivers, isLoading: loadingDrivers, refetch: refetchDrivers } = useQuery({
    queryKey: ["/api/admin/drivers"],
    enabled: !!session && (activeTab === "drivers" || activeTab === "map"),
    refetchInterval: (activeTab === "drivers" || activeTab === "map") ? 5000 : false,
  });

  const { data: companies, isLoading: loadingCompanies } = useQuery({
    queryKey: ["/api/admin/companies"],
    enabled: !!session && activeTab === "companies",
  });

  const { data: rides, isLoading: loadingRides } = useQuery({
    queryKey: ["/api/admin/rides"],
    enabled: !!session && activeTab === "rides",
    refetchInterval: activeTab === "rides" ? 5000 : false, // Auto-refresh every 5 seconds when on rides tab
  });

  // Subscription plans query
  const { data: subscriptionPlans, isLoading: loadingPlans, refetch: refetchPlans } = useQuery<{
    id: string;
    name: string;
    durationDays: number;
    price: number;
    description: string | null;
    isActive: boolean;
    isDefault: boolean;
    createdAt: string;
    updatedAt: string;
  }[]>({
    queryKey: ["/api/admin/subscription-plans"],
    enabled: !!session && (activeTab === "subscriptions" || activeTab === "drivers"),
  });

  // Subscription plan form state
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [newPlan, setNewPlan] = useState({
    name: "",
    durationDays: 30,
    price: 9900,
    description: "",
    isActive: true,
    isDefault: false,
  });
  const [showNewPlanForm, setShowNewPlanForm] = useState(false);

  // System settings query
  const { data: settings, isLoading: loadingSettings, refetch: refetchSettings } = useQuery<Record<string, string>>({
    queryKey: ["/api/admin/settings"],
    enabled: !!session && activeTab === "settings",
  });

  // Payment settings query
  const { data: paymentSettings, isLoading: loadingPaymentSettings, refetch: refetchPaymentSettings } = useQuery<{
    bankAccount: string;
    blikPhone: string;
    recipientName: string;
  }>({
    queryKey: ["/api/payment-settings"],
    enabled: !!session && activeTab === "settings",
  });

  // Payment requests query
  const { data: paymentRequests, isLoading: loadingPaymentRequests, refetch: refetchPaymentRequests } = useQuery<Array<{
    id: string;
    driverId: string;
    driverName: string;
    driverPhone: string;
    amount: number;
    planName: string;
    durationDays: number;
    paymentMethod: string;
    transactionId: string | null;
    status: string;
    createdAt: string;
  }>>({
    queryKey: ["/api/admin/payment-requests"],
    enabled: !!session && activeTab === "payments",
    refetchInterval: activeTab === "payments" ? 5000 : false,
  });

  // Banner text form state
  const [bannerText, setBannerText] = useState("");
  const [bannerActive, setBannerActive] = useState(false);
  const [bannerPriority, setBannerPriority] = useState("normal");
  const [editingBanner, setEditingBanner] = useState(false);

  useEffect(() => {
    if (settings) {
      setBannerText(settings.systemMessage || "");
      setBannerActive(settings.systemMessageActive === "true");
      setBannerPriority(settings.systemMessagePriority || "normal");
    }
  }, [settings]);

  // Payment settings form state
  const [editingPaymentSettings, setEditingPaymentSettings] = useState(false);
  const [paymentSettingsForm, setPaymentSettingsForm] = useState({
    bankAccount: "",
    blikPhone: "",
    recipientName: "",
  });

  // Initialize payment settings form when data loads
  useEffect(() => {
    if (paymentSettings) {
      setPaymentSettingsForm({
        bankAccount: paymentSettings.bankAccount || "",
        blikPhone: paymentSettings.blikPhone || "",
        recipientName: paymentSettings.recipientName || "",
      });
    }
  }, [paymentSettings]);

  // Query for ride history dialog
  const { data: rideHistory, isLoading: loadingRideHistory } = useQuery({
    queryKey: ["/api/admin", rideHistoryDialog?.type === "passenger" ? "users" : "drivers", rideHistoryDialog?.id, "rides"],
    queryFn: async () => {
      if (!rideHistoryDialog) return [];
      const endpoint = rideHistoryDialog.type === "passenger" 
        ? `/api/admin/users/${rideHistoryDialog.id}/rides`
        : `/api/admin/drivers/${rideHistoryDialog.id}/rides`;
      const res = await fetch(endpoint, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch rides");
      return res.json();
    },
    enabled: !!rideHistoryDialog?.open,
  });

  // Update setting mutation
  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      await apiRequest("POST", `/api/admin/settings/${key}`, { value });
    },
    onSuccess: () => {
      toast({ title: "Ustawienie zapisane" });
      refetchSettings();
    },
    onError: handleAdminError("Nie udało się zapisać ustawienia"),
  });

  // Save payment settings mutation
  const savePaymentSettingsMutation = useMutation({
    mutationFn: async (data: { bankAccount: string; blikPhone: string; recipientName: string }) => {
      await apiRequest("PUT", "/api/admin/payment-settings", data);
    },
    onSuccess: () => {
      toast({ title: "Ustawienia płatności zapisane" });
      setEditingPaymentSettings(false);
      refetchPaymentSettings();
    },
    onError: handleAdminError("Nie udało się zapisać ustawień płatności"),
  });

  // Approve payment request mutation
  const approvePaymentMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/admin/payment-requests/${id}/approve`);
    },
    onSuccess: () => {
      toast({ title: "Płatność zatwierdzona", description: "Subskrypcja kierowcy została aktywowana" });
      refetchPaymentRequests();
    },
    onError: handleAdminError("Nie udało się zatwierdzić płatności"),
  });

  // Reject payment request mutation
  const rejectPaymentMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/admin/payment-requests/${id}/reject`);
    },
    onSuccess: () => {
      toast({ title: "Zgłoszenie odrzucone" });
      refetchPaymentRequests();
    },
    onError: handleAdminError("Nie udało się odrzucić zgłoszenia"),
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/admin/logout");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/session"] });
      setLocation("/admin");
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/users/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Konto pasażera dezaktywowane" });
      refetchUsers();
    },
    onError: handleAdminError("Nie udało się dezaktywować użytkownika"),
  });

  const reactivateUserMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/admin/users/${id}/reactivate`);
    },
    onSuccess: () => {
      toast({ title: "Konto pasażera reaktywowane" });
      refetchUsers();
    },
    onError: handleAdminError("Nie udało się reaktywować użytkownika"),
  });

  const deleteDriverMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/drivers/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Konto kierowcy dezaktywowane" });
      refetchDrivers();
    },
    onError: handleAdminError("Nie udało się dezaktywować kierowcy"),
  });

  const reactivateDriverMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/admin/drivers/${id}/reactivate`);
    },
    onSuccess: () => {
      toast({ title: "Konto kierowcy reaktywowane" });
      refetchDrivers();
    },
    onError: handleAdminError("Nie udało się reaktywować kierowcy"),
  });

  const blockUserMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      await apiRequest("POST", `/api/admin/users/${id}/block`, { reason });
    },
    onSuccess: () => {
      toast({ title: "Użytkownik zablokowany" });
      refetchUsers();
    },
    onError: handleAdminError("Nie udało się zablokować użytkownika"),
  });

  const unblockUserMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/admin/users/${id}/unblock`);
    },
    onSuccess: () => {
      toast({ title: "Użytkownik odblokowany" });
      refetchUsers();
    },
    onError: handleAdminError("Nie udało się odblokować użytkownika"),
  });

  const blockDriverMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      await apiRequest("POST", `/api/admin/drivers/${id}/block`, { reason });
    },
    onSuccess: () => {
      toast({ title: "Kierowca zablokowany" });
      refetchDrivers();
    },
    onError: handleAdminError("Nie udało się zablokować kierowcy"),
  });

  const unblockDriverMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/admin/drivers/${id}/unblock`);
    },
    onSuccess: () => {
      toast({ title: "Kierowca odblokowany" });
      refetchDrivers();
    },
    onError: handleAdminError("Nie udało się odblokować kierowcy"),
  });

  const updateDriverMutation = useMutation({
    mutationFn: async (data: { id: string; name: string; username: string; email?: string; phone: string; vehiclePlate: string; vehicleModel: string; taxiLicenseNumber?: string; password?: string; plainPassword?: string }) => {
      await apiRequest("PUT", `/api/admin/drivers/${data.id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Kierowca zaktualizowany" });
      refetchDrivers();
      setEditingDriver(null);
    },
    onError: handleAdminError("Nie udało się zaktualizować kierowcy"),
  });

  const updateUserMutation = useMutation({
    mutationFn: async (data: { id: string; firstName: string; lastName: string; username: string; phone: string; email: string }) => {
      await apiRequest("PUT", `/api/admin/users/${data.id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Użytkownik zaktualizowany" });
      refetchUsers();
      setEditingUser(null);
    },
    onError: handleAdminError("Nie udało się zaktualizować użytkownika"),
  });

  const resetUserPasswordMutation = useMutation({
    mutationFn: async ({ id, newPassword }: { id: string; newPassword: string }) => {
      await apiRequest("POST", `/api/admin/users/${id}/reset-password`, { newPassword });
    },
    onSuccess: () => {
      toast({ title: "Hasło zmienione" });
      refetchUsers();
      setResetPasswordUser(null);
      setNewPassword("");
    },
    onError: handleAdminError("Nie udało się zmienić hasła"),
  });

  const resetDriverPasswordMutation = useMutation({
    mutationFn: async ({ id, newPassword }: { id: string; newPassword: string }) => {
      await apiRequest("POST", `/api/admin/drivers/${id}/reset-password`, { newPassword });
    },
    onSuccess: () => {
      toast({ title: "Hasło zmienione" });
      refetchDrivers();
      setResetPasswordDriver(null);
      setNewPassword("");
    },
    onError: handleAdminError("Nie udało się zmienić hasła"),
  });

  const [uploadingPhotoDriverId, setUploadingPhotoDriverId] = useState<string | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const pendingPhotoDriverIdRef = useRef<string | null>(null);

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const driverId = pendingPhotoDriverIdRef.current;
    if (file && driverId) {
      setUploadingPhotoDriverId(driverId);
      const formData = new FormData();
      formData.append("photo", file);
      fetch(`/api/admin/drivers/${driverId}/upload-photo`, {
        method: "POST",
        body: formData,
        credentials: "include",
      })
        .then(async (res) => {
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || "Upload failed");
          }
          toast({ title: "Zdjęcie wgrane" });
          refetchDrivers();
        })
        .catch((error: any) => {
          const msg = error?.message || "";
          if (msg.startsWith("401") || msg.includes("401")) {
            toast({ title: "Sesja wygasła", description: "Zaloguj się ponownie.", variant: "destructive" });
            setLocation("/admin");
          } else {
            toast({ title: "Błąd", description: error?.message || "Nie udało się wgrać zdjęcia", variant: "destructive" });
          }
        })
        .finally(() => {
          setUploadingPhotoDriverId(null);
          pendingPhotoDriverIdRef.current = null;
        });
    }
    if (photoInputRef.current) {
      photoInputRef.current.value = "";
    }
  };

  const triggerPhotoUpload = (driverId: string) => {
    pendingPhotoDriverIdRef.current = driverId;
    if (photoInputRef.current) {
      photoInputRef.current.click();
    }
  };

  const adminUploadPhotoMutation = useMutation({
    mutationFn: async ({ driverId, file }: { driverId: string; file: File }) => {
      setUploadingPhotoDriverId(driverId);
      const formData = new FormData();
      formData.append("photo", file);
      const res = await fetch(`/api/admin/drivers/${driverId}/upload-photo`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Upload failed");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Zdjęcie wgrane" });
      refetchDrivers();
      setUploadingPhotoDriverId(null);
    },
    onError: (error: any) => {
      const msg = error?.message || "";
      if (msg.startsWith("401")) {
        toast({ title: "Sesja wygasła", description: "Zaloguj się ponownie.", variant: "destructive" });
        setLocation("/admin");
      } else {
        toast({ title: "Błąd", description: error?.message || "Nie udało się wgrać zdjęcia", variant: "destructive" });
      }
      setUploadingPhotoDriverId(null);
    },
  });

  const changeAdminPasswordMutation = useMutation({
    mutationFn: async ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) => {
      const res = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Nie udało się zmienić hasła");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Hasło zmienione" });
      setChangingPassword(false);
      setCurrentPassword("");
      setNewAdminPassword("");
    },
    onError: (error: any) => {
      const msg = error?.message || "";
      if (msg.startsWith("401")) {
        toast({ title: "Sesja wygasła", description: "Zaloguj się ponownie.", variant: "destructive" });
        setLocation("/admin");
      } else {
        toast({ title: "Błąd", description: error?.message || "Nie udało się zmienić hasła", variant: "destructive" });
      }
    },
  });

  const verifyDriverPhotoMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/admin/drivers/${id}/verify-photo`);
    },
    onSuccess: () => {
      toast({ title: "Zdjęcie zweryfikowane", description: "Zdjęcie kierowcy zostało potwierdzone" });
      refetchDrivers();
    },
    onError: handleAdminError("Nie udało się zweryfikować zdjęcia"),
  });

  const verifyDriverMutation = useMutation({
    mutationFn: async ({ driverId, action }: { driverId: string; action: string }) => {
      await apiRequest("POST", `/api/admin/verify-driver/${driverId}`, { action, notes: "" });
    },
    onSuccess: (_, variables) => {
      toast({
        title: variables.action === "approve" ? "Kierowca zatwierdzony" : "Kierowca odrzucony",
        description: variables.action === "approve" 
          ? "Weryfikacja identyfikatora taxi została zatwierdzona" 
          : "Weryfikacja identyfikatora taxi została odrzucona",
      });
      refetchDrivers();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/verification-queue"] });
    },
    onError: handleAdminError("Nie udało się zaktualizować weryfikacji"),
  });

  const { refetch: refetchCompanies } = useQuery({
    queryKey: ["/api/admin/companies"],
    enabled: false,
  });

  const updateCompanyMutation = useMutation({
    mutationFn: async (data: { id: string; name: string; nip: string; address: string; email: string }) => {
      await apiRequest("PUT", `/api/admin/companies/${data.id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Firma zaktualizowana" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/companies"] });
      setEditingCompany(null);
    },
    onError: handleAdminError("Nie udało się zaktualizować firmy"),
  });

  const deleteCompanyMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/companies/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Firma usunięta" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/companies"] });
    },
    onError: handleAdminError("Nie udało się usunąć firmy"),
  });

  useEffect(() => {
    if (!session && !loadingSession) {
      setLocation("/admin");
    }
  }, [session, loadingSession, setLocation]);

  if (loadingSession) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const formatDate = (date: string | Date | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("pl-PL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatPrice = (price: number | null) => {
    if (!price) return "-";
    return `${(price / 100).toFixed(2)} PLN`;
  };

  return (
    <div className="min-h-screen bg-background">
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        style={{ position: 'fixed', top: '-9999px', left: '-9999px', opacity: 0 }}
        onChange={handlePhotoFileChange}
        tabIndex={-1}
        aria-hidden="true"
      />
      <header className="border-b border-border sticky top-0 bg-background z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <a href="/" className="flex items-center gap-2" data-testid="link-back-home">
              <Settings className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold text-primary">Panel Administratora</span>
            </a>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Witaj, {session.name}
            </span>
            <Button variant="outline" size="sm" onClick={() => logoutMutation.mutate()} data-testid="button-logout">
              <LogOut className="h-4 w-4 mr-2" />
              Wyloguj
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex w-full max-w-7xl mb-6 gap-0 px-0.5">
            <TabsTrigger value="overview" data-testid="tab-overview" className="flex-1 px-0 min-w-0">
              <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 sm:mr-1" />
              <span className="hidden lg:inline">Przegląd</span>
            </TabsTrigger>
            <TabsTrigger value="users" data-testid="tab-users" className="flex-1 px-0 min-w-0">
              <Users className="h-5 w-5 sm:h-6 sm:w-6 sm:mr-1" />
              <span className="hidden lg:inline">Pasażerowie</span>
            </TabsTrigger>
            <TabsTrigger value="drivers" data-testid="tab-drivers" className="flex-1 px-0 min-w-0">
              <Car className="h-5 w-5 sm:h-6 sm:w-6 sm:mr-1" />
              <span className="hidden lg:inline">Kierowcy</span>
            </TabsTrigger>
            <TabsTrigger value="verification" data-testid="tab-verification" className="flex-1 px-0 min-w-0">
              <ShieldCheck className="h-5 w-5 sm:h-6 sm:w-6 sm:mr-1" />
              <span className="hidden lg:inline">Weryfikacja</span>
            </TabsTrigger>
            <TabsTrigger value="companies" data-testid="tab-companies" className="flex-1 px-0 min-w-0">
              <Briefcase className="h-5 w-5 sm:h-6 sm:w-6 sm:mr-1" />
              <span className="hidden lg:inline">Firmy</span>
            </TabsTrigger>
            <TabsTrigger value="rides" data-testid="tab-rides" className="flex-1 px-0 min-w-0">
              <MapPin className="h-5 w-5 sm:h-6 sm:w-6 sm:mr-1" />
              <span className="hidden lg:inline">Przejazdy</span>
            </TabsTrigger>
            <TabsTrigger value="subscriptions" data-testid="tab-subscriptions" className="flex-1 px-0 min-w-0">
              <CreditCard className="h-5 w-5 sm:h-6 sm:w-6 sm:mr-1" />
              <span className="hidden lg:inline">Abonamenty</span>
            </TabsTrigger>
            <TabsTrigger value="payments" data-testid="tab-payments" className="flex-1 px-0 min-w-0">
              <Banknote className="h-5 w-5 sm:h-6 sm:w-6 sm:mr-1" />
              <span className="hidden lg:inline">Płatności</span>
            </TabsTrigger>
            <TabsTrigger value="referrals" data-testid="tab-referrals" className="flex-1 px-0 min-w-0">
              <Share2 className="h-5 w-5 sm:h-6 sm:w-6 sm:mr-1" />
              <span className="hidden lg:inline">Polecenia</span>
            </TabsTrigger>
            <TabsTrigger value="settings" data-testid="tab-settings" className="flex-1 px-0 min-w-0">
              <Settings className="h-5 w-5 sm:h-6 sm:w-6 sm:mr-1" />
              <span className="hidden lg:inline">Ustawienia</span>
            </TabsTrigger>
            <TabsTrigger value="system-messages" data-testid="tab-system-messages" className="flex-1 px-0 min-w-0">
              <Mail className="h-5 w-5 sm:h-6 sm:w-6 sm:mr-1" />
              <span className="hidden lg:inline">Komunikaty</span>
            </TabsTrigger>
            <TabsTrigger value="map" data-testid="tab-map" className="flex-1 px-0 min-w-0">
              <Map className="h-5 w-5 sm:h-6 sm:w-6 sm:mr-1" />
              <span className="hidden lg:inline">Mapa</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            {loadingStats ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <div className="grid md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Pasażerowie</CardDescription>
                    <CardTitle className="text-3xl">{stats?.totalUsers || 0}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Users className="h-8 w-8 text-muted-foreground" />
                      <Badge className="bg-green-600 text-white">{stats?.onlineUsers || 0} online</Badge>
                      <Badge variant="secondary">{(stats?.totalUsers || 0) - (stats?.onlineUsers || 0)} offline</Badge>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Kierowcy</CardDescription>
                    <CardTitle className="text-3xl">{stats?.totalDrivers || 0}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Car className="h-8 w-8 text-muted-foreground" />
                      <Badge className="bg-green-600 text-white">{stats?.onlineDrivers || 0} online</Badge>
                      <Badge variant="secondary">{(stats?.totalDrivers || 0) - (stats?.onlineDrivers || 0)} offline</Badge>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Firmy</CardDescription>
                    <CardTitle className="text-3xl">{stats?.totalCompanies || 0}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Briefcase className="h-8 w-8 text-muted-foreground" />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Przejazdy</CardDescription>
                    <CardTitle className="text-3xl">{stats?.totalRides || 0}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-8 w-8 text-muted-foreground" />
                      <Badge variant="secondary">{stats?.completedRides || 0} ukończonych</Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Pasażerowie</CardTitle>
                  <CardDescription>Lista wszystkich zarejestrowanych pasażerów</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => refetchUsers()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Odśwież
                </Button>
              </CardHeader>
              <CardContent>
                {loadingUsers ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(users as any[])?.map((user: any) => (
                      <Collapsible 
                        key={user.id} 
                        open={expandedUsers.has(user.id)}
                        onOpenChange={() => toggleUserExpand(user.id)}
                      >
                        <div className="border rounded-lg overflow-hidden">
                          <CollapsibleTrigger asChild>
                            <div className="flex items-center justify-between p-3 hover-elevate cursor-pointer bg-card" data-testid={`row-user-${user.id}`}>
                              <div className="flex items-center gap-3 flex-1">
                                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                                  <Users className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium truncate">{user.firstName} {user.lastName}</div>
                                  <div className="text-sm text-muted-foreground truncate">{user.username}</div>
                                </div>
                                {user.isActive === false && (
                                  <Badge variant="destructive" className="shrink-0">Nieaktywne</Badge>
                                )}
                                <Badge variant={user.isOnline ? "default" : "secondary"} className="shrink-0">
                                  {user.isOnline ? "Online" : "Offline"}
                                </Badge>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="shrink-0 mx-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setRideHistoryDialog({
                                      open: true,
                                      type: "passenger",
                                      id: user.id,
                                      name: `${user.firstName} ${user.lastName}`
                                    });
                                  }}
                                  data-testid={`button-user-rides-${user.id}`}
                                >
                                  <TrendingUp className="h-4 w-4 mr-1" />
                                  {((user.totalSpent || 0) / 100).toFixed(0)} PLN
                                </Button>
                                {expandedUsers.has(user.id) ? (
                                  <ChevronUp className="h-5 w-5 text-muted-foreground shrink-0" />
                                ) : (
                                  <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
                                )}
                              </div>
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="border-t p-4 bg-muted/30 space-y-4">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <div className="text-muted-foreground flex items-center gap-1">
                                    <Key className="h-3 w-3" /> Login
                                  </div>
                                  <div className="font-medium">{user.username}</div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground flex items-center gap-1">
                                    <Key className="h-3 w-3" /> Hasło
                                  </div>
                                  <div className="font-mono text-xs">{user.plainPassword || "-"}</div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground flex items-center gap-1">
                                    <Mail className="h-3 w-3" /> Email
                                  </div>
                                  <div className="font-medium">{user.email || "-"}</div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground flex items-center gap-1">
                                    <Phone className="h-3 w-3" /> Telefon
                                  </div>
                                  <div className="font-medium">{user.phone || "-"}</div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground flex items-center gap-1">
                                    <MapPin className="h-3 w-3" /> Adres
                                  </div>
                                  <div className="font-medium text-xs">{user.homeAddress || "-"}</div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground flex items-center gap-1">
                                    <Calendar className="h-3 w-3" /> Data rejestracji
                                  </div>
                                  <div className="font-medium">{formatDate(user.createdAt)}</div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground flex items-center gap-1">
                                    <TrendingUp className="h-3 w-3" /> Suma obrotów
                                  </div>
                                  <div className="font-medium">{((user.totalSpent || 0) / 100).toFixed(2)} PLN</div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground flex items-center gap-1">
                                    <Car className="h-3 w-3" /> Liczba przejazdów
                                  </div>
                                  <div className="font-medium">{user.rideCount || 0}</div>
                                </div>
                              </div>
                              <div className="flex gap-2 pt-2 border-t flex-wrap">
                                <Button variant="outline" size="sm" onClick={() => setEditingUser(user)} data-testid={`button-edit-user-${user.id}`}>
                                  <Pencil className="h-4 w-4 mr-1" /> Edytuj
                                </Button>
                                <Button variant="secondary" size="sm" onClick={() => { setResetPasswordUser(user); setNewPassword(""); }} data-testid={`button-reset-password-user-${user.id}`}>
                                  <Key className="h-4 w-4 mr-1" /> Zmień hasło
                                </Button>
                                {user.isBlocked ? (
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="text-green-600 border-green-600"
                                    onClick={() => unblockUserMutation.mutate(user.id)}
                                    disabled={unblockUserMutation.isPending}
                                    data-testid={`button-unblock-user-${user.id}`}
                                  >
                                    <ShieldOff className="h-4 w-4 mr-1" /> Odblokuj
                                  </Button>
                                ) : (
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="outline" size="sm" className="text-orange-600 border-orange-600" data-testid={`button-block-user-${user.id}`}>
                                        <Ban className="h-4 w-4 mr-1" /> Zablokuj
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Zablokuj użytkownika?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Użytkownik {user.username} nie będzie mógł się zalogować. Historia kursów zostanie zachowana.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Anuluj</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => blockUserMutation.mutate({ id: user.id })}>
                                          Zablokuj
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                )}
                                {user.isActive === false ? (
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="text-green-600 border-green-600"
                                    onClick={() => reactivateUserMutation.mutate(user.id)}
                                    disabled={reactivateUserMutation.isPending}
                                    data-testid={`button-reactivate-user-${user.id}`}
                                  >
                                    <RefreshCw className="h-4 w-4 mr-1" /> Reaktywuj
                                  </Button>
                                ) : (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="sm" data-testid={`button-delete-user-${user.id}`}>
                                      <Trash2 className="h-4 w-4 mr-1" /> Dezaktywuj
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Dezaktywuj użytkownika?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Konto użytkownika {user.username} zostanie dezaktywowane. Można je później reaktywować.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Anuluj</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => deleteUserMutation.mutate(user.id)}>
                                        Dezaktywuj
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                                )}
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="sm" className="bg-red-900 hover:bg-red-800" data-testid={`button-permanent-delete-user-${user.id}`}>
                                      <Trash2 className="h-4 w-4 mr-1" /> Usuń trwale
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Trwale usunąć konto?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Konto {user.username} zostanie TRWALE usunięte z bazy danych. Tej operacji nie można cofnąć. Możliwe tylko jeśli konto nie ma żadnych przejazdów.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Anuluj</AlertDialogCancel>
                                      <AlertDialogAction onClick={async () => {
                                        try {
                                          await apiRequest("DELETE", `/api/admin/users/${user.id}/permanent`);
                                          toast({ title: "Konto trwale usunięte" });
                                          refetchUsers();
                                        } catch (err: any) {
                                          toast({ title: "Błąd", description: err?.message || "Nie udało się usunąć konta", variant: "destructive" });
                                        }
                                      }}>
                                        Usuń trwale
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    ))}
                    {(!users || (users as any[]).length === 0) && (
                      <div className="text-center text-muted-foreground py-8">
                        Brak zarejestrowanych pasażerów
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="drivers">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Kierowcy</CardTitle>
                  <CardDescription>Lista wszystkich zarejestrowanych kierowców</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => refetchDrivers()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Odśwież
                </Button>
              </CardHeader>
              <CardContent>
                {loadingDrivers ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <>
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Szukaj kierowcy (nazwisko, imię, telefon)..."
                      value={driverSearch}
                      onChange={(e) => setDriverSearch(e.target.value)}
                      className="pl-9"
                      data-testid="input-driver-search"
                    />
                  </div>
                  <div className="space-y-2">
                    {(drivers as any[])?.slice().sort((a: any, b: any) => {
                      const lastA = a.lastName || "";
                      const lastB = b.lastName || "";
                      if (!lastA && lastB) return 1;
                      if (lastA && !lastB) return -1;
                      return lastA.localeCompare(lastB, "pl");
                    }).filter((driver: any) => {
                      if (!driverSearch.trim()) return true;
                      const q = driverSearch.toLowerCase().trim();
                      return (driver.lastName || "").toLowerCase().includes(q)
                        || (driver.firstName || "").toLowerCase().includes(q)
                        || (driver.phone || "").includes(q);
                    }).map((driver: any) => (
                      <Collapsible 
                        key={driver.id} 
                        open={expandedDrivers.has(driver.id)}
                        onOpenChange={() => toggleDriverExpand(driver.id)}
                      >
                        <div className="border rounded-lg overflow-hidden">
                          <CollapsibleTrigger asChild>
                            <div className="flex items-center justify-between gap-3 p-3 hover-elevate cursor-pointer bg-card" data-testid={`row-driver-${driver.id}`}>
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold text-base truncate">{driver.lastName && driver.firstName ? `${driver.lastName} ${driver.firstName}` : driver.name}</div>
                                </div>
                                <span className="text-sm text-muted-foreground shrink-0">{driver.phone}</span>
                                <span className="text-sm text-muted-foreground shrink-0">{driver.vehiclePlate}</span>
                                {driver.isActive === false && (
                                  <Badge variant="destructive" className="shrink-0">Nieaktywne</Badge>
                                )}
                                <Badge variant={driver.isOnline ? "default" : "secondary"} className="shrink-0">
                                  {driver.isOnline ? "Online" : "Offline"}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="shrink-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setRideHistoryDialog({
                                      open: true,
                                      type: "driver",
                                      id: driver.id,
                                      name: driver.name
                                    });
                                  }}
                                  data-testid={`button-driver-rides-${driver.id}`}
                                >
                                  <TrendingUp className="h-4 w-4 mr-1" />
                                  {formatPrice(driver.totalEarnings)}
                                </Button>
                                {driver.photoUrl ? (
                                  <div className="relative">
                                    <img 
                                      src={driver.photoUrl} 
                                      alt={driver.name} 
                                      className="w-8 h-8 rounded-full object-cover"
                                      data-testid={`img-driver-photo-${driver.id}`}
                                    />
                                    {driver.photoVerifiedAt && (
                                      <CheckCircle2 className="absolute -bottom-1 -right-1 h-3 w-3 text-green-500" />
                                    )}
                                  </div>
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                    <ImageOff className="h-4 w-4 text-muted-foreground" />
                                  </div>
                                )}
                                {expandedDrivers.has(driver.id) ? (
                                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                                ) : (
                                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                                )}
                              </div>
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="border-t p-4 bg-muted/30 space-y-4">
                              {driver.isBlocked && (
                                <div className="p-2 rounded-md bg-destructive/10 border border-destructive/30 text-sm text-destructive flex items-center gap-2">
                                  <Ban className="h-4 w-4 shrink-0" />
                                  <span>Konto zablokowane{driver.blockedReason ? `: ${driver.blockedReason}` : ""}</span>
                                </div>
                              )}
                              {driver.isActive === false && (
                                <div className="p-2 rounded-md bg-orange-500/10 border border-orange-500/30 text-sm text-orange-600 dark:text-orange-400 flex items-center gap-2">
                                  <AlertTriangle className="h-4 w-4 shrink-0" />
                                  <span>Konto dezaktywowane{driver.deactivationReason ? `: ${driver.deactivationReason}` : ""}</span>
                                </div>
                              )}
                              {driver.profileCompleted === false && (
                                <div className="p-2 rounded-md bg-yellow-500/10 border border-yellow-500/30 text-sm text-yellow-600 dark:text-yellow-400 flex items-center gap-2">
                                  <AlertTriangle className="h-4 w-4 shrink-0" />
                                  <span>Profil niekompletny - kierowca nie uzupełnił jeszcze wszystkich danych</span>
                                </div>
                              )}
                              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Dane podstawowe</div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                <div>
                                  <div className="text-muted-foreground flex items-center gap-1">
                                    <Users className="h-3 w-3" /> Login
                                  </div>
                                  <div className="font-medium">{driver.username || "-"}</div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground flex items-center gap-1">
                                    <Key className="h-3 w-3" /> Hasło
                                  </div>
                                  <div className="font-mono text-xs">{driver.plainPassword || "-"}</div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground flex items-center gap-1">
                                    <Mail className="h-3 w-3" /> Email
                                  </div>
                                  <div className="font-medium">{driver.email || "-"}</div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground flex items-center gap-1">
                                    <Phone className="h-3 w-3" /> Telefon
                                  </div>
                                  <div className="font-medium">{driver.phone || "-"}</div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground flex items-center gap-1">
                                    <Car className="h-3 w-3" /> Tablica rej.
                                  </div>
                                  <div className="font-medium">{driver.vehiclePlate || "-"}</div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground flex items-center gap-1">
                                    <Car className="h-3 w-3" /> Model pojazdu
                                  </div>
                                  <div className="font-medium">{driver.vehicleModel || "-"}</div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground flex items-center gap-1">
                                    <CreditCard className="h-3 w-3" /> Numer ID kierowcy
                                  </div>
                                  <div className="font-medium">{driver.taxiLicenseNumber || "-"}</div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground flex items-center gap-1">
                                    <MapPin className="h-3 w-3" /> Gmina wydania
                                  </div>
                                  <div className="font-medium">{driver.licenseIssuingAuthority || "-"}</div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground flex items-center gap-1">
                                    <Globe className="h-3 w-3" /> Języki
                                  </div>
                                  <div className="font-medium">{driver.languages?.length > 0 ? driver.languages.join(", ").toUpperCase() : "-"}</div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground flex items-center gap-1">
                                    <TrendingUp className="h-3 w-3" /> Przejazdy
                                  </div>
                                  <div className="font-medium">{driver.totalRides || 0}</div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground flex items-center gap-1">
                                    <TrendingUp className="h-3 w-3" /> Zarobki
                                  </div>
                                  <div className="font-medium">{formatPrice(driver.totalEarnings)}</div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground flex items-center gap-1">
                                    <Calendar className="h-3 w-3" /> Rejestracja
                                  </div>
                                  <div className="font-medium">{driver.createdAt ? new Date(driver.createdAt).toLocaleDateString('pl-PL') : "-"}</div>
                                </div>
                              </div>

                              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-4 mb-1">Weryfikacja</div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                <div>
                                  <div className="text-muted-foreground">Profil kompletny</div>
                                  <div className="font-medium">{driver.profileCompleted ? "Tak" : "Nie"}</div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground">Zdjęcie zweryfikowane</div>
                                  <div className="font-medium">{driver.photoVerifiedAt ? new Date(driver.photoVerifiedAt).toLocaleDateString('pl-PL') : "Nie"}</div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground">Email zweryfikowany</div>
                                  <div className="font-medium">{driver.emailVerifiedAt ? new Date(driver.emailVerifiedAt).toLocaleDateString('pl-PL') : "Nie"}</div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground">Telefon zweryfikowany</div>
                                  <div className="font-medium">{driver.phoneVerifiedAt ? new Date(driver.phoneVerifiedAt).toLocaleDateString('pl-PL') : "Nie"}</div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground">Regulamin zaakceptowany</div>
                                  <div className="font-medium">{driver.termsAcceptedAt ? new Date(driver.termsAcceptedAt).toLocaleDateString('pl-PL') : "Nie"}</div>
                                </div>
                                <div className="col-span-2">
                                  <div className="text-muted-foreground mb-2">Weryfikacja tożsamości</div>
                                  <div className="flex gap-4">
                                    <div className="flex flex-col items-center">
                                      <div className="text-xs text-muted-foreground mb-1">Identyfikator taxi</div>
                                      {driver.idCardImageUrl ? (
                                        <img
                                          src={driver.idCardImageUrl}
                                          alt="Identyfikator taxi"
                                          className="w-28 h-28 rounded border border-border object-cover cursor-pointer hover:border-primary transition-colors"
                                          onClick={() => window.open(driver.idCardImageUrl, '_blank')}
                                          data-testid={`img-id-card-admin-${driver.id}`}
                                        />
                                      ) : (
                                        <div className="w-28 h-28 rounded border border-dashed border-muted-foreground flex items-center justify-center text-xs text-muted-foreground">Brak</div>
                                      )}
                                    </div>
                                    <div className="flex flex-col items-center">
                                      <div className="text-xs text-muted-foreground mb-1">Zdjęcie kierowcy</div>
                                      {driver.photoUrl ? (
                                        <img
                                          src={driver.photoUrl}
                                          alt="Zdjęcie kierowcy"
                                          className="w-28 h-28 rounded border border-border object-cover cursor-pointer hover:border-primary transition-colors"
                                          onClick={() => window.open(driver.photoUrl, '_blank')}
                                          data-testid={`img-driver-photo-admin-${driver.id}`}
                                        />
                                      ) : (
                                        <div className="w-28 h-28 rounded border border-dashed border-muted-foreground flex items-center justify-center text-xs text-muted-foreground">Brak</div>
                                      )}
                                    </div>
                                  </div>
                                  {(driver.verificationStatus !== "approved") && (driver.idCardImageUrl && driver.photoUrl) && (
                                    <div className="flex items-center gap-2 mt-3" data-testid={`verification-actions-${driver.id}`}>
                                      <Button
                                        size="sm"
                                        className="bg-green-600 hover:bg-green-700"
                                        onClick={() => verifyDriverMutation.mutate({ driverId: driver.id, action: "approve" })}
                                        disabled={verifyDriverMutation.isPending}
                                        data-testid={`button-approve-driver-${driver.id}`}
                                      >
                                        <CheckCircle2 className="h-4 w-4 mr-1" />
                                        Zatwierdź weryfikację
                                      </Button>
                                      <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => verifyDriverMutation.mutate({ driverId: driver.id, action: "reject" })}
                                        disabled={verifyDriverMutation.isPending}
                                        data-testid={`button-reject-driver-${driver.id}`}
                                      >
                                        <Ban className="h-4 w-4 mr-1" />
                                        Odrzuć
                                      </Button>
                                    </div>
                                  )}
                                  {driver.verificationStatus === "approved" && (
                                    <div className="flex items-center gap-2 mt-3">
                                      <span className="text-green-500 text-sm flex items-center gap-1">
                                        <CheckCircle2 className="h-4 w-4" /> Weryfikacja zatwierdzona
                                      </span>
                                      <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => verifyDriverMutation.mutate({ driverId: driver.id, action: "reject" })}
                                        disabled={verifyDriverMutation.isPending}
                                        data-testid={`button-revoke-driver-${driver.id}`}
                                      >
                                        <Ban className="h-4 w-4 mr-1" />
                                        Cofnij weryfikację
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-4 mb-1">Cennik (PLN)</div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                <div>
                                  <div className="text-muted-foreground">Opłata startowa</div>
                                  <div className="font-medium">{driver.baseFare != null ? `${(driver.baseFare / 100).toFixed(2)} zł` : "-"}</div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground">Dzień - miasto</div>
                                  <div className="font-medium">{driver.rateDayCity != null ? `${(driver.rateDayCity / 100).toFixed(2)} zł/km` : "-"}</div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground">Dzień - pozamiejska</div>
                                  <div className="font-medium">{driver.rateDaySuburb != null ? `${(driver.rateDaySuburb / 100).toFixed(2)} zł/km` : "-"}</div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground">Noc - miasto</div>
                                  <div className="font-medium">{driver.rateNightCity != null ? `${(driver.rateNightCity / 100).toFixed(2)} zł/km` : "-"}</div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground">Noc - pozamiejska</div>
                                  <div className="font-medium">{driver.rateNightSuburb != null ? `${(driver.rateNightSuburb / 100).toFixed(2)} zł/km` : "-"}</div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground">Święta - miasto</div>
                                  <div className="font-medium">{driver.rateHolidayCity != null ? `${(driver.rateHolidayCity / 100).toFixed(2)} zł/km` : "-"}</div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground">Święta - pozamiejska</div>
                                  <div className="font-medium">{driver.rateHolidaySuburb != null ? `${(driver.rateHolidaySuburb / 100).toFixed(2)} zł/km` : "-"}</div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground">CITO</div>
                                  <div className="font-medium">{driver.rateCito != null ? `${(driver.rateCito / 100).toFixed(2)} zł/km` : "-"}</div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground">Oczekiwanie / min</div>
                                  <div className="font-medium">{driver.rateWaitingPerMinute != null ? `${(driver.rateWaitingPerMinute / 100).toFixed(2)} zł/min` : "-"}</div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground">Promień pozamiejski</div>
                                  <div className="font-medium">{driver.suburbRadiusKm != null ? `${driver.suburbRadiusKm} km` : "-"}</div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground">Rabat kierowcy</div>
                                  <div className="font-medium">{driver.discountPercent != null ? `${driver.discountPercent}%` : "-"}</div>
                                </div>
                              </div>

                              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-4 mb-1">Abonament</div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                <div>
                                  <div className="text-muted-foreground">Status</div>
                                  <div className="font-medium">
                                    <Badge variant={
                                      driver.subscriptionStatus === "active" ? "default" :
                                      driver.subscriptionStatus === "trial" ? "secondary" :
                                      driver.subscriptionStatus === "suspended" ? "outline" :
                                      "destructive"
                                    } className="text-xs">
                                      {driver.subscriptionStatus === "active" ? "Aktywny" :
                                       driver.subscriptionStatus === "trial" ? "Okres próbny" :
                                       driver.subscriptionStatus === "suspended" ? "Zawieszony" :
                                       driver.subscriptionStatus === "grace" ? "Karencja" :
                                       driver.subscriptionStatus === "expired" ? "Wygasły" :
                                       driver.subscriptionStatus || "-"}
                                    </Badge>
                                  </div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground">Przydzielony plan</div>
                                  <div className="font-medium flex items-center gap-2">
                                    <Select
                                      value={driver.assignedPlanId || "none"}
                                      onValueChange={(value) => {
                                        const planId = value === "none" ? null : value;
                                        apiRequest("PATCH", `/api/admin/drivers/${driver.id}/assign-plan`, { planId }).then(() => {
                                          toast({ title: "Plan przydzielony" });
                                          refetchDrivers();
                                        }).catch(() => {
                                          toast({ title: "Błąd", description: "Nie udało się przydzielić planu", variant: "destructive" });
                                        });
                                      }}
                                    >
                                      <SelectTrigger className="w-48 h-8" data-testid={`select-plan-${driver.id}`} onClick={(e) => e.stopPropagation()}>
                                        <SelectValue placeholder="Wybierz plan" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="none">Brak planu</SelectItem>
                                        {subscriptionPlans?.filter(p => p.isActive).map((plan) => (
                                          <SelectItem key={plan.id} value={plan.id}>
                                            {plan.name} - {(plan.price / 100).toFixed(2)} PLN
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground">Zniżka admina</div>
                                  <div className="font-medium">{driver.subscriptionDiscount ? `${(driver.subscriptionDiscount / 100).toFixed(2)} zł` : "-"}</div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground">Koniec okresu próbnego</div>
                                  <div className="font-medium">{driver.trialEndsAt ? new Date(driver.trialEndsAt).toLocaleDateString('pl-PL') : "-"}</div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground">Koniec abonamentu</div>
                                  <div className="font-medium">{driver.subscriptionEndsAt ? new Date(driver.subscriptionEndsAt).toLocaleDateString('pl-PL') : "-"}</div>
                                </div>
                                {driver.subscriptionStatus === "suspended" && (
                                  <>
                                    <div>
                                      <div className="text-muted-foreground">Zawieszony od</div>
                                      <div className="font-medium">{driver.suspendedAt ? new Date(driver.suspendedAt).toLocaleDateString('pl-PL') : "-"}</div>
                                    </div>
                                    <div>
                                      <div className="text-muted-foreground">Planowany powrót</div>
                                      <div className="font-medium">{driver.suspendedUntil ? new Date(driver.suspendedUntil).toLocaleDateString('pl-PL') : "-"}</div>
                                    </div>
                                    <div>
                                      <div className="text-muted-foreground">Pozostałe dni</div>
                                      <div className="font-medium">{driver.remainingDays || 0}</div>
                                    </div>
                                  </>
                                )}
                                {driver.subscriptionStatus === "grace" && (
                                  <>
                                    <div>
                                      <div className="text-muted-foreground">Karencja nadana przez</div>
                                      <div className="font-medium">{driver.graceGrantedBy || "-"}</div>
                                    </div>
                                    <div>
                                      <div className="text-muted-foreground">Powód karencji</div>
                                      <div className="font-medium">{driver.graceReason || "-"}</div>
                                    </div>
                                  </>
                                )}
                              </div>

                              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-4 mb-1">Polecenia i konto bankowe</div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                <div>
                                  <div className="text-muted-foreground">Kod polecający</div>
                                  <div className="font-mono text-xs font-medium">{driver.taxiLicenseNumber && driver.licenseIssuingAuthority ? `${driver.taxiLicenseNumber}/${driver.licenseIssuingAuthority}` : driver.taxiLicenseNumber || "-"}</div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground">Punkty polecających</div>
                                  <div className="font-medium">{driver.referralPoints || 0}</div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground">Poleceni kierowcy</div>
                                  <div className="font-medium">{driver.referredDriversCount || 0}</div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground">Poleceni pasażerowie</div>
                                  <div className="font-medium">{driver.referredPassengersCount || 0}</div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground">Nr konta bankowego</div>
                                  <div className="font-mono text-xs font-medium">{driver.bankAccountNumber || "-"}</div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground">Właściciel konta</div>
                                  <div className="font-medium">{driver.bankAccountHolder || "-"}</div>
                                </div>
                              </div>

                              {(driver.currentLat || driver.currentLng) && (
                                <>
                                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-4 mb-1">Ostatnia lokalizacja</div>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                    <div>
                                      <div className="text-muted-foreground">Szerokość geo.</div>
                                      <div className="font-mono text-xs">{driver.currentLat || "-"}</div>
                                    </div>
                                    <div>
                                      <div className="text-muted-foreground">Długość geo.</div>
                                      <div className="font-mono text-xs">{driver.currentLng || "-"}</div>
                                    </div>
                                    <div>
                                      <div className="text-muted-foreground">Ostatnia aktualizacja</div>
                                      <div className="font-medium">{driver.lastLocationUpdate ? new Date(driver.lastLocationUpdate).toLocaleString('pl-PL') : "-"}</div>
                                    </div>
                                  </div>
                                </>
                              )}

                              {driver.isBlocked && (
                                <>
                                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-4 mb-1">Blokada</div>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                    <div>
                                      <div className="text-muted-foreground">Zablokowany od</div>
                                      <div className="font-medium">{driver.blockedAt ? new Date(driver.blockedAt).toLocaleDateString('pl-PL') : "-"}</div>
                                    </div>
                                    <div>
                                      <div className="text-muted-foreground">Powód blokady</div>
                                      <div className="font-medium">{driver.blockedReason || "-"}</div>
                                    </div>
                                  </div>
                                </>
                              )}
                              
                              <div className="flex items-center gap-2 pt-2 border-t flex-wrap">
                                <Button variant="outline" size="sm" onClick={() => setEditingDriver(driver)} data-testid={`button-edit-driver-${driver.id}`}>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Edytuj
                                </Button>
                                <Button variant="secondary" size="sm" onClick={() => { setResetPasswordDriver(driver); setNewPassword(""); }} data-testid={`button-reset-password-driver-${driver.id}`}>
                                  <Key className="h-4 w-4 mr-2" />
                                  Zmień hasło
                                </Button>
                                {driver.isBlocked ? (
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="text-green-600 border-green-600"
                                    onClick={() => unblockDriverMutation.mutate(driver.id)}
                                    disabled={unblockDriverMutation.isPending}
                                    data-testid={`button-unblock-driver-${driver.id}`}
                                  >
                                    <ShieldOff className="h-4 w-4 mr-2" /> Odblokuj
                                  </Button>
                                ) : (
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="outline" size="sm" className="text-orange-600 border-orange-600" data-testid={`button-block-driver-${driver.id}`}>
                                        <Ban className="h-4 w-4 mr-2" /> Zablokuj
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Zablokuj kierowcę?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Kierowca {driver.name} nie będzie mógł się zalogować ani przyjmować kursów. Historia kursów zostanie zachowana.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Anuluj</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => blockDriverMutation.mutate({ id: driver.id })}>
                                          Zablokuj
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                )}
                                {driver.isActive === false ? (
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="text-green-600 border-green-600"
                                    onClick={() => reactivateDriverMutation.mutate(driver.id)}
                                    disabled={reactivateDriverMutation.isPending}
                                    data-testid={`button-reactivate-driver-${driver.id}`}
                                  >
                                    <RefreshCw className="h-4 w-4 mr-2" /> Reaktywuj
                                  </Button>
                                ) : (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="sm" data-testid={`button-delete-driver-${driver.id}`}>
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Dezaktywuj
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Dezaktywuj kierowcę?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Konto kierowcy {driver.name} zostanie dezaktywowane. Można je później reaktywować.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Anuluj</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => deleteDriverMutation.mutate(driver.id)}>
                                        Dezaktywuj
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                                )}
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="sm" className="bg-red-900 hover:bg-red-800" data-testid={`button-permanent-delete-driver-${driver.id}`}>
                                      <Trash2 className="h-4 w-4 mr-1" /> Usuń trwale
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Trwale usunąć konto kierowcy?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Konto kierowcy {driver.name} zostanie TRWALE usunięte z bazy danych wraz z pojazdami. Tej operacji nie można cofnąć. Możliwe tylko jeśli konto nie ma żadnych przejazdów.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Anuluj</AlertDialogCancel>
                                      <AlertDialogAction onClick={async () => {
                                        try {
                                          await apiRequest("DELETE", `/api/admin/drivers/${driver.id}/permanent`);
                                          toast({ title: "Konto kierowcy trwale usunięte" });
                                          refetchDrivers();
                                        } catch (err: any) {
                                          toast({ title: "Błąd", description: err?.message || "Nie udało się usunąć konta", variant: "destructive" });
                                        }
                                      }}>
                                        Usuń trwale
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    ))}
                    {(!drivers || (drivers as any[]).length === 0) && (
                      <div className="text-center text-muted-foreground py-8">
                        Brak zarejestrowanych kierowców
                      </div>
                    )}
                  </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="companies">
            <Card>
              <CardHeader>
                <CardTitle>Firmy</CardTitle>
                <CardDescription>Lista zarejestrowanych firm i hoteli</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingCompanies ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nazwa</TableHead>
                        <TableHead>Hasło</TableHead>
                        <TableHead>NIP</TableHead>
                        <TableHead>Adres</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Data rejestracji</TableHead>
                        <TableHead>Akcje</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(companies as any[])?.map((company: any) => (
                        <TableRow key={company.id}>
                          <TableCell className="font-medium">{company.name}</TableCell>
                          <TableCell className="font-mono text-xs">{company.plainPassword || "-"}</TableCell>
                          <TableCell>{company.taxId || "-"}</TableCell>
                          <TableCell>{company.address || "-"}</TableCell>
                          <TableCell>{company.email || "-"}</TableCell>
                          <TableCell>{formatDate(company.createdAt)}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="outline" size="icon" onClick={() => setEditingCompany(company)} data-testid={`button-edit-company-${company.id}`}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="destructive" size="icon" data-testid={`button-delete-company-${company.id}`}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Usuń firmę?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Czy na pewno chcesz usunąć firmę {company.name}? Tej operacji nie można cofnąć.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Anuluj</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteCompanyMutation.mutate(company.id)}>
                                      Usuń
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!companies || (companies as any[]).length === 0) && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                            Brak zarejestrowanych firm
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rides">
            <Card>
              <CardHeader>
                <CardTitle>Przejazdy</CardTitle>
                <CardDescription>Historia wszystkich przejazdów</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingRides ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Pasażer</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(rides as any[])?.slice(0, 50).map((ride: any) => (
                        <TableRow key={ride.id}>
                          <TableCell>
                            <div className="space-y-0.5">
                              <div className="font-bold text-sm" data-testid={`text-passenger-name-${ride.id}`}>
                                {ride.passengerLastName ? ride.passengerLastName : (ride.passengerName || "Nieznany")}
                              </div>
                              {ride.passengerPhone && (
                                <div className="text-xs text-muted-foreground" data-testid={`text-passenger-phone-${ride.id}`}>
                                  {ride.passengerPhone}
                                </div>
                              )}
                              {ride.passengerEmail && (
                                <div className="text-xs text-muted-foreground" data-testid={`text-passenger-email-${ride.id}`}>
                                  {ride.passengerEmail}
                                </div>
                              )}
                              <div className="text-xs text-muted-foreground max-w-[300px] truncate" data-testid={`text-ride-route-${ride.id}`}>
                                {ride.pickup} → {ride.destination}
                              </div>
                              <div className="text-xs text-muted-foreground" data-testid={`text-ride-driver-${ride.id}`}>
                                {ride.driver?.name || "-"}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant={
                              ride.status === "completed" ? "default" :
                              ride.status === "cancelled" ? "destructive" :
                              ride.status === "in_progress" ? "secondary" :
                              "outline"
                            }>
                              {ride.status === "completed" ? "Ukończony" :
                               ride.status === "cancelled" ? "Anulowany" :
                               ride.status === "in_progress" ? "W trakcie" :
                               ride.status === "accepted" ? "Zaakceptowany" :
                               "Oczekuje"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!rides || (rides as any[]).length === 0) && (
                        <TableRow>
                          <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                            Brak przejazdów
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments">
            <div className="space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
                  <div>
                    <CardTitle>Zgłoszenia płatności</CardTitle>
                    <CardDescription>Zatwierdź płatności od kierowców i aktywuj subskrypcje</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => refetchPaymentRequests()} data-testid="button-refresh-payments">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Odśwież
                  </Button>
                </CardHeader>
                <CardContent>
                  {loadingPaymentRequests ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  ) : paymentRequests && paymentRequests.length > 0 ? (
                    <div className="space-y-3">
                      {paymentRequests.map((request) => (
                        <Card key={request.id} className={request.status === "pending" ? "border-yellow-500" : ""}>
                          <CardContent className="p-4">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div className="space-y-1">
                                <div className="font-medium text-lg">{request.driverName}</div>
                                <div className="text-sm text-muted-foreground flex items-center gap-2">
                                  <Phone className="h-3 w-3" />
                                  {request.driverPhone || "Brak telefonu"}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {request.planName || "Subskrypcja"} • {request.durationDays || 30} dni
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {request.paymentMethod === "bank" ? "Przelew bankowy" : "BLIK"} 
                                  {request.transactionId && ` • Nr: ${request.transactionId}`}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {new Date(request.createdAt).toLocaleString("pl-PL")}
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <div className="text-2xl font-bold text-primary">
                                  {(request.amount / 100).toFixed(2)} PLN
                                </div>
                                <Badge variant={
                                  request.status === "approved" ? "default" : 
                                  request.status === "rejected" ? "destructive" : 
                                  "secondary"
                                }>
                                  {request.status === "approved" ? "Zatwierdzone" : 
                                   request.status === "rejected" ? "Odrzucone" : 
                                   "Oczekuje"}
                                </Badge>
                                {request.status === "pending" && (
                                  <div className="flex gap-2">
                                    <Button 
                                      size="sm" 
                                      onClick={() => approvePaymentMutation.mutate(request.id)}
                                      disabled={approvePaymentMutation.isPending}
                                      data-testid={`button-approve-payment-${request.id}`}
                                    >
                                      <Check className="h-4 w-4 mr-1" />
                                      Zatwierdź
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="destructive"
                                      onClick={() => rejectPaymentMutation.mutate(request.id)}
                                      disabled={rejectPaymentMutation.isPending}
                                      data-testid={`button-reject-payment-${request.id}`}
                                    >
                                      <X className="h-4 w-4 mr-1" />
                                      Odrzuć
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      Brak zgłoszeń płatności
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="verification">
            <AdminDriverVerification />
          </TabsContent>

          <TabsContent value="referrals">
            <AdminReferralsSection />
          </TabsContent>

          <TabsContent value="system-messages">
            <AdminSystemMessages />
          </TabsContent>

          <TabsContent value="settings">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Ustawienia płatności</CardTitle>
                  <CardDescription>Dane do płatności wyświetlane kierowcom</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {loadingPaymentSettings ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  ) : editingPaymentSettings ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Numer konta bankowego (IBAN)</Label>
                        <Input
                          value={paymentSettingsForm.bankAccount}
                          onChange={(e) => setPaymentSettingsForm(prev => ({ ...prev, bankAccount: e.target.value }))}
                          placeholder="PL12345678901234567890123456"
                          data-testid="input-bank-account"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Numer telefonu do BLIK</Label>
                        <Input
                          value={paymentSettingsForm.blikPhone}
                          onChange={(e) => setPaymentSettingsForm(prev => ({ ...prev, blikPhone: e.target.value }))}
                          placeholder="+48123456789"
                          data-testid="input-blik-phone"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Nazwa odbiorcy</Label>
                        <Input
                          value={paymentSettingsForm.recipientName}
                          onChange={(e) => setPaymentSettingsForm(prev => ({ ...prev, recipientName: e.target.value }))}
                          placeholder="Nazwa firmy lub imię i nazwisko"
                          data-testid="input-recipient-name"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => savePaymentSettingsMutation.mutate(paymentSettingsForm)}
                          disabled={savePaymentSettingsMutation.isPending}
                          data-testid="button-save-payment-settings"
                        >
                          {savePaymentSettingsMutation.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : null}
                          Zapisz
                        </Button>
                        <Button variant="outline" onClick={() => setEditingPaymentSettings(false)}>
                          Anuluj
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid gap-4">
                        <div className="p-4 border rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Banknote className="h-5 w-5 text-primary" />
                            <Label className="text-base font-medium">Konto bankowe</Label>
                          </div>
                          <div className="font-mono text-sm">
                            {paymentSettings?.bankAccount || <span className="text-muted-foreground">Nie ustawione</span>}
                          </div>
                        </div>
                        <div className="p-4 border rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Phone className="h-5 w-5 text-primary" />
                            <Label className="text-base font-medium">Telefon do BLIK</Label>
                          </div>
                          <div className="font-mono text-sm">
                            {paymentSettings?.blikPhone || <span className="text-muted-foreground">Nie ustawione</span>}
                          </div>
                        </div>
                        <div className="p-4 border rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Users className="h-5 w-5 text-primary" />
                            <Label className="text-base font-medium">Nazwa odbiorcy</Label>
                          </div>
                          <div className="text-sm">
                            {paymentSettings?.recipientName || <span className="text-muted-foreground">Nie ustawione</span>}
                          </div>
                        </div>
                      </div>
                      <Button onClick={() => setEditingPaymentSettings(true)} data-testid="button-edit-payment-settings">
                        <Pencil className="h-4 w-4 mr-2" />
                        Edytuj ustawienia płatności
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Zmiana hasła admina</CardTitle>
                  <CardDescription>Zmień hasło do panelu administratora</CardDescription>
                </CardHeader>
                <CardContent>
                  {changingPassword ? (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="current-admin-password">Aktualne hasło</Label>
                        <div className="relative">
                          <Input
                            id="current-admin-password"
                            type={showCurrentPassword ? "text" : "password"}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="Wpisz aktualne hasło"
                            data-testid="input-current-admin-password"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          >
                            {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-admin-password">Nowe hasło</Label>
                        <div className="relative">
                          <Input
                            id="new-admin-password"
                            type={showNewPassword ? "text" : "password"}
                            value={newAdminPassword}
                            onChange={(e) => setNewAdminPassword(e.target.value)}
                            placeholder="Wpisz nowe hasło (min. 4 znaki)"
                            data-testid="input-new-admin-password"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                          >
                            {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => changeAdminPasswordMutation.mutate({ currentPassword, newPassword: newAdminPassword })}
                          disabled={changeAdminPasswordMutation.isPending || !currentPassword || newAdminPassword.length < 4}
                          data-testid="button-save-admin-password"
                        >
                          <Check className="h-4 w-4 mr-2" />
                          {changeAdminPasswordMutation.isPending ? "Zapisywanie..." : "Zmień hasło"}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setChangingPassword(false);
                            setCurrentPassword("");
                            setNewAdminPassword("");
                          }}
                          data-testid="button-cancel-admin-password"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Anuluj
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => setChangingPassword(true)}
                      data-testid="button-change-admin-password"
                    >
                      <Lock className="h-4 w-4 mr-2" />
                      Zmień hasło
                    </Button>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Baner informacyjny</CardTitle>
                  <CardDescription>Przewijany tekst w nagłówku strony — widoczny dla wszystkich użytkowników</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {loadingSettings ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                          <Label className="text-base font-medium">Baner aktywny</Label>
                          <p className="text-sm text-muted-foreground">
                            Włącz/wyłącz przewijany baner w nagłówku
                          </p>
                        </div>
                        <Switch
                          data-testid="switch-banner-active"
                          checked={bannerActive}
                          onCheckedChange={(checked) => {
                            setBannerActive(checked);
                            updateSettingMutation.mutate({
                              key: "systemMessageActive",
                              value: checked ? "true" : "false",
                            });
                          }}
                          disabled={updateSettingMutation.isPending}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Treść baneru</Label>
                        {editingBanner ? (
                          <div className="space-y-3">
                            <Input
                              data-testid="input-banner-text"
                              value={bannerText}
                              onChange={(e) => setBannerText(e.target.value)}
                              placeholder="Wpisz tekst baneru..."
                            />
                            <div className="space-y-2">
                              <Label>Priorytet (kolor)</Label>
                              <Select value={bannerPriority} onValueChange={setBannerPriority}>
                                <SelectTrigger data-testid="select-banner-priority">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="normal">Normalny (przyciemniony)</SelectItem>
                                  <SelectItem value="important">Ważny (jasny neon)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                data-testid="button-save-banner"
                                onClick={() => {
                                  updateSettingMutation.mutate({ key: "systemMessage", value: bannerText });
                                  updateSettingMutation.mutate({ key: "systemMessagePriority", value: bannerPriority });
                                  setEditingBanner(false);
                                }}
                                disabled={updateSettingMutation.isPending}
                              >
                                <Check className="h-4 w-4 mr-2" />
                                Zapisz
                              </Button>
                              <Button
                                variant="outline"
                                data-testid="button-cancel-banner"
                                onClick={() => {
                                  setBannerText(settings?.systemMessage || "");
                                  setBannerPriority(settings?.systemMessagePriority || "normal");
                                  setEditingBanner(false);
                                }}
                              >
                                <X className="h-4 w-4 mr-2" />
                                Anuluj
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <p className="text-sm" data-testid="text-banner-current">
                              {bannerText || <span className="text-muted-foreground">(brak tekstu)</span>}
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              data-testid="button-edit-banner"
                              onClick={() => setEditingBanner(true)}
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              Edytuj
                            </Button>
                          </div>
                        )}
                      </div>

                      <div className="p-4 bg-muted/50 rounded-lg">
                        <h4 className="font-medium mb-2">Status baneru:</h4>
                        <p className="text-sm text-muted-foreground">
                          {bannerActive ? (
                            <span className="text-green-500 flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4" />
                              Baner jest WŁĄCZONY — tekst wyświetla się w nagłówku
                            </span>
                          ) : (
                            <span className="text-yellow-500 flex items-center gap-2">
                              <AlertCircle className="h-4 w-4" />
                              Baner jest WYŁĄCZONY — tekst nie jest wyświetlany
                            </span>
                          )}
                        </p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Ustawienia systemowe</CardTitle>
                  <CardDescription>Konfiguracja aplikacji TaxiQ</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {loadingSettings ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Mail className="h-5 w-5 text-primary" />
                            <Label className="text-base font-medium">Weryfikacja email dla kierowców</Label>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Gdy włączone, kierowcy muszą zweryfikować swój email kodem wysłanym na adres email.
                            Wyłącz jeśli email nie jest jeszcze skonfigurowany.
                          </p>
                        </div>
                        <Switch
                          data-testid="switch-email-verification"
                          checked={settings?.email_verification_enabled === "true"}
                          onCheckedChange={(checked) => {
                            updateSettingMutation.mutate({
                              key: "email_verification_enabled",
                              value: checked ? "true" : "false",
                            });
                          }}
                          disabled={updateSettingMutation.isPending}
                        />
                      </div>

                      <div className="p-4 bg-muted/50 rounded-lg">
                        <h4 className="font-medium mb-2">Status weryfikacji email:</h4>
                        <p className="text-sm text-muted-foreground">
                          {settings?.email_verification_enabled === "true" ? (
                            <span className="text-green-500 flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4" />
                              Weryfikacja email jest WŁĄCZONA
                            </span>
                          ) : (
                            <span className="text-yellow-500 flex items-center gap-2">
                              <AlertCircle className="h-4 w-4" />
                              Weryfikacja email jest WYŁĄCZONA - kierowcy nie muszą weryfikować emaila
                            </span>
                          )}
                        </p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Subscription Plans Tab */}
          <TabsContent value="subscriptions">
            <div className="space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
                  <div>
                    <CardTitle>Plany abonamentowe</CardTitle>
                    <CardDescription>Zarządzaj planami abonamentowymi dla kierowców</CardDescription>
                  </div>
                  <Button onClick={() => setShowNewPlanForm(!showNewPlanForm)} data-testid="button-add-plan">
                    <Plus className="h-4 w-4 mr-2" />
                    Dodaj plan
                  </Button>
                </CardHeader>
                <CardContent>
                  {showNewPlanForm && (
                    <Card className="mb-6 border-primary">
                      <CardHeader>
                        <CardTitle className="text-lg">Nowy plan abonamentowy</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <form onSubmit={async (e) => {
                          e.preventDefault();
                          try {
                            await apiRequest("POST", "/api/admin/subscription-plans", newPlan);
                            toast({ title: "Plan utworzony" });
                            setShowNewPlanForm(false);
                            setNewPlan({
                              name: "",
                              durationDays: 30,
                              price: 9900,
                              description: "",
                              isActive: true,
                              isDefault: false,
                            });
                            refetchPlans();
                          } catch (error) {
                            toast({ title: "Błąd", description: "Nie udało się utworzyć planu", variant: "destructive" });
                          }
                        }} className="space-y-4">
                          <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Nazwa planu</Label>
                              <Input 
                                value={newPlan.name} 
                                onChange={(e) => setNewPlan({...newPlan, name: e.target.value})}
                                placeholder="np. Miesięczny"
                                data-testid="input-plan-name"
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Czas trwania (dni)</Label>
                              <Input 
                                type="number"
                                value={newPlan.durationDays} 
                                onChange={(e) => setNewPlan({...newPlan, durationDays: parseInt(e.target.value) || 30})}
                                data-testid="input-plan-duration"
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Cena (PLN)</Label>
                              <Input 
                                type="number"
                                step="0.01"
                                value={(newPlan.price / 100).toFixed(2)} 
                                onChange={(e) => setNewPlan({...newPlan, price: Math.round(parseFloat(e.target.value) * 100) || 0})}
                                data-testid="input-plan-price"
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Opis</Label>
                              <Input 
                                value={newPlan.description} 
                                onChange={(e) => setNewPlan({...newPlan, description: e.target.value})}
                                placeholder="Opcjonalny opis"
                                data-testid="input-plan-description"
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2">
                              <Switch 
                                checked={newPlan.isActive}
                                onCheckedChange={(checked) => setNewPlan({...newPlan, isActive: checked})}
                                data-testid="switch-plan-active"
                              />
                              <Label>Aktywny</Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch 
                                checked={newPlan.isDefault}
                                onCheckedChange={(checked) => setNewPlan({...newPlan, isDefault: checked})}
                                data-testid="switch-plan-default"
                              />
                              <Label>Domyślny</Label>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button type="submit" data-testid="button-save-plan">Zapisz</Button>
                            <Button type="button" variant="outline" onClick={() => setShowNewPlanForm(false)}>Anuluj</Button>
                          </div>
                        </form>
                      </CardContent>
                    </Card>
                  )}

                  {loadingPlans ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  ) : !subscriptionPlans?.length ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Brak planów abonamentowych</p>
                      <p className="text-sm">Dodaj pierwszy plan, aby kierowcy mogli się subskrybować</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nazwa</TableHead>
                          <TableHead>Czas trwania</TableHead>
                          <TableHead>Cena</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Akcje</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {subscriptionPlans?.map((plan) => (
                          <TableRow key={plan.id}>
                            <TableCell className="font-medium">
                              {plan.name}
                              {plan.isDefault && (
                                <Badge variant="secondary" className="ml-2">Domyślny</Badge>
                              )}
                            </TableCell>
                            <TableCell>{plan.durationDays} dni</TableCell>
                            <TableCell className="font-medium">{(plan.price / 100).toFixed(2)} PLN</TableCell>
                            <TableCell>
                              <Badge variant={plan.isActive ? "default" : "secondary"}>
                                {plan.isActive ? "Aktywny" : "Nieaktywny"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => setEditingPlan(plan)}
                                  data-testid={`button-edit-plan-${plan.id}`}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button size="icon" variant="ghost" data-testid={`button-delete-plan-${plan.id}`}>
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Usunąć plan "{plan.name}"?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Ta akcja jest nieodwracalna. Plan zostanie trwale usunięty.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Anuluj</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={async () => {
                                          try {
                                            await apiRequest("DELETE", `/api/admin/subscription-plans/${plan.id}`);
                                            toast({ title: "Plan usunięty" });
                                            refetchPlans();
                                          } catch (error) {
                                            toast({ title: "Błąd", description: "Nie udało się usunąć planu", variant: "destructive" });
                                          }
                                        }}
                                      >
                                        Usuń
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Informacje o systemie abonamentowym</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground space-y-2">
                  <p><strong>Jak to działa:</strong> Tworzysz różne plany abonamentowe i przydzielasz je indywidualnie każdemu kierowcy.</p>
                  <p>Przydzielanie planu: Zakładka "Kierowcy" → rozwiń kierowcę → wybierz plan z listy.</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="map">
            <AdminDriversMap drivers={drivers || []} loading={loadingDrivers} />
          </TabsContent>
        </Tabs>
      </main>

      {/* Edit Subscription Plan Dialog */}
      <Dialog open={!!editingPlan} onOpenChange={(open) => !open && setEditingPlan(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edytuj plan</DialogTitle>
            <DialogDescription>Zmień dane planu abonamentowego</DialogDescription>
          </DialogHeader>
          {editingPlan && (
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                await apiRequest("PATCH", `/api/admin/subscription-plans/${editingPlan.id}`, editingPlan);
                toast({ title: "Plan zaktualizowany" });
                setEditingPlan(null);
                refetchPlans();
              } catch (error) {
                toast({ title: "Błąd", description: "Nie udało się zaktualizować planu", variant: "destructive" });
              }
            }} className="space-y-4">
              <div className="space-y-2">
                <Label>Nazwa planu</Label>
                <Input 
                  value={editingPlan.name} 
                  onChange={(e) => setEditingPlan({...editingPlan, name: e.target.value})}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Czas trwania (dni)</Label>
                  <Input 
                    type="number"
                    value={editingPlan.durationDays} 
                    onChange={(e) => setEditingPlan({...editingPlan, durationDays: parseInt(e.target.value) || 30})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cena (PLN)</Label>
                  <Input 
                    type="number"
                    step="0.01"
                    value={(editingPlan.price / 100).toFixed(2)} 
                    onChange={(e) => setEditingPlan({...editingPlan, price: Math.round(parseFloat(e.target.value) * 100) || 0})}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Opis</Label>
                <Input 
                  value={editingPlan.description || ""} 
                  onChange={(e) => setEditingPlan({...editingPlan, description: e.target.value})}
                />
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={editingPlan.isActive}
                    onCheckedChange={(checked) => setEditingPlan({...editingPlan, isActive: checked})}
                  />
                  <Label>Aktywny</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={editingPlan.isDefault}
                    onCheckedChange={(checked) => setEditingPlan({...editingPlan, isDefault: checked})}
                  />
                  <Label>Domyślny</Label>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingPlan(null)}>Anuluj</Button>
                <Button type="submit">Zapisz</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Driver Dialog */}
      <Dialog open={!!editingDriver} onOpenChange={(open) => !open && setEditingDriver(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edytuj kierowcę</DialogTitle>
            <DialogDescription>Zmień dane kierowcy</DialogDescription>
          </DialogHeader>
          {editingDriver && (
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const password = formData.get('password') as string;
              updateDriverMutation.mutate({
                id: editingDriver.id,
                name: formData.get('name') as string,
                username: formData.get('username') as string,
                email: formData.get('email') as string,
                phone: formData.get('phone') as string,
                vehiclePlate: formData.get('vehiclePlate') as string,
                vehicleModel: formData.get('vehicleModel') as string,
                taxiLicenseNumber: formData.get('taxiLicenseNumber') as string,
                ...(password && { password, plainPassword: password }),
              });
            }} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="driver-name" className="text-xs font-medium text-foreground">Imię i nazwisko</Label>
                  <Input id="driver-name" name="name" defaultValue={editingDriver.name} data-testid="input-edit-driver-name" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="driver-username" className="text-xs font-medium text-foreground">Login</Label>
                  <Input id="driver-username" name="username" defaultValue={editingDriver.username} data-testid="input-edit-driver-username" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="driver-email" className="text-xs font-medium text-foreground">Email</Label>
                  <Input id="driver-email" name="email" type="email" defaultValue={editingDriver.email || ""} data-testid="input-edit-driver-email" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="driver-phone" className="text-xs font-medium text-foreground">Telefon</Label>
                  <Input id="driver-phone" name="phone" type="tel" inputMode="tel" defaultValue={editingDriver.phone || ""} placeholder="+48 600 123 456" data-testid="input-edit-driver-phone" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="driver-plate" className="text-xs font-medium text-foreground">Numer rejestracyjny</Label>
                  <Input id="driver-plate" name="vehiclePlate" defaultValue={editingDriver.vehiclePlate || ""} data-testid="input-edit-driver-plate" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="driver-model" className="text-xs font-medium text-foreground">Model pojazdu</Label>
                  <Input id="driver-model" name="vehicleModel" defaultValue={editingDriver.vehicleModel || ""} data-testid="input-edit-driver-model" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="driver-license" className="text-xs font-medium text-foreground">Numer identyfikatora taxi</Label>
                <Input id="driver-license" name="taxiLicenseNumber" defaultValue={editingDriver.taxiLicenseNumber || ""} data-testid="input-edit-driver-license" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="driver-password" className="text-xs font-medium text-foreground">Hasło (pozostaw puste aby nie zmieniać)</Label>
                <Input id="driver-password" name="password" type="text" placeholder="Nowe hasło..." data-testid="input-edit-driver-password" />
              </div>
              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => setEditingDriver(null)}>Anuluj</Button>
                <Button type="submit" disabled={updateDriverMutation.isPending} data-testid="button-save-driver">
                  {updateDriverMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Zapisz
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edytuj pasażera</DialogTitle>
            <DialogDescription>Zmień dane pasażera</DialogDescription>
          </DialogHeader>
          {editingUser && (
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const password = formData.get('password') as string;
              updateUserMutation.mutate({
                id: editingUser.id,
                firstName: formData.get('firstName') as string,
                lastName: formData.get('lastName') as string,
                username: formData.get('username') as string,
                phone: formData.get('phone') as string,
                email: formData.get('email') as string,
                ...(password && { password, plainPassword: password }),
              });
            }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="user-firstName">Imię</Label>
                  <Input id="user-firstName" name="firstName" defaultValue={editingUser.firstName} data-testid="input-edit-user-firstname" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="user-lastName">Nazwisko</Label>
                  <Input id="user-lastName" name="lastName" defaultValue={editingUser.lastName} data-testid="input-edit-user-lastname" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-username">Login</Label>
                <Input id="user-username" name="username" defaultValue={editingUser.username} data-testid="input-edit-user-username" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-phone">Telefon</Label>
                <Input id="user-phone" name="phone" defaultValue={editingUser.phone || ""} data-testid="input-edit-user-phone" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-email">Email</Label>
                <Input id="user-email" name="email" defaultValue={editingUser.email || ""} data-testid="input-edit-user-email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-password">Hasło (pozostaw puste aby nie zmieniać)</Label>
                <Input id="user-password" name="password" type="text" placeholder="Nowe hasło..." data-testid="input-edit-user-password" />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingUser(null)}>Anuluj</Button>
                <Button type="submit" disabled={updateUserMutation.isPending} data-testid="button-save-user">
                  {updateUserMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Zapisz
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Company Dialog */}
      <Dialog open={!!editingCompany} onOpenChange={(open) => !open && setEditingCompany(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edytuj firmę</DialogTitle>
            <DialogDescription>Zmień dane firmy</DialogDescription>
          </DialogHeader>
          {editingCompany && (
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const password = formData.get('password') as string;
              updateCompanyMutation.mutate({
                id: editingCompany.id,
                name: formData.get('name') as string,
                nip: formData.get('nip') as string,
                address: formData.get('address') as string,
                email: formData.get('email') as string,
                ...(password && { password, plainPassword: password }),
              });
            }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company-name">Nazwa firmy</Label>
                <Input id="company-name" name="name" defaultValue={editingCompany.name} data-testid="input-edit-company-name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-nip">NIP</Label>
                <Input id="company-nip" name="nip" defaultValue={editingCompany.taxId || ""} data-testid="input-edit-company-nip" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-address">Adres</Label>
                <Input id="company-address" name="address" defaultValue={editingCompany.address || ""} data-testid="input-edit-company-address" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-email">Email</Label>
                <Input id="company-email" name="email" defaultValue={editingCompany.email || ""} data-testid="input-edit-company-email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-password">Hasło (pozostaw puste aby nie zmieniać)</Label>
                <Input id="company-password" name="password" type="text" placeholder="Nowe hasło..." data-testid="input-edit-company-password" />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingCompany(null)}>Anuluj</Button>
                <Button type="submit" disabled={updateCompanyMutation.isPending} data-testid="button-save-company">
                  {updateCompanyMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Zapisz
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Reset User Password Dialog */}
      <Dialog open={!!resetPasswordUser} onOpenChange={(open) => !open && setResetPasswordUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset hasła użytkownika</DialogTitle>
            <DialogDescription>
              Ustaw nowe hasło dla użytkownika {resetPasswordUser?.username} ({resetPasswordUser?.firstName} {resetPasswordUser?.lastName})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-user-password">Nowe hasło</Label>
              <Input 
                id="new-user-password" 
                type="text" 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Wpisz nowe hasło (min. 4 znaki)" 
                data-testid="input-new-user-password" 
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setResetPasswordUser(null)}>Anuluj</Button>
              <Button 
                type="button"
                disabled={resetUserPasswordMutation.isPending || newPassword.length < 4} 
                onClick={() => resetUserPasswordMutation.mutate({ id: resetPasswordUser?.id, newPassword })}
                data-testid="button-confirm-reset-user-password"
              >
                {resetUserPasswordMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Ustaw hasło
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset Driver Password Dialog */}
      <Dialog open={!!resetPasswordDriver} onOpenChange={(open) => !open && setResetPasswordDriver(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset hasła kierowcy</DialogTitle>
            <DialogDescription>
              Ustaw nowe hasło dla kierowcy {resetPasswordDriver?.username} ({resetPasswordDriver?.name})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-driver-password">Nowe hasło</Label>
              <Input 
                id="new-driver-password" 
                type="text" 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Wpisz nowe hasło (min. 4 znaki)" 
                data-testid="input-new-driver-password" 
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setResetPasswordDriver(null)}>Anuluj</Button>
              <Button 
                type="button"
                disabled={resetDriverPasswordMutation.isPending || newPassword.length < 4} 
                onClick={() => resetDriverPasswordMutation.mutate({ id: resetPasswordDriver?.id, newPassword })}
                data-testid="button-confirm-reset-driver-password"
              >
                {resetDriverPasswordMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Ustaw hasło
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Ride History Dialog */}
      <Dialog open={!!rideHistoryDialog?.open} onOpenChange={(open) => !open && setRideHistoryDialog(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Historia przejazdów - {rideHistoryDialog?.name}
            </DialogTitle>
            <DialogDescription>
              {rideHistoryDialog?.type === "passenger" ? "Przejazdy pasażera" : "Przejazdy kierowcy"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {loadingRideHistory ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (rideHistory as any[])?.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                Brak przejazdów
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Skąd</TableHead>
                    <TableHead>Dokąd</TableHead>
                    <TableHead>{rideHistoryDialog?.type === "passenger" ? "Kierowca" : "Pasażer"}</TableHead>
                    <TableHead>Telefon klienta</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Cena</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(rideHistory as any[])?.map((ride: any) => (
                    <TableRow key={ride.id}>
                      <TableCell className="whitespace-nowrap">
                        {new Date(ride.createdAt).toLocaleDateString('pl-PL')}
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate" title={ride.pickupLocation}>
                        {ride.pickupLocation}
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate" title={ride.destination}>
                        {ride.destination}
                      </TableCell>
                      <TableCell>
                        {rideHistoryDialog?.type === "passenger" ? (ride.driverName || "-") : (ride.passengerName || "-")}
                      </TableCell>
                      <TableCell>
                        {ride.callerPhone ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`tel:${ride.callerPhone}`, '_self')}
                            data-testid={`admin-call-ride-${ride.id}`}
                          >
                            <Phone className="w-3 h-3 mr-1" />
                            {ride.callerPhone}
                          </Button>
                        ) : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          ride.status === "completed" ? "default" :
                          ride.status === "cancelled" ? "destructive" :
                          "secondary"
                        }>
                          {ride.status === "completed" ? "Ukończony" :
                           ride.status === "cancelled" ? "Anulowany" :
                           ride.status === "in_progress" ? "W trakcie" :
                           ride.status === "accepted" ? "Zaakceptowany" :
                           "Oczekujący"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {ride.finalPrice ? `${(ride.finalPrice / 100).toFixed(2)} PLN` : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {(rideHistory as any[])?.length > 0 && (
              <div className="border-t pt-4 mt-4 flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                  Razem przejazdów: {(rideHistory as any[])?.length}
                </div>
                <div className="font-bold">
                  Suma: {((rideHistory as any[])?.reduce((sum, r) => sum + (r.finalPrice || 0), 0) / 100).toFixed(2)} PLN
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AdminReferralsSection() {
  const { toast } = useToast();
  const handleAdminError = (fallbackMessage: string) => (error: any) => {
    const message = error?.message || fallbackMessage;
    toast({ title: message, variant: "destructive" });
  };
  const { data: referrals, isLoading, error } = useQuery<Array<{
    id: string;
    referrerDriverId: string;
    referrerName: string;
    referrerCode: string;
    referredDriverId?: string;
    referredUserId?: string;
    referredName: string;
    referralType: string;
    status: string;
    rewardDescription?: string;
    createdAt: string;
    rewardedAt?: string;
  }>>({
    queryKey: ["/api/admin/referrals"],
  });

  const { data: payouts, isLoading: payoutsLoading } = useQuery<Array<{
    id: string;
    referralId: string;
    driverId: string;
    driverName: string;
    driverBankAccount: string | null;
    driverBankHolder: string | null;
    amount: number;
    description: string | null;
    bankAccountNumber: string | null;
    bankAccountHolder: string | null;
    status: string;
    createdAt: string;
    paidAt: string | null;
    paidBy: string | null;
    notes: string | null;
  }>>({
    queryKey: ["/api/admin/referral-payouts"],
  });

  const markPaidMutation = useMutation({
    mutationFn: async (payoutId: string) => {
      const res = await apiRequest("POST", `/api/admin/referral-payouts/${payoutId}/pay`, {});
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Wypłata oznaczona jako zrealizowana" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/referral-payouts"] });
    },
    onError: handleAdminError("Nie udało się zaktualizować wypłaty"),
  });

  const cancelPayoutMutation = useMutation({
    mutationFn: async (payoutId: string) => {
      const res = await apiRequest("POST", `/api/admin/referral-payouts/${payoutId}/cancel`, {});
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Wypłata anulowana" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/referral-payouts"] });
    },
    onError: handleAdminError("Nie udało się anulować wypłaty"),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertCircle className="w-8 h-8 mx-auto text-destructive mb-2" />
          <p className="text-destructive">Nie udało się pobrać danych poleceń</p>
        </CardContent>
      </Card>
    );
  }

  const pendingCount = referrals?.filter(r => r.status === 'pending').length || 0;
  const rewardedCount = referrals?.filter(r => r.status === 'rewarded').length || 0;
  const pendingPayouts = payouts?.filter(p => p.status === 'pending') || [];
  const totalPendingAmount = pendingPayouts.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold" data-testid="text-total-referrals">{referrals?.length || 0}</p>
            <p className="text-sm text-muted-foreground">Wszystkie polecenia</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold" data-testid="text-pending-referrals">{pendingCount}</p>
            <p className="text-sm text-muted-foreground">Oczekujące</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold" data-testid="text-rewarded-referrals">{rewardedCount}</p>
            <p className="text-sm text-muted-foreground">Nagrodzone</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold" data-testid="text-pending-payouts-amount">{(totalPendingAmount / 100).toFixed(2)} PLN</p>
            <p className="text-sm text-muted-foreground">Do wypłaty</p>
          </CardContent>
        </Card>
      </div>

      {pendingPayouts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5" />
              Oczekujące wypłaty ({pendingPayouts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kierowca</TableHead>
                  <TableHead>Kwota</TableHead>
                  <TableHead>Opis</TableHead>
                  <TableHead>Nr konta</TableHead>
                  <TableHead>Właściciel konta</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Akcje</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingPayouts.map((payout) => (
                  <TableRow key={payout.id} data-testid={`row-payout-${payout.id}`}>
                    <TableCell className="font-medium">{payout.driverName}</TableCell>
                    <TableCell className="font-bold">{(payout.amount / 100).toFixed(2)} PLN</TableCell>
                    <TableCell className="text-sm">{payout.description || '-'}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {payout.bankAccountNumber || payout.driverBankAccount || (
                        <span className="text-destructive">Brak konta</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {payout.bankAccountHolder || payout.driverBankHolder || '-'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(payout.createdAt).toLocaleDateString('pl-PL')}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button 
                          size="sm" 
                          onClick={() => markPaidMutation.mutate(payout.id)}
                          disabled={markPaidMutation.isPending || (!payout.bankAccountNumber && !payout.driverBankAccount)}
                          data-testid={`button-pay-${payout.id}`}
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Wypłać
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => cancelPayoutMutation.mutate(payout.id)}
                          disabled={cancelPayoutMutation.isPending}
                          data-testid={`button-cancel-payout-${payout.id}`}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {payouts && payouts.filter(p => p.status !== 'pending').length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Historia wypłat</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kierowca</TableHead>
                  <TableHead>Kwota</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data utworzenia</TableHead>
                  <TableHead>Data realizacji</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payouts.filter(p => p.status !== 'pending').map((payout) => (
                  <TableRow key={payout.id}>
                    <TableCell className="font-medium">{payout.driverName}</TableCell>
                    <TableCell>{(payout.amount / 100).toFixed(2)} PLN</TableCell>
                    <TableCell>
                      <Badge variant={payout.status === 'paid' ? 'default' : 'secondary'}>
                        {payout.status === 'paid' ? 'Wypłacono' : 'Anulowano'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{new Date(payout.createdAt).toLocaleDateString('pl-PL')}</TableCell>
                    <TableCell className="text-sm">{payout.paidAt ? new Date(payout.paidAt).toLocaleDateString('pl-PL') : '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Lista poleceń
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!referrals || referrals.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Brak poleceń</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Polecający</TableHead>
                  <TableHead>Kod</TableHead>
                  <TableHead>Polecony</TableHead>
                  <TableHead>Typ</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Nagroda</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {referrals.map((ref) => (
                  <TableRow key={ref.id} data-testid={`row-referral-${ref.id}`}>
                    <TableCell className="font-medium">{ref.referrerName}</TableCell>
                    <TableCell className="font-mono text-sm">{ref.referrerCode}</TableCell>
                    <TableCell>{ref.referredName}</TableCell>
                    <TableCell>
                      <Badge variant={ref.referralType === 'driver' ? 'default' : 'secondary'}>
                        {ref.referralType === 'driver' ? 'Kierowca' : 'Pasażer'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={ref.status === 'rewarded' ? 'default' : 'outline'}>
                        {ref.status === 'rewarded' ? 'Nagrodzono' : ref.status === 'pending' ? 'Oczekuje' : ref.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{ref.rewardDescription || '-'}</TableCell>
                    <TableCell className="text-sm">
                      {new Date(ref.createdAt).toLocaleDateString('pl-PL')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AdminDriversMap({ drivers, loading }: { drivers: any[]; loading: boolean }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const { ready } = useGoogleMaps();

  const onlineDrivers = (drivers || []).filter((d: any) => d.isOnline && d.currentLat && d.currentLng && d.isActive !== false);

  const mapCallbackRef = useCallback((node: HTMLDivElement | null) => {
    if (node && ready && !mapInstanceRef.current) {
      const map = new google.maps.Map(node, {
        center: { lat: 52.4064, lng: 16.9252 },
        zoom: 11,
        gestureHandling: 'greedy',
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        styles: [
          { elementType: "geometry", stylers: [{ color: "#1a1a2e" }] },
          { elementType: "labels.text.stroke", stylers: [{ color: "#1a1a2e" }] },
          { elementType: "labels.text.fill", stylers: [{ color: "#8a8a8a" }] },
          { featureType: "road", elementType: "geometry", stylers: [{ color: "#2a2a3e" }] },
          { featureType: "water", elementType: "geometry", stylers: [{ color: "#0e0e1a" }] },
        ],
      });
      mapInstanceRef.current = map;
      infoWindowRef.current = new google.maps.InfoWindow();
      (mapRef as any).current = node;

      google.maps.event.addListenerOnce(map, 'idle', () => {
        setMapReady(true);
      });

      setTimeout(() => {
        google.maps.event.trigger(map, 'resize');
        map.setCenter({ lat: 52.4064, lng: 16.9252 });
      }, 300);
    }
  }, [ready]);

  useEffect(() => {
    if (!mapInstanceRef.current || !mapReady) return;

    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    onlineDrivers.forEach((driver: any) => {
      const lat = parseFloat(driver.currentLat);
      const lng = parseFloat(driver.currentLng);
      if (isNaN(lat) || isNaN(lng)) return;

      const carSvg = encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="#bfff00" stroke="#000" stroke-width="1.5"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C1.4 11.3 1 12.1 1 13v3c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>');
      const marker = new google.maps.Marker({
        position: { lat, lng },
        map: mapInstanceRef.current!,
        icon: {
          url: "data:image/svg+xml," + carSvg,
          scaledSize: new google.maps.Size(32, 32),
          anchor: new google.maps.Point(16, 16),
        },
        title: driver.name || "Kierowca",
        zIndex: 1000,
      });

      marker.addListener("click", () => {
        const lastUpdate = driver.lastLocationUpdate
          ? new Date(driver.lastLocationUpdate).toLocaleTimeString("pl-PL")
          : "—";
        infoWindowRef.current?.setContent(`
          <div style="color:#000;font-family:Inter,sans-serif;min-width:180px;">
            <strong style="font-size:14px;">${driver.name || "Brak nazwy"}</strong><br/>
            <span style="font-size:12px;color:#555;">Tel: ${driver.phone || "—"}</span><br/>
            <span style="font-size:12px;color:#555;">Auto: ${driver.vehiclePlate || "—"} ${driver.vehicleModel || ""}</span><br/>
            <span style="font-size:12px;color:#555;">Lokalizacja: ${lastUpdate}</span><br/>
            <span style="font-size:12px;color:#555;">Kursy: ${driver.totalRides || 0}</span>
          </div>
        `);
        infoWindowRef.current?.open(mapInstanceRef.current!, marker);
      });

      markersRef.current.push(marker);
    });

    if (onlineDrivers.length > 0 && markersRef.current.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      markersRef.current.forEach(m => bounds.extend(m.getPosition()!));
      if (markersRef.current.length === 1) {
        mapInstanceRef.current.setCenter(markersRef.current[0].getPosition()!);
        mapInstanceRef.current.setZoom(14);
      } else {
        mapInstanceRef.current.fitBounds(bounds, 60);
      }
    }
  }, [mapReady, onlineDrivers.length, drivers]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Map className="w-5 h-5 text-primary" />
            Mapa kierowców
            <Badge variant="default" className="ml-2" data-testid="badge-online-count">{onlineDrivers.length} online</Badge>
          </CardTitle>
          <CardDescription>Podgląd na żywo lokalizacji aktywnych kierowców (odświeżanie co 5s)</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {!ready ? (
            <div className="h-[600px] flex items-center justify-center bg-muted/20">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div
              ref={mapCallbackRef}
              className="h-[600px] w-full rounded-b-lg"
              data-testid="map-admin-drivers"
            />
          )}
        </CardContent>
      </Card>

      {onlineDrivers.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Kierowcy online ({onlineDrivers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {onlineDrivers.map((d: any) => (
                <div key={d.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/20 text-sm" data-testid={`driver-online-${d.id}`}>
                  <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                  <span className="font-medium truncate">{d.name || "—"}</span>
                  <span className="text-muted-foreground text-xs truncate">{d.vehiclePlate || ""}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
