import {
  COST_DATA,
  RESOURCES,
  SEEDED_ANOMALY_EVENTS,
  type SeededAnomalyEvent,
} from "@/lib/mock-data/generator"
import type { CloudResource, CostDataPoint } from "@/lib/types"

export async function fetchDemoResources(): Promise<CloudResource[]> {
  return deepClone(RESOURCES)
}

export async function fetchDemoCostData(days = 90): Promise<CostDataPoint[]> {
  return deepClone(COST_DATA.slice(-days))
}

export async function fetchDemoSeededAnomalyEvents(): Promise<SeededAnomalyEvent[]> {
  return deepClone(SEEDED_ANOMALY_EVENTS)
}

function deepClone<T>(value: T): T {
  return structuredClone(value)
}
