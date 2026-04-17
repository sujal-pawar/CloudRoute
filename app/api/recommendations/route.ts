import { generateRightsizingRecommendations } from "@/lib/engine/rightsizing";
import { RESOURCES } from "@/lib/mock-data/generator";
import { getRecommendationStates } from "@/lib/server-state";

export async function GET() {
  const baseRecommendations = generateRightsizingRecommendations(RESOURCES);
  const stateMap = getRecommendationStates();

  const recommendations = baseRecommendations.map((recommendation) => {
    const state = stateMap[recommendation.id];
    return state ? { ...recommendation, ...state } : recommendation;
  });

  return Response.json({
    count: recommendations.length,
    totalSavingsOpportunity: round2(
      recommendations
        .filter((recommendation) => recommendation.status === "pending")
        .reduce((sum, recommendation) => sum + recommendation.monthlySavings, 0)
    ),
    recommendations,
  });
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}