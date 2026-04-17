import { detectIdleResources } from "@/lib/engine/idle-detector";
import { getResources } from "@/lib/adapters/data-source"
import { createRequiresCloudConnectionResponse } from "@/lib/api/requires-cloud-connection"
import { resolveDataSourceContext } from "@/lib/data-source-context"

export async function GET(request: Request) {
  const context = await resolveDataSourceContext(request)

  if (context.requiresConnection) {
    return createRequiresCloudConnectionResponse(context)
  }

  const resources = await getResources(context.source, context.credentials)
  const idleResources = detectIdleResources(resources);

  return Response.json({
    source: context.source,
    count: idleResources.length,
    totalPotentialSavings: round2(
      idleResources.reduce((sum, item) => sum + item.monthlySavings, 0)
    ),
    idleResources,
  });
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}