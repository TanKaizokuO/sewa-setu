"use client";

import { createContext, useContext } from "react";
import { useRouter } from "next/navigation";

type Lang = "en" | "hi";
type Bi = { en: string; hi: string };

const LangCtx = createContext<Lang>("en");

export function LangProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return <LangCtx.Provider value={lang}>{children}</LangCtx.Provider>;
}

export function useLang() {
  const lang = useContext(LangCtx);
  return {
    lang,
    t: (b: Bi) => b[lang] ?? b.en,
    tt: (en: string, hi: string) => (lang === "hi" ? hi : en),
  };
}

export function useSetLang() {
  const router = useRouter();
  return (lang: Lang) => {
    document.cookie = `lang=${lang}; path=/; max-age=31536000`;
    router.refresh();
  };
}
