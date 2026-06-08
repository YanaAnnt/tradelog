import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";

export default async function Home() {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("onboarded").eq("id", user.id).single();
  redirect(profile?.onboarded ? "/dashboard" : "/onboarding");
}
