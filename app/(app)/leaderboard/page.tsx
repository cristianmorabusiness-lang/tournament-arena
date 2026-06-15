import { redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { createClient } from "@/lib/supabase/server";

type Row = {
  total_points: number;
  profiles: { id: string; username: string } | null;
};

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("global_scores")
    .select("total_points, profiles(id, username)")
    .order("total_points", { ascending: false });
  const rows = (data ?? []) as unknown as Row[];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold">Classifica globale</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tutti i giocatori registrati, per punti totali da pronostico.
        </p>
      </div>

      {rows.length === 0 ? (
        <Alert variant="info">
          La classifica è vuota: i punteggi vengono calcolati a partita conclusa.
        </Alert>
      ) : (
        <Card className="p-0">
          <ul className="divide-y divide-border">
            {rows.map((r, i) => {
              const isMe = r.profiles?.id === user.id;
              return (
                <li
                  key={r.profiles?.id ?? i}
                  className={`flex items-center justify-between px-5 py-3 ${
                    isMe ? "bg-primary/10" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="tabular-nums w-6 text-right text-sm text-muted-foreground">
                      {i + 1}
                    </span>
                    <span className="font-medium">
                      @{r.profiles?.username ?? "utente"}
                      {isMe && (
                        <span className="ml-2 text-xs text-primary">(tu)</span>
                      )}
                    </span>
                  </div>
                  <span className="tabular-nums font-semibold">
                    {r.total_points} pt
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
