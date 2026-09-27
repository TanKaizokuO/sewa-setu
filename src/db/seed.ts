import { sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import { SERVICES, CG_DISTRICTS } from "@/lib/services";

type DB = PostgresJsDatabase<typeof schema>;

// Deterministic PRNG so every reseed produces the same demo world.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const PERSONAS = {
  ramesh: {
    personaKey: "ramesh",
    name: "Ramesh Kumar Sahu",
    nameHi: "रमेश कुमार साहू",
    fatherName: "Ghanshyam Sahu",
    dob: "1985-03-12",
    gender: "male",
    phone: "98261 XXX21",
    aadhaarMasked: "XXXX XXXX 4821",
    address: "Ward No. 5, Kurud, Tehsil Kurud, District Dhamtari, Chhattisgarh - 493663",
    village: "Kurud",
    tehsil: "Kurud",
    district: "Dhamtari",
    category: "OBC",
    occupation: "farmer",
    annualIncome: 80000,
    preferredLang: "hi",
    digilocker: ["aadhaar", "ration_card", "b1_land_record"],
  },
  priya: {
    personaKey: "priya",
    name: "Priya Verma",
    nameHi: "प्रिया वर्मा",
    fatherName: "Suresh Verma",
    dob: "2005-08-21",
    gender: "female",
    phone: "94252 XXX10",
    aadhaarMasked: "XXXX XXXX 7310",
    address: "H.No. 42, Sector 3, Shankar Nagar, Raipur, Chhattisgarh - 492007",
    village: "Shankar Nagar",
    tehsil: "Raipur",
    district: "Raipur",
    category: "SC",
    occupation: "student",
    annualIncome: 180000,
    preferredLang: "en",
    digilocker: ["aadhaar", "father_caste_certificate", "school_certificate"],
  },
  sunita: {
    personaKey: "sunita",
    name: "Sunita Dhruw",
    nameHi: "सुनीता ध्रुव",
    fatherName: "Rajesh Dhruw",
    dob: "1990-06-15",
    gender: "female",
    phone: "70009 XXX96",
    aadhaarMasked: "XXXX XXXX 5596",
    address: "Village Sihawa, Tehsil Nagri, District Dhamtari, Chhattisgarh - 493778",
    village: "Sihawa",
    tehsil: "Nagri",
    district: "Dhamtari",
    category: "ST",
    occupation: "homemaker",
    annualIncome: 60000,
    preferredLang: "hi",
    digilocker: ["aadhaar", "ration_card"],
  },
} as const;

export const OFFICERS = [
  { name: "Mohan Lal Dewangan", role: "patwari", district: "Dhamtari", tehsil: "Kurud" },
  { name: "Anjali Thakur", role: "tehsildar", district: "Dhamtari", tehsil: "Kurud" },
  { name: "District Analytics Cell", role: "admin", district: "All", tehsil: "All" },
] as const;

const FIRST = ["Rahul", "Sanjay", "Kavita", "Deepak", "Meena", "Anil", "Pooja", "Vikas", "Rekha", "Santosh", "Lalita", "Manoj", "Geeta", "Ravi", "Suman", "Ajay", "Neha", "Dinesh", "Kiran", "Bhupesh", "Laxmi", "Tulsi", "Ramkumar", "Seema"];
const LAST = ["Sahu", "Verma", "Yadav", "Netam", "Dhruw", "Patel", "Sinha", "Markam", "Kurre", "Dewangan", "Tandon", "Chandrakar", "Mandavi", "Kashyap", "Banjare", "Nishad", "Soni", "Thakur"];

// Districts with structural bottlenecks: slower processing, more breaches (the story the analytics should tell)
const SLOW: Record<string, number> = { "Jagdalpur (Bastar)": 2.1, Surguja: 1.8, Kanker: 1.5, Korba: 1.25 };
const DISTRICT_WEIGHT: Record<string, number> = {
  Raipur: 18, Durg: 13, Bilaspur: 12, Dhamtari: 9, Rajnandgaon: 8, Korba: 7, Raigarh: 7,
  "Jagdalpur (Bastar)": 7, Surguja: 6, Mahasamund: 5, Kanker: 4, "Janjgir-Champa": 6,
};

