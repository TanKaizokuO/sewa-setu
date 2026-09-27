import "server-only";
import { cookies } from "next/headers";
import type { Bi } from "./services";

export type Lang = "en" | "hi";

export async function getLang(): Promise<Lang> {
  const v = (await cookies()).get("lang")?.value;
  return v === "hi" ? "hi" : "en";
}

/** Server-side translator: pick the right half of a bilingual string. */
export async function getT() {
  const lang = await getLang();
  return { lang, t: (b: Bi) => b[lang] ?? b.en, tt: (en: string, hi: string) => (lang === "hi" ? hi : en) };
}
