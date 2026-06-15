import Link from "next/link";
import { redirect } from "next/navigation";
import { LeagueForms } from "@/components/leagues/LeagueForms";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { createClient } from "@/lib/supabase/server";
import type { League, MemberRole, MemberStatus } from "@/lib/types";

type MembershipRow = {
  role: MemberRole;
  status: MemberStatus;
  leagues: League | null;
};

const STATUS_TONE = {
  approved: "success",
  pending: "warning",
  rejected: "danger",
} as const;

const STATUS_LABEL = {
  approved: "Approvato",
  pending: "In attesa",
  rejected: "Rifiutato",
} as const;

export default async function LeaguesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("league_members")
    .select("role, status, leagues(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const memberships = (data ?? []) as unknown as MembershipRow[];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold">Le tue leghe</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Crea una lega o richiedi di unirti a una esistente.
        </p>
      </div>

      <LeagueForms />

      <section>
        <h2 className="mb-3 text-lg font-semibold">Iscrizioni</h2>
        {memberships.length === 0 ? (
          <Card>
            <p className="text-sm text-muted-foreground">
              Non fai ancora parte di nessuna lega.
            </p>
          </Card>
        ) : (
          <ul className="flex flex-col gap-3">
            {memberships.map((m) =>
              m.leagues ? (
                <li key={m.leagues.id}>
                  <Link href={`/leagues/${m.leagues.id}`}>
                    <Card className="flex items-center justify-between transition-colors hover:bg-surface-2">
                      <div>
                        <p className="font-semibold">{m.leagues.name}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {m.role === "admin" ? "Admin" : "Membro"} · codice{" "}
                          <span className="tabular-nums">{m.leagues.join_code}</span>
                        </p>
                      </div>
                      <Badge tone={STATUS_TONE[m.status]}>
                        {STATUS_LABEL[m.status]}
                      </Badge>
                    </Card>
                  </Link>
                </li>
              ) : null,
            )}
          </ul>
        )}
      </section>
    </div>
  );
}
