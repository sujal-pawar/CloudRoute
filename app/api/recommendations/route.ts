import { generateRightsizingRecommendations } from "@/lib/engine/rightsizing";
import { getResources } from "@/lib/adapters/data-source"
import { createRequiresCloudConnectionResponse } from "@/lib/api/requires-cloud-connection"
import { resolveDataSourceContext } from "@/lib/data-source-context"
import { getRecommendationStates } from "@/lib/server-state";

export async function GET(request: Request) {
  const context = await resolveDataSourceContext(request)

  if (context.requiresConnection) {
    return createRequiresCloudConnectionResponse(context)
  }

  const resources = await getResources(context.source, context.credentials)
  const baseRecommendations = generateRightsizingRecommendations(resources);
  const stateMap = getRecommendationStates(context.scopeKey);

  const recommendations = baseRecommendations.map((recommendation) => {
    const state = stateMap[recommendation.id];
    return state ? { ...recommendation, ...state } : recommendation;
  });

  return Response.json({
    source: context.source,
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