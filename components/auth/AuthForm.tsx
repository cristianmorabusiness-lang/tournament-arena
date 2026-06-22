"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import type { AuthState } from "@/lib/actions/auth";

type Action = (state: AuthState, formData: FormData) => Promise<AuthState>;

function SubmitButton({ label, waitLabel }: { label: string; waitLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? waitLabel : label}
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
  const t = useTranslations("auth");
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
          label={t("username")}
          name="username"
          type="text"
          autoComplete="username"
          required
          placeholder={t("usernamePlaceholder")}
          hint={t("usernameHint")}
        />
      )}

      <Field
        label={t("email")}
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        placeholder={t("emailPlaceholder")}
      />

      <Field
        label={t("password")}
        name="password"
        type="password"
        autoComplete={isSignup ? "new-password" : "current-password"}
        required
        placeholder="••••••••"
        hint={isSignup ? t("passwordHint") : undefined}
      />

      <SubmitButton
        label={isSignup ? t("createAccount") : t("signIn")}
        waitLabel={t("wait")}
      />
    </form>
  );
}
