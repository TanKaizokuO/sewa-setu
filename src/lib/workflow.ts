import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db, applications, documents, events, notifications, type Bilingual, type ApplicationStatus } from "@/db";
import { chat } from "./ai";
import { getService, DOC_TYPES } from "./services";
import { aggregate } from "./verify";

export async function addEvent(
  applicationId: number,
  e: { kind: string; actor: string; actorName?: string; message: Bilingual; detail?: Record<string, unknown> },
) {
  await db.insert(events).values({ applicationId, ...e });
}

export async function notify(citizenId: number | null, applicationId: number, title: Bilingual, body: Bilingual) {
  if (!citizenId) return;
  await db.insert(notifications).values({ citizenId, applicationId, title, body });
}

function newRef(code: string) {
  return `CG-${code}-2026-${String(Math.floor(100000 + Math.random() * 900000))}`;
}

export async function submitApplication(input: {
  citizenId: number;
  serviceSlug: string;
  form: Record<string, string>;
  documentIds: number[];
  citizenNote?: string;
}) {
  const service = getService(input.serviceSlug)!;
  const docs = input.documentIds.length
    ? await db
        .select()
        .from(documents)
        .where(and(inArray(documents.id, input.documentIds), eq(documents.citizenId, input.citizenId)))
    : [];

  const allChecks = docs.flatMap((d) => d.checks ?? []);
  const typeIssues = docs.filter((d) => d.detectedType && d.detectedType !== d.docType).length;
  const agg = aggregate(allChecks, typeIssues);

  const now = new Date();
  const [app] = await db
    .insert(applications)
    .values({
      refNo: newRef(service.code),
      serviceSlug: service.slug,
      citizenId: input.citizenId,
      applicantName: input.form.name,
      district: input.form.district,
      tehsil: input.form.tehsil,
      formData: input.form,
      status: "patwari_review",
      aiScore: agg.score,
      aiSummary: { verdict: agg.verdict, flags: agg.flags },
      officerNote: null,
      submittedAt: now,
      slaDueAt: new Date(now.getTime() + service.slaDays * 86400000),
    })
    .returning();

  if (docs.length) await db.update(documents).set({ applicationId: app.id }).where(inArray(documents.id, docs.map((d) => d.id)));

  await addEvent(app.id, {
    kind: "status",
    actor: "citizen",
    actorName: input.form.name,
    message: { en: "Application submitted online", hi: "आवेदन ऑनलाइन जमा किया गया" },
    detail: input.citizenNote ? { citizenNote: input.citizenNote } : undefined,
  });
  await addEvent(app.id, {
    kind: "ai_decision",
    actor: "ai",
    actorName: "Sewa Setu AI",
    message:
      agg.verdict === "clear"
        ? { en: `AI pre-verification passed (score ${Math.round(agg.score * 100)}%)`, hi: `एआई पूर्व-सत्यापन सफल (स्कोर ${Math.round(agg.score * 100)}%)` }
        : { en: `AI pre-verification flagged ${agg.flags.length} item(s) for officer review`, hi: `एआई पूर्व-सत्यापन ने ${agg.flags.length} बिंदु अधिकारी समीक्षा हेतु चिह्नित किए` },
    detail: { score: agg.score, verdict: agg.verdict, flags: agg.flags, documents: docs.length },
  });
  await addEvent(app.id, {
    kind: "status",
    actor: "system",
    message: { en: "Forwarded to Patwari for field report", hi: "पटवारी प्रतिवेदन हेतु अग्रेषित" },
  });
  await notify(
    input.citizenId,
    app.id,
    { en: "Application received", hi: "आवेदन प्राप्त हुआ" },
    {
      en: `${service.name.en} — ${app.refNo}. Expected by ${app.slaDueAt.toLocaleDateString("en-IN")}.`,
      hi: `${service.name.hi} — ${app.refNo}। संभावित तिथि ${app.slaDueAt.toLocaleDateString("en-IN")}।`,
    },
  );
  return app;
}

