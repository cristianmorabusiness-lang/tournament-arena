import { redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { MatchRow, type MatchRowData } from "@/components/matches/MatchRow";
import { createClient } from "@/lib/supabase/server";
import { groupByDay, isDayLocked } from "@/lib/matchday";

type Row = {
  id: string;
  kickoff_at: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
  home: { name: string } | null;
  away: { name: string } | null;
};

function dateLabel(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
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
      "id, kickoff_at, status, home_score, away_score, home:teams!matches_home_team_id_fkey(name), away:teams!matches_away_team_id_fkey(name)",
    )
    .order("kickoff_at");
  const matches = (matchData ?? []) as unknown as Row[];

  const { data: predData } = await supabase
    .from("predictions")
    .select("match_id, pred_home, pred_away, points")
    .eq("user_id", user.id);
  const predByMatch = new Map(
    (predData ?? []).map((p) => [p.match_id, p]),
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

  const groups = groupByDay(matches);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Pronostici</h1>

      {groups.map((group) => {
        const locked = isDayLocked(group.lockAt);
        return (
          <section key={group.date}>
            <div className="mb-2 flex items-center gap-2">
              <h2 className="font-semibold capitalize">{dateLabel(group.date)}</h2>
              {locked ? (
                <Badge tone="neutral">Bloccata</Badge>
              ) : (
                <Badge tone="success">Aperta</Badge>
              )}
            </div>
            <Card className="p-0">
              <div className="divide-y divide-border">
                {group.matches.map((m) => {
                  const pred = predByMatch.get(m.id);
                  const row: MatchRowData = {
                    id: m.id,
                    homeName: m.home?.name ?? "TBD",
                    awayName: m.away?.name ?? "TBD",
                    kickoffAt: m.kickoff_at,
                    status: m.status,
                    homeScore: m.home_score,
                    awayScore: m.away_score,
                    predHome: pred?.pred_home ?? null,
                    predAway: pred?.pred_away ?? null,
                    points: pred?.points ?? null,
                  };
                  return <MatchRow key={m.id} match={row} locked={locked} />;
                })}
              </div>
            </Card>
          </section>
        );
      })}
    </div>
  );
}
