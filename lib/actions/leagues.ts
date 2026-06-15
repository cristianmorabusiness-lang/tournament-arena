"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type LeagueState = { error?: string; message?: string } | undefined;

const createSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Il nome deve avere almeno 3 caratteri.")
    .max(40, "Il nome è troppo lungo."),
});

const joinSchema = z.object({
  code: z
    .string()
    .trim()
    .min(4, "Inserisci un codice valido.")
    .max(12, "Codice non valido."),
});

export async function createLeague(
  _prev: LeagueState,
  formData: FormData,
): Promise<LeagueState> {
  const parsed = createSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("create_league", { p_name: parsed.data.name })
    .single<{ id: string }>();

  if (error || !data) {
    return { error: "Impossibile creare la lega. Riprova." };
  }

  redirect(`/leagues/${data.id}`);
}

export async function requestJoin(
  _prev: LeagueState,
  formData: FormData,
): Promise<LeagueState> {
  const parsed = joinSchema.safeParse({ code: formData.get("code") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("request_to_join_league", {
    p_code: parsed.data.code.toUpperCase(),
  });

  if (error) {
    return { error: "Codice non valido o lega inesistente." };
  }

  revalidatePath("/leagues");
  return { message: "Richiesta inviata! In attesa di approvazione dall'admin." };
}
