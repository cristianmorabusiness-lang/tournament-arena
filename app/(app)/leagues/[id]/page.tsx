import { redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { PendingRequests } from "@/components/leagues/PendingRequests";
import { ShareInvite } from "@/components/leagues/ShareInvite";
import { RankDelta } from "@/components/RankDelta";
import { createClient } from "@/lib/supabase/server";
import { flagForCode } from "@/lib/nationalTeams";
import { dayKey } from "@/lib/matchday";
import type { League, MemberRole, MemberStatus } from "@/lib/types";

type DayMatch = {
  id: string;
  kickoff_at: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
  home: { name: string; flag_url: string | null } | null;
  away: { name: string; flag_url: string | null } | null;
};

type MemberRow = {
  id: string;
  user_id: string;
  role: MemberRole;
  status: MemberStatus;
  profiles: { username: string; favorite_country: string | null } | null;
};

export default async function LeagueDetailPage({
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

  const { data: league } = await supabase
    .from("leagues")
    .select("*")
    .eq("id", id)
    .maybeSingle<League>();

  // RLS hides leagues from non-approved users → treat as pending/not allowed.
  if (!league) {
    return (
      <Alert variant="info">
        Non hai ancora accesso a questa lega. Se hai inviato una richiesta, attendi
        l&apos;approvazione dell&apos;admin.
      </Alert>
    );
  }

  const isAdmin = league.admin_id === user.id;

  const { data: memberData } = await supabase
    .from("league_members")
    .select("id, user_id, role, status, profiles(username, favorite_country)")
    .eq("league_id", id)
    .order("created_at", { ascending: true });
  const members = (memberData ?? []) as unknown as MemberRow[];
  const approved = members.filter((m) => m.status === "approved");
  const pending = members
    .filter((m) => m.status === "pending")
    .map((m) => ({ id: m.id, username: m.profiles?.username ?? "utente" }));

  // Standings: sum of daily total_points per member within this league.
  const usernameByUser = new Map(
    approved.map((m) => [m.user_id, m.profiles?.username ?? "utente"]),
  );
  const countryByUser = new Map(
    approved.map((m) => [m.user_id, m.profiles?.favorite_country ?? null]),
  );
  const { data: scoreData } = await supabase
    .from("daily_scores")
    .select("user_id, match_date, total_points, base_points, bonus_points")
    .eq("league_id", id);
  const dailyRows = scoreData ?? [];
  const totals = new Map<string, number>();
  for (const row of dailyRows) {
    totals.set(row.user_id, (totals.get(row.user_id) ?? 0) + row.total_points);
  }

  // Bacheca: recap of the most recent scored matchday in this league.
  const latestDate = dailyRows.reduce<string | null>(
    (acc, r) => (acc === null || r.match_date > acc ? r.match_date : acc),
    null,
  );
  const dayBoard = latestDate
    ? dailyRows
        .filter((r) => r.match_date === latestDate)
        .map((r) => ({
          userId: r.user_id,
          username: usernameByUser.get(r.user_id) ?? "utente",
          country: countryByUser.get(r.user_id) ?? null,
          points: r.total_points,
          base: r.base_points,
          bonus: r.bonus_points,
        }))
        .filter((r) => usernameByUser.has(r.userId))
        .sort((a, b) => b.points - a.points || (a.userId < b.userId ? -1 : 1))
    : [];
  const dayTop = dayBoard.length ? dayBoard[0].points : 0;

  // Results of that matchday (finished matches on the same UTC day).
  let dayResults: DayMatch[] = [];
  if (latestDate) {
    const { data: matchData } = await supabase
      .from("matches")
      .select(
        "id, kickoff_at, status, home_score, away_score, home:teams!matches_home_team_id_fkey(name, flag_url), away:teams!matches_away_team_id_fkey(name, flag_url)",
      )
      .eq("status", "FINISHED")
      .order("kickoff_at");
    dayResults = ((matchData ?? []) as unknown as DayMatch[]).filter(
      (m) => dayKey(m.kickoff_at) === latestDate,
    );
  }
  const boardDateLabel = latestDate
    ? new Date(`${latestDate}T00:00:00Z`).toLocaleDateString("it-IT", {
        weekday: "long",
        day: "numeric",
        month: "long",
        timeZone: "UTC",
      })
    : "";

  // Rank history (from the last scoring run) for the position-change indicator.
  const { data: standingData } = await supabase
    .from("league_standings")
    .select("user_id, rank, previous_rank")
    .eq("league_id", id);
  const rankByUser = new Map(
    (standingData ?? []).map((s) => [
      s.user_id,
      { rank: s.rank as number | null, prev: s.previous_rank as number | null },
    ]),
  );

  const standings = approved
    .map((m) => ({
      userId: m.user_id,
      username: usernameByUser.get(m.user_id) ?? "utente",
      country: countryByUser.get(m.user_id) ?? null,
      points: totals.get(m.user_id) ?? 0,
    }))
    .sort((a, b) => b.points - a.points || (a.userId < b.userId ? -1 : 1));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{league.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Codice lega:{" "}
            <span className="font-semibold tabular-nums text-foreground">
              {league.join_code}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && <Badge tone="primary">Sei l&apos;admin</Badge>}
          <ShareInvite code={league.join_code} leagueName={league.name} />
        </div>
      </div>

      {isAdmin && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">
            Richieste in attesa ({pending.length})
          </h2>
          <PendingRequests leagueId={league.id} members={pending} />
        </section>
      )}

      {latestDate && (
        <section>
          <h2 className="mb-1 text-lg font-semibold">Bacheca</h2>
          <p className="mb-3 text-sm capitalize text-muted-foreground">
            Ultima giornata · {boardDateLabel}
          </p>
          <div className="grid gap-4 lg:grid-cols-2">
            {dayResults.length > 0 && (
              <Card className="p-0">
                <p className="border-b border-border px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Risultati
                </p>
                <ul className="divide-y divide-border">
                  {dayResults.map((m) => (
                    <li
                      key={m.id}
                      className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
                    >
                      <span className="flex items-center gap-1.5">
                        {m.home?.flag_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={m.home.flag_url} alt="" className="size-4 rounded-sm object-cover" />
                        )}
                        {m.home?.name ?? "TBD"}
                      </span>
                      <span className="tabular-nums font-semibold">
                        {m.home_score}-{m.away_score}
                      </span>
                      <span className="flex items-center gap-1.5">
                        {m.away?.name ?? "TBD"}
                        {m.away?.flag_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={m.away.flag_url} alt="" className="size-4 rounded-sm object-cover" />
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            <Card className="p-0">
              <p className="border-b border-border px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Punti di giornata
              </p>
              <ul className="divide-y divide-border">
                {dayBoard.map((d) => (
                  <li
                    key={d.userId}
                    className={`flex items-center justify-between px-4 py-2.5 text-sm ${
                      d.userId === user.id ? "bg-primary/10" : ""
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {flagForCode(d.country) && (
                        <span className="text-base leading-none" aria-hidden>
                          {flagForCode(d.country)}
                        </span>
                      )}
                      <span className="font-medium">@{d.username}</span>
                      {d.points === dayTop && dayTop > 0 && (
                        <Badge tone="primary">Migliore</Badge>
                      )}
                    </span>
                    <span className="flex flex-col items-end leading-tight">
                      <span className="tabular-nums font-semibold">
                        {d.points} pt
                      </span>
                      {d.bonus > 0 && (
                        <span className="text-[11px] text-muted-foreground">
                          {d.base} + {d.bonus} bonus
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold">Classifica della lega</h2>
        <Card className="p-0">
          <ul className="divide-y divide-border">
            {standings.map((s, i) => (
              <li
                key={s.userId}
                className={`flex items-center justify-between px-5 py-3 ${
                  s.userId === user.id ? "bg-primary/10" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="tabular-nums w-6 text-right text-sm text-muted-foreground">
                    {i + 1}
                  </span>
                  {flagForCode(s.country) && (
                    <span className="text-lg leading-none" aria-hidden>
                      {flagForCode(s.country)}
                    </span>
                  )}
                  <span className="font-medium">@{s.username}</span>
                  {(() => {
                    const rk = rankByUser.get(s.userId);
                    return rk?.rank != null && rk.prev != null ? (
                      <RankDelta delta={rk.prev - rk.rank} />
                    ) : null;
                  })()}
                </div>
                <span className="tabular-nums font-semibold">{s.points} pt</span>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">
          Membri ({approved.length})
        </h2>
        <Card className="p-0">
          <ul className="divide-y divide-border">
            {approved.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between px-5 py-3"
              >
                <span className="flex items-center gap-2 font-medium">
                  {flagForCode(m.profiles?.favorite_country) && (
                    <span className="text-lg leading-none" aria-hidden>
                      {flagForCode(m.profiles?.favorite_country)}
                    </span>
                  )}
                  @{m.profiles?.username ?? "utente"}
                </span>
                {m.role === "admin" && <Badge tone="primary">Admin</Badge>}
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </div>
  );
}
