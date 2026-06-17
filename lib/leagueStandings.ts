import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type StandingRow = {
  userId: string;
  username: string;
  country: string | null;
  points: number;
};

type MemberRow = {
  user_id: string;
  profiles: { username: string; favorite_country: string | null } | null;
};

/**
 * Full standings for a league: every approved member with their summed daily
 * points, sorted high-to-low (ties broken by user id for stability). Used by the
 * Home page mini-standings. RLS scopes the rows to leagues the caller can see.
 */
export async function getLeagueStandings(
  supabase: SupabaseServerClient,
  leagueId: string,
): Promise<StandingRow[]> {
  const { data: memberData } = await supabase
    .from("league_members")
    .select("user_id, profiles(username, favorite_country)")
    .eq("league_id", leagueId)
    .eq("status", "approved");
  const approved = (memberData ?? []) as unknown as MemberRow[];

  const { data: scoreData } = await supabase
    .from("daily_scores")
    .select("user_id, total_points")
    .eq("league_id", leagueId);

  const totals = new Map<string, number>();
  for (const r of scoreData ?? []) {
    totals.set(r.user_id, (totals.get(r.user_id) ?? 0) + r.total_points);
  }

  return approved
    .map((m) => ({
      userId: m.user_id,
      username: m.profiles?.username ?? "utente",
      country: m.profiles?.favorite_country ?? null,
      points: totals.get(m.user_id) ?? 0,
    }))
    .sort((a, b) => b.points - a.points || (a.userId < b.userId ? -1 : 1));
}

/**
 * Returns the slice of standings centred on `userId`: the row above and below
 * (the "specchietto"). Clamped at the ends — leader shows the two below them,
 * the last player the two above. Returns null if the user isn't in the league.
 */
export function standingsWindow(
  rows: StandingRow[],
  userId: string,
): { rows: StandingRow[]; startRank: number } | null {
  const idx = rows.findIndex((r) => r.userId === userId);
  if (idx === -1) return null;
  // Center on the user, then shift the window so it stays within bounds.
  let start = idx - 1;
  if (start < 0) start = 0;
  if (start > rows.length - 3) start = rows.length - 3;
  if (start < 0) start = 0;
  return { rows: rows.slice(start, start + 3), startRank: start + 1 };
}
