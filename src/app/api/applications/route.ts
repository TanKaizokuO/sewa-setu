import { after } from "next/server";
import { currentCitizen } from "@/lib/session";
import { getService } from "@/lib/services";
import { submitApplication, draftOfficerNote } from "@/lib/workflow";

export const maxDuration = 60;

export async function POST(req: Request) {
  const citizen = await currentCitizen();
  if (!citizen) return Response.json({ error: "login required" }, { status: 401 });
  const body = (await req.json()) as {
    serviceSlug: string;
    form: Record<string, string>;
    documentIds: number[];
    declaration: boolean;
    citizenNote?: string;
  };
  const service = getService(body.serviceSlug);
  if (!service?.fullFlow) return Response.json({ error: "service not available online" }, { status: 400 });
  if (!body.declaration) return Response.json({ error: "self-declaration required" }, { status: 400 });
  const missing = service.fields.filter((f) => f.required && !String(body.form[f.key] ?? "").trim());
  if (missing.length) return Response.json({ error: `Missing: ${missing.map((f) => f.label.en).join(", ")}` }, { status: 400 });

  const app = await submitApplication({ citizenId: citizen.id, ...body });
  // Draft the officer's note with the LLM without making the citizen wait
  after(() => draftOfficerNote(app.id));
  return Response.json({ refNo: app.refNo, id: app.id });
}
