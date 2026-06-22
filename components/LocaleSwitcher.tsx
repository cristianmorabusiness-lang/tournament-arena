"use client";

import { useTransition } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { locales, localeNames, type Locale } from "@/i18n/config";
import { setLocale } from "@/lib/actions/locale";

/**
 * Language picker. Writes the choice to a cookie via a server action, then
 * refreshes so every server component re-renders in the new locale.
 */
export function LocaleSwitcher({ className = "" }: { className?: string }) {
  const active = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onChange(next: string) {
    startTransition(async () => {
      await setLocale(next as Locale);
      router.refresh();
    });
  }

  return (
    <label className={`relative inline-flex items-center ${className}`}>
      <span className="sr-only">Lingua</span>
      <svg
        viewBox="0 0 24 24"
        width={15}
        height={15}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        className="pointer-events-none absolute left-2.5 text-muted-foreground"
        aria-hidden
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
      </svg>
      <select
        value={active}
        disabled={pending}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Lingua"
        className="h-9 cursor-pointer appearance-none rounded-lg border border-border bg-surface pl-8 pr-7 text-sm font-medium outline-none transition-colors hover:bg-surface-2 focus:border-primary disabled:opacity-60"
      >
        {locales.map((l) => (
          <option key={l} value={l}>
            {localeNames[l]}
          </option>
        ))}
      </select>
      <svg
        viewBox="0 0 24 24"
        width={14}
        height={14}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        className="pointer-events-none absolute right-2 text-muted-foreground"
        aria-hidden
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </label>
  );
}
