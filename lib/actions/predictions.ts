"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isInHomeWindow, isMatchLocked } from "@/lib/matchday";

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
 * by RLS (predictions cannot be written once the match locks, 5 minutes before
 * its kickoff), so a blocked write surfaces as an error here.
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

  // Product rule: a prediction can only be entered for matches visible in Home
  // (kicking off today or tomorrow) and still open. This keeps players coming
  // back daily instead of filling the whole calendar in one sitting. The 5-min
  // lock is also enforced by RLS; the home-window restriction lives here.
  const { data: match } = await supabase
    .from("matches")
    .select("kickoff_at")
    .eq("id", parsed.data.matchId)
    .single();
  if (!match) {
    return { error: "Partita non trovata.", matchId: parsed.data.matchId };
  }
  if (isMatchLocked(match.kickoff_at)) {
    return {
      error: "Pronostico bloccato: mancano meno di 5 minuti al via.",
      matchId: parsed.data.matchId,
    };
  }
  if (!isInHomeWindow(match.kickoff_at)) {
    return {
      error: "I pronostici per questa partita si aprono il giorno prima.",
      matchId: parsed.data.matchId,
    };
  }

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
      error: "Pronostico bloccato: mancano meno di 5 minuti al via.",
      matchId: parsed.data.matchId,
    };
  }

  revalidatePath("/matches");
  revalidatePath("/dashboard");
  return { ok: true, matchId: parsed.data.matchId };
}
