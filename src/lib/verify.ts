import "server-only";
import { eq } from "drizzle-orm";
import { db, ocrCache, type VerificationCheck } from "@/db";
import { chatJson, ocrParse, type OcrBlock } from "./ai";
import { DOC_TYPES, type DocRequirement, type DocType } from "./services";

export type VerifyResult = {
  detectedType: DocType | "unknown";
  typeMatches: boolean;
  extracted: Record<string, string | null>;
  checks: VerificationCheck[];
  ocrText: string;
  ocrBlocks: OcrBlock[];
  ocrEngine: string;
  model: string;
  ms: number;
  cached: boolean;
  summary: { en: string; hi: string };
};

const EXTRACT_KEYS = [
  "name", "name_local", "father_name", "dob", "gender", "address", "village", "tehsil",
  "district", "id_number", "caste", "category", "annual_income",
];

/**
 * Full pipeline: OCR (Nemotron-Parse, or client-side Tesseract text) -> LLM extraction
 * + cross-verification against the form -> deterministic post-checks.
 * If the live pipeline fails, fall back to a previous real result for the same image hash.
 */
export async function verifyDocument(input: {
  image: string;
  sha256: string;
  expectedType: DocType;
  requirement: DocRequirement;
  form: Record<string, string>;
  clientOcrText?: string;
}): Promise<VerifyResult> {
  const t0 = Date.now();
  try {
    let ocrBlocks: OcrBlock[] = [];
    let ocrText = input.clientOcrText ?? "";
    let ocrEngine = "tesseract.js (on-device)";
    if (!input.clientOcrText) {
      ocrBlocks = await ocrParse(input.image);
      ocrBlocks = ocrBlocks.map((b) => ({ ...b, text: cleanOcr(b.text) }));
      ocrText = ocrBlocks.map((b) => b.text).join("\n");
      ocrEngine = "nvidia/nemotron-parse";
    }
    const llm = await extractAndCompare(ocrText, input.expectedType, input.requirement, input.form);
    const result: VerifyResult = {
      ...llm.result,
      ocrText,
      ocrBlocks,
      ocrEngine,
      model: llm.model,
      ms: Date.now() - t0,
      cached: false,
    };
    // Only cloud results are cached, so an on-device fallback never replaces a better reading
    if (!input.clientOcrText)
      await db
        .insert(ocrCache)
        .values({ sha256: cacheKey(input), result })
        .onConflictDoUpdate({ target: ocrCache.sha256, set: { result, createdAt: new Date() } });
    return result;
  } catch (err) {
    console.error("[verify] live pipeline failed:", (err as Error).message);
    const [hit] = await db.select().from(ocrCache).where(eq(ocrCache.sha256, cacheKey(input)));
    if (hit) return { ...(hit.result as unknown as VerifyResult), cached: true, ms: Date.now() - t0 };
    throw err;
  }
}

// Cache is per image + the form values it was checked against.
function cacheKey(input: { sha256: string; expectedType: string; form: Record<string, string> }) {
  const fields = Object.keys(input.form).sort().map((k) => `${k}=${input.form[k]}`).join("|");
  return `${input.sha256}:${input.expectedType}:${simpleHash(fields)}`;
}

function simpleHash(s: string) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

type LlmOut = {
  detected_type: string;
  extracted: Record<string, string | null>;
  checks: { field: string; found: string | null; status: VerificationCheck["status"]; confidence: number; reason: string }[];
  summary_en: string;
  summary_hi: string;
};

