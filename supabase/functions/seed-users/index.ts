import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLAYERS = [
  { username: "plans", dorsal: 1, role: "jugador" },
  { username: "pomares", dorsal: 2, role: "jugador" },
  { username: "porras", dorsal: 4, role: "admin" },
  { username: "cuco", dorsal: 5, role: "jugador" },
  { username: "altimira", dorsal: 7, role: "jugador" },
  { username: "alex", dorsal: 9, role: "jugador" },
  { username: "dani", dorsal: 10, role: "jugador" },
  { username: "delrio", dorsal: 11, role: "jugador" },
  { username: "peke", dorsal: 17, role: "jugador" },
  { username: "sergio", dorsal: 19, role: "jugador" },
  { username: "rony", dorsal: 23, role: "jugador" },
  { username: "malle", dorsal: 30, role: "jugador" },
  { username: "edgar", dorsal: 44, role: "jugador" },
  { username: "joeliko", dorsal: 69, role: "jugador" },
  { username: "mordillo", dorsal: 99, role: "jugador" },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const results: string[] = [];

    for (const player of PLAYERS) {
      const email = `${player.username}@interdeverdun.app`;
      const password = String(player.dorsal);

      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          username: player.username,
          dorsal: player.dorsal,
          display_name: player.username.charAt(0).toUpperCase() + player.username.slice(1),
          role: player.role,
        },
      });

      if (error) {
        results.push(`❌ ${player.username}: ${error.message}`);
      } else {
        results.push(`✅ ${player.username} (${email}) created`);
      }
    }

    return new Response(JSON.stringify({ results }), {
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
