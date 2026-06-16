import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";

const SHORTCUTS = [
  { href: "/matches", title: "Pronostici", desc: "Inserisci i risultati delle partite" },
  { href: "/leagues", title: "Le tue leghe", desc: "Crea o unisciti a una lega" },
  { href: "/leaderboard", title: "Classifica globale", desc: "Sfida tutti i giocatori" },
];

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, favorite_country")
    .eq("id", user.id)
    .single();

  // Onboarding gate: must pick a favorite national team first.
  if (!profile?.favorite_country) redirect("/onboarding");

  return (
    <div>
      <h1 className="text-2xl font-bold">Ciao, {profile.username} 👋</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Pronto a fare i tuoi pronostici?
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {SHORTCUTS.map((s) => (
          <Link key={s.href} href={s.href}>
            <Card className="h-full transition-colors hover:bg-surface-2">
              <h2 className="font-semibold">{s.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
