import { chat } from "@/lib/ai";
import { currentOfficer } from "@/lib/session";

// AI-written executive briefing over the live analytics summary.
export async function POST(req: Request) {
  if (!(await currentOfficer())) return Response.json({ error: "officer login required" }, { status: 401 });
  const { summary, lang } = (await req.json()) as { summary: unknown; lang: "hi" | "en" };
  try {
    const res = await chat(
      [
        {
          role: "system",
          content: `You are a public-service delivery analyst for the Chhattisgarh government. From the metrics JSON, write a crisp briefing for the District Collector in ${lang === "hi" ? "Hindi" : "English"}: exactly 4 bullet points (markdown "- "), each <= 30 words: (1) overall performance, (2) the worst bottleneck with numbers, (3) predicted risk for next week, (4) one concrete, actionable recommendation (e.g. redeploy staff, special camp). Use only numbers present in the data.`,
        },
        { role: "user", content: JSON.stringify(summary) },
      ],
      { maxTokens: 500, timeoutMs: 25000 },
    );
    return Response.json({ text: res.content, model: res.model, ms: res.ms });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 503 });
  }
}
