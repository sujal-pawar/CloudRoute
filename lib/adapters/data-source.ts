import type { SeededAnomalyEvent } from "@/lib/mock-data/generator"
import type { CloudCredentials, CloudResource, CostDataPoint, DataSourceType } from "@/lib/types"

import {
  fetchAWSCostData,
  fetchAWSResources,
  fetchAWSSeededAnomalyEvents,
} from "@/lib/adapters/aws-adapter"
import {
  fetchAzureCostData,
  fetchAzureResources,
  fetchAzureSeededAnomalyEvents,
} from "@/lib/adapters/azure-adapter"
import {
  fetchGCPCostData,
  fetchGCPResources,
  fetchGCPSeededAnomalyEvents,
} from "@/lib/adapters/gcp-adapter"
import {
  fetchDemoCostData,
  fetchDemoResources,
  fetchDemoSeededAnomalyEvents,
} from "@/lib/adapters/demo-adapter"

export async function getResources(
  source: DataSourceType,
  credentials?: CloudCredentials
): Promise<CloudResource[]> {
  if (source === "demo" || !credentials) {
    return fetchDemoResources()
  }

  if (source === "aws" && credentials?.provider === "aws") {
    return fetchAWSResources(credentials)
  }

  if (source === "azure" && credentials?.provider === "azure") {
    return fetchAzureResources(credentials)
  }

  if (source === "gcp" && credentials?.provider === "gcp") {
    return fetchGCPResources(credentials)
  }

  throw new Error(`Unsupported data source/provider combination: source='${source}', provider='${credentials.provider}'`)
}

export async function getCostData(
  source: DataSourceType,
  credentials?: CloudCredentials,
  days = 90
): Promise<CostDataPoint[]> {
  if (source === "demo" || !credentials) {
    return fetchDemoCostData(days)
  }

  if (source === "aws" && credentials?.provider === "aws") {
    return fetchAWSCostData(credentials, days)
  }

  if (source === "azure" && credentials?.provider === "azure") {
    return fetchAzureCostData(credentials, days)
  }

  if (source === "gcp" && credentials?.provider === "gcp") {
    return fetchGCPCostData(credentials, days)
  }

  throw new Error(`Unsupported data source/provider combination: source='${source}', provider='${credentials.provider}'`)
}

export async function getSeededAnomalyEvents(
  source: DataSourceType,
  credentials?: CloudCredentials
): Promise<SeededAnomalyEvent[]> {
  if (source === "demo" || !credentials) {
    return fetchDemoSeededAnomalyEvents()
  }

  if (source === "aws" && credentials?.provider === "aws") {
    return fetchAWSSeededAnomalyEvents(credentials)
  }

  if (source === "azure" && credentials?.provider === "azure") {
    return fetchAzureSeededAnomalyEvents(credentials)
  }

  if (source === "gcp" && credentials?.provider === "gcp") {
    return fetchGCPSeededAnomalyEvents(credentials)
  }

  throw new Error(`Unsupported data source/provider combination: source='${source}', provider='${credentials.provider}'`)
}
