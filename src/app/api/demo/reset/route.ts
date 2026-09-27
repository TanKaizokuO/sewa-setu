import { db } from "@/db";
import { runSeed } from "@/db/seed";
import { setSession } from "@/lib/session";

// Rebuild the demo world (used between rehearsals / judging sessions).
export async function POST() {
  const r = await runSeed(db);
  await setSession(null);
  return Response.json({ ok: true, ...r });
}
