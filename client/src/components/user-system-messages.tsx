import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Info, AlertTriangle, AlertCircle, Megaphone, Check, Loader2, Mail } from "lucide-react";

interface SystemMessage {
  id: string;
  title: string;
  content: string;
  targetRole: string;
  type: string;
  deliveryMode: string;
  requireAcknowledgement: boolean;
  forceOnLogin: boolean;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
  version: number;
  isRead: boolean;
  isAcknowledged: boolean;
}

const typeConfig: Record<string, { icon: any; color: string; label: string }> = {
  INFO: { icon: Info, color: "bg-blue-500/20 text-blue-400 border-blue-500/30", label: "Info" },
  WARNING: { icon: AlertTriangle, color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", label: "Ostrzeżenie" },
  CRITICAL: { icon: AlertCircle, color: "bg-red-500/20 text-red-400 border-red-500/30", label: "Ważne" },
  PROMO: { icon: Megaphone, color: "bg-green-500/20 text-green-400 border-green-500/30", label: "Promocja" },
};

export function SystemMessagesTab() {
  const { toast } = useToast();
  const [selectedMessage, setSelectedMessage] = useState<SystemMessage | null>(null);

  const { data: messages = [], isLoading } = useQuery<SystemMessage[]>({
    queryKey: ["/api/system-messages"],
  });

  const readMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/system-messages/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/system-messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/system-messages/unread-count"] });
    },
  });

  const ackMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/system-messages/${id}/acknowledge`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/system-messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/system-messages/unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["/api/system-messages/pending-required"] });
      setSelectedMessage(null);
      toast({ title: "Wiadomość potwierdzona" });
    },
    onError: () => toast({ title: "Błąd potwierdzenia", variant: "destructive" }),
  });

  const openMessage = (msg: SystemMessage) => {
    setSelectedMessage(msg);
    if (!msg.isRead) {
      readMutation.mutate(msg.id);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-3">
      {messages.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
            <p className="text-muted-foreground" data-testid="text-no-messages">Brak wiadomości</p>
          </CardContent>
        </Card>
      ) : (
        messages.map((msg) => {
          const config = typeConfig[msg.type] || typeConfig.INFO;
          const TypeIcon = config.icon;
          return (
            <Card
              key={msg.id}
              className={`cursor-pointer transition-all ${!msg.isRead ? "ring-1 ring-primary/40 bg-card" : "opacity-80"}`}
              onClick={() => openMessage(msg)}
              data-testid={`card-message-${msg.id}`}
            >
              <CardContent className="py-3 px-4">
                <div className="flex items-start gap-3">
                  <TypeIcon className="h-5 w-5 mt-0.5 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`font-medium text-sm ${!msg.isRead ? "text-white" : "text-muted-foreground"}`}>{msg.title}</span>
                      <Badge className={config.color} variant="outline">{config.label}</Badge>
                      {!msg.isRead && <Badge className="bg-[hsl(70,100%,50%)]/20 text-[hsl(70,100%,50%)] text-xs">Nowa</Badge>}
                      {msg.requireAcknowledgement && !msg.isAcknowledged && (
                        <Badge variant="destructive" className="text-xs">Wymaga potwierdzenia</Badge>
                      )}
                      {msg.isAcknowledged && <Check className="h-4 w-4 text-green-400" />}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{msg.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">{new Date(msg.createdAt).toLocaleDateString("pl-PL")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}

      <Dialog open={!!selectedMessage} onOpenChange={(open) => !open && setSelectedMessage(null)}>
        {selectedMessage && (
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {(() => { const c = typeConfig[selectedMessage.type] || typeConfig.INFO; const I = c.icon; return <I className="h-5 w-5" />; })()}
                {selectedMessage.title}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Badge className={(typeConfig[selectedMessage.type] || typeConfig.INFO).color} variant="outline">
                {(typeConfig[selectedMessage.type] || typeConfig.INFO).label}
              </Badge>
              <p className="text-sm whitespace-pre-wrap" data-testid="text-message-content">{selectedMessage.content}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(selectedMessage.createdAt).toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" })}
                {selectedMessage.expiresAt && ` · Wygasa: ${new Date(selectedMessage.expiresAt).toLocaleDateString("pl-PL")}`}
              </p>
            </div>
            <DialogFooter>
              {selectedMessage.requireAcknowledgement && !selectedMessage.isAcknowledged ? (
                <Button
                  onClick={() => ackMutation.mutate(selectedMessage.id)}
                  disabled={ackMutation.isPending}
                  className="w-full"
                  data-testid="button-acknowledge"
                >
                  {ackMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  <Check className="h-4 w-4 mr-1" /> Rozumiem i potwierdzam
                </Button>
              ) : (
                <Button variant="outline" onClick={() => setSelectedMessage(null)} className="w-full" data-testid="button-close-message">
                  Zamknij
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

export function RequiredMessagesModal() {
  const [visible, setVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { toast } = useToast();

  const { data: pendingMessages = [] } = useQuery<SystemMessage[]>({
    queryKey: ["/api/system-messages/pending-required"],
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (pendingMessages.length > 0) {
      setVisible(true);
      setCurrentIndex(0);
    } else {
      setVisible(false);
    }
  }, [pendingMessages]);

  const ackMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/system-messages/${id}/read`);
      await apiRequest("POST", `/api/system-messages/${id}/acknowledge`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/system-messages/pending-required"] });
      queryClient.invalidateQueries({ queryKey: ["/api/system-messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/system-messages/unread-count"] });
      if (currentIndex < pendingMessages.length - 1) {
        setCurrentIndex(i => i + 1);
      } else {
        setVisible(false);
        toast({ title: "Wszystkie wiadomości potwierdzone" });
      }
    },
    onError: () => toast({ title: "Błąd potwierdzenia", variant: "destructive" }),
  });

  if (!visible || pendingMessages.length === 0) return null;

  const msg = pendingMessages[currentIndex];
  if (!msg) return null;
  const config = typeConfig[msg.type] || typeConfig.INFO;
  const TypeIcon = config.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" data-testid="modal-required-messages">
      <div className="w-full max-w-md mx-4 bg-card border border-border rounded-lg p-6 shadow-2xl">
        <div className="flex items-center gap-2 mb-4">
          <TypeIcon className="h-6 w-6 text-red-400" />
          <h2 className="text-lg font-bold">Ważna wiadomość</h2>
          {pendingMessages.length > 1 && (
            <Badge variant="outline" className="ml-auto">{currentIndex + 1} / {pendingMessages.length}</Badge>
          )}
        </div>

        <Badge className={config.color} variant="outline">{config.label}</Badge>

        <h3 className="text-base font-semibold mt-3 mb-2">{msg.title}</h3>
        <p className="text-sm whitespace-pre-wrap mb-6" data-testid="text-required-message-content">{msg.content}</p>

        <Button
          onClick={() => ackMutation.mutate(msg.id)}
          disabled={ackMutation.isPending}
          className="w-full"
          size="lg"
          data-testid="button-acknowledge-required"
        >
          {ackMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
          <Check className="h-4 w-4 mr-1" /> Rozumiem i potwierdzam
        </Button>
      </div>
    </div>
  );
}

export function useUnreadSystemMessageCount() {
  return useQuery<{ count: number }>({
    queryKey: ["/api/system-messages/unread-count"],
    refetchInterval: 30000,
  });
}
