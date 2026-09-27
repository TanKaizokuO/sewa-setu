"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, Loader2, Send, Building2, Flame, Users, Clock, Sparkles } from "lucide-react";
import { useLang } from "@/components/lang-provider";
import { useSpeechInput } from "@/hooks/use-speech";
import { Button } from "@/components/ui/button";

type Result = {
  refNo: string;
  department: string;
  category: string;
  priority: string;
  summary_en: string;
  reason: string;
  reply_hi: string;
  reply_en: string;
  slaDays: number;
  similar: number;
  district: string;
  model: string;
};

const PRIORITY_CLS: Record<string, string> = {
  critical: "bg-destructive text-white",
  high: "bg-destructive/15 text-destructive",
  medium: "bg-warning/20 text-[oklch(0.5_0.13_60)]",
  low: "bg-muted text-muted-foreground",
};

export function GrievanceForm({ initialText, loggedIn }: { initialText: string; loggedIn: boolean }) {
  const { lang, tt } = useLang();
  const router = useRouter();
  const [text, setText] = useState(initialText);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Result | null>(null);
  const { listening, interim, supported, start, stop } = useSpeechInput(lang, (t) => setText((p) => (p ? p + " " : "") + t));

  async function submit() {
    setBusy(true);
    const r = await fetch("/api/grievances", { method: "POST", body: JSON.stringify({ text }) }).then((r) => r.json());
    setBusy(false);
    setRes(r);
    router.refresh();
  }

  if (res)
    return (
      <div className="mt-5 space-y-4 rounded-2xl border bg-white p-5">
        <div className="text-sm text-muted-foreground">{tt("Complaint registered", "शिकायत दर्ज")}</div>
        <div className="font-mono text-xl font-semibold">{res.refNo}</div>
        <p className="rounded-xl bg-secondary p-3 text-sm">{lang === "hi" ? res.reply_hi : res.reply_en}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Info icon={<Building2 className="size-4" />} label={tt("Routed to", "भेजा गया")} value={`${res.department} · ${res.district}`} />
          <Info icon={<Sparkles className="size-4" />} label={tt("Category", "श्रेणी")} value={res.category} />
          <Info
            icon={<Flame className="size-4" />}
            label={tt("Priority", "प्राथमिकता")}
            value={<span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${PRIORITY_CLS[res.priority]}`}>{res.priority}</span>}
          />
          <Info icon={<Clock className="size-4" />} label={tt("Resolution target", "निवारण लक्ष्य")} value={`${res.slaDays} ${res.slaDays === 1 ? tt("day", "दिन") : tt("days", "दिन")}`} />
        </div>
        <p className="text-xs text-muted-foreground">
          <b>{tt("Why this priority", "यह प्राथमिकता क्यों")}:</b> {res.reason} <span className="opacity-70">· {res.model.split("/").pop()}</span>
        </p>
        {res.similar > 0 && (
          <div className="flex items-center gap-2 rounded-xl bg-primary/5 p-3 text-sm ring-1 ring-primary/20">
            <Users className="size-4 text-primary" />
            {tt(
              `${res.similar} similar complaint(s) in ${res.district} this month — grouped as a hotspot and flagged to the district officer.`,
              `इस माह ${res.district} में ${res.similar} मिलती-जुलती शिकायतें — हॉटस्पॉट के रूप में जिला अधिकारी को सूचित।`,
            )}
          </div>
        )}
        <Button variant="outline" onClick={() => { setRes(null); setText(""); }}>
          {tt("Register another", "एक और दर्ज करें")}
        </Button>
      </div>
    );

  return (
    <div className="mt-5 space-y-3 rounded-2xl border bg-white p-5">
      <textarea
        value={listening ? `${text} ${interim}` : text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        placeholder={tt("e.g. The hand pump in our village has been broken for 3 weeks…", "जैसे: हमारे गांव का हैंडपंप 3 हफ्ते से खराब है…")}
        className="w-full rounded-xl border p-3 text-sm outline-none focus:border-primary"
      />
      {!loggedIn && <p className="text-xs text-muted-foreground">{tt("Tip: log in so we can update you on progress.", "सुझाव: लॉगिन करें ताकि हम आपको प्रगति बता सकें।")}</p>}
      <div className="flex flex-wrap gap-2">
        {supported && (
          <Button variant="outline" onClick={listening ? stop : start} className={listening ? "animate-pulse border-destructive text-destructive" : ""}>
            <Mic /> {listening ? tt("Listening… tap to stop", "सुन रहे हैं… रोकने हेतु दबाएं") : tt("Speak", "बोलें")}
          </Button>
        )}
        <Button onClick={submit} disabled={busy || !text.trim()}>
          {busy ? <Loader2 className="animate-spin" /> : <Send />} {tt("Submit", "दर्ज करें")}
        </Button>
      </div>
    </div>
  );
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border p-3">
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        {icon} {label}
      </div>
      <div className="mt-1 text-sm font-medium">{value}</div>
    </div>
  );
}
