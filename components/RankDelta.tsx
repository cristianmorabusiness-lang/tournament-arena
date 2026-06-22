/**
 * Position-change indicator shown next to a player in a standings list.
 * `delta` = previous_rank - rank, so a positive value means the player climbed
 * (green ▲ +N) and a negative value means they dropped (red ▼ -N). A null or
 * zero delta renders nothing. Colour is paired with an arrow + sign so the
 * meaning never relies on colour alone.
 */
"use client";

import { useTranslations } from "next-intl";

export function RankDelta({ delta }: { delta: number | null | undefined }) {
  const t = useTranslations("common");
  if (!delta) return null;

  const up = delta > 0;
  const label = up
    ? t("rankUp", { n: delta })
    : t("rankDown", { n: Math.abs(delta) });

  return (
    <span
      title={label}
      aria-label={label}
      className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-bold tabular-nums ${
        up ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
      }`}
    >
      <svg
        viewBox="0 0 12 12"
        width={10}
        height={10}
        fill="currentColor"
        aria-hidden
        className={up ? "" : "rotate-180"}
      >
        <path d="M6 2 1.5 8.5h9z" />
      </svg>
      {up ? `+${delta}` : delta}
    </span>
  );
}
