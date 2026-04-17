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

  return fetchDemoResources()
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

  return fetchDemoCostData(days)
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

  return fetchDemoSeededAnomalyEvents()
}
