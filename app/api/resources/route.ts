import { getResources } from "@/lib/adapters/data-source"
import { createRequiresCloudConnectionResponse } from "@/lib/api/requires-cloud-connection"
import { resolveDataSourceContext } from "@/lib/data-source-context"

export async function GET(request: Request) {
  const context = await resolveDataSourceContext(request)

  if (context.requiresConnection) {
    return createRequiresCloudConnectionResponse(context)
  }

  const resources = await getResources(context.source, context.credentials)

  return Response.json({
    source: context.source,
    count: resources.length,
    resources,
  });
}