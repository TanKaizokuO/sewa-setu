import { eq } from "drizzle-orm";
import { db, notifications } from "@/db";
import { currentCitizen } from "@/lib/session";

export async function POST() {
  const citizen = await currentCitizen();
  if (!citizen) return Response.json({ error: "login required" }, { status: 401 });
  await db.update(notifications).set({ read: true }).where(eq(notifications.citizenId, citizen.id));
  return Response.json({ ok: true });
}
