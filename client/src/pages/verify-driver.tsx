import { useState } from "react";
import { useRoute } from "wouter";
import { Helmet } from "react-helmet";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ShieldOff, Search, Loader2, User, Phone, CheckCircle2, XCircle, ExternalLink } from "lucide-react";

interface VerifyResult {
  taxiqId: string;
  firstName: string | null;
  photoUrl: string | null;
  verificationStatus: string;
  taxiLicenseNumber: string | null;
  isActive: boolean;
  verified: boolean;
  message: string;
  verifiedAt?: string;
}

export default function VerifyDriver() {
  const [, params] = useRoute("/verify/:taxiqId");
  const [searchId, setSearchId] = useState(params?.taxiqId || "");
  const [queryId, setQueryId] = useState(params?.taxiqId || "");

  const { data, isLoading, isError } = useQuery<VerifyResult>({
    queryKey: ["/api/verify", queryId],
    queryFn: async () => {
      const res = await fetch(`/api/verify/${queryId}`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    enabled: !!queryId,
  });

  const handleSearch = () => {
    const id = searchId.trim().toUpperCase();
    if (id) setQueryId(id);
  };

  return (
    <>
      <Helmet>
        <title>Weryfikacja kierowcy - TaxiQ</title>
        <meta name="description" content="Zweryfikuj tożsamość kierowcy TaxiQ. Sprawdź czy Twój kierowca jest zarejestrowany i zweryfikowany." />
      </Helmet>

      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2 mb-4">
              <ShieldCheck className="w-10 h-10 text-[hsl(70,100%,50%)]" />
            </div>
            <h1 className="text-2xl font-bold text-white" data-testid="verify-page-title">
              Weryfikacja kierowcy TaxiQ
            </h1>
            <p className="text-sm text-muted-foreground">
              Sprawdź, czy kierowca jest zarejestrowany i zweryfikowany w systemie TaxiQ
            </p>
          </div>

          <Card className="border-[hsl(70,100%,50%)]/20">
            <CardContent className="pt-6">
              <div className="flex gap-2">
                <Input
                  placeholder="Wpisz TaxiQ ID (np. TXQ-ABC123)"
                  value={searchId}
                  onChange={(e) => setSearchId(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="font-mono"
                  data-testid="input-verify-search"
                />
                <Button onClick={handleSearch} disabled={isLoading} data-testid="btn-verify-search">
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>

          {isLoading && (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-[hsl(70,100%,50%)]" />
            </div>
          )}

          {isError && queryId && (
            <Card className="border-red-500/30">
              <CardContent className="pt-6 text-center">
                <XCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                <p className="text-red-400 font-medium" data-testid="verify-not-found">
                  Nie znaleziono kierowcy o podanym ID
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Sprawdź poprawność wpisanego identyfikatora TaxiQ
                </p>
              </CardContent>
            </Card>
          )}

          {data && !isLoading && (
            <Card className={data.verified ? "border-green-500/30" : "border-yellow-500/30"} data-testid="verify-result-card">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  {data.verified ? (
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                  ) : (
                    <ShieldOff className="w-6 h-6 text-yellow-500" />
                  )}
                  <span className={data.verified ? "text-green-400" : "text-yellow-400"}>
                    {data.verified ? "Kierowca zweryfikowany" : "Kierowca niezweryfikowany"}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  {data.photoUrl ? (
                    <img
                      src={data.photoUrl}
                      alt="Zdjęcie kierowcy"
                      className="w-20 h-20 rounded-full object-cover border-2 border-muted"
                      data-testid="verify-driver-photo"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center border-2 border-dashed border-muted-foreground">
                      <User className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="space-y-1">
                    <div className="font-semibold text-white text-lg" data-testid="verify-driver-name">
                      {data.firstName || "—"}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <code className="bg-muted px-1.5 py-0.5 rounded text-xs" data-testid="verify-taxiq-id">
                        {data.taxiqId}
                      </code>
                    </div>
                    {data.taxiLicenseNumber && (
                      <div className="text-xs text-muted-foreground" data-testid="verify-license">
                        Nr identyfikatora: {data.taxiLicenseNumber}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-2 border-t border-muted">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status weryfikacji</span>
                    <Badge
                      variant={data.verified ? "default" : "outline"}
                      className={data.verified ? "bg-green-600" : ""}
                      data-testid="verify-status-badge"
                    >
                      {data.verified ? "Zweryfikowany" : data.message}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status konta</span>
                    <Badge variant={data.isActive ? "default" : "destructive"} data-testid="verify-active-badge">
                      {data.isActive ? "Aktywny" : "Nieaktywny"}
                    </Badge>
                  </div>
                </div>

                {data.verified && (
                  <div className="bg-green-500/10 rounded-lg p-3 text-center">
                    <p className="text-sm text-green-400">
                      Ten kierowca jest zweryfikowany w systemie TaxiQ i uprawniony do świadczenia usług przewozu.
                    </p>
                  </div>
                )}

                {!data.verified && (
                  <div className="bg-yellow-500/10 rounded-lg p-3 text-center">
                    <p className="text-sm text-yellow-400">
                      {data.message}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="text-center">
            <a href="/" className="text-sm text-muted-foreground hover:text-primary transition-colors" data-testid="link-back-home">
              ← Powrót do strony głównej
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
