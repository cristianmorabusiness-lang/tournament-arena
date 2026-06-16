import "server-only";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env";
import { dayKey, isMatchLocked } from "@/lib/matchday";

export type NotifyResult = {
  openMatches: number;
  notified: number;
  removed: number;
};

/**
 * Daily reminder: pushes a notification to every subscribed user who still has
 * predictions to set for matches that kick off today (UTC) and are not yet
 * locked. Idempotent enough to run once a day; expired subscriptions are pruned.
 */
export async function runReminders(): Promise<NotifyResult> {
  webpush.setVapidDetails(
    serverEnv.vapidSubject,
    serverEnv.vapidPublicKey,
    serverEnv.vapidPrivateKey,
  );

  const supabase = createAdminClient();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  // Today's matches that are still open for predictions.
  const { data: matchData } = await supabase
    .from("matches")
    .select("id, kickoff_at");
  const openToday = (matchData ?? []).filter(
    (m) => dayKey(m.kickoff_at) === today && !isMatchLocked(m.kickoff_at, now),
  );
  if (openToday.length === 0) {
    return { openMatches: 0, notified: 0, removed: 0 };
  }
  const openIds = new Set(openToday.map((m) => m.id));

  const { data: subData } = await supabase
    .from("push_subscriptions")
    .select("endpoint, user_id, p256dh, auth");
  const subs = subData ?? [];
  if (subs.length === 0) {
    return { openMatches: openToday.length, notified: 0, removed: 0 };
  }

  // Predictions already made by subscribed users for today's open matches.
  const userIds = [...new Set(subs.map((s) => s.user_id))];
  const { data: predData } = await supabase
    .from("predictions")
    .select("user_id, match_id")
    .in("user_id", userIds);
  const predicted = new Set(
    (predData ?? [])
      .filter((p) => openIds.has(p.match_id))
      .map((p) => `${p.user_id}|${p.match_id}`),
  );

  const missingByUser = new Map<string, number>();
  for (const uid of userIds) {
    let missing = 0;
    for (const id of openIds) {
      if (!predicted.has(`${uid}|${id}`)) missing++;
    }
    if (missing > 0) missingByUser.set(uid, missing);
  }

  let notified = 0;
  let removed = 0;
  for (const sub of subs) {
    const missing = missingByUser.get(sub.user_id);
    if (!missing) continue;
    const payload = JSON.stringify({
      title: "Tournament Arena ⚽",
      body: `Hai ${missing} pronostic${missing > 1 ? "i" : "o"} da inserire per oggi.`,
      url: "/dashboard",
      tag: "daily-reminder",
    });
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        payload,
      );
      notified++;
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("endpoint", sub.endpoint);
        removed++;
      }
    }
  }

  return { openMatches: openToday.length, notified, removed };
}
