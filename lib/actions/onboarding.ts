"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type OnboardingState = { error?: string } | undefined;

const schema = z.object({ teamId: z.string().uuid("Squadra non valida.") });

export async function setFavoriteTeam(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const parsed = schema.safeParse({ teamId: formData.get("teamId") });
  if (!parsed.success) {
    return { error: "Seleziona una squadra valida." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("profiles")
    .update({ favorite_team_id: parsed.data.teamId })
    .eq("id", user.id);

  if (error) return { error: "Impossibile salvare la squadra. Riprova." };

  redirect("/dashboard");
}
