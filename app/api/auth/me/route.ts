import { NextRequest, NextResponse } from "next/server"

import { getSessionContextByToken } from "@/lib/auth"
import { SESSION_COOKIE_NAME } from "@/lib/auth-constants"

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value

  if (!token) {
    return NextResponse.json({ user: null }, { status: 401 })
  }

  const session = await getSessionContextByToken(token)

  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 })
  }

  const isRoot = session.user.username.toLowerCase() === "root"
  const hasCloudConnection = isRoot || Boolean(session.cloudCredentials)

  return NextResponse.json({
    user: session.user,
    source: session.dataSource,
    isRoot,
    canUseDemo: isRoot,
    requiresCloudConnection: !hasCloudConnection,
    connectPath: "/settings/cloud",
    connection: toPublicConnection(session.cloudCredentials),
  })
}

function toPublicConnection(
  credentials:
    | {
        provider: "aws" | "azure" | "gcp"
        label?: string
        accessKeyId?: string
        subscriptionId?: string
        projectId?: string
        region?: string
      }
    | null
) {
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
    }
  }

  return {
    connected: true,
    provider: credentials.provider,
    label: credentials.label ?? null,
    accountHint: credentials.projectId ?? null,
  }
}
