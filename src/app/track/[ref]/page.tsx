import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { Sparkles, UserRound, Landmark, Bot, Settings2, Download, CalendarClock, AlertTriangle, CheckCircle2, PartyPopper } from "lucide-react";
import { db, applications, events, citizens } from "@/db";
import { getT } from "@/lib/i18n";
import { getService, recommendFor } from "@/lib/services";
import { STATUS_LABEL, STATUS_CLASS, progressIndex } from "@/lib/status";
import { LiveRefresh } from "@/components/live-refresh";
import { buttonVariants } from "@/components/ui/button";

const ACTOR_ICON = { citizen: UserRound, ai: Bot, patwari: Landmark, tehsildar: Landmark, system: Settings2 } as const;

export default async function TrackPage({ params, searchParams }: PageProps<"/track/[ref]">) {
  const { ref } = await params;
  const { new: isNew } = await searchParams;
  const { t, tt, lang } = await getT();
  const [app] = await db.select().from(applications).where(eq(applications.refNo, ref));
  if (!app) notFound();
  const service = getService(app.serviceSlug)!;
  const timeline = await db.select().from(events).where(eq(events.applicationId, app.id)).orderBy(asc(events.createdAt), asc(events.id));
  const [citizen] = app.citizenId ? await db.select().from(citizens).where(eq(citizens.id, app.citizenId)) : [];

  const done = app.status === "approved" || app.status === "rejected";
  const msLeft = app.slaDueAt.getTime() - Date.now();
  const daysLeft = Math.ceil(msLeft / 86400000);
  const pIdx = progressIndex(app.status);
  const steps = [
    tt("Submitted", "जमा"),
    tt("AI verified", "एआई सत्यापित"),
    tt("Patwari", "पटवारी"),
    tt("Tehsildar", "तहसीलदार"),
    app.status === "rejected" ? tt("Rejected", "अस्वीकृत") : tt("Certificate", "प्रमाण पत्र"),
  ];

  const recs = app.status === "approved" && citizen ? recommendFor(citizen, [app.serviceSlug]).slice(0, 3) : [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      {!done && (
        <LiveRefresh
          value={app.status}
          messages={{
            tehsildar_review: tt("✅ Patwari verified your application", "✅ पटवारी ने आपका आवेदन सत्यापित किया"),
            approved: tt("🎉 Approved! Your certificate is ready.", "🎉 स्वीकृत! आपका प्रमाण पत्र तैयार है।"),
            correction_needed: tt("⚠️ The officer needs a correction", "⚠️ अधिकारी को सुधार चाहिए"),
            rejected: tt("Application was rejected", "आवेदन अस्वीकृत हुआ"),
          }}
        />
      )}
      {done && <LiveRefresh value={app.status} interval={15000} />}

      {isNew && (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-success/40 bg-success/10 p-4">
          <PartyPopper className="size-6 shrink-0 text-success" />
          <div className="text-sm">
            <div className="font-semibold">{tt("Application submitted successfully!", "आवेदन सफलतापूर्वक जमा हुआ!")}</div>
            {tt(
              `Save your reference number ${app.refNo}. You'll be notified at every step — no need to visit any office.`,
              `अपना संदर्भ क्रमांक ${app.refNo} सहेजें। हर चरण पर आपको सूचना मिलेगी — किसी दफ्तर जाने की ज़रूरत नहीं।`,
            )}
          </div>
        </div>
      )}

      <div className="rounded-2xl border bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xs text-muted-foreground">{tt("Reference no.", "संदर्भ क्रमांक")}</div>
            <div className="font-mono text-lg font-semibold">{app.refNo}</div>
            <h1 className="mt-1 text-xl font-bold">{t(service.name)}</h1>
            <div className="text-sm text-muted-foreground">{app.applicantName} · {app.district}</div>
          </div>
          <span className={`rounded-full px-3 py-1 text-sm font-semibold ${STATUS_CLASS[app.status]}`}>{t(STATUS_LABEL[app.status])}</span>
        </div>

        <div className="mt-5 grid grid-cols-5 gap-1">
          {steps.map((s, i) => (
            <div key={i} className="text-center">
              <div
                className={`h-2 rounded-full ${
                  i < pIdx ? (app.status === "rejected" && i === 4 ? "bg-destructive" : "bg-success") : i === pIdx ? "animate-pulse bg-primary" : "bg-muted"
                }`}
              />
              <div className={`mt-1 text-[11px] ${i <= pIdx ? "font-medium" : "text-muted-foreground"}`}>{s}</div>
            </div>
          ))}
        </div>

        {!done && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-secondary px-3 py-2 text-sm">
            <CalendarClock className="size-4 text-primary" />
            {daysLeft >= 0
              ? tt(`Guaranteed by ${app.slaDueAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} — ${daysLeft} day(s) left under the Lok Sewa Guarantee Act`, `लोक सेवा गारंटी अधिनियम के तहत ${app.slaDueAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} तक — ${daysLeft} दिन शेष`)
              : tt(`SLA exceeded by ${-daysLeft} day(s) — escalated automatically`, `समय-सीमा ${-daysLeft} दिन से पार — स्वतः उच्च अधिकारी को भेजा गया`)}
          </div>
        )}

        {app.status === "correction_needed" && app.officerNote && (
          <div className="mt-4 flex gap-2 rounded-xl bg-warning/15 p-3 text-sm">
            <AlertTriangle className="size-4 shrink-0 text-[oklch(0.6_0.15_65)]" />
            <div>
              <b>{tt("Officer's request", "अधिकारी का अनुरोध")}:</b> {app.officerNote}
            </div>
          </div>
        )}

        {app.status === "approved" && app.certificateNo && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-success/10 p-4">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="size-5 text-success" />
              <span>
                <b>{tt("Certificate issued", "प्रमाण पत्र जारी")}</b> · {app.certificateNo}
                <span className="block text-xs text-muted-foreground">
                  {tt("Digitally signed, QR-verifiable. Also pushed to your DigiLocker.", "डिजिटल हस्ताक्षरित, क्यूआर से सत्यापन योग्य। आपके डिजिलॉकर में भी भेजा गया।")}
                </span>
              </span>
            </div>
            <Link href={`/certificate/${app.certificateNo}`} className={buttonVariants()}>
              <Download /> {tt("Download certificate", "प्रमाण पत्र डाउनलोड करें")}
            </Link>
          </div>
        )}
        {app.status === "rejected" && app.officerNote && (
          <div className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm">
            <b>{tt("Reason", "कारण")}:</b> {app.officerNote}
          </div>
        )}
      </div>

      <div className="mt-4 rounded-2xl border bg-white p-5">
        <h2 className="mb-3 font-semibold">{tt("Live timeline", "लाइव समयरेखा")}</h2>
        <ol className="relative space-y-4 border-l-2 border-muted pl-5">
          {timeline.map((e) => {
            const Icon = ACTOR_ICON[e.actor as keyof typeof ACTOR_ICON] ?? Settings2;
            const detail = e.detail as { flags?: string[]; note?: string; citizenNote?: string; model?: string } | null;
            return (
              <li key={e.id} className="relative">
                <span className={`absolute -left-[31px] grid size-6 place-items-center rounded-full border-2 border-white ${e.actor === "ai" ? "bg-saffron" : e.kind === "override" ? "bg-primary" : "bg-success"} text-white`}>
                  <Icon className="size-3" />
                </span>
                <div className="text-sm font-medium">{lang === "hi" ? e.message.hi : e.message.en}</div>
                <div className="text-xs text-muted-foreground">
                  {e.actorName ? `${e.actorName} · ` : ""}
                  {e.createdAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                </div>
                {detail?.flags && detail.flags.length > 0 && (
                  <ul className="mt-1 text-xs text-muted-foreground">
                    {detail.flags.map((f, i) => (
                      <li key={i}>• {f}</li>
                    ))}
                  </ul>
                )}
                {detail?.note && <div className="mt-1 text-xs italic text-muted-foreground">“{detail.note}”</div>}
                {detail?.citizenNote && <div className="mt-1 text-xs italic text-muted-foreground">{tt("Citizen's note", "नागरिक का नोट")}: “{detail.citizenNote}”</div>}
              </li>
            );
          })}
          {!done && (
            <li className="relative text-sm text-muted-foreground">
              <span className="absolute -left-[29px] top-1 size-4 animate-ping rounded-full bg-primary/40" />
              {tt("Waiting for the next step… this page updates live.", "अगले चरण की प्रतीक्षा… यह पेज अपने आप अपडेट होता है।")}
            </li>
          )}
        </ol>
      </div>

      {recs.length > 0 && (
        <div className="mt-4 rounded-2xl border border-saffron/40 bg-saffron/10 p-5">
          <h2 className="flex items-center gap-2 font-semibold">
            <Sparkles className="size-5 text-saffron" /> {tt("You may also qualify for", "आप इनके लिए भी पात्र हो सकते हैं")}
          </h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {recs.map((s) => (
              <Link key={s.slug} href={`/services/${s.slug}`} className="rounded-xl border bg-white p-3 hover:border-primary">
                <div className="font-medium">{t(s.name)}</div>
                <div className="text-xs text-muted-foreground">{t(s.eligibilityText)}</div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
