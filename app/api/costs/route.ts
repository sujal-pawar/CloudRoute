import { COST_DATA } from "@/lib/mock-data/generator";
import { runAlertChecker } from "@/lib/engine/alert-checker";

type GroupBy = "service" | "team" | "environment";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const periodParam = searchParams.get("period") ?? "30d";
  const groupByParam = (searchParams.get("groupBy") ?? "service") as GroupBy;

  const periodDays = parsePeriod(periodParam);
  const groupBy = parseGroupBy(groupByParam);
  const selectedData = COST_DATA.slice(-periodDays);

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

  const alertResult = runAlertChecker(COST_DATA);

  return Response.json({
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