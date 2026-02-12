import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

export default function ConvocatoriaPage() {
  const { user } = useAuth();
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

  if (nextMatch) {
    // Redirect to match detail with convocatoria tab
    navigate(`/partido/${nextMatch.id}`, { replace: true });
    return null;
  }

  return (
    <div className="space-y-4">
      <h2 className="font-display font-bold text-xl text-foreground">Convocatoria</h2>
      <Card className="shadow-lg border-0">
        <CardContent className="py-8 text-center text-muted-foreground">
          No hay convocatoria activa.
        </CardContent>
      </Card>
    </div>
  );
}
