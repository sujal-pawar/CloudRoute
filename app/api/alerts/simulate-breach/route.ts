import { getCostData } from "@/lib/adapters/data-source"
import { createRequiresCloudConnectionResponse } from "@/lib/api/requires-cloud-connection"
import { resolveDataSourceContext } from "@/lib/data-source-context"
import {
  createAlertRule,
  listAlertRules,
  runAlertChecker,
  updateAlertRule,
} from "@/lib/engine/alert-checker"

const RESET_THRESHOLD = 10_000_000
const BREACH_THRESHOLD = 1

export async function POST(request: Request) {
  const context = await resolveDataSourceContext(request)

  if (context.requiresConnection) {
    return createRequiresCloudConnectionResponse(context)
  }

  const costData = await getCostData(context.source, context.credentials, 90)
  let rules = listAlertRules(costData, context.scopeKey)

  let targetRule = rules.find((rule) => rule.scope === "team" && rule.scopeValue === "backend")

  if (!targetRule) {
    targetRule = createAlertRule(
      {
        name: "Backend Budget Watch",
        scope: "team",
        scopeValue: "backend",
        threshold: 7600,
        thresholdType: "absolute",
      },
      costData,
      context.scopeKey
    )

    rules = listAlertRules(costData, context.scopeKey)
    targetRule = rules.find((rule) => rule.id === targetRule?.id) ?? targetRule
  }

  updateAlertRule(
    targetRule.id,
    {
      thresholdType: "absolute",
      threshold: RESET_THRESHOLD,
    },
    costData,
    context.scopeKey
  )
  runAlertChecker(costData, context.scopeKey)

  updateAlertRule(
    targetRule.id,
    {
      thresholdType: "absolute",
      threshold: BREACH_THRESHOLD,
    },
    costData,
    context.scopeKey
  )

  const result = runAlertChecker(costData, context.scopeKey)
  const event = result.breachedEvents.find((entry) => entry.ruleId === targetRule.id) ?? result.breachedEvents[0]

  return Response.json({
    source: context.source,
    event,
    ruleId: targetRule.id,
    message: event?.message ?? "Simulated budget breach triggered.",
  })
}
