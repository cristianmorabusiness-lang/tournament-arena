"use client";

import { useEffect, useState } from "react";

/**
 * Renders a timestamp in the visitor's own time zone — no geolocation prompt
 * needed, the browser already knows its zone. Match kickoffs are stored as UTC
 * instants; here we localize them to whoever is looking.
 *
 * Hydration-safe: the first render (on the server and during hydration) formats
 * in UTC so the markup matches, then a mount effect re-renders in the browser's
 * actual zone. `suppressHydrationWarning` covers the brief swap.
 */
function useLocalZone(): string | undefined {
  // "UTC" until mounted, then `undefined` → the runtime's local zone.
  const [tz, setTz] = useState<string | undefined>("UTC");
  useEffect(() => setTz(undefined), []);
  return tz;
}

const TIME_OPTS: Intl.DateTimeFormatOptions = {
  hour: "2-digit",
  minute: "2-digit",
};

const DATETIME_OPTS: Intl.DateTimeFormatOptions = {
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
};

/** Kickoff time (HH:MM) in the visitor's time zone. */
export function LocalTime({
  iso,
  locale = "it-IT",
  className,
}: {
  iso: string;
  locale?: string;
  className?: string;
}) {
  const timeZone = useLocalZone();
  return (
    <time dateTime={iso} className={className} suppressHydrationWarning>
      {new Date(iso).toLocaleTimeString(locale, { ...TIME_OPTS, timeZone })}
    </time>
  );
}

/** Full weekday + date + time in the visitor's time zone. */
export function LocalDateTime({
  iso,
  locale = "it-IT",
  className,
}: {
  iso: string;
  locale?: string;
  className?: string;
}) {
  const timeZone = useLocalZone();
  return (
    <time dateTime={iso} className={className} suppressHydrationWarning>
      {new Date(iso).toLocaleString(locale, { ...DATETIME_OPTS, timeZone })}
    </time>
  );
}
