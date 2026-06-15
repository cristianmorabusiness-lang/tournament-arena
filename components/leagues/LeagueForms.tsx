"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { createLeague, requestJoin, type LeagueState } from "@/lib/actions/leagues";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Attendi…" : label}
    </Button>
  );
}

export function LeagueForms() {
  const [createState, createAction] = useActionState<LeagueState, FormData>(
    createLeague,
    undefined,
  );
  const [joinState, joinAction] = useActionState<LeagueState, FormData>(
    requestJoin,
    undefined,
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card>
        <h2 className="font-semibold">Crea una lega</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Diventi admin e ricevi un codice da condividere.
        </p>
        <form action={createAction} className="mt-4 flex flex-col gap-3">
          {createState?.error && <Alert variant="error">{createState.error}</Alert>}
          <Field
            label="Nome della lega"
            name="name"
            type="text"
            required
            placeholder="Es. Amici del Bar"
          />
          <Submit label="Crea lega" />
        </form>
      </Card>

      <Card>
        <h2 className="font-semibold">Unisciti a una lega</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Inserisci il codice ricevuto dall&apos;admin.
        </p>
        <form action={joinAction} className="mt-4 flex flex-col gap-3">
          {joinState?.error && <Alert variant="error">{joinState.error}</Alert>}
          {joinState?.message && <Alert variant="success">{joinState.message}</Alert>}
          <Field
            label="Codice lega"
            name="code"
            type="text"
            required
            placeholder="ABC123"
            className="uppercase"
          />
          <Submit label="Invia richiesta" />
        </form>
      </Card>
    </div>
  );
}
