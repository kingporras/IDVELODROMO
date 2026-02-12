import React, { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";

const getCurrentMonthKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

export default function PagosPage() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const monthKey = getCurrentMonthKey();

  const { data: cycle } = useQuery({
    queryKey: ["payment-cycle", monthKey],
    queryFn: async () => {
      let { data } = await supabase.from("payment_cycles").select("*").eq("month_key", monthKey).maybeSingle();
      if (!data) {
        const { data: newCycle } = await supabase.from("payment_cycles").insert({ month_key: monthKey, amount: 25 }).select().single();
        data = newCycle;
      }
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

  const { data: payments, refetch: refetchPayments } = useQuery({
    queryKey: ["cycle-payments", cycle?.id],
    enabled: !!cycle?.id,
    queryFn: async () => {
      const { data } = await supabase.from("payments").select("*").eq("cycle_id", cycle!.id);
      return data || [];
    },
  });

  const ensurePaymentsMutation = useMutation({
    mutationFn: async () => {
      if (!cycle || !profiles) return;
      const existingUserIds = new Set(payments?.map((p: any) => p.user_id) || []);
      const missing = profiles.filter((p: any) => !existingUserIds.has(p.id));
      if (missing.length > 0) {
        await supabase.from("payments").insert(missing.map((p: any) => ({ user_id: p.id, cycle_id: cycle.id, status: "pending" })));
      }
    },
    onSuccess: () => refetchPayments(),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: string }) => {
      await supabase.from("payments").update({
        status: newStatus,
        paid_at: newStatus === "paid" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      }).eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cycle-payments"] });
      toast.success("Estado de pago actualizado");
    },
  });

  useEffect(() => {
    if (cycle && profiles && profiles.length > 0 && payments !== undefined) {
      const existingUserIds = new Set(payments?.map((p: any) => p.user_id) || []);
      const hasMissing = profiles.some((p: any) => !existingUserIds.has(p.id));
      if (hasMissing) ensurePaymentsMutation.mutate();
    }
  }, [cycle?.id, profiles?.length, payments?.length]);

  if (!isAdmin) return <Navigate to="/" replace />;

  const paymentMap = new Map((payments || []).map((p: any) => [p.user_id, p]));
  const displayList = (profiles || []).map((p: any) => ({ profile: p, payment: paymentMap.get(p.id) }));
  const paidCount = displayList.filter((d) => d.payment?.status === "paid").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-xl text-white">Pagos 25€</h2>
          <p className="text-xs text-white/60">{monthKey}</p>
        </div>
        <Badge className="bg-primary text-primary-foreground text-xs px-3 py-1">{paidCount}/{displayList.length} pagados</Badge>
      </div>
      <div className="space-y-2">
        {displayList.map(({ profile: p, payment }) => (
          <Card key={p.id} className={`border-l-4 shadow-sm ${payment?.status === "paid" ? "border-l-green-500 bg-green-50/80" : "border-l-red-400 bg-red-50/80"}`}>
            <CardContent className="py-3 px-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm text-foreground">#{p.dorsal} {p.display_name}</p>
                {payment?.paid_at && <p className="text-[10px] text-muted-foreground">Pagado: {new Date(payment.paid_at).toLocaleDateString("es")}</p>}
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${payment?.status === "paid" ? "bg-green-200 text-green-800" : "bg-red-200 text-red-800"}`}>
                  {payment?.status === "paid" ? "✅ Pagado" : "❌ Pendiente"}
                </span>
                {payment && <Switch checked={payment.status === "paid"} onCheckedChange={(checked) => toggleMutation.mutate({ id: payment.id, newStatus: checked ? "paid" : "pending" })} />}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
