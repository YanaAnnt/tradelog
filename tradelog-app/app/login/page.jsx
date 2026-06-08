"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { Mail, Lock, Loader2 } from "lucide-react";

const GoogleIcon = (props) => (
  <svg viewBox="0 0 48 48" width="18" height="18" {...props}>
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34 6 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.8 1.1 8 3l5.7-5.7C34 6 29.3 4 24 4 16.3 4 9.6 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.4-5.1l-6.2-5.2C29.2 35 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.6l6.2 5.2C40.9 36.4 44 30.7 44 24c0-1.2-.1-2.4-.4-3.5z" />
  </svg>
);

export default function LoginPage() {
  const router = useRouter();
  const supabase = supabaseBrowser();
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [info, setInfo] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setErr(null); setInfo(null); setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: name }, emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        if (error) throw error;
        setInfo("Check your inbox to confirm your email, then sign in.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/");
        router.refresh();
      }
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  const google = async () => {
    setErr(null); setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) { setErr(error.message); setBusy(false); }
  };

  return (
    <div className="app-root theme-dark" style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", display: "grid", placeItems: "center", padding: 24 }}>
      <div className="bg-glow" />
      <div className="bg-grid" />
      <div className="setup-card rise" style={{ position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: "var(--accent)", display: "grid", placeItems: "center", color: "var(--on-accent)", fontFamily: "var(--display)", fontWeight: 800 }}>T</div>
          <div>
            <div className="brand" style={{ fontSize: 22 }}>TradeLog</div>
            <div className="brand-sub">trading journal</div>
          </div>
        </div>
        <h1 style={{ fontFamily: "var(--display)", fontSize: 26, lineHeight: 1.15, marginBottom: 8, letterSpacing: "-0.02em" }}>
          {mode === "signup" ? "Create your account" : "Welcome back"}
        </h1>
        <p className="hint" style={{ marginBottom: 22 }}>{mode === "signup" ? "Start journaling your trades in under a minute." : "Sign in to your TradeLog."}</p>

        <button className="btn-ghost" style={{ width: "100%", justifyContent: "center" }} onClick={google} disabled={busy}>
          <GoogleIcon /> Continue with Google
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "18px 0 16px", color: "var(--muted)", fontSize: 11 }}>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          <span>or with email</span>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        </div>

        <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
          {mode === "signup" && (
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span className="card-label">Your name</span>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            </label>
          )}
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span className="card-label">Email</span>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" required />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span className="card-label">Password</span>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="at least 8 characters" required minLength={8} />
          </label>
          {err && <div className="hint" style={{ color: "var(--neg)", fontWeight: 500 }}>{err}</div>}
          {info && <div className="hint" style={{ color: "var(--pos)", fontWeight: 500 }}>{info}</div>}
          <button className="btn-primary" type="submit" style={{ justifyContent: "center", marginTop: 4 }} disabled={busy}>
            {busy ? <Loader2 size={15} className="spin" /> : mode === "signup" ? "Create account" : "Sign in"}
          </button>
        </form>

        <p className="hint" style={{ fontSize: 12, marginTop: 16, textAlign: "center" }}>
          {mode === "signup" ? "Already have an account?" : "New here?"}{" "}
          <button className="link-btn" style={{ padding: 0, fontSize: 12 }} onClick={() => { setErr(null); setInfo(null); setMode(mode === "signup" ? "signin" : "signup"); }}>
            {mode === "signup" ? "Sign in" : "Create an account"}
          </button>
        </p>
      </div>
    </div>
  );
}
