// Regression suite: every demo document through the full verifier, RUNS times each, plus a replay of a
// failed OCR read (the model must report "missing", never echo the form).
// D=<dir of 1648px copies> matches what the browser uploads. Run: env RUNS=3 npx tsx --env-file=.env --conditions=react-server scripts/dev/verify-suite.mts
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { verifyDocument } from "@/lib/verify";
import { getService } from "@/lib/services";
const P = {
  ramesh: { name: "Ramesh Kumar Sahu", dob: "1985-03-12", village: "Kurud" },
  sunita: { name: "Sunita Dhruw", dob: "1990-06-15", village: "Sihawa" },
  priya: { name: "Priya Verma", dob: "2005-08-21", village: "Shankar Nagar", casteName: "Satnami" },
};
const cases: [string, keyof typeof P, string, string][] = [
  ["ramesh_aadhaar.jpg", "ramesh", "income-certificate", "aadhaar"],
  ["ramesh_ration_card.jpg", "ramesh", "income-certificate", "ration_card"],
  ["ramesh_b1_land_record.jpg", "ramesh", "income-certificate", "b1_land_record"],
  ["sunita_aadhaar.jpg", "sunita", "income-certificate", "aadhaar"],
  ["sunita_ration_card.jpg", "sunita", "income-certificate", "ration_card"],
  ["priya_aadhaar.jpg", "priya", "caste-certificate", "aadhaar"],
  ["priya_father_caste_certificate.jpg", "priya", "caste-certificate", "father_caste_certificate"],
  ["priya_school_certificate.jpg", "priya", "caste-certificate", "school_certificate"],
];
if (process.env.ONLY) cases.splice(0, cases.length, ...cases.filter((c) => c[0].startsWith(process.env.ONLY!)));
async function one(file: string, who: keyof typeof P, svc: string, type: string, clientOcrText?: string) {
  const buf = readFileSync(`${process.env.D ?? "public/demo-docs"}/${file}`);
  const image = `data:image/jpeg;base64,${buf.toString("base64")}`;
  const requirement = getService(svc)!.documents.find((d) => d.type === type)!;
  try {
    const r = await verifyDocument({ image, sha256: "t" + createHash("sha256").update(buf).digest("hex"), expectedType: type as never, requirement, form: P[who], clientOcrText });
    if (process.env.SHOWOCR && r.checks.some((c) => c.status !== "match")) console.log("----OCR----\n" + r.ocrText + "\n----REASON---- " + r.checks.map((c) => c.reason).join(" / "));
    return r.checks.map((c) => `${c.label}=${c.status}${c.status !== "match" ? `(${c.found})` : ""}`).join(" ") + (r.cached ? " CACHED" : "");
  } catch (e) { return "ERR " + (e as Error).message; }
}
const runs = Number(process.env.RUNS ?? 3);
for (const c of cases) {
  const out = [];
  for (let i = 0; i < runs; i++) out.push(await one(...c));
  console.log(c[0].padEnd(36), "\n   " + out.join("\n   "));
}
const bad = "# भारत सरकार\nGovernment of India (SPECIMEN) Unique ID card -- demo specimen आधार -- नमूत\nXXXX XXXX 5596\nEST या आधार, मेरी पहचान\nPHOTO";
if (!process.env.ONLY) for (let i = 0; i < 3; i++) console.log("prod-failure replay:", await one("sunita_aadhaar.jpg", "sunita", "income-certificate", "aadhaar", bad));
process.exit(0);
