import { getT } from "@/lib/i18n";
import { PersonaLogin } from "./persona-login";
import { Logo } from "@/components/logo";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  const { tt } = await getT();
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8 flex flex-col items-center text-center">
        <Logo className="mb-5 h-20" />
        <h1 className="text-2xl font-bold">{tt("Sign in to Sewa Setu", "सेवा सेतु में लॉगिन करें")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {tt(
            "One login. Your profile and documents come from DigiLocker — no retyping, no photocopies.",
            "एक लॉगिन। आपकी प्रोफ़ाइल और दस्तावेज़ डिजिलॉकर से — दोबारा भरने या फोटोकॉपी की ज़रूरत नहीं।",
          )}
        </p>
      </div>
      <PersonaLogin next={typeof next === "string" && next.startsWith("/") ? next : undefined} />
    </div>
  );
}
