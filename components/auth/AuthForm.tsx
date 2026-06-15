"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import type { AuthState } from "@/lib/actions/auth";

type Action = (state: AuthState, formData: FormData) => Promise<AuthState>;

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Attendi…" : label}
    </Button>
  );
}

export function AuthForm({
  mode,
  action,
}: {
  mode: "login" | "signup";
  action: Action;
}) {
  const [state, formAction] = useActionState<AuthState, FormData>(
    action,
    undefined,
  );
  const isSignup = mode === "signup";

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state?.error && <Alert variant="error">{state.error}</Alert>}

      {isSignup && (
        <Field
          label="Username"
          name="username"
          type="text"
          autoComplete="username"
          required
          placeholder="il_tuo_nome"
          hint="3-24 caratteri: lettere, numeri, underscore."
        />
      )}

      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        placeholder="tu@esempio.com"
      />

      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete={isSignup ? "new-password" : "current-password"}
        required
        placeholder="••••••••"
        hint={isSignup ? "Almeno 8 caratteri." : undefined}
      />

      <SubmitButton label={isSignup ? "Crea account" : "Accedi"} />
    </form>
  );
}
