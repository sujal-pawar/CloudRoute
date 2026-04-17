import {
  COST_DATA,
  RESOURCES,
  SEEDED_ANOMALY_EVENTS,
  type SeededAnomalyEvent,
} from "@/lib/mock-data/generator"
import type { CloudCredentials, CloudResource, CostDataPoint } from "@/lib/types"

// NOTE: This adapter is a provider abstraction stub for hackathon/demo mode.
// Replace with GCP Cloud Billing + Asset/Compute APIs for production workloads.
export async function fetchGCPResources(credentials: CloudCredentials): Promise<CloudResource[]> {
  const projectId = (credentials.projectId ?? "gcp-project").trim().toLowerCase()
  const seed = hashString(`${projectId}:${credentials.label ?? "gcp"}`)

  return RESOURCES.map((resource, index) => {
    const multiplier = 0.72 + ((seed + index * 23) % 41) / 100
    const monthlyCost = round2(resource.monthlyCost * multiplier)

    return {
      ...resource,
      id: `gcp-${projectId}-${resource.id}`,
      name: `gcp-${resource.name}`,
      region: mapRegionToGcp(resource.region),
      monthlyCost,
      hourlyCost: round4(monthlyCost / (30 * 24)),
      tags: {
        ...resource.tags,
        provider: "gcp",
        project: projectId,
      },
      usageMetrics: scaleUsage(resource.usageMetrics, seed + index),
    }
  })
}

export async function fetchGCPCostData(
  credentials: CloudCredentials,
  days = 90
): Promise<CostDataPoint[]> {
  const projectId = (credentials.projectId ?? "gcp-project").trim().toLowerCase()
  const seed = hashString(`${projectId}:${credentials.label ?? "gcp"}`)
  const source = COST_DATA.slice(-days)

  return source.map((point, index) => {
    const factor = 0.8 + ((seed + index * 13) % 22) / 100
    const byService = scaleRecord(point.byService, factor)
    const byTeam = scaleRecord(point.byTeam, factor)
    const byEnvironment = scaleRecord(point.byEnvironment, factor)

    return {
      date: point.date,
      totalCost: round2(sumValues(byService)),
      byService,
      byTeam,
      byEnvironment,
    }
  })
}

export async function fetchGCPSeededAnomalyEvents(
  credentials: CloudCredentials
): Promise<SeededAnomalyEvent[]> {
  const projectId = (credentials.projectId ?? "gcp-project").trim().toLowerCase()

  return SEEDED_ANOMALY_EVENTS.map((event) => ({
    ...event,
    id: `gcp-${projectId}-${event.id}`,
    resourceId: `gcp-${projectId}-${event.resourceId}`,
    resourceName: `gcp-${event.resourceName}`,
  }))
}

function mapRegionToGcp(region: string): string {
  if (region === "us-east-1") {
    return "us-east1"
  }

  if (region === "us-west-2") {
    return "us-west2"
  }

  if (region === "eu-west-1") {
    return "europe-west1"
  }

  return "asia-southeast1"
}

function scaleUsage(resourceUsage: CloudResource["usageMetrics"], seed: number) {
  const usageFactor = 0.82 + (seed % 21) / 100

  return {
    ...resourceUsage,
    avgCpuPercent: round2(resourceUsage.avgCpuPercent * usageFactor),
    avgMemoryPercent: round2(resourceUsage.avgMemoryPercent * usageFactor),
    avgNetworkMbps: round3(resourceUsage.avgNetworkMbps * usageFactor),
    avgDiskIops: round2(resourceUsage.avgDiskIops * usageFactor),
    dailyUsage: resourceUsage.dailyUsage.map((point, index) => {
      const dailyFactor = usageFactor * (0.94 + ((seed + index * 5) % 9) / 100)
      return {
        ...point,
        cpuPercent: round2(point.cpuPercent * dailyFactor),
        memoryPercent: round2(point.memoryPercent * dailyFactor),
        networkMbps: round3(point.networkMbps * dailyFactor),
        cost: round2(point.cost * dailyFactor),
      }
    }),
  }
}

function scaleRecord<T extends string>(
  record: Record<T, number>,
  factor: number
): Record<T, number> {
  const scaled = {} as Record<T, number>

  for (const key of Object.keys(record) as T[]) {
    scaled[key] = round2(record[key] * factor)
  }

  return scaled
}

function sumValues(record: Record<string, number>) {
  return Object.values(record).reduce((sum, value) => sum + value, 0)
}

function hashString(value: string): number {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0
  }

  return Math.abs(hash)
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000
}

function round4(value: number): number {
  return Math.round(value * 10000) / 10000
}
