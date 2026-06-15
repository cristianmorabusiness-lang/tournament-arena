import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cronAuth";
import { runScoring } from "@/lib/scoreJob";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function handle(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await runScoring();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Scoring failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
