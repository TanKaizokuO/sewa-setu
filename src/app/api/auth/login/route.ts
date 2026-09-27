import { eq } from "drizzle-orm";
import { db, citizens, officers } from "@/db";
import { setSession } from "@/lib/session";

// Mock DigiLocker / officer SSO: log in as a seeded persona or officer role.
export async function POST(req: Request) {
  const { as } = (await req.json()) as { as: string };
  if (as === "patwari" || as === "tehsildar" || as === "admin") {
    const [o] = await db.select().from(officers).where(eq(officers.role, as));
    if (!o) return Response.json({ error: "officer not found" }, { status: 404 });
    await setSession({ role: as, id: o.id });
    return Response.json({ ok: true, home: as === "admin" ? "/analytics" : "/officer" });
  }
  const [c] = await db.select().from(citizens).where(eq(citizens.personaKey, as));
  if (!c) return Response.json({ error: "persona not found" }, { status: 404 });
  await setSession({ role: "citizen", id: c.id });
  return Response.json({ ok: true, home: "/dashboard" });
}

export async function DELETE() {
  await setSession(null);
  return Response.json({ ok: true });
}
