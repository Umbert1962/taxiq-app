import { useQuery } from "@tanstack/react-query";
import { Flame } from "lucide-react";

interface SystemMessage {
  message: string;
  active: boolean;
  priority: string;
}

export function LiveMessageBar() {
  const { data } = useQuery<SystemMessage>({
    queryKey: ["/api/system-message"],
  });

  if (!data?.active) return null;

  const message = data.message || "Dołącz do TaxiQ - taksówkarz - pasażer - bez pośredników, bez korporacji!!!";

  if (!message) return null;

  return (
    <div
      className="w-full flex items-center justify-center gap-2 shrink-0"
      style={{ background: "rgba(230, 255, 63, 0.06)", paddingLeft: "24px", paddingRight: "24px", paddingTop: "6px", paddingBottom: "6px" }}
      data-testid="live-message-bar"
    >
      <Flame
        className="shrink-0"
        style={{ color: "#E6FF3F", width: "16px", height: "16px" }}
      />
      <span
        className="text-sm"
        style={{ color: "#E6FF3F", fontWeight: 600, lineHeight: 1.4 }}
        data-testid="live-message-text"
      >
        {message}
      </span>
    </div>
  );
}
