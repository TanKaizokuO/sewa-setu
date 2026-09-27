import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, XCircle, Clock, IndianRupee, Building2, FileText, Sparkles, Workflow, ShieldCheck } from "lucide-react";
import { getT } from "@/lib/i18n";
import { currentCitizen } from "@/lib/session";
import { getService, checkEligibility, DOC_TYPES } from "@/lib/services";
import { buttonVariants } from "@/components/ui/button";

const STAGE_LABEL = {
  ai: { en: "AI pre-verification (instant)", hi: "एआई पूर्व-सत्यापन (तुरंत)" },
  patwari: { en: "Patwari field report", hi: "पटवारी प्रतिवेदन" },
  tehsildar: { en: "Tehsildar approval & e-certificate", hi: "तहसीलदार अनुमोदन व ई-प्रमाण पत्र" },
};

export default async function ServiceDetail({ params }: PageProps<"/services/[slug]">) {
  const { slug } = await params;
  const s = getService(slug);
  if (!s) notFound();
  const [{ t, tt }, citizen] = await Promise.all([getT(), currentCitizen()]);
  const elig = citizen && s.eligibility.length ? checkEligibility(s, citizen) : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/services" className="text-sm text-muted-foreground hover:text-primary">
        ← {tt("All services", "सभी सेवाएं")}
      </Link>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t(s.name)}</h1>
          <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <Building2 className="size-4" /> {t(s.department)}
          </p>
        </div>
        {s.fullFlow ? (
          <Link href={citizen ? `/apply/${s.slug}` : `/login?next=/apply/${s.slug}`} className={buttonVariants({ size: "lg" })}>
            <Sparkles /> {tt("Apply online", "ऑनलाइन आवेदन करें")}
          </Link>
        ) : (
          <span className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
            {tt("Apply at your nearest Lok Sewa Kendra (online flow coming soon)", "नज़दीकी लोक सेवा केंद्र पर आवेदन करें (ऑनलाइन सुविधा जल्द)")}
          </span>
        )}
      </div>
      <p className="mt-4 text-muted-foreground">{t(s.summary)}</p>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <Stat icon={<Clock className="size-4" />} label={tt("Guaranteed in", "गारंटी समय")} value={`${s.slaDays} ${tt("days", "दिन")}`} />
        <Stat icon={<IndianRupee className="size-4" />} label={tt("Fee", "शुल्क")} value={s.fee ? `₹${s.fee}` : tt("Free", "निःशुल्क")} />
        <Stat icon={<Workflow className="size-4" />} label={tt("Steps", "चरण")} value={String(s.stages.length)} />
      </div>

      <section className="mt-6 rounded-2xl border bg-card p-5">
        <h2 className="font-semibold">{tt("Who can apply", "कौन आवेदन कर सकता है")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t(s.eligibilityText)}</p>
        {elig && (
          <div className={`mt-3 rounded-xl p-3 text-sm ${elig.eligible ? "bg-success/10" : "bg-destructive/10"}`}>
            <div className="flex items-center gap-1.5 font-medium">
              {elig.eligible ? <CheckCircle2 className="size-4 text-success" /> : <XCircle className="size-4 text-destructive" />}
              {elig.eligible
                ? tt("Based on your DigiLocker profile, you are eligible.", "आपकी डिजिलॉकर प्रोफ़ाइल के अनुसार आप पात्र हैं।")
                : tt("Based on your profile, you may not be eligible.", "आपकी प्रोफ़ाइल के अनुसार आप शायद पात्र नहीं हैं।")}
            </div>
            <ul className="mt-1 text-xs text-muted-foreground">
              {elig.reasons.map((r, i) => (
                <li key={i}>{t(r)}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {s.documents.length > 0 && (
        <section className="mt-4 rounded-2xl border bg-card p-5">
          <h2 className="font-semibold">{tt("Documents", "दस्तावेज़")}</h2>
          <ul className="mt-2 space-y-2">
            {s.documents.map((d) => (
              <li key={d.type} className="flex items-start gap-2 text-sm">
                <FileText className="mt-0.5 size-4 text-primary" />
                <span>
                  <span className="font-medium">{t(DOC_TYPES[d.type].label)}</span>
                  {!d.required && <span className="ml-1 text-xs text-muted-foreground">({tt("optional", "वैकल्पिक")})</span>}
                  <span className="block text-xs text-muted-foreground">{t(d.why)}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-xs">
            <ShieldCheck className="size-4 text-primary" />
            {tt(
              "No affidavit or notary needed — a digital self-declaration replaces it. Documents can be fetched from DigiLocker.",
              "शपथ पत्र या नोटरी की ज़रूरत नहीं — डिजिटल स्व-घोषणा पर्याप्त है। दस्तावेज़ डिजिलॉकर से लिए जा सकते हैं।",
            )}
          </p>
        </section>
      )}

      <section className="mt-4 rounded-2xl border bg-card p-5">
        <h2 className="font-semibold">{tt("How your application moves", "आपका आवेदन कैसे आगे बढ़ता है")}</h2>
        <ol className="mt-3 flex flex-col gap-2 md:flex-row">
          {s.stages.map((st, i) => (
            <li key={st} className="flex flex-1 items-center gap-2 rounded-xl bg-muted/60 px-3 py-2 text-sm">
              <span className="grid size-6 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{i + 1}</span>
              {t(STAGE_LABEL[st])}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        {icon} {label}
      </div>
      <div className="mt-1 font-semibold">{value}</div>
    </div>
  );
}
