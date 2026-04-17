import { COST_DATA } from "@/lib/mock-data/generator";
import { deleteAlertRule, updateAlertRule } from "@/lib/engine/alert-checker";
import type { AlertRule } from "@/lib/types";

type UpdateAlertBody = Partial<
  Pick<AlertRule, "name" | "scope" | "scopeValue" | "threshold" | "thresholdType">
>;

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = (await request.json()) as UpdateAlertBody;

  try {
    const rule = updateAlertRule(id, body, COST_DATA);
    return Response.json({ rule });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update alert rule";
    return Response.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  const { id } = await context.params;
  const removed = deleteAlertRule(id);

  if (!removed) {
    return Response.json({ error: "Alert rule not found" }, { status: 404 });
  }

  return Response.json({ ok: true });
}
