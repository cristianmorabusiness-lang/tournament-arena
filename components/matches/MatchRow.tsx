"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LocalTime } from "@/components/LocalTime";
import { savePrediction, type PredictionState } from "@/lib/actions/predictions";
import { LOCK_LEAD_MS, type MatchPhase } from "@/lib/matchday";
import { formatLocale, type Locale } from "@/i18n/config";

export type MatchRowData = {
  id: string;
  homeName: string;
  awayName: string;
  homeFlag: string | null;
  awayFlag: string | null;
  kickoffAt: string;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  predHome: number | null;
  predAway: number | null;
  points: number | null;
};

/** Translation key for the points awarded on a finished match. */
function pointsReasonKey(
  predHome: number,
  predAway: number,
  realHome: number,
  realAway: number,
): "exact" | "signDiff" | "signOnly" | "noPoints" {
  if (predHome === realHome && predAway === realAway) return "exact";
  const signOk =
    Math.sign(predHome - predAway) === Math.sign(realHome - realAway);
  const diffOk = predHome - predAway === realHome - realAway;
  if (signOk && diffOk) return "signDiff";
  if (signOk) return "signOnly";
  return "noPoints";
}

function TeamFlag({ src }: { src: string | null }) {
  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={20}
      height={20}
      className="size-5 shrink-0 rounded-sm object-cover"
    />
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  const t = useTranslations("matchRow");
  return (
    <Button type="submit" disabled={pending} className="h-10 px-4 text-xs">
      {pending ? t("saving") : t("save")}
    </Button>
  );
}

/** Live "closes in …" countdown until a match locks (kickoff − 5 min). */
function LockCountdown({ kickoffAt }: { kickoffAt: string }) {
  const t = useTranslations("matchRow");
  const lockAt = new Date(kickoffAt).getTime() - LOCK_LEAD_MS;
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  if (now === null) return null;
  const ms = lockAt - now;
  if (ms <= 0) return null;

  const min = Math.floor(ms / 60_000);
  const label =
    min >= 1440
      ? `${Math.floor(min / 1440)}g`
      : min >= 60
        ? `${Math.floor(min / 60)}h ${min % 60}m`
        : `${min}m`;
  const urgent = ms <= 60 * 60_000;

  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap text-[11px] tabular-nums ${
        urgent ? "text-secondary" : "text-muted-foreground"
      }`}
      title={t("remainingTooltip")}
    >
      <svg viewBox="0 0 24 24" width={11} height={11} fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label}
    </span>
  );
}

export function MatchRow({
  match,
  phase,
}: {
  match: MatchRowData;
  /** "open" → editable form · "locked" → result/points · "upcoming" → not open yet. */
  phase: MatchPhase;
}) {
  const t = useTranslations("matchRow");
  const locale = useLocale() as Locale;
  const [state, action] = useActionState<PredictionState, FormData>(
    savePrediction,
    undefined,
  );
  const isFinished = match.status === "FINISHED";
  const saved = state?.ok && state.matchId === match.id;

  return (
    <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 text-sm">
        <LocalTime
          iso={match.kickoffAt}
          locale={formatLocale[locale]}
          className="tabular-nums text-muted-foreground"
        />
        <span className="flex items-center gap-1.5 font-medium">
          <TeamFlag src={match.homeFlag} />
          {match.homeName}
        </span>
        <span className="text-muted-foreground">{t("vs")}</span>
        <span className="flex items-center gap-1.5 font-medium">
          <TeamFlag src={match.awayFlag} />
          {match.awayName}
        </span>
        <Link
          href={`/matches/${match.id}`}
          className="ml-1 text-xs font-medium text-muted-foreground hover:text-primary"
          aria-label={t("detailsAria")}
        >
          {t("details")}
        </Link>
      </div>

      <div className="flex items-center gap-3">
        {isFinished && (
          <span className="text-xs text-muted-foreground">
            {t("result")}{" "}
            <span className="tabular-nums font-semibold text-foreground">
              {match.homeScore}-{match.awayScore}
            </span>
          </span>
        )}

        {phase === "locked" ? (
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2">
              <span className="tabular-nums rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-sm font-semibold">
                {match.predHome ?? "–"} : {match.predAway ?? "–"}
              </span>
              {match.points !== null ? (
                <Badge tone="primary">{t("points", { points: match.points })}</Badge>
              ) : (
                <Badge tone="neutral">{t("locked")}</Badge>
              )}
            </div>
            {isFinished &&
              match.points !== null &&
              match.predHome !== null &&
              match.predAway !== null &&
              match.homeScore !== null &&
              match.awayScore !== null && (
                <span className="text-[11px] text-muted-foreground">
                  {t(
                    pointsReasonKey(
                      match.predHome,
                      match.predAway,
                      match.homeScore,
                      match.awayScore,
                    ),
                  )}
                </span>
              )}
          </div>
        ) : phase === "upcoming" ? (
          <span title={t("opensTooltip")}>
            <Badge tone="neutral">{t("opensDayBefore")}</Badge>
          </span>
        ) : (
          <form action={action} className="flex items-center gap-2">
            <LockCountdown kickoffAt={match.kickoffAt} />
            <input type="hidden" name="matchId" value={match.id} />
            <input
              type="number"
              name="predHome"
              inputMode="numeric"
              min={0}
              max={99}
              defaultValue={match.predHome ?? ""}
              aria-label={t("goalsAria", { team: match.homeName })}
              className="h-10 w-12 rounded-lg border border-border bg-surface text-center text-sm outline-none focus:border-primary"
              required
            />
            <span className="text-muted-foreground">:</span>
            <input
              type="number"
              name="predAway"
              inputMode="numeric"
              min={0}
              max={99}
              defaultValue={match.predAway ?? ""}
              aria-label={t("goalsAria", { team: match.awayName })}
              className="h-10 w-12 rounded-lg border border-border bg-surface text-center text-sm outline-none focus:border-primary"
              required
            />
            <SaveButton />
            {saved && <span className="text-xs text-success">✓</span>}
            {state?.error && state.matchId === match.id && (
              <span className="text-xs text-destructive">{state.error}</span>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