/** Draft the Patwari's verification note from the AI evidence (runs after the response is sent). */
export async function draftOfficerNote(applicationId: number) {
  const [app] = await db.select().from(applications).where(eq(applications.id, applicationId));
  if (!app) return;
  const docs = await db.select().from(documents).where(eq(documents.applicationId, applicationId));
  const service = getService(app.serviceSlug)!;
  const evidence = docs.map((d) => ({
    document: DOC_TYPES[d.docType as keyof typeof DOC_TYPES]?.label.en ?? d.docType,
    detected_as: d.detectedType,
    checks: (d.checks ?? []).map((c) => ({ field: c.label, status: c.status, confidence: c.confidence, reason: c.reason })),
    extracted: d.extracted,
  }));
  try {
    const res = await chat(
      [
        {
          role: "system",
          content:
            "You draft concise verification notes for a Patwari (village revenue officer) in Chhattisgarh. Write in Hindi (Devanagari), formal but simple, max 90 words, as 3-5 bullet points: identity match, residence, income/claim, any discrepancy with a concrete recommended action, and a final recommendation (अनुशंसा). Do not invent facts beyond the evidence.",
        },
        {
          role: "user",
          content: `Service: ${service.name.en}\nForm: ${JSON.stringify(app.formData)}\nAI verdict: ${JSON.stringify(app.aiSummary)} score ${app.aiScore}\nDocument evidence: ${JSON.stringify(evidence)}`,
        },
      ],
      { maxTokens: 500, timeoutMs: 25000 },
    );
    await db.update(applications).set({ aiNote: res.content }).where(eq(applications.id, applicationId));
    await addEvent(applicationId, {
      kind: "ai_decision",
      actor: "ai",
      actorName: "Sewa Setu AI",
      message: { en: "AI drafted the verification note for the Patwari", hi: "एआई ने पटवारी हेतु सत्यापन नोट तैयार किया" },
      detail: { model: res.model, ms: res.ms },
    });
  } catch (e) {
    console.error("[draftOfficerNote]", (e as Error).message);
  }
}

export type OfficerAction = "forward" | "correction" | "reject" | "approve" | "send_back";

const TRANSITIONS: Record<string, Partial<Record<OfficerAction, ApplicationStatus>>> = {
  patwari: { forward: "tehsildar_review", correction: "correction_needed", reject: "rejected" },
  tehsildar: { approve: "approved", reject: "rejected", send_back: "patwari_review" },
};

