"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { updateMemberStatus, type MemberActionState } from "@/lib/actions/members";

export type PendingMember = {
  id: string;
  username: string;
};

function ActionButton({
  status,
  label,
  variant,
}: {
  status: "approved" | "rejected";
  label: string;
  variant: "primary" | "danger";
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      name="status"
      value={status}
      variant={variant}
      disabled={pending}
      className="h-9 px-3 text-xs"
    >
      {label}
    </Button>
  );
}

export function PendingRequests({
  leagueId,
  members,
}: {
  leagueId: string;
  members: PendingMember[];
}) {
  const [state, action] = useActionState<MemberActionState, FormData>(
    updateMemberStatus,
    undefined,
  );

  if (members.length === 0) {
    return (
      <Card>
        <p className="text-sm text-muted-foreground">
          Nessuna richiesta in attesa.
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {state?.error && <Alert variant="error">{state.error}</Alert>}
      <Card className="p-0">
        <ul className="divide-y divide-border">
          {members.map((m) => (
            <li key={m.id} className="flex items-center justify-between px-5 py-3">
              <span className="font-medium">@{m.username}</span>
              <form action={action} className="flex gap-2">
                <input type="hidden" name="memberId" value={m.id} />
                <input type="hidden" name="leagueId" value={leagueId} />
                <ActionButton status="approved" label="Approva" variant="primary" />
                <ActionButton status="rejected" label="Rifiuta" variant="danger" />
              </form>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
