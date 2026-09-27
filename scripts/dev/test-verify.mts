
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { verifyDocument } from "@/lib/verify";
import { getService } from "@/lib/services";

async function run(file: string, form: Record<string, string>, docType: "aadhaar" | "ration_card") {
  const buf = readFileSync(`public/demo-docs/${file}`);
  const image = `data:image/jpeg;base64,${buf.toString("base64")}`;
  const req = getService("income-certificate")!.documents.find((d) => d.type === docType)!;
  const r = await verifyDocument({ image, sha256: createHash("sha256").update(buf).digest("hex"), expectedType: docType, requirement: req, form });
  console.log(`\n=== ${file} (${r.ms}ms, ${r.ocrEngine}, ${r.model}, cached=${r.cached})`);
  console.log("detected:", r.detectedType, "extracted:", JSON.stringify(r.extracted));
  for (const c of r.checks) console.log(` - ${c.label}: ${c.status} (${c.confidence}) found=${c.found} :: ${c.reason}`);
  console.log(" summary:", r.summary.hi);
}
await run("ramesh_aadhaar.jpg", { name: "Ramesh Kumar Sahu", dob: "1985-03-12", village: "Kurud" }, "aadhaar");
await run("sunita_aadhaar.jpg", { name: "Sunita Dhruw", dob: "1990-06-15", village: "Sihawa" }, "aadhaar");
await run("ramesh_ration_card.jpg", { name: "Ramesh Kumar Sahu", dob: "1985-03-12", village: "Kurud" }, "ration_card");
process.exit(0);
