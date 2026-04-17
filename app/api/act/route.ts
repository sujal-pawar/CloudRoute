import { generateRightsizingRecommendations } from "@/lib/engine/rightsizing";
import { getResources } from "@/lib/adapters/data-source"
import { createRequiresCloudConnectionResponse } from "@/lib/api/requires-cloud-connection"
import { resolveDataSourceContext } from "@/lib/data-source-context"
import { markRecommendationActed } from "@/lib/server-state";

type ActRequestBody = {
  recommendationId?: string;
};

export async function POST(request: Request) {
  const context = await resolveDataSourceContext(request)

  if (context.requiresConnection) {
    return createRequiresCloudConnectionResponse(context)
  }

  const body = (await request.json()) as ActRequestBody;
  const recommendationId = body.recommendationId?.trim();

  if (!recommendationId) {
    return Response.json({ error: "recommendationId is required" }, { status: 400 });
  }

  const resources = await getResources(context.source, context.credentials)
  const recommendations = generateRightsizingRecommendations(resources);
  const recommendation = recommendations.find((item) => item.id === recommendationId);

  if (!recommendation) {
    return Response.json({ error: "Recommendation not found" }, { status: 404 });
  }

  const updatedRecommendation = markRecommendationActed(recommendation, context.scopeKey);

  return Response.json({ source: context.source, recommendation: updatedRecommendation });
}