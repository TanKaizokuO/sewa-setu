"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Loader2 } from "lucide-react";

export function ResolveButton({ id }: { id: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch("/api/grievances/resolve", { method: "POST", body: JSON.stringify({ id }) });
        router.refresh();
      }}
      className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-success/10"
    >
      {busy ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3 text-success" />} Resolve
    </button>
  );
}
