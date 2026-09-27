// Predictive SLA-breach risk: an explainable heuristic over live workload signals.
// Each factor is returned with its weight so officers can see *why* a case is flagged.

export type RiskFactor = { label: string; value: number; weight: number };
export type Risk = { score: number; level: "low" | "medium" | "high"; factors: RiskFactor[] };

const STAGE_REMAINING: Record<string, number> = {
  submitted: 1,
  patwari_review: 1,
  correction_needed: 0.9,
  tehsildar_review: 0.45,
  approved: 0,
  rejected: 0,
};

export function slaRisk(input: {
  submittedAt: Date;
  slaDueAt: Date;
  status: string;
  aiVerdict?: "clear" | "review" | "mismatch" | null;
  queueDepth: number; // pending cases at this desk
  now?: Date;
}): Risk {
  const now = input.now ?? new Date();
  const total = input.slaDueAt.getTime() - input.submittedAt.getTime();
  const elapsed = now.getTime() - input.submittedAt.getTime();
  const elapsedRatio = Math.min(1.5, Math.max(0, elapsed / total));
  const remaining = STAGE_REMAINING[input.status] ?? 0.5;
  const backlog = Math.min(1, input.queueDepth / 40);
  const aiFlag = input.aiVerdict === "mismatch" ? 1 : input.aiVerdict === "review" ? 0.5 : 0;

  const factors: RiskFactor[] = [
    { label: "SLA time elapsed", value: Math.min(1, elapsedRatio), weight: 0.5 },
    { label: "Workflow stages remaining", value: remaining, weight: 0.2 },
    { label: "Desk backlog", value: backlog, weight: 0.15 },
    { label: "AI verification flags", value: aiFlag, weight: 0.15 },
  ];
  let score = factors.reduce((s, f) => s + f.value * f.weight, 0);
  if (elapsedRatio >= 1 && remaining > 0) score = Math.max(score, 0.95); // already breached
  if (remaining === 0) score = 0;
  score = Math.round(Math.min(1, score) * 100) / 100;
  return { score, level: score >= 0.6 ? "high" : score >= 0.35 ? "medium" : "low", factors };
}
