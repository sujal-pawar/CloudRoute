import { getCostData } from "@/lib/adapters/data-source";
import { createRequiresCloudConnectionResponse } from "@/lib/api/requires-cloud-connection";
import { resolveDataSourceContext } from "@/lib/data-source-context";
import { runAlertChecker } from "@/lib/engine/alert-checker";

type GroupBy = "service" | "team" | "environment";

export async function GET(request: Request) {
  const context = await resolveDataSourceContext(request)

  if (context.requiresConnection) {
    return createRequiresCloudConnectionResponse(context)
  }

  const { searchParams } = new URL(request.url);
  const periodParam = searchParams.get("period") ?? "30d";
  const groupByParam = (searchParams.get("groupBy") ?? "service") as GroupBy;

  const periodDays = parsePeriod(periodParam);
  const groupBy = parseGroupBy(groupByParam);
  const costData = await getCostData(context.source, context.credentials, 90)
  const selectedData = costData.slice(-periodDays);

  const data = selectedData.map((point) => {
    const breakdown =
      groupBy === "service"
        ? point.byService
        : groupBy === "team"
          ? point.byTeam
          : point.byEnvironment;

    return {
      date: point.date,
      totalCost: point.totalCost,
      breakdown,
    };
  });

  const alertResult = runAlertChecker(costData, context.scopeKey);

  return Response.json({
    source: context.source,
    period: periodParam,
    groupBy,
    count: data.length,
    data,
    alerts: alertResult.breachedEvents,
    activeAlertRules: alertResult.rules,
  });
}

function parsePeriod(period: string): number {
  if (period === "7d") {
    return 7;
  }

  if (period === "90d") {
    return 90;
  }

  return 30;
}

function parseGroupBy(groupBy: string): GroupBy {
  if (groupBy === "team" || groupBy === "environment") {
    return groupBy;
  }

  return "service";
}