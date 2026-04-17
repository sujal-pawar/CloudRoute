import "server-only"

import { createSign } from "node:crypto"

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

  if (provider === "gcp") {
    return checkGcpCapabilities(credentials)
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

type ParsedGcpServiceAccount = {
  client_email: string
  private_key: string
  token_uri?: string
}

async function checkGcpCapabilities(
  credentials: CloudCredentials
): Promise<ProviderCapabilityCheckResult> {
  const capabilities: ProviderCapability[] = []

  if (!credentials.projectId?.trim()) {
    return {
      provider: "gcp",
      passed: false,
      checkedAt: new Date().toISOString(),
      capabilities: [
        {
          name: "GCP Project ID",
          passed: false,
          detail: "Missing projectId.",
        },
      ],
    }
  }

  const projectId = credentials.projectId.trim()

  const parsedKeyResult = parseGcpServiceAccountKey(credentials.serviceAccountKey)

  capabilities.push({
    name: "GCP Service Account Key",
    passed: parsedKeyResult.ok,
    detail: parsedKeyResult.ok ? "Service account key parsed successfully." : parsedKeyResult.error,
  })

  if (!parsedKeyResult.ok) {
    return {
      provider: "gcp",
      passed: false,
      checkedAt: new Date().toISOString(),
      capabilities,
    }
  }

  const tokenResult = await exchangeGcpAccessToken(parsedKeyResult.value)

  capabilities.push({
    name: "GCP OAuth Token Exchange",
    passed: tokenResult.ok,
    detail: tokenResult.ok
      ? "Access token issued successfully."
      : tokenResult.error,
  })

  if (!tokenResult.ok) {
    return {
      provider: "gcp",
      passed: false,
      checkedAt: new Date().toISOString(),
      capabilities,
    }
  }

  const projectCheck = await checkGcpProjectAccess(projectId, tokenResult.value)
  capabilities.push({
    name: "GCP Project Access",
    passed: projectCheck.ok,
    detail: projectCheck.ok ? `Project '${projectId}' is reachable.` : projectCheck.error,
  })

  const billingCheck = await checkGcpBillingAccess(projectId, tokenResult.value)
  capabilities.push({
    name: "GCP Billing Access",
    passed: billingCheck.ok,
    detail: billingCheck.ok
      ? "Billing endpoint is reachable for this project."
      : billingCheck.error,
  })

  return {
    provider: "gcp",
    passed: capabilities.every((capability) => capability.passed),
    checkedAt: new Date().toISOString(),
    capabilities,
  }
}

function parseGcpServiceAccountKey(
  rawKey: string | undefined
):
  | { ok: true; value: ParsedGcpServiceAccount }
  | { ok: false; error: string } {
  if (!rawKey?.trim()) {
    return {
      ok: false,
      error: "Missing serviceAccountKey.",
    }
  }

  try {
    const parsed = JSON.parse(rawKey) as Partial<ParsedGcpServiceAccount>

    if (!parsed.client_email || !parsed.private_key) {
      return {
        ok: false,
        error: "serviceAccountKey must include client_email and private_key.",
      }
    }

    return {
      ok: true,
      value: {
        client_email: parsed.client_email,
        private_key: parsed.private_key,
        token_uri: parsed.token_uri,
      },
    }
  } catch {
    return {
      ok: false,
      error: "serviceAccountKey must be valid JSON from a GCP service account key file.",
    }
  }
}

async function exchangeGcpAccessToken(
  key: ParsedGcpServiceAccount
): Promise<{ ok: true; value: string } | { ok: false; error: string }> {
  try {
    const nowInSeconds = Math.floor(Date.now() / 1000)
    const tokenUri = key.token_uri || "https://oauth2.googleapis.com/token"

    const assertion = signJwt(
      {
        alg: "RS256",
        typ: "JWT",
      },
      {
        iss: key.client_email,
        scope:
          "https://www.googleapis.com/auth/cloud-platform.read-only https://www.googleapis.com/auth/cloud-billing.readonly",
        aud: tokenUri,
        iat: nowInSeconds,
        exp: nowInSeconds + 3600,
      },
      key.private_key
    )

    const body = new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    })

    const response = await fetch(tokenUri, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
      cache: "no-store",
    })

    const payload = (await response.json().catch(() => null)) as
      | { access_token?: string; error_description?: string; error?: string }
      | null

    if (!response.ok || !payload?.access_token) {
      return {
        ok: false,
        error:
          payload?.error_description ||
          payload?.error ||
          "Unable to exchange GCP service account key for access token.",
      }
    }

    return {
      ok: true,
      value: payload.access_token,
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "GCP token exchange failed.",
    }
  }
}

async function checkGcpProjectAccess(
  projectId: string,
  accessToken: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const response = await fetch(
      `https://cloudresourcemanager.googleapis.com/v1/projects/${encodeURIComponent(projectId)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      }
    )

    if (!response.ok) {
      const detail = await response.text()
      return {
        ok: false,
        error: `Cloud Resource Manager access failed (${response.status}). ${truncate(detail)}`,
      }
    }

    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to validate project access.",
    }
  }
}

async function checkGcpBillingAccess(
  projectId: string,
  accessToken: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const response = await fetch(
      `https://cloudbilling.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/billingInfo`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      }
    )

    if (!response.ok) {
      const detail = await response.text()
      return {
        ok: false,
        error: `Cloud Billing API access failed (${response.status}). ${truncate(detail)}`,
      }
    }

    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to validate billing access.",
    }
  }
}

function signJwt(
  header: Record<string, string>,
  payload: Record<string, string | number>,
  privateKey: string
) {
  const encodedHeader = base64UrlEncode(JSON.stringify(header))
  const encodedPayload = base64UrlEncode(JSON.stringify(payload))
  const unsignedToken = `${encodedHeader}.${encodedPayload}`

  const signer = createSign("RSA-SHA256")
  signer.update(unsignedToken)
  signer.end()

  const signature = signer.sign(privateKey)
  return `${unsignedToken}.${base64UrlEncode(signature)}`
}

function base64UrlEncode(value: string | Buffer) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")
}

function truncate(value: string, maxLength = 180) {
  const clean = value.replace(/\s+/g, " ").trim()
  if (clean.length <= maxLength) {
    return clean
  }

  return `${clean.slice(0, maxLength)}...`
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
