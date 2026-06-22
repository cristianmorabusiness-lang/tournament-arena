import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AuthForm } from "@/components/auth/AuthForm";
import { Card } from "@/components/ui/Card";
import { login } from "@/lib/actions/auth";

export default async function LoginPage() {
  const t = await getTranslations("auth");
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-center text-2xl font-bold">{t("loginTitle")}</h1>
        <p className="mb-6 text-center text-sm text-muted-foreground">
          {t("loginSubtitle")}
        </p>
        <Card>
          <AuthForm mode="login" action={login} />
        </Card>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          {t("noAccount")}{" "}
          <Link href="/signup" className="font-medium text-primary">
            {t("register")}
          </Link>
        </p>
      </div>
    </main>
  );
}
