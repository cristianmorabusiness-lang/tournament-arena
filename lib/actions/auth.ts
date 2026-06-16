"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string } | undefined;
export type UsernameState =
  | { error?: string; ok?: boolean; username?: string }
  | undefined;

const usernameSchema = z
  .string()
  .min(3, "Lo username deve avere almeno 3 caratteri.")
  .max(24, "Lo username è troppo lungo.")
  .regex(/^[a-zA-Z0-9_]+$/, "Solo lettere, numeri e underscore.");

const signupSchema = z.object({
  email: z.string().email("Inserisci un'email valida."),
  password: z.string().min(8, "La password deve avere almeno 8 caratteri."),
  username: usernameSchema,
});

const loginSchema = z.object({
  email: z.string().email("Inserisci un'email valida."),
  password: z.string().min(1, "Inserisci la password."),
});

export async function signup(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = signupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    username: formData.get("username"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { username: parsed.data.username } },
  });

  if (error) return { error: error.message };

  // With email confirmation disabled, signUp already returns a session and the
  // user is logged straight in. If no session came back, try an immediate
  // sign-in so registration leads directly into the app; if that fails (email
  // confirmation is still enabled), tell the user to confirm their email.
  if (!data.session) {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    if (signInError) {
      return {
        error:
          "Account creato. Controlla la tua email per confermare e poi accedi.",
      };
    }
  }

  redirect("/onboarding");
}

export async function login(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) return { error: "Email o password non corretti." };

  redirect("/dashboard");
}

export async function updateUsername(
  _prev: UsernameState,
  formData: FormData,
): Promise<UsernameState> {
  const parsed = usernameSchema.safeParse(formData.get("username"));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Username non valido." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessione scaduta." };

  const { error } = await supabase
    .from("profiles")
    .update({ username: parsed.data })
    .eq("id", user.id);

  if (error) {
    // 23505 = unique violation (the case-insensitive username index).
    if (error.code === "23505") return { error: "Username già in uso." };
    return { error: "Aggiornamento non riuscito." };
  }

  revalidatePath("/profile");
  revalidatePath("/leaderboard");
  return { ok: true, username: parsed.data };
}

export async function signout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
