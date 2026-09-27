import Link from "next/link";
import { sql } from "drizzle-orm";
import { ArrowRight, FileSearch, ScanText, Workflow, BellRing, MessageSquareWarning, BarChart3, Mic, ShieldCheck } from "lucide-react";
import { db, applications } from "@/db";
import { getT } from "@/lib/i18n";
import { SERVICES } from "@/lib/services";
import { HeroSearch } from "@/components/hero-search";
import { ServiceCard } from "@/components/service-card";
import { buttonVariants } from "@/components/ui/button";

export default async function Home() {
  const { tt, t } = await getT();
  const [stats] = await db
    .select({
      total: sql<number>`count(*)::int`,
      decided: sql<number>`count(*) filter (where decided_at is not null)::int`,
      withinSla: sql<number>`count(*) filter (where decided_at is not null and decided_at <= sla_due_at)::int`,
      avgDays: sql<number>`round(avg(extract(epoch from (decided_at - submitted_at)) / 86400) filter (where decided_at is not null)::numeric, 1)::float`,
    })
    .from(applications);

  const popular = SERVICES.filter((s) => s.popular).slice(0, 6);
  const steps = [
    { icon: Mic, en: "Ask in Hindi or English — by voice or text", hi: "हिंदी या अंग्रेज़ी में पूछें — बोलकर या लिखकर" },
    { icon: FileSearch, en: "AI finds the right service & checks eligibility", hi: "एआई सही सेवा ढूंढता है और पात्रता जांचता है" },
    { icon: ScanText, en: "Upload a photo — AI reads & verifies documents", hi: "फोटो अपलोड करें — एआई दस्तावेज़ पढ़कर सत्यापित करता है" },
    { icon: BellRing, en: "Track live, get notified, download certificate", hi: "लाइव ट्रैक करें, सूचना पाएं, प्रमाण पत्र डाउनलोड करें" },
  ];
  const features = [
    { icon: ScanText, en: "OCR + document intelligence", hi: "ओसीआर + दस्तावेज़ इंटेलिजेंस", d: { en: "NVIDIA Nemotron-Parse reads Hindi & English documents; AI cross-checks them against your form before you submit.", hi: "एनवीडिया नेमोट्रॉन-पार्स हिंदी व अंग्रेज़ी दस्तावेज़ पढ़ता है; जमा करने से पहले एआई फॉर्म से मिलान करता है।" } },
    { icon: Workflow, en: "Automated workflows", hi: "स्वचालित कार्यप्रवाह", d: { en: "AI pre-verification drafts the Patwari note; cases are routed and prioritised by predicted SLA risk.", hi: "एआई पूर्व-सत्यापन पटवारी नोट तैयार करता है; मामले अनुमानित देरी जोखिम के अनुसार प्राथमिकता पाते हैं।" } },
    { icon: MessageSquareWarning, en: "Smart grievances", hi: "स्मार्ट शिकायत", d: { en: "Describe a problem in your words — AI classifies it, sets priority and routes it to the right department.", hi: "अपने शब्दों में समस्या बताएं — एआई वर्गीकृत कर प्राथमिकता तय करता है और सही विभाग को भेजता है।" } },
    { icon: BarChart3, en: "Analytics & prediction", hi: "विश्लेषण और पूर्वानुमान", d: { en: "District dashboards expose bottlenecks and forecast demand so officers act before deadlines slip.", hi: "जिला डैशबोर्ड अड़चनें दिखाते हैं और मांग का पूर्वानुमान लगाते हैं ताकि समय-सीमा न चूके।" } },
    { icon: ShieldCheck, en: "Explainable & accountable AI", hi: "पारदर्शी और जवाबदेह एआई", d: { en: "Every AI decision shows its reason and confidence; officers can override, and every action is audit-logged.", hi: "हर एआई निर्णय का कारण और विश्वास स्तर दिखता है; अधिकारी बदल सकते हैं और हर कार्रवाई दर्ज होती है।" } },
    { icon: BellRing, en: "Real-time tracking", hi: "रीयल-टाइम ट्रैकिंग", d: { en: "A live timeline of every step, with instant notifications — no more repeated office visits.", hi: "हर चरण की लाइव समयरेखा और तुरंत सूचना — बार-बार दफ्तर जाने की ज़रूरत नहीं।" } },
  ];

  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-br from-[oklch(0.36_0.13_258)] via-[oklch(0.42_0.13_255)] to-[oklch(0.48_0.12_235)] text-white">
        <div className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-saffron/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-10 size-96 rounded-full bg-success/20 blur-3xl" />
        <div className="relative mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-14 md:py-20">
          <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-medium">
            {tt("Chhattisgarh · AI-powered citizen services", "छत्तीसगढ़ · एआई-संचालित नागरिक सेवाएं")}
          </span>
          <h1 className="max-w-3xl text-3xl font-bold leading-tight md:text-5xl">
            {tt("Government services, as easy as asking.", "सरकारी सेवाएं, पूछने जितनी आसान।")}
          </h1>
          <p className="max-w-2xl text-base text-white/80 md:text-lg">
            {tt(
              "Speak or type your need. Sewa Setu finds the service, fills your form from DigiLocker, verifies your documents with AI and tracks everything live.",
              "अपनी ज़रूरत बोलें या लिखें। सेवा सेतु सेवा ढूंढता है, डिजिलॉकर से फॉर्म भरता है, एआई से दस्तावेज़ जांचता है और सब कुछ लाइव ट्रैक करता है।",
            )}
          </p>
          <HeroSearch />
        </div>
      </section>

      <section className="mx-auto -mt-8 grid max-w-6xl grid-cols-2 gap-3 px-4 md:grid-cols-4">
        {[
          { v: String(SERVICES.length), l: tt("services online", "ऑनलाइन सेवाएं") },
          { v: stats.total.toLocaleString("en-IN"), l: tt("applications (90 days)", "आवेदन (90 दिन)") },
          { v: `${Math.round((stats.withinSla / Math.max(1, stats.decided)) * 100)}%`, l: tt("delivered within SLA", "समय-सीमा में निपटारा") },
          { v: `${stats.avgDays} ${tt("days", "दिन")}`, l: tt("average turnaround", "औसत निपटान समय") },
        ].map((s) => (
          <div key={s.l} className="relative rounded-2xl border bg-card p-4 shadow-sm">
            <div className="text-2xl font-bold text-primary">{s.v}</div>
            <div className="text-xs text-muted-foreground">{s.l}</div>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="mb-5 flex items-end justify-between">
          <h2 className="text-xl font-bold">{tt("Popular services", "लोकप्रिय सेवाएं")}</h2>
          <Link href="/services" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            {tt("All services", "सभी सेवाएं")} <ArrowRight />
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {popular.map((s) => (
            <ServiceCard key={s.slug} service={s} />
          ))}
        </div>
      </section>

      <section className="border-y bg-card">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="mb-6 text-xl font-bold">{tt("How it works", "यह कैसे काम करता है")}</h2>
          <ol className="grid gap-4 md:grid-cols-4">
            {steps.map((s, i) => (
              <li key={i} className="rounded-2xl bg-secondary/60 p-5">
                <div className="mb-3 flex items-center gap-2">
                  <span className="grid size-7 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{i + 1}</span>
                  <s.icon className="size-5 text-primary" />
                </div>
                <p className="text-sm font-medium">{t(s)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="mb-6 text-xl font-bold">{tt("What makes it next-generation", "इसे अगली पीढ़ी का क्या बनाता है")}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.en} className="rounded-2xl border bg-card p-5">
              <f.icon className="mb-3 size-6 text-saffron" />
              <div className="font-semibold">{t(f)}</div>
              <p className="mt-1 text-sm text-muted-foreground">{t(f.d)}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
