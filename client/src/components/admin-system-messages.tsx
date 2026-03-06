import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Loader2, Eye, EyeOff, RefreshCw, Copy, AlertCircle, Info, AlertTriangle, Megaphone } from "lucide-react";

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
  createdByAdminId: string;
  createdAt: string;
  version: number;
  parentMessageId: string | null;
  totalTargeted?: number;
  totalRead?: number;
  totalAcknowledged?: number;
  readRate?: number;
  ackRate?: number;
}

const typeColors: Record<string, string> = {
  INFO: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  WARNING: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  CRITICAL: "bg-red-500/20 text-red-400 border-red-500/30",
  PROMO: "bg-green-500/20 text-green-400 border-green-500/30",
};

const typeIcons: Record<string, any> = {
  INFO: Info,
  WARNING: AlertTriangle,
  CRITICAL: AlertCircle,
  PROMO: Megaphone,
};

export default function AdminSystemMessages() {
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [editingMessage, setEditingMessage] = useState<SystemMessage | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    targetRole: "DRIVER",
    type: "INFO",
    deliveryMode: "INBOX",
    requireAcknowledgement: false,
    forceOnLogin: false,
    expiresAt: "",
  });

  const { data: messages = [], isLoading } = useQuery<SystemMessage[]>({
    queryKey: ["/api/admin/system-messages"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await apiRequest("POST", "/api/admin/system-messages", {
        ...data,
        expiresAt: data.expiresAt || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/system-messages"] });
      toast({ title: "Wiadomość utworzona" });
      setShowCreate(false);
      resetForm();
    },
    onError: () => toast({ title: "Błąd tworzenia wiadomości", variant: "destructive" }),
  });

  const newVersionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const res = await apiRequest("PUT", `/api/admin/system-messages/${id}/new-version`, {
        ...data,
        expiresAt: data.expiresAt || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/system-messages"] });
      toast({ title: "Nowa wersja utworzona" });
      setEditingMessage(null);
      resetForm();
    },
    onError: () => toast({ title: "Błąd tworzenia nowej wersji", variant: "destructive" }),
  });

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PATCH", `/api/admin/system-messages/${id}/deactivate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/system-messages"] });
      toast({ title: "Wiadomość dezaktywowana" });
    },
    onError: () => toast({ title: "Błąd dezaktywacji", variant: "destructive" }),
  });

  const resetForm = () => {
    setFormData({
      title: "", content: "", targetRole: "DRIVER", type: "INFO",
      deliveryMode: "INBOX", requireAcknowledgement: false, forceOnLogin: false, expiresAt: "",
    });
  };

  const openNewVersion = (msg: SystemMessage) => {
    setEditingMessage(msg);
    setFormData({
      title: msg.title,
      content: msg.content,
      targetRole: msg.targetRole,
      type: msg.type,
      deliveryMode: msg.deliveryMode,
      requireAcknowledgement: msg.requireAcknowledgement,
      forceOnLogin: msg.forceOnLogin,
      expiresAt: msg.expiresAt ? msg.expiresAt.split("T")[0] : "",
    });
  };

  const handleSubmit = () => {
    if (!formData.title || !formData.content) {
      toast({ title: "Uzupełnij tytuł i treść", variant: "destructive" });
      return;
    }
    if (editingMessage) {
      newVersionMutation.mutate({ id: editingMessage.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const activeMessages = messages.filter(m => m.isActive);
  const inactiveMessages = messages.filter(m => !m.isActive);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold" data-testid="text-system-messages-title">Wiadomości systemowe</h2>
          <p className="text-sm text-muted-foreground">Zarządzaj komunikatami dla kierowców i pasażerów</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/admin/system-messages"] })} data-testid="button-refresh-messages">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => { resetForm(); setShowCreate(true); }} data-testid="button-create-message">
            <Plus className="h-4 w-4 mr-1" /> Nowa wiadomość
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Aktywne ({activeMessages.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {activeMessages.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Brak aktywnych wiadomości</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tytuł</TableHead>
                      <TableHead>Typ</TableHead>
                      <TableHead>Odbiorcy</TableHead>
                      <TableHead>Dostarczenie</TableHead>
                      <TableHead>Statystyki</TableHead>
                      <TableHead>Wersja</TableHead>
                      <TableHead>Akcje</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeMessages.map((msg) => {
                      const TypeIcon = typeIcons[msg.type] || Info;
                      return (
                        <TableRow key={msg.id} data-testid={`row-message-${msg.id}`}>
                          <TableCell>
                            <div className="font-medium">{msg.title}</div>
                            <div className="text-xs text-muted-foreground line-clamp-1">{msg.content}</div>
                          </TableCell>
                          <TableCell>
                            <Badge className={typeColors[msg.type] || ""} variant="outline">
                              <TypeIcon className="h-3 w-3 mr-1" />
                              {msg.type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={msg.targetRole === "DRIVER" ? "default" : "secondary"}>
                              {msg.targetRole === "DRIVER" ? "Kierowcy" : msg.targetRole === "ALL" ? "Wszyscy" : "Pasażerowie"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-xs space-y-1">
                              <div>{msg.deliveryMode}</div>
                              {msg.requireAcknowledgement && <Badge variant="outline" className="text-xs">Wymaga potwierdzenia</Badge>}
                              {msg.forceOnLogin && <Badge variant="outline" className="text-xs">Przy logowaniu</Badge>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-xs space-y-1">
                              <div>Docelowo: {msg.totalTargeted || 0}</div>
                              <div>Przeczytane: {msg.totalRead || 0} ({msg.readRate || 0}%)</div>
                              {msg.requireAcknowledgement && (
                                <div>Potwierdzone: {msg.totalAcknowledged || 0} ({msg.ackRate || 0}%)</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>v{msg.version || 1}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => openNewVersion(msg)} data-testid={`button-edit-message-${msg.id}`}>
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => deactivateMutation.mutate(msg.id)} data-testid={`button-deactivate-message-${msg.id}`}>
                                <EyeOff className="h-4 w-4 text-red-400" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {inactiveMessages.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-muted-foreground">Nieaktywne ({inactiveMessages.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tytuł</TableHead>
                      <TableHead>Typ</TableHead>
                      <TableHead>Odbiorcy</TableHead>
                      <TableHead>Wersja</TableHead>
                      <TableHead>Data utworzenia</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inactiveMessages.map((msg) => (
                      <TableRow key={msg.id} className="opacity-60" data-testid={`row-inactive-message-${msg.id}`}>
                        <TableCell>{msg.title}</TableCell>
                        <TableCell><Badge variant="outline">{msg.type}</Badge></TableCell>
                        <TableCell>{msg.targetRole === "DRIVER" ? "Kierowcy" : msg.targetRole === "ALL" ? "Wszyscy" : "Pasażerowie"}</TableCell>
                        <TableCell>v{msg.version || 1}</TableCell>
                        <TableCell className="text-sm">{new Date(msg.createdAt).toLocaleDateString("pl-PL")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <Dialog open={showCreate || !!editingMessage} onOpenChange={(open) => { if (!open) { setShowCreate(false); setEditingMessage(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingMessage ? `Nowa wersja (v${(editingMessage.version || 1) + 1})` : "Nowa wiadomość systemowa"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Tytuł</Label>
              <Input value={formData.title} onChange={(e) => setFormData(f => ({ ...f, title: e.target.value }))} placeholder="Tytuł wiadomości" data-testid="input-message-title" />
            </div>

            <div>
              <Label>Treść</Label>
              <Textarea value={formData.content} onChange={(e) => setFormData(f => ({ ...f, content: e.target.value }))} placeholder="Treść wiadomości..." rows={4} data-testid="input-message-content" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Odbiorcy</Label>
                <Select value={formData.targetRole} onValueChange={(v) => setFormData(f => ({ ...f, targetRole: v }))}>
                  <SelectTrigger data-testid="select-target-role"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRIVER">Kierowcy</SelectItem>
                    <SelectItem value="PASSENGER">Pasażerowie</SelectItem>
                    <SelectItem value="ALL">Wszyscy</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Typ</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData(f => ({ ...f, type: v }))}>
                  <SelectTrigger data-testid="select-message-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INFO">Info</SelectItem>
                    <SelectItem value="WARNING">Ostrzeżenie</SelectItem>
                    <SelectItem value="CRITICAL">Krytyczny</SelectItem>
                    <SelectItem value="PROMO">Promocja</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Sposób dostarczenia</Label>
              <Select value={formData.deliveryMode} onValueChange={(v) => setFormData(f => ({ ...f, deliveryMode: v }))}>
                <SelectTrigger data-testid="select-delivery-mode"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="INBOX">Skrzynka odbiorcza</SelectItem>
                  <SelectItem value="INBOX_AND_PUSH">Skrzynka + Push</SelectItem>
                  <SelectItem value="LOGIN_MODAL_ONLY">Tylko modal przy logowaniu</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Data wygaśnięcia (opcjonalnie)</Label>
              <Input type="date" value={formData.expiresAt} onChange={(e) => setFormData(f => ({ ...f, expiresAt: e.target.value }))} data-testid="input-expires-at" />
            </div>

            <div className="flex items-center justify-between">
              <Label>Wymaga potwierdzenia</Label>
              <Switch checked={formData.requireAcknowledgement} onCheckedChange={(v) => setFormData(f => ({ ...f, requireAcknowledgement: v }))} data-testid="switch-require-ack" />
            </div>

            <div className="flex items-center justify-between">
              <Label>Wymuś przy logowaniu</Label>
              <Switch checked={formData.forceOnLogin} onCheckedChange={(v) => setFormData(f => ({ ...f, forceOnLogin: v }))} data-testid="switch-force-login" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreate(false); setEditingMessage(null); }} data-testid="button-cancel-message">Anuluj</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || newVersionMutation.isPending} data-testid="button-submit-message">
              {(createMutation.isPending || newVersionMutation.isPending) && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {editingMessage ? "Utwórz nową wersję" : "Utwórz"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
