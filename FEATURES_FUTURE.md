# Tournament Arena — Feature implementabili in futuro

Raccolta di funzionalità valutate ma volutamente **non** implementate nello scope attuale,
con la decisione presa e come realizzarle in seguito.

## Classifica globale — variante "include bonus lega"
- **Stato attuale:** la classifica globale somma solo i **punti puri dei pronostici**
  (`predictions.points`) di ogni utente su tutte le partite concluse. Il bonus giornata
  resta interno alla singola lega.
- **Variante alternativa:** includere anche i bonus giornata di tutte le leghe nel totale globale.
- **Perché è stata scartata (per ora):** un utente iscritto a più leghe accumulerebbe più
  bonus, rendendo il confronto globale meno equo/coerente.
- **Come implementarla:** nel job giornaliero, calcolare `global_scores.total_points` come
  `SUM(predictions.points) + SUM(daily_scores.bonus_points)` per utente (invece dei soli
  punti pronostico). Mantenere comunque l'idempotenza tramite UPSERT.

## Pronostici basati sui giocatori (rose)
- Le rose (`players`) vengono già sincronizzate dall'API per abilitare feature future
  (es. marcatori, MVP) non incluse nello scope corrente.
