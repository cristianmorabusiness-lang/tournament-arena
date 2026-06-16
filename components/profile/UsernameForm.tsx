"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { updateUsername, type UsernameState } from "@/lib/actions/auth";

function SaveButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled} className="h-11 px-4 text-sm">
      {pending ? "…" : "Salva"}
    </Button>
  );
}

export function UsernameForm({ current }: { current: string }) {
  const [state, action] = useActionState<UsernameState, FormData>(
    updateUsername,
    undefined,
  );
  const [value, setValue] = useState(current);

  // After a successful save the profile re-renders with the new `current`.
  const saved = state?.ok && state.username === value.trim();
  const unchanged = value.trim() === current;

  return (
    <form action={action} className="flex flex-col gap-2">
      <label htmlFor="username" className="font-medium">
        Username
      </label>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">@</span>
        <input
          id="username"
          name="username"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          minLength={3}
          maxLength={24}
          pattern="[a-zA-Z0-9_]+"
          required
          aria-label="Username"
          className="h-11 flex-1 rounded-xl border border-border bg-surface px-3.5 text-sm outline-none transition-colors focus:border-primary"
        />
        <SaveButton disabled={unchanged} />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {saved && <p className="text-sm text-success">Username aggiornato ✓</p>}
      <p className="text-xs text-muted-foreground">
        3–24 caratteri: lettere, numeri e underscore. Dev&apos;essere unico.
      </p>
    </form>
  );
}
