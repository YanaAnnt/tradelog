import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { syncOneConnection } from "@/lib/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

/** Authenticated user clicks "Sync now" - syncs only their own broker connection. */
export async function POST(_request) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  // Use admin client to write across owner's rows (RLS-safe because we pin user_id)
  const admin = supabaseAdmin();
  const { data: conn, error } = await admin
    .from("broker_connections")
    .select("*")
    .eq("user_id", user.id)
    .eq("broker", "IBKR")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!conn) return NextResponse.json({ error: "No broker connected" }, { status: 400 });

  const result = await syncOneConnection(admin, conn);
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
