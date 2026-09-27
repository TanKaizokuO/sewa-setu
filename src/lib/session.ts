import "server-only";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db, citizens, officers } from "@/db";

// Mock auth: "Login with DigiLocker (demo)" / officer login just sets a cookie.
export type Session =
  | { role: "citizen"; id: number }
  | { role: "patwari" | "tehsildar" | "admin"; id: number };

const COOKIE = "ss_session";

export async function getSession(): Promise<Session | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export async function setSession(s: Session | null) {
  const jar = await cookies();
  if (!s) jar.delete(COOKIE);
  else jar.set(COOKIE, JSON.stringify(s), { path: "/", httpOnly: true, sameSite: "lax" });
}

export async function currentCitizen() {
  const s = await getSession();
  if (!s || s.role !== "citizen") return null;
  const [c] = await db.select().from(citizens).where(eq(citizens.id, s.id));
  return c ?? null;
}

export async function currentOfficer() {
  const s = await getSession();
  if (!s || s.role === "citizen") return null;
  const [o] = await db.select().from(officers).where(eq(officers.id, s.id));
  return o ?? null;
}
