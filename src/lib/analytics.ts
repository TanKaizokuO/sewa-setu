import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { getService } from "./services";
import { slaRisk } from "./risk";

export async function getAnalytics() {
  const q = <T,>(query: ReturnType<typeof sql>) => db.execute(query) as unknown as Promise<T[]>;

  const [kpi] = await q<{
    total: number; decided: number; within: number; avg_days: number; pending: number; ai_clear: number; ai_total: number; approved: number;
  }>(sql`
    select count(*)::int total,
      count(*) filter (where decided_at is not null)::int decided,
      count(*) filter (where decided_at is not null and decided_at <= sla_due_at)::int within,
      coalesce(round(avg(extract(epoch from decided_at - submitted_at)/86400) filter (where decided_at is not null)::numeric,1),0)::float avg_days,
      count(*) filter (where status in ('patwari_review','tehsildar_review','correction_needed'))::int pending,
      count(*) filter (where ai_summary->>'verdict' = 'clear')::int ai_clear,
      count(*) filter (where ai_summary is not null)::int ai_total,
      count(*) filter (where status = 'approved')::int approved
    from applications`);

  const daily = await q<{ day: string; n: number }>(sql`
    select to_char(d::date, 'YYYY-MM-DD') as day, coalesce(c.n, 0)::int n
    from generate_series(current_date - interval '89 days', current_date, interval '1 day') d
    left join (select submitted_at::date sd, count(*) n from applications group by 1) c on c.sd = d::date
    order by 1`);

  const byDistrict = await q<{ district: string; total: number; breach_rate: number; avg_days: number; pending: number }>(sql`
    select district, count(*)::int total,
      round(100.0 * count(*) filter (where (decided_at is not null and decided_at > sla_due_at) or (decided_at is null and now() > sla_due_at)) / greatest(count(*),1))::int breach_rate,
      coalesce(round(avg(extract(epoch from decided_at - submitted_at)/86400) filter (where decided_at is not null)::numeric,1),0)::float avg_days,
      count(*) filter (where status in ('patwari_review','tehsildar_review'))::int pending
    from applications group by district order by breach_rate desc`);

  const byService = await q<{ slug: string; n: number }>(sql`
    select service_slug slug, count(*)::int n from applications group by 1 order by 2 desc limit 8`);

  const grievCat = await q<{ category: string; n: number; open: number }>(sql`
    select category, count(*)::int n, count(*) filter (where status <> 'resolved')::int open from grievances group by 1 order by 2 desc`);

  const hotspots = await q<{ district: string; category: string; n: number }>(sql`
    select district, category, count(*)::int n from grievances
    where status <> 'resolved' and created_at > now() - interval '30 days'
    group by 1,2 having count(*) >= 2 order by 3 desc limit 6`);

  const [griev] = await q<{ open: number; resolved: number; avg_res_days: number }>(sql`
    select count(*) filter (where status <> 'resolved')::int open,
      count(*) filter (where status = 'resolved')::int resolved,
      coalesce(round(avg(extract(epoch from resolved_at - created_at)/86400)::numeric,1),0)::float avg_res_days
    from grievances`);

  // Predictive: pending cases likely to breach SLA in the next 7 days (heuristic risk model)
  const pendingRows = await q<{ district: string; submitted_at: string; sla_due_at: string; status: string; verdict: string | null }>(sql`
    select district, submitted_at, sla_due_at, status, ai_summary->>'verdict' verdict
    from applications where status in ('patwari_review','tehsildar_review','correction_needed')`);
  const depth: Record<string, number> = {};
  for (const r of pendingRows) depth[r.district] = (depth[r.district] ?? 0) + 1;
  const predicted: Record<string, { atRisk: number; pending: number }> = {};
  for (const r of pendingRows) {
    const due = new Date(r.sla_due_at);
    const risk = slaRisk({
      submittedAt: new Date(r.submitted_at), slaDueAt: due, status: r.status,
      aiVerdict: r.verdict as "clear" | "review" | "mismatch" | null, queueDepth: depth[r.district],
      now: new Date(Date.now() + 3 * 86400000), // look 3 days ahead
    });
    const p = (predicted[r.district] ??= { atRisk: 0, pending: 0 });
    p.pending++;
    if (risk.level === "high" && due.getTime() < Date.now() + 7 * 86400000) p.atRisk++;
  }

  // Forecast next 14 days: day-of-week seasonality x linear trend over the last 8 weeks
  const last = daily.slice(-56);
  const dowSum = Array(7).fill(0), dowCnt = Array(7).fill(0);
  last.forEach((d) => {
    const w = new Date(d.day).getDay();
    dowSum[w] += d.n;
    dowCnt[w]++;
  });
  const mean = last.reduce((s, d) => s + d.n, 0) / last.length || 1;
  const dowFactor = dowSum.map((s, i) => (dowCnt[i] ? s / dowCnt[i] / mean : 1));
  const xs = last.map((_, i) => i), ys = last.map((d, i) => d.n / dowFactor[new Date(d.day).getDay()] || 0);
  const xm = xs.reduce((a, b) => a + b, 0) / xs.length, ym = ys.reduce((a, b) => a + b, 0) / ys.length;
  const slope = xs.reduce((s, x, i) => s + (x - xm) * (ys[i] - ym), 0) / xs.reduce((s, x) => s + (x - xm) ** 2, 0);
  const forecast = Array.from({ length: 14 }, (_, k) => {
    const date = new Date(Date.now() + (k + 1) * 86400000);
    const base = ym + slope * (last.length - 1 + k + 1 - xm);
    return { day: date.toISOString().slice(0, 10), n: Math.max(0, Math.round(base * dowFactor[date.getDay()])) };
  });

  const trend = [
    ...daily.map((d, i) => ({ day: d.day.slice(5), actual: d.n, forecast: i === daily.length - 1 ? d.n : null })),
    ...forecast.map((f) => ({ day: f.day.slice(5), actual: null, forecast: f.n })),
  ];
  const next7 = forecast.slice(0, 7).reduce((s, f) => s + f.n, 0);
  const prev7 = daily.slice(-7).reduce((s, d) => s + d.n, 0);

  return {
    kpi,
    trend,
    next7,
    prev7,
    byDistrict,
    byService: byService.map((s) => ({ label: getService(s.slug)?.name.en.replace(/ \(.*\)/, "") ?? s.slug, value: s.n })),
    grievCat,
    hotspots,
    griev,
    predicted: Object.entries(predicted)
      .map(([district, v]) => ({ district, ...v }))
      .sort((a, b) => b.atRisk - a.atRisk),
  };
}
