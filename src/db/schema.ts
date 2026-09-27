import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  jsonb,
  boolean,
  real,
  date,
  index,
} from "drizzle-orm/pg-core";

export type Bilingual = { en: string; hi: string };

export const citizens = pgTable("citizens", {
  id: serial("id").primaryKey(),
  personaKey: text("persona_key").unique(),
  name: text("name").notNull(),
  nameHi: text("name_hi").notNull(),
  fatherName: text("father_name").notNull(),
  dob: date("dob").notNull(),
  gender: text("gender").notNull(),
  phone: text("phone").notNull(),
  aadhaarMasked: text("aadhaar_masked").notNull(),
  address: text("address").notNull(),
  village: text("village").notNull(),
  tehsil: text("tehsil").notNull(),
  district: text("district").notNull(),
  category: text("category").notNull(), // GEN | OBC | SC | ST
  occupation: text("occupation").notNull(),
  annualIncome: integer("annual_income").notNull(),
  preferredLang: text("preferred_lang").notNull().default("hi"),
  // Documents available in the (mock) DigiLocker account
  digilocker: jsonb("digilocker").$type<string[]>().notNull().default([]),
});

export const officers = pgTable("officers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull(), // patwari | tehsildar | admin
  district: text("district").notNull(),
  tehsil: text("tehsil").notNull(),
});

export type ApplicationStatus =
  | "submitted"
  | "patwari_review"
  | "tehsildar_review"
  | "correction_needed"
  | "approved"
  | "rejected";

export const applications = pgTable(
  "applications",
  {
    id: serial("id").primaryKey(),
    refNo: text("ref_no").notNull().unique(),
    serviceSlug: text("service_slug").notNull(),
    citizenId: integer("citizen_id").references(() => citizens.id),
    applicantName: text("applicant_name").notNull(),
    district: text("district").notNull(),
    tehsil: text("tehsil").notNull(),
    formData: jsonb("form_data").$type<Record<string, string>>().notNull(),
    status: text("status").$type<ApplicationStatus>().notNull(),
    // AI pre-verification summary (overall score + flags)
    aiScore: real("ai_score"),
    aiSummary: jsonb("ai_summary").$type<{
      verdict: "clear" | "review" | "mismatch";
      flags: string[];
    }>(),
    aiNote: text("ai_note"), // AI-drafted verification note for the officer
    officerNote: text("officer_note"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull(),
    slaDueAt: timestamp("sla_due_at", { withTimezone: true }).notNull(),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    certificateNo: text("certificate_no").unique(),
    isSeed: boolean("is_seed").notNull().default(false),
  },
  (t) => [
    index("app_status_idx").on(t.status),
    index("app_citizen_idx").on(t.citizenId),
  ],
);

export type VerificationCheck = {
  field: string;
  label: string;
  expected: string;
  found: string | null;
  status: "match" | "partial" | "mismatch" | "missing";
  confidence: number;
  reason: string;
  overridden?: { by: string; to: "match" | "mismatch"; note: string; at: string };
};

export type QualityReport = {
  blurScore: number;
  brightness: number;
  width: number;
  height: number;
  ok: boolean;
  issues: string[];
};

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").references(() => applications.id, {
    onDelete: "cascade",
  }),
  citizenId: integer("citizen_id").references(() => citizens.id),
  docType: text("doc_type").notNull(),
  detectedType: text("detected_type"),
  image: text("image").notNull(), // data URL (compressed JPEG)
  sha256: text("sha256").notNull(),
  quality: jsonb("quality").$type<QualityReport>(),
  ocrText: text("ocr_text"),
  ocrEngine: text("ocr_engine"),
  extracted: jsonb("extracted").$type<Record<string, string | null>>(),
  checks: jsonb("checks").$type<VerificationCheck[]>(),
  cached: boolean("cached").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Timeline + explainable-AI audit trail
export const events = pgTable(
  "events",
  {
    id: serial("id").primaryKey(),
    applicationId: integer("application_id")
      .references(() => applications.id, { onDelete: "cascade" })
      .notNull(),
    kind: text("kind").notNull(), // status | ai_decision | override | note
    actor: text("actor").notNull(), // citizen | ai | patwari | tehsildar | system
    actorName: text("actor_name"),
    message: jsonb("message").$type<Bilingual>().notNull(),
    detail: jsonb("detail").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("events_app_idx").on(t.applicationId)],
);

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  citizenId: integer("citizen_id")
    .references(() => citizens.id)
    .notNull(),
  applicationId: integer("application_id").references(() => applications.id, {
    onDelete: "cascade",
  }),
  title: jsonb("title").$type<Bilingual>().notNull(),
  body: jsonb("body").$type<Bilingual>().notNull(),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const grievances = pgTable("grievances", {
  id: serial("id").primaryKey(),
  refNo: text("ref_no").notNull().unique(),
  citizenId: integer("citizen_id").references(() => citizens.id),
  text: text("text").notNull(),
  district: text("district").notNull(),
  category: text("category").notNull(),
  department: text("department").notNull(),
  priority: text("priority").notNull(), // low | medium | high | critical
  summaryEn: text("summary_en").notNull(),
  sentiment: text("sentiment"),
  aiReason: text("ai_reason"),
  status: text("status").notNull().default("open"), // open | in_progress | resolved
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  isSeed: boolean("is_seed").notNull().default(false),
});

// Results of the real OCR+LLM pipeline, keyed by image hash (demo resilience)
export const ocrCache = pgTable("ocr_cache", {
  sha256: text("sha256").primaryKey(),
  result: jsonb("result").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
