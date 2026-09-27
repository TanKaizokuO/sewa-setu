import Link from "next/link";
import { Clock, IndianRupee, Sparkles, Building2 } from "lucide-react";
import type { Service } from "@/lib/services";
import { getT } from "@/lib/i18n";

export async function ServiceCard({ service: s }: { service: Service }) {
  const { t, tt } = await getT();
  return (
    <Link
      href={`/services/${s.slug}`}
      className="group flex flex-col rounded-2xl border bg-card p-5 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="font-semibold group-hover:text-primary">{t(s.name)}</h3>
        {s.fullFlow && (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-saffron/15 px-2 py-0.5 text-[10px] font-semibold text-saffron-ink">
            <Sparkles className="size-3" /> {tt("AI fast-track", "एआई फास्ट-ट्रैक")}
          </span>
        )}
      </div>
      <p className="line-clamp-2 flex-1 text-sm text-muted-foreground">{t(s.summary)}</p>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Building2 className="size-3.5" /> {t(s.department).split(/[ ,&]/)[0]}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="size-3.5" /> {s.slaDays} {tt("days", "दिन")}
        </span>
        <span className="flex items-center gap-1">
          <IndianRupee className="size-3.5" /> {s.fee === 0 ? tt("Free", "निःशुल्क") : s.fee}
        </span>
      </div>
    </Link>
  );
}
