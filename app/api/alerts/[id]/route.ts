import { getCostData } from "@/lib/adapters/data-source"
import { createRequiresCloudConnectionResponse } from "@/lib/api/requires-cloud-connection"
import { resolveDataSourceContext } from "@/lib/data-source-context"
import { deleteAlertRule, updateAlertRule } from "@/lib/engine/alert-checker";
import type { AlertRule } from "@/lib/types";

type UpdateAlertBody = Partial<
  Pick<AlertRule, "name" | "scope" | "scopeValue" | "threshold" | "thresholdType">
>;

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const sourceContext = await resolveDataSourceContext(request)

  if (sourceContext.requiresConnection) {
    return createRequiresCloudConnectionResponse(sourceContext)
  }

  const costData = await getCostData(sourceContext.source, sourceContext.credentials, 90)
  const { id } = await context.params;
  const body = (await request.json()) as UpdateAlertBody;

  try {
    const rule = updateAlertRule(id, body, costData, sourceContext.scopeKey);
    return Response.json({ source: sourceContext.source, rule });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update alert rule";
    return Response.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const sourceContext = await resolveDataSourceContext(request)

  if (sourceContext.requiresConnection) {
    return createRequiresCloudConnectionResponse(sourceContext)
  }

  const { id } = await context.params;
  const removed = deleteAlertRule(id, sourceContext.scopeKey);

  if (!removed) {
    return Response.json({ error: "Alert rule not found" }, { status: 404 });
  }

  return Response.json({ ok: true, source: sourceContext.source });
}
