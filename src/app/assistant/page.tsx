import { getT } from "@/lib/i18n";
import { currentCitizen } from "@/lib/session";
import { AssistantChat } from "./chat";

export default async function AssistantPage({ searchParams }: PageProps<"/assistant">) {
  const { q } = await searchParams;
  const [{ tt }, citizen] = await Promise.all([getT(), currentCitizen()]);
  return (
    <div className="mx-auto flex h-[calc(100dvh-7.5rem)] max-w-3xl flex-col px-4 py-4 md:h-[calc(100dvh-4rem)]">
      <div className="mb-3">
        <h1 className="text-xl font-bold">{tt("Sewa Sahayak — AI assistant", "सेवा सहायक — एआई सहायक")}</h1>
        <p className="text-sm text-muted-foreground">
          {citizen
            ? tt(
                `Namaste ${citizen.name.split(" ")[0]}! I know your DigiLocker profile, so I can check eligibility for you.`,
                `नमस्ते ${citizen.nameHi.split(" ")[0]} जी! आपकी डिजिलॉकर प्रोफ़ाइल से मैं आपकी पात्रता जांच सकता हूं।`,
              )
            : tt("Ask anything about government services — in Hindi or English, by voice or text.", "सरकारी सेवाओं के बारे में कुछ भी पूछें — हिंदी या अंग्रेज़ी में, बोलकर या लिखकर।")}
        </p>
      </div>
      <AssistantChat initialQuery={typeof q === "string" ? q : undefined} loggedIn={!!citizen} />
    </div>
  );
}
