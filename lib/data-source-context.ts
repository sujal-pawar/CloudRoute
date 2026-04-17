import { getSessionContextByToken } from "@/lib/auth"
import { SESSION_COOKIE_NAME } from "@/lib/auth-constants"
import type { CloudCredentials, DataSourceType } from "@/lib/types"

const VALID_DATA_SOURCES: DataSourceType[] = ["demo", "aws", "azure", "gcp"]

export type DataSourceContext = {
  source: DataSourceType
  credentials?: CloudCredentials
  userId?: string
  username?: string
  isRoot: boolean
  requiresConnection: boolean
  connectPath: string
  scopeKey: string
  usedFallback: boolean
}

export async function resolveDataSourceContext(request: Request): Promise<DataSourceContext> {
  const url = new URL(request.url)
  const requestedSource = parseDataSourceType(url.searchParams.get("source"))
  const token = readCookie(request.headers.get("cookie"), SESSION_COOKIE_NAME)

  if (!token) {
    const source = requestedSource ?? "demo"
    return {
      source,
      isRoot: false,
      requiresConnection: false,
      connectPath: "/settings/cloud",
      scopeKey: `anon:${source}`,
      usedFallback: source !== (requestedSource ?? source),
    }
  }

  const session = await getSessionContextByToken(token)

  if (!session) {
    const source = requestedSource ?? "demo"
    return {
      source,
      isRoot: false,
      requiresConnection: false,
      connectPath: "/settings/cloud",
      scopeKey: `anon:${source}`,
      usedFallback: true,
    }
  }

  const isRoot = session.user.username.toLowerCase() === "root"
  const connectPath = "/settings/cloud"

  let source = requestedSource ?? session.dataSource

  if (!isRoot && source === "demo") {
    return {
      source,
      userId: session.user.id,
      username: session.user.username,
      isRoot,
      requiresConnection: true,
      connectPath,
      credentials: undefined,
      scopeKey: `${session.user.id}:pending-cloud-connection`,
      usedFallback: false,
    }
  }

  let credentials =
    source === session.dataSource ? session.cloudCredentials ?? undefined : undefined
  let usedFallback = false

  if (source !== "demo") {
    const hasValidCredentials = Boolean(credentials && credentials.provider === source)

    if (!hasValidCredentials) {
      if (isRoot) {
        source = "demo"
        credentials = undefined
        usedFallback = true
      } else {
        return {
          source,
          userId: session.user.id,
          username: session.user.username,
          isRoot,
          requiresConnection: true,
          connectPath,
          credentials: undefined,
          scopeKey: `${session.user.id}:${source}:missing-credentials`,
          usedFallback: false,
        }
      }
    }
  }

  const credentialScope = source === "demo" ? "demo" : deriveCredentialScope(credentials)

  return {
    source,
    credentials,
    userId: session.user.id,
    username: session.user.username,
    isRoot,
    requiresConnection: false,
    connectPath,
    scopeKey: `${session.user.id}:${source}:${credentialScope}`,
    usedFallback,
  }
}

function parseDataSourceType(value: string | null): DataSourceType | undefined {
  if (!value) {
    return undefined
  }

  if (VALID_DATA_SOURCES.includes(value as DataSourceType)) {
    return value as DataSourceType
  }

  return undefined
}

function readCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) {
    return null
  }

  const segments = cookieHeader.split(";")

  for (const segment of segments) {
    const [rawName, ...rawValue] = segment.trim().split("=")

    if (rawName === name) {
      return decodeURIComponent(rawValue.join("="))
    }
  }

  return null
}

function deriveCredentialScope(credentials?: CloudCredentials): string {
  if (!credentials) {
    return "no-creds"
  }

  if (credentials.provider === "aws") {
    const key = credentials.accessKeyId?.trim()
    if (key) {
      return `aws-${key.slice(-8).toLowerCase()}`
    }
  }

  if (credentials.provider === "azure") {
    const key = credentials.subscriptionId?.trim()
    if (key) {
      return `az-${key.slice(-8).toLowerCase()}`
    }
  }

  if (credentials.provider === "gcp") {
    const key = credentials.projectId?.trim()
    if (key) {
      return `gcp-${key.toLowerCase()}`
    }
  }

  return `${credentials.provider}-default`
}
