import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { createClient } from "@/lib/supabase/server";
import { flagForCode } from "@/lib/nationalTeams";
import { isMatchLocked } from "@/lib/matchday";
import { LocalDateTime } from "@/components/LocalTime";

type MatchRow = {
  id: string;
  kickoff_at: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
  home: { name: string; flag_url: string | null } | null;
  away: { name: string; flag_url: string | null } | null;
};

type PredRow = {
  user_id: string;
  pred_home: number;
  pred_away: number;
  points: number | null;
  profiles: { username: string; favorite_country: string | null } | null;
};

function TeamSide({
  name,
  flag,
  align,
}: {
  name: string;
  flag: string | null;
  align: "left" | "right";
}) {
  return (
    <div
      className={`flex flex-1 items-center gap-2 ${align === "right" ? "flex-row-reverse text-right" : ""}`}
    >
      {flag && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={flag} alt="" className="size-7 rounded-sm object-cover" />
      )}
      <span className="font-semibold">{name}</span>
    </div>
  );
}

function PredLine({ p, you }: { p: PredRow; you: boolean }) {
  return (
    <li
      className={`flex items-center justify-between px-5 py-3 ${you ? "bg-primary/10" : ""}`}
    >
      <span className="flex items-center gap-2">
        {flagForCode(p.profiles?.favorite_country) && (
          <span className="text-lg leading-none" aria-hidden>
            {flagForCode(p.profiles?.favorite_country)}
          </span>
        )}
        <span className="font-medium">
          @{p.profiles?.username ?? "utente"}
          {you && <span className="ml-2 text-xs text-primary">(tu)</span>}
        </span>
      </span>
      <span className="flex items-center gap-2">
        <span className="tabular-nums rounded-lg border border-border bg-surface-2 px-3 py-1 text-sm font-semibold">
          {p.pred_home} : {p.pred_away}
        </span>
        {p.points !== null && <Badge tone="primary">{p.points} pt</Badge>}
      </span>
    </li>
  );
}

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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
    .eq("id", id)
    .maybeSingle();
  const match = matchData as unknown as MatchRow | null;

  if (!match) {
    return (
      <div className="flex flex-col gap-4">
        <Link href="/matches" className="text-sm text-primary hover:underline">
          ‹ Pronostici
        </Link>
        <Alert variant="info">Partita non trovata.</Alert>
      </div>
    );
  }

  const locked = isMatchLocked(match.kickoff_at);
  const isFinished = match.status === "FINISHED";

  // RLS returns the current user's own prediction plus, once the match is
  // locked, the predictions of users they share an approved league with.
  const { data: predData } = await supabase
    .from("predictions")
    .select("user_id, pred_home, pred_away, points, profiles(username, favorite_country)")
    .eq("match_id", id);
  const preds = (predData ?? []) as unknown as PredRow[];

  const mine = preds.find((p) => p.user_id === user.id) ?? null;
  const others = preds
    .filter((p) => p.user_id !== user.id)
    .sort(
      (a, b) =>
        (b.points ?? -1) - (a.points ?? -1) ||
        (a.profiles?.username ?? "").localeCompare(b.profiles?.username ?? ""),
    );

  const homeName = match.home?.name ?? "TBD";
  const awayName = match.away?.name ?? "TBD";

  return (
    <div className="flex flex-col gap-6">
      <Link href="/matches" className="text-sm text-primary hover:underline">
        ‹ Pronostici
      </Link>

      <Card className="flex flex-col gap-3">
        <p className="text-center text-xs capitalize text-muted-foreground">
          <LocalDateTime iso={match.kickoff_at} />
        </p>
        <div className="flex items-center gap-3">
          <TeamSide name={homeName} flag={match.home?.flag_url ?? null} align="left" />
          <div className="shrink-0 text-center">
            {isFinished ? (
              <span className="tabular-nums text-2xl font-bold">
                {match.home_score} - {match.away_score}
              </span>
            ) : (
              <span className="text-sm font-medium text-muted-foreground">vs</span>
            )}
          </div>
          <TeamSide name={awayName} flag={match.away?.flag_url ?? null} align="right" />
        </div>
        <div className="flex justify-center">
          {isFinished ? (
            <Badge tone="neutral">Conclusa</Badge>
          ) : locked ? (
            <Badge tone="warning">Pronostici chiusi</Badge>
          ) : (
            <Badge tone="success">Pronostici aperti</Badge>
          )}
        </div>
      </Card>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Pronostici</h2>

        {!locked ? (
          <div className="flex flex-col gap-3">
            {mine ? (
              <Card className="p-0">
                <ul className="divide-y divide-border">
                  <PredLine p={mine} you />
                </ul>
              </Card>
            ) : (
              <Alert variant="info">
                Non hai ancora pronosticato questa partita.
              </Alert>
            )}
            <p className="text-sm text-muted-foreground">
              I pronostici degli altri membri delle tue leghe compariranno qui
              alla chiusura (5 minuti prima del calcio d&apos;inizio).
            </p>
          </div>
        ) : others.length === 0 && !mine ? (
          <Alert variant="info">
            Nessun pronostico da mostrare. Compaiono i pronostici dei membri
            delle tue leghe.
          </Alert>
        ) : (
          <Card className="p-0">
            <ul className="divide-y divide-border">
              {mine && <PredLine p={mine} you />}
              {others.map((p) => (
                <PredLine key={p.user_id} p={p} you={false} />
              ))}
            </ul>
          </Card>
        )}
      </section>
    </div>
  );
}
