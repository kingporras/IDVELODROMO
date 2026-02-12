import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, MapPin, Clock, Users, Star, Layout, Save } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

const positions = ["portero", "defensa_izq", "defensa_der", "medio_izq", "medio_centro", "medio_der", "delantero"];
const posLabels: Record<string, string> = {
  portero: "POR", defensa_izq: "DEF Izq", defensa_der: "DEF Der",
  medio_izq: "MED Izq", medio_centro: "MED Centro", medio_der: "MED Der", delantero: "DEL",
};

export default function MatchDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [lineupState, setLineupState] = useState<Record<string, string>>({});

  const { data: match } = useQuery({
    queryKey: ["match", id],
    queryFn: async () => {
      const { data } = await supabase.from("matches").select("*").eq("id", id!).maybeSingle();
      return data;
    },
  });

  const { data: convocation } = useQuery({
    queryKey: ["convocation", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase.from("convocations").select("*").eq("match_id", id!).maybeSingle();
      return data;
    },
  });

  const { data: responses } = useQuery({
    queryKey: ["responses", convocation?.id],
    enabled: !!convocation?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("convocation_responses")
        .select("*, profiles(username, dorsal, display_name)")
        .eq("convocation_id", convocation!.id)
        .order("updated_at", { ascending: true });
      return data || [];
    },
  });

  const { data: mvpVotes } = useQuery({
    queryKey: ["mvp-votes", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase.from("mvp_votes").select("*, profiles:voted_user_id(username, display_name, dorsal)").eq("match_id", id!);
      return data || [];
    },
  });

  const { data: myVote } = useQuery({
    queryKey: ["my-vote", id],
    enabled: !!id && !!user,
    queryFn: async () => {
      const { data } = await supabase.from("mvp_votes").select("*").eq("match_id", id!).eq("voter_user_id", user!.id).maybeSingle();
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

  const { data: lineups } = useQuery({
    queryKey: ["lineups", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase.from("lineups").select("*").eq("match_id", id!);
      return data || [];
    },
  });

  // Sync lineup state from DB
  useEffect(() => {
    if (lineups) {
      const state: Record<string, string> = {};
      lineups.forEach((l: any) => { state[l.position] = l.user_id; });
      setLineupState(state);
    }
  }, [lineups]);

  const voteMutation = useMutation({
    mutationFn: async (votedUserId: string) => {
      await supabase.from("mvp_votes").insert({ match_id: id!, voter_user_id: user!.id, voted_user_id: votedUserId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mvp-votes", id] });
      queryClient.invalidateQueries({ queryKey: ["my-vote", id] });
      toast.success("¡Voto registrado!");
    },
    onError: () => toast.error("Error al votar"),
  });

  const respondMutation = useMutation({
    mutationFn: async (status: string) => {
      const existing = responses?.find((r: any) => r.user_id === user!.id);
      if (existing) {
        await supabase.from("convocation_responses").update({ status, updated_at: new Date().toISOString() }).eq("id", existing.id);
      } else {
        await supabase.from("convocation_responses").insert({ convocation_id: convocation!.id, user_id: user!.id, status });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["responses"] }),
  });

  const saveLineupMutation = useMutation({
    mutationFn: async () => {
      await supabase.from("lineups").delete().eq("match_id", id!);
      const entries = Object.entries(lineupState).filter(([_, uid]) => uid !== "");
      if (entries.length > 0) {
        await supabase.from("lineups").insert(entries.map(([position, user_id]) => ({ match_id: id!, position, user_id })));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lineups", id] });
      toast.success("Alineación guardada");
    },
    onError: () => toast.error("Error guardando alineación"),
  });

  if (!match) return null;

  const isInter = (t: string) => t.includes("INTER");
  const rival = isInter(match.home_team) ? match.away_team : match.home_team;
  const isHome = isInter(match.home_team);

  const counts = {
    yes: responses?.filter((r: any) => r.status === "yes").length || 0,
    no: responses?.filter((r: any) => r.status === "no").length || 0,
    maybe: responses?.filter((r: any) => r.status === "maybe").length || 0,
    pending: responses?.filter((r: any) => r.status === "pending").length || 0,
  };

  const mvpTotals = mvpVotes?.reduce((acc: Record<string, { count: number; name: string; dorsal: number }>, v: any) => {
    const uid = v.voted_user_id;
    if (!acc[uid]) acc[uid] = { count: 0, name: v.profiles?.display_name || "?", dorsal: v.profiles?.dorsal || 0 };
    acc[uid].count++;
    return acc;
  }, {} as Record<string, { count: number; name: string; dorsal: number }>) || {};

  const mvpSorted = Object.entries(mvpTotals).sort((a, b) => b[1].count - a[1].count);

  // Players already assigned in lineup
  const assignedPlayerIds = Object.values(lineupState).filter(Boolean);

  return (
    <div className="space-y-4">
      <p className="motivational-text">Fuerza y honor.</p>
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-white/60 hover:text-white">
        <ArrowLeft className="w-4 h-4" /> Volver
      </button>

      <Card className="shadow-lg border-0">
        <CardHeader className="pb-2">
          <Badge variant="outline" className="w-fit text-xs">{isHome ? "🏠 Local" : "✈️ Visitante"}</Badge>
          <CardTitle className="font-display text-lg">vs {rival}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            {format(new Date(match.match_date), "EEEE d 'de' MMMM, HH:mm'h'", { locale: es })}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4" />
            {match.location_name}, {match.city}
          </div>
          <Button
            size="sm"
            variant="outline"
            className="mt-2 text-xs"
            onClick={() => window.open("https://maps.google.com/?q=Velòdrom+d'Horta+Barcelona", "_blank")}
          >
            📍 Cómo llegar
          </Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="convocatoria" className="w-full">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="convocatoria" className="text-xs"><Users className="w-3.5 h-3.5 mr-1" />Convocatoria</TabsTrigger>
          <TabsTrigger value="mvp" className="text-xs"><Star className="w-3.5 h-3.5 mr-1" />MVP</TabsTrigger>
          <TabsTrigger value="alineacion" className="text-xs"><Layout className="w-3.5 h-3.5 mr-1" />Alineación</TabsTrigger>
        </TabsList>

        <TabsContent value="convocatoria" className="space-y-3 mt-3">
          {convocation ? (
            <>
              <div className="grid grid-cols-4 gap-2">
                <div className="bg-green-50 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-green-700">{counts.yes}</p>
                  <p className="text-[10px] text-green-600">Voy</p>
                </div>
                <div className="bg-red-50 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-red-700">{counts.no}</p>
                  <p className="text-[10px] text-red-600">No voy</p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-yellow-700">{counts.maybe}</p>
                  <p className="text-[10px] text-yellow-600">Duda</p>
                </div>
                <div className="bg-muted rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-muted-foreground">{counts.pending}</p>
                  <p className="text-[10px] text-muted-foreground">Pendiente</p>
                </div>
              </div>

              {convocation.capacity && counts.yes > convocation.capacity && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 text-xs text-orange-800">
                  ⚠️ Cupo superado ({counts.yes}/{convocation.capacity}). Los últimos en confirmar pasan a lista de espera.
                </div>
              )}

              <div className="flex gap-2">
                <Button size="sm" onClick={() => respondMutation.mutate("yes")} disabled={respondMutation.isPending}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white text-xs">✅ VOY</Button>
                <Button size="sm" onClick={() => respondMutation.mutate("no")} disabled={respondMutation.isPending}
                  variant="destructive" className="flex-1 text-xs">❌ NO VOY</Button>
                <Button size="sm" onClick={() => respondMutation.mutate("maybe")} disabled={respondMutation.isPending}
                  variant="outline" className="flex-1 text-xs border-yellow-300 text-yellow-700">🤔 DUDA</Button>
              </div>

              <div className="space-y-1">
                {responses?.map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between py-1.5 px-2 rounded bg-card text-sm">
                    <span>#{r.profiles?.dorsal} {r.profiles?.display_name}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {r.status === "yes" ? "✅" : r.status === "no" ? "❌" : r.status === "maybe" ? "🤔" : "⏳"}
                    </Badge>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground italic text-center py-4">Convocatoria no abierta aún.</p>
          )}
        </TabsContent>

        <TabsContent value="mvp" className="space-y-3 mt-3">
          {myVote ? (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="py-3 text-center">
                <p className="text-sm font-medium text-primary">✅ Ya has votado</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-1">
              <p className="text-sm font-medium mb-2">Vota al MVP del partido:</p>
              {profiles?.filter((p: any) => p.id !== user?.id).map((p: any) => (
                <Button
                  key={p.id}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-sm"
                  onClick={() => voteMutation.mutate(p.id)}
                  disabled={voteMutation.isPending}
                >
                  <Star className="w-3.5 h-3.5 mr-2 text-primary" />
                  #{p.dorsal} {p.display_name}
                </Button>
              ))}
            </div>
          )}

          {mvpSorted.length > 0 && (
            <div className="space-y-1 mt-4">
              <p className="text-sm font-medium">Resultados MVP:</p>
              {mvpSorted.map(([uid, info], i) => (
                <div key={uid} className={`flex items-center justify-between py-1.5 px-2 rounded text-sm ${i === 0 ? "bg-primary/10 font-semibold" : "bg-card"}`}>
                  <span>{i === 0 && "⭐ "}#{info.dorsal} {info.name}</span>
                  <Badge variant="outline">{info.count} votos</Badge>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="alineacion" className="space-y-3 mt-3">
          {/* Visual field */}
          <div className="bg-green-800 rounded-xl p-4 relative" style={{ minHeight: 320 }}>
            <div className="absolute inset-4 border-2 border-white/30 rounded-lg" />
            <div className="absolute left-1/2 top-4 bottom-4 w-px bg-white/20" />

            {positions.map((pos) => {
              const playerId = lineupState[pos];
              const player = playerId ? profiles?.find((p: any) => p.id === playerId) : null;
              const row = pos === "portero" ? "bottom-4" : pos.startsWith("defensa") ? "bottom-[28%]" : pos.startsWith("medio") ? "top-[30%]" : "top-4";
              const col = pos.includes("izq") ? "left-[25%]" : pos.includes("der") ? "right-[25%]" : "left-1/2";
              return (
                <div key={pos} className={`absolute ${row} ${col} -translate-x-1/2 text-center`}>
                  <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center text-xs font-bold text-green-900 shadow-md">
                    {player ? `#${player.dorsal}` : posLabels[pos]?.split(" ")[0]}
                  </div>
                  <p className="text-[9px] text-white/80 mt-0.5 max-w-[60px] truncate">
                    {player?.display_name || posLabels[pos]}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Admin lineup editor */}
          {isAdmin && (
            <Card className="border-0 shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Editar Alineación</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {positions.map((pos) => (
                  <div key={pos} className="flex items-center gap-2">
                    <span className="text-xs font-medium w-20 text-muted-foreground">{posLabels[pos]}</span>
                    <Select
                      value={lineupState[pos] || "__empty__"}
                      onValueChange={(val) => setLineupState((prev) => ({ ...prev, [pos]: val === "__empty__" ? "" : val }))}
                    >
                      <SelectTrigger className="flex-1 h-8 text-xs">
                        <SelectValue placeholder="Seleccionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__empty__">— Vacío —</SelectItem>
                        {profiles?.map((p: any) => {
                          const taken = assignedPlayerIds.includes(p.id) && lineupState[pos] !== p.id;
                          return (
                            <SelectItem key={p.id} value={p.id} disabled={taken}>
                              #{p.dorsal} {p.display_name} {taken ? "(asignado)" : ""}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                ))}

                <Button
                  size="sm"
                  className="w-full mt-2 bg-primary hover:bg-primary/90"
                  onClick={() => saveLineupMutation.mutate()}
                  disabled={saveLineupMutation.isPending}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Guardar alineación
                </Button>

                {/* Bench */}
                <div className="mt-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Banquillo:</p>
                  <div className="flex flex-wrap gap-1">
                    {profiles?.filter((p: any) => !assignedPlayerIds.includes(p.id)).map((p: any) => (
                      <Badge key={p.id} variant="outline" className="text-[10px]">
                        #{p.dorsal} {p.display_name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {!isAdmin && (
            <p className="text-xs text-muted-foreground text-center">
              Solo el admin puede editar la alineación.
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
