import type { Bi } from "./services";

export const STATUS_LABEL: Record<string, Bi> = {
  submitted: { en: "Submitted", hi: "जमा" },
  patwari_review: { en: "With Patwari", hi: "पटवारी के पास" },
  tehsildar_review: { en: "With Tehsildar", hi: "तहसीलदार के पास" },
  correction_needed: { en: "Action needed", hi: "कार्रवाई आवश्यक" },
  approved: { en: "Approved", hi: "स्वीकृत" },
  rejected: { en: "Rejected", hi: "अस्वीकृत" },
};

export const STATUS_CLASS: Record<string, string> = {
  submitted: "bg-secondary text-secondary-foreground",
  patwari_review: "bg-primary/10 text-primary",
  tehsildar_review: "bg-primary/10 text-primary",
  correction_needed: "bg-warning/20 text-[oklch(0.5_0.13_60)]",
  approved: "bg-success/15 text-[oklch(0.42_0.12_150)]",
  rejected: "bg-destructive/10 text-destructive",
};

/** Index into the 5-step progress bar: submitted, AI, patwari, tehsildar, certificate */
export function progressIndex(status: string) {
  return { submitted: 1, patwari_review: 2, correction_needed: 2, tehsildar_review: 3, approved: 5, rejected: 5 }[status] ?? 1;
}
