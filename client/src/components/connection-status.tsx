import { useState, useEffect } from "react";
import { WifiOff, Wifi } from "lucide-react";

export function ConnectionStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        setShowReconnected(true);
        setTimeout(() => setShowReconnected(false), 4000);
      }
    };
    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [wasOffline]);

  if (isOnline && !showReconnected) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 py-2 px-4 text-sm font-medium transition-all ${
        isOnline
          ? "bg-green-600 text-white"
          : "bg-red-600 text-white animate-pulse"
      }`}
      data-testid="connection-status-banner"
    >
      {isOnline ? (
        <>
          <Wifi className="w-4 h-4" />
          Połączenie przywrócone
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4" />
          Brak połączenia z internetem
        </>
      )}
    </div>
  );
}
