import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export const metadata = { title: "Regole · Tournament Arena" };

const MATCH_RULES = [
  {
    pts: "5",
    title: "Risultato esatto",
    desc: "Indovini i gol di entrambe le squadre (es. pronostico 2-1, finisce 2-1).",
  },
  {
    pts: "2",
    title: "Segno corretto (1 / X / 2)",
    desc: "Azzecchi l'esito — vittoria casa, pareggio o vittoria ospite — ma non il punteggio esatto.",
  },
  {
    pts: "+1",
    title: "Differenza reti",
    desc: "La differenza gol del tuo pronostico coincide con quella reale (es. 2-1 vale come 3-2). Si somma al segno corretto.",
  },
];

export default function RulesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Come si guadagnano i punti</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A ogni partita conclusa il tuo pronostico viene confrontato con il
          risultato reale.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">Punti per partita</h2>
        {MATCH_RULES.map((r) => (
          <Card key={r.title} className="flex items-start gap-4 p-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-lg font-bold tabular-nums text-primary">
              {r.pts}
            </span>
            <div>
              <p className="font-semibold">{r.title}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{r.desc}</p>
            </div>
          </Card>
        ))}
        <p className="text-xs text-muted-foreground">
          Il risultato esatto vale 5 punti pieni (non si somma ad altro). Segno
          corretto e differenza reti invece si sommano: massimo 3 punti senza
          l&apos;esatto.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">Bonus di giornata (nelle leghe)</h2>
        <Card className="flex flex-col gap-3 p-4">
          <div className="flex items-center gap-3">
            <Badge tone="success">+2</Badge>
            <p className="text-sm">
              Chi totalizza <strong>meno punti</strong> nella giornata riceve un
              bonus di consolazione di 2 punti.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge tone="success">+1</Badge>
            <p className="text-sm">
              In caso di <strong>parità all&apos;ultimo posto</strong>, ogni
              giocatore a pari merito riceve 1 punto.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Il bonus viene assegnato solo quando tutte le partite della giornata
            sono concluse. Vale dentro le leghe; la classifica globale conta solo
            i punti puri da pronostico.
          </p>
        </Card>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">Quando si chiudono i pronostici</h2>
        <Card className="p-4">
          <p className="text-sm">
            Ogni partita si blocca <strong>5 minuti prima del fischio
            d&apos;inizio</strong>. Fino a quel momento puoi inserire o
            modificare liberamente il tuo pronostico; dopo non è più possibile.
          </p>
        </Card>
      </section>
    </div>
  );
}
