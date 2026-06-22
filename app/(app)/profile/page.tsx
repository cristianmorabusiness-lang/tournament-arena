import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import { PushToggle } from "@/components/PushToggle";
import { UsernameForm } from "@/components/profile/UsernameForm";
import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";
import { flagForCode } from "@/lib/nationalTeams";
import { computePlayerStats } from "@/lib/playerStats";
import { formatLocale, type Locale } from "@/i18n/config";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("profile");
  return { title: t("metaTitle") };
}

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

  const t = await getTranslations("profile");
  const fmtLocale = formatLocale[(await getLocale()) as Locale];

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
  const stats = computePlayerStats(predictions, kickoffById);
  const scoredCount = stats.scoredCount;
  const correctSign = predictions.filter(
    (p) => p.points !== null && p.points >= 2,
  ).length;
  const totalPoints = globalRow?.total_points ?? 0;
  const pct = (n: number) =>
    scoredCount ? `${Math.round((n / scoredCount) * 100)}%` : "–";

  const bestDayLabel = stats.bestDay
    ? `${stats.bestDay.points} pt · ${new Date(`${stats.bestDay.date}T00:00:00Z`).toLocaleDateString(fmtLocale, { day: "numeric", month: "short", timeZone: "UTC" })}`
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
              ? t("globalRank", { rank: globalRow.rank })
              : t("notRanked")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label={t("totalPoints")} value={String(totalPoints)} />
        <StatTile
          label={t("predictions")}
          value={String(predictions.length)}
          hint={t("evaluated", { count: scoredCount })}
        />
        <StatTile
          label={t("exactResults")}
          value={String(stats.exact)}
          hint={pct(stats.exact)}
        />
        <StatTile
          label={t("correctSign")}
          value={String(correctSign)}
          hint={pct(correctSign)}
        />
        <StatTile
          label={t("avgPerMatch")}
          value={scoredCount ? stats.avg.toFixed(1) : "–"}
          hint={t("perEvaluated")}
        />
        <StatTile label={t("bestDay")} value={bestDayLabel} />
      </div>

      <Card className="p-4">
        <UsernameForm current={profile.username} />
      </Card>

      {publicEnv.vapidPublicKey && (
        <Card className="p-4">
          <PushToggle vapidKey={publicEnv.vapidPublicKey} />
        </Card>
      )}

      {scoredCount === 0 && (
        <p className="text-sm text-muted-foreground">
          {t("statsHint")}{" "}
          <Link href="/matches" className="font-medium text-primary hover:underline">
            {t("enterPredictions")}
          </Link>
        </p>
      )}
    </div>
  );
}
