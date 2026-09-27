// API-level end-to-end: citizen verifies docs + submits; patwari forwards; tehsildar approves.
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
const B = "http://localhost:3000";
const jar: Record<string, string> = {};
async function call(who: string, path: string, body?: unknown) {
  const res = await fetch(B + path, { method: "POST", headers: { cookie: jar[who] ?? "" }, body: body ? JSON.stringify(body) : undefined });
  const sc = res.headers.get("set-cookie"); if (sc) jar[who] = sc.split(";")[0];
  const txt = await res.text(); try { return { status: res.status, ...JSON.parse(txt) }; } catch { return { status: res.status, txt: txt.slice(0, 200) }; }
}
await call("c", "/api/auth/login", { as: "ramesh" });
const form = { name: "Ramesh Kumar Sahu", fatherName: "Ghanshyam Sahu", dob: "1985-03-12", gender: "male", mobile: "98261 XXX21", address: "Ward No. 5, Kurud", village: "Kurud", tehsil: "Kurud", district: "Dhamtari", occupation: "farmer", annualIncome: "80000", purpose: "scholarship" };
const ids: number[] = [];
for (const [t, f] of [["aadhaar", "ramesh_aadhaar.jpg"], ["ration_card", "ramesh_ration_card.jpg"]]) {
  const buf = readFileSync("public/demo-docs/" + f); const image = "data:image/jpeg;base64," + buf.toString("base64");
  const t0 = Date.now();
  const r = await call("c", "/api/documents/verify", { serviceSlug: "income-certificate", docType: t, image, sha256: createHash("sha256").update(image).digest("hex"), quality: { ok: true, issues: [], blurScore: 1000, brightness: 200, width: 1, height: 1 }, form });
  console.log(t, r.status, `${Date.now() - t0}ms`, r.detectedType, r.checks?.map((c: { label: string; status: string }) => `${c.label}:${c.status}`).join(", "), r.cached ? "CACHED" : "");
  ids.push(r.documentId);
}
const sub = await call("c", "/api/applications", { serviceSlug: "income-certificate", form, documentIds: ids, declaration: true });
console.log("submit", sub);
await new Promise((r) => setTimeout(r, 9000)); // let after() draft the note
await call("p", "/api/auth/login", { as: "patwari" });
console.log("forward", await call("p", "/api/officer/action", { applicationId: sub.id, action: "forward", note: "Verified in field" }));
await call("t", "/api/auth/login", { as: "tehsildar" });
console.log("approve", await call("t", "/api/officer/action", { applicationId: sub.id, action: "approve" }));
console.log("track page", (await fetch(`${B}/track/${sub.refNo}`)).status, "  queue page", (await fetch(`${B}/officer`, { headers: { cookie: jar.p } })).status, "  detail", (await fetch(`${B}/officer/applications/${sub.id}`, { headers: { cookie: jar.p } })).status);
console.log("dashboard", (await fetch(`${B}/dashboard`, { headers: { cookie: jar.c } })).status);
