import { desc, eq } from "drizzle-orm";
import { db, grievances } from "@/db";
import { getT } from "@/lib/i18n";
import { currentCitizen } from "@/lib/session";
import { GrievanceForm } from "./grievance-form";

export default async function GrievancePage({ searchParams }: PageProps<"/grievance">) {
  const { text } = await searchParams;
  const [{ tt }, citizen] = await Promise.all([getT(), currentCitizen()]);
  const mine = citizen
    ? await db.select().from(grievances).where(eq(grievances.citizenId, citizen.id)).orderBy(desc(grievances.createdAt)).limit(5)
    : [];
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-2xl font-bold">{tt("Register a grievance", "शिकायत दर्ज करें")}</h1>
      <p className="text-sm text-muted-foreground">
        {tt(
          "Just describe the problem in your own words — AI figures out the department, priority and routes it for you.",
          "बस अपने शब्दों में समस्या बताएं — एआई विभाग और प्राथमिकता तय कर सही जगह भेज देगा।",
        )}
      </p>
      <GrievanceForm initialText={typeof text === "string" ? text : ""} loggedIn={!!citizen} />
      {mine.length > 0 && (
        <section className="mt-6 rounded-2xl border bg-card p-5">
          <h2 className="mb-2 font-semibold">{tt("My grievances", "मेरी शिकायतें")}</h2>
          <ul className="divide-y text-sm">
            {mine.map((g) => (
              <li key={g.id} className="flex items-center justify-between gap-3 py-2">
                <div>
                  <div className="font-medium">{g.summaryEn}</div>
                  <div className="text-xs text-muted-foreground">
                    <span className="font-mono">{g.refNo}</span> · {g.department}
                  </div>
                </div>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">{g.status.replace("_", " ")}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
