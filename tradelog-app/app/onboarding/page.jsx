"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { CCY } from "@/lib/utils";

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = supabaseBrowser();
  const [step, setStep] = useState("account");
  const [name, setName] = useState("");
  const [ccy, setCcy] = useState("USD");
  const [token, setToken] = useState("");
  const [queryId, setQueryId] = useState("");
  const [guide, setGuide] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: p } = await supabase.from("profiles").select("name,currency").eq("id", user.id).single();
      if (p) { setName(p.name || ""); setCcy(p.currency || "USD"); }
    })();
  }, []);

  const saveAccount = async () => {
    setErr(null); setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("profiles").update({ name: name.trim(), currency: ccy }).eq("id", user.id);
      if (error) throw error;
      setStep("broker");
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  const finish = async (saveBroker) => {
    setErr(null); setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (saveBroker) {
        const { error: be } = await supabase.from("broker_connections").upsert({
          user_id: user.id, broker: "IBKR", token: token.trim(), query_id: queryId.trim(), status: "pending",
        }, { onConflict: "user_id,broker" });
        if (be) throw be;
      }
      const { error } = await supabase.from("profiles").update({ onboarded: true }).eq("id", user.id);
      if (error) throw error;
      router.push("/dashboard");
      router.refresh();
    } catch (e) { setErr(e.message); setBusy(false); }
  };

  return (
    <div className="app-root theme-dark" style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", display: "grid", placeItems: "center", padding: 24 }}>
      <div className="bg-glow" />
      <div className="bg-grid" />
      <div className="setup-card rise" style={{ position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: "var(--accent)", display: "grid", placeItems: "center", color: "var(--on-accent)", fontFamily: "var(--display)", fontWeight: 800 }}>T</div>
          <div>
            <div className="brand" style={{ fontSize: 22 }}>TradeLog</div>
            <div className="brand-sub">trading journal</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, margin: "20px 0 18px" }}>
          <span className={`step-dot${step === "account" ? " step-on" : ""}`} />
          <span className={`step-dot${step === "broker" ? " step-on" : ""}`} />
        </div>

        {step === "account" ? (
          <>
            <h1 style={{ fontFamily: "var(--display)", fontSize: 25, lineHeight: 1.15, marginBottom: 8, letterSpacing: "-0.02em" }}>Set up your profile</h1>
            <p className="hint" style={{ marginBottom: 22 }}>You'll connect your broker on the next step.</p>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span className="card-label">Your name</span>
              <input className="input" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <div style={{ marginTop: 14 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span className="card-label">Currency</span>
                <select className="input" value={ccy} onChange={(e) => setCcy(e.target.value)}>
                  {Object.keys(CCY).map((c) => <option key={c}>{c}</option>)}
                </select>
              </label>
            </div>
            {err && <div className="hint" style={{ color: "var(--neg)", marginTop: 12 }}>{err}</div>}
            <button className="btn-primary" style={{ width: "100%", marginTop: 22, justifyContent: "center" }} disabled={!name.trim() || busy} onClick={saveAccount}>Continue →</button>
          </>
        ) : (
          <>
            <h1 style={{ fontFamily: "var(--display)", fontSize: 25, lineHeight: 1.15, marginBottom: 8, letterSpacing: "-0.02em" }}>Connect your broker</h1>
            <p className="hint" style={{ marginBottom: 18 }}>Paste your IBKR Flex credentials, or skip and use manual report import.</p>

            <div className="broker-chip"><span className="broker-dot" /> Interactive Brokers</div>
            <div style={{ marginTop: 14 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span className="card-label">Flex Web Service token</span>
                <input className="input" type="password" placeholder="paste your token" value={token} onChange={(e) => setToken(e.target.value)} />
              </label>
            </div>
            <div style={{ marginTop: 12 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span className="card-label">Flex Query ID</span>
                <input className="input" placeholder="6-digit ID from IBKR" value={queryId} onChange={(e) => setQueryId(e.target.value)} />
              </label>
            </div>
            <button className="link-btn" onClick={() => setGuide((g) => !g)}>{guide ? "Hide" : "How do I get these?"}</button>
            {guide && (
              <ol className="guide">
                <li>In IBKR <b>Client Portal → Settings → Account Settings</b>, find <b>Flex Web Service</b>, turn it on, set an expiry, and copy the <b>Token</b>.</li>
                <li>Go to <b>Performance &amp; Reports → Flex Queries</b> and create an <b>Activity Flex Query</b> with the <b>Trades</b> section. Save and copy its <b>Query ID</b>.</li>
                <li>Paste both above and press <b>Connect</b>.</li>
              </ol>
            )}
            {err && <div className="hint" style={{ color: "var(--neg)", marginTop: 12 }}>{err}</div>}
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button className="btn-ghost" onClick={() => setStep("account")}>← Back</button>
              <button className="btn-primary" style={{ flex: 1, justifyContent: "center" }} disabled={!token.trim() || !queryId.trim() || busy} onClick={() => finish(true)}>Connect broker</button>
              <button className="btn-ghost" onClick={() => finish(false)}>Skip</button>
            </div>
            <p className="hint" style={{ fontSize: 11, marginTop: 14 }}>Your token is encrypted at rest and never shared. Automated daily sync runs through our backend; manual CSV import works right now.</p>
          </>
        )}
      </div>
    </div>
  );
}
