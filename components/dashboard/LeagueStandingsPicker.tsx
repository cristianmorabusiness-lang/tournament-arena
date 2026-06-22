"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/Card";
import { flagForCode } from "@/lib/nationalTeams";
import type { StandingRow } from "@/lib/leagueStandings";

export type LeagueMini = {
  leagueId: string;
  leagueName: string;
  rows: StandingRow[];
  startRank: number;
};

/**
 * Home mini-standings with a league filter. When the player belongs to more
 * than one league, a dropdown selects which league's "specchietto" (their row
 * plus the one above and below) is shown — keeping the home page short.
 */
export function LeagueStandingsPicker({
  leagues,
  userId,
}: {
  leagues: LeagueMini[];
  userId: string;
}) {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  const [selectedId, setSelectedId] = useState(leagues[0]?.leagueId);
  const current =
    leagues.find((l) => l.leagueId === selectedId) ?? leagues[0];
  if (!current) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">{t("yourLeagues")}</h2>
        {leagues.length > 1 && (
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">{t("leagueLabel")}</span>
            <select
              value={current.leagueId}
              onChange={(e) => setSelectedId(e.target.value)}
              aria-label={t("leagueSelectAria")}
              className="h-9 max-w-[55vw] truncate rounded-lg border border-border bg-surface px-3 text-sm font-medium outline-none focus:border-primary"
            >
              {leagues.map((l) => (
                <option key={l.leagueId} value={l.leagueId}>
                  {l.leagueName}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <Card className="p-0">
        <Link
          href={`/leagues/${current.leagueId}`}
          className="flex items-center justify-between border-b border-border px-4 py-2.5 text-sm font-semibold hover:text-primary"
        >
          {current.leagueName}
          <span className="text-xs font-medium text-muted-foreground">
            {t("viewStandings")}
          </span>
        </Link>
        <ul className="divide-y divide-border">
          {current.rows.map((r, i) => (
            <li
              key={r.userId}
              className={`flex items-center justify-between px-4 py-2.5 text-sm ${
                r.userId === userId ? "bg-primary/10" : ""
              }`}
            >
              <span className="flex items-center gap-2.5">
                <span className="w-5 text-right tabular-nums text-muted-foreground">
                  {current.startRank + i}
                </span>
                {flagForCode(r.country) && (
                  <span className="text-base leading-none" aria-hidden>
                    {flagForCode(r.country)}
                  </span>
                )}
                <span className="font-medium">
                  @{r.username}
                  {r.userId === userId && (
                    <span className="ml-1.5 text-xs text-primary">{tc("you")}</span>
                  )}
                </span>
              </span>
              <span className="tabular-nums font-semibold">{r.points} pt</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
