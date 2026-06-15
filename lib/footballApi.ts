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

let provider: FootballApiProvider | null = null;

/** Returns the configured football data provider (singleton). */
export function getFootballApi(): FootballApiProvider {
  if (!provider) provider = new ApiFootballProvider();
  return provider;
}
