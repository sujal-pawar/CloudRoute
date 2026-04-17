import type { CloudResource, IdleResource } from "@/lib/types";

const BUSINESS_HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17];

export function detectIdleResources(resources: CloudResource[]): IdleResource[] {
  const idleResources: IdleResource[] = [];

  for (const resource of resources) {
    const idleResource = analyzeResource(resource);
    if (idleResource) {
      idleResources.push(idleResource);
    }
  }

  return idleResources.sort((a, b) => b.monthlySavings - a.monthlySavings);
}

function analyzeResource(resource: CloudResource): IdleResource | null {
  const reasons: string[] = [];
  let idleSignalCount = 0;
  const now = new Date();

  const lastActiveAt = new Date(resource.usageMetrics.lastActiveAt);
  const idleDaysSinceActive = dayDiff(now, lastActiveAt);

  const cpuIdle = resource.usageMetrics.avgCpuPercent < 5 && idleDaysSinceActive > 7;
  if (cpuIdle) {
    idleSignalCount += 1;
    reasons.push(
      `CPU ${resource.usageMetrics.avgCpuPercent.toFixed(1)}% avg and inactive for ${idleDaysSinceActive} days`
    );
  }

  const lowNetworkStreak = longestConsecutiveDays(
    resource.usageMetrics.dailyUsage.map((entry) => entry.networkMbps < 0.1)
  );
  const networkIdle = lowNetworkStreak >= 14;
  if (networkIdle) {
    idleSignalCount += 1;
    reasons.push(`Network throughput < 0.1 Mbps for ${lowNetworkStreak} consecutive days`);
  }

  const storageIdle = resource.type === "s3" && resource.usageMetrics.avgDiskIops < 10;
  if (storageIdle) {
    idleSignalCount += 1;
    reasons.push(`Storage activity near zero (avg ${resource.usageMetrics.avgDiskIops.toFixed(1)} IOPS)`);
  }

  const lambdaIdleDays =
    resource.type === "lambda"
      ? longestConsecutiveDays(
          resource.usageMetrics.dailyUsage.map((entry) => estimateLambdaInvocations(entry.networkMbps) < 10)
        )
      : 0;
  const lambdaIdle = resource.type === "lambda" && lambdaIdleDays >= 14;
  if (lambdaIdle) {
    idleSignalCount += 1;
    reasons.push(`Estimated invocation count < 10/day for ${lambdaIdleDays} consecutive days`);
  }

  if (!cpuIdle && !networkIdle && !storageIdle && !lambdaIdle) {
    return null;
  }

  const businessHoursOnly = isBusinessHoursOnlyResource(resource.usageMetrics.peakHours);
  const recommendation = businessHoursOnly && resource.environment !== "production"
    ? "schedule-shutdown"
    : idleSignalCount === 1
      ? "resize"
      : "terminate";

  const monthlySavings =
    recommendation === "terminate"
      ? resource.monthlyCost
      : recommendation === "schedule-shutdown"
        ? resource.monthlyCost * 0.65
        : resource.monthlyCost * 0.45;

  const idleDays = Math.max(idleDaysSinceActive, lowNetworkStreak, lambdaIdleDays);
  const confidence = idleSignalCount >= 2 ? 95 : 75;

  return {
    resource,
    idleReason: reasons.join("; "),
    idleDays,
    monthlySavings: round2(monthlySavings),
    recommendation,
    confidence,
  };
}

function dayDiff(later: Date, earlier: Date): number {
  const msInDay = 1000 * 60 * 60 * 24;
  return Math.max(0, Math.floor((later.getTime() - earlier.getTime()) / msInDay));
}

function longestConsecutiveDays(flags: boolean[]): number {
  let best = 0;
  let current = 0;

  for (const flag of flags) {
    if (flag) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 0;
    }
  }

  return best;
}

function isBusinessHoursOnlyResource(peakHours: number[]): boolean {
  if (peakHours.length === 0) {
    return false;
  }

  return peakHours.every((hour) => BUSINESS_HOURS.includes(hour));
}

function estimateLambdaInvocations(networkMbps: number): number {
  return Math.round(networkMbps * 100);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}