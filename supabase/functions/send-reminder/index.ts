import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");
    
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) throw new Error("Not admin");

    const { match_id } = await req.json();

    // Get match info
    const { data: match } = await supabase.from("matches").select("*").eq("id", match_id).single();
    if (!match) throw new Error("Match not found");

    // Get all profiles with email
    const { data: profiles } = await supabase.from("profiles").select("*");
    const emailProfiles = profiles?.filter((p: any) => p.email) || [];

    if (emailProfiles.length === 0) {
      return new Response(JSON.stringify({ message: "No hay emails configurados" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isInter = (t: string) => t.includes("INTER");
    const rival = isInter(match.home_team) ? match.away_team : match.home_team;
    const matchDate = new Date(match.match_date);
    const dateStr = matchDate.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
    const timeStr = matchDate.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

    const results: string[] = [];

    for (const profile of emailProfiles) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "Inter de Verdún <onboarding@resend.dev>",
          to: [profile.email],
          subject: "Convocatoria jueves – Inter de Verdún",
          html: `
            <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:20px;">
              <h2 style="color:#c5922e;">⚽ Convocatoria abierta</h2>
              <p>¡Hola <strong>${profile.display_name}</strong>!</p>
              <p>Tenemos partido:</p>
              <div style="background:#f0f8ff;padding:15px;border-radius:8px;margin:15px 0;">
                <p style="margin:5px 0;"><strong>🆚 vs ${rival}</strong></p>
                <p style="margin:5px 0;">📅 ${dateStr}</p>
                <p style="margin:5px 0;">⏰ ${timeStr}h</p>
                <p style="margin:5px 0;">📍 ${match.location_name}, ${match.city}</p>
              </div>
              <p>Entra en la app y confirma tu asistencia: <strong>VOY / NO VOY / DUDA</strong></p>
              <p style="color:#666;font-size:12px;margin-top:30px;">— El Inter de Verdún 🏆</p>
            </div>
          `,
        }),
      });

      if (res.ok) {
        results.push(`✅ ${profile.display_name}`);
      } else {
        const err = await res.text();
        results.push(`❌ ${profile.display_name}: ${err}`);
      }
    }

    // Update last_reminder_sent_at
    await supabase.from("convocations").update({ last_reminder_sent_at: new Date().toISOString() }).eq("match_id", match_id);

    return new Response(JSON.stringify({ results, sent: results.filter(r => r.startsWith("✅")).length }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
