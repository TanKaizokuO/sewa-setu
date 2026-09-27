"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, AlertTriangle, XCircle, HelpCircle, ScanText, Eye, EyeOff, Database, UserCog, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useLang } from "./lang-provider";
import { DOC_TYPES, type DocType } from "@/lib/services";
import type { VerificationCheck } from "@/db/schema";

export type VerifyPayload = {
  detectedType: string;
  typeMatches?: boolean;
  extracted: Record<string, string | null>;
  checks: VerificationCheck[];
  ocrBlocks?: { text: string; type: string; bbox: { xmin: number; ymin: number; xmax: number; ymax: number } }[];
  ocrEngine: string;
  model?: string;
  ms?: number;
  cached: boolean;
  summary?: { en: string; hi: string };
};

const STATUS = {
  match: { icon: CheckCircle2, cls: "text-success", bg: "bg-success/10", en: "Match", hi: "मेल" },
  partial: { icon: AlertTriangle, cls: "text-[oklch(0.62_0.15_65)]", bg: "bg-warning/15", en: "Partial", hi: "आंशिक" },
  mismatch: { icon: XCircle, cls: "text-destructive", bg: "bg-destructive/10", en: "Mismatch", hi: "मेल नहीं" },
  missing: { icon: HelpCircle, cls: "text-muted-foreground", bg: "bg-muted", en: "Not found", hi: "नहीं मिला" },
} as const;

export function DocEvidence({
  image, expectedType, result, officer,
}: {
  image: string;
  expectedType: DocType;
  result: VerifyPayload;
  officer?: { documentId: number; canOverride: boolean };
}) {
  const { t, tt } = useLang();
  const [boxes, setBoxes] = useState(true);
  const [zoom, setZoom] = useState(false);
  const detectedLabel = DOC_TYPES[result.detectedType as DocType]?.label;
  const typeOk = result.detectedType === expectedType;

  return (
    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
      <div>
        <div className={`relative overflow-hidden rounded-lg border bg-muted ${zoom ? "" : "max-h-64"}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="" className="w-full cursor-zoom-in" onClick={() => setZoom((z) => !z)} />
          {boxes &&
            result.ocrBlocks?.map((b, i) => (
              <div
                key={i}
                title={b.text}
                className="pointer-events-none absolute rounded-sm border border-primary/70 bg-primary/10"
                style={{
                  left: `${b.bbox.xmin * 100}%`,
                  top: `${b.bbox.ymin * 100}%`,
                  width: `${(b.bbox.xmax - b.bbox.xmin) * 100}%`,
                  height: `${(b.bbox.ymax - b.bbox.ymin) * 100}%`,
                }}
              />
            ))}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <ScanText className="size-3" /> {result.ocrEngine}
            {result.ocrBlocks?.length ? ` · ${result.ocrBlocks.length} ${tt("text regions", "पाठ क्षेत्र")}` : ""}
          </span>
          {result.ocrBlocks?.length ? (
            <button onClick={() => setBoxes((b) => !b)} className="flex items-center gap-1 hover:text-primary">
              {boxes ? <EyeOff className="size-3" /> : <Eye className="size-3" />} {tt("boxes", "बॉक्स")}
            </button>
          ) : null}
          {result.cached && (
            <span className="flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 font-medium" title="Cloud AI was unreachable; showing the earlier result of the same pipeline for this exact image.">
              <Database className="size-3" /> cached
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${typeOk ? "bg-success/15 text-[oklch(0.42_0.12_150)]" : "bg-destructive/10 text-destructive"}`}>
            {typeOk ? <CheckCircle2 className="size-3.5" /> : <XCircle className="size-3.5" />}
            {tt("Detected", "पहचाना गया")}: {detectedLabel ? t(detectedLabel) : tt("Unknown document", "अज्ञात दस्तावेज़")}
          </span>
          {result.model && (
            <span className="text-muted-foreground">
              {result.model.split("/").pop()}
              {result.ms ? ` · ${(result.ms / 1000).toFixed(1)}s` : ""}
            </span>
          )}
        </div>
        {!typeOk && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {tt(
              `This looks like a different document. Please upload your ${DOC_TYPES[expectedType].label.en}.`,
              `यह कोई अन्य दस्तावेज़ लगता है। कृपया अपना ${DOC_TYPES[expectedType].label.hi} अपलोड करें।`,
            )}
          </p>
        )}
        {result.checks.map((c) => (
          <CheckRow key={c.field} c={c} officer={officer} />
        ))}
      </div>
    </div>
  );
}

