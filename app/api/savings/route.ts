import { resolveDataSourceContext } from "@/lib/data-source-context"
import { createRequiresCloudConnectionResponse } from "@/lib/api/requires-cloud-connection"
import { getSavingsEntries } from "@/lib/server-state";

export async function GET(request: Request) {
  const context = await resolveDataSourceContext(request)

  if (context.requiresConnection) {
    return createRequiresCloudConnectionResponse(context)
  }

  const savings = getSavingsEntries(context.scopeKey);

  return Response.json({
    source: context.source,
    count: savings.length,
    totalRealizedSavings: round2(
      savings.reduce((sum, entry) => sum + entry.totalRealizedSavings, 0)
    ),
    savings,
  });
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}