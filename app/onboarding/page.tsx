import { redirect } from "next/navigation";
import { TeamPicker } from "@/components/onboarding/TeamPicker";
import { createClient } from "@/lib/supabase/server";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("favorite_country")
    .eq("id", user.id)
    .single();
  if (profile?.favorite_country) redirect("/dashboard");

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <h1 className="text-2xl font-bold">Scegli la tua nazionale del cuore</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Tra tutte le nazionali del mondo. La useremo per mostrare la tua bandiera
        nelle classifiche e tra i membri delle leghe — non ha alcun effetto sui
        pronostici delle partite.
      </p>

      <div className="mt-6">
        <TeamPicker />
      </div>
    </main>
  );
}
