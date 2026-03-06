import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import PassengerProfile from "@/pages/passenger-profile";
import Passenger from "@/pages/passenger";
import ResetPassword from "@/pages/reset-password";
import DriverDashboard from "@/pages/driver-dashboard";
import DriverCompleteProfile from "@/pages/driver-complete-profile";
import Driver from "@/pages/driver";
import BusinessLogin from "@/pages/business-login";
import BusinessDashboard from "@/pages/business-dashboard";
import AdminLogin from "@/pages/admin-login";
import AdminDashboard from "@/pages/admin-dashboard";
import Regulamin from "@/pages/regulamin";
import RegulaminKierowca from "@/pages/regulamin-kierowca";
import RegulaminPasazer from "@/pages/regulamin-pasazer";
import RegulaminBiznes from "@/pages/regulamin-biznes";
import Konstytucja from "@/pages/konstytucja";
import PolitykaPrywatnosci from "@/pages/polityka-prywatnosci";
import UsunKonto from "@/pages/usun-konto";
import HomeNew from "@/pages/home-new";
import UzupelnijProfil from "@/pages/uzupelnij-profil";
import VerifyDriver from "@/pages/verify-driver";
import DriverGuide from "@/pages/driver-guide";
import DriverGuideDark from "@/pages/driver-guide-dark";
import PassengerInfo from "@/pages/passenger-info";
import MediaLibrary from "@/pages/media-library";
import NotFound from "@/pages/not-found";
import { CookieConsent } from "@/components/cookie-consent";
import { ConnectionStatus } from "@/components/connection-status";

function BackButtonGuard() {
  const [location] = useLocation();

  useEffect(() => {
    const protectedPaths = ["/passenger/home", "/driver/dashboard"];
    if (!protectedPaths.some(p => location.startsWith(p))) return;

    window.history.pushState(null, "", window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, "", window.location.href);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [location]);

  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomeNew} />
      <Route path="/landing-old" component={Landing} />
      <Route path="/passenger" component={Passenger} />
      <Route path="/passenger/home" component={Home} />
      <Route path="/passenger/profile" component={PassengerProfile} />
      <Route path="/uzupelnij-profil" component={UzupelnijProfil} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/driver" component={Driver} />
      <Route path="/driver/complete-profile" component={DriverCompleteProfile} />
      <Route path="/driver/dashboard" component={DriverDashboard} />
      <Route path="/business" component={BusinessLogin} />
      <Route path="/business/dashboard" component={BusinessDashboard} />
      <Route path="/admin" component={AdminLogin} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/regulamin" component={Regulamin} />
      <Route path="/regulamin-kierowca" component={RegulaminKierowca} />
      <Route path="/regulamin-pasazer" component={RegulaminPasazer} />
      <Route path="/regulamin-biznes" component={RegulaminBiznes} />
      <Route path="/konstytucja" component={Konstytucja} />
      <Route path="/polityka-prywatnosci" component={PolitykaPrywatnosci} />
      <Route path="/usun-konto" component={UsunKonto} />
      <Route path="/delete-account" component={UsunKonto} />
      <Route path="/privacy-policy" component={PolitykaPrywatnosci} />
      <Route path="/home-new" component={HomeNew} />
      <Route path="/verify/:taxiqId" component={VerifyDriver} />
      <Route path="/verify" component={VerifyDriver} />
      <Route path="/driver/guide" component={DriverGuideDark} />
      <Route path="/driver/guide/print" component={DriverGuide} />
      <Route path="/passenger/info" component={PassengerInfo} />
      <Route path="/media" component={MediaLibrary} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <ConnectionStatus />
        <BackButtonGuard />
        <Router />
        <CookieConsent />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
