import Link from "next/link";
import { redirect } from "next/navigation";
import { and, eq, or } from "drizzle-orm";
import { AlertTriangle, Sparkles, Timer, Gauge, ChevronRight } from "lucide-react";
import { db, applications } from "@/db";
import { currentOfficer } from "@/lib/session";
import { getT } from "@/lib/i18n";
import { getService } from "@/lib/services";
import { slaRisk } from "@/lib/risk";
import { LiveRefresh } from "@/components/live-refresh";

export default async function OfficerQueue() {
  const officer = await currentOfficer();
  if (!officer || officer.role === "admin") redirect("/login");
  const { t, tt } = await getT();
  const desk = officer.role === "patwari" ? "patwari_review" : "tehsildar_review";

  // Desk queue: this officer's district plus every live (online) submission for the demo
  const rows = await db
    .select()
    .from(applications)
    .where(and(eq(applications.status, desk), or(eq(applications.district, officer.district), eq(applications.isSeed, false))));

  const queue = rows
    .map((a) => ({
      a,
      risk: slaRisk({ submittedAt: a.submittedAt, slaDueAt: a.slaDueAt, status: a.status, aiVerdict: a.aiSummary?.verdict, queueDepth: rows.length }),
    }))
    .sort((x, y) => y.risk.score - x.risk.score);

  const high = queue.filter((q) => q.risk.level === "high").length;
  const clear = queue.filter((q) => q.a.aiSummary?.verdict === "clear").length;
  const live = queue.filter((q) => !q.a.isSeed).length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <LiveRefresh value={String(live)} messages={{ [String(live)]: tt("New application received at your desk", "आपकी डेस्क पर नया आवेदन आया") }} interval={4000} />
      <h1 className="text-2xl font-bold">
        {officer.role === "patwari" ? tt("Patwari desk", "पटवारी डेस्क") : tt("Tehsildar desk", "तहसीलदार डेस्क")} · {officer.tehsil}, {officer.district}
      </h1>
      <p className="text-sm text-muted-foreground">
        {tt("Sorted by predicted SLA-breach risk. AI has pre-verified every document.", "अनुमानित समय-सीमा उल्लंघन जोखिम के अनुसार क्रमबद्ध। एआई ने हर दस्तावेज़ पूर्व-सत्यापित किया है।")}
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi icon={<Timer className="size-4" />} label={tt("At my desk", "मेरी डेस्क पर")} value={queue.length} />
        <Kpi icon={<AlertTriangle className="size-4 text-destructive" />} label={tt("High breach risk", "उच्च जोखिम")} value={high} tone="destructive" />
        <Kpi icon={<Sparkles className="size-4 text-saffron" />} label={tt("AI: all clear", "एआई: सब सही")} value={clear} />
        <Kpi icon={<Gauge className="size-4" />} label={tt("Online (new)", "ऑनलाइन (नए)")} value={live} />
      </div>

      <div className="mt-5 overflow-x-auto rounded-2xl border bg-white">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5">{tt("SLA risk", "जोखिम")}</th>
              <th className="px-4 py-2.5">{tt("Application", "आवेदन")}</th>
              <th className="px-4 py-2.5">{tt("Service", "सेवा")}</th>
              <th className="px-4 py-2.5">{tt("Due", "नियत तिथि")}</th>
              <th className="px-4 py-2.5">{tt("AI pre-verification", "एआई पूर्व-सत्यापन")}</th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y">
            {queue.map(({ a, risk }) => {
              const s = getService(a.serviceSlug)!;
              const daysLeft = Math.ceil((a.slaDueAt.getTime() - Date.now()) / 86400000);
              const v = a.aiSummary?.verdict;
              return (
                <tr key={a.id} className={`hover:bg-muted/30 ${!a.isSeed ? "bg-primary/[0.03]" : ""}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`grid size-9 place-items-center rounded-lg text-xs font-bold ${
                          risk.level === "high" ? "bg-destructive/15 text-destructive" : risk.level === "medium" ? "bg-warning/20 text-[oklch(0.5_0.13_60)]" : "bg-success/15 text-[oklch(0.42_0.12_150)]"
                        }`}
                      >
                        {Math.round(risk.score * 100)}
                      </span>
                      <span className="text-xs capitalize text-muted-foreground">{risk.level}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">
                      {a.applicantName}{" "}
                      {!a.isSeed && <span className="ml-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-white">{tt("ONLINE", "ऑनलाइन")}</span>}
                    </div>
                    <div className="font-mono text-xs text-muted-foreground">{a.refNo}</div>
                  </td>
                  <td className="px-4 py-3">{t(s.name)}</td>
                  <td className={`px-4 py-3 text-xs ${daysLeft < 0 ? "font-semibold text-destructive" : daysLeft <= 1 ? "text-[oklch(0.55_0.15_60)]" : ""}`}>
                    {daysLeft < 0 ? tt(`${-daysLeft}d overdue`, `${-daysLeft} दिन विलंब`) : tt(`${daysLeft}d left`, `${daysLeft} दिन शेष`)}
                  </td>
                  <td className="px-4 py-3">
                    {v ? (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          v === "clear" ? "bg-success/15 text-[oklch(0.42_0.12_150)]" : v === "review" ? "bg-warning/20 text-[oklch(0.5_0.13_60)]" : "bg-destructive/10 text-destructive"
                        }`}
                      >
                        {v === "clear" ? tt("All clear", "सब सही") : v === "review" ? tt("Review", "समीक्षा") : tt("Mismatch", "विसंगति")} · {Math.round((a.aiScore ?? 0) * 100)}%
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/officer/applications/${a.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                      {tt("Open", "खोलें")} <ChevronRight className="size-4" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {queue.length === 0 && <p className="p-8 text-center text-muted-foreground">{tt("Queue is empty 🎉", "कतार खाली है 🎉")}</p>}
      </div>
    </div>
  );
}

function Kpi({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone?: "destructive" }) {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon} {label}
      </div>
      <div className={`mt-1 text-2xl font-bold ${tone === "destructive" ? "text-destructive" : ""}`}>{value}</div>
    </div>
  );
}
