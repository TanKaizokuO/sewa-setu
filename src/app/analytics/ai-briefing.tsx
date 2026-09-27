"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Md } from "@/components/md";
import { useLang } from "@/components/lang-provider";

export function AiBriefing({ summary }: { summary: unknown }) {
  const { lang, tt } = useLang();
  const [text, setText] = useState<string | null>(null);
  const [meta, setMeta] = useState("");
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    const r = await fetch("/api/analytics/briefing", { method: "POST", body: JSON.stringify({ summary, lang }) }).then((r) => r.json());
    setBusy(false);
    setText(r.text ?? r.error);
    if (r.model) setMeta(`${r.model.split("/").pop()} · ${(r.ms / 1000).toFixed(1)}s`);
  }

  return (
    <section className="mt-5 rounded-2xl border border-saffron/40 bg-gradient-to-br from-saffron/10 to-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold">
          <Sparkles className="size-5 text-saffron" /> {tt("AI briefing for the Collector", "कलेक्टर हेतु एआई ब्रीफिंग")}
        </h2>
        <Button size="sm" onClick={run} disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : <Sparkles />} {text ? tt("Regenerate", "पुनः बनाएं") : tt("Generate briefing", "ब्रीफिंग बनाएं")}
        </Button>
      </div>
      {text ? (
        <div className="mt-2">
          <Md text={text} />
          <div className="text-[10px] text-muted-foreground">{meta}</div>
        </div>
      ) : (
        <p className="mt-1 text-sm text-muted-foreground">
          {tt("Turns the live numbers below into a 4-point action briefing.", "नीचे के लाइव आंकड़ों को 4-बिंदु कार्य ब्रीफिंग में बदलता है।")}
        </p>
      )}
    </section>
  );
}
