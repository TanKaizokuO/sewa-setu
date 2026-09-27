import { redirect } from "next/navigation";
import { TrendingUp, Timer, Gauge, Sparkles, Hourglass, MessageSquareWarning, AlertTriangle, MapPin } from "lucide-react";
import { currentOfficer } from "@/lib/session";
import { getT } from "@/lib/i18n";
import { getAnalytics } from "@/lib/analytics";
import { TrendChart, HBar } from "@/components/charts";
import { AiBriefing } from "./ai-briefing";

export default async function AnalyticsPage() {
  const officer = await currentOfficer();
  if (!officer) redirect("/login");
  const { tt } = await getT();
  const a = await getAnalytics();
  const sla = Math.round((a.kpi.within / Math.max(1, a.kpi.decided)) * 100);
  const aiClear = Math.round((a.kpi.ai_clear / Math.max(1, a.kpi.ai_total)) * 100);
  const stateBreach = Math.round(a.byDistrict.reduce((s, d) => s + d.breach_rate * d.total, 0) / Math.max(1, a.byDistrict.reduce((s, d) => s + d.total, 0)));
  const growth = Math.round(((a.next7 - a.prev7) / Math.max(1, a.prev7)) * 100);

  const summary = {
    applications_90d: a.kpi.total,
    sla_compliance_pct: sla,
    avg_turnaround_days: a.kpi.avg_days,
    pending: a.kpi.pending,
    ai_auto_clear_pct: aiClear,
    forecast_next_7_days: a.next7,
    last_7_days: a.prev7,
    district_breach_rates: a.byDistrict.map((d) => ({ d: d.district, breach_pct: d.breach_rate, avg_days: d.avg_days, pending: d.pending })),
    predicted_breaches_next_7d: a.predicted.filter((p) => p.atRisk > 0),
    grievance_hotspots: a.hotspots,
    open_grievances: a.griev.open,
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">{tt("Service delivery analytics", "सेवा प्रदाय विश्लेषण")}</h1>
          <p className="text-sm text-muted-foreground">{tt("Chhattisgarh · last 90 days · live from the Sewa Setu database", "छत्तीसगढ़ · पिछले 90 दिन · सेवा सेतु डेटाबेस से लाइव")}</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Tile icon={<TrendingUp className="size-4" />} label={tt("Applications", "आवेदन")} value={a.kpi.total.toLocaleString("en-IN")} />
        <Tile icon={<Gauge className="size-4" />} label={tt("Within SLA", "समय-सीमा में")} value={`${sla}%`} />
        <Tile icon={<Timer className="size-4" />} label={tt("Avg turnaround", "औसत समय")} value={`${a.kpi.avg_days}d`} />
        <Tile icon={<Hourglass className="size-4" />} label={tt("Pending now", "लंबित")} value={String(a.kpi.pending)} />
        <Tile icon={<Sparkles className="size-4 text-saffron" />} label={tt("AI all-clear rate", "एआई सब-सही दर")} value={`${aiClear}%`} />
        <Tile icon={<MessageSquareWarning className="size-4" />} label={tt("Open grievances", "खुली शिकायतें")} value={String(a.griev.open)} />
      </div>

      <AiBriefing summary={summary} />

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <section className="rounded-2xl border bg-white p-5 lg:col-span-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-semibold">{tt("Daily applications & 14-day forecast", "दैनिक आवेदन और 14-दिवसीय पूर्वानुमान")}</h2>
            <span className="text-xs text-muted-foreground">
              {tt("Next 7 days", "अगले 7 दिन")}: <b className="text-foreground">{a.next7}</b> ({growth >= 0 ? "+" : ""}
              {growth}% {tt("vs last week", "पिछले सप्ताह से")})
            </span>
          </div>
          <div className="mt-1 flex items-center gap-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="h-0.5 w-4 bg-[#2a78d6]" /> {tt("Actual", "वास्तविक")}</span>
            <span className="flex items-center gap-1"><span className="h-0 w-4 border-t-2 border-dashed border-[#2a78d6]" /> {tt("Forecast (weekly seasonality × trend)", "पूर्वानुमान (साप्ताहिक पैटर्न × रुझान)")}</span>
          </div>
          <TrendChart data={a.trend} />
        </section>

        <section className="rounded-2xl border bg-white p-5">
          <h2 className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="size-4 text-destructive" /> {tt("Predicted SLA breaches · next 7 days", "अनुमानित उल्लंघन · अगले 7 दिन")}
          </h2>
          <p className="text-xs text-muted-foreground">{tt("Pending cases the risk model flags as high-risk", "लंबित मामले जिन्हें जोखिम मॉडल उच्च-जोखिम मानता है")}</p>
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr><th className="py-1">{tt("District", "जिला")}</th><th className="py-1 text-right">{tt("At risk", "जोखिम")}</th><th className="py-1 text-right">{tt("Pending", "लंबित")}</th></tr>
            </thead>
            <tbody className="divide-y">
              {a.predicted.slice(0, 8).map((p) => (
                <tr key={p.district}>
                  <td className="py-1.5">{p.district}</td>
                  <td className={`py-1.5 text-right font-semibold ${p.atRisk ? "text-destructive" : "text-muted-foreground"}`}>{p.atRisk}</td>
                  <td className="py-1.5 text-right text-muted-foreground">{p.pending}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="rounded-2xl border bg-white p-5 lg:col-span-2">
          <h2 className="font-semibold">{tt("SLA breach rate by district", "जिलेवार समय-सीमा उल्लंघन दर")}</h2>
          <p className="text-xs text-muted-foreground">
            {tt(`Red = above the state average of ${stateBreach}% — structural bottlenecks to fix.`, `लाल = राज्य औसत ${stateBreach}% से अधिक — सुधार योग्य अड़चनें।`)}
          </p>
          <HBar data={a.byDistrict.map((d) => ({ label: d.district, value: d.breach_rate }))} unit="%" highlightAbove={stateBreach} />
        </section>

        <section className="rounded-2xl border bg-white p-5">
          <h2 className="font-semibold">{tt("Demand by service", "सेवावार मांग")}</h2>
          <HBar data={a.byService} />
        </section>

        <section className="rounded-2xl border bg-white p-5 lg:col-span-2">
          <h2 className="font-semibold">{tt("Grievances by category", "श्रेणीवार शिकायतें")}</h2>
          <p className="text-xs text-muted-foreground">
            {a.griev.resolved} {tt("resolved", "निवारित")} · {tt("avg", "औसत")} {a.griev.avg_res_days} {tt("days to resolve", "दिन में निवारण")}
          </p>
          <HBar data={a.grievCat.map((g) => ({ label: g.category, value: g.n }))} />
        </section>

        <section className="rounded-2xl border bg-white p-5">
          <h2 className="flex items-center gap-2 font-semibold">
            <MapPin className="size-4 text-primary" /> {tt("Grievance hotspots · 30 days", "शिकायत हॉटस्पॉट · 30 दिन")}
          </h2>
          <p className="text-xs text-muted-foreground">{tt("Clusters of open complaints — fix once, resolve many", "खुली शिकायतों के समूह — एक बार सुधारें, कई निपटाएं")}</p>
          <ul className="mt-3 space-y-2">
            {a.hotspots.map((h) => (
              <li key={h.district + h.category} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
                <span>
                  <b>{h.category}</b> <span className="text-muted-foreground">· {h.district}</span>
                </span>
                <span className="rounded-full bg-white px-2 text-xs font-semibold ring-1 ring-border">{h.n}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function Tile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon} {label}
      </div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}