async function extractAndCompare(
  ocrText: string,
  expectedType: DocType,
  req: DocRequirement,
  form: Record<string, string>,
) {
  const typeList = Object.entries(DOC_TYPES).map(([k, v]) => `${k} (${v.label.en} / ${v.label.hi})`).join(", ");
  const toCheck = req.verify.map((v) => ({
    field: v.formField,
    label: v.label.en,
    doc_field: v.extracted,
    form_value: form[v.formField] ?? "",
  }));

  const { data, model } = await chatJson<LlmOut>(
    [
      {
        role: "system",
        content: `You are the document-verification engine of Sewa Setu, the Government of Chhattisgarh citizen services portal.
You receive OCR text of an uploaded document (may contain OCR errors, mixed Hindi/English) and values the citizen typed in the application form.
Tasks:
1. Identify the document type. One of: ${typeList}, or "unknown".
2. Extract fields: ${EXTRACT_KEYS.join(", ")}. Use null when absent. "name" must be in Latin script (transliterate if only Hindi is present); "name_local" is the Devanagari name. Dates as YYYY-MM-DD.
3. For each requested check, compare the document value with the form value and decide:
   - "match": same person/value. Hindi and English transliterations of the same name are a match (रमेश कुमार साहू = Ramesh Kumar Sahu). Village names in either script are a match.
   - "partial": minor spelling/transliteration variants (Dhruw vs Dhruv) or a missing middle name.
   - "mismatch": a different surname (e.g. Markam vs Dhruw) is ALWAYS a mismatch, even if marriage could explain it — put that explanation in reason. Also different person, date or value.
   OCR of Devanagari is noisy (dropped or extra vowel signs: साह for साहू, कुरेद for कुरूद). If the document also prints the value in Latin script, trust the Latin version. Differences explainable purely by such OCR noise count as "match" (confidence 0.8–0.9); mention the OCR noise in reason.
   - "missing": the field cannot be found in the document.
   confidence is 0..1. reason is ONE short English sentence a government officer can understand, citing the two values; if mismatch, suggest the likely cause and fix (e.g. surname changed after marriage -> marriage certificate or gazette notification).
4. summary_en / summary_hi: one-sentence verdict for the citizen in English and simple Hindi.
Return ONLY JSON: {"detected_type": string, "extracted": {...}, "checks": [{"field","found","status","confidence","reason"}], "summary_en": string, "summary_hi": string}`,
      },
      {
        role: "user",
        content: `Expected document type: ${expectedType}
OCR TEXT:
"""
${ocrText.slice(0, 6000)}
"""
CHECKS: ${JSON.stringify(toCheck)}`,
      },
    ],
    { maxTokens: 1200, timeoutMs: 25000 },
  );

  const detected = (data.detected_type in DOC_TYPES ? data.detected_type : "unknown") as DocType | "unknown";
  const checks: VerificationCheck[] = req.verify.map((v) => {
    const c = data.checks?.find((x) => x.field === v.formField);
    const check: VerificationCheck = {
      field: v.formField,
      label: v.label.en,
      expected: form[v.formField] ?? "",
      found: typeof c?.found === "string" ? c.found : (data.extracted?.[v.extracted] ?? null),
      status: c?.status ?? "missing",
      confidence: clamp01(c?.confidence ?? 0.5),
      reason: c?.reason ?? "Field not evaluated by the model.",
    };
    // Deterministic guard for dates: never trust the model over exact comparison.
    if (v.formField === "dob") {
      const a = normDate(check.expected);
      const b = normDate(data.extracted?.dob ?? check.found ?? "");
      if (a && b) {
        check.found = b;
        if (a === b) {
          check.status = "match";
          check.confidence = Math.max(check.confidence, 0.97);
          check.reason = `Date of birth ${b} on the document matches the form.`;
        } else {
          check.status = "mismatch";
          check.confidence = Math.max(check.confidence, 0.9);
          check.reason = `Document shows date of birth ${b}, but the form says ${a}.`;
        }
      }
    }
    // Guard against OCR noise: near-identical Latin spellings are never a hard mismatch
    // (e.g. "Sinhawa" vs "Sihawa"). Completely different surnames still are.
    if (check.status === "mismatch" && v.formField !== "dob" && check.found) {
      const sim = similarity(check.expected, check.found);
      if (sim >= 0.8) {
        check.status = "partial";
        check.reason = `Minor spelling difference ('${check.found}' vs '${check.expected}', ${Math.round(sim * 100)}% similar) — likely OCR noise; officer to confirm.`;
      }
    }
    return check;
  });

  return {
    model,
    result: {
      detectedType: detected,
      typeMatches: detected === expectedType,
      extracted: data.extracted ?? {},
      checks,
      summary: { en: data.summary_en ?? "", hi: data.summary_hi ?? "" },
    },
  };
}

/** Nemotron-Parse emits markdown/LaTeX; keep just the words. */
export function cleanOcr(s: string) {
  return s
    .replace(/<\/?u>|\*\*/g, "")
    .replace(/\\(begin|end)\{tabular\}(\{[^}]*\})?/g, "")
    .replace(/\\hline/g, "")
    .replace(/\s*&\s*/g, " | ")
    .replace(/\s*\\\\\s*/g, "\n") // LaTeX row break -> one table row per line
    .trim();
}

function levenshtein(a: string, b: string) {
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

/** 0..1 similarity of the Latin letters in two strings (1 = identical). */
export function similarity(a: string, b: string) {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
  const x = norm(a), y = norm(b);
  if (!x || !y) return 0;
  return 1 - levenshtein(x, y) / Math.max(x.length, y.length);
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, Number(n) || 0));
}

export function normDate(s: string): string | null {
  if (!s) return null;
  const t = s.trim();
  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return null;
}

/** Roll individual document checks up into an application-level AI verdict. */
export function aggregate(checks: VerificationCheck[], typeIssues: number) {
  const eff = checks.map((c) => (c.overridden ? { ...c, status: c.overridden.to } : c));
  const weight = { match: 1, partial: 0.65, mismatch: 0, missing: 0.3 } as const;
  const score = eff.length
    ? eff.reduce((s, c) => s + weight[c.status] * (c.status === "match" ? c.confidence : 1), 0) / eff.length
    : 0;
  const flags = eff.filter((c) => c.status !== "match").map((c) => `${c.label}: ${c.reason}`);
  const verdict: "clear" | "review" | "mismatch" = eff.some((c) => c.status === "mismatch")
    ? "mismatch"
    : flags.length || typeIssues
      ? "review"
      : "clear";
  return { score: Math.round(score * 100) / 100, verdict, flags };
}
