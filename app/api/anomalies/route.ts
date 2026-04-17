import { detectCostAnomalies } from "@/lib/engine/anomaly-detector";
import { getCostData, getResources, getSeededAnomalyEvents } from "@/lib/adapters/data-source"
import { createRequiresCloudConnectionResponse } from "@/lib/api/requires-cloud-connection"
import { resolveDataSourceContext } from "@/lib/data-source-context"

export async function GET(request: Request) {
  const context = await resolveDataSourceContext(request)

  if (context.requiresConnection) {
    return createRequiresCloudConnectionResponse(context)
  }

  const [costData, resources, seededEvents] = await Promise.all([
    getCostData(context.source, context.credentials, 90),
    getResources(context.source, context.credentials),
    getSeededAnomalyEvents(context.source, context.credentials),
  ])

  const anomalies = detectCostAnomalies(costData, resources, seededEvents);

  return Response.json({
    source: context.source,
    count: anomalies.length,
    anomalies,
  });
}