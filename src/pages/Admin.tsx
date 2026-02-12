import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Navigate, useNavigate } from "react-router-dom";
import { LogOut, Mail, CreditCard, RefreshCw, Loader2, BarChart3, Video } from "lucide-react";

export default function AdminPage() {
  const { isAdmin, signOut } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: nextMatch } = useQuery({
    queryKey: ["next-match"],
    queryFn: async () => {
      const { data } = await supabase
        .from("matches")
        .select("*")
        .gte("match_date", new Date().toISOString())
        .order("match_date", { ascending: true })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["all-profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").order("dorsal");
      return data || [];
    },
  });

  const openConvocationMutation = useMutation({
    mutationFn: async () => {
      if (!nextMatch) throw new Error("No hay próximo partido");
      const { data: conv, error: convError } = await supabase
        .from("convocations")
        .upsert({ match_id: nextMatch.id, status: "open", reset_at: new Date().toISOString() }, { onConflict: "match_id" })
        .select().single();
      if (convError) throw convError;
      await supabase.from("convocation_responses").delete().eq("convocation_id", conv.id);
      const responses = profiles!.map((p: any) => ({ convocation_id: conv.id, user_id: p.id, status: "pending" }));
      await supabase.from("convocation_responses").insert(responses);
      return conv;
    },
    onSuccess: () => { toast.success("Convocatoria abierta y estados reseteados"); queryClient.invalidateQueries(); },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const sendReminderMutation = useMutation({
    mutationFn: async () => {
      if (!nextMatch) throw new Error("No hay próximo partido");
      const res = await supabase.functions.invoke("send-reminder", { body: { match_id: nextMatch.id } });
      if (res.error) throw res.error;
      return res.data;
    },
    onSuccess: (data) => toast.success(`Recordatorio enviado a ${data.sent} jugadores`),
    onError: (e) => toast.error(`Error enviando emails: ${e.message}`),
  });

  const sendPaymentMutation = useMutation({
    mutationFn: async () => {
      const res = await supabase.functions.invoke("send-payment-email", {});
      if (res.error) throw res.error;
      return res.data;
    },
    onSuccess: (data) => toast.success(`Email de pago enviado a ${data.sent} jugadores`),
    onError: (e) => toast.error(`Error enviando emails: ${e.message}`),
  });

  if (!isAdmin) return <Navigate to="/" replace />;

  const handleMondayButton = async () => {
    await openConvocationMutation.mutateAsync();
    sendReminderMutation.mutate();
  };
  const isMondayPending = openConvocationMutation.isPending || sendReminderMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold text-xl text-white">Panel Admin</h2>
        <Button variant="ghost" size="sm" onClick={signOut} className="text-white/70">
          <LogOut className="w-4 h-4" />
        </Button>
      </div>

      {/* Quick nav */}
      <div className="grid grid-cols-3 gap-2">
        <Button variant="outline" size="sm" className="text-xs h-auto py-3 flex flex-col gap-1" onClick={() => navigate("/admin/pagos")}>
          <CreditCard className="w-4 h-4" /> Pagos
        </Button>
        <Button variant="outline" size="sm" className="text-xs h-auto py-3 flex flex-col gap-1" onClick={() => navigate("/admin/post-partido")}>
          <BarChart3 className="w-4 h-4" /> Post-Partido
        </Button>
        <Button variant="outline" size="sm" className="text-xs h-auto py-3 flex flex-col gap-1" onClick={() => navigate("/admin/videos")}>
          <Video className="w-4 h-4" /> Vídeos
        </Button>
      </div>

      <Card className="shadow-lg border-0 border-l-4 border-l-primary">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Botón Lunes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">Abre convocatoria + resetea estados + envía email.</p>
          {nextMatch && (
            <p className="text-xs font-medium">{nextMatch.home_team} vs {nextMatch.away_team}</p>
          )}
          <Button onClick={handleMondayButton} disabled={isMondayPending || !nextMatch} className="w-full bg-primary hover:bg-primary/90">
            {isMondayPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
            Abrir convocatoria + Reset + Email
          </Button>
        </CardContent>
      </Card>

      <Card className="shadow-lg border-0 border-l-4 border-l-green-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <CreditCard className="w-4 h-4" /> Botón Pago
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">Envía email de pago (25€) a todos.</p>
          <Button variant="outline" className="w-full" onClick={() => sendPaymentMutation.mutate()} disabled={sendPaymentMutation.isPending}>
            {sendPaymentMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
            Enviar email de pago 25€
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
