/**
 * Centralized environment access. Values are read lazily so the build does not
 * fail when variables are absent; each accessor throws a clear error if used
 * without being configured.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. See .env.example.`,
    );
  }
  return value;
}

/** Public Supabase values — safe to expose to the browser. */
export const publicEnv = {
  get supabaseUrl() {
    return required(
      "NEXT_PUBLIC_SUPABASE_URL",
      process.env.NEXT_PUBLIC_SUPABASE_URL,
    );
  },
  get supabaseAnonKey() {
    return required(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    );
  },
  /** VAPID public key for Web Push — safe to expose; empty string if unset. */
  get vapidPublicKey() {
    return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
  },
};

/** Server-only secrets. Never import this into client components. */
export const serverEnv = {
  get supabaseServiceRoleKey() {
    return required(
      "SUPABASE_SERVICE_ROLE_KEY",
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    );
  },
  get footballApiKey() {
    return required("FOOTBALL_API_KEY", process.env.FOOTBALL_API_KEY);
  },
  get footballDataApiKey() {
    return required("FOOTBALL_DATA_API_KEY", process.env.FOOTBALL_DATA_API_KEY);
  },
  /** Optional — used to authorize cron-triggered endpoints. */
  get cronSecret() {
    return process.env.CRON_SECRET;
  },
  /** Web Push (VAPID). Required only by the reminder cron. */
  get vapidPublicKey() {
    return required(
      "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    );
  },
  get vapidPrivateKey() {
    return required("VAPID_PRIVATE_KEY", process.env.VAPID_PRIVATE_KEY);
  },
  /** Contact used in the VAPID `subject` (mailto:). */
  get vapidSubject() {
    return process.env.VAPID_SUBJECT ?? "mailto:noreply@tournament-arena.app";
  },
};
