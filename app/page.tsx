import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";

export default async function Home() {
  const t = await getTranslations("landing");
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="absolute right-4 top-4">
        <LocaleSwitcher />
      </div>
      <div className="w-full max-w-2xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-1.5 text-sm font-medium text-secondary">
          <span className="size-2 rounded-full bg-secondary" />
          {t("badge")}
        </span>

        <h1 className="mt-8 text-4xl font-bold tracking-tight sm:text-6xl">
          <span className="text-primary [text-shadow:0_0_18px_rgba(217,119,6,0.45)]">
            Arena
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-md text-lg leading-8 text-muted-foreground">
          {t("description")}
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/signup"
            className="flex h-12 w-full items-center justify-center rounded-xl bg-primary px-6 font-semibold text-on-primary transition-colors hover:bg-primary-hover sm:w-auto"
          >
            {t("start")}
          </Link>
          <Link
            href="/login"
            className="flex h-12 w-full items-center justify-center rounded-xl border border-border bg-surface px-6 font-semibold transition-colors hover:bg-surface-2 sm:w-auto"
          >
            {t("login")}
          </Link>
        </div>
      </div>
    </main>
  );
}
