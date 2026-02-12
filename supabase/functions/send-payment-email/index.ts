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

    // Get payment instructions from settings
    const { data: settings } = await supabase.from("app_settings").select("payment_instructions").limit(1).maybeSingle();
    const instructions = settings?.payment_instructions || "Cuota mensual: 25€. Bizum al número del capitán.";

    // Get all profiles with email
    const { data: profiles } = await supabase.from("profiles").select("*");
    const emailProfiles = profiles?.filter((p: any) => p.email) || [];

    if (emailProfiles.length === 0) {
      return new Response(JSON.stringify({ message: "No hay emails configurados" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
          subject: "Pago cuota 25€ – Inter de Verdún",
          html: `
            <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:20px;">
              <h2 style="color:#c5922e;">💰 Cuota mensual</h2>
              <p>¡Hola <strong>${profile.display_name}</strong>!</p>
              <div style="background:#f0f8ff;padding:15px;border-radius:8px;margin:15px 0;">
                <p style="margin:5px 0;font-size:18px;"><strong>25€</strong></p>
                <p style="margin:5px 0;">${instructions}</p>
              </div>
              <p>¡Gracias por tu colaboración! 💪</p>
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
