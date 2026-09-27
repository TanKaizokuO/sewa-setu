import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, asc, count, eq } from "drizzle-orm";
import { Bot, Landmark, UserRound, Settings2, UserCog, FileWarning, Sparkles } from "lucide-react";
import { db, applications, documents, events } from "@/db";
import { currentOfficer } from "@/lib/session";
import { getT } from "@/lib/i18n";
import { getService, DOC_TYPES, type DocType } from "@/lib/services";
import { slaRisk } from "@/lib/risk";
import { STATUS_LABEL, STATUS_CLASS } from "@/lib/status";
import { DocEvidence } from "@/components/doc-evidence";
import { Md } from "@/components/md";
import { ActionPanel } from "./action-panel";
import { LiveRefresh } from "@/components/live-refresh";

const ACTOR_ICON = { citizen: UserRound, ai: Bot, patwari: Landmark, tehsildar: Landmark, system: Settings2 } as const;

export default async function OfficerApplication({ params }: PageProps<"/officer/applications/[id]">) {
  const officer = await currentOfficer();
  if (!officer || officer.role === "admin") redirect("/login");
  const { id } = await params;
  const { t, tt, lang } = await getT();
  const [app] = await db.select().from(applications).where(eq(applications.id, Number(id)));
  if (!app) notFound();
  const service = getService(app.serviceSlug)!;
  const [docs, trail, [depth]] = await Promise.all([
    db.select().from(documents).where(eq(documents.applicationId, app.id)).orderBy(asc(documents.id)),
    db.select().from(events).where(eq(events.applicationId, app.id)).orderBy(asc(events.createdAt), asc(events.id)),
    db.select({ n: count() }).from(applications).where(and(eq(applications.status, app.status), eq(applications.district, app.district))),
  ]);
  const desk = officer.role === "patwari" ? "patwari_review" : "tehsildar_review";
  const atMyDesk = app.status === desk;
  const risk = slaRisk({ submittedAt: app.submittedAt, slaDueAt: app.slaDueAt, status: app.status, aiVerdict: app.aiSummary?.verdict, queueDepth: Math.min(depth.n, 40) });

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <LiveRefresh value={app.aiNote ? "note" : "none"} interval={4000} />
      <Link href="/officer" className="text-sm text-muted-foreground hover:text-primary">
        ← {tt("Back to queue", "कतार पर वापस")}
      </Link>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{app.applicantName}</h1>
          <div className="text-sm text-muted-foreground">
            {t(service.name)} · <span className="font-mono">{app.refNo}</span> · {tt("submitted", "जमा")} {app.submittedAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
          </div>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${STATUS_CLASS[app.status]}`}>{t(STATUS_LABEL[app.status])}</span>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {/* AI drafted note */}
          <section className="rounded-2xl border border-saffron/40 bg-gradient-to-br from-saffron/10 to-card p-5">
            <h2 className="flex items-center gap-2 font-semibold">
              <Sparkles className="size-5 text-saffron" /> {tt("AI pre-verification summary", "एआई पूर्व-सत्यापन सारांश")}
              {app.aiScore != null && (
                <span className="ml-auto rounded-full bg-card px-2 py-0.5 text-xs font-medium ring-1 ring-border">
                  {tt("confidence", "विश्वास")} {Math.round(app.aiScore * 100)}% · {app.aiSummary?.verdict}
                </span>
              )}
            </h2>
            {app.aiNote ? (
              <div className="mt-2">
                <Md text={app.aiNote} />
              </div>
            ) : (
              <p className="mt-2 animate-pulse text-sm text-muted-foreground">{tt("AI is drafting the verification note…", "एआई सत्यापन नोट तैयार कर रहा है…")}</p>
            )}
            {app.aiSummary?.flags && app.aiSummary.flags.length > 0 && (
              <ul className="mt-3 space-y-1 rounded-xl bg-card/70 p-3 text-xs">
                {app.aiSummary.flags.map((f, i) => (
                  <li key={i} className="flex gap-1.5">
                    <FileWarning className="size-3.5 shrink-0 text-destructive" /> {f}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-[11px] text-muted-foreground">
              {tt("AI assists; the officer decides. Every AI decision can be overridden and is audit-logged.", "एआई सहायता करता है; निर्णय अधिकारी का। हर एआई निर्णय बदला जा सकता है और ऑडिट में दर्ज होता है।")}
            </p>
          </section>

          {/* Documents with evidence */}
          <section className="rounded-2xl border bg-card p-5">
            <h2 className="mb-3 font-semibold">{tt("Documents & AI evidence", "दस्तावेज़ और एआई साक्ष्य")}</h2>
            {docs.length === 0 && (
              <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
                {tt("Offline submission — documents verified at the Lok Sewa Kendra counter.", "ऑफ़लाइन आवेदन — दस्तावेज़ लोक सेवा केंद्र काउंटर पर सत्यापित।")}
              </p>
            )}
            <div className="space-y-5">
              {docs.map((d) => (
                <div key={d.id}>
                  <div className="mb-2 text-sm font-medium">{t(DOC_TYPES[d.docType as DocType]?.label ?? { en: d.docType, hi: d.docType })}</div>
                  <DocEvidence
                    image={d.image}
                    expectedType={d.docType as DocType}
                    result={{
                      detectedType: d.detectedType ?? "unknown",
                      extracted: d.extracted ?? {},
                      checks: d.checks ?? [],
                      ocrEngine: d.ocrEngine ?? "",
                      ocrBlocks: d.ocrBlocks ?? undefined,
                      cached: d.cached,
                    }}
                    officer={{ documentId: d.id, canOverride: atMyDesk }}
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Form data */}
          <section className="rounded-2xl border bg-card p-5">
            <h2 className="mb-2 font-semibold">{tt("Application details", "आवेदन विवरण")}</h2>
            <dl className="grid gap-x-6 text-sm sm:grid-cols-2">
              {service.fields.length > 0 && Object.keys(app.formData).length > 0 ? (
                service.fields.map((f) => (
                  <div key={f.key} className="flex justify-between gap-3 border-b border-dashed py-1.5">
                    <dt className="text-muted-foreground">{t(f.label)}</dt>
                    <dd className="text-right font-medium">{app.formData[f.key] || "—"}</dd>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground">{tt("Form captured offline.", "फॉर्म ऑफ़लाइन भरा गया।")}</p>
              )}
            </dl>
          </section>
        </div>

        <div className="space-y-5">
          <ActionPanel
            applicationId={app.id}
            role={officer.role as "patwari" | "tehsildar"}
            atMyDesk={atMyDesk}
            aiNote={app.aiNote ?? ""}
            verdict={app.aiSummary?.verdict ?? null}
          />

          {/* Explainable risk */}
          <section className="rounded-2xl border bg-card p-5">
            <h2 className="font-semibold">{tt("SLA-breach risk", "समय-सीमा उल्लंघन जोखिम")}</h2>
            <div className="mt-1 flex items-baseline gap-2">
              <span className={`text-3xl font-bold ${risk.level === "high" ? "text-destructive" : risk.level === "medium" ? "text-warning-ink" : "text-success"}`}>
                {Math.round(risk.score * 100)}
              </span>
              <span className="text-sm capitalize text-muted-foreground">{risk.level}</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {tt("due", "नियत")} {app.slaDueAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            </div>
            <ul className="mt-3 space-y-2">
              {risk.factors.map((f) => (
                <li key={f.label} className="text-xs">
                  <div className="flex justify-between">
                    <span>{f.label}</span>
                    <span className="text-muted-foreground">
                      {Math.round(f.value * 100)}% × {f.weight}
                    </span>
                  </div>
                  <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${f.value * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* Audit trail */}
          <section className="rounded-2xl border bg-card p-5">
            <h2 className="mb-3 flex items-center gap-2 font-semibold">
              <UserCog className="size-4" /> {tt("Audit trail", "ऑडिट ट्रेल")}
            </h2>
            <ol className="space-y-3">
              {trail.map((e) => {
                const Icon = ACTOR_ICON[e.actor as keyof typeof ACTOR_ICON] ?? Settings2;
                const d = e.detail as { note?: string; citizenNote?: string; model?: string } | null;
                return (
                  <li key={e.id} className="flex gap-2 text-xs">
                    <Icon className={`mt-0.5 size-3.5 shrink-0 ${e.actor === "ai" ? "text-saffron" : e.kind === "override" ? "text-primary" : "text-muted-foreground"}`} />
                    <div>
                      <div className="font-medium">{lang === "hi" ? e.message.hi : e.message.en}</div>
                      <div className="text-muted-foreground">
                        {e.actorName ?? e.actor} · {e.createdAt.toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                        {d?.model ? ` · ${d.model}` : ""}
                      </div>
                      {d?.note && <div className="italic text-muted-foreground">“{d.note}”</div>}
                      {d?.citizenNote && <div className="italic text-muted-foreground">{tt("Citizen", "नागरिक")}: “{d.citizenNote}”</div>}
                    </div>
                  </li>
                );
              })}
              {trail.length === 0 && <li className="text-xs text-muted-foreground">{tt("Legacy record.", "पुराना अभिलेख।")}</li>}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}
