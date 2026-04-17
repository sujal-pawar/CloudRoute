import type { CloudResource, Recommendation, ResourceType } from "@/lib/types";

type TierPrice = {
  tier: string;
  monthlyCost: number;
};

const EC2_TIERS: TierPrice[] = [
  { tier: "t3.micro", monthlyCost: 8.5 },
  { tier: "t3.small", monthlyCost: 17 },
  { tier: "t3.medium", monthlyCost: 34 },
  { tier: "t3.large", monthlyCost: 68 },
  { tier: "t3.xlarge", monthlyCost: 135 },
  { tier: "m5.large", monthlyCost: 70 },
  { tier: "m5.xlarge", monthlyCost: 140 },
  { tier: "m5.2xlarge", monthlyCost: 280 },
  { tier: "c5.large", monthlyCost: 62 },
  { tier: "c5.xlarge", monthlyCost: 124 },
];

const RDS_TIERS: TierPrice[] = [
  { tier: "db.t3.micro", monthlyCost: 15 },
  { tier: "db.t3.small", monthlyCost: 30 },
  { tier: "db.t3.medium", monthlyCost: 60 },
  { tier: "db.r5.large", monthlyCost: 175 },
  { tier: "db.r5.xlarge", monthlyCost: 350 },
];

export function generateRightsizingRecommendations(resources: CloudResource[]): Recommendation[] {
  const recommendations: Recommendation[] = [];

  for (const resource of resources) {
    if (resource.type !== "ec2" && resource.type !== "rds") {
      continue;
    }

    const recommendation = buildRecommendation(resource);
    if (recommendation) {
      recommendations.push(recommendation);
    }
  }

  return recommendations.sort((a, b) => b.monthlySavings - a.monthlySavings);
}

function buildRecommendation(resource: CloudResource): Recommendation | null {
  const cpu = resource.usageMetrics.avgCpuPercent;
  const memory = resource.usageMetrics.avgMemoryPercent;

  if (resource.environment === "production" && cpu > 15) {
    return null;
  }

  let stepDown = 0;
  if (cpu < 10) {
    stepDown = 2;
  } else if (cpu < 20 || memory < 15) {
    stepDown = 1;
  }

  if (stepDown === 0) {
    return null;
  }

  const tierList = getTierList(resource.type);
  const currentIndex = resolveTierIndex(resource, tierList);
  const suggestedIndex = Math.max(0, currentIndex - stepDown);

  if (suggestedIndex === currentIndex) {
    return null;
  }

  const suggestedTier = tierList[suggestedIndex];
  const projectedMonthlyCost = round2(suggestedTier.monthlyCost);
  const monthlySavings = round2(resource.monthlyCost - projectedMonthlyCost);

  if (monthlySavings <= 0) {
    return null;
  }

  const reasoning = buildReasoning(resource, suggestedTier.tier, projectedMonthlyCost, monthlySavings);

  return {
    id: `rec-${resource.id}`,
    resourceId: resource.id,
    resourceName: resource.name,
    type: "rightsize",
    currentTier: resource.tier,
    suggestedTier: suggestedTier.tier,
    currentMonthlyCost: round2(resource.monthlyCost),
    projectedMonthlyCost,
    monthlySavings,
    annualSavings: round2(monthlySavings * 12),
    reasoning,
    effort: stepDown === 2 ? "medium" : "low",
    status: "pending",
  };
}

function buildReasoning(
  resource: CloudResource,
  suggestedTier: string,
  projectedMonthlyCost: number,
  monthlySavings: number
): string {
  const cpu = resource.usageMetrics.avgCpuPercent.toFixed(1);
  const memory = resource.usageMetrics.avgMemoryPercent.toFixed(1);
  const memorySignal = resource.usageMetrics.avgMemoryPercent < 15
    ? ` Memory usage is also low at ${memory}%.`
    : "";

  return `Average CPU ${cpu}% over 30 days indicates ${resource.tier} is oversized. Rightsizing to ${suggestedTier} ($${projectedMonthlyCost}/mo) saves $${monthlySavings}/month.${memorySignal}`;
}

function resolveTierIndex(resource: CloudResource, tiers: TierPrice[]): number {
  const exactIndex = tiers.findIndex((entry) => entry.tier === resource.tier);
  if (exactIndex >= 0) {
    return exactIndex;
  }

  let bestIndex = 0;
  let minGap = Number.POSITIVE_INFINITY;

  for (let index = 0; index < tiers.length; index += 1) {
    const gap = Math.abs(tiers[index].monthlyCost - resource.monthlyCost);
    if (gap < minGap) {
      minGap = gap;
      bestIndex = index;
    }
  }

  return bestIndex;
}

function getTierList(type: ResourceType): TierPrice[] {
  return type === "ec2" ? EC2_TIERS : RDS_TIERS;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}