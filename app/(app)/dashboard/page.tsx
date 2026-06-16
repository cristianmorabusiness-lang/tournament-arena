import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { MatchRow, type MatchRowData } from "@/components/matches/MatchRow";
import { createClient } from "@/lib/supabase/server";
import { dayKey, isMatchLocked, pickFeaturedDay } from "@/lib/matchday";

type Row = {
  id: string;
  kickoff_at: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
  home: { name: string; flag_url: string | null } | null;
  away: { name: string; flag_url: string | null } | null;
};

const SHORTCUTS = [
  { href: "/matches", title: "Pronostici", desc: "Tutte le giornate" },
  { href: "/leagues", title: "Le tue leghe", desc: "Crea o unisciti" },
  { href: "/leaderboard", title: "Classifica", desc: "Sfida tutti" },
];

function dayTitle(date: string, today: string): string {
  const formatted = new Date(`${date}T00:00:00Z`).toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
  return date === today ? `Oggi · ${formatted}` : formatted;
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
  const predByMatch = new Map((predData ?? []).map((p) => [p.match_id, p]));

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const featuredDay = pickFeaturedDay(matches, now);
  const dayMatches = featuredDay
    ? matches.filter((m) => dayKey(m.kickoff_at) === featuredDay)
    : [];
  const missing = dayMatches.filter(
    (m) => !isMatchLocked(m.kickoff_at, now) && !predByMatch.get(m.id),
  ).length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Ciao, {profile.username} 👋</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {missing > 0
            ? `Hai ${missing} pronostic${missing > 1 ? "i" : "o"} ancora da inserire per questa giornata.`
            : "Sei in pari con i pronostici. Buona fortuna!"}
        </p>
      </div>

      {featuredDay ? (
        <section>
          <div className="mb-2 flex items-center gap-2">
            <h2 className="font-semibold capitalize">
              {dayTitle(featuredDay, today)}
            </h2>
            {missing > 0 && <Badge tone="warning">{missing} da fare</Badge>}
          </div>
          <Card className="p-0">
            <div className="divide-y divide-border">
              {dayMatches.map((m) => {
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
                    locked={isMatchLocked(m.kickoff_at, now)}
                  />
                );
              })}
            </div>
          </Card>
          <Link
            href="/matches"
            className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
          >
            Vedi tutte le giornate →
          </Link>
        </section>
      ) : (
        <Alert variant="info">
          Nessuna partita in programma al momento. Torna più tardi!
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {SHORTCUTS.map((s) => (
          <Link key={s.href} href={s.href}>
            <Card className="h-full transition-colors hover:bg-surface-2">
              <h2 className="font-semibold">{s.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
