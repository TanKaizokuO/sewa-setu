import { and, count, eq, gte } from "drizzle-orm";
import { db, grievances } from "@/db";
import { chatJson } from "@/lib/ai";
import { currentCitizen } from "@/lib/session";
import { CG_DISTRICTS } from "@/lib/services";
import { CATEGORIES } from "@/lib/grievance";

const SLA_DAYS: Record<string, number> = { critical: 1, high: 3, medium: 7, low: 15 };

export async function POST(req: Request) {
  const { text, district: d } = (await req.json()) as { text: string; district?: string };
  if (!text?.trim()) return Response.json({ error: "Please describe the problem" }, { status: 400 });
  const citizen = await currentCitizen();
  let district = citizen?.district ?? (d && CG_DISTRICTS.includes(d) ? d : "Raipur");

  let ai: {
    category: string;
    priority: "low" | "medium" | "high" | "critical";
    summary_en: string;
    sentiment: string;
    reason: string;
    reply_hi: string;
    reply_en: string;
    district?: string | null;
  };
  let model = "keyword-fallback";
  try {
    const r = await chatJson<typeof ai>(
      [
        {
          role: "system",
          content: `You triage citizen grievances for the Government of Chhattisgarh. Input may be Hindi, Chhattisgarhi or English.
Choose category from exactly: ${Object.keys(CATEGORIES).join(", ")}.
Priority: "critical" = risk to life/health or safety (no drinking water for a village, medical emergency, electrocution risk); "high" = essential service denied for days (ration, pension, wages, water); "medium" = inconvenience with workaround; "low" = minor/informational.
If the text names a place in one of these districts, set "district" to it (else null): ${CG_DISTRICTS.join(", ")}. Villages: Kurud, Sihawa, Nagri are in Dhamtari.
Return ONLY JSON: {"district","category","priority","summary_en" (one line, English),"sentiment" (calm|frustrated|distressed),"reason" (one short English sentence explaining the priority),"reply_hi" (one empathetic Hindi sentence to the citizen),"reply_en" (same in English)}`,
        },
        { role: "user", content: text.slice(0, 2000) },
      ],
      { maxTokens: 400, timeoutMs: 20000 },
    );
    ai = r.data;
    model = r.model;
    if (!(ai.category in CATEGORIES)) ai.category = "Other";
    if (!(ai.priority in SLA_DAYS)) ai.priority = "medium";
    if (ai.district && CG_DISTRICTS.includes(ai.district)) district = ai.district;
  } catch {
    ai = { category: "Other", priority: "medium", summary_en: text.slice(0, 120), sentiment: "frustrated", reason: "AI unavailable; routed to the district grievance cell for manual triage.", reply_hi: "आपकी शिकायत दर्ज कर ली गई है।", reply_en: "Your complaint has been registered." };
  }

  const refNo = `GRV-2026-${Math.floor(10000 + Math.random() * 89999)}`;
  const department = CATEGORIES[ai.category];
  await db.insert(grievances).values({
    refNo,
    citizenId: citizen?.id ?? null,
    text,
    district,
    category: ai.category,
    department,
    priority: ai.priority,
    summaryEn: ai.summary_en,
    sentiment: ai.sentiment,
    aiReason: ai.reason,
  });

  // Cluster detection: similar complaints in the same district in the last 30 days
  const [cluster] = await db
    .select({ n: count() })
    .from(grievances)
    .where(and(eq(grievances.category, ai.category), eq(grievances.district, district), gte(grievances.createdAt, new Date(Date.now() - 30 * 86400000))));

  return Response.json({
    refNo,
    department,
    district,
    ...ai,
    slaDays: SLA_DAYS[ai.priority],
    similar: Math.max(0, cluster.n - 1),
    model,
  });
}
