"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { X, Sun, Moon, FileUp, Download, Upload, Trash2, LogOut, RefreshCw, Loader2 } from "lucide-react";
import { Field, BrokerForm } from "@/components/ui";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { CCY } from "@/lib/utils";
import { parseReport } from "@/lib/parseReport";

export default function SettingsModal({ profile, broker, onClose, onSaved }) {
  const supabase = supabaseBrowser();
  const router = useRouter();
  const [name, setName] = useState(profile?.name || "");
  const [cur, setCur] = useState(profile?.currency || "USD");
  const [theme, setTheme] = useState(profile?.theme || "dark");
  const [editBroker, setEditBroker] = useState(!broker);
  const [importMsg, setImportMsg] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const reportRef = useRef();

  const saveProfile = async (patch) => {
    setBusy(true);
    const { error } = await supabase.from("profiles").update(patch).eq("id", profile.id);
    setBusy(false);
    if (!error) router.refresh();
    return !error;
  };

  const onThemeChange = (t) => { setTheme(t); saveProfile({ theme: t }); };
  const onSave = async () => {
    const ok = await saveProfile({ name: name.trim() || profile.name, currency: cur });
    if (ok) onSaved();
  };

  const saveBroker = async (b) => {
    const { error } = await supabase.from("broker_connections").upsert({
      user_id: profile.id, broker: "IBKR", token: b.token, query_id: b.queryId, status: "pending",
    }, { onConflict: "user_id,broker" });
    if (!error) { setEditBroker(false); router.refresh(); }
  };

  const disconnectBroker = async () => {
    if (!confirm("Disconnect broker?")) return;
    await supabase.from("broker_connections").delete().eq("user_id", profile.id).eq("broker", "IBKR");
    router.refresh();
  };

  const syncNow = async () => {
    setSyncMsg(null); setSyncing(true);
    try {
      const res = await fetch("/api/sync/me", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setSyncMsg({ ok: true, text: `Synced ${data.n_inserted} new trade${data.n_inserted === 1 ? "" : "s"} from IBKR.` });
        router.refresh();
      } else {
        setSyncMsg({ ok: false, text: data.error || "Sync failed" });
      }
    } catch (e) { setSyncMsg({ ok: false, text: e.message }); } finally { setSyncing(false); }
  };

  const onReport = (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = async () => {
      const { trades: nt, error, mode } = parseReport(String(r.result || ""));
      if (error) { setImportMsg({ ok: false, text: error }); return; }
      const rows = nt.map((t) => ({ ...t, user_id: profile.id, source: "import" }));
      const { error: insErr, count } = await supabase.from("trades").insert(rows, { count: "exact" });
      if (insErr) setImportMsg({ ok: false, text: insErr.message });
      else {
        setImportMsg({ ok: true, text: `Imported ${count || rows.length} trade${rows.length === 1 ? "" : "s"} from your ${mode} report.` });
        router.refresh();
      }
    };
    r.readAsText(f);
    e.target.value = "";
  };

  const clearTrades = async () => {
    if (!confirm("Delete all your trades? This cannot be undone.")) return;
    await supabase.from("trades").delete().eq("user_id", profile.id);
    router.refresh();
  };

  const signOut = async () => {
    if (!confirm("Sign out of TradeLog?")) return;
    await fetch("/auth/signout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal rise" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <span className="section-title" style={{ fontSize: 16 }}>Settings</span>
          <button className="icon-btn" onClick={onClose}><X size={17} /></button>
        </div>

        <Field label="Name"><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <div style={{ marginTop: 12 }}>
          <Field label="Currency">
            <select className="input" value={cur} onChange={(e) => setCur(e.target.value)}>
              {Object.keys(CCY).map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
        </div>
        <div style={{ marginTop: 14 }}>
          <span className="card-label">Theme</span>
          <div className="seg" style={{ marginTop: 6 }}>
            <button className={`seg-btn${theme === "dark" ? " seg-on" : ""}`} onClick={() => onThemeChange("dark")}><Moon size={14} /> Dark</button>
            <button className={`seg-btn${theme === "light" ? " seg-on" : ""}`} onClick={() => onThemeChange("light")}><Sun size={14} /> Light</button>
          </div>
        </div>
        <button className="btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: 16 }} disabled={busy} onClick={onSave}>Save changes</button>

        <div className="divider" />
        <span className="card-label">Broker connection</span>
        {broker && !editBroker ? (
          <div className="broker-status" style={{ marginTop: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <span className="broker-dot" />
              <span style={{ fontWeight: 600, fontSize: 13 }}>Interactive Brokers</span>
              <span className="badge tag-stk" style={{ marginLeft: 4 }}>CONNECTED</span>
            </div>
            <div className="mono" style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>
              Query ID {broker.query_id} · {broker.last_sync_at
                ? `last sync ${new Date(broker.last_sync_at).toLocaleString()}`
                : "not synced yet"}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              <button className="btn-primary" onClick={syncNow} disabled={syncing}>
                {syncing ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />} Sync now
              </button>
              <button className="btn-ghost" onClick={() => setEditBroker(true)}>Update</button>
              <button className="btn-danger" onClick={disconnectBroker}>Disconnect</button>
            </div>
            {syncMsg && (
              <div className="hint" style={{ marginTop: 10, color: syncMsg.ok ? "var(--pos)" : "var(--neg)", fontWeight: 500 }}>
                {syncMsg.text}
              </div>
            )}
            <p className="hint" style={{ fontSize: 11, marginTop: 10 }}>An automatic sync also runs daily after market close.</p>
          </div>
        ) : (
          <div style={{ marginTop: 8 }}>
            <BrokerForm broker={broker ? { token: broker.token, queryId: broker.query_id } : null} embedded
              onSave={saveBroker}
              onSkip={broker ? () => setEditBroker(false) : undefined} />
          </div>
        )}

        <div className="divider" />
        <span className="card-label">Import broker report</span>
        <p className="hint" style={{ marginTop: 6, marginBottom: 10 }}>Drop in a CSV or HTML statement from your broker. IBKR Flex statements are detected automatically.</p>
        <button className="btn-ghost" style={{ width: "100%", justifyContent: "center" }} onClick={() => reportRef.current.click()}>
          <FileUp size={15} /> Choose report file
        </button>
        <input ref={reportRef} type="file" accept=".csv,.txt,.html,.htm" onChange={onReport} style={{ display: "none" }} />
        {importMsg && (
          <div className="hint" style={{ marginTop: 10, color: importMsg.ok ? "var(--pos)" : "var(--neg)", fontWeight: 500 }}>
            {importMsg.text}
          </div>
        )}

        <div className="divider" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <button className="btn-danger" onClick={clearTrades}><Trash2 size={15} /> Clear trades</button>
          <button className="btn-ghost" onClick={signOut}><LogOut size={15} /> Sign out</button>
        </div>
      </div>
    </div>
  );
}
