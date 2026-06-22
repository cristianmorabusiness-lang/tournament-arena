"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { createLeague, requestJoin, type LeagueState } from "@/lib/actions/leagues";

function Submit({ label, waitLabel }: { label: string; waitLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? waitLabel : label}
    </Button>
  );
}

export function LeagueForms() {
  const t = useTranslations("leagues");
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
        <h2 className="font-semibold">{t("createTitle")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("createDesc")}</p>
        <form action={createAction} className="mt-4 flex flex-col gap-3">
          {createState?.error && <Alert variant="error">{createState.error}</Alert>}
          <Field
            label={t("leagueName")}
            name="name"
            type="text"
            required
            placeholder={t("leagueNamePlaceholder")}
          />
          <Submit label={t("createButton")} waitLabel={t("wait")} />
        </form>
      </Card>

      <Card>
        <h2 className="font-semibold">{t("joinTitle")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("joinDesc")}</p>
        <form action={joinAction} className="mt-4 flex flex-col gap-3">
          {joinState?.error && <Alert variant="error">{joinState.error}</Alert>}
          {joinState?.message && <Alert variant="success">{joinState.message}</Alert>}
          <Field
            label={t("leagueCode")}
            name="code"
            type="text"
            required
            placeholder={t("leagueCodePlaceholder")}
            className="uppercase"
          />
          <Submit label={t("joinButton")} waitLabel={t("wait")} />
        </form>
      </Card>
    </div>
  );
}
