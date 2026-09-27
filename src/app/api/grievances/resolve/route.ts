import { eq } from "drizzle-orm";
import { db, grievances } from "@/db";
import { currentOfficer } from "@/lib/session";

export async function POST(req: Request) {
  if (!(await currentOfficer())) return Response.json({ error: "officer login required" }, { status: 401 });
  const { id } = (await req.json()) as { id: number };
  await db.update(grievances).set({ status: "resolved", resolvedAt: new Date() }).where(eq(grievances.id, id));
  return Response.json({ ok: true });
}
