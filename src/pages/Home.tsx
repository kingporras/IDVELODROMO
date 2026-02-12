import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, AlertTriangle, Trophy, Target, Calendar as CalIcon, User } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

export default function HomePage() {
  const { user } = useAuth();
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

  const { data: lastMatch } = useQuery({
    queryKey: ["last-match"],
    queryFn: async () => {
      const { data } = await supabase
        .from("matches")
        .select("*")
        .lt("match_date", new Date().toISOString())
        .order("match_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const { data: lastMatchStats } = useQuery({
    queryKey: ["last-match-stats", lastMatch?.id],
    enabled: !!lastMatch?.id,
    queryFn: async () => {
      const { data: statsData } = await supabase
        .from("match_stats")
        .select("*")
        .eq("match_id", lastMatch!.id)
        .order("goals", { ascending: false });
      if (!statsData) return [];
      // Enrich with profiles
      const { data: profs } = await supabase.from("profiles").select("id, display_name, dorsal");
      const profMap = new Map((profs || []).map((p: any) => [p.id, p]));
      return statsData.map((s: any) => ({ ...s, profile: profMap.get(s.user_id) }));
    },
  });

  const { data: lastMatchMvp } = useQuery({
    queryKey: ["last-match-mvp", lastMatch?.id],
    enabled: !!lastMatch?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("mvp_votes")
        .select("voted_user_id, profiles:voted_user_id(display_name, dorsal)")
        .eq("match_id", lastMatch!.id);
      if (!data || data.length === 0) return null;
      const counts: Record<string, { count: number; name: string; dorsal: number }> = {};
      data.forEach((v: any) => {
        const uid = v.voted_user_id;
        if (!counts[uid]) counts[uid] = { count: 0, name: v.profiles?.display_name || "?", dorsal: v.profiles?.dorsal || 0 };
        counts[uid].count++;
      });
      return Object.values(counts).sort((a, b) => b.count - a.count)[0] || null;
    },
  });

  const { data: lastMatchVideo } = useQuery({
    queryKey: ["last-match-video", lastMatch?.id],
    enabled: !!lastMatch?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("videos")
        .select("*")
        .eq("match_id", lastMatch!.id)
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const { data: myStats } = useQuery({
    queryKey: ["my-stats", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("match_stats")
        .select("goals, assists")
        .eq("user_id", user!.id);
      const totals = { goals: 0, assists: 0 };
      data?.forEach((s: any) => { totals.goals += s.goals; totals.assists += s.assists; });
      return totals;
    },
  });

  const { data: myMvps } = useQuery({
    queryKey: ["my-mvps", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("mvp_votes")
        .select("match_id, voted_user_id")
        .eq("voted_user_id", user!.id);
      // Count unique matches where this user got most votes (simplified: count all votes received)
      return data?.length || 0;
    },
  });

  const { data: myAttendance } = useQuery({
    queryKey: ["my-attendance", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("convocation_responses")
        .select("status")
        .eq("user_id", user!.id)
        .eq("status", "yes");
      return data?.length || 0;
    },
  });

  const { data: convocation } = useQuery({
    queryKey: ["convocation", nextMatch?.id],
    enabled: !!nextMatch?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("convocations")
        .select("*")
        .eq("match_id", nextMatch!.id)
        .maybeSingle();
      return data;
    },
  });

  const { data: myResponse } = useQuery({
    queryKey: ["my-response", convocation?.id],
    enabled: !!convocation?.id && !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("convocation_responses")
        .select("*")
        .eq("convocation_id", convocation!.id)
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const respondMutation = useMutation({
    mutationFn: async (status: string) => {
      if (myResponse) {
        await supabase
          .from("convocation_responses")
          .update({ status, updated_at: new Date().toISOString() })
          .eq("id", myResponse.id);
      } else {
        await supabase.from("convocation_responses").insert({
          convocation_id: convocation!.id,
          user_id: user!.id,
          status,
        });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-response"] }),
  });

  const isInter = (team: string) => team.includes("INTER");
  const rival = nextMatch ? (isInter(nextMatch.home_team) ? nextMatch.away_team : nextMatch.home_team) : null;
  const isHome = nextMatch ? isInter(nextMatch.home_team) : false;

  const statusLabels: Record<string, string> = {
    pending: "⏳ Pendiente", yes: "✅ Voy", no: "❌ No voy", maybe: "🤔 Duda",
  };
  const statusColors: Record<string, string> = {
    pending: "bg-muted text-muted-foreground", yes: "bg-green-100 text-green-800",
    no: "bg-red-100 text-red-800", maybe: "bg-yellow-100 text-yellow-800",
  };

  const lastRival = lastMatch ? (isInter(lastMatch.home_team) ? lastMatch.away_team : lastMatch.home_team) : null;
  const topScorer = lastMatchStats?.find((s: any) => s.goals > 0);
  const topAssist = lastMatchStats?.find((s: any) => s.assists > 0);

  return (
    <div className="space-y-4">
      <p className="motivational-text">Juntos hacemos fuerza.</p>

      <h2 className="font-display font-bold text-xl text-white">Próximo Partido</h2>

      {nextMatch ? (
        <Card className="shadow-lg border-0 overflow-hidden">
          <CardHeader className="pb-2 bg-gradient-to-r from-primary/10 to-primary/5">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                {isHome ? "🏠 Local" : "✈️ Visitante"}
              </Badge>
              <span className="text-xs text-muted-foreground">{nextMatch.league_name}</span>
            </div>
            <CardTitle className="text-lg font-display mt-2">vs {rival}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>{format(new Date(nextMatch.match_date), "EEEE d 'de' MMMM, HH:mm'h'", { locale: es })}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>{nextMatch.location_name}, {nextMatch.city}</span>
            </div>
            {convocation && (
              <>
                <div className="pt-2">
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${statusColors[myResponse?.status || "pending"]}`}>
                    {statusLabels[myResponse?.status || "pending"]}
                  </div>
                </div>
                {(!myResponse || myResponse.status === "pending") && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-yellow-50 text-yellow-800 text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="font-medium">¡Responde a la convocatoria!</span>
                  </div>
                )}
                <div className="flex gap-2 pt-1">
                  <Button size="sm" onClick={() => respondMutation.mutate("yes")} disabled={respondMutation.isPending}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white">✅ VOY</Button>
                  <Button size="sm" onClick={() => respondMutation.mutate("no")} disabled={respondMutation.isPending}
                    variant="destructive" className="flex-1">❌ NO VOY</Button>
                  <Button size="sm" onClick={() => respondMutation.mutate("maybe")} disabled={respondMutation.isPending}
                    variant="outline" className="flex-1 border-yellow-300 text-yellow-700 hover:bg-yellow-50">🤔 DUDA</Button>
                </div>
              </>
            )}
            {!convocation && (
              <p className="text-sm text-muted-foreground italic">La convocatoria aún no está abierta.</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-lg border-0">
          <CardContent className="py-8 text-center text-muted-foreground">No hay partidos próximos programados.</CardContent>
        </Card>
      )}

      {/* Mi Resumen */}
      <Card className="shadow-md border-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <User className="w-4 h-4 text-primary" /> Mi Resumen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-2 mb-3">
            <div className="text-center">
              <p className="text-lg font-bold text-primary">{myMvps || 0}</p>
              <p className="text-[10px] text-muted-foreground">🏆 MVP</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-primary">{myStats?.goals || 0}</p>
              <p className="text-[10px] text-muted-foreground">⚽ Goles</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-primary">{myStats?.assists || 0}</p>
              <p className="text-[10px] text-muted-foreground">🎯 Asist.</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-primary">{myAttendance || 0}</p>
              <p className="text-[10px] text-muted-foreground">📅 Asist.</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => navigate("/club")}>
            Ver mi ficha →
          </Button>
        </CardContent>
      </Card>

      {/* Último Partido */}
      {lastMatch && (
        <Card className="shadow-md border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Último Partido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">vs {lastRival}</span>
              {lastMatch.result_text && (
                <Badge className="bg-primary text-primary-foreground font-bold">{lastMatch.result_text}</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {format(new Date(lastMatch.match_date), "d MMM yyyy", { locale: es })}
            </p>
            {lastMatchMvp && (
              <div className="flex items-center gap-1 text-xs">
                <Trophy className="w-3 h-3 text-primary" />
                <span className="font-medium">MVP: #{lastMatchMvp.dorsal} {lastMatchMvp.name}</span>
              </div>
            )}
            <div className="flex gap-3 text-xs text-muted-foreground">
              {topScorer && <span>⚽ #{topScorer.profile?.dorsal} {topScorer.profile?.display_name} ({topScorer.goals})</span>}
              {topAssist && <span>🎯 #{topAssist.profile?.dorsal} {topAssist.profile?.display_name} ({topAssist.assists})</span>}
            </div>
            {lastMatchVideo && (
              <Button size="sm" variant="outline" className="text-xs mt-1"
                onClick={() => window.open(lastMatchVideo.vimeo_url, "_blank")}>
                🎬 Ver vídeo
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
