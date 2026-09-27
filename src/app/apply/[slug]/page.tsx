import { notFound, redirect } from "next/navigation";
import { getService } from "@/lib/services";
import { currentCitizen } from "@/lib/session";
import { ApplyWizard } from "./wizard";

export default async function ApplyPage({ params }: PageProps<"/apply/[slug]">) {
  const { slug } = await params;
  const service = getService(slug);
  if (!service || !service.fullFlow) notFound();
  const citizen = await currentCitizen();
  if (!citizen) redirect(`/login?next=/apply/${slug}`);

  const prefill: Record<string, string> = {};
  for (const f of service.fields) {
    if (f.prefill) prefill[f.key] = String(citizen[f.prefill] ?? "");
  }
  return (
    <ApplyWizard
      service={service}
      prefill={prefill}
      persona={citizen.personaKey ?? ""}
      digilocker={citizen.digilocker}
    />
  );
}
