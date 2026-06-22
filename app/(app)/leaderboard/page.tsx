import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { RankDelta } from "@/components/RankDelta";
import { createClient } from "@/lib/supabase/server";
import { flagForCode } from "@/lib/nationalTeams";

type ScoreEmbed = {
  total_points: number;
  rank: number | null;
  previous_rank: number | null;
};

type ProfileRow = {
  id: string;
  username: string | null;
  favorite_country: string | null;
  global_scores: ScoreEmbed | ScoreEmbed[] | null;
};

// Cartoon crowns for the podium (gold / silver / bronze), shown next to the rank.
const PODIUM_CROWNS = [
  "/crown-gold.png",
  "/crown-silver.png",
  "/crown-bronze.png",
];

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const t = await getTranslations("leaderboard");
  const tc = await getTranslations("common");

  // Drive the leaderboard from `profiles` (the source of truth for every
  // registered user) and left-join the score, so newcomers appear immediately
  // at 0 pt instead of only after the next scoring run populates global_scores.
  const { data } = await supabase
    .from("profiles")
    .select("id, username, favorite_country, global_scores(total_points, rank, previous_rank)");
  const profiles = (data ?? []) as unknown as ProfileRow[];

  const rows = profiles
    .map((p) => {
      const gs = Array.isArray(p.global_scores)
        ? p.global_scores[0]
        : p.global_scores;
      return {
        id: p.id,
        username: p.username,
        favorite_country: p.favorite_country,
        total_points: gs?.total_points ?? 0,
        rank: gs?.rank ?? null,
        previous_rank: gs?.previous_rank ?? null,
      };
    })
    .sort(
      (a, b) =>
        b.total_points - a.total_points ||
        (a.username ?? "").localeCompare(b.username ?? ""),
    );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      {rows.length === 0 ? (
        <Alert variant="info">{t("none")}</Alert>
      ) : (
        <Card className="p-0">
          <ul className="divide-y divide-border">
            {rows.map((r, i) => {
              const isMe = r.id === user.id;
              return (
                <li
                  key={r.id}
                  className={`flex items-center justify-between px-5 py-3 ${
                    isMe ? "bg-primary/10" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <span className="tabular-nums w-6 text-right text-sm text-muted-foreground">
                        {i + 1}
                      </span>
                      {PODIUM_CROWNS[i] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={PODIUM_CROWNS[i]}
                          alt=""
                          width={18}
                          height={18}
                          className="size-[18px] shrink-0 object-contain"
                        />
                      )}
                    </span>
                    {flagForCode(r.favorite_country) && (
                      <span className="text-lg leading-none" aria-hidden>
                        {flagForCode(r.favorite_country)}
                      </span>
                    )}
                    <span className="font-medium">
                      @{r.username ?? tc("user")}
                      {isMe && (
                        <span className="ml-2 text-xs text-primary">{tc("you")}</span>
                      )}
                    </span>
                    {r.rank != null && r.previous_rank != null && (
                      <RankDelta delta={r.previous_rank - r.rank} />
                    )}
                  </div>
                  <span className="tabular-nums font-semibold">
                    {r.total_points} pt
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
