import "server-only";
import { serverEnv } from "@/lib/env";
import type { MatchStatus } from "@/lib/types";

/**
 * Football data access — abstracted so the provider is swappable.
 * Default provider: API-Football (https://www.api-football.com, api-sports.io v3).
 *
 * Server-only: requires FOOTBALL_API_KEY. Never import from client code.
 */

// --- Normalized shapes returned to the rest of the app ---

export type ApiTeam = {
  externalId: string;
  name: string;
  code: string | null;
  flagUrl: string | null;
  group: string | null;
};

export type ApiPlayer = {
  externalId: string;
  teamExternalId: string;
  name: string;
  position: string | null;
  shirtNumber: number | null;
};

export type ApiMatch = {
  externalId: string;
  homeTeamExternalId: string | null;
  awayTeamExternalId: string | null;
  kickoffAt: string; // ISO 8601
  matchday: string | null;
  status: MatchStatus;
  homeScore: number | null;
  awayScore: number | null;
};

export interface FootballApiProvider {
  getQualifiedTeams(): Promise<ApiTeam[]>;
  getSquad(teamExternalId: string): Promise<ApiPlayer[]>;
  getMatches(): Promise<ApiMatch[]>;
}

// ---------------------------------------------------------------------------
// API-Football provider (v3)
// ---------------------------------------------------------------------------

// [da verificare] World Cup competition id and season in API-Football.
// Common value for the World Cup league id is 1; the season is the year.
// Override via env if needed.
const LEAGUE_ID = process.env.FOOTBALL_LEAGUE_ID ?? "1";
const SEASON = process.env.FOOTBALL_SEASON ?? "2026"; // [da verificare]
const BASE_URL =
  process.env.FOOTBALL_API_BASE ?? "https://v3.football.api-sports.io";

type ApiFootballResponse<T> = {
  errors?: unknown;
  response: T[];
};

function mapStatus(short: string): MatchStatus {
  // API-Football fixture status short codes.
  switch (short) {
    case "FT":
    case "AET":
    case "PEN":
      return "FINISHED";
    case "1H":
    case "2H":
    case "ET":
    case "BT":
    case "P":
    case "LIVE":
      return "IN_PLAY";
    case "HT":
      return "PAUSED";
    case "PST":
      return "POSTPONED";
    case "CANC":
    case "ABD":
    case "AWD":
    case "WO":
      return "CANCELLED";
    case "NS":
    case "TBD":
    default:
      return "SCHEDULED";
  }
}

