import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("rules");
  return { title: t("metaTitle") };
}

const MATCH_RULES = [
  { pts: "5", titleKey: "exactTitle", descKey: "exactDesc" },
  { pts: "2", titleKey: "signTitle", descKey: "signDesc" },
  { pts: "+1", titleKey: "diffTitle", descKey: "diffDesc" },
] as const;

export default async function RulesPage() {
  const t = await getTranslations("rules");
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("intro")}</p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">{t("perMatch")}</h2>
        {MATCH_RULES.map((r) => (
          <Card key={r.titleKey} className="flex items-start gap-4 p-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-lg font-bold tabular-nums text-primary">
              {r.pts}
            </span>
            <div>
              <p className="font-semibold">{t(r.titleKey)}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{t(r.descKey)}</p>
            </div>
          </Card>
        ))}
        <p className="text-xs text-muted-foreground">{t("perMatchNote")}</p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">{t("bonusTitle")}</h2>
        <Card className="flex flex-col gap-3 p-4">
          <div className="flex items-center gap-3">
            <Badge tone="success">+2</Badge>
            <p className="text-sm">
              {t.rich("bonusLastPlace", { strong: (c) => <strong>{c}</strong> })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge tone="success">+1</Badge>
            <p className="text-sm">
              {t.rich("bonusTie", { strong: (c) => <strong>{c}</strong> })}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">{t("bonusNote")}</p>
        </Card>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">{t("closeTitle")}</h2>
        <Card className="p-4">
          <p className="text-sm">
            {t.rich("closeNote", { strong: (c) => <strong>{c}</strong> })}
          </p>
        </Card>
      </section>
    </div>
  );
}
