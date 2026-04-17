import { getCostData } from "@/lib/adapters/data-source"
import { createRequiresCloudConnectionResponse } from "@/lib/api/requires-cloud-connection"
import { resolveDataSourceContext } from "@/lib/data-source-context"
import {
  createAlertRule,
  listAlertEvents,
  listAlertRules,
  runAlertChecker,
} from "@/lib/engine/alert-checker";
import type { AlertRule } from "@/lib/types";

type CreateAlertBody = {
  name?: string;
  scope?: AlertRule["scope"];
  scopeValue?: string;
  threshold?: number;
  thresholdType?: AlertRule["thresholdType"];
};

export async function GET(request: Request) {
  const context = await resolveDataSourceContext(request)

  if (context.requiresConnection) {
    return createRequiresCloudConnectionResponse(context)
  }

  const costData = await getCostData(context.source, context.credentials, 90)
  // Ensure default rules are evaluated so breach history is populated for demo views.
  const result = runAlertChecker(costData, context.scopeKey);
  const rules =
    result.rules.length > 0
      ? result.rules
      : listAlertRules(costData, context.scopeKey);
  const events = listAlertEvents(context.scopeKey);

  return Response.json({
    source: context.source,
    count: rules.length,
    rules,
    events,
  });
}

export async function POST(request: Request) {
  const context = await resolveDataSourceContext(request)

  if (context.requiresConnection) {
    return createRequiresCloudConnectionResponse(context)
  }

  const costData = await getCostData(context.source, context.credentials, 90)
  const body = (await request.json()) as CreateAlertBody;

  if (!body.name || !body.scope || typeof body.threshold !== "number") {
    return Response.json(
      { error: "name, scope and threshold are required" },
      { status: 400 }
    );
  }

  try {
    const rule = createAlertRule(
      {
        name: body.name,
        scope: body.scope,
        scopeValue: body.scopeValue,
        threshold: body.threshold,
        thresholdType: body.thresholdType,
      },
      costData,
      context.scopeKey
    );

    const result = runAlertChecker(costData, context.scopeKey);

    return Response.json({
      source: context.source,
      rule,
      newlyBreached: result.breachedEvents,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create alert rule";
    return Response.json({ error: message }, { status: 400 });
  }
}