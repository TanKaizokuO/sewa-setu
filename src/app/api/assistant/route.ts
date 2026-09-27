import { eq, desc } from "drizzle-orm";
import { db, applications } from "@/db";
import { chatJson } from "@/lib/ai";
import { currentCitizen } from "@/lib/session";
import { SERVICES, DOC_TYPES, checkEligibility, ageFromDob, getService, type ProfileLike } from "@/lib/services";

type Turn = { role: "user" | "assistant"; content: string };

export type AssistantReply = {
  reply: string;
  language: "hi" | "en";
  intent: "apply" | "info" | "eligibility" | "track" | "grievance" | "other";
  services: {
    slug: string;
    name: { en: string; hi: string };
    fullFlow: boolean;
    slaDays: number;
    fee: number;
    documents: { en: string; hi: string }[];
    eligibility?: { eligible: boolean; reasons: { en: string; hi: string }[] };
  }[];
  grievanceText?: string;
  trackRef?: string;
  model: string;
  ms: number;
};

const CATALOG = SERVICES.map((s) => ({
  slug: s.slug,
  name: `${s.name.en} / ${s.name.hi}`,
  dept: s.department.en,
  keywords: s.keywords.join(", "),
  eligibility: s.eligibilityText.en,
  documents: s.documents.map((d) => `${DOC_TYPES[d.type].label.en}${d.required ? "" : " (optional)"}`).join(", ") || "as per department",
  sla_days: s.slaDays,
  fee_rs: s.fee,
  online_ai_flow: s.fullFlow,
}));

export async function POST(req: Request) {
  const { messages } = (await req.json()) as { messages: Turn[] };
  const last = messages.at(-1)?.content ?? "";
  const lang: "hi" | "en" = /[ऀ-ॿ]/.test(last) ? "hi" : "en";

  const citizen = await currentCitizen();
  let profileText = "The user is not logged in (guest).";
  let profile: ProfileLike | null = null;
  if (citizen) {
    profile = citizen;
    const apps = await db
      .select({ refNo: applications.refNo, service: applications.serviceSlug, status: applications.status, submittedAt: applications.submittedAt })
      .from(applications)
      .where(eq(applications.citizenId, citizen.id))
      .orderBy(desc(applications.submittedAt));
    profileText = `Logged-in citizen (from DigiLocker): ${JSON.stringify({
      name: citizen.name,
      age: ageFromDob(citizen.dob),
      gender: citizen.gender,
      category: citizen.category,
      occupation: citizen.occupation,
      annual_income_rs: citizen.annualIncome,
      village: citizen.village,
      district: citizen.district,
    })}
Their applications: ${apps.length ? JSON.stringify(apps) : "none yet"}
Rule-engine eligibility for this citizen (AUTHORITATIVE — never contradict it):
- eligible: ${SERVICES.filter((s) => s.eligibility.length && checkEligibility(s, citizen).eligible).map((s) => s.slug).join(", ") || "none"}
- NOT eligible: ${SERVICES.filter((s) => s.eligibility.length && !checkEligibility(s, citizen).eligible).map((s) => s.slug).join(", ") || "none"}
Only suggest schemes from the eligible list when asked what they qualify for.`;
  }

  const system = `You are "Sewa Sahayak", the friendly AI assistant of Sewa Setu — the Chhattisgarh government's citizen services portal.
Many users are rural, first-time digital users. Be warm, simple and brief (max ~90 words). Use short sentences and bullet points for documents/steps.
ALWAYS reply in ${lang === "hi" ? "simple Hindi (Devanagari script)" : "simple English"}.
Only recommend services from this catalog (never invent services, fees or timelines):
${JSON.stringify(CATALOG)}

${profileText}

Rules:
- Identify what the citizen needs and pick the 1–3 most relevant catalog services (by slug).
- If the service has online_ai_flow=true, tell them they can apply right here in a few minutes and the form is pre-filled from DigiLocker.
- Mention required documents and timeline (sla_days) and fee.
- If the user describes a problem/complaint (broken hand pump, pension not received, delay), set intent "grievance" and put a clean one-line complaint in grievance_text.
- If they ask about the status of an application, use their applications list; set intent "track" and track_ref to the reference number if known.
- If you need one missing fact to decide eligibility, ask ONE short question.
Return ONLY JSON: {"reply": string (markdown allowed), "intent": "apply"|"info"|"eligibility"|"track"|"grievance"|"other", "services": [slug], "grievance_text": string|null, "track_ref": string|null}`;

  try {
    const { data, model, ms } = await chatJson<{
      reply: string;
      intent: AssistantReply["intent"];
      services?: string[];
      grievance_text?: string | null;
      track_ref?: string | null;
    }>([{ role: "system", content: system }, ...messages.slice(-8)], { maxTokens: 700, timeoutMs: 20000 });

    const services = (data.services ?? [])
      .map((slug) => getService(slug))
      .filter((s): s is NonNullable<typeof s> => !!s)
      .slice(0, 3)
      .map((s) => ({
        slug: s.slug,
        name: s.name,
        fullFlow: s.fullFlow,
        slaDays: s.slaDays,
        fee: s.fee,
        documents: s.documents.map((d) => DOC_TYPES[d.type].label),
        // Eligibility is decided by deterministic rules, not by the LLM
        eligibility: profile && s.eligibility.length ? checkEligibility(s, profile) : undefined,
      }));

    const body: AssistantReply = {
      reply: data.reply,
      language: lang,
      intent: data.intent ?? "other",
      services,
      grievanceText: data.grievance_text ?? undefined,
      trackRef: data.track_ref ?? undefined,
      model,
      ms,
    };
    return Response.json(body);
  } catch (e) {
    console.error("[assistant]", (e as Error).message);
    // Offline fallback: keyword search over the catalog so the citizen is never stuck
    const q = last.toLowerCase();
    const hits = SERVICES.filter((s) => s.keywords.some((k) => q.includes(k.toLowerCase()))).slice(0, 3);
    return Response.json({
      reply:
        lang === "hi"
          ? "एआई सहायक अभी व्यस्त है। आपके शब्दों के आधार पर ये सेवाएं मिलीं:"
          : "The AI assistant is busy right now. Based on your words, these services match:",
      language: lang,
      intent: "info",
      services: hits.map((s) => ({
        slug: s.slug, name: s.name, fullFlow: s.fullFlow, slaDays: s.slaDays, fee: s.fee,
        documents: s.documents.map((d) => DOC_TYPES[d.type].label),
      })),
      model: "keyword-fallback",
      ms: 0,
    } satisfies AssistantReply);
  }
}
