import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { Bell, Sparkles, MessageSquareWarning, FileText, ChevronRight, CheckCircle2 } from "lucide-react";
import { db, applications, notifications } from "@/db";
import { currentCitizen } from "@/lib/session";
import { getT } from "@/lib/i18n";
import { getService, recommendFor, checkEligibility, SERVICES } from "@/lib/services";
import { STATUS_LABEL, STATUS_CLASS, progressIndex } from "@/lib/status";
import { LiveRefresh } from "@/components/live-refresh";
import { MarkRead } from "./mark-read";
import { buttonVariants } from "@/components/ui/button";

export default async function Dashboard() {
  const citizen = await currentCitizen();
  if (!citizen) redirect("/login?next=/dashboard");
  const { t, tt, lang } = await getT();
  const [apps, notes] = await Promise.all([
    db.select().from(applications).where(eq(applications.citizenId, citizen.id)).orderBy(desc(applications.submittedAt)),
    db.select().from(notifications).where(eq(notifications.citizenId, citizen.id)).orderBy(desc(notifications.createdAt)).limit(8),
  ]);
  const recs = recommendFor(citizen, apps.map((a) => a.serviceSlug));
  const unread = notes.filter((n) => !n.read).length;
  const latest = notes[0];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <LiveRefresh value={String(latest?.id ?? 0)} messages={latest ? { [String(latest.id)]: `${t(latest.title)} — ${t(latest.body)}` } : {}} />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{tt(`Namaste, ${citizen.name.split(" ")[0]}`, `नमस्ते, ${citizen.nameHi.split(" ")[0]} जी`)} 🙏</h1>
          <p className="text-sm text-muted-foreground">
            {citizen.village}, {citizen.tehsil}, {citizen.district} · {tt("Aadhaar", "आधार")} {citizen.aadhaarMasked}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/assistant" className={buttonVariants()}>
            <Sparkles /> {tt("Ask Sahayak", "सहायक से पूछें")}
          </Link>
          <Link href="/grievance" className={buttonVariants({ variant: "outline" })}>
            <MessageSquareWarning /> {tt("Grievance", "शिकायत")}
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-2xl border bg-white p-5">
            <h2 className="mb-3 font-semibold">{tt("My applications", "मेरे आवेदन")}</h2>
            {apps.length === 0 ? (
              <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                {tt("No applications yet. Ask the Sahayak what you need, or start with a popular service.", "अभी कोई आवेदन नहीं। सहायक से पूछें या किसी लोकप्रिय सेवा से शुरू करें।")}
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  {SERVICES.filter((s) => s.fullFlow).map((s) => (
                    <Link key={s.slug} href={`/apply/${s.slug}`} className={buttonVariants({ size: "sm", variant: "outline" })}>
                      {t(s.name)}
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <ul className="divide-y">
                {apps.map((a) => {
                  const s = getService(a.serviceSlug)!;
                  const p = progressIndex(a.status);
                  return (
                    <li key={a.id}>
                      <Link href={`/track/${a.refNo}`} className="flex items-center gap-3 py-3 hover:bg-muted/40">
                        <FileText className="size-5 shrink-0 text-primary" />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{t(s.name)}</span>
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_CLASS[a.status]}`}>{t(STATUS_LABEL[a.status])}</span>
                          </div>
                          <div className="font-mono text-xs text-muted-foreground">{a.refNo}</div>
                          <div className="mt-1.5 flex gap-0.5">
                            {[0, 1, 2, 3, 4].map((i) => (
                              <span key={i} className={`h-1 flex-1 rounded-full ${i < p ? (a.status === "rejected" ? "bg-destructive" : "bg-success") : i === p ? "bg-primary" : "bg-muted"}`} />
                            ))}
                          </div>
                        </div>
                        <ChevronRight className="size-4 text-muted-foreground" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-saffron/40 bg-gradient-to-br from-saffron/10 to-white p-5">
            <h2 className="flex items-center gap-2 font-semibold">
              <Sparkles className="size-5 text-saffron" /> {tt("Recommended for you", "आपके लिए सुझाव")}
            </h2>
            <p className="text-xs text-muted-foreground">
              {tt("Based on your DigiLocker profile — you appear eligible but haven't applied yet.", "आपकी डिजिलॉकर प्रोफ़ाइल के आधार पर — आप पात्र दिखते हैं पर अभी आवेदन नहीं किया।")}
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {recs.length === 0 && <p className="text-sm text-muted-foreground">{tt("No new recommendations right now.", "अभी कोई नया सुझाव नहीं।")}</p>}
              {recs.map((s) => (
                <Link key={s.slug} href={`/services/${s.slug}`} className="rounded-xl border bg-white p-3 transition hover:border-primary">
                  <div className="font-medium">{t(s.name)}</div>
                  <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                    {checkEligibility(s, citizen).reasons.map((r, i) => (
                      <li key={i} className="flex items-center gap-1">
                        <CheckCircle2 className="size-3 text-success" /> {t(r).replace("✓ ", "")}
                      </li>
                    ))}
                  </ul>
                </Link>
              ))}
            </div>
          </section>
        </div>

        <aside className="rounded-2xl border bg-white p-5 lg:self-start">
          <h2 className="mb-3 flex items-center gap-2 font-semibold">
            <Bell className="size-4" /> {tt("Notifications", "सूचनाएं")}
            {unread > 0 && <span className="rounded-full bg-destructive px-1.5 text-xs text-white">{unread}</span>}
          </h2>
          {unread > 0 && <MarkRead />}
          {notes.length === 0 && <p className="text-sm text-muted-foreground">{tt("Nothing yet.", "अभी कुछ नहीं।")}</p>}
          <ul className="space-y-3">
            {notes.map((n) => (
              <li key={n.id} className={`rounded-xl p-3 text-sm ${n.read ? "bg-muted/40" : "bg-primary/5 ring-1 ring-primary/20"}`}>
                <div className="font-medium">{lang === "hi" ? n.title.hi : n.title.en}</div>
                <div className="text-xs text-muted-foreground">{lang === "hi" ? n.body.hi : n.body.en}</div>
                <div className="mt-1 text-[10px] text-muted-foreground">{n.createdAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</div>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
