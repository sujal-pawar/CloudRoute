import { detectCostAnomalies } from "@/lib/engine/anomaly-detector";
import {
  COST_DATA,
  RESOURCES,
  SEEDED_ANOMALY_EVENTS,
} from "@/lib/mock-data/generator";

export async function GET() {
  const anomalies = detectCostAnomalies(COST_DATA, RESOURCES, SEEDED_ANOMALY_EVENTS);

  return Response.json({
    count: anomalies.length,
    anomalies,
  });
}