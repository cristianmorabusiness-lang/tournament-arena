import { redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { MatchRow, type MatchRowData } from "@/components/matches/MatchRow";
import { MatchesFilter } from "@/components/matches/MatchesFilter";
import { createClient } from "@/lib/supabase/server";
import {
  groupByDay,
  isMatchLocked,
  matchPhase,
  type MatchDayGroup,
} from "@/lib/matchday";

type Row = {
  id: string;
  kickoff_at: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
  home: { name: string; flag_url: string | null } | null;
  away: { name: string; flag_url: string | null } | null;
};

type Pred = {
  pred_home: number | null;
  pred_away: number | null;
  points: number | null;
};

function dateLabel(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

function DayGroups({
  groups,
  predByMatch,
  now,
}: {
  groups: MatchDayGroup<Row>[];
  predByMatch: Map<string, Pred>;
  now: Date;
}) {
  return (
    <div className="flex flex-col gap-5">
      {groups.map((group) => (
        <section key={group.date}>
          <h3 className="mb-2 font-semibold capitalize text-muted-foreground">
            {dateLabel(group.date)}
          </h3>
          <Card className="p-0">
            <div className="divide-y divide-border">
              {group.matches.map((m) => {
                const pred = predByMatch.get(m.id);
                const row: MatchRowData = {
                  id: m.id,
                  homeName: m.home?.name ?? "TBD",
                  awayName: m.away?.name ?? "TBD",
                  homeFlag: m.home?.flag_url ?? null,
                  awayFlag: m.away?.flag_url ?? null,
                  kickoffAt: m.kickoff_at,
                  status: m.status,
                  homeScore: m.home_score,
                  awayScore: m.away_score,
                  predHome: pred?.pred_home ?? null,
                  predAway: pred?.pred_away ?? null,
                  points: pred?.points ?? null,
                };
                return (
                  <MatchRow
                    key={m.id}
                    match={row}
                    phase={matchPhase(m.kickoff_at, now)}
                  />
                );
              })}
            </div>
          </Card>
        </section>
      ))}
    </div>
  );
}

export default async function MatchesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: matchData } = await supabase
    .from("matches")
    .select(
      "id, kickoff_at, status, home_score, away_score, home:teams!matches_home_team_id_fkey(name, flag_url), away:teams!matches_away_team_id_fkey(name, flag_url)",
    )
    .order("kickoff_at");
  const matches = (matchData ?? []) as unknown as Row[];

  const { data: predData } = await supabase
    .from("predictions")
    .select("match_id, pred_home, pred_away, points")
    .eq("user_id", user.id);
  const predByMatch = new Map<string, Pred>(
    (predData ?? []).map((p) => [
      p.match_id,
      { pred_home: p.pred_home, pred_away: p.pred_away, points: p.points },
    ]),
  );

  if (matches.length === 0) {
    return (
      <div>
        <h1 className="mb-4 text-2xl font-bold">Pronostici</h1>
        <Alert variant="info">
          Il calendario non è ancora stato sincronizzato. Esegui{" "}
          <code>/api/sync</code> e ricarica.
        </Alert>
      </div>
    );
  }

  const now = new Date();
  // A match is "da giocare" while it's still open (locks 5 min before kickoff);
  // once locked it moves to "giocate" — most recent day first.
  const upcomingGroups = groupByDay(
    matches.filter((m) => !isMatchLocked(m.kickoff_at, now)),
  );
  const playedGroups = groupByDay(
    matches.filter((m) => isMatchLocked(m.kickoff_at, now)),
  ).reverse();

  const upcomingCount = upcomingGroups.reduce((n, g) => n + g.matches.length, 0);
  const playedCount = playedGroups.reduce((n, g) => n + g.matches.length, 0);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Pronostici</h1>

      <MatchesFilter
        upcomingCount={upcomingCount}
        playedCount={playedCount}
        upcoming={
          upcomingGroups.length > 0 ? (
            <DayGroups
              groups={upcomingGroups}
              predByMatch={predByMatch}
              now={now}
            />
          ) : (
            <Alert variant="info">
              Nessuna partita aperta ai pronostici al momento.
            </Alert>
          )
        }
        played={
          playedGroups.length > 0 ? (
            <DayGroups
              groups={playedGroups}
              predByMatch={predByMatch}
              now={now}
            />
          ) : (
            <Alert variant="info">Nessuna partita giocata.</Alert>
          )
        }
      />
    </div>
  );
}
