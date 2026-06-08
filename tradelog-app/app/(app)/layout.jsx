import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";
import Topbar from "@/components/Topbar";

export default async function AppLayout({ children }) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile?.onboarded) redirect("/onboarding");

  const { data: broker } = await supabase.from("broker_connections").select("*").eq("user_id", user.id).eq("broker", "IBKR").maybeSingle();
  const theme = profile?.theme || "dark";

  return (
    <div className={`app-root theme-${theme}`} style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", position: "relative", overflow: "hidden" }}>
      <div className="bg-glow" />
      <div className="bg-grid" />
      <div style={{ position: "relative", zIndex: 1 }}>
        <Topbar profile={profile} broker={broker || null} />
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
