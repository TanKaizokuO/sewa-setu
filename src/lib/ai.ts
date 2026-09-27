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

async function nim(body: Record<string, unknown>, timeoutMs: number) {
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
  opts: { maxTokens?: number; temperature?: number; timeoutMs?: number } = {},
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
  const res = await chat(messages, { ...opts, temperature: 0 });
  return { data: extractJson<T>(res.content), model: res.model, ms: res.ms };
}

function stripThink(s: string) {
  return s.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
}

export function extractJson<T>(s: string): T {
  const cleaned = s.replace(/```(?:json)?/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.search(/[[{]/);
    const open = cleaned[start];
    const close = open === "{" ? "}" : "]";
    const end = cleaned.lastIndexOf(close);
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error("No JSON in model output");
  }
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
