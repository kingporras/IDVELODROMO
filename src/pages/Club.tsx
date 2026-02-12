import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Instagram, ExternalLink, MapPin, Trophy, Users, BarChart3, X } from "lucide-react";
const escudo = "https://storage.googleapis.com/gpt-engineer-file-uploads/UF0tOdHEGYfctSMIyR1WMn2uAlB2/uploads/1770913095083-escudo_512x512.png";

export default function ClubPage() {
  const { user } = useAuth();
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  const { data: profiles } = useQuery({
    queryKey: ["all-profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").order("dorsal");
      return data || [];
    },
  });

  const { data: allStats } = useQuery({
    queryKey: ["all-match-stats"],
    queryFn: async () => {
      const { data } = await supabase.from("match_stats").select("*, matches(home_team, away_team, match_date)");
      return data || [];
    },
  });

  const { data: allMvpVotes } = useQuery({
    queryKey: ["all-mvp-votes"],
    queryFn: async () => {
      const { data } = await supabase.from("mvp_votes").select("voted_user_id, match_id");
      return data || [];
    },
  });

  const { data: allAttendance } = useQuery({
    queryKey: ["all-attendance"],
    queryFn: async () => {
      const { data } = await supabase.from("convocation_responses").select("user_id, status").eq("status", "yes");
      return data || [];
    },
  });

  // Aggregate stats per player
  const playerAggregates = React.useMemo(() => {
    const agg: Record<string, { goals: number; assists: number; mvps: number; attendance: number }> = {};
    profiles?.forEach((p: any) => {
      agg[p.id] = { goals: 0, assists: 0, mvps: 0, attendance: 0 };
    });
    allStats?.forEach((s: any) => {
      if (agg[s.user_id]) {
        agg[s.user_id].goals += s.goals || 0;
        agg[s.user_id].assists += s.assists || 0;
      }
    });
    allMvpVotes?.forEach((v: any) => {
      if (agg[v.voted_user_id]) agg[v.voted_user_id].mvps++;
    });
    allAttendance?.forEach((a: any) => {
      if (agg[a.user_id]) agg[a.user_id].attendance++;
    });
    return agg;
  }, [profiles, allStats, allMvpVotes, allAttendance]);

  // Player match history
  const playerMatchHistory = React.useMemo(() => {
    if (!selectedPlayer) return [];
    return (allStats || [])
      .filter((s: any) => s.user_id === selectedPlayer && (s.goals > 0 || s.assists > 0))
      .map((s: any) => {
        const isInter = (t: string) => t?.includes("INTER");
        const rival = s.matches ? (isInter(s.matches.home_team) ? s.matches.away_team : s.matches.home_team) : "?";
        return { rival, goals: s.goals, assists: s.assists, date: s.matches?.match_date };
      })
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedPlayer, allStats]);

  const rankings = (key: "goals" | "assists" | "mvps" | "attendance") => {
    return (profiles || [])
      .map((p: any) => ({ ...p, value: playerAggregates[p.id]?.[key] || 0 }))
      .filter((p: any) => p.value > 0)
      .sort((a: any, b: any) => b.value - a.value);
  };

  const selectedProfile = profiles?.find((p: any) => p.id === selectedPlayer);
  const selectedAgg = selectedPlayer ? playerAggregates[selectedPlayer] : null;

  return (
    <div className="space-y-4">
      <p className="motivational-text">Inter de Verdún. Desde 2023.</p>

      {/* Hero */}
      <div className="relative rounded-xl overflow-hidden shadow-lg" style={{ height: 180 }}>
        <div className="absolute inset-0 bg-gradient-to-t from-[hsl(203,60%,30%)]/80 to-[hsl(203,60%,50%)]/40" />
        <div className="relative z-10 flex flex-col items-center justify-center h-full">
          <img src={escudo} alt="Escudo" className="w-16 h-16 drop-shadow-lg mb-1" />
          <h2 className="font-display font-bold text-xl text-white drop-shadow">EL INTER DE VERDÚN</h2>
          <p className="text-white/70 text-xs">Fútbol 7 · Barcelona</p>
        </div>
      </div>

      {/* Player card modal */}
      {selectedPlayer && selectedProfile && (
        <Card className="border-0 shadow-lg border-l-4 border-l-primary">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold">#{selectedProfile.dorsal} {selectedProfile.display_name}</CardTitle>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedPlayer(null)}>
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-2 mb-3">
              <div className="text-center"><p className="text-lg font-bold text-primary">{selectedAgg?.mvps || 0}</p><p className="text-[10px] text-muted-foreground">🏆 MVP</p></div>
              <div className="text-center"><p className="text-lg font-bold text-primary">{selectedAgg?.goals || 0}</p><p className="text-[10px] text-muted-foreground">⚽ Goles</p></div>
              <div className="text-center"><p className="text-lg font-bold text-primary">{selectedAgg?.assists || 0}</p><p className="text-[10px] text-muted-foreground">🎯 Asist.</p></div>
              <div className="text-center"><p className="text-lg font-bold text-primary">{selectedAgg?.attendance || 0}</p><p className="text-[10px] text-muted-foreground">📅 Asist.</p></div>
            </div>
            {playerMatchHistory.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground mb-1">Historial:</p>
                {playerMatchHistory.slice(0, 5).map((h: any, i: number) => (
                  <p key={i} className="text-xs text-muted-foreground">
                    vs {h.rival}: {h.goals > 0 ? `${h.goals}⚽ ` : ""}{h.assists > 0 ? `${h.assists}🎯` : ""}
                  </p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="plantilla" className="w-full">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="plantilla" className="text-xs"><Users className="w-3.5 h-3.5 mr-1" />Plantilla</TabsTrigger>
          <TabsTrigger value="rankings" className="text-xs"><BarChart3 className="w-3.5 h-3.5 mr-1" />Rankings</TabsTrigger>
          <TabsTrigger value="info" className="text-xs"><Trophy className="w-3.5 h-3.5 mr-1" />Info</TabsTrigger>
        </TabsList>

        <TabsContent value="plantilla" className="mt-3">
          <div className="grid grid-cols-3 gap-2">
            {profiles?.map((p: any) => {
              const agg = playerAggregates[p.id];
              return (
                <Card
                  key={p.id}
                  className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow bg-gradient-to-b from-card to-secondary/30"
                  onClick={() => setSelectedPlayer(p.id)}
                >
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-display font-bold text-primary">{p.dorsal}</p>
                    <p className="text-xs font-semibold truncate">{p.display_name}</p>
                    <div className="flex justify-center gap-1 mt-1 flex-wrap">
                      {agg?.mvps > 0 && <span className="text-[9px]">🏆{agg.mvps}</span>}
                      {agg?.goals > 0 && <span className="text-[9px]">⚽{agg.goals}</span>}
                      {agg?.assists > 0 && <span className="text-[9px]">🎯{agg.assists}</span>}
                      {agg?.attendance > 0 && <span className="text-[9px]">📅{agg.attendance}</span>}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="rankings" className="mt-3">
          <Tabs defaultValue="mvps" className="w-full">
            <TabsList className="w-full grid grid-cols-4">
              <TabsTrigger value="mvps" className="text-[10px]">🏆 MVP</TabsTrigger>
              <TabsTrigger value="goals" className="text-[10px]">⚽ Goles</TabsTrigger>
              <TabsTrigger value="assists" className="text-[10px]">🎯 Asist.</TabsTrigger>
              <TabsTrigger value="attendance" className="text-[10px]">📅 Asist.</TabsTrigger>
            </TabsList>
            {(["mvps", "goals", "assists", "attendance"] as const).map((key) => (
              <TabsContent key={key} value={key} className="mt-2 space-y-1">
                {rankings(key).length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">Sin datos aún.</p>
                )}
                {rankings(key).map((p: any, i: number) => (
                  <div key={p.id} className={`flex items-center justify-between py-1.5 px-3 rounded-lg text-sm ${i === 0 ? "bg-primary/10 font-bold" : "bg-card"}`}>
                    <span>{i === 0 ? "⭐ " : `${i + 1}. `}#{p.dorsal} {p.display_name}</span>
                    <Badge variant="outline" className="text-xs">{p.value}</Badge>
                  </div>
                ))}
              </TabsContent>
            ))}
          </Tabs>
        </TabsContent>

        <TabsContent value="info" className="mt-3 space-y-3">
          <Card className="shadow-md border-0">
            <CardContent className="space-y-3 py-4">
              <Button variant="outline" className="w-full justify-start gap-2"
                onClick={() => window.open("https://instagram.com/interdeverdunbcn", "_blank")}>
                <Instagram className="w-4 h-4 text-pink-500" /> @interdeverdunbcn
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2"
                onClick={() => window.open("https://apuntamelo.com/grupo/9/26/0/653/0/2795/0", "_blank")}>
                <ExternalLink className="w-4 h-4 text-primary" /> Liga en Apúntamelo
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2"
                onClick={() => window.open("https://apuntamelo.com/equipo/9/26/0/653/0/2795/24169/0", "_blank")}>
                <ExternalLink className="w-4 h-4 text-primary" /> Perfil del equipo
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2"
                onClick={() => window.open("https://maps.google.com/?q=Velòdrom+d'Horta+Barcelona", "_blank")}>
                <MapPin className="w-4 h-4 text-red-500" /> Velòdrom d'Horta — Cómo llegar
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
