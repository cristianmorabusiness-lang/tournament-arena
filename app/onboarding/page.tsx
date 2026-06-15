import { redirect } from "next/navigation";
import { TeamPicker } from "@/components/onboarding/TeamPicker";
import { Alert } from "@/components/ui/Alert";
import { createClient } from "@/lib/supabase/server";
import type { Team } from "@/lib/types";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("favorite_team_id")
    .eq("id", user.id)
    .single();
  if (profile?.favorite_team_id) redirect("/dashboard");

  const { data: teams } = await supabase
    .from("teams")
    .select("*")
    .order("name");

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <h1 className="text-2xl font-bold">Scegli la tua squadra del cuore</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Tra le nazionali qualificate ai Mondiali. La userai per personalizzare la
        tua esperienza.
      </p>

      <div className="mt-6">
        {teams && teams.length > 0 ? (
          <TeamPicker teams={teams as Team[]} />
        ) : (
          <Alert variant="info">
            Le squadre non sono ancora state sincronizzate. Esegui la
            sincronizzazione dati (<code>/api/sync</code>) e ricarica la pagina.
          </Alert>
        )}
      </div>
    </main>
  );
}
