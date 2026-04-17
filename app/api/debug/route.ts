import {
  COST_DATA,
  MOCK_DATA_SUMMARY,
  RESOURCES,
  SEEDED_ANOMALY_EVENTS,
} from "@/lib/mock-data/generator"

export async function GET() {
  return Response.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    summary: MOCK_DATA_SUMMARY,
    resources: RESOURCES,
    costs: COST_DATA,
    seededAnomalies: SEEDED_ANOMALY_EVENTS,
  })
}