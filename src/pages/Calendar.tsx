import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

export default function CalendarPage() {
  const navigate = useNavigate();

  const { data: matches } = useQuery({
    queryKey: ["matches"],
    queryFn: async () => {
      const { data } = await supabase
        .from("matches")
        .select("*")
        .order("match_date", { ascending: true });
      return data || [];
    },
  });

  const isInter = (team: string) => team.includes("INTER");
  const isPast = (d: string) => new Date(d) < new Date();

  return (
    <div className="space-y-4">
      <h2 className="font-display font-bold text-xl text-white">Calendario</h2>
      <p className="text-sm text-muted-foreground">2a Lliga Velòdrom F7 · 16 jornadas</p>

      <div className="space-y-3">
        {matches?.map((match, i) => {
          const rival = isInter(match.home_team) ? match.away_team : match.home_team;
          const isHome = isInter(match.home_team);
          const past = isPast(match.match_date);

          return (
            <Card
              key={match.id}
              className={`shadow-md border-0 cursor-pointer hover:shadow-lg transition-shadow ${past ? "opacity-60" : ""}`}
              onClick={() => navigate(`/partido/${match.id}`)}
            >
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-muted-foreground font-medium">J{i + 1}</span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {isHome ? "Local" : "Visitante"}
                      </Badge>
                    </div>
                    <p className="font-semibold text-sm">vs {rival}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(match.match_date), "EEE d MMM · HH:mm'h'", { locale: es })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5" />
                    <ExternalLink className="w-3 h-3" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
