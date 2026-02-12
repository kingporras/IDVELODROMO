import React, { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
const escudo = "https://storage.googleapis.com/gpt-engineer-file-uploads/UF0tOdHEGYfctSMIyR1WMn2uAlB2/uploads/1770913095083-escudo_512x512.png";

export default function LoginPage() {
  const { user, loading, signIn } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (loading) return null;
  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await signIn(username, password);
    if (result.error) setError(result.error);
    setSubmitting(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 relative">
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-[hsl(203,60%,82%)] to-[hsl(203,50%,55%)]" />
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-[hsl(203,60%,82%)]/25 to-[hsl(203,50%,55%)]/35" />

      <div className="relative z-10 w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <img src={escudo} alt="El Inter de Verdún" className="w-32 h-32 mb-4 drop-shadow-lg" />
          <h1 className="font-display font-bold text-2xl text-white tracking-tight">
            EL INTER DE VERDÚN
          </h1>
          <p className="text-white/60 text-sm mt-1">2a Lliga Velòdrom F7</p>
        </div>

        <Card className="shadow-xl border-0">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium">
                  Usuario
                </Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Tu apodo"
                  autoCapitalize="none"
                  autoComplete="username"
                  className="bg-secondary/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Contraseña
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tu dorsal"
                  autoComplete="current-password"
                  className="bg-secondary/50"
                />
              </div>
              {error && (
                <p className="text-sm text-destructive font-medium">{error}</p>
              )}
              <Button
                type="submit"
                disabled={submitting || !username || !password}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              >
                {submitting ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
