import "server-only";
import { serverEnv } from "@/lib/env";

/**
 * Authorizes cron-triggered endpoints. Vercel Cron sends the configured
 * CRON_SECRET as `Authorization: Bearer <secret>`.
 *
 * - If CRON_SECRET is set, the header must match.
 * - If it is not set, requests are allowed only outside production (local dev).
 */
export function isCronAuthorized(request: Request): boolean {
  const secret = serverEnv.cronSecret;
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }
  return request.headers.get("authorization") === `Bearer ${secret}`;
}