const GRIEVANCE_TEMPLATES = [
  { text: "गांव का हैंडपंप 2 हफ्ते से खराब है, पीने का पानी नहीं मिल रहा", category: "Water Supply", department: "Public Health Engineering", priority: "high", summary: "Village hand pump broken for two weeks; no drinking water." },
  { text: "राशन दुकान पर पिछले महीने का चावल नहीं मिला", category: "Public Distribution", department: "Food & Civil Supplies", priority: "high", summary: "Last month's rice not distributed at ration shop." },
  { text: "Street lights in our ward are not working for a month", category: "Electricity", department: "Urban Administration", priority: "medium", summary: "Ward street lights not working for a month." },
  { text: "वृद्धावस्था पेंशन 3 महीने से खाते में नहीं आई", category: "Pension", department: "Social Welfare", priority: "high", summary: "Old-age pension not credited for 3 months." },
  { text: "Income certificate pending for 20 days beyond deadline", category: "Service Delay", department: "Revenue & Disaster Management", priority: "medium", summary: "Income certificate delayed 20 days past SLA." },
  { text: "सड़क पर बड़े गड्ढे हैं, बारिश में दुर्घटना का खतरा", category: "Roads", department: "Public Works (PWD)", priority: "medium", summary: "Large potholes on road; accident risk in rain." },
  { text: "Primary health centre has no doctor on weekends", category: "Health", department: "Health & Family Welfare", priority: "high", summary: "PHC has no doctor available on weekends." },
  { text: "धान खरीदी केंद्र में टोकन नहीं मिल रहा", category: "Agriculture", department: "Food & Civil Supplies", priority: "medium", summary: "Unable to get token at paddy procurement centre." },
  { text: "School mid-day meal quality is very poor", category: "Education", department: "School Education", priority: "medium", summary: "Poor quality of school mid-day meals." },
  { text: "बिजली का बिल बहुत ज्यादा आया है, मीटर खराब है", category: "Electricity", department: "CSPDCL (Power)", priority: "low", summary: "Excessive electricity bill due to faulty meter." },
  { text: "Garbage not collected in our colony for 10 days", category: "Sanitation", department: "Urban Administration", priority: "medium", summary: "Garbage uncollected in colony for 10 days." },
  { text: "मनरेगा की मजदूरी का भुगतान नहीं हुआ", category: "Employment", department: "Panchayat & Rural Development", priority: "high", summary: "MGNREGA wages not paid." },
];

const DAY = 86400000;

