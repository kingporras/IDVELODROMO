import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { Save, Minus, Plus } from "lucide-react";

export default function AdminPostMatchPage() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [selectedMatchId, setSelectedMatchId] = useState<string>("");
  const [resultText, setResultText] = useState("");
  const [highlightsNote, setHighlightsNote] = useState("");
  const [stats, setStats] = useState<Record<string, { goals: number; assists: number; yellow_cards: number; red_cards: number }>>({});

  const { data: matches } = useQuery({
    queryKey: ["past-matches"],
    queryFn: async () => {
      const { data } = await supabase
        .from("matches")
        .select("*")
        .lt("match_date", new Date().toISOString())
        .order("match_date", { ascending: false })
        .limit(10);
      return data || [];
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["all-profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").order("dorsal");
      return data || [];
    },
  });

  const { data: existingStats } = useQuery({
    queryKey: ["match-stats", selectedMatchId],
    enabled: !!selectedMatchId,
    queryFn: async () => {
      const { data } = await supabase
        .from("match_stats")
        .select("*")
        .eq("match_id", selectedMatchId);
      return data || [];
    },
  });

  useEffect(() => {
    if (selectedMatchId && existingStats && profiles) {
      const newStats: typeof stats = {};
      profiles.forEach((p: any) => {
        const existing = existingStats.find((s: any) => s.user_id === p.id);
        newStats[p.id] = {
          goals: existing?.goals || 0,
          assists: existing?.assists || 0,
          yellow_cards: existing?.yellow_cards || 0,
          red_cards: existing?.red_cards || 0,
        };
      });
      setStats(newStats);

      const match = matches?.find((m: any) => m.id === selectedMatchId);
      setResultText(match?.result_text || "");
      setHighlightsNote(match?.highlights_note || "");
    }
  }, [selectedMatchId, existingStats, profiles]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await supabase.from("matches").update({
        result_text: resultText || null,
        highlights_note: highlightsNote || null,
      }).eq("id", selectedMatchId);

      const entries = Object.entries(stats)
        .filter(([_, s]) => s.goals > 0 || s.assists > 0 || s.yellow_cards > 0 || s.red_cards > 0)
        .map(([userId, s]) => ({
          match_id: selectedMatchId,
          user_id: userId,
          goals: s.goals,
          assists: s.assists,
          yellow_cards: s.yellow_cards,
          red_cards: s.red_cards,
        }));

      await supabase.from("match_stats").delete().eq("match_id", selectedMatchId);
      if (entries.length > 0) {
        await supabase.from("match_stats").insert(entries);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success("Datos del partido guardados");
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  if (!isAdmin) return <Navigate to="/" replace />;

  const updateStat = (userId: string, field: string, delta: number) => {
    setStats((prev) => {
      const current = prev[userId] || { goals: 0, assists: 0, yellow_cards: 0, red_cards: 0 };
      const newVal = Math.max(0, (current as any)[field] + delta);
      return { ...prev, [userId]: { ...current, [field]: newVal } };
    });
  };

  const isInter = (t: string) => t?.includes("INTER");

  return (
    <div className="space-y-4">
      <h2 className="font-display font-bold text-xl text-white">Post-Partido</h2>

      <Card className="border-0 shadow-md">
        <CardContent className="py-4 space-y-3">
          <Select value={selectedMatchId || "__none__"} onValueChange={(v) => setSelectedMatchId(v === "__none__" ? "" : v)}>
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="Selecciona partido..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— Selecciona —</SelectItem>
              {matches?.map((m: any) => {
                const rival = isInter(m.home_team) ? m.away_team : m.home_team;
                return (
                  <SelectItem key={m.id} value={m.id}>
                    vs {rival} — {new Date(m.match_date).toLocaleDateString("es")}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          {selectedMatchId && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Resultado</label>
                  <Input value={resultText} onChange={(e) => setResultText(e.target.value)} placeholder="3-2" className="text-sm h-8" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Nota</label>
                  <Input value={highlightsNote} onChange={(e) => setHighlightsNote(e.target.value)} placeholder="Opcional..." className="text-sm h-8" />
                </div>
              </div>

              <div className="space-y-1">
                <div className="grid grid-cols-[1fr_60px_60px_50px_50px] gap-1 text-[10px] font-semibold text-muted-foreground px-1">
                  <span>Jugador</span><span className="text-center">⚽</span><span className="text-center">🎯</span>
                  <span className="text-center">🟨</span><span className="text-center">🟥</span>
                </div>
                {profiles?.map((p: any) => {
                  const s = stats[p.id] || { goals: 0, assists: 0, yellow_cards: 0, red_cards: 0 };
                  return (
                    <div key={p.id} className="grid grid-cols-[1fr_60px_60px_50px_50px] gap-1 items-center bg-card rounded px-1 py-1">
                      <span className="text-xs font-medium truncate">#{p.dorsal} {p.display_name}</span>
                      {(["goals", "assists", "yellow_cards", "red_cards"] as const).map((field) => (
                        <div key={field} className="flex items-center justify-center gap-0.5">
                          <button onClick={() => updateStat(p.id, field, -1)} className="w-5 h-5 rounded bg-muted flex items-center justify-center text-xs">
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-bold w-4 text-center">{s[field]}</span>
                          <button onClick={() => updateStat(p.id, field, 1)} className="w-5 h-5 rounded bg-muted flex items-center justify-center text-xs">
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>

              <Button className="w-full bg-primary hover:bg-primary/90" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                <Save className="w-4 h-4 mr-2" />
                {saveMutation.isPending ? "Guardando..." : "Guardar datos del partido"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
