"use server";

import webpush from "web-push";
import { createClient } from "@/lib/supabase/server";
import { serverEnv } from "@/lib/env";

export type PushTestResult = { ok: boolean; sent?: number; error?: string };

/**
 * Sends an immediate test push to the current user's own subscriptions, so they
 * can verify notifications work without waiting for the daily reminder cron.
 */
export async function sendTestPush(): Promise<PushTestResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessione scaduta." };

  // RLS restricts this to the user's own rows.
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth");
  if (!subs || subs.length === 0) {
    return { ok: false, error: "Nessun dispositivo registrato." };
  }

  webpush.setVapidDetails(
    serverEnv.vapidSubject,
    serverEnv.vapidPublicKey,
    serverEnv.vapidPrivateKey,
  );
  const payload = JSON.stringify({
    title: "Tournament Arena ⚽",
    body: "Notifiche attive! Riceverai i promemoria dei pronostici.",
    url: "/dashboard",
    tag: "test",
  });

  let sent = 0;
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
      );
      sent++;
    } catch {
      // Ignore individual failures (e.g. expired); the daily cron prunes them.
    }
  }
  return sent > 0
    ? { ok: true, sent }
    : { ok: false, error: "Invio non riuscito." };
}
