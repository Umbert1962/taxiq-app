import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ShieldCheck, ShieldOff, Clock, AlertTriangle, CheckCircle2, X, Eye, Loader2, Search, Ban
} from "lucide-react";

interface VerificationDriver {
  id: string;
  firstName: string | null;
  lastName: string | null;
  name: string;
  phone: string;
  taxiqId: string;
  verificationStatus: string;
  idCardImageUrl: string | null;
  photoUrl: string | null;
  createdAt: string | null;
  isActive: boolean;
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    UNVERIFIED: { label: "Niezweryfikowany", variant: "outline" },
    approved: { label: "Zatwierdzony", variant: "default" },
    rejected: { label: "Odrzucony", variant: "destructive" },
    pending_verification: { label: "Do weryfikacji", variant: "secondary" },
    pending_admin_review: { label: "Do weryfikacji", variant: "secondary" },
  };
  const info = map[status] || { label: status, variant: "outline" as const };
  return <Badge variant={info.variant} data-testid={`badge-status-${status}`}>{info.label}</Badge>;
}

function statusIcon(status: string) {
  switch (status) {
    case "pending_admin_review":
    case "pending_verification":
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    case "approved":
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case "rejected":
      return <X className="h-4 w-4 text-red-500" />;
    default: return <ShieldOff className="h-4 w-4 text-gray-400" />;
  }
}

export default function AdminDriverVerification() {
  const { toast } = useToast();
  const [selectedDriver, setSelectedDriver] = useState<VerificationDriver | null>(null);
  const [showDocDialog, setShowDocDialog] = useState(false);
  const [actionNotes, setActionNotes] = useState("");
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: queue = [], isLoading } = useQuery<VerificationDriver[]>({
    queryKey: ["/api/admin/verification-queue"],
    refetchInterval: 10000,
  });

  const verifyMutation = useMutation({
    mutationFn: async ({ driverId, action, notes }: { driverId: string; action: string; notes: string }) => {
      const res = await apiRequest("POST", `/api/admin/verify-driver/${driverId}`, { action, notes });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Sukces", description: data.message });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/verification-queue"] });
      setShowDocDialog(false);
      setSelectedDriver(null);
      setActionNotes("");
      setFilter("all");
    },
    onError: () => {
      toast({ title: "Błąd", description: "Nie udało się zaktualizować weryfikacji", variant: "destructive" });
    },
  });

  const filtered = queue.filter((d) => {
    if (filter !== "all") {
      if (filter === "pending_verification") {
        if (d.verificationStatus !== "pending_verification" && d.verificationStatus !== "pending_admin_review") return false;
      } else if (d.verificationStatus !== filter) return false;
    }
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      return (
        d.name?.toLowerCase().includes(s) ||
        d.taxiqId?.toLowerCase().includes(s) ||
        d.phone?.includes(s)
      );
    }
    return true;
  });

  const counts = {
    all: queue.length,
    pending_verification: queue.filter(d => d.verificationStatus === "pending_verification").length,
    approved: queue.filter(d => d.verificationStatus === "approved").length,
    rejected: queue.filter(d => d.verificationStatus === "rejected").length,
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" data-testid="verification-title">
            <ShieldCheck className="h-5 w-5 text-[hsl(70,100%,50%)]" />
            Kolejka weryfikacji kierowców
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4" data-testid="verification-filters">
            {[
              { key: "all", label: `Wszystkie (${counts.all})` },
              { key: "pending_verification", label: `Do weryfikacji (${counts.pending_verification})` },
              { key: "approved", label: `Zatwierdzone (${counts.approved})` },
              { key: "rejected", label: `Odrzucone (${counts.rejected})` },
            ].map(f => (
              <Button
                key={f.key}
                variant={filter === f.key ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(f.key)}
                data-testid={`filter-${f.key}`}
              >
                {f.label}
              </Button>
            ))}
          </div>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Szukaj po imieniu, TaxiQ ID, telefonie..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="verification-search"
            />
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8" data-testid="verification-empty">
              Brak kierowców w kolejce weryfikacji
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kierowca</TableHead>
                    <TableHead>TaxiQ ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Akcje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((d) => (
                    <TableRow key={d.id} data-testid={`verification-row-${d.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {d.photoUrl && (
                            <img src={d.photoUrl} alt="" className="w-10 h-10 rounded-full object-cover border" />
                          )}
                          <div>
                            <div className="font-medium">{d.name}</div>
                            <div className="text-xs text-muted-foreground">{d.phone}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1 py-0.5 rounded">{d.taxiqId}</code>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {statusIcon(d.verificationStatus)}
                          {statusBadge(d.verificationStatus)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedDriver(d);
                            setShowDocDialog(true);
                            setActionNotes("");
                          }}
                          data-testid={`verify-btn-${d.id}`}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Weryfikuj
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDocDialog} onOpenChange={(open) => { if (!open) { setShowDocDialog(false); setSelectedDriver(null); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="verify-dialog-title">
              Weryfikacja: {selectedDriver?.name}
            </DialogTitle>
            <DialogDescription>
              TaxiQ ID: {selectedDriver?.taxiqId} | Telefon: {selectedDriver?.phone}
            </DialogDescription>
          </DialogHeader>

          {selectedDriver && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Zdjęcie profilowe</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedDriver.photoUrl ? (
                      <img src={selectedDriver.photoUrl} alt="Profil" className="w-full h-auto rounded border" />
                    ) : (
                      <div className="p-8 text-center bg-muted text-muted-foreground text-xs">Brak zdjęcia</div>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Identyfikator Taxi</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedDriver.idCardImageUrl ? (
                      <div className="space-y-2">
                        <img src={selectedDriver.idCardImageUrl} alt="Dowód" className="w-full h-auto rounded border" />
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full"
                          onClick={() => window.open(selectedDriver.idCardImageUrl!, '_blank')}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Powiększ
                        </Button>
                      </div>
                    ) : (
                      <div className="p-8 text-center bg-muted text-muted-foreground text-xs">Brak skanu identyfikatora</div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="flex gap-2 justify-end mt-4">
                <Button
                  variant="destructive"
                  onClick={() => verifyMutation.mutate({ driverId: selectedDriver.id, action: "reject", notes: "" })}
                  disabled={verifyMutation.isPending}
                >
                  <Ban className="w-4 h-4 mr-1" />
                  Odrzuć
                </Button>
                <Button
                  variant="default"
                  onClick={() => verifyMutation.mutate({ driverId: selectedDriver.id, action: "approve", notes: "" })}
                  disabled={verifyMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  Zatwierdź
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
