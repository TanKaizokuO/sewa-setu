"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ShieldCheck, Camera, CloudDownload, Loader2, CheckCircle2, AlertTriangle, ScanText, Sparkles,
  ArrowLeft, ArrowRight, FileCheck2, RefreshCw, Circle,
} from "lucide-react";
import { useLang } from "@/components/lang-provider";
import { Button } from "@/components/ui/button";
import { DOC_TYPES, type Service, type DocType, type FieldDef } from "@/lib/services";
import { loadImage, assessQuality, compress, sha256, tesseractOcr, ISSUE_TEXT, type Quality } from "@/lib/image-client";
import { DocEvidence, type VerifyPayload } from "@/components/doc-evidence";

type DocState = {
  status: "idle" | "processing" | "bad_quality" | "done" | "error";
  stage?: 0 | 1 | 2;
  local?: boolean;
  image?: string;
  quality?: Quality;
  result?: VerifyPayload & { documentId: number };
  error?: string;
};

export function ApplyWizard({
  service, prefill, persona, digilocker,
}: { service: Service; prefill: Record<string, string>; persona: string; digilocker: string[] }) {
  const { t, tt, lang } = useLang();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Record<string, string>>(prefill);
  const [docs, setDocs] = useState<Partial<Record<DocType, DocState>>>({});
  const [declaration, setDeclaration] = useState(false);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const setDoc = (type: DocType, patch: Partial<DocState>) => setDocs((d) => ({ ...d, [type]: { ...d[type], ...patch } as DocState }));

  const missingFields = service.fields.filter((f) => f.required && !String(form[f.key] ?? "").trim());
  const requiredDocsDone = service.documents.filter((d) => d.required).every((d) => docs[d.type]?.status === "done");

  async function handleImage(type: DocType, src: string, skipQuality = false) {
    setDoc(type, { status: "processing", stage: 0, error: undefined, result: undefined, local: false });
    try {
      const img = await loadImage(src);
      const quality = assessQuality(img);
      const { dataUrl } = compress(img);
      setDoc(type, { image: dataUrl, quality });
      if (!quality.ok && !skipQuality) {
        setDoc(type, { status: "bad_quality" });
        return;
      }
      await verify(type, dataUrl, quality);
    } catch (e) {
      setDoc(type, { status: "error", error: (e as Error).message });
    }
  }

  async function verify(type: DocType, image: string, quality: Quality) {
    setDoc(type, { status: "processing", stage: 1 });
    const timer = setTimeout(() => setDoc(type, { stage: 2 }), 2500);
    const hash = await sha256(image);
    const post = (clientOcrText?: string) =>
      fetch("/api/documents/verify", {
        method: "POST",
        body: JSON.stringify({ serviceSlug: service.slug, docType: type, image, sha256: hash, quality, form, clientOcrText }),
      });
    try {
      let res = await post();
      if (res.status === 503 && (await res.clone().json()).needsClientOcr) {
        // Cloud OCR unreachable: read the document on-device, then verify
        clearTimeout(timer);
        setDoc(type, { stage: 1, local: true });
        const text = await tesseractOcr(image);
        setDoc(type, { stage: 2 });
        res = await post(text);
      }
      if (!res.ok) throw new Error((await res.json()).error ?? "Verification failed");
      const result = await res.json();
      setDoc(type, { status: "done", result });
    } catch (e) {
      setDoc(type, { status: "error", error: (e as Error).message });
    } finally {
      clearTimeout(timer);
    }
  }

  async function submit() {
    setSubmitting(true);
    const documentIds = Object.values(docs).flatMap((d) => (d?.result ? [d.result.documentId] : []));
    const res = await fetch("/api/applications", {
      method: "POST",
      body: JSON.stringify({ serviceSlug: service.slug, form, documentIds, declaration, citizenNote: note || undefined }),
    });
    const data = await res.json();
    if (!res.ok) {
      setSubmitting(false);
      toast.error(data.error);
      return;
    }
    toast.success(tt("Application submitted!", "आवेदन जमा हो गया!"));
    router.push(`/track/${data.refNo}?new=1`);
  }

  const allChecks = Object.values(docs).flatMap((d) => d?.result?.checks ?? []);
  const issues = allChecks.filter((c) => c.status === "mismatch" || c.status === "missing");
  const minor = allChecks.filter((c) => c.status === "partial");
  const steps = [tt("Details", "विवरण"), tt("Documents", "दस्तावेज़"), tt("Review & submit", "जांचें व जमा करें")];

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-1 text-sm text-muted-foreground">{t(service.department)}</div>
      <h1 className="text-2xl font-bold">{t(service.name)}</h1>

      <ol className="my-5 grid grid-cols-3 gap-2">
        {steps.map((s, i) => (
          <li key={s} className={`rounded-lg border-b-4 pb-1 text-xs font-medium sm:text-sm ${i <= step ? "border-primary text-primary" : "border-muted text-muted-foreground"}`}>
            {i + 1}. {s}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <section className="space-y-4 rounded-2xl border bg-white p-5">
          <p className="flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2 text-sm text-[oklch(0.42_0.12_150)]">
            <ShieldCheck className="size-4 shrink-0" />
            {tt("We filled this from your DigiLocker profile. Please check and complete the rest.", "यह फॉर्म आपकी डिजिलॉकर प्रोफ़ाइल से भरा गया है। कृपया जांचें और बाकी भरें।")}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {service.fields.map((f) => (
              <Field key={f.key} f={f} value={form[f.key] ?? ""} fromDigiLocker={!!f.prefill && !!prefill[f.key] && form[f.key] === prefill[f.key]} onChange={(v) => setForm((s) => ({ ...s, [f.key]: v }))} />
            ))}
          </div>
          <div className="flex justify-end">
            <Button size="lg" disabled={missingFields.length > 0} onClick={() => setStep(1)}>
              {tt("Next: documents", "आगे: दस्तावेज़")} <ArrowRight />
            </Button>
          </div>
        </section>
      )}

      {step === 1 && (
        <section className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {tt(
              "Fetch from DigiLocker or take a photo. AI reads each document and checks it against your form — mistakes are caught now, not after weeks.",
              "डिजिलॉकर से लें या फोटो खींचें। एआई हर दस्तावेज़ पढ़कर आपके फॉर्म से मिलाता है — गलतियां अभी पकड़ी जाती हैं, हफ्तों बाद नहीं।",
            )}
          </p>
          {service.documents.map((req) => {
            const st = docs[req.type];
            const inLocker = digilocker.includes(req.type);
            return (
              <div key={req.type} className="rounded-2xl border bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold">
                      {t(DOC_TYPES[req.type].label)}{" "}
                      {req.required ? <span className="text-destructive">*</span> : <span className="text-xs font-normal text-muted-foreground">({tt("optional", "वैकल्पिक")})</span>}
                    </div>
                    <div className="text-xs text-muted-foreground">{t(req.why)}</div>
                  </div>
                  {st?.status !== "processing" && (
                    <div className="flex flex-wrap gap-2">
                      {inLocker && (
                        <Button size="sm" variant="outline" onClick={() => handleImage(req.type, `/demo-docs/${persona}_${req.type}.jpg`)}>
                          <CloudDownload /> {tt("Fetch from DigiLocker", "डिजिलॉकर से लें")}
                        </Button>
                      )}
                      <label className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-lg border px-2.5 text-[0.8rem] font-medium hover:bg-muted">
                        <Camera className="size-3.5" /> {st?.status === "done" ? tt("Replace", "बदलें") : tt("Upload / photo", "अपलोड / फोटो")}
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImage(req.type, URL.createObjectURL(file));
                            e.target.value = "";
                          }}
                        />
                      </label>
                    </div>
                  )}
                </div>

                {st?.status === "processing" && <Pipeline stage={st.stage ?? 0} local={st.local} />}

                {st?.status === "bad_quality" && st.quality && (
                  <div className="mt-3 flex gap-3 rounded-xl bg-destructive/10 p-3">
                    {st.image && <img src={st.image} alt="" className="h-20 w-28 rounded object-cover" />}
                    <div className="flex-1 text-sm">
                      <div className="flex items-center gap-1 font-medium text-destructive">
                        <AlertTriangle className="size-4" /> {tt("Photo not clear enough", "फोटो पर्याप्त साफ नहीं है")}
                      </div>
                      <ul className="mt-1 text-xs">
                        {st.quality.issues.map((i) => (
                          <li key={i}>• {t(ISSUE_TEXT[i])}</li>
                        ))}
                      </ul>
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        {tt("On-device check", "डिवाइस पर जांच")}: sharpness {st.quality.blurScore} (min 120) · brightness {st.quality.brightness}
                      </div>
                      <button className="mt-2 text-xs underline" onClick={() => verify(req.type, st.image!, st.quality!)}>
                        {tt("Use this photo anyway", "फिर भी यही फोटो उपयोग करें")}
                      </button>
                    </div>
                  </div>
                )}

                {st?.status === "error" && (
                  <div className="mt-3 flex items-center justify-between rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
                    <span>{st.error}</span>
                    {st.image && (
                      <Button size="sm" variant="outline" onClick={() => verify(req.type, st.image!, st.quality!)}>
                        <RefreshCw /> {tt("Retry", "पुनः प्रयास")}
                      </Button>
                    )}
                  </div>
                )}

                {st?.status === "done" && st.result && st.image && (
                  <div className="mt-3">
                    <DocEvidence image={st.image} expectedType={req.type} result={st.result} />
                    <p className="mt-2 text-sm">{lang === "hi" ? st.result.summary?.hi : st.result.summary?.en}</p>
                  </div>
                )}
              </div>
            );
          })}
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(0)}>
              <ArrowLeft /> {tt("Back", "वापस")}
            </Button>
            <Button size="lg" disabled={!requiredDocsDone} onClick={() => setStep(2)}>
              {tt("Next: review", "आगे: जांचें")} <ArrowRight />
            </Button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="space-y-4">
          <div className={`rounded-2xl border p-4 ${issues.length ? "border-warning bg-warning/10" : "border-success/40 bg-success/10"}`}>
            <div className="flex items-center gap-2 font-semibold">
              {issues.length ? <AlertTriangle className="size-5 text-[oklch(0.6_0.15_65)]" /> : <FileCheck2 className="size-5 text-success" />}
              {issues.length
                ? tt(`AI pre-check: ${issues.length} item(s) need attention`, `एआई पूर्व-जांच: ${issues.length} बिंदु पर ध्यान दें`)
                : tt("AI pre-check: all documents match your form", "एआई पूर्व-जांच: सभी दस्तावेज़ आपके फॉर्म से मेल खाते हैं")}
            </div>
            {issues.length > 0 && (
              <>
                <ul className="mt-2 space-y-1 text-sm">
                  {issues.map((c, i) => (
                    <li key={i}>• <b>{c.label}:</b> {c.reason}</li>
                  ))}
                </ul>
                <p className="mt-3 text-sm">
                  {tt(
                    "You can go back and fix it, or submit with an explanation for the officer:",
                    "आप वापस जाकर सुधार सकते हैं, या अधिकारी के लिए स्पष्टीकरण के साथ जमा करें:",
                  )}
                </p>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  placeholder={tt("e.g. My surname changed after marriage; marriage certificate attached at Lok Sewa Kendra.", "जैसे: विवाह के बाद मेरा उपनाम बदला है।")}
                  className="mt-1 w-full rounded-lg border bg-white p-2 text-sm"
                />
              </>
            )}
          </div>

          {minor.length > 0 && (
            <div className="rounded-2xl border bg-white p-4 text-sm">
              <div className="font-medium">{tt("Minor differences — the officer will confirm", "छोटे अंतर — अधिकारी पुष्टि करेंगे")}</div>
              <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                {minor.map((c, i) => (
                  <li key={i}>• <b>{c.label}:</b> {c.reason}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-2xl border bg-white p-4">
            <div className="mb-2 font-semibold">{tt("Your details", "आपका विवरण")}</div>
            <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
              {service.fields.map((f) => (
                <div key={f.key} className="flex justify-between gap-3 border-b border-dashed py-1">
                  <dt className="text-muted-foreground">{t(f.label)}</dt>
                  <dd className="text-right font-medium">{f.options ? t(f.options.find((o) => o.value === form[f.key])?.label ?? { en: form[f.key], hi: form[f.key] }) : form[f.key]}</dd>
                </div>
              ))}
            </dl>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border bg-white p-4 text-sm">
            <input type="checkbox" checked={declaration} onChange={(e) => setDeclaration(e.target.checked)} className="mt-1 size-4" />
            <span>
              <b>{tt("Digital self-declaration", "डिजिटल स्व-घोषणा")}</b> —{" "}
              {tt(
                "I declare that the information given is true. This replaces the notarised affidavit. False information is punishable under law.",
                "मैं घोषणा करता/करती हूं कि दी गई जानकारी सत्य है। यह नोटरी शपथ पत्र का स्थान लेती है। गलत जानकारी देना दंडनीय है।",
              )}
            </span>
          </label>

          <div className="flex items-center justify-between rounded-2xl border bg-white p-4 text-sm">
            <span>{tt("Service fee", "सेवा शुल्क")}</span>
            <span className="font-semibold">₹{service.fee} <span className="text-xs font-normal text-muted-foreground">({tt("UPI — demo, not charged", "यूपीआई — डेमो, शुल्क नहीं लिया जाएगा")})</span></span>
          </div>

          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(1)}>
              <ArrowLeft /> {tt("Back", "वापस")}
            </Button>
            <Button size="lg" disabled={!declaration || submitting} onClick={submit}>
              {submitting ? <Loader2 className="animate-spin" /> : <Sparkles />} {tt("Submit application", "आवेदन जमा करें")}
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}

function Field({ f, value, onChange, fromDigiLocker }: { f: FieldDef; value: string; onChange: (v: string) => void; fromDigiLocker: boolean }) {
  const { t, tt } = useLang();
  const cls = "w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15";
  return (
    <label className={`block ${f.type === "textarea" ? "sm:col-span-2" : ""}`}>
      <span className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {t(f.label)} {f.required && <span className="text-destructive">*</span>}
        {fromDigiLocker && (
          <span className="flex items-center gap-0.5 rounded bg-success/15 px-1 text-[10px] text-[oklch(0.42_0.12_150)]">
            <ShieldCheck className="size-2.5" /> DigiLocker
          </span>
        )}
      </span>
      {f.type === "select" ? (
        <select value={value} onChange={(e) => onChange(e.target.value)} className={cls}>
          <option value="">{tt("Select…", "चुनें…")}</option>
          {f.options!.map((o) => (
            <option key={o.value} value={o.value}>
              {t(o.label)}
            </option>
          ))}
        </select>
      ) : f.type === "textarea" ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={2} className={cls} />
      ) : (
        <input type={f.type} value={value} onChange={(e) => onChange(e.target.value)} className={cls} />
      )}
    </label>
  );
}

function Pipeline({ stage, local }: { stage: number; local?: boolean }) {
  const { tt } = useLang();
  const steps = [
    tt("On-device photo quality check", "डिवाइस पर फोटो गुणवत्ता जांच"),
    local ? tt("Reading document on-device (Tesseract, offline mode)", "डिवाइस पर दस्तावेज़ पढ़ना (ऑफ़लाइन मोड)") : tt("Reading document — NVIDIA Nemotron-Parse OCR", "दस्तावेज़ पढ़ना — एनवीडिया नेमोट्रॉन-पार्स ओसीआर"),
    tt("AI extraction & cross-verification with your form", "एआई द्वारा जानकारी निकालना व फॉर्म से मिलान"),
  ];
  return (
    <ol className="mt-3 space-y-1.5 rounded-xl bg-muted/60 p-3 text-sm">
      {steps.map((s, i) => (
        <li key={i} className={`flex items-center gap-2 ${i > stage ? "text-muted-foreground" : ""}`}>
          {i < stage ? <CheckCircle2 className="size-4 text-success" /> : i === stage ? <Loader2 className="size-4 animate-spin text-primary" /> : <Circle className="size-4" />}
          {i === 1 ? <ScanText className="size-3.5 text-muted-foreground" /> : null}
          {s}
        </li>
      ))}
    </ol>
  );
}

