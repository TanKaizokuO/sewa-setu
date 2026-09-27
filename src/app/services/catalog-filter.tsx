"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { useLang } from "@/components/lang-provider";

export function CatalogFilter({ q, dept, depts }: { q: string; dept: string; depts: { value: string; label: string }[] }) {
  const router = useRouter();
  const { tt } = useLang();
  const [text, setText] = useState(q);
  const go = (nq: string, nd: string) => {
    const p = new URLSearchParams();
    if (nq) p.set("q", nq);
    if (nd) p.set("dept", nd);
    router.replace(`/services${p.size ? `?${p}` : ""}`);
  };
  return (
    <div className="space-y-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          go(text, dept);
        }}
        className="flex max-w-xl items-center gap-2 rounded-xl border bg-card px-3"
      >
        <Search className="size-4 text-muted-foreground" />
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            go(e.target.value, dept);
          }}
          placeholder={tt("e.g. income, जाति, pension…", "जैसे आय, जाति, पेंशन…")}
          className="flex-1 bg-transparent py-2.5 text-sm outline-none"
        />
      </form>
      <div className="flex flex-wrap gap-2">
        {[{ value: "", label: tt("All departments", "सभी विभाग") }, ...depts].map((d) => (
          <button
            key={d.value}
            onClick={() => go(text, d.value)}
            className={`rounded-full border px-3 py-1 text-xs ${dept === d.value ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted"}`}
          >
            {d.label}
          </button>
        ))}
      </div>
    </div>
  );
}
