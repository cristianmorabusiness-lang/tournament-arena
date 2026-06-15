import { redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { PendingRequests } from "@/components/leagues/PendingRequests";
import { createClient } from "@/lib/supabase/server";
import type { League, MemberRole, MemberStatus } from "@/lib/types";

type MemberRow = {
  id: string;
  user_id: string;
  role: MemberRole;
  status: MemberStatus;
  profiles: { username: string } | null;
};

export default async function LeagueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: league } = await supabase
    .from("leagues")
    .select("*")
    .eq("id", id)
    .maybeSingle<League>();

  // RLS hides leagues from non-approved users → treat as pending/not allowed.
  if (!league) {
    return (
      <Alert variant="info">
        Non hai ancora accesso a questa lega. Se hai inviato una richiesta, attendi
        l&apos;approvazione dell&apos;admin.
      </Alert>
    );
  }

  const isAdmin = league.admin_id === user.id;

  const { data: memberData } = await supabase
    .from("league_members")
    .select("id, user_id, role, status, profiles(username)")
    .eq("league_id", id)
    .order("created_at", { ascending: true });
  const members = (memberData ?? []) as unknown as MemberRow[];
  const approved = members.filter((m) => m.status === "approved");
  const pending = members
    .filter((m) => m.status === "pending")
    .map((m) => ({ id: m.id, username: m.profiles?.username ?? "utente" }));

  // Standings: sum of daily total_points per member within this league.
  const usernameByUser = new Map(
    approved.map((m) => [m.user_id, m.profiles?.username ?? "utente"]),
  );
  const { data: scoreData } = await supabase
    .from("daily_scores")
    .select("user_id, total_points")
    .eq("league_id", id);
  const totals = new Map<string, number>();
  for (const row of scoreData ?? []) {
    totals.set(row.user_id, (totals.get(row.user_id) ?? 0) + row.total_points);
  }
  const standings = approved
    .map((m) => ({
      userId: m.user_id,
      username: usernameByUser.get(m.user_id) ?? "utente",
      points: totals.get(m.user_id) ?? 0,
    }))
    .sort((a, b) => b.points - a.points);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{league.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Codice lega:{" "}
            <span className="font-semibold tabular-nums text-foreground">
              {league.join_code}
            </span>
          </p>
        </div>
        {isAdmin && <Badge tone="primary">Sei l&apos;admin</Badge>}
      </div>

      {isAdmin && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">
            Richieste in attesa ({pending.length})
          </h2>
          <PendingRequests leagueId={league.id} members={pending} />
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold">Classifica della lega</h2>
        <Card className="p-0">
          <ul className="divide-y divide-border">
            {standings.map((s, i) => (
              <li
                key={s.userId}
                className={`flex items-center justify-between px-5 py-3 ${
                  s.userId === user.id ? "bg-primary/10" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="tabular-nums w-6 text-right text-sm text-muted-foreground">
                    {i + 1}
                  </span>
                  <span className="font-medium">@{s.username}</span>
                </div>
                <span className="tabular-nums font-semibold">{s.points} pt</span>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">
          Membri ({approved.length})
        </h2>
        <Card className="p-0">
          <ul className="divide-y divide-border">
            {approved.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between px-5 py-3"
              >
                <span className="font-medium">
                  @{m.profiles?.username ?? "utente"}
                </span>
                {m.role === "admin" && <Badge tone="primary">Admin</Badge>}
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </div>
  );
}
