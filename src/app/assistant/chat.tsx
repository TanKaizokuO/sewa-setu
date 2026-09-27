"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Mic, SendHorizonal, Volume2, Sparkles, CheckCircle2, XCircle, FileText, Clock, IndianRupee, MessageSquareWarning, Search } from "lucide-react";
import { useLang } from "@/components/lang-provider";
import { useSpeechInput, speak } from "@/hooks/use-speech";
import { Md } from "@/components/md";
import { buttonVariants } from "@/components/ui/button";
import type { AssistantReply } from "@/app/api/assistant/route";

type Msg = { role: "user"; content: string } | { role: "assistant"; content: string; data: AssistantReply };

const SUGGESTIONS = [
  { en: "I need an income certificate", hi: "मुझे आय प्रमाण पत्र चाहिए" },
  { en: "Which schemes am I eligible for?", hi: "मैं किन योजनाओं के लिए पात्र हूं?" },
  { en: "What documents are needed for a caste certificate?", hi: "जाति प्रमाण पत्र के लिए कौन से दस्तावेज़ चाहिए?" },
  { en: "The hand pump in my village is broken", hi: "मेरे गांव का हैंडपंप खराब है" },
];

export function AssistantChat({ initialQuery, loggedIn }: { initialQuery?: string; loggedIn: boolean }) {
  const { lang, tt, t } = useLang();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const viaVoice = useRef(false);
  const started = useRef(false);
  const endRef = useRef<HTMLDivElement>(null);

  const { listening, interim, supported, start, stop } = useSpeechInput(lang, (text) => {
    viaVoice.current = true;
    send(text);
  });

  async function send(text: string) {
    if (!text.trim() || busy) return;
    const next: Msg[] = [...msgs, { role: "user", content: text.trim() }];
    setMsgs(next);
    setInput("");
    setBusy(true);
    try {
      const data: AssistantReply = await fetch("/api/assistant", {
        method: "POST",
        body: JSON.stringify({ messages: next.map((m) => ({ role: m.role, content: m.content })) }),
      }).then((r) => r.json());
      setMsgs((m) => [...m, { role: "assistant", content: data.reply, data }]);
      if (viaVoice.current) speak(data.reply, data.language);
    } finally {
      viaVoice.current = false;
      setBusy(false);
    }
  }

  useEffect(() => {
    if (initialQuery && !started.current) {
      started.current = true;
      send(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, busy]);

  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-2xl border bg-card shadow-sm">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {msgs.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <div className="grid size-14 place-items-center rounded-2xl bg-primary/10">
              <Sparkles className="size-7 text-primary" />
            </div>
            <p className="max-w-sm text-sm text-muted-foreground">
              {tt("Tap the mic and speak, or try one of these:", "माइक दबाकर बोलें, या इनमें से कोई चुनें:")}
            </p>
            <div className="flex max-w-lg flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s.en} onClick={() => send(t(s))} className="rounded-full border px-3 py-1.5 text-sm hover:border-primary hover:bg-secondary">
                  {t(s)}
                </button>
              ))}
            </div>
          </div>
        )}

        {msgs.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2 text-sm text-primary-foreground">{m.content}</div>
            </div>
          ) : (
            <div key={i} className="flex gap-2">
              <div className="grid size-8 shrink-0 place-items-center rounded-full bg-saffron/15">
                <Sparkles className="size-4 text-saffron" />
              </div>
              <div className="min-w-0 max-w-[90%] space-y-3">
                <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-2">
                  <Md text={m.content} />
                  <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                    <button onClick={() => speak(m.content, m.data.language)} className="flex items-center gap-1 hover:text-primary">
                      <Volume2 className="size-3" /> {tt("Listen", "सुनें")}
                    </button>
                    <span>· {m.data.model.split("/").pop()} · {(m.data.ms / 1000).toFixed(1)}s</span>
                  </div>
                </div>
                {m.data.services.map((s) => (
                  <div key={s.slug} className="rounded-xl border bg-card p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold">{t(s.name)}</div>
                      {s.eligibility && (
                        <span
                          className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                            s.eligibility.eligible ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive"
                          }`}
                        >
                          {s.eligibility.eligible ? <CheckCircle2 className="size-3.5" /> : <XCircle className="size-3.5" />}
                          {s.eligibility.eligible ? tt("You are eligible", "आप पात्र हैं") : tt("Not eligible", "पात्र नहीं")}
                        </span>
                      )}
                    </div>
                    {s.eligibility && (
                      <ul className="mt-1 text-xs text-muted-foreground">
                        {s.eligibility.reasons.map((r, j) => (
                          <li key={j}>{t(r)}</li>
                        ))}
                      </ul>
                    )}
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="size-3.5" /> {s.slaDays} {tt("days", "दिन")}</span>
                      <span className="flex items-center gap-1"><IndianRupee className="size-3.5" /> {s.fee === 0 ? tt("Free", "निःशुल्क") : s.fee}</span>
                    </div>
                    {s.documents.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {s.documents.map((d) => (
                          <span key={d.en} className="flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs">
                            <FileText className="size-3" /> {t(d)}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="mt-3 flex gap-2">
                      {s.fullFlow ? (
                        <Link
                          href={loggedIn ? `/apply/${s.slug}` : `/login?next=/apply/${s.slug}`}
                          className={buttonVariants({ size: "sm" })}
                        >
                          <Sparkles /> {tt("Apply now — pre-filled", "अभी आवेदन करें — पहले से भरा")}
                        </Link>
                      ) : null}
                      <Link href={`/services/${s.slug}`} className={buttonVariants({ size: "sm", variant: "outline" })}>
                        {tt("Details", "विवरण")}
                      </Link>
                    </div>
                  </div>
                ))}
                {m.data.intent === "grievance" && (
                  <Link
                    href={`/grievance?text=${encodeURIComponent(m.data.grievanceText ?? msgs[i - 1]?.content ?? "")}`}
                    className={buttonVariants({ size: "sm", variant: "outline" })}
                  >
                    <MessageSquareWarning /> {tt("Register this complaint", "यह शिकायत दर्ज करें")}
                  </Link>
                )}
                {m.data.intent === "track" && m.data.trackRef && (
                  <Link href={`/track/${m.data.trackRef}`} className={buttonVariants({ size: "sm", variant: "outline" })}>
                    <Search /> {tt("Track", "ट्रैक करें")} {m.data.trackRef}
                  </Link>
                )}
              </div>
            </div>
          ),
        )}
        {busy && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="grid size-8 place-items-center rounded-full bg-saffron/15">
              <Sparkles className="size-4 animate-pulse text-saffron" />
            </div>
            {tt("Thinking…", "सोच रहे हैं…")}
          </div>
        )}
        <div ref={endRef} />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-center gap-2 border-t p-3"
      >
        {supported && (
          <button
            type="button"
            onClick={listening ? stop : start}
            aria-label={tt("Speak", "बोलें")}
            className={`grid size-11 shrink-0 place-items-center rounded-xl transition ${
              listening ? "animate-pulse bg-destructive text-white" : "bg-saffron/15 text-saffron-ink hover:bg-saffron/25"
            }`}
          >
            <Mic className="size-5" />
          </button>
        )}
        <input
          value={listening ? interim || tt("Listening…", "सुन रहे हैं…") : input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={tt("Type your question…", "अपना प्रश्न लिखें…")}
          className="min-w-0 flex-1 rounded-xl border bg-muted/40 px-3 py-2.5 text-sm outline-none focus:border-primary"
        />
        <button type="submit" disabled={busy} className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50">
          <SendHorizonal className="size-5" />
        </button>
      </form>
    </div>
  );
}
