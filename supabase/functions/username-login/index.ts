import { createClient } from "npm:@supabase/supabase-js@2";

const allowedOrigins = new Set([
  "https://jhancris213.github.io",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
]);

Deno.serve(async (request) => {
  const origin = request.headers.get("origin") ?? "";
  const corsHeaders = {
    "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : "https://jhancris213.github.io",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };

  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders });
  }
  if (origin && !allowedOrigins.has(origin)) {
    return Response.json({ error: "Origin not allowed" }, { status: 403, headers: corsHeaders });
  }

  const projectUrl = Deno.env.get("SUPABASE_URL");
  let publishableKey: string;
  let secretKey: string;
  try {
    publishableKey = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}").default;
    secretKey = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}").default;
  } catch {
    console.error("Supabase API key environment variables are not valid JSON");
    return Response.json({ error: "Login service is not configured" }, { status: 500, headers: corsHeaders });
  }
  if (!projectUrl || !publishableKey || !secretKey) {
    console.error("Missing Supabase URL or default API keys");
    return Response.json({ error: "Login service is not configured" }, { status: 500, headers: corsHeaders });
  }

  let credentials: { username?: string; password?: string };
  try {
    credentials = await request.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400, headers: corsHeaders });
  }

  const username = credentials.username?.trim().toLowerCase();
  const password = credentials.password;
  if (!username || !/^[a-z0-9._-]{3,32}$/.test(username) || !password || password.length > 128) {
    return Response.json({ error: "Username or password is incorrect" }, { status: 401, headers: corsHeaders });
  }

  const adminClient = createClient(projectUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const authClient = createClient(projectUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("phone_number, phone_verified_at")
    .eq("username", username)
    .maybeSingle();

  if (profileError) {
    console.error("Username lookup failed", profileError.message);
    return Response.json({ error: "Login service is temporarily unavailable" }, { status: 500, headers: corsHeaders });
  }
  if (!profile?.phone_number || !profile.phone_verified_at) {
    return Response.json({ error: "Username or password is incorrect" }, { status: 401, headers: corsHeaders });
  }

  const { data, error } = await authClient.auth.signInWithPassword({
    phone: profile.phone_number,
    password,
  });
  if (error || !data.session) {
    return Response.json({ error: "Username or password is incorrect" }, { status: 401, headers: corsHeaders });
  }

  return Response.json({
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    },
  }, { headers: corsHeaders });
});
