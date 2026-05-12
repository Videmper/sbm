import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_SERVICE_ROLE_KEY);
}

export function createSupabaseAdminClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase service role credentials are not configured.");
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function createSupabaseClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Supabase public credentials are not configured.");
  }
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

export async function getUserFromSession(sessionToken: string | null): Promise<any> {
  if (!sessionToken) return null;
  const supabase = createSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser(sessionToken);
  if (error || !user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, status, avatar_url")
    .eq("id", user.id)
    .single();

  return {
    ...user,
    profile,
  };
}

export function getSession(): { accessToken: string | null; user: any } {
  try {
    if (typeof window === "undefined") return { accessToken: null, user: null };
    const sessionStr = sessionStorage.getItem("sb_session");
    if (!sessionStr) return { accessToken: null, user: null };
    const session = JSON.parse(sessionStr);
    return {
      accessToken: session.token ?? null,
      user: session.user ?? null,
    };
  } catch {
    return { accessToken: null, user: null };
  }
}