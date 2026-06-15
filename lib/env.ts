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
  /** Optional — used to authorize cron-triggered endpoints. */
  get cronSecret() {
    return process.env.CRON_SECRET;
  },
};