class ApiFootballProvider implements FootballApiProvider {
  private async request<T>(
    path: string,
    params: Record<string, string>,
  ): Promise<T[]> {
    const url = new URL(`${BASE_URL}${path}`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    const res = await fetch(url, {
      headers: { "x-apisports-key": serverEnv.footballApiKey },
      // Reference data; revalidate is driven by the cron, not HTTP cache.
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(
        `API-Football ${path} failed: ${res.status} ${res.statusText}`,
      );
    }

    const json = (await res.json()) as ApiFootballResponse<T>;
    if (json.errors && Object.keys(json.errors).length > 0) {
      throw new Error(`API-Football ${path} errors: ${JSON.stringify(json.errors)}`);
    }
    return json.response ?? [];
  }

  async getQualifiedTeams(): Promise<ApiTeam[]> {
    // GET /teams?league={id}&season={year}
    type Row = {
      team: { id: number; name: string; code: string | null; logo: string | null };
    };
    const rows = await this.request<Row>("/teams", {
      league: LEAGUE_ID,
      season: SEASON,
    });
    return rows.map((r) => ({
      externalId: String(r.team.id),
      name: r.team.name,
      code: r.team.code,
      flagUrl: r.team.logo,
      group: null, // [da verificare] group label requires the standings endpoint
    }));
  }

  async getSquad(teamExternalId: string): Promise<ApiPlayer[]> {
    // GET /players/squads?team={id}
    type Row = {
      players: {
        id: number;
        name: string;
        number: number | null;
        position: string | null;
      }[];
    };
    const rows = await this.request<Row>("/players/squads", {
      team: teamExternalId,
    });
    const squad = rows[0]?.players ?? [];
    return squad.map((p) => ({
      externalId: String(p.id),
      teamExternalId,
      name: p.name,
      position: p.position,
      shirtNumber: p.number,
    }));
  }

  async getMatches(): Promise<ApiMatch[]> {
    // GET /fixtures?league={id}&season={year}
    type Row = {
      fixture: { id: number; date: string; status: { short: string } };
      league: { round: string | null };
      teams: { home: { id: number } | null; away: { id: number } | null };
      goals: { home: number | null; away: number | null };
    };
    const rows = await this.request<Row>("/fixtures", {
      league: LEAGUE_ID,
      season: SEASON,
    });
    return rows.map((r) => ({
      externalId: String(r.fixture.id),
      homeTeamExternalId: r.teams.home ? String(r.teams.home.id) : null,
      awayTeamExternalId: r.teams.away ? String(r.teams.away.id) : null,
      kickoffAt: r.fixture.date,
      matchday: r.league.round,
      status: mapStatus(r.fixture.status.short),
      homeScore: r.goals.home,
      awayScore: r.goals.away,
    }));
  }
}

// ---------------------------------------------------------------------------
// football-data.org provider (v4)
// ---------------------------------------------------------------------------
//
// Free tier: 10 requests/minute, World Cup competition included. Docs:
// https://www.football-data.org/documentation/quickstart
//
// World Cup competition code is "WC" (id 2000). Season is the starting year.
const FD_BASE_URL =
  process.env.FOOTBALL_DATA_BASE ?? "https://api.football-data.org/v4";
const FD_COMPETITION = process.env.FOOTBALL_DATA_COMPETITION ?? "WC";
// Optional. On the free tier the `season` filter is restricted to the CURRENT
// season; omitting it returns the current edition (the live 2026 World Cup right
// now). Only set FOOTBALL_DATA_SEASON to target a different/past edition.
const FD_SEASON = process.env.FOOTBALL_DATA_SEASON;

// football-data.org fixture statuses → our normalized MatchStatus.
function mapFdStatus(status: string): MatchStatus {
  switch (status) {
    case "FINISHED":
    case "AWARDED":
      return "FINISHED";
    case "IN_PLAY":
      return "IN_PLAY";
    case "PAUSED":
      return "PAUSED";
    case "TIMED":
      return "TIMED";
    case "SUSPENDED":
    case "POSTPONED":
      return "POSTPONED";
    case "CANCELLED":
      return "CANCELLED";
    case "SCHEDULED":
    default:
      return "SCHEDULED";
  }
}

// Build a human-readable round label from football-data's stage/group/matchday.
function fdRoundLabel(
  stage: string | null,
  group: string | null,
  matchday: number | null,
): string | null {
  const pretty = (s: string) =>
    s
      .toLowerCase()
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  if (group) return pretty(group); // e.g. "Group A"
  if (stage) return pretty(stage); // e.g. "Last 16", "Group Stage"
  if (matchday != null) return `Giornata ${matchday}`;
  return null;
}

class FootballDataProvider implements FootballApiProvider {
  private async request<T>(path: string, params: Record<string, string> = {}) {
    const url = new URL(`${FD_BASE_URL}${path}`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    const res = await fetch(url, {
      headers: { "X-Auth-Token": serverEnv.footballDataApiKey },
      cache: "no-store",
    });

    if (!res.ok) {
      // football-data returns a JSON body like { message, errorCode }; surface it
      // so restricted-season / quota errors are actionable. Keep the status code
      // in the message so the sync loop can still detect 429s.
      let detail = res.statusText;
      try {
        const body = (await res.json()) as { message?: string };
        if (body?.message) detail = body.message;
      } catch {
        // non-JSON body; fall back to statusText
      }
      throw new Error(`football-data ${path} failed: ${res.status} ${detail}`);
    }
    return (await res.json()) as T;
  }

  /** season param only when explicitly configured (free tier = current season). */
  private seasonParams(): Record<string, string> {
    return FD_SEASON ? { season: FD_SEASON } : {};
  }

  async getQualifiedTeams(): Promise<ApiTeam[]> {
    // GET /competitions/{code}/teams?season={year}
    type Resp = {
      teams: {
        id: number;
        name: string;
        tla: string | null;
        crest: string | null;
      }[];
    };
    const data = await this.request<Resp>(
      `/competitions/${FD_COMPETITION}/teams`,
      this.seasonParams(),
    );
    return (data.teams ?? []).map((t) => ({
      externalId: String(t.id),
      name: t.name,
      code: t.tla,
      flagUrl: t.crest,
      group: null, // group is per-match in this API; resolved on matches, not teams
    }));
  }

  async getSquad(teamExternalId: string): Promise<ApiPlayer[]> {
    // GET /teams/{id} → includes a `squad` array (no shirt numbers on the API).
    type Resp = {
      squad: { id: number; name: string; position: string | null }[];
    };
    const data = await this.request<Resp>(`/teams/${teamExternalId}`);
    return (data.squad ?? []).map((p) => ({
      externalId: String(p.id),
      teamExternalId,
      name: p.name,
      position: p.position,
      shirtNumber: null,
    }));
  }

  async getMatches(): Promise<ApiMatch[]> {
    // GET /competitions/{code}/matches?season={year}
    type Resp = {
      matches: {
        id: number;
        utcDate: string;
        status: string;
        stage: string | null;
        group: string | null;
        matchday: number | null;
        homeTeam: { id: number | null } | null;
        awayTeam: { id: number | null } | null;
        score: { fullTime: { home: number | null; away: number | null } };
      }[];
    };
    const data = await this.request<Resp>(
      `/competitions/${FD_COMPETITION}/matches`,
      this.seasonParams(),
    );
    return (data.matches ?? []).map((m) => ({
      externalId: String(m.id),
      homeTeamExternalId: m.homeTeam?.id != null ? String(m.homeTeam.id) : null,
      awayTeamExternalId: m.awayTeam?.id != null ? String(m.awayTeam.id) : null,
      kickoffAt: m.utcDate,
      matchday: fdRoundLabel(m.stage, m.group, m.matchday),
      status: mapFdStatus(m.status),
      homeScore: m.score?.fullTime?.home ?? null,
      awayScore: m.score?.fullTime?.away ?? null,
    }));
  }
}

let provider: FootballApiProvider | null = null;

/**
 * Returns the configured football data provider (singleton).
 * Select with FOOTBALL_PROVIDER: "football-data" (default) or "api-football".
 */
export function getFootballApi(): FootballApiProvider {
  if (!provider) {
    const choice = process.env.FOOTBALL_PROVIDER ?? "football-data";
    provider =
      choice === "api-football"
        ? new ApiFootballProvider()
        : new FootballDataProvider();
  }
  return provider;
}
