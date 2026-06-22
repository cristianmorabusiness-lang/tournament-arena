"use client";

import { useState, type ReactNode } from "react";

type Tab = "upcoming" | "played";

export function MatchesFilter({
  upcomingCount,
  playedCount,
  upcoming,
  played,
}: {
  upcomingCount: number;
  playedCount: number;
  upcoming: ReactNode;
  played: ReactNode;
}) {
  // Default to whichever section has matches, preferring "da giocare".
  const [tab, setTab] = useState<Tab>(
    upcomingCount === 0 && playedCount > 0 ? "played" : "upcoming",
  );

  const tabClass = (active: boolean) =>
    `inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors ${
      active
        ? "bg-primary text-on-primary"
        : "text-muted-foreground hover:bg-surface"
    }`;

  return (
    <div className="flex flex-col gap-6">
      <div
        role="tablist"
        aria-label="Filtra partite"
        className="flex gap-1 rounded-xl border border-border bg-surface-2 p-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "upcoming"}
          onClick={() => setTab("upcoming")}
          className={tabClass(tab === "upcoming")}
        >
          Da giocare
          <span className="tabular-nums opacity-70">{upcomingCount}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "played"}
          onClick={() => setTab("played")}
          className={tabClass(tab === "played")}
        >
          Giocate
          <span className="tabular-nums opacity-70">{playedCount}</span>
        </button>
      </div>

      <div>{tab === "upcoming" ? upcoming : played}</div>
    </div>
  );
}
