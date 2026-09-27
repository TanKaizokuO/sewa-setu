import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import QRCode from "qrcode";
import { db, applications } from "@/db";
import { getService } from "@/lib/services";
import { PrintButton } from "./print-button";
import { Logo } from "@/components/logo";

export default async function CertificatePage({ params }: PageProps<"/certificate/[no]">) {
  const { no } = await params;
  const [app] = await db.select().from(applications).where(eq(applications.certificateNo, no));
  if (!app || app.status !== "approved") notFound();
  const s = getService(app.serviceSlug)!;
  const f = app.formData;
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const verifyUrl = `${origin}/verify/${no}`;
  const qr = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 240 });
  const issued = app.decidedAt ?? new Date();
  const validTill = new Date(issued);
  validTill.setFullYear(validTill.getFullYear() + (s.slug === "income-certificate" ? 1 : 100));

  const body: Record<string, { hi: string; en: string }> = {
    "income-certificate": {
      hi: `प्रमाणित किया जाता है कि ${f.name}, पिता/पति ${f.fatherName}, निवासी ${f.village}, तहसील ${f.tehsil}, जिला ${f.district} (छत्तीसगढ़) की समस्त स्रोतों से वार्षिक पारिवारिक आय ₹${Number(f.annualIncome || 0).toLocaleString("en-IN")} है।`,
      en: `This is to certify that ${f.name}, son/daughter/wife of ${f.fatherName}, resident of ${f.village}, Tehsil ${f.tehsil}, District ${f.district} (Chhattisgarh), has an annual family income from all sources of ₹${Number(f.annualIncome || 0).toLocaleString("en-IN")}.`,
    },
    "caste-certificate": {
      hi: `प्रमाणित किया जाता है कि ${f.name}, पिता ${f.fatherName}, निवासी ${f.village}, जिला ${f.district} (छत्तीसगढ़), ${f.casteName} जाति के सदस्य हैं, जो ${f.category} वर्ग के रूप में मान्य है।`,
      en: `This is to certify that ${f.name}, child of ${f.fatherName}, resident of ${f.village}, District ${f.district} (Chhattisgarh), belongs to the ${f.casteName} community, recognised as ${f.category}.`,
    },
    "domicile-certificate": {
      hi: `प्रमाणित किया जाता है कि ${f.name}, पिता/पति ${f.fatherName}, ग्राम ${f.village}, तहसील ${f.tehsil}, जिला ${f.district} के ${f.yearsResident} वर्षों से निवासी हैं तथा छत्तीसगढ़ राज्य के मूल निवासी हैं।`,
      en: `This is to certify that ${f.name}, child/spouse of ${f.fatherName}, has resided in ${f.village}, Tehsil ${f.tehsil}, District ${f.district} for ${f.yearsResident} years and is a domicile of the State of Chhattisgarh.`,
    },
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 print:p-0">
      <div className="mb-4 flex justify-end gap-2 print:hidden">
        <PrintButton />
      </div>
      <div className="relative overflow-hidden rounded-xl border-4 border-double border-primary/60 bg-white p-8 shadow-sm print:shadow-none">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-7xl font-black tracking-widest text-primary/[0.04] -rotate-12">
          SEWA SETU
        </div>
        <div className="flex items-center justify-between border-b pb-4">
          <Logo />
          <div className="text-right text-xs text-muted-foreground">
            {s.department.hi}
            <br />
            {s.department.en}
          </div>
        </div>
        <div className="mt-6 text-center">
          <div className="text-2xl font-bold">{s.certificateTitle?.hi}</div>
          <div className="text-lg font-semibold text-muted-foreground">{s.certificateTitle?.en}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            (PROTOTYPE — NOT A LEGAL DOCUMENT) · {no}
          </div>
        </div>
        <p className="mt-6 text-[15px] leading-relaxed">{body[s.slug]?.hi}</p>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{body[s.slug]?.en}</p>
        <div className="mt-8 flex items-end justify-between gap-6">
          <div className="text-sm">
            <div>
              <span className="text-muted-foreground">Application:</span> <span className="font-mono">{app.refNo}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Issued:</span> {issued.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </div>
            <div>
              <span className="text-muted-foreground">Valid till:</span> {s.slug === "income-certificate" ? validTill.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Permanent"}
            </div>
            <div className="mt-4 font-semibold">Digitally signed by: Tehsildar, {app.tehsil}</div>
            <div className="text-xs text-muted-foreground">Signature hash: {Buffer.from(no + app.refNo).toString("base64").slice(0, 24)}…</div>
          </div>
          <div className="text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="Verification QR" className="size-32" />
            <div className="text-[10px] text-muted-foreground">Scan to verify authenticity</div>
          </div>
        </div>
      </div>
    </div>
  );
}
