/**
 * Tournament Arena scoring engine.
 *
 * Per finished match, comparing a prediction to the real result:
 *  - 5 points  → exact score (e.g. 2-1 vs 2-1).
 *  - 2 points  → correct outcome (1 / X / 2: home win, draw, away win).
 *  - +1 point  → predicted goal difference equals the real one.
 *
 * Rules 2 and +1 stack; an exact result is a flat 5 (never summed past 5).
 */

function outcome(home: number, away: number): -1 | 0 | 1 {
  return Math.sign(home - away) as -1 | 0 | 1;
}

export function computePoints(
  predHome: number,
  predAway: number,
  realHome: number,
  realAway: number,
): number {
  // Exact result — flat 5 (already includes outcome + goal difference).
  if (predHome === realHome && predAway === realAway) {
    return 5;
  }

  let points = 0;

  // Correct outcome (1 / X / 2).
  if (outcome(predHome, predAway) === outcome(realHome, realAway)) {
    points += 2;
  }

  // Correct goal difference.
  if (predHome - predAway === realHome - realAway) {
    points += 1;
  }

  return points;
}

export type DayScore = { userId: string; points: number };

/**
 * Day bonus, applied within a single league at the end of a match day:
 *  - The user with the FEWEST points that day receives +2.
 *  - If there is a tie for LAST place, each tied user receives +1 instead.
 *
 * Returns a map of userId → bonus points (only for users who receive a bonus).
 */
export function computeDayBonus(scores: DayScore[]): Map<string, number> {
  const bonus = new Map<string, number>();
  if (scores.length === 0) return bonus;

  const min = Math.min(...scores.map((s) => s.points));
  const lastPlace = scores.filter((s) => s.points === min);
  const amount = lastPlace.length > 1 ? 1 : 2;

  for (const s of lastPlace) {
    bonus.set(s.userId, amount);
  }
  return bonus;
}
