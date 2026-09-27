# Demo video script (target 4:30)

Record at 1440×900, browser zoom 100%, light mode. Before recording:

1. Click **Reset demo** in the role switcher (bottom-right), so the data is fresh.
2. Warm the AI once: run the Ramesh and Sunita apply flows end to end, then Reset demo again. The OCR cache keeps the real results, so a slow API during recording still shows real output (with a "cached" badge).
3. Have `public/demo-docs/ramesh_ration_card_blurry.jpg` ready in a file picker.
4. Close other tabs, turn off notifications, and allow microphone access for the site.

Record each scene as a separate clip. If the AI is slow, cut the wait in editing and say so in the voice-over ("sped up").

| # | Time | On screen | Voice-over |
|---|---|---|---|
| 1 | 0:00–0:25 | Title slide from the deck, then the home page | "Getting an income certificate in Chhattisgarh can take several trips, and a small mistake, like a surname that changed after marriage, is often caught weeks later, sending the file back to the start. Sewa Setu fixes that with AI that checks everything before you submit." |
| 2 | 0:25–0:55 | Logged in as **Ramesh**. Home → mic → say "मुझे आय प्रमाण पत्र चाहिए". Answer appears and is read aloud | "Ramesh is a farmer in Dhamtari. He just asks, in Hindi. Sewa Sahayak, running on NVIDIA Nemotron, finds the right service and lists the documents, fee and timeline, and reads it aloud." |
| 3 | 0:55–1:10 | Click **Apply now — pre-filled**. Show the DigiLocker badges on the form, pick a purpose, go to Documents | "His form is already filled from DigiLocker. He just picks the purpose." |
| 4 | 1:10–1:25 | Upload the blurry ration card → "Photo not clear enough" | "If his photo is blurry, the phone rejects it immediately, before anything is uploaded." |
| 5 | 1:25–1:55 | **Fetch from DigiLocker** for Aadhaar and ration card. Show the pipeline stepper, then the boxes and the green Match rows. Hover a reason | "Now the real documents. Nemotron-Parse reads each one, Hindi and English, and the LLM compares every field with his form, with a confidence score and a reason. Everything matches, so he submits." Then submit; the tracking page opens. |
| 6 | 1:55–2:25 | Switch to **Sunita** → Apply for income certificate → fetch both documents → red Mismatch on name, then Review page | "Sunita's Aadhaar still has her maiden name, Markam. Today that's found in week three. Here, it's found now, with the reason, and a suggestion: attach a marriage certificate. She can add a note, and nothing is rejected automatically." |
| 7 | 2:25–3:05 | Switch to **Patwari** → queue sorted by risk → open Ramesh's application → AI note in Hindi, evidence, risk factors → **Use AI-drafted note** → Forward | "The Patwari's queue is sorted by predicted SLA-breach risk, and the risk is explained. The AI has drafted a verification note in Hindi. Every check shows its evidence, and the officer can override any of them; each override is audit-logged. The AI prepares the file; the officer decides." |
| 8 | 3:05–3:25 | Switch to **Tehsildar** → Approve → certificate with QR | "The Tehsildar approves, and a bilingual certificate is issued with a QR code anyone can scan to verify it." |
| 9 | 3:25–3:40 | Switch to **Ramesh** → tracking page shows Approved, toast, recommendations | "Ramesh's page updated live, and it suggests other schemes he qualifies for." |
| 10 | 3:40–4:00 | Grievance: say or type "जगदलपुर में 2 हफ्ते से पानी नहीं आ रहा" → result card with hotspot notice | "Complaints work the same way: the AI picks the department and priority with a reason, and groups it with similar complaints into a hotspot for the district." |
| 11 | 4:00–4:25 | Switch to **Admin** → Analytics: forecast, breach by district, predicted breaches → **Generate briefing** | "For the district: a demand forecast, the applications about to breach their SLA, and bottlenecks, with Surguja and Bastar at roughly three times the state average in our data. One click writes a briefing for the Collector." |
| 12 | 4:25–4:35 | Closing slide | "Sewa Setu: government services as easy as asking, and right the first time." |

## If something fails while recording

- **Assistant is slow or shows "AI assistant is busy"**: keep going; the keyword fallback still shows the service card. Re-record the clip later.
- **A document shows "cached"**: that's the real earlier result being reused because the live API was slow. Fine to show; mention it if asked.
- **Verification error**: click **Retry**. If cloud OCR is down, the browser runs on-device OCR automatically (the stepper says "on-device").
- **Messed-up data**: Reset demo, then redo from scene 2.
