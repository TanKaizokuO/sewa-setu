"use client";

import { useLang, useSetLang } from "./lang-provider";

export function LangToggle() {
  const { lang } = useLang();
  const setLang = useSetLang();
  return (
    <div className="flex rounded-full border bg-muted p-0.5 text-xs font-medium" role="group" aria-label="Language">
      {(["hi", "en"] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`rounded-full px-2.5 py-1 transition ${lang === l ? "bg-white text-primary shadow-sm" : "text-muted-foreground"}`}
        >
          {l === "hi" ? "हिंदी" : "EN"}
        </button>
      ))}
    </div>
  );
}