export async function runSeed(db: DB) {
  await db.execute(sql`TRUNCATE notifications, events, documents, applications, grievances, officers, citizens, ocr_cache RESTART IDENTITY CASCADE`);

  await db.insert(schema.citizens).values(Object.values(PERSONAS).map((p) => ({ ...p, digilocker: [...p.digilocker] })));
  await db.insert(schema.officers).values([...OFFICERS]);

  const rnd = mulberry32(20260927);
  const pick = <T,>(a: readonly T[]) => a[Math.floor(rnd() * a.length)];
  const weighted = () => {
    const total = Object.values(DISTRICT_WEIGHT).reduce((a, b) => a + b, 0);
    let r = rnd() * total;
    for (const [d, w] of Object.entries(DISTRICT_WEIGHT)) if ((r -= w) <= 0) return d;
    return "Raipur";
  };
  const serviceMix = [
    ...Array(35).fill("income-certificate"),
    ...Array(20).fill("caste-certificate"),
    ...Array(18).fill("domicile-certificate"),
    ...SERVICES.filter((s) => !s.fullFlow).map((s) => s.slug).flatMap((s) => Array(2).fill(s)),
  ];

  const now = Date.now();
  const apps: (typeof schema.applications.$inferInsert)[] = [];
  const counters: Record<string, number> = {};
  const refNo = (code: string) => {
    counters[code] = (counters[code] ?? 0) + 1;
    return `CG-${code}-2026-${String(100000 + counters[code] * 7 + Math.floor(rnd() * 7)).slice(-6)}`;
  };

  // ~90 days of history, weekday-heavy with a gentle upward trend
  for (let d = 90; d >= 1; d--) {
    const day = new Date(now - d * DAY);
    const weekday = day.getDay();
    const base = weekday === 0 ? 3 : weekday === 6 ? 7 : 12;
    const n = Math.round(base * (0.8 + (90 - d) / 180) * (0.75 + rnd() * 0.5));
    for (let i = 0; i < n; i++) {
      const slug = pick(serviceMix);
      const svc = SERVICES.find((s) => s.slug === slug)!;
      const district = weighted();
      const submittedAt = new Date(day.getTime() + (9 + rnd() * 8) * 3600000);
      const slaDueAt = new Date(submittedAt.getTime() + svc.slaDays * DAY);
      const slow = SLOW[district] ?? 1;
      const procDays = svc.slaDays * (0.35 + rnd() * 0.75) * slow;
      const decided = submittedAt.getTime() + procDays * DAY;
      const aiScore = Math.round((0.55 + rnd() * 0.45) * 100) / 100;
      const pending = decided > now;
      const rejected = !pending && rnd() < (aiScore < 0.7 ? 0.35 : 0.04);
      const status: schema.ApplicationStatus = pending ? (rnd() < 0.55 ? "patwari_review" : "tehsildar_review") : rejected ? "rejected" : "approved";
      apps.push({
        refNo: refNo(svc.code),
        serviceSlug: slug,
        citizenId: null,
        applicantName: `${pick(FIRST)} ${pick(LAST)}`,
        district,
        tehsil: district,
        formData: {},
        status,
        aiScore: svc.fullFlow ? aiScore : null,
        aiSummary: svc.fullFlow ? { verdict: aiScore > 0.85 ? "clear" : aiScore > 0.7 ? "review" : "mismatch", flags: [] } : null,
        submittedAt,
        slaDueAt,
        decidedAt: pending ? null : new Date(decided),
        certificateNo: status === "approved" && svc.fullFlow ? `CERT-${svc.code}-${String(apps.length + 1000).padStart(6, "0")}` : null,
        isSeed: true,
      });
    }
  }

  // Live queue at the demo officers' desk (Dhamtari / Kurud) with a spread of SLA risk
  const queue: [string, number, schema.ApplicationStatus, number][] = [
    // [service, days ago submitted, status, aiScore]
    ["income-certificate", 6.2, "patwari_review", 0.91],
    ["income-certificate", 5.1, "patwari_review", 0.66],
    ["domicile-certificate", 3.4, "patwari_review", 0.94],
    ["caste-certificate", 12.5, "patwari_review", 0.78],
    ["income-certificate", 1.2, "patwari_review", 0.97],
    ["income-certificate", 0.4, "patwari_review", 0.88],
    ["domicile-certificate", 6.6, "tehsildar_review", 0.93],
    ["income-certificate", 4.0, "tehsildar_review", 0.9],
    ["caste-certificate", 2.2, "tehsildar_review", 0.95],
  ];
  for (const [slug, ago, status, aiScore] of queue) {
    const svc = SERVICES.find((s) => s.slug === slug)!;
    const submittedAt = new Date(now - ago * DAY);
    apps.push({
      refNo: refNo(svc.code),
      serviceSlug: slug,
      citizenId: null,
      applicantName: `${pick(FIRST)} ${pick(LAST)}`,
      district: "Dhamtari",
      tehsil: "Kurud",
      formData: {},
      status,
      aiScore,
      aiSummary: {
        verdict: aiScore > 0.85 ? "clear" : aiScore > 0.7 ? "review" : "mismatch",
        flags: aiScore > 0.85 ? [] : ["Name: surname spelling differs between Aadhaar and ration card."],
      },
      aiNote: "Offline submission via Lok Sewa Kendra; documents scanned at counter.",
      submittedAt,
      slaDueAt: new Date(submittedAt.getTime() + svc.slaDays * DAY),
      isSeed: true,
    });
  }

  for (let i = 0; i < apps.length; i += 500) await db.insert(schema.applications).values(apps.slice(i, i + 500));

  // Grievances
  const gr: (typeof schema.grievances.$inferInsert)[] = [];
  for (let i = 0; i < 140; i++) {
    const t = pick(GRIEVANCE_TEMPLATES);
    const ago = rnd() * 60;
    const createdAt = new Date(now - ago * DAY);
    const resolved = ago > 5 && rnd() < 0.72;
    gr.push({
      refNo: `GRV-2026-${String(10000 + i)}`,
      citizenId: null,
      text: t.text,
      district: weighted(),
      category: t.category,
      department: t.department,
      priority: t.priority,
      summaryEn: t.summary,
      sentiment: t.priority === "high" ? "distressed" : "frustrated",
      status: resolved ? "resolved" : rnd() < 0.5 ? "in_progress" : "open",
      createdAt,
      resolvedAt: resolved ? new Date(createdAt.getTime() + (1 + rnd() * 9) * DAY) : null,
      isSeed: true,
    });
  }
  await db.insert(schema.grievances).values(gr);

  return { applications: apps.length, grievances: gr.length };
}
