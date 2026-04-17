import type {
  CloudResource,
  CostAnomaly,
  IdleResource,
  Recommendation,
  Team,
} from "@/lib/types";

type ScoreInputs = {
  totalCount: number;
  idleCount: number;
  pendingRecommendationCount: number;
  actedRecommendationCount: number;
  anomalyCount: number;
};

export function calculateTeamOptimizationScore(input: ScoreInputs): number {
  if (input.totalCount <= 0) {
    return 100;
  }

  const score =
    100 -
    (input.idleCount / input.totalCount) * 40 -
    input.pendingRecommendationCount * 3 -
    input.anomalyCount * 5 +
    input.actedRecommendationCount * 5;

  return clamp(round2(score), 0, 100);
}

export function calculateTeamOptimizationScores(
  resources: CloudResource[],
  idleResources: IdleResource[],
  recommendations: Recommendation[],
  anomalies: CostAnomaly[]
): Record<Team, number> {
  const teams: Team[] = ["platform", "backend", "frontend", "data", "security", "devops"];
  const result = {} as Record<Team, number>;

  for (const team of teams) {
    const totalCount = resources.filter((resource) => resource.team === team).length;
    const idleCount = idleResources.filter((idle) => idle.resource.team === team).length;
    const pendingRecommendationCount = recommendations.filter(
      (recommendation) => recommendation.status === "pending" && recommendation.resourceId.includes("res-")
    ).filter((recommendation) => {
      const resource = resources.find((item) => item.id === recommendation.resourceId);
      return resource?.team === team;
    }).length;
    const actedRecommendationCount = recommendations.filter(
      (recommendation) => recommendation.status === "acted"
    ).filter((recommendation) => {
      const resource = resources.find((item) => item.id === recommendation.resourceId);
      return resource?.team === team;
    }).length;
    const anomalyCount = anomalies.filter((anomaly) => anomaly.team === team && !anomaly.resolved).length;

    result[team] = calculateTeamOptimizationScore({
      totalCount,
      idleCount,
      pendingRecommendationCount,
      actedRecommendationCount,
      anomalyCount,
    });
  }

  return result;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}