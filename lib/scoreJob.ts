import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { computePoints, computeDayBonus, type DayScore } from "@/lib/scoring";
import { dayKey } from "@/lib/matchday";

export type ScoreJobResult = {
  scoredPredictions: number;
  dailyScoreRows: number;
  globalRows: number;
  leagueStandingRows: number;
};

/**
 * Daily scoring job. Fully recomputed and upserted on every run, so re-running
 * is idempotent (no duplicated points or bonuses).
 *
 *  1. Scores predictions on FINISHED matches.
 *  2. Computes per-league per-day base + day bonus (last place +2; tie +1).
 *     The day bonus is only applied once ALL matches of that day are finished.
 *  3. Refreshes the global leaderboard (pure prediction points, no league bonus).
 */
export async function runScoring(): Promise<ScoreJobResult> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  // --- Load data ---
  const { data: matchData, error: matchErr } = await supabase
    .from("matches")
    .select("id, kickoff_at, status, home_score, away_score");
  if (matchErr) throw new Error(`matches read: ${matchErr.message}`);
  const matches = matchData ?? [];

  const { data: predData, error: predErr } = await supabase
    .from("predictions")
    .select("id, user_id, match_id, pred_home, pred_away");
  if (predErr) throw new Error(`predictions read: ${predErr.message}`);
  const predictions = predData ?? [];

  const { data: memberData, error: memberErr } = await supabase
    .from("league_members")
    .select("league_id, user_id")
    .eq("status", "approved");
  if (memberErr) throw new Error(`members read: ${memberErr.message}`);
  const members = memberData ?? [];

  const { data: profileData, error: profileErr } = await supabase
    .from("profiles")
    .select("id");
  if (profileErr) throw new Error(`profiles read: ${profileErr.message}`);
  const profiles = profileData ?? [];

  // Ranks from the PREVIOUS scoring run, used to compute position deltas.
  // Read before we overwrite them below.
  const { data: prevGlobal } = await supabase
    .from("global_scores")
    .select("user_id, rank");
  const prevGlobalRank = new Map<string, number | null>(
    (prevGlobal ?? []).map((r) => [r.user_id, r.rank]),
  );
  const { data: prevLeague } = await supabase
    .from("league_standings")
    .select("league_id, user_id, rank");
  const prevLeagueRank = new Map<string, number | null>(
    (prevLeague ?? []).map((r) => [`${r.league_id}|${r.user_id}`, r.rank]),
  );

  const matchById = new Map(matches.map((m) => [m.id, m]));

  // --- 1) Score predictions on finished matches ---
  const scored: {
    id: string;
    user_id: string;
    match_id: string;
    pred_home: number;
    pred_away: number;
    points: number;
  }[] = [];
  // pointsByUserMatch: `${userId}|${matchId}` -> points
  const pointsByUserMatch = new Map<string, number>();

  for (const p of predictions) {
    const m = matchById.get(p.match_id);
    if (
      m &&
      m.status === "FINISHED" &&
      m.home_score !== null &&
      m.away_score !== null
    ) {
      const pts = computePoints(
        p.pred_home,
        p.pred_away,
        m.home_score,
        m.away_score,
      );
      scored.push({ ...p, points: pts });
      pointsByUserMatch.set(`${p.user_id}|${p.match_id}`, pts);
    }
  }

  if (scored.length > 0) {
    const { error } = await supabase
      .from("predictions")
      .upsert(scored, { onConflict: "id" });
    if (error) throw new Error(`predictions score upsert: ${error.message}`);
  }

  // --- Day metadata ---
  // date -> finished match ids; date -> whether all matches that day are finished
  const finishedMatchesByDate = new Map<string, string[]>();
  const dayComplete = new Map<string, boolean>();
  for (const m of matches) {
    const d = dayKey(m.kickoff_at);
    if (m.status === "FINISHED") {
      const list = finishedMatchesByDate.get(d) ?? [];
      list.push(m.id);
      finishedMatchesByDate.set(d, list);
    }
    const allDone = (dayComplete.get(d) ?? true) && m.status === "FINISHED";
    dayComplete.set(d, allDone);
  }
  const scoredDates = [...finishedMatchesByDate.keys()];

  // Who actually played each day: a user counts as a participant of a date if
  // they set at least one prediction on a match of that date. Non-participants
  // must NOT receive the last-place consolation bonus (otherwise idle members
  // accumulate free points just by tying for last at 0).
  const participantsByDate = new Map<string, Set<string>>();
  for (const p of predictions) {
    const m = matchById.get(p.match_id);
    if (!m) continue;
    const d = dayKey(m.kickoff_at);
    let set = participantsByDate.get(d);
    if (!set) {
      set = new Set<string>();
      participantsByDate.set(d, set);
    }
    set.add(p.user_id);
  }

  // --- 2) Per-league per-day base points + day bonus ---
  const membersByLeague = new Map<string, string[]>();
  for (const m of members) {
    const list = membersByLeague.get(m.league_id) ?? [];
    list.push(m.user_id);
    membersByLeague.set(m.league_id, list);
  }

  const basePointsForUserDate = (userId: string, date: string): number => {
    const matchIds = finishedMatchesByDate.get(date) ?? [];
    let sum = 0;
    for (const mid of matchIds) {
      sum += pointsByUserMatch.get(`${userId}|${mid}`) ?? 0;
    }
    return sum;
  };

  const dailyRows: {
    league_id: string;
    user_id: string;
    match_date: string;
    base_points: number;
    bonus_points: number;
    total_points: number;
    updated_at: string;
  }[] = [];

  for (const [leagueId, userIds] of membersByLeague) {
    for (const date of scoredDates) {
      const participants = participantsByDate.get(date) ?? new Set<string>();
      // Only members who actually played that day are eligible for the bonus,
      // and only when there are at least two of them (a consolation prize needs
      // someone to be last relative to others).
      const eligible: DayScore[] = userIds
        .filter((u) => participants.has(u))
        .map((u) => ({ userId: u, points: basePointsForUserDate(u, date) }));
      const bonusMap =
        dayComplete.get(date) && eligible.length >= 2
          ? computeDayBonus(eligible)
          : new Map<string, number>();

      // Still emit a row for every member so re-runs overwrite any stale
      // (previously buggy) bonus with the correct value.
      for (const u of userIds) {
        const base = basePointsForUserDate(u, date);
        const bonus = bonusMap.get(u) ?? 0;
        dailyRows.push({
          league_id: leagueId,
          user_id: u,
          match_date: date,
          base_points: base,
          bonus_points: bonus,
          total_points: base + bonus,
          updated_at: now,
        });
      }
    }
  }

  if (dailyRows.length > 0) {
    const { error } = await supabase
      .from("daily_scores")
      .upsert(dailyRows, { onConflict: "league_id,user_id,match_date" });
    if (error) throw new Error(`daily_scores upsert: ${error.message}`);
  }

  // --- 3) Per-league aggregated standings with rank history ---
  // Deterministic ordering (points desc, then user_id asc) so the stored rank
  // matches the row order shown in the UI and deltas line up exactly.
  const leagueStandingRows: {
    league_id: string;
    user_id: string;
    total_points: number;
    rank: number;
    previous_rank: number | null;
    updated_at: string;
  }[] = [];

  for (const [leagueId, userIds] of membersByLeague) {
    const totals = new Map<string, number>(userIds.map((u) => [u, 0]));
    for (const r of dailyRows) {
      if (r.league_id !== leagueId) continue;
      totals.set(r.user_id, (totals.get(r.user_id) ?? 0) + r.total_points);
    }
    const ranked = [...userIds].sort(
      (a, b) => (totals.get(b) ?? 0) - (totals.get(a) ?? 0) || (a < b ? -1 : 1),
    );
    ranked.forEach((u, idx) => {
      leagueStandingRows.push({
        league_id: leagueId,
        user_id: u,
        total_points: totals.get(u) ?? 0,
        rank: idx + 1,
        previous_rank: prevLeagueRank.get(`${leagueId}|${u}`) ?? null,
        updated_at: now,
      });
    });
  }

  if (leagueStandingRows.length > 0) {
    const { error } = await supabase
      .from("league_standings")
      .upsert(leagueStandingRows, { onConflict: "league_id,user_id" });
    if (error) throw new Error(`league_standings upsert: ${error.message}`);
  }

  // --- 4) Global leaderboard (pure prediction points) ---
  const globalByUser = new Map<string, number>();
  for (const s of scored) {
    globalByUser.set(s.user_id, (globalByUser.get(s.user_id) ?? 0) + s.points);
  }
  const globalRanked = profiles
    .map((p) => ({ user_id: p.id, total_points: globalByUser.get(p.id) ?? 0 }))
    .sort(
      (a, b) =>
        b.total_points - a.total_points ||
        (a.user_id < b.user_id ? -1 : 1),
    );
  const globalRows = globalRanked.map((e, idx) => ({
    user_id: e.user_id,
    total_points: e.total_points,
    rank: idx + 1,
    previous_rank: prevGlobalRank.get(e.user_id) ?? null,
    updated_at: now,
  }));

  if (globalRows.length > 0) {
    const { error } = await supabase
      .from("global_scores")
      .upsert(globalRows, { onConflict: "user_id" });
    if (error) throw new Error(`global_scores upsert: ${error.message}`);
  }

  return {
    scoredPredictions: scored.length,
    dailyScoreRows: dailyRows.length,
    globalRows: globalRows.length,
    leagueStandingRows: leagueStandingRows.length,
  };
}
