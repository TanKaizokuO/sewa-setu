"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Loader2, UserRound, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLang } from "@/components/lang-provider";

const PERSONAS = [
  { as: "ramesh", name: "Ramesh Kumar Sahu", hi: "रमेश कुमार साहू", meta: "Farmer · Kurud, Dhamtari", metaHi: "किसान · कुरूद, धमतरी" },
  { as: "priya", name: "Priya Verma", hi: "प्रिया वर्मा", meta: "Student · Raipur", metaHi: "छात्रा · रायपुर" },
  { as: "sunita", name: "Sunita Dhruw", hi: "सुनीता ध्रुव", meta: "Homemaker · Sihawa, Dhamtari", metaHi: "गृहिणी · सिहावा, धमतरी" },
];

const OFFICERS = [
  { as: "patwari", name: "Mohan Lal Dewangan", role: "Patwari, Kurud" },
  { as: "tehsildar", name: "Anjali Thakur", role: "Tehsildar, Kurud" },
  { as: "admin", name: "District Analytics Cell", role: "Collectorate" },
];

export function PersonaLogin({ next }: { next?: string }) {
  const { tt } = useLang();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [consent, setConsent] = useState<string | null>(null);

  async function go(as: string) {
    setBusy(as);
    const r = await fetch("/api/auth/login", { method: "POST", body: JSON.stringify({ as }) }).then((r) => r.json());
    router.push(next && !["patwari", "tehsildar", "admin"].includes(as) ? next : r.home);
    router.refresh();
  }

  const persona = PERSONAS.find((p) => p.as === consent);

  return (
    <div className="grid gap-6 md:grid-cols-5">
      <Card className="md:col-span-3">
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 font-semibold">
            <UserRound className="size-5 text-primary" /> {tt("Citizen login", "नागरिक लॉगिन")}
          </div>
          {!persona ? (
            <>
              <p className="text-sm text-muted-foreground">
                {tt("Continue with DigiLocker (demo). Choose a demo citizen:", "डिजिलॉकर से जारी रखें (डेमो)। डेमो नागरिक चुनें:")}
              </p>
              <div className="space-y-2">
                {PERSONAS.map((p) => (
                  <button
                    key={p.as}
                    onClick={() => setConsent(p.as)}
                    className="flex w-full items-center gap-3 rounded-xl border p-3 text-left transition hover:border-primary hover:bg-secondary"
                  >
                    <span className="grid size-10 place-items-center rounded-full bg-primary/10 font-semibold text-primary">
                      {p.name[0]}
                    </span>
                    <span>
                      <span className="block font-medium">{tt(p.name, p.hi)}</span>
                      <span className="block text-xs text-muted-foreground">{tt(p.meta, p.metaHi)}</span>
                    </span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="space-y-4 rounded-xl border bg-secondary/50 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <ShieldCheck className="size-5 text-success" /> DigiLocker (demo) — {tt("consent", "सहमति")}
              </div>
              <p className="text-sm">
                {tt(
                  `Sewa Setu is requesting access to ${persona.name}'s:`,
                  `सेवा सेतु ${persona.hi} की निम्न जानकारी तक पहुंच मांग रहा है:`,
                )}
              </p>
              <ul className="list-inside list-disc text-sm text-muted-foreground">
                <li>{tt("Name, date of birth, gender, address (Aadhaar e-KYC)", "नाम, जन्म तिथि, लिंग, पता (आधार ई-केवाईसी)")}</li>
                <li>{tt("Issued documents in your DigiLocker", "आपके डिजिलॉकर में जारी दस्तावेज़")}</li>
              </ul>
              <div className="flex gap-2">
                <Button onClick={() => go(persona.as)} disabled={!!busy}>
                  {busy ? <Loader2 className="animate-spin" /> : <ShieldCheck />} {tt("Allow & continue", "अनुमति दें और आगे बढ़ें")}
                </Button>
                <Button variant="ghost" onClick={() => setConsent(null)}>
                  {tt("Back", "वापस")}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <Card className="md:col-span-2">
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 font-semibold">
            <Building2 className="size-5 text-primary" /> {tt("Officer login", "अधिकारी लॉगिन")}
          </div>
          {OFFICERS.map((o) => (
            <button
              key={o.as}
              onClick={() => go(o.as)}
              disabled={!!busy}
              className="flex w-full items-center justify-between rounded-xl border p-3 text-left transition hover:border-primary hover:bg-secondary"
            >
              <span>
                <span className="block text-sm font-medium">{o.name}</span>
                <span className="block text-xs text-muted-foreground">{o.role}</span>
              </span>
              {busy === o.as && <Loader2 className="size-4 animate-spin" />}
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
