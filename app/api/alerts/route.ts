import { COST_DATA } from "@/lib/mock-data/generator";
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

export async function GET() {
  // Ensure default rules are evaluated so breach history is populated for demo views.
  const result = runAlertChecker(COST_DATA);
  const rules = result.rules.length > 0 ? result.rules : listAlertRules(COST_DATA);
  const events = listAlertEvents();

  return Response.json({
    count: rules.length,
    rules,
    events,
  });
}

export async function POST(request: Request) {
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
      COST_DATA
    );

    const result = runAlertChecker(COST_DATA);

    return Response.json({
      rule,
      newlyBreached: result.breachedEvents,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create alert rule";
    return Response.json({ error: message }, { status: 400 });
  }
}