import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cronAuth";
import { syncAll } from "@/lib/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function handle(request: Request) {
  if (!isCronAuthorized(request)) {
    // Temporary diagnostic (no secret values exposed, only booleans/lengths).
    const auth = request.headers.get("authorization") ?? "";
    return NextResponse.json(
      {
        error: "Unauthorized",
        debug: {
          secretConfigured: Boolean(process.env.CRON_SECRET),
          expectedSecretLen: (process.env.CRON_SECRET ?? "").length,
          authHeaderPresent: auth.startsWith("Bearer "),
          receivedSecretLen: auth.replace(/^Bearer /, "").length,
        },
      },
      { status: 401 },
    );
  }
  try {
    const result = await syncAll();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

// Vercel Cron issues GET requests; POST allowed for manual triggers.
export const GET = handle;
export const POST = handle;
