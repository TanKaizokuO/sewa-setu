import { redirect } from "next/navigation";
import { desc, ne, sql } from "drizzle-orm";
import { db, grievances } from "@/db";
import { currentOfficer } from "@/lib/session";
import { getT } from "@/lib/i18n";
import { LiveRefresh } from "@/components/live-refresh";
import { ResolveButton } from "./resolve-button";

const PRIORITY_ORDER = sql`case priority when 'critical' then 0 when 'high' then 1 when 'medium' then 2 else 3 end`;
const PRIORITY_CLS: Record<string, string> = {
  critical: "bg-destructive text-white",
  high: "bg-destructive/15 text-destructive",
  medium: "bg-warning/20 text-[oklch(0.5_0.13_60)]",
  low: "bg-muted text-muted-foreground",
};

export default async function GrievanceInbox() {
  if (!(await currentOfficer())) redirect("/login");
  const { tt } = await getT();
  const rows = await db.select().from(grievances).where(ne(grievances.status, "resolved")).orderBy(PRIORITY_ORDER, desc(grievances.createdAt)).limit(60);
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <LiveRefresh value={String(rows[0]?.id ?? 0)} interval={5000} />
      <h1 className="text-2xl font-bold">{tt("Grievance inbox", "शिकायत इनबॉक्स")}</h1>
      <p className="text-sm text-muted-foreground">{tt("AI-triaged: categorised, prioritised and routed. Highest priority first.", "एआई द्वारा वर्गीकृत, प्राथमिकता तय व अग्रेषित। सबसे ज़रूरी पहले।")}</p>
      <div className="mt-5 overflow-x-auto rounded-2xl border bg-white">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5">{tt("Priority", "प्राथमिकता")}</th>
              <th className="px-4 py-2.5">{tt("Complaint (AI summary)", "शिकायत (एआई सारांश)")}</th>
              <th className="px-4 py-2.5">{tt("Routed to", "विभाग")}</th>
              <th className="px-4 py-2.5">{tt("District", "जिला")}</th>
              <th className="px-4 py-2.5">{tt("Age", "अवधि")}</th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((g) => (
              <tr key={g.id} className={!g.isSeed ? "bg-primary/[0.03]" : ""}>
                <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${PRIORITY_CLS[g.priority]}`}>{g.priority}</span></td>
                <td className="px-4 py-3">
                  <div className="font-medium">{g.summaryEn} {!g.isSeed && <span className="ml-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-white">NEW</span>}</div>
                  <div className="text-xs text-muted-foreground">“{g.text.slice(0, 90)}” · <span className="font-mono">{g.refNo}</span></div>
                  {g.aiReason && <div className="text-[11px] text-muted-foreground">AI: {g.aiReason}</div>}
                </td>
                <td className="px-4 py-3 text-xs">{g.department}</td>
                <td className="px-4 py-3 text-xs">{g.district}</td>
                <td className="px-4 py-3 text-xs">{Math.floor((Date.now() - g.createdAt.getTime()) / 86400000)}d</td>
                <td className="px-4 py-3 text-right"><ResolveButton id={g.id} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
