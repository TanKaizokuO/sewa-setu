import { currentOfficer } from "@/lib/session";
import { officerAction, type OfficerAction } from "@/lib/workflow";

export async function POST(req: Request) {
  const officer = await currentOfficer();
  if (!officer || officer.role === "admin") return Response.json({ error: "officer login required" }, { status: 401 });
  const { applicationId, action, note } = (await req.json()) as { applicationId: number; action: OfficerAction; note?: string };
  try {
    const status = await officerAction({ applicationId, officer, action, note });
    return Response.json({ ok: true, status });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
