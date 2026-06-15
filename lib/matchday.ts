import type { Match } from "@/lib/types";

/**
 * Match-day helpers. A "giornata" is the UTC calendar date of kickoff.
 * Predictions for a day lock at the kickoff of the FIRST match of that day.
 */

/** UTC calendar date key (YYYY-MM-DD) for a kickoff timestamp. */
export function dayKey(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

export type MatchDayGroup<T extends Pick<Match, "kickoff_at">> = {
  date: string;
  lockAt: string; // ISO of the earliest kickoff that day
  matches: T[];
};

/** Groups matches by UTC day, sorted by date then kickoff, with each day's lock time. */
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
      return { date, lockAt: sorted[0].kickoff_at, matches: sorted };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** A day is locked once the current time has reached its first kickoff. */
export function isDayLocked(lockAt: string, now: Date = new Date()): boolean {
  return now.getTime() >= new Date(lockAt).getTime();
}
