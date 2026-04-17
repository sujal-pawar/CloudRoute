import { generateRightsizingRecommendations } from "@/lib/engine/rightsizing";
import { RESOURCES } from "@/lib/mock-data/generator";
import { markRecommendationActed } from "@/lib/server-state";

type ActRequestBody = {
  recommendationId?: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as ActRequestBody;
  const recommendationId = body.recommendationId?.trim();

  if (!recommendationId) {
    return Response.json({ error: "recommendationId is required" }, { status: 400 });
  }

  const recommendations = generateRightsizingRecommendations(RESOURCES);
  const recommendation = recommendations.find((item) => item.id === recommendationId);

  if (!recommendation) {
    return Response.json({ error: "Recommendation not found" }, { status: 404 });
  }

  const updatedRecommendation = markRecommendationActed(recommendation);

  return Response.json({ recommendation: updatedRecommendation });
}