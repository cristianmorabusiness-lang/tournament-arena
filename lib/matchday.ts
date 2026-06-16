import type { Match } from "@/lib/types";

/**
 * Match-day helpers. Predictions lock per match: each match closes
 * LOCK_LEAD_MS before its own kickoff (not for the whole day at once).
 */

/** Predictions for a match lock this many ms before its kickoff. */
export const LOCK_LEAD_MS = 5 * 60 * 1000; // 5 minutes

/** UTC calendar date key (YYYY-MM-DD) for a kickoff timestamp. */
export function dayKey(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

/** The instant a match's prediction locks: LOCK_LEAD_MS before kickoff. */
export function lockAtFor(kickoffAt: string): number {
  return new Date(kickoffAt).getTime() - LOCK_LEAD_MS;
}

/** A match is locked once we are within LOCK_LEAD_MS of its kickoff. */
export function isMatchLocked(
  kickoffAt: string,
  now: Date = new Date(),
): boolean {
  return now.getTime() >= lockAtFor(kickoffAt);
}

export type MatchDayGroup<T extends Pick<Match, "kickoff_at">> = {
  date: string;
  matches: T[];
};

/** Groups matches by UTC day, sorted by date then kickoff. */
export function groupByDay<T extends Pick<Match, "kickoff_at">>(
  matches: T[],
): MatchDayGroup<T>[] {
  const byDay = new Map<string, T[]>();
  for (const m of matches) {
    const key = dayKey(m.kickoff_at);
    const list = byDay.get(key);
    if (list) list.push(m);
    else byDay.set(key, [m]);
  }

  return [...byDay.entries()]
    .map(([date, list]) => {
      const sorted = [...list].sort(
        (a, b) =>
          new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime(),
      );
      return { date, matches: sorted };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}
