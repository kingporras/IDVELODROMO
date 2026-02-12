import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function RendimientoPage() {
  const { user } = useAuth();

  const { data: matches } = useQuery({
    queryKey: ["matches"],
    queryFn: async () => {
      const { data } = await supabase.from("matches").select("*").order("match_date", { ascending: true });
      return data || [];
    },
  });

  const { data: allResponses } = useQuery({
    queryKey: ["all-my-responses"],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("convocation_responses")
        .select("*, convocations(match_id)")
        .eq("user_id", user!.id);
      return data || [];
    },
  });

  const { data: myStats } = useQuery({
    queryKey: ["my-match-stats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("match_stats")
        .select("*, matches(home_team, away_team, match_date)")
        .eq("user_id", user!.id);
      return data || [];
    },
  });

  const pastMatches = matches?.filter((m) => new Date(m.match_date) < new Date()) || [];
  const attended = allResponses?.filter((r: any) => r.status === "yes").length || 0;
  const notAttended = allResponses?.filter((r: any) => r.status === "no").length || 0;
  const total = pastMatches.length || 1;
  const pct = Math.round((attended / total) * 100);

  const totalGoals = myStats?.reduce((sum: number, s: any) => sum + (s.goals || 0), 0) || 0;
  const totalAssists = myStats?.reduce((sum: number, s: any) => sum + (s.assists || 0), 0) || 0;

  const isInter = (t: string) => t.includes("INTER");

  return (
    <div className="space-y-4">
      <p className="motivational-text">La constancia gana partidos.</p>
      <h2 className="font-display font-bold text-xl text-white">Rendimiento</h2>

      <div className="grid grid-cols-5 gap-2">
        <Card className="shadow-md border-0">
          <CardContent className="py-3 text-center">
            <p className="text-2xl font-bold text-green-600">{attended}</p>
            <p className="text-[9px] text-muted-foreground">Asistidos</p>
          </CardContent>
        </Card>
        <Card className="shadow-md border-0">
          <CardContent className="py-3 text-center">
            <p className="text-2xl font-bold text-red-600">{notAttended}</p>
            <p className="text-[9px] text-muted-foreground">No asist.</p>
          </CardContent>
        </Card>
        <Card className="shadow-md border-0">
          <CardContent className="py-3 text-center">
            <p className="text-2xl font-bold text-primary">{pct}%</p>
            <p className="text-[9px] text-muted-foreground">% Asist.</p>
          </CardContent>
        </Card>
        <Card className="shadow-md border-0">
          <CardContent className="py-3 text-center">
            <p className="text-2xl font-bold text-primary">{totalGoals}</p>
            <p className="text-[9px] text-muted-foreground">⚽ Goles</p>
          </CardContent>
        </Card>
        <Card className="shadow-md border-0">
          <CardContent className="py-3 text-center">
            <p className="text-2xl font-bold text-primary">{totalAssists}</p>
            <p className="text-[9px] text-muted-foreground">🎯 Asist.</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-md border-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Historial</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {pastMatches.map((m) => {
            const response = allResponses?.find((r: any) => r.convocations?.match_id === m.id);
            const stat = myStats?.find((s: any) => s.matches && s.matches.match_date === m.match_date);
            const rival = isInter(m.home_team) ? m.away_team : m.home_team;
            return (
              <div key={m.id} className="flex items-center justify-between py-1.5 text-sm">
                <span className="text-muted-foreground">
                  {format(new Date(m.match_date), "d MMM", { locale: es })} — vs {rival}
                  {stat && (stat.goals > 0 || stat.assists > 0) && (
                    <span className="ml-1 text-xs">
                      {stat.goals > 0 ? ` ${stat.goals}⚽` : ""}
                      {stat.assists > 0 ? ` ${stat.assists}🎯` : ""}
                    </span>
                  )}
                </span>
                <Badge variant="outline" className="text-[10px]">
                  {response?.status === "yes" ? "✅" : response?.status === "no" ? "❌" : response?.status === "maybe" ? "🤔" : "—"}
                </Badge>
              </div>
            );
          })}
          {pastMatches.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Aún no hay partidos jugados.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
