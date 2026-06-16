"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isValidCode } from "@/lib/nationalTeams";

export type OnboardingState = { error?: string } | undefined;

const schema = z.object({
  country: z.string().refine(isValidCode, "Nazionale non valida."),
});

export async function setFavoriteTeam(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const parsed = schema.safeParse({ country: formData.get("country") });
  if (!parsed.success) {
    return { error: "Seleziona una nazionale valida." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("profiles")
    .update({ favorite_country: parsed.data.country })
    .eq("id", user.id);

  if (error) return { error: "Impossibile salvare la nazionale. Riprova." };

  redirect("/dashboard");
}
