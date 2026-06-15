import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFootballApi } from "@/lib/footballApi";

export type SyncResult = {
  teams: number;
  players: number;
  matches: number;
};

/**
 * Full synchronization of qualified teams, squads, fixtures and results from the
 * football API into Supabase. Runs server-side with the service role key.
 * Idempotent: every write is an upsert keyed on external_id.
 */
export async function syncAll(): Promise<SyncResult> {
  const api = getFootballApi();
  const supabase = createAdminClient();

  // 1) Teams
  const apiTeams = await api.getQualifiedTeams();
  if (apiTeams.length > 0) {
    const { error } = await supabase.from("teams").upsert(
      apiTeams.map((t) => ({
        external_id: t.externalId,
        name: t.name,
        code: t.code,
        flag_url: t.flagUrl,
        group_label: t.group,
      })),
      { onConflict: "external_id" },
    );
    if (error) throw new Error(`teams upsert: ${error.message}`);
  }

  // Map external_id -> internal id for FK resolution
  const { data: teamRows, error: teamReadErr } = await supabase
    .from("teams")
    .select("id, external_id");
  if (teamReadErr) throw new Error(`teams read: ${teamReadErr.message}`);
  const teamIdByExternal = new Map(
    (teamRows ?? []).map((r) => [r.external_id, r.id]),
  );

  // 2) Players (squad per team)
  let playerCount = 0;
  for (const team of apiTeams) {
    const teamId = teamIdByExternal.get(team.externalId);
    if (!teamId) continue;
    const squad = await api.getSquad(team.externalId);
    if (squad.length === 0) continue;
    const { error } = await supabase.from("players").upsert(
      squad.map((p) => ({
        external_id: p.externalId,
        team_id: teamId,
        name: p.name,
        position: p.position,
        shirt_number: p.shirtNumber,
      })),
      { onConflict: "external_id" },
    );
    if (error) throw new Error(`players upsert (${team.name}): ${error.message}`);
    playerCount += squad.length;
  }

  // 3) Matches (calendar + results)
  const apiMatches = await api.getMatches();
  if (apiMatches.length > 0) {
    const { error } = await supabase.from("matches").upsert(
      apiMatches.map((m) => ({
        external_id: m.externalId,
        home_team_id: m.homeTeamExternalId
          ? (teamIdByExternal.get(m.homeTeamExternalId) ?? null)
          : null,
        away_team_id: m.awayTeamExternalId
          ? (teamIdByExternal.get(m.awayTeamExternalId) ?? null)
          : null,
        kickoff_at: m.kickoffAt,
        matchday: m.matchday,
        status: m.status,
        home_score: m.homeScore,
        away_score: m.awayScore,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: "external_id" },
    );
    if (error) throw new Error(`matches upsert: ${error.message}`);
  }

  return {
    teams: apiTeams.length,
    players: playerCount,
    matches: apiMatches.length,
  };
}
