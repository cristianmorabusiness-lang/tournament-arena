import { dayKey } from "@/lib/matchday";

/** A scored (or not-yet-scored) prediction row, minimal shape for stats. */
export type ScoredPrediction = {
  match_id: string;
  points: number | null;
};

export type PlayerStats = {
  /** Exact-result predictions (5 pt each). */
  exact: number;
  /** Number of predictions the scoring job has evaluated. */
  scoredCount: number;
  /** Average points per evaluated prediction. */
  avg: number;
  /** Best single (UTC) matchday: summed points and its date key. */
  bestDay: { points: number; date: string } | null;
};

/**
 * Computes the three headline player stats (exact results, per-match average,
 * best matchday) shared by the Home page and the Profile. `kickoffById` maps a
 * match id to its kickoff ISO string, used to bucket points by day.
 */
export function computePlayerStats(
  predictions: ScoredPrediction[],
  kickoffById: Map<string, string>,
): PlayerStats {
  const scored = predictions.filter((p) => p.points !== null);
  const exact = scored.filter((p) => p.points === 5).length;
  const total = scored.reduce((sum, p) => sum + (p.points ?? 0), 0);
  const avg = scored.length ? total / scored.length : 0;

  const byDay = new Map<string, number>();
  for (const p of scored) {
    const iso = kickoffById.get(p.match_id);
    if (!iso) continue;
    const d = dayKey(iso);
    byDay.set(d, (byDay.get(d) ?? 0) + (p.points ?? 0));
  }
  const best = [...byDay.entries()].sort((a, b) => b[1] - a[1])[0];

  return {
    exact,
    scoredCount: scored.length,
    avg,
    bestDay: best ? { points: best[1], date: best[0] } : null,
  };
}
