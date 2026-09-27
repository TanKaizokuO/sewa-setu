import { eq } from "drizzle-orm";
import { BadgeCheck, ShieldX } from "lucide-react";
import { db, applications } from "@/db";
import { getService } from "@/lib/services";

// Public authenticity check reached by scanning the certificate QR code.
export default async function VerifyPage({ params }: PageProps<"/verify/[no]">) {
  const { no } = await params;
  const [app] = await db.select().from(applications).where(eq(applications.certificateNo, no));
  const valid = app?.status === "approved";
  const s = app ? getService(app.serviceSlug) : null;
  return (
    <div className="mx-auto max-w-md px-4 py-12 text-center">
      {valid ? (
        <>
          <BadgeCheck className="mx-auto size-16 text-success" />
          <h1 className="mt-3 text-xl font-bold">Genuine certificate</h1>
          <p className="text-sm text-muted-foreground">Issued via Sewa Setu (prototype)</p>
          <dl className="mt-6 space-y-2 rounded-2xl border bg-card p-5 text-left text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Certificate</dt><dd className="font-mono">{no}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Type</dt><dd>{s?.name.en}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Holder</dt><dd>{app.applicantName}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">District</dt><dd>{app.district}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Issued</dt><dd>{app.decidedAt?.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</dd></div>
          </dl>
        </>
      ) : (
        <>
          <ShieldX className="mx-auto size-16 text-destructive" />
          <h1 className="mt-3 text-xl font-bold">Certificate not found</h1>
          <p className="text-sm text-muted-foreground">This certificate number is not in Sewa Setu records. It may be forged.</p>
        </>
      )}
    </div>
  );
}
