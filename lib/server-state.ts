import type { Recommendation, SavingsEntry } from "@/lib/types";

type RecommendationState = Pick<Recommendation, "status" | "actedAt" | "actualSavingsToDate">;

let recommendationStatesByScope: Record<string, Record<string, RecommendationState>> = {};
let savingsEntriesByScope: Record<string, SavingsEntry[]> = {};

export function getRecommendationStates(scopeKey = "global"): Record<string, RecommendationState> {
  const scope = recommendationStatesByScope[scopeKey] ?? {};
  return { ...scope };
}

export function markRecommendationActed(
  recommendation: Recommendation,
  scopeKey = "global"
): Recommendation {
  const now = new Date();
  const actedAt = now.toISOString();
  const actualSavingsToDate = round2(recommendation.monthlySavings * 0.85);
  const scopedRecommendationStates = recommendationStatesByScope[scopeKey] ?? {};
  const scopedSavingsEntries = savingsEntriesByScope[scopeKey] ?? [];

  recommendationStatesByScope = {
    ...recommendationStatesByScope,
    [scopeKey]: {
      ...scopedRecommendationStates,
      [recommendation.id]: {
        status: "acted",
        actedAt,
        actualSavingsToDate,
      },
    },
  };

  const existingEntryIndex = scopedSavingsEntries.findIndex(
    (entry) => entry.recommendationId === recommendation.id
  );
  const nextEntry = buildSavingsEntry(recommendation, actedAt);
  let nextSavingsEntries: SavingsEntry[];

  if (existingEntryIndex >= 0) {
    nextSavingsEntries = [...scopedSavingsEntries];
    nextSavingsEntries[existingEntryIndex] = nextEntry;
  } else {
    nextSavingsEntries = [nextEntry, ...scopedSavingsEntries];
  }

  savingsEntriesByScope = {
    ...savingsEntriesByScope,
    [scopeKey]: nextSavingsEntries,
  };

  return {
    ...recommendation,
    status: "acted",
    actedAt,
    actualSavingsToDate,
  };
}

export function getSavingsEntries(scopeKey = "global"): SavingsEntry[] {
  const scope = savingsEntriesByScope[scopeKey] ?? [];
  return [...scope];
}

function buildSavingsEntry(recommendation: Recommendation, actedAtIso: string): SavingsEntry {
  const actedAt = new Date(actedAtIso);
  const now = new Date();
  const trackedDays = Math.min(30, Math.max(1, dayDiff(now, actedAt) + 1));
  const projectedDailySavings = recommendation.monthlySavings / 30;

  const actualSavingsByDay: { date: string; saving: number }[] = [];

  for (let offset = trackedDays - 1; offset >= 0; offset -= 1) {
    const date = new Date(now);
    date.setDate(now.getDate() - offset);

    const variance = deterministicVariance(recommendation.id, trackedDays - offset);
    const saving = round2(projectedDailySavings * 0.85 * variance);

    actualSavingsByDay.push({
      date: date.toISOString().split("T")[0],
      saving,
    });
  }

  const totalRealizedSavings = round2(
    actualSavingsByDay.reduce((sum, point) => sum + point.saving, 0)
  );

  return {
    recommendationId: recommendation.id,
    resourceName: recommendation.resourceName,
    actedAt: actedAtIso,
    projectedMonthlySavings: recommendation.monthlySavings,
    actualSavingsByDay,
    totalRealizedSavings,
  };
}

function deterministicVariance(seed: string, index: number): number {
  let hash = 0;
  const text = `${seed}-${index}`;

  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) | 0;
  }

  const normalized = Math.abs(hash % 21) / 100;
  return 0.9 + normalized;
}

function dayDiff(later: Date, earlier: Date): number {
  const msInDay = 24 * 60 * 60 * 1000;
  return Math.floor((later.getTime() - earlier.getTime()) / msInDay);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}