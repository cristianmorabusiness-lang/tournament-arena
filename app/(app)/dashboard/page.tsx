import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { MatchRow, type MatchRowData } from "@/components/matches/MatchRow";
import { createClient } from "@/lib/supabase/server";
import { formatLocale, type Locale } from "@/i18n/config";
import {
  dayKey,
  homeWindowDays,
  isMatchLocked,
  matchPhase,
} from "@/lib/matchday";
import { computePlayerStats } from "@/lib/playerStats";
import { getLeagueStandings, standingsWindow } from "@/lib/leagueStandings";
import {
  LeagueStandingsPicker,
  type LeagueMini,
} from "@/components/dashboard/LeagueStandingsPicker";

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

const SHORTCUTS = [
  {
    href: "/matches",
    titleKey: "shortcutPredictions",
    descKey: "shortcutPredictionsDesc",
  },
  {
    href: "/leagues",
    titleKey: "shortcutLeagues",
    descKey: "shortcutLeaguesDesc",
  },
] as const;

function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}

function dayLabel(date: string, today: string, locale: string, prefix: string): string {
  const formatted = new Date(`${date}T00:00:00Z`).toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
  return `${prefix} · ${formatted}`;
}

function DaySection({
  date,
  today,
  matches,
  predByMatch,
  now,
  locale,
}: {
  date: string;
  today: string;
  matches: Row[];
  predByMatch: Map<string, Pred>;
  now: Date;
  locale: string;
}) {
  const t = useTranslations("dashboard");
  const missing = matches.filter(
    (m) => !isMatchLocked(m.kickoff_at, now) && !predByMatch.get(m.id),
  ).length;
  const prefix = date === today ? t("today") : t("tomorrow");

  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <h2 className="font-semibold capitalize">
          {dayLabel(date, today, locale, prefix)}
        </h2>
        {missing > 0 && <Badge tone="warning">{t("toDo", { count: missing })}</Badge>}
      </div>
      <Card className="p-0">
        <div className="divide-y divide-border">
          {matches.map((m) => {
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
              <MatchRow key={m.id} match={row} phase={matchPhase(m.kickoff_at, now)} />
            );
          })}
        </div>
      </Card>
    </section>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, favorite_country")
    .eq("id", user.id)
    .single();

  // Onboarding gate: must pick a favorite national team first.
  if (!profile?.favorite_country) redirect("/onboarding");

  const t = await getTranslations("dashboard");
  const fmtLocale = formatLocale[(await getLocale()) as Locale];

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
  const predictions = predData ?? [];
  const predByMatch = new Map<string, Pred>(
    predictions.map((p) => [
      p.match_id,
      { pred_home: p.pred_home, pred_away: p.pred_away, points: p.points },
    ]),
  );

  // Headline stats (shared with Profile): exact results, per-match average,
  // best matchday — shown right under the greeting.
  const kickoffById = new Map(matches.map((m) => [m.id, m.kickoff_at]));
  const stats = computePlayerStats(predictions, kickoffById);
  const bestDayValue = stats.bestDay ? `${stats.bestDay.points} pt` : "–";
  const bestDayHint = stats.bestDay
    ? new Date(`${stats.bestDay.date}T00:00:00Z`).toLocaleDateString(fmtLocale, {
        day: "numeric",
        month: "short",
        timeZone: "UTC",
      })
    : undefined;

  const now = new Date();
  const [today, tomorrow] = homeWindowDays(now);
  const todayMatches = matches.filter((m) => dayKey(m.kickoff_at) === today);
  const tomorrowMatches = matches.filter((m) => dayKey(m.kickoff_at) === tomorrow);
  const hasMatches = todayMatches.length > 0 || tomorrowMatches.length > 0;

  const missing = [...todayMatches, ...tomorrowMatches].filter(
    (m) => !isMatchLocked(m.kickoff_at, now) && !predByMatch.get(m.id),
  ).length;

  // Mini-standings ("specchietti") for the leagues the player belongs to:
  // their own row plus the one above and below.
  const { data: membershipData } = await supabase
    .from("league_members")
    .select("league_id, leagues(id, name)")
    .eq("user_id", user.id)
    .eq("status", "approved");
  type Membership = { league_id: string; leagues: { id: string; name: string } | null };
  const memberships = (membershipData ?? []) as unknown as Membership[];

  const miniStandings = (
    await Promise.all(
      memberships.map(async (m): Promise<LeagueMini | null> => {
        if (!m.leagues) return null;
        const standings = await getLeagueStandings(supabase, m.league_id);
        const window = standingsWindow(standings, user.id);
        if (!window) return null;
        return {
          leagueId: m.leagues.id,
          leagueName: m.leagues.name,
          rows: window.rows,
          startRank: window.startRank,
        };
      }),
    )
  ).filter((x): x is LeagueMini => x !== null);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">
          {t("greeting", { username: profile.username })}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {missing > 0 ? t("missing", { count: missing }) : t("allCaught")}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatTile label={t("statExact")} value={String(stats.exact)} />
        <StatTile
          label={t("statAvg")}
          value={stats.scoredCount ? stats.avg.toFixed(1) : "–"}
        />
        <StatTile label={t("statBestDay")} value={bestDayValue} hint={bestDayHint} />
      </div>

      {hasMatches ? (
        <div className="flex flex-col gap-6">
          {todayMatches.length > 0 && (
            <DaySection
              date={today}
              today={today}
              matches={todayMatches}
              predByMatch={predByMatch}
              now={now}
              locale={fmtLocale}
            />
          )}
          {tomorrowMatches.length > 0 && (
            <DaySection
              date={tomorrow}
              today={today}
              matches={tomorrowMatches}
              predByMatch={predByMatch}
              now={now}
              locale={fmtLocale}
            />
          )}
        </div>
      ) : (
        <Alert variant="info">
          {t("noMatchesBefore")}
          <Link href="/matches" className="font-medium text-primary hover:underline">
            {t("viewCalendar")}
          </Link>
        </Alert>
      )}

      {miniStandings.length > 0 && (
        <LeagueStandingsPicker leagues={miniStandings} userId={user.id} />
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {SHORTCUTS.map((s) => (
          <Link key={s.href} href={s.href}>
            <Card className="h-full transition-colors hover:bg-surface-2">
              <h2 className="font-semibold">{t(s.titleKey)}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t(s.descKey)}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
