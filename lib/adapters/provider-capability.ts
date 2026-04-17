import "server-only"

import { CloudWatchClient, GetMetricStatisticsCommand } from "@aws-sdk/client-cloudwatch"
import { CostExplorerClient, GetCostAndUsageCommand } from "@aws-sdk/client-cost-explorer"
import { DescribeInstancesCommand, EC2Client } from "@aws-sdk/client-ec2"
import { DescribeDBInstancesCommand, RDSClient } from "@aws-sdk/client-rds"
import { ListBucketsCommand, S3Client } from "@aws-sdk/client-s3"

import type { CloudCredentials, CloudProvider } from "@/lib/types"

type ProviderCapability = {
  name: string
  passed: boolean
  detail?: string
}

export type ProviderCapabilityCheckResult = {
  provider: CloudProvider
  passed: boolean
  checkedAt: string
  capabilities: ProviderCapability[]
}

export async function checkProviderCapabilities(
  provider: CloudProvider,
  credentials: CloudCredentials
): Promise<ProviderCapabilityCheckResult> {
  if (provider === "aws") {
    return checkAwsCapabilities(credentials)
  }

  return {
    provider,
    passed: true,
    checkedAt: new Date().toISOString(),
    capabilities: [
      {
        name: provider === "azure" ? "Azure Basic Connectivity" : "GCP Basic Connectivity",
        passed: true,
        detail: "Capability ping is currently enforced only for AWS.",
      },
    ],
  }
}

async function checkAwsCapabilities(
  credentials: CloudCredentials
): Promise<ProviderCapabilityCheckResult> {
  if (!credentials.accessKeyId || !credentials.secretAccessKey) {
    return {
      provider: "aws",
      passed: false,
      checkedAt: new Date().toISOString(),
      capabilities: [
        {
          name: "AWS Credentials",
          passed: false,
          detail: "Missing access key or secret key.",
        },
      ],
    }
  }

  const region = credentials.region?.trim() || "us-east-1"
  const awsCredentials = {
    accessKeyId: credentials.accessKeyId,
    secretAccessKey: credentials.secretAccessKey,
    sessionToken: credentials.sessionToken,
  }

  const ec2 = new EC2Client({ region, credentials: awsCredentials })
  const rds = new RDSClient({ region, credentials: awsCredentials })
  const s3 = new S3Client({ region, credentials: awsCredentials })
  const cloudWatch = new CloudWatchClient({ region, credentials: awsCredentials })
  const costExplorer = new CostExplorerClient({ region: "us-east-1", credentials: awsCredentials })

  const capabilities = await Promise.all([
    runAwsCapability("EC2 DescribeInstances", async () => {
      await ec2.send(new DescribeInstancesCommand({ MaxResults: 5 }))
    }),
    runAwsCapability("RDS DescribeDBInstances", async () => {
      await rds.send(new DescribeDBInstancesCommand({ MaxRecords: 20 }))
    }),
    runAwsCapability("S3 ListBuckets", async () => {
      await s3.send(new ListBucketsCommand({}))
    }),
    runAwsCapability("CloudWatch GetMetricStatistics", async () => {
      const now = new Date()
      const startTime = new Date(now.getTime() - 60 * 60 * 1000)

      await cloudWatch.send(
        new GetMetricStatisticsCommand({
          Namespace: "AWS/EC2",
          MetricName: "CPUUtilization",
          StartTime: startTime,
          EndTime: now,
          Period: 300,
          Statistics: ["Average"],
        })
      )
    }),
    runAwsCapability("Cost Explorer GetCostAndUsage", async () => {
      const end = new Date()
      const start = new Date(end.getTime() - 24 * 60 * 60 * 1000)

      await costExplorer.send(
        new GetCostAndUsageCommand({
          TimePeriod: {
            Start: toIsoDate(start),
            End: toIsoDate(end),
          },
          Granularity: "DAILY",
          Metrics: ["UnblendedCost"],
        })
      )
    }),
  ])

  return {
    provider: "aws",
    passed: capabilities.every((capability) => capability.passed),
    checkedAt: new Date().toISOString(),
    capabilities,
  }
}

async function runAwsCapability(name: string, action: () => Promise<void>): Promise<ProviderCapability> {
  try {
    await action()
    return {
      name,
      passed: true,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return {
      name,
      passed: false,
      detail: message,
    }
  }
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}
