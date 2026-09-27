"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send, Undo2, XCircle, BadgeCheck, Loader2, ClipboardPaste, PencilLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLang } from "@/components/lang-provider";

export function ActionPanel({
  applicationId, role, atMyDesk, aiNote, verdict,
}: { applicationId: number; role: "patwari" | "tehsildar"; atMyDesk: boolean; aiNote: string; verdict: string | null }) {
  const { tt } = useLang();
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function act(action: string) {
    if ((action === "reject" || action === "correction") && !note.trim()) {
      toast.error(tt("Please write a reason for the citizen", "कृपया नागरिक के लिए कारण लिखें"));
      return;
    }
    setBusy(action);
    const res = await fetch("/api/officer/action", { method: "POST", body: JSON.stringify({ applicationId, action, note: note || undefined }) });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) return toast.error(data.error);
    toast.success(
      action === "approve"
        ? tt("Approved — certificate issued & citizen notified", "स्वीकृत — प्रमाण पत्र जारी व नागरिक को सूचित")
        : tt("Done — citizen notified", "हो गया — नागरिक को सूचित"),
    );
    router.push("/officer");
    router.refresh();
  }

  if (!atMyDesk)
    return (
      <section className="rounded-2xl border bg-muted/40 p-5 text-sm text-muted-foreground">
        {tt("This application is not at your desk right now.", "यह आवेदन अभी आपकी डेस्क पर नहीं है।")}
      </section>
    );

  return (
    <section className="rounded-2xl border-2 border-primary/30 bg-card p-5">
      <h2 className="flex items-center gap-2 font-semibold">
        <PencilLine className="size-4" />
        {role === "patwari" ? tt("Field verification report", "पटवारी प्रतिवेदन") : tt("Decision", "निर्णय")}
      </h2>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={5}
        placeholder={role === "patwari" ? tt("Your report / remarks…", "आपका प्रतिवेदन / टिप्पणी…") : tt("Remarks (optional for approval)…", "टिप्पणी (स्वीकृति हेतु वैकल्पिक)…")}
        className="mt-2 w-full rounded-lg border p-2 text-sm outline-none focus:border-primary"
      />
      {aiNote && role === "patwari" && (
        <button onClick={() => setNote(aiNote)} className="mb-2 flex items-center gap-1 text-xs font-medium text-primary hover:underline">
          <ClipboardPaste className="size-3.5" /> {tt("Use AI-drafted note", "एआई द्वारा तैयार नोट उपयोग करें")}
        </button>
      )}
      {verdict === "mismatch" && (
        <p className="mb-2 rounded-lg bg-destructive/10 px-2 py-1.5 text-xs text-destructive">
          {tt("AI found a mismatch. Review the evidence (or override it) before forwarding.", "एआई को विसंगति मिली है। अग्रेषित करने से पहले साक्ष्य देखें (या बदलें)।")}
        </p>
      )}
      <div className="grid gap-2">
        {role === "patwari" ? (
          <>
            <Button onClick={() => act("forward")} disabled={!!busy}>
              {busy === "forward" ? <Loader2 className="animate-spin" /> : <Send />} {tt("Verify & forward to Tehsildar", "सत्यापित कर तहसीलदार को भेजें")}
            </Button>
            <Button variant="outline" onClick={() => act("correction")} disabled={!!busy}>
              <Undo2 /> {tt("Request correction from citizen", "नागरिक से सुधार मांगें")}
            </Button>
          </>
        ) : (
          <>
            <Button onClick={() => act("approve")} disabled={!!busy} className="bg-success hover:bg-success/90">
              {busy === "approve" ? <Loader2 className="animate-spin" /> : <BadgeCheck />} {tt("Approve & issue e-certificate", "स्वीकृत करें व ई-प्रमाण पत्र जारी करें")}
            </Button>
            <Button variant="outline" onClick={() => act("send_back")} disabled={!!busy}>
              <Undo2 /> {tt("Send back to Patwari", "पटवारी को वापस भेजें")}
            </Button>
          </>
        )}
        <Button variant="destructive" onClick={() => act("reject")} disabled={!!busy}>
          <XCircle /> {tt("Reject", "अस्वीकार करें")}
        </Button>
      </div>
    </section>
  );
}
