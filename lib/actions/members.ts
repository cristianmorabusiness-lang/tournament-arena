"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type MemberActionState = { error?: string } | undefined;

const schema = z.object({
  memberId: z.string().uuid(),
  leagueId: z.string().uuid(),
  status: z.enum(["approved", "rejected"]),
});

/**
 * Admin approves or rejects a pending membership request. Authorization is
 * enforced by RLS (only the league admin may update league_members rows).
 */
export async function updateMemberStatus(
  _prev: MemberActionState,
  formData: FormData,
): Promise<MemberActionState> {
  const parsed = schema.safeParse({
    memberId: formData.get("memberId"),
    leagueId: formData.get("leagueId"),
    status: formData.get("status"),
  });
  if (!parsed.success) {
    return { error: "Richiesta non valida." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("league_members")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.memberId);

  if (error) {
    return { error: "Operazione non riuscita." };
  }

  revalidatePath(`/leagues/${parsed.data.leagueId}`);
  return undefined;
}
