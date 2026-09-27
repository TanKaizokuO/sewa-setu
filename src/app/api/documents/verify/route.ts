import { db, documents, type QualityReport } from "@/db";
import { currentCitizen } from "@/lib/session";
import { getService, type DocType } from "@/lib/services";
import { verifyDocument } from "@/lib/verify";

export const maxDuration = 90; // 3 parallel OCR reads + primary model + fallback model

export async function POST(req: Request) {
  const citizen = await currentCitizen();
  if (!citizen) return Response.json({ error: "login required" }, { status: 401 });

  const body = (await req.json()) as {
    serviceSlug: string;
    docType: DocType;
    image: string;
    sha256: string;
    quality: QualityReport;
    form: Record<string, string>;
    clientOcrText?: string;
  };
  const service = getService(body.serviceSlug);
  const requirement = service?.documents.find((d) => d.type === body.docType);
  if (!service || !requirement) return Response.json({ error: "unknown document" }, { status: 400 });
  if (!body.image.startsWith("data:image/") || body.image.length > 4_000_000)
    return Response.json({ error: "invalid image" }, { status: 400 });

  try {
    const result = await verifyDocument({
      image: body.image,
      sha256: body.sha256,
      expectedType: body.docType,
      requirement,
      form: body.form,
      clientOcrText: body.clientOcrText,
    });
    const [doc] = await db
      .insert(documents)
      .values({
        citizenId: citizen.id,
        docType: body.docType,
        detectedType: result.detectedType,
        image: body.image,
        sha256: body.sha256,
        quality: body.quality,
        ocrText: result.ocrText,
        ocrBlocks: result.ocrBlocks,
        ocrEngine: result.ocrEngine,
        extracted: result.extracted,
        checks: result.checks,
        cached: result.cached,
      })
      .returning({ id: documents.id });
    return Response.json({ documentId: doc.id, ...result });
  } catch (e) {
    // Live OCR and cache both unavailable: ask the browser to run on-device OCR and retry.
    console.error("[documents/verify]", (e as Error).message);
    if (!body.clientOcrText) return Response.json({ needsClientOcr: true }, { status: 503 });
    return Response.json({ error: "verification unavailable" }, { status: 503 });
  }
}
