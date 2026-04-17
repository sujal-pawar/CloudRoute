import { detectIdleResources } from "@/lib/engine/idle-detector";
import { RESOURCES } from "@/lib/mock-data/generator";

export async function GET() {
  const idleResources = detectIdleResources(RESOURCES);

  return Response.json({
    count: idleResources.length,
    totalPotentialSavings: round2(
      idleResources.reduce((sum, item) => sum + item.monthlySavings, 0)
    ),
    idleResources,
  });
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}