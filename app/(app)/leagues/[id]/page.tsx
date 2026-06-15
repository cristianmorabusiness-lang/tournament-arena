import { redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
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
