import { createClient } from "@supabase/supabase-js";

/**
 * Admin client - server-only, uses the SERVICE ROLE key, bypasses RLS.
 * NEVER import this from a client component. Only use in API routes / route handlers
 * that verify the cron secret or run inside trusted server code.
 */
export function supabaseAdmin() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
