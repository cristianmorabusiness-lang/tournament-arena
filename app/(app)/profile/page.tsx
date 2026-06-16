import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";
import { flagForCode } from "@/lib/nationalTeams";
import { dayKey } from "@/lib/matchday";

export const metadata = { title: "Profilo · Tournament Arena" };

function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}

export default async function ProfilePage() {
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
  if (!profile?.favorite_country) redirect("/onboarding");

  const { data: globalRow } = await supabase
    .from("global_scores")
    .select("total_points, rank")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: predData } = await supabase
    .from("predictions")
    .select("match_id, points")
    .eq("user_id", user.id);
  const predictions = predData ?? [];

  const { data: matchData } = await supabase
    .from("matches")
    .select("id, kickoff_at");
  const kickoffById = new Map(
    (matchData ?? []).map((m) => [m.id, m.kickoff_at as string]),
  );

  // Scored predictions (the scoring job has assigned points).
  const scored = predictions.filter((p) => p.points !== null);
  const exact = scored.filter((p) => p.points === 5).length;
  const correctSign = scored.filter((p) => (p.points ?? 0) >= 2).length;
  const totalPoints = globalRow?.total_points ?? 0;
  const avg = scored.length ? totalPoints / scored.length : 0;
  const pct = (n: number) =>
    scored.length ? `${Math.round((n / scored.length) * 100)}%` : "–";

  // Best matchday: highest summed points over a single (UTC) day.
  const byDay = new Map<string, number>();
  for (const p of scored) {
    const iso = kickoffById.get(p.match_id);
    if (!iso) continue;
    const d = dayKey(iso);
    byDay.set(d, (byDay.get(d) ?? 0) + (p.points ?? 0));
  }
  const bestDay = [...byDay.entries()].sort((a, b) => b[1] - a[1])[0];
  const bestDayLabel = bestDay
    ? `${bestDay[1]} pt · ${new Date(`${bestDay[0]}T00:00:00Z`).toLocaleDateString("it-IT", { day: "numeric", month: "short", timeZone: "UTC" })}`
    : "–";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <span
          className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-2 text-3xl"
          aria-hidden
        >
          {flagForCode(profile.favorite_country) || "🏆"}
        </span>
        <div>
          <h1 className="text-2xl font-bold">@{profile.username}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {globalRow?.rank
              ? `Posizione globale #${globalRow.rank}`
              : "Non ancora in classifica"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Punti totali" value={String(totalPoints)} />
        <StatTile
          label="Pronostici"
          value={String(predictions.length)}
          hint={`${scored.length} valutati`}
        />
        <StatTile
          label="Risultati esatti"
          value={String(exact)}
          hint={pct(exact)}
        />
        <StatTile
          label="Segno corretto"
          value={String(correctSign)}
          hint={pct(correctSign)}
        />
        <StatTile
          label="Media a partita"
          value={scored.length ? avg.toFixed(1) : "–"}
          hint="punti per pronostico valutato"
        />
        <StatTile label="Miglior giornata" value={bestDayLabel} />
      </div>

      {scored.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Le statistiche si popolano man mano che le partite vengono giocate e i
          punteggi calcolati.{" "}
          <Link href="/matches" className="font-medium text-primary hover:underline">
            Inserisci i tuoi pronostici →
          </Link>
        </p>
      )}
    </div>
  );
}
