import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Send, Loader2 } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Ride, Message } from "@shared/schema";

interface RideChatProps {
  ride: Ride;
  senderId: string;
  senderType: "passenger" | "driver";
  onBack: () => void;
}

export function RideChat({ ride, senderId, senderType, onBack }: RideChatProps) {
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: messages, isLoading } = useQuery<Message[]>({
    queryKey: ["/api/rides", ride.id, "messages"],
    queryFn: async () => {
      const res = await fetch(`/api/rides/${ride.id}/messages`, { credentials: "include" });
      return res.json();
    },
    refetchInterval: 2000,
  });

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      await apiRequest("POST", `/api/rides/${ride.id}/messages`, {
        senderId,
        senderType,
        content,
      });
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/rides", ride.id, "messages"] });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    apiRequest("PATCH", `/api/rides/${ride.id}/messages/read`, { recipientType: senderType });
  }, [ride.id, senderType]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      sendMutation.mutate(message.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: "#ffffff" }}>
      <header style={{ backgroundColor: "#1a1a1a", padding: "12px 16px" }}>
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack} 
            className="flex items-center justify-center"
            style={{ width: 48, height: 48, borderRadius: 8, backgroundColor: "#333" }}
            data-testid="button-back"
          >
            <ArrowLeft className="w-7 h-7 text-white" />
          </button>
          <div>
            <p style={{ fontSize: 20, fontWeight: 700, color: "#fff" }}>Czat z {senderType === "driver" ? "pasażerem" : "kierowcą"}</p>
            <p style={{ fontSize: 13, color: "#aaa" }} className="truncate max-w-[220px]">
              {ride.pickupLocation}
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto" style={{ padding: "12px 12px", backgroundColor: "#ffffff" }}>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-10 h-10 animate-spin" style={{ color: "#22c55e" }} />
          </div>
        ) : messages && messages.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {messages.map((msg) => {
              const isMe = msg.senderType === senderType;
              return (
                <div
                  key={msg.id}
                  style={{
                    display: "flex",
                    justifyContent: isMe ? "flex-end" : "flex-start",
                  }}
                  data-testid={`message-${msg.id}`}
                >
                  <div
                    style={{
                      maxWidth: "85%",
                      borderRadius: 16,
                      padding: "12px 16px",
                      backgroundColor: isMe ? "#22c55e" : "#e5e7eb",
                      borderBottomRightRadius: isMe ? 4 : 16,
                      borderBottomLeftRadius: isMe ? 16 : 4,
                    }}
                  >
                    <p style={{
                      fontSize: 18,
                      fontWeight: 600,
                      lineHeight: 1.4,
                      color: isMe ? "#ffffff" : "#111827",
                      margin: 0,
                    }}>
                      {msg.content}
                    </p>
                    <p style={{
                      fontSize: 13,
                      fontWeight: 600,
                      marginTop: 4,
                      color: isMe ? "rgba(255,255,255,0.75)" : "#6b7280",
                    }}>
                      {isMe ? "Ty" : (senderType === "driver" ? "Pasażer" : "Kierowca")} · {msg.createdAt && new Date(msg.createdAt).toLocaleTimeString("pl-PL", { 
                        hour: "2-digit", 
                        minute: "2-digit" 
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        ) : (
          <div className="text-center" style={{ paddingTop: 60 }}>
            <p style={{ fontSize: 20, color: "#9ca3af", fontWeight: 600 }}>Brak wiadomości</p>
            <p style={{ fontSize: 16, color: "#d1d5db", marginTop: 4 }}>Napisz pierwszą wiadomość</p>
          </div>
        )}
      </main>

      <footer style={{
        backgroundColor: "#f3f4f6",
        borderTop: "2px solid #d1d5db",
        padding: "10px 12px",
      }}>
        <form onSubmit={handleSend} style={{ display: "flex", gap: 8 }}>
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Napisz wiadomość..."
            style={{
              flex: 1,
              height: 52,
              fontSize: 18,
              fontWeight: 500,
              padding: "0 20px",
              borderRadius: 26,
              border: "2px solid #d1d5db",
              backgroundColor: "#ffffff",
              color: "#111827",
              outline: "none",
            }}
            onFocus={(e) => { e.target.style.borderColor = "#22c55e"; }}
            onBlur={(e) => { e.target.style.borderColor = "#d1d5db"; }}
            data-testid="input-message"
          />
          <button 
            type="submit" 
            disabled={!message.trim() || sendMutation.isPending}
            style={{
              height: 52,
              minWidth: 100,
              borderRadius: 26,
              backgroundColor: !message.trim() ? "#9ca3af" : "#22c55e",
              color: "#ffffff",
              fontSize: 16,
              fontWeight: 700,
              border: "none",
              cursor: !message.trim() ? "default" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
            data-testid="button-send"
          >
            {sendMutation.isPending ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                <Send className="w-5 h-5" />
                WYŚLIJ
              </>
            )}
          </button>
        </form>
      </footer>
    </div>
  );
}
