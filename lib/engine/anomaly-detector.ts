import type {
  CloudResource,
  CostAnomaly,
  CostDataPoint,
} from "@/lib/types";
import type { SeededAnomalyEvent } from "@/lib/mock-data/generator";

export function detectCostAnomalies(
  costData: CostDataPoint[],
  resources: CloudResource[],
  seededEvents: SeededAnomalyEvent[]
): CostAnomaly[] {
  const anomalies: CostAnomaly[] = [];
  const resourceById = new Map(resources.map((resource) => [resource.id, resource]));
  const seededDateSet = new Set<string>();

  for (const seededEvent of seededEvents) {
    seededDateSet.add(seededEvent.date);
    const resource = resourceById.get(seededEvent.resourceId);
    const baselineCost = round2((resource?.monthlyCost ?? 0) / 30);
    const actualCost = round2(baselineCost * seededEvent.multiplier);
    const estimatedExtra = round2(actualCost - baselineCost);
    const spikePercent = baselineCost > 0 ? round2((estimatedExtra / baselineCost) * 100) : 0;

    anomalies.push({
      id: seededEvent.id,
      detectedAt: new Date(`${seededEvent.date}T12:00:00.000Z`).toISOString(),
      resourceId: seededEvent.resourceId,
      resourceName: seededEvent.resourceName,
      team: seededEvent.team,
      service: seededEvent.service,
      baselineCost,
      actualCost,
      spikePercent,
      estimatedExtra,
      possibleCause: seededEvent.possibleCause,
      resolved: false,
    });
  }

  for (let index = 7; index < costData.length; index += 1) {
    const currentDay = costData[index];
    const previousWindow = costData.slice(index - 7, index);
    const baseline = average(previousWindow.map((point) => point.totalCost));

    if (baseline <= 0 || currentDay.totalCost <= baseline * 1.5 || seededDateSet.has(currentDay.date)) {
      continue;
    }

    const estimatedExtra = round2(currentDay.totalCost - baseline);
    const spikePercent = round2((estimatedExtra / baseline) * 100);
    const candidate = pickCandidateResource(resources, index);

    anomalies.push({
      id: `anomaly-detected-${currentDay.date}`,
      detectedAt: new Date(`${currentDay.date}T12:00:00.000Z`).toISOString(),
      resourceId: candidate.id,
      resourceName: candidate.name,
      team: candidate.team,
      service: candidate.type,
      baselineCost: round2(baseline),
      actualCost: round2(currentDay.totalCost),
      spikePercent,
      estimatedExtra,
      possibleCause: `Unusual spend on ${candidate.name} - ${candidate.type.toUpperCase()} in ${candidate.environment}`,
      resolved: false,
    });
  }

  return anomalies.sort((a, b) => b.detectedAt.localeCompare(a.detectedAt));
}

function pickCandidateResource(resources: CloudResource[], seedIndex: number): CloudResource {
  const productionResources = resources.filter((resource) => resource.environment === "production");
  const candidates = (productionResources.length > 0 ? productionResources : resources).sort(
    (left, right) => right.monthlyCost - left.monthlyCost
  );

  return candidates[seedIndex % candidates.length];
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}