function CheckRow({ c, officer }: { c: VerificationCheck; officer?: { documentId: number; canOverride: boolean } }) {
  const { tt, t } = useLang();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const eff = c.overridden?.to ?? c.status;
  const s = STATUS[eff];
  const Icon = s.icon;

  async function override(to: "match" | "mismatch") {
    setBusy(true);
    const note = to === "match" ? "Verified in person / supporting document seen by officer" : "Discrepancy confirmed by officer";
    const res = await fetch("/api/officer/override", {
      method: "POST",
      body: JSON.stringify({ documentId: officer!.documentId, field: c.field, to, note }),
    });
    setBusy(false);
    if (res.ok) {
      toast.success(tt("Override recorded in audit trail", "परिवर्तन ऑडिट ट्रेल में दर्ज"));
      router.refresh();
    } else toast.error((await res.json()).error);
  }

  return (
    <div className={`rounded-lg p-2.5 ${s.bg}`}>
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="flex items-center gap-1.5 font-medium">
          <Icon className={`size-4 ${s.cls}`} /> {c.label}
          <span className={`text-xs font-normal ${s.cls}`}>· {t(s)}</span>
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground" title="AI confidence">
          <span className="h-1.5 w-12 overflow-hidden rounded-full bg-black/10">
            <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.round(c.confidence * 100)}%` }} />
          </span>
          {Math.round(c.confidence * 100)}%
        </span>
      </div>
      <div className="mt-1 grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-muted-foreground">{tt("Form", "फॉर्म")}: </span>
          <span className="font-medium">{c.expected || "—"}</span>
        </div>
        <div>
          <span className="text-muted-foreground">{tt("Document", "दस्तावेज़")}: </span>
          <span className="font-medium">{c.found || "—"}</span>
        </div>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{tt("Why", "कारण")}:</span> {c.reason}
      </p>
      {c.overridden && (
        <p className="mt-1 flex items-center gap-1 text-[11px] text-primary">
          <UserCog className="size-3" /> {tt("Overridden by", "बदला गया")} {c.overridden.by}: AI “{c.status}” → “{c.overridden.to}” — {c.overridden.note}
        </p>
      )}
      {officer?.canOverride && !c.overridden && c.status !== "match" && (
        <div className="mt-2 flex gap-2">
          <button disabled={busy} onClick={() => override("match")} className="flex items-center gap-1 rounded-md border bg-white px-2 py-1 text-xs hover:bg-success/10">
            {busy ? <Loader2 className="size-3 animate-spin" /> : <CheckCircle2 className="size-3 text-success" />} {tt("Mark verified", "सत्यापित करें")}
          </button>
          <button disabled={busy} onClick={() => override("mismatch")} className="flex items-center gap-1 rounded-md border bg-white px-2 py-1 text-xs hover:bg-destructive/10">
            <XCircle className="size-3 text-destructive" /> {tt("Confirm discrepancy", "विसंगति पुष्टि")}
          </button>
        </div>
      )}
      {officer?.canOverride && !c.overridden && c.status === "match" && (
        <button disabled={busy} onClick={() => override("mismatch")} className="mt-1 text-[11px] text-muted-foreground underline hover:text-destructive">
          {tt("Disagree with AI", "एआई से असहमत")}
        </button>
      )}
    </div>
  );
}
