import { fetchFlexCsv } from "./ibkr";
import { parseReport } from "./parseReport";

/**
 * Syncs a single broker_connection row: fetches the latest statement from
 * the broker, parses, upserts trades (dedup by broker_trade_id when present),
 * and records the run in sync_runs.
 *
 * Returns { ok, n_inserted, error? }.
 *
 * `supabase` must be an admin (service-role) client when called outside the
 * owning user's session, so it can write across user_ids.
 */
export async function syncOneConnection(supabase, conn) {
  const startedAt = new Date().toISOString();
  const { data: run } = await supabase
    .from("sync_runs")
    .insert({ user_id: conn.user_id, started_at: startedAt, status: "running" })
    .select()
    .single();

  try {
    if (conn.broker !== "IBKR") throw new Error(`Unsupported broker: ${conn.broker}`);
    const csv = await fetchFlexCsv(conn.token, conn.query_id);
    const { trades, error } = parseReport(csv);
    if (error) throw new Error(error);

    const rows = trades.map((t) => ({ ...t, user_id: conn.user_id, source: "sync" }));
    const withIds = rows.filter((r) => r.broker_trade_id);
    const noIds = rows.filter((r) => !r.broker_trade_id);

    let inserted = 0;
    if (withIds.length) {
      // dedup by (user_id, broker_trade_id) unique index
      const { error: upErr, count } = await supabase
        .from("trades")
        .upsert(withIds, { onConflict: "user_id,broker_trade_id", ignoreDuplicates: true, count: "exact" });
      if (upErr) throw upErr;
      inserted += count || 0;
    }
    if (noIds.length) {
      // best-effort dedup on (user_id, date, symbol, side, qty, pnl) - skip rows that match
      // Simpler: just insert. v1 accepts manual cleanup if the same legacy report is re-pushed.
      const { error: insErr, count } = await supabase
        .from("trades")
        .insert(noIds, { count: "exact" });
      if (insErr) throw insErr;
      inserted += count || 0;
    }

    await supabase.from("broker_connections")
      .update({ last_sync_at: new Date().toISOString(), status: "ok" })
      .eq("id", conn.id);
    await supabase.from("sync_runs")
      .update({ finished_at: new Date().toISOString(), status: "success", n_trades: inserted })
      .eq("id", run.id);

    return { ok: true, n_inserted: inserted };
  } catch (err) {
    const msg = err?.message || String(err);
    await supabase.from("broker_connections")
      .update({ status: "error" })
      .eq("id", conn.id);
    if (run) {
      await supabase.from("sync_runs")
        .update({ finished_at: new Date().toISOString(), status: "error", error: msg })
        .eq("id", run.id);
    }
    return { ok: false, error: msg };
  }
}
