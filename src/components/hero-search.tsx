"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, Search, Sparkles } from "lucide-react";
import { useLang } from "./lang-provider";
import { useSpeechInput } from "@/hooks/use-speech";

const EXAMPLES = [
  { en: "I need an income certificate", hi: "मुझे आय प्रमाण पत्र चाहिए" },
  { en: "Which scholarship can I get?", hi: "मुझे कौन सी छात्रवृत्ति मिल सकती है?" },
  { en: "My pension has stopped", hi: "मेरी पेंशन बंद हो गई है" },
];

export function HeroSearch() {
  const { lang, tt, t } = useLang();
  const router = useRouter();
  const [q, setQ] = useState("");
  const go = (text: string) => text.trim() && router.push(`/assistant?q=${encodeURIComponent(text.trim())}`);
  const { listening, interim, supported, start, stop } = useSpeechInput(lang, (text) => {
    setQ(text);
    go(text);
  });

  return (
    <div className="w-full max-w-2xl">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          go(q);
        }}
        className="flex items-center gap-2 rounded-2xl border-2 border-white/30 bg-white p-2 shadow-2xl shadow-primary/30"
      >
        <Sparkles className="ml-2 size-5 shrink-0 text-saffron" />
        <input
          value={listening ? interim || tt("Listening…", "सुन रहे हैं…") : q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={tt("Tell us what you need, in your own words…", "अपनी भाषा में बताइए, आपको क्या चाहिए…")}
          className="min-w-0 flex-1 bg-transparent px-1 py-2 text-base text-foreground outline-none placeholder:text-muted-foreground"
        />
        {supported && (
          <button
            type="button"
            onClick={listening ? stop : start}
            aria-label={tt("Speak", "बोलें")}
            className={`grid size-11 shrink-0 place-items-center rounded-xl transition ${
              listening ? "animate-pulse bg-destructive text-white" : "bg-saffron/15 text-saffron hover:bg-saffron/25"
            }`}
          >
            <Mic className="size-5" />
          </button>
        )}
        <button type="submit" className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-white hover:bg-primary/90">
          <Search className="size-5" />
        </button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">
        {EXAMPLES.map((e) => (
          <button
            key={e.en}
            onClick={() => go(t(e))}
            className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs text-white/90 hover:bg-white/20"
          >
            “{t(e)}”
          </button>
        ))}
      </div>
    </div>
  );
}
