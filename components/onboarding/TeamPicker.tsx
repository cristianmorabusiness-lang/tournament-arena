"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { setFavoriteTeam, type OnboardingState } from "@/lib/actions/onboarding";
import type { Team } from "@/lib/types";

function Submit({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={disabled || pending} className="w-full sm:w-auto">
      {pending ? "Salvataggio…" : "Conferma squadra"}
    </Button>
  );
}

export function TeamPicker({ teams }: { teams: Team[] }) {
  const [state, formAction] = useActionState<OnboardingState, FormData>(
    setFavoriteTeam,
    undefined,
  );
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state?.error && <Alert variant="error">{state.error}</Alert>}
      <input type="hidden" name="teamId" value={selected ?? ""} />

      <div
        role="radiogroup"
        aria-label="Scegli la tua squadra del cuore"
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4"
      >
        {teams.map((team) => {
          const isSelected = selected === team.id;
          return (
            <button
              key={team.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => setSelected(team.id)}
              className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-colors ${
                isSelected
                  ? "border-primary bg-primary/10"
                  : "border-border bg-surface hover:bg-surface-2"
              }`}
            >
              {team.flag_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={team.flag_url}
                  alt=""
                  width={40}
                  height={40}
                  className="size-10 rounded-full object-cover"
                />
              ) : (
                <span className="flex size-10 items-center justify-center rounded-full bg-surface-2 text-sm font-semibold">
                  {team.code ?? team.name.slice(0, 3).toUpperCase()}
                </span>
              )}
              <span className="text-center text-sm font-medium">{team.name}</span>
            </button>
          );
        })}
      </div>

      <Submit disabled={!selected} />
    </form>
  );
}
