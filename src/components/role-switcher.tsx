"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Repeat2, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";

type Session = { role: string; id: number } | null;

const ROLES = [
  { as: "ramesh", label: "Ramesh Sahu", sub: "Citizen · Hindi voice · Income cert.", group: "Citizens" },
  { as: "priya", label: "Priya Verma", sub: "Citizen · English · Caste cert.", group: "Citizens" },
  { as: "sunita", label: "Sunita Dhruw", sub: "Citizen · Name mismatch case", group: "Citizens" },
  { as: "patwari", label: "Patwari — M. L. Dewangan", sub: "Field verification desk", group: "Officers" },
  { as: "tehsildar", label: "Tehsildar — Anjali Thakur", sub: "Approving authority", group: "Officers" },
  { as: "admin", label: "District Analytics Cell", sub: "Dashboards & prediction", group: "Officers" },
];

/** Floating demo control: hop between citizen and officer views without logging out. */
export function RoleSwitcher({ current }: { current: Session }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function login(as: string) {
    setBusy(true);
    const r = await fetch("/api/auth/login", { method: "POST", body: JSON.stringify({ as }) }).then((r) => r.json());
    setBusy(false);
    setOpen(false);
    router.push(r.home ?? "/");
    router.refresh();
  }

  async function reset() {
    setBusy(true);
    const r = await fetch("/api/demo/reset", { method: "POST" }).then((r) => r.json());
    setBusy(false);
    setOpen(false);
    toast.success(`Demo reset — ${r.applications} applications re-seeded`);
    router.push("/");
    router.refresh();
  }

  return (
    <div className="fixed right-4 bottom-4 z-50 flex flex-col items-end print:hidden">
      {open && (
        <div className="mb-2 w-72 rounded-xl border bg-white p-2 shadow-xl">
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Demo · switch role</span>
            <button onClick={() => setOpen(false)} aria-label="Close" className="rounded p-1 hover:bg-muted">
              <X className="size-3.5" />
            </button>
          </div>
          {["Citizens", "Officers"].map((g) => (
            <div key={g}>
              <div className="px-2 pt-2 pb-1 text-[11px] font-medium text-muted-foreground">{g}</div>
              {ROLES.filter((r) => r.group === g).map((r) => (
                <button
                  key={r.as}
                  disabled={busy}
                  onClick={() => login(r.as)}
                  className="flex w-full flex-col items-start rounded-lg px-2 py-1.5 text-left hover:bg-muted disabled:opacity-50"
                >
                  <span className="text-sm font-medium">{r.label}</span>
                  <span className="text-xs text-muted-foreground">{r.sub}</span>
                </button>
              ))}
            </div>
          ))}
          <div className="mt-1 border-t pt-1">
            <button
              disabled={busy}
              onClick={reset}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50"
            >
              <RotateCcw className="size-3.5" /> Reset demo data
            </button>
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full border bg-white/95 px-3 py-2 text-xs font-medium shadow-lg hover:bg-white"
      >
        <Repeat2 className="size-4 text-primary" />
        Demo: {current ? ROLES.find((r) => r.as === roleKey(current))?.label.split(" —")[0] ?? current.role : "guest"}
      </button>
    </div>
  );
}

function roleKey(s: NonNullable<Session>) {
  if (s.role !== "citizen") return s.role;
  return ["ramesh", "priya", "sunita"][s.id - 1];
}
