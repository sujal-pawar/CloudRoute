import type { DataSourceContext } from "@/lib/data-source-context"

export function createRequiresCloudConnectionResponse(context: DataSourceContext) {
  return Response.json(
    {
      error: "Cloud credentials are required for this account.",
      requiresConnection: true,
      connectPath: context.connectPath,
      source: context.source,
    },
    { status: 412 }
  )
}
