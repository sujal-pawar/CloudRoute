import {
  COST_DATA,
  RESOURCES,
  SEEDED_ANOMALY_EVENTS,
  type SeededAnomalyEvent,
} from "@/lib/mock-data/generator"
import type { CloudCredentials, CloudResource, CostDataPoint } from "@/lib/types"

// NOTE: This adapter is a provider abstraction stub for hackathon/demo mode.
// Replace with Azure SDK/ARM calls when production credentials are available.
export async function fetchAzureResources(credentials: CloudCredentials): Promise<CloudResource[]> {
  const seed = hashString(`${credentials.subscriptionId ?? "azure"}:${credentials.tenantId ?? "tenant"}`)
  const subscriptionHint = (credentials.subscriptionId ?? "azure-sub").slice(-8).toLowerCase()

  return RESOURCES.map((resource, index) => {
    const multiplier = 0.78 + ((seed + index * 19) % 37) / 100
    const monthlyCost = round2(resource.monthlyCost * multiplier)

    return {
      ...resource,
      id: `azure-${subscriptionHint}-${resource.id}`,
      name: `azure-${resource.name}`,
      region: mapRegionToAzure(resource.region),
      monthlyCost,
      hourlyCost: round4(monthlyCost / (30 * 24)),
      tags: {
        ...resource.tags,
        provider: "azure",
        subscription: subscriptionHint,
      },
      usageMetrics: scaleUsage(resource.usageMetrics, seed + index),
    }
  })
}

export async function fetchAzureCostData(
  credentials: CloudCredentials,
  days = 90
): Promise<CostDataPoint[]> {
  const seed = hashString(`${credentials.subscriptionId ?? "azure"}:${credentials.tenantId ?? "tenant"}`)
  const source = COST_DATA.slice(-days)

  return source.map((point, index) => {
    const factor = 0.86 + ((seed + index * 11) % 25) / 100
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

export async function fetchAzureSeededAnomalyEvents(
  credentials: CloudCredentials
): Promise<SeededAnomalyEvent[]> {
  const subscriptionHint = (credentials.subscriptionId ?? "azure-sub").slice(-8).toLowerCase()

  return SEEDED_ANOMALY_EVENTS.map((event) => ({
    ...event,
    id: `azure-${subscriptionHint}-${event.id}`,
    resourceId: `azure-${subscriptionHint}-${event.resourceId}`,
    resourceName: `azure-${event.resourceName}`,
  }))
}

function mapRegionToAzure(region: string): string {
  if (region === "us-east-1") {
    return "eastus"
  }

  if (region === "us-west-2") {
    return "westus2"
  }

  if (region === "eu-west-1") {
    return "westeurope"
  }

  return "southeastasia"
}

function scaleUsage(resourceUsage: CloudResource["usageMetrics"], seed: number) {
  const usageFactor = 0.84 + (seed % 19) / 100

  return {
    ...resourceUsage,
    avgCpuPercent: round2(resourceUsage.avgCpuPercent * usageFactor),
    avgMemoryPercent: round2(resourceUsage.avgMemoryPercent * usageFactor),
    avgNetworkMbps: round3(resourceUsage.avgNetworkMbps * usageFactor),
    avgDiskIops: round2(resourceUsage.avgDiskIops * usageFactor),
    dailyUsage: resourceUsage.dailyUsage.map((point, index) => {
      const dailyFactor = usageFactor * (0.95 + ((seed + index * 3) % 11) / 100)
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
