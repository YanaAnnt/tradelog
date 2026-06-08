import { supabaseServer } from "@/lib/supabase-server";
import Dashboard from "@/components/Dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const { data: trades } = await supabase.from("trades").select("*").eq("user_id", user.id).order("date", { ascending: true });
  return <Dashboard profile={profile} trades={trades || []} />;
}
