import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { LeagueForms } from "@/components/leagues/LeagueForms";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { createClient } from "@/lib/supabase/server";
import type { League, MemberRole, MemberStatus } from "@/lib/types";

type MembershipRow = {
  role: MemberRole;
  status: MemberStatus;
  leagues: League | null;
};

const STATUS_TONE = {
  approved: "success",
  pending: "warning",
  rejected: "danger",
} as const;

const STATUS_KEY = {
  approved: "statusApproved",
  pending: "statusPending",
  rejected: "statusRejected",
} as const;

export default async function LeaguesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const t = await getTranslations("leagues");

  const { data } = await supabase
    .from("league_members")
    .select("role, status, leagues(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const memberships = (data ?? []) as unknown as MembershipRow[];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <LeagueForms />

      <section>
        <h2 className="mb-3 text-lg font-semibold">{t("memberships")}</h2>
        {memberships.length === 0 ? (
          <Card>
            <p className="text-sm text-muted-foreground">{t("noneYet")}</p>
          </Card>
        ) : (
          <ul className="flex flex-col gap-3">
            {memberships.map((m) =>
              m.leagues ? (
                <li key={m.leagues.id}>
                  <Link href={`/leagues/${m.leagues.id}`}>
                    <Card className="flex items-center justify-between transition-colors hover:bg-surface-2">
                      <div>
                        <p className="font-semibold">{m.leagues.name}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {m.role === "admin" ? t("admin") : t("member")} · {t("code")}{" "}
                          <span className="tabular-nums">{m.leagues.join_code}</span>
                        </p>
                      </div>
                      <Badge tone={STATUS_TONE[m.status]}>
                        {t(STATUS_KEY[m.status])}
                      </Badge>
                    </Card>
                  </Link>
                </li>
              ) : null,
            )}
          </ul>
        )}
      </section>
    </div>
  );
}
