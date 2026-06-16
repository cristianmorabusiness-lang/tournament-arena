"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { savePrediction, type PredictionState } from "@/lib/actions/predictions";

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

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });
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
  return (
    <Button type="submit" disabled={pending} className="h-10 px-4 text-xs">
      {pending ? "…" : "Salva"}
    </Button>
  );
}

export function MatchRow({
  match,
  locked,
}: {
  match: MatchRowData;
  locked: boolean;
}) {
  const [state, action] = useActionState<PredictionState, FormData>(
    savePrediction,
    undefined,
  );
  const isFinished = match.status === "FINISHED";
  const saved = state?.ok && state.matchId === match.id;

  return (
    <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 text-sm">
        <span className="tabular-nums text-muted-foreground">
          {timeLabel(match.kickoffAt)}
        </span>
        <span className="flex items-center gap-1.5 font-medium">
          <TeamFlag src={match.homeFlag} />
          {match.homeName}
        </span>
        <span className="text-muted-foreground">vs</span>
        <span className="flex items-center gap-1.5 font-medium">
          <TeamFlag src={match.awayFlag} />
          {match.awayName}
        </span>
      </div>

      <div className="flex items-center gap-3">
        {isFinished && (
          <span className="text-xs text-muted-foreground">
            Risultato:{" "}
            <span className="tabular-nums font-semibold text-foreground">
              {match.homeScore}-{match.awayScore}
            </span>
          </span>
        )}

        {locked ? (
          <div className="flex items-center gap-2">
            <span className="tabular-nums rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-sm font-semibold">
              {match.predHome ?? "–"} : {match.predAway ?? "–"}
            </span>
            {match.points !== null ? (
              <Badge tone="primary">{match.points} pt</Badge>
            ) : (
              <Badge tone="neutral">Bloccato</Badge>
            )}
          </div>
        ) : (
          <form action={action} className="flex items-center gap-2">
            <input type="hidden" name="matchId" value={match.id} />
            <input
              type="number"
              name="predHome"
              inputMode="numeric"
              min={0}
              max={99}
              defaultValue={match.predHome ?? ""}
              aria-label={`Gol ${match.homeName}`}
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
              aria-label={`Gol ${match.awayName}`}
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
