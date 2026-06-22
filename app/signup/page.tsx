import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AuthForm } from "@/components/auth/AuthForm";
import { Card } from "@/components/ui/Card";
import { signup } from "@/lib/actions/auth";

export default async function SignupPage() {
  const t = await getTranslations("auth");
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-center text-2xl font-bold">{t("signupTitle")}</h1>
        <p className="mb-6 text-center text-sm text-muted-foreground">
          {t("signupSubtitle")}
        </p>
        <Card>
          <AuthForm mode="signup" action={signup} />
        </Card>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          {t("haveAccount")}{" "}
          <Link href="/login" className="font-medium text-primary">
            {t("login")}
          </Link>
        </p>
      </div>
    </main>
  );
}
