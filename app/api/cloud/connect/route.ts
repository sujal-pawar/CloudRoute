import { NextRequest, NextResponse } from "next/server"

import { checkProviderCapabilities } from "@/lib/adapters/provider-capability"
import { getSessionContextByToken, setSessionCloudConnection } from "@/lib/auth"
import { SESSION_COOKIE_NAME } from "@/lib/auth-constants"
import type { CloudCredentials, DataSourceType } from "@/lib/types"

type ConnectPayload = {
  source?: DataSourceType
  credentials?: CloudCredentials
}

const VALID_SOURCES: DataSourceType[] = ["demo", "aws", "azure", "gcp"]

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const session = await getSessionContextByToken(token)

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  return NextResponse.json({
    source: session.dataSource,
    isRoot: session.user.username.toLowerCase() === "root",
    requiresCloudConnection:
      session.user.username.toLowerCase() !== "root" && !session.cloudCredentials,
    connectPath: "/settings/cloud",
    connection: toPublicConnection(session.cloudCredentials),
  })
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const session = await getSessionContextByToken(token)

  if (!session) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 })
  }

  const isRoot = session.user.username.toLowerCase() === "root"

  const payload = (await request.json().catch(() => null)) as ConnectPayload | null

  const source = payload?.source

  if (!source || !VALID_SOURCES.includes(source)) {
    return NextResponse.json({ error: "Valid source is required." }, { status: 400 })
  }

  const credentials = payload?.credentials

  if (source === "demo") {
    if (!isRoot) {
      return NextResponse.json(
        {
          error: "Demo data is available only for the root user. Connect a cloud provider to continue.",
          requiresConnection: true,
          connectPath: "/settings/cloud",
        },
        { status: 403 }
      )
    }

    const updated = await setSessionCloudConnection(token, {
      dataSource: "demo",
      cloudCredentials: null,
    })

    if (!updated) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 })
    }

    return NextResponse.json({
      source: updated.dataSource,
      isRoot,
      connection: toPublicConnection(updated.cloudCredentials),
    })
  }

  if (!credentials || credentials.provider !== source) {
    return NextResponse.json(
      { error: `Credentials for provider '${source}' are required.` },
      { status: 400 }
    )
  }

  const validationError = validateCredentials(source, credentials)
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 })
  }

  const capabilityCheck = await checkProviderCapabilities(source, credentials)

  if (!capabilityCheck.passed) {
    return NextResponse.json(
      {
        error: `Credential validation failed for one or more required ${source.toUpperCase()} capabilities. Check permissions and try again.`,
        capabilityCheck,
      },
      { status: 400 }
    )
  }

  const updated = await setSessionCloudConnection(token, {
    dataSource: source,
    cloudCredentials: credentials,
  })

  if (!updated) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 })
  }

  return NextResponse.json({
    source: updated.dataSource,
    isRoot,
    capabilityCheck,
    connection: toPublicConnection(updated.cloudCredentials),
  })
}

function validateCredentials(source: Exclude<DataSourceType, "demo">, credentials: CloudCredentials) {
  if (source === "aws") {
    if (!credentials.accessKeyId?.trim() || !credentials.secretAccessKey?.trim()) {
      return "AWS accessKeyId and secretAccessKey are required."
    }
  }

  if (source === "azure") {
    if (!credentials.subscriptionId?.trim() || !credentials.tenantId?.trim()) {
      return "Azure subscriptionId and tenantId are required."
    }
  }

  if (source === "gcp") {
    if (!credentials.projectId?.trim() || !credentials.serviceAccountKey?.trim()) {
      return "GCP projectId and serviceAccountKey are required."
    }
  }

  return null
}

function toPublicConnection(credentials: CloudCredentials | null | undefined) {
  if (!credentials) {
    return {
      connected: false,
      provider: null,
      label: null,
      accountHint: null,
    }
  }

  if (credentials.provider === "aws") {
    return {
      connected: true,
      provider: credentials.provider,
      label: credentials.label ?? null,
      accountHint: credentials.accessKeyId
        ? `****${credentials.accessKeyId.slice(-4)}`
        : null,
      region: credentials.region ?? null,
    }
  }

  if (credentials.provider === "azure") {
    return {
      connected: true,
      provider: credentials.provider,
      label: credentials.label ?? null,
      accountHint: credentials.subscriptionId
        ? `****${credentials.subscriptionId.slice(-4)}`
        : null,
      tenantHint: credentials.tenantId ? `****${credentials.tenantId.slice(-4)}` : null,
    }
  }

  return {
    connected: true,
    provider: credentials.provider,
    label: credentials.label ?? null,
    accountHint: credentials.projectId ?? null,
  }
}
