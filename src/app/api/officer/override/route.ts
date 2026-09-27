import { currentOfficer } from "@/lib/session";
import { overrideCheck } from "@/lib/workflow";

export async function POST(req: Request) {
  const officer = await currentOfficer();
  if (!officer || officer.role === "admin") return Response.json({ error: "officer login required" }, { status: 401 });
  const { documentId, field, to, note } = (await req.json()) as { documentId: number; field: string; to: "match" | "mismatch"; note: string };
  try {
    const agg = await overrideCheck({ documentId, field, to, note, officer });
    return Response.json({ ok: true, ...agg });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
