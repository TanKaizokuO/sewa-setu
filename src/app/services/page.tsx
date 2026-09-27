import { getT } from "@/lib/i18n";
import { SERVICES } from "@/lib/services";
import { ServiceCard } from "@/components/service-card";
import { CatalogFilter } from "./catalog-filter";

export default async function ServicesPage({ searchParams }: PageProps<"/services">) {
  const { q = "", dept = "" } = (await searchParams) as { q?: string; dept?: string };
  const { tt, t } = await getT();
  const depts = [...new Set(SERVICES.map((s) => s.department.en))];
  const needle = q.toLowerCase().trim();
  const list = SERVICES.filter(
    (s) =>
      (!dept || s.department.en === dept) &&
      (!needle ||
        [s.name.en, s.name.hi, s.summary.en, s.summary.hi, ...s.keywords].some((k) => k.toLowerCase().includes(needle))),
  );
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold">{tt("All services", "सभी सेवाएं")}</h1>
      <p className="mb-5 text-sm text-muted-foreground">
        {tt("Search in Hindi or English. Not sure what you need? Ask the AI Sahayak.", "हिंदी या अंग्रेज़ी में खोजें। पता नहीं क्या चाहिए? एआई सहायक से पूछें।")}
      </p>
      <CatalogFilter
        q={q}
        dept={dept}
        depts={depts.map((d) => ({ value: d, label: t(SERVICES.find((s) => s.department.en === d)!.department) }))}
      />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((s) => (
          <ServiceCard key={s.slug} service={s} />
        ))}
      </div>
      {list.length === 0 && (
        <p className="py-10 text-center text-muted-foreground">{tt("No matching services.", "कोई मिलती-जुलती सेवा नहीं मिली।")}</p>
      )}
    </div>
  );
}
