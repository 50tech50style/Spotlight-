import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";

export default async function PerformerPage() {
  const supa = supabaseServer();

  const { data: u } = await supa.auth.getUser();
  const uid = u.user?.id ?? null;
  if (!uid) redirect("/login");

  const { data: profile } = await supa
    .from("profiles")
    .select("onboarding_complete")
    .eq("id", uid)
    .maybeSingle();

  if (!profile?.onboarding_complete) redirect("/onboarding");

  return (
    <div className="min-h-screen text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Performer Dashboard</h1>
        <p className="mt-2 text-white/60">Next: your shift status, wait estimate, and Join Rotation.</p>
      </div>
    </div>
  );
}