import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Trash2, Video } from "lucide-react";

export default function AdminVideosPage() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [vimeoUrl, setVimeoUrl] = useState("");
  const [matchId, setMatchId] = useState("");

  if (!isAdmin) return <Navigate to="/" replace />;

  const { data: videos } = useQuery({
    queryKey: ["all-videos"],
    queryFn: async () => {
      const { data } = await supabase.from("videos").select("*, matches(home_team, away_team, match_date)").order("date", { ascending: false });
      return data || [];
    },
  });

  const { data: matches } = useQuery({
    queryKey: ["all-matches"],
    queryFn: async () => {
      const { data } = await supabase.from("matches").select("*").order("match_date", { ascending: false }).limit(20);
      return data || [];
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      await supabase.from("videos").insert({
        title,
        vimeo_url: vimeoUrl,
        match_id: matchId || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-videos"] });
      toast.success("Vídeo añadido");
      setTitle(""); setVimeoUrl(""); setMatchId("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("videos").delete().eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-videos"] });
      toast.success("Vídeo eliminado");
    },
  });

  const isInter = (t: string) => t?.includes("INTER");

  return (
    <div className="space-y-4">
      <h2 className="font-display font-bold text-xl text-white">Vídeos</h2>

      <Card className="border-0 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Plus className="w-4 h-4" /> Añadir vídeo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título" className="text-sm h-8" />
          <Input value={vimeoUrl} onChange={(e) => setVimeoUrl(e.target.value)} placeholder="URL Vimeo (https://vimeo.com/...)" className="text-sm h-8" />
          <Select value={matchId || "__none__"} onValueChange={(v) => setMatchId(v === "__none__" ? "" : v)}>
            <SelectTrigger className="text-sm h-8">
              <SelectValue placeholder="Asociar a partido (opcional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— Sin partido —</SelectItem>
              {matches?.map((m: any) => (
                <SelectItem key={m.id} value={m.id}>
                  vs {isInter(m.home_team) ? m.away_team : m.home_team} — {new Date(m.match_date).toLocaleDateString("es")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" className="w-full bg-primary hover:bg-primary/90" onClick={() => addMutation.mutate()}
            disabled={!title || !vimeoUrl || addMutation.isPending}>
            <Video className="w-4 h-4 mr-2" /> Añadir
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {videos?.map((v: any) => (
          <Card key={v.id} className="border-0 shadow-sm">
            <CardContent className="py-3 px-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{v.title}</p>
                <p className="text-[10px] text-muted-foreground">{v.vimeo_url}</p>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteMutation.mutate(v.id)}>
                <Trash2 className="w-3.5 h-3.5 text-destructive" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
