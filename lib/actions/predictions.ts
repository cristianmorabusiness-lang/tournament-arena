"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type PredictionState =
  | { error?: string; ok?: boolean; matchId?: string }
  | undefined;

const schema = z.object({
  matchId: z.string().uuid(),
  predHome: z.coerce.number().int().min(0).max(99),
  predAway: z.coerce.number().int().min(0).max(99),
});

/**
 * Upserts the current user's prediction for a match. The time lock is enforced
 * by RLS (predictions cannot be written once the match day has locked), so a
 * blocked write surfaces as an error here.
 */
export async function savePrediction(
  _prev: PredictionState,
  formData: FormData,
): Promise<PredictionState> {
  const parsed = schema.safeParse({
    matchId: formData.get("matchId"),
    predHome: formData.get("predHome"),
    predAway: formData.get("predAway"),
  });
  if (!parsed.success) {
    return { error: "Pronostico non valido." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessione scaduta." };

  const { error } = await supabase.from("predictions").upsert(
    {
      user_id: user.id,
      match_id: parsed.data.matchId,
      pred_home: parsed.data.predHome,
      pred_away: parsed.data.predAway,
    },
    { onConflict: "user_id,match_id" },
  );

  if (error) {
    return {
      error: "Pronostico bloccato: la giornata è già iniziata.",
      matchId: parsed.data.matchId,
    };
  }

  revalidatePath("/matches");
  return { ok: true, matchId: parsed.data.matchId };
}
