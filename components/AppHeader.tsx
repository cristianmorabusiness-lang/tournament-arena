"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { signout } from "@/lib/actions/auth";
import { Button } from "@/components/ui/Button";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";

type NavItem = { href: string; key: string; icon: React.ReactNode };

const ICON = "size-5 shrink-0";

const NAV: NavItem[] = [
  {
    href: "/dashboard",
    key: "home",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={ICON} aria-hidden>
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 9.5V21h14V9.5" />
      </svg>
    ),
  },
  {
    href: "/matches",
    key: "predictions",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={ICON} aria-hidden>
        <path d="M4 7h16v4a2 2 0 0 0 0 4v2H4v-2a2 2 0 0 0 0-4z" />
        <path d="M14 7v10" strokeDasharray="2 2" />
      </svg>
    ),
  },
  {
    href: "/leagues",
    key: "leagues",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={ICON} aria-hidden>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20a6 6 0 0 1 12 0" />
        <path d="M16 5.5a3 3 0 0 1 0 5M18 20a6 6 0 0 0-3-5.2" />
      </svg>
    ),
  },
  {
    href: "/leaderboard",
    key: "leaderboard",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={ICON} aria-hidden>
        <path d="M6 4h12v4a6 6 0 0 1-12 0z" />
        <path d="M6 6H4v2a3 3 0 0 0 2 2.8M18 6h2v2a3 3 0 0 1-2 2.8" />
        <path d="M9 18h6M10 14h4l.5 4h-5z" />
      </svg>
    ),
  },
  {
    href: "/profile",
    key: "profile",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={ICON} aria-hidden>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20a7 7 0 0 1 14 0" />
      </svg>
    ),
  },
  {
    href: "/rules",
    key: "rules",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={ICON} aria-hidden>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5" />
        <path d="M12 8h.01" />
      </svg>
    ),
  },
];

function isActive(pathname: string, href: string): boolean {
  return href === "/dashboard"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

const Logo = ({ className = "" }: { className?: string }) => (
  <span className={`text-lg font-bold tracking-tight ${className}`}>
    <span className="text-primary [text-shadow:0_0_18px_rgba(217,119,6,0.45)]">
      Arena
    </span>
  </span>
);

export function AppHeader({ username }: { username?: string }) {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);

  // Close on Escape and lock scroll while the full-screen menu is open.
  // Navigation closes it via each link's onClick (no pathname effect needed).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
          <Link href="/dashboard" aria-label="Arena">
            <Logo />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 sm:flex">
            {NAV.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    active
                      ? "bg-surface-2 text-foreground"
                      : "text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                  }`}
                >
                  {t(item.key)}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            {username && (
              <span className="hidden text-sm text-muted-foreground sm:inline">
                @{username}
              </span>
            )}
            <LocaleSwitcher className="hidden sm:inline-flex" />
            <form action={signout} className="hidden sm:block">
              <Button variant="secondary" className="h-9 px-3 text-xs">
                {t("signOut")}
              </Button>
            </form>

            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label={t("openMenu")}
              aria-expanded={open}
              className="-mr-1 inline-flex size-11 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-surface-2 sm:hidden"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="size-6" aria-hidden>
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Full-screen mobile menu — sibling of <header> so the header's
          backdrop-blur doesn't become its containing block. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("menu")}
        aria-hidden={!open}
        className={`fixed inset-0 z-50 flex flex-col bg-background transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none sm:hidden ${
          open
            ? "visible translate-y-0 opacity-100"
            : "invisible pointer-events-none -translate-y-1 opacity-0"
        }`}
      >
        {/* Brand glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(60%_100%_at_50%_0%,rgba(217,119,6,0.16),transparent_70%)]"
        />

        <div className="relative flex h-14 items-center justify-between border-b border-border px-4">
          <Logo />
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={t("closeMenu")}
            className="-mr-1 inline-flex size-11 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-surface-2"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="size-6" aria-hidden>
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <nav className="relative flex flex-1 flex-col gap-1.5 overflow-y-auto p-4">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-4 rounded-2xl px-4 py-4 text-base font-semibold transition-colors ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-surface-2 active:bg-surface-2"
                }`}
              >
                <span
                  className={`flex size-10 items-center justify-center rounded-xl ${
                    active ? "bg-primary/15 text-primary" : "bg-surface-2 text-muted-foreground"
                  }`}
                >
                  {item.icon}
                </span>
                {t(item.key)}
              </Link>
            );
          })}
        </nav>

        <div className="relative border-t border-border p-4">
          {username && (
            <p className="mb-3 px-1 text-sm text-muted-foreground">
              {t("connectedAs")}{" "}
              <span className="font-medium text-foreground">@{username}</span>
            </p>
          )}
          <div className="mb-3">
            <LocaleSwitcher className="w-full [&>select]:w-full" />
          </div>
          <form action={signout}>
            <Button variant="danger" className="h-12 w-full text-base">
              {t("signOut")}
            </Button>
          </form>
        </div>
      </div>
    </>
  );
}
