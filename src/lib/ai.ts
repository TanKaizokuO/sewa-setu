import "server-only";

// NVIDIA NIM (OpenAI-compatible). Every call has a timeout and a fallback model.
const NIM_URL = "https://integrate.api.nvidia.com/v1/chat/completions";

export const CHAT_MODELS = [
  "nvidia/nemotron-3-super-120b-a12b",
  "openai/gpt-oss-20b",
] as const;
export const OCR_MODEL = "nvidia/nemotron-parse";

type Msg = { role: "system" | "user" | "assistant"; content: string };

export type ChatResult = { content: string; model: string; ms: number };

/** One retry on transient overload (429/502/503), which the hosted NIM API returns under load. */
async function nim(body: Record<string, unknown>, timeoutMs: number) {
  try {
    return await nimOnce(body, timeoutMs);
  } catch (e) {
    if (!/^NIM (429|502|503)/.test((e as Error).message)) throw e;
    await new Promise((r) => setTimeout(r, 1200));
    return nimOnce(body, timeoutMs);
  }
}

async function nimOnce(body: Record<string, unknown>, timeoutMs: number) {
  const key = process.env.NVIDIA_API_KEY;
  if (!key) throw new Error("NVIDIA_API_KEY missing");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(NIM_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`NIM ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function chat(
  messages: Msg[],
  opts: { maxTokens?: number; temperature?: number; timeoutMs?: number; validate?: (content: string) => void } = {},
): Promise<ChatResult> {
  const errors: string[] = [];
  for (const model of CHAT_MODELS) {
    const t0 = Date.now();
    try {
      const isNemotron = model.startsWith("nvidia/");
      const data = await nim(
        {
          model,
          messages,
          max_tokens: isNemotron ? (opts.maxTokens ?? 800) : Math.max(opts.maxTokens ?? 800, 1500),
          temperature: opts.temperature ?? 0.2,
          ...(isNemotron ? { chat_template_kwargs: { enable_thinking: false } } : {}),
        },
        opts.timeoutMs ?? 20000,
      );
      const content: string = data.choices?.[0]?.message?.content ?? "";
      if (!content.trim()) throw new Error("empty content");
      opts.validate?.(stripThink(content)); // unusable output falls through to the next model
      return { content: stripThink(content), model, ms: Date.now() - t0 };
    } catch (e) {
      errors.push(`${model}: ${(e as Error).message}`);
    }
  }
  throw new Error(`All chat models failed — ${errors.join(" | ")}`);
}

/** Chat call that must return JSON. Parses leniently (code fences, surrounding prose). */
export async function chatJson<T>(
  messages: Msg[],
  opts: { maxTokens?: number; timeoutMs?: number } = {},
): Promise<{ data: T; model: string; ms: number }> {
  const res = await chat(messages, { ...opts, temperature: 0, validate: (c) => void extractJson(c) });
  return { data: extractJson<T>(res.content), model: res.model, ms: res.ms };
}

function stripThink(s: string) {
  return s.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
}

/** Models sometimes put raw newlines/tabs inside JSON strings; escape them so JSON.parse accepts it. */
function escapeControlChars(s: string) {
  let out = "";
  let inStr = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inStr && c === "\\") {
      out += c + (s[++i] ?? "");
      continue;
    }
    if (c === '"') inStr = !inStr;
    if (inStr && c < " ") out += c === "\n" ? "\\n" : c === "\t" ? "\\t" : c === "\r" ? "\\r" : " ";
    else out += c;
  }
  return out;
}

export function extractJson<T>(s: string): T {
  const cleaned = s.replace(/```(?:json)?/g, "").trim();
  const start = cleaned.search(/[[{]/);
  const end = cleaned.lastIndexOf(cleaned[start] === "{" ? "}" : "]");
  const candidates = [cleaned, start >= 0 && end > start ? cleaned.slice(start, end + 1) : ""].filter(Boolean);
  for (const c of candidates)
    for (const text of [c, escapeControlChars(c)]) {
      try {
        return JSON.parse(text);
      } catch {}
    }
  throw new Error("No JSON in model output");
}

export type OcrBlock = {
  text: string;
  type: string;
  bbox: { xmin: number; ymin: number; xmax: number; ymax: number };
};

/** Layout-aware OCR with NVIDIA Nemotron-Parse. Input: image data URL. */
export async function ocrParse(dataUrl: string, timeoutMs = 15000): Promise<OcrBlock[]> {
  const data = await nim(
    {
      model: OCR_MODEL,
      messages: [{ role: "user", content: [{ type: "image_url", image_url: { url: dataUrl } }] }],
    },
    timeoutMs,
  );
  const call = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!call) throw new Error("nemotron-parse returned no tool call");
  const args = JSON.parse(call.function.arguments);
  const pages: OcrBlock[][] = Array.isArray(args[0]) ? args : [args];
  return pages.flat().filter((b) => b?.text);
}