export async function officerAction(input: {
  applicationId: number;
  officer: { name: string; role: string };
  action: OfficerAction;
  note?: string;
}) {
  const [app] = await db.select().from(applications).where(eq(applications.id, input.applicationId));
  if (!app) throw new Error("not found");
  const expectedStatus = input.officer.role === "patwari" ? "patwari_review" : "tehsildar_review";
  if (app.status !== expectedStatus) throw new Error(`Application is ${app.status}, not at your desk`);
  const next = TRANSITIONS[input.officer.role]?.[input.action];
  if (!next) throw new Error("action not allowed");

  const service = getService(app.serviceSlug)!;
  const now = new Date();
  const patch: Partial<typeof applications.$inferInsert> = { status: next };
  if (input.note) patch.officerNote = input.note;
  if (next === "approved" || next === "rejected") patch.decidedAt = now;
  if (next === "approved") patch.certificateNo = `CERT-${service.code}-${now.getTime().toString(36).toUpperCase()}`;
  await db.update(applications).set(patch).where(eq(applications.id, app.id));

  const role = input.officer.role === "patwari" ? { en: "Patwari", hi: "पटवारी" } : { en: "Tehsildar", hi: "तहसीलदार" };
  const msg: Record<OfficerAction, Bilingual> = {
    forward: { en: `${role.en} verified and forwarded to Tehsildar`, hi: `${role.hi} ने सत्यापन कर तहसीलदार को अग्रेषित किया` },
    correction: { en: `${role.en} requested a correction`, hi: `${role.hi} ने सुधार का अनुरोध किया` },
    reject: { en: `Rejected by ${role.en}`, hi: `${role.hi} द्वारा अस्वीकृत` },
    approve: { en: "Approved — e-certificate issued", hi: "स्वीकृत — ई-प्रमाण पत्र जारी" },
    send_back: { en: "Sent back to Patwari for re-verification", hi: "पुनः सत्यापन हेतु पटवारी को वापस भेजा गया" },
  };
  await addEvent(app.id, {
    kind: "status",
    actor: input.officer.role,
    actorName: input.officer.name,
    message: msg[input.action],
    detail: input.note ? { note: input.note } : undefined,
  });

  const citizenMsg: Partial<Record<OfficerAction, [Bilingual, Bilingual]>> = {
    forward: [
      { en: "Verification complete", hi: "सत्यापन पूर्ण" },
      { en: `Patwari has verified your ${service.name.en}. Now with the Tehsildar.`, hi: `पटवारी ने आपके ${service.name.hi} का सत्यापन कर दिया है। अब तहसीलदार के पास।` },
    ],
    approve: [
      { en: "🎉 Certificate ready!", hi: "🎉 प्रमाण पत्र तैयार!" },
      { en: `Your ${service.name.en} is approved. Download it now.`, hi: `आपका ${service.name.hi} स्वीकृत हो गया है। अभी डाउनलोड करें।` },
    ],
    correction: [
      { en: "Action needed on your application", hi: "आपके आवेदन पर कार्रवाई आवश्यक" },
      { en: input.note ?? "The officer requested a correction.", hi: input.note ?? "अधिकारी ने सुधार का अनुरोध किया है।" },
    ],
    reject: [
      { en: "Application rejected", hi: "आवेदन अस्वीकृत" },
      { en: input.note ?? "See the reason in your application.", hi: input.note ?? "कारण आवेदन में देखें।" },
    ],
  };
  const cm = citizenMsg[input.action];
  if (cm) await notify(app.citizenId, app.id, cm[0], cm[1]);
  return next;
}

/** Officer overrides an AI verification check — recorded in the audit trail and re-scored. */
export async function overrideCheck(input: {
  documentId: number;
  field: string;
  to: "match" | "mismatch";
  note: string;
  officer: { name: string; role: string };
}) {
  const [doc] = await db.select().from(documents).where(eq(documents.id, input.documentId));
  if (!doc?.applicationId) throw new Error("document not found");
  const checks = (doc.checks ?? []).map((c) =>
    c.field === input.field
      ? { ...c, overridden: { by: `${input.officer.name} (${input.officer.role})`, to: input.to, note: input.note, at: new Date().toISOString() } }
      : c,
  );
  await db.update(documents).set({ checks }).where(eq(documents.id, doc.id));

  const allDocs = await db.select().from(documents).where(eq(documents.applicationId, doc.applicationId));
  const agg = aggregate(allDocs.flatMap((d) => d.checks ?? []), allDocs.filter((d) => d.detectedType && d.detectedType !== d.docType).length);
  await db.update(applications).set({ aiScore: agg.score, aiSummary: { verdict: agg.verdict, flags: agg.flags } }).where(eq(applications.id, doc.applicationId));
  const before = doc.checks?.find((c) => c.field === input.field)?.status;
  await addEvent(doc.applicationId, {
    kind: "override",
    actor: input.officer.role,
    actorName: input.officer.name,
    message: {
      en: `Officer overrode AI check "${input.field}": ${before} → ${input.to}`,
      hi: `अधिकारी ने एआई जांच "${input.field}" बदली: ${before} → ${input.to}`,
    },
    detail: { note: input.note, documentId: doc.id, newScore: agg.score },
  });
  return agg;
}
