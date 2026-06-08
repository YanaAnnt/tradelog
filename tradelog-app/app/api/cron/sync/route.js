import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { syncOneConnection } from "@/lib/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // Vercel Pro Fluid Compute max; falls back to 60s on Hobby

/**
 * Vercel Cron calls this with header `Authorization: Bearer ${CRON_SECRET}`.
 * Schedule lives in /vercel.json.
 */
export async function GET(request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = supabaseAdmin();
  const { data: conns, error } = await supabase.from("broker_connections").select("*");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results = [];
  for (const conn of conns || []) {
    const r = await syncOneConnection(supabase, conn);
    results.push({ user_id: conn.user_id, ...r });
  }
  const ok = results.filter((r) => r.ok).length;
  const failed = results.length - ok;
  return NextResponse.json({ ran_at: new Date().toISOString(), total: results.length, ok, failed, results });
}
