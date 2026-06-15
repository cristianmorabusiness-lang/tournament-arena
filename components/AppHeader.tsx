import Link from "next/link";
import { signout } from "@/lib/actions/auth";
import { Button } from "@/components/ui/Button";

const NAV = [
  { href: "/dashboard", label: "Home" },
  { href: "/matches", label: "Pronostici" },
  { href: "/leagues", label: "Leghe" },
  { href: "/leaderboard", label: "Classifica" },
];

export function AppHeader({ username }: { username?: string }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
        <Link href="/dashboard" className="text-lg font-bold tracking-tight">
          Tournament <span className="text-primary">Arena</span>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {username && (
            <span className="hidden text-sm text-muted-foreground sm:inline">
              @{username}
            </span>
          )}
          <form action={signout}>
            <Button variant="secondary" className="h-9 px-3 text-xs">
              Esci
            </Button>
          </form>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-border bg-background/95 py-1.5 backdrop-blur sm:hidden">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex-1 rounded-lg px-2 py-1.5 text-center text-xs font-medium text-muted-foreground"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
