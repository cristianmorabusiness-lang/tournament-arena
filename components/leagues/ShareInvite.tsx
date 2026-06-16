"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function ShareInvite({
  code,
  leagueName,
}: {
  code: string;
  leagueName: string;
}) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url =
      typeof window !== "undefined" ? `${window.location.origin}/leagues` : "";
    const text = `Unisciti alla mia lega «${leagueName}» su Tournament Arena! Inserisci il codice ${code} nella sezione Leghe.`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "Tournament Arena", text, url });
        return;
      } catch {
        // user cancelled or share failed — fall through to copy
      }
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Button
      type="button"
      variant="secondary"
      onClick={share}
      className="h-9 gap-2 px-3 text-xs"
    >
      <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <path d="m8.6 13.5 6.8 4M15.4 6.5 8.6 10.5" />
      </svg>
      {copied ? "Copiato!" : "Invita"}
    </Button>
  );
}
