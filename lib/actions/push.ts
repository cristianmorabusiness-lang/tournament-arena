"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const subSchema = z.object({
  endpoint: z.string().url(),
  p256dh: z.string().min(1),
  auth: z.string().min(1),
});

export type PushActionResult = { ok: boolean; error?: string };

/** Stores the current user's Web Push subscription (one row per device). */
export async function savePushSubscription(
  sub: unknown,
): Promise<PushActionResult> {
  const parsed = subSchema.safeParse(sub);
  if (!parsed.success) return { ok: false, error: "Subscription non valida." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessione scaduta." };

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      endpoint: parsed.data.endpoint,
      user_id: user.id,
      p256dh: parsed.data.p256dh,
      auth: parsed.data.auth,
    },
    { onConflict: "endpoint" },
  );
  if (error) return { ok: false, error: "Salvataggio non riuscito." };
  return { ok: true };
}

/** Removes a subscription (when the user disables reminders on this device). */
export async function removePushSubscription(
  endpoint: string,
): Promise<PushActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessione scaduta." };

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: "Rimozione non riuscita." };
  return { ok: true };
}
