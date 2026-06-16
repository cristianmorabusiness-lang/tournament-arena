"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signout } from "@/lib/actions/auth";
import { Button } from "@/components/ui/Button";

type NavItem = { href: string; label: string; icon: React.ReactNode };

const ICON = "size-5 shrink-0";

const NAV: NavItem[] = [
  {
    href: "/dashboard",
    label: "Home",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={ICON} aria-hidden>
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 9.5V21h14V9.5" />
      </svg>
    ),
  },
  {
    href: "/matches",
    label: "Pronostici",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={ICON} aria-hidden>
        <path d="M4 7h16v4a2 2 0 0 0 0 4v2H4v-2a2 2 0 0 0 0-4z" />
        <path d="M14 7v10" strokeDasharray="2 2" />
      </svg>
    ),
  },
  {
    href: "/leagues",
    label: "Leghe",
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
    label: "Classifica",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={ICON} aria-hidden>
        <path d="M6 4h12v4a6 6 0 0 1-12 0z" />
        <path d="M6 6H4v2a3 3 0 0 0 2 2.8M18 6h2v2a3 3 0 0 1-2 2.8" />
        <path d="M9 18h6M10 14h4l.5 4h-5z" />
      </svg>
    ),
  },
];

function isActive(pathname: string, href: string): boolean {
  return href === "/dashboard"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

export function AppHeader({ username }: { username?: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close on Escape and lock scroll while the drawer is open. Navigation closes
  // it via each link's onClick (see below), so no pathname effect is needed.
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
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
        <Link href="/dashboard" className="text-lg font-bold tracking-tight">
          Tournament <span className="text-primary">Arena</span>
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
                {item.label}
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
          <form action={signout} className="hidden sm:block">
            <Button variant="secondary" className="h-9 px-3 text-xs">
              Esci
            </Button>
          </form>

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Apri menu"
            aria-expanded={open}
            className="-mr-1 inline-flex size-11 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-surface-2 sm:hidden"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="size-6" aria-hidden>
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <div
        className={`fixed inset-0 z-50 sm:hidden ${open ? "" : "pointer-events-none"}`}
        aria-hidden={!open}
      >
        {/* Scrim */}
        <div
          onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-black/50 transition-opacity duration-200 motion-reduce:transition-none ${
            open ? "opacity-100" : "opacity-0"
          }`}
        />
        {/* Panel */}
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Menu di navigazione"
          className={`absolute right-0 top-0 flex h-full w-72 max-w-[80%] flex-col border-l border-border bg-surface shadow-xl transition-transform duration-200 ease-out motion-reduce:transition-none ${
            open ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-medium text-muted-foreground">
              {username ? `@${username}` : "Menu"}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Chiudi menu"
              className="inline-flex size-10 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-surface-2"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="size-5" aria-hidden>
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>

          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
            {NAV.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-surface-2"
                  }`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Logout — kept separate from navigation, at the bottom */}
          <div className="border-t border-border p-3">
            <form action={signout}>
              <Button variant="danger" className="h-11 w-full">
                Esci
              </Button>
            </form>
          </div>
        </div>
      </div>
    </header>
  );
}
