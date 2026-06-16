"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { setFavoriteTeam, type OnboardingState } from "@/lib/actions/onboarding";
import { NATIONAL_TEAMS, teamByCode } from "@/lib/nationalTeams";

function Submit({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={disabled || pending} className="w-full sm:w-auto">
      {pending ? "Salvataggio…" : "Conferma nazionale"}
    </Button>
  );
}

export function TeamPicker() {
  const [state, formAction] = useActionState<OnboardingState, FormData>(
    setFavoriteTeam,
    undefined,
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const selectedTeam = teamByCode(selected);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return NATIONAL_TEAMS;
    return NATIONAL_TEAMS.filter((t) => t.name.toLowerCase().includes(q));
  }, [query]);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state?.error && <Alert variant="error">{state.error}</Alert>}
      <input type="hidden" name="country" value={selected ?? ""} />

      {/* Sticky summary so the current choice is always visible */}
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface/95 p-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <span className="text-3xl leading-none" aria-hidden>
            {selectedTeam ? selectedTeam.flag : "🏳️"}
          </span>
          <div>
            <p className="text-xs text-muted-foreground">La tua nazionale</p>
            <p className="font-semibold">
              {selectedTeam ? selectedTeam.name : "Nessuna selezione"}
            </p>
          </div>
        </div>
        <Submit disabled={!selected} />
      </div>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Cerca la tua nazionale…"
        aria-label="Cerca nazionale"
        className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/40"
      />

      <div
        role="radiogroup"
        aria-label="Scegli la tua nazionale del cuore"
        className="grid max-h-[50vh] grid-cols-2 gap-3 overflow-y-auto p-1 sm:grid-cols-3 md:grid-cols-4"
      >
        {filtered.map((team) => {
          const isSelected = selected === team.code;
          return (
            <button
              key={team.code}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => setSelected(team.code)}
              className={`relative flex flex-col items-center gap-2 rounded-xl border p-4 transition-colors ${
                isSelected
                  ? "border-primary bg-primary/20 ring-2 ring-primary"
                  : "border-border bg-surface hover:bg-surface-2"
              }`}
            >
              {isSelected && (
                <span
                  className="absolute right-2 top-2 flex size-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-on-primary"
                  aria-hidden
                >
                  ✓
                </span>
              )}
              <span className="text-3xl leading-none" aria-hidden>
                {team.flag}
              </span>
              <span
                className={`text-center text-sm ${
                  isSelected ? "font-semibold text-primary" : "font-medium"
                }`}
              >
                {team.name}
              </span>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="col-span-full py-6 text-center text-sm text-muted-foreground">
            Nessuna nazionale trovata per “{query}”.
          </p>
        )}
      </div>
    </form>
  );
}
