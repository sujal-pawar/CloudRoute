"use client"

import * as React from "react"
import { CheckCircle2, Cloud, Lock, ShieldAlert } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { CloudCredentials, CloudProvider, DataSourceType } from "@/lib/types"

type CloudConnectStatus = {
  source: DataSourceType
  isRoot?: boolean
  requiresCloudConnection?: boolean
  connectPath?: string
  connection?: {
    connected: boolean
    provider: CloudProvider | null
    label?: string | null
    accountHint?: string | null
    region?: string | null
  }
}

type ProviderCapabilityCheck = {
  provider: CloudProvider
  passed: boolean
  checkedAt: string
  capabilities: Array<{
    name: string
    passed: boolean
    detail?: string
  }>
}

type ConnectResponse = CloudConnectStatus & {
  error?: string
  capabilityCheck?: ProviderCapabilityCheck
}

type AwsFormState = {
  label: string
  accessKeyId: string
  secretAccessKey: string
  sessionToken: string
  region: string
}

type AzureFormState = {
  label: string
  subscriptionId: string
  tenantId: string
  clientId: string
  clientSecret: string
}

type GcpFormState = {
  label: string
  projectId: string
  serviceAccountKey: string
}

const INITIAL_AWS: AwsFormState = {
  label: "",
  accessKeyId: "",
  secretAccessKey: "",
  sessionToken: "",
  region: "us-east-1",
}

const INITIAL_AZURE: AzureFormState = {
  label: "",
  subscriptionId: "",
  tenantId: "",
  clientId: "",
  clientSecret: "",
}

const INITIAL_GCP: GcpFormState = {
  label: "",
  projectId: "",
  serviceAccountKey: "",
}

export default function CloudSettingsPage() {
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [status, setStatus] = React.useState<CloudConnectStatus | null>(null)
  const [provider, setProvider] = React.useState<CloudProvider>("aws")
  const [lastCapabilitySummary, setLastCapabilitySummary] = React.useState<string | null>(null)
  const [lastCapabilityPassed, setLastCapabilityPassed] = React.useState<boolean | null>(null)

  const [aws, setAws] = React.useState<AwsFormState>(INITIAL_AWS)
  const [azure, setAzure] = React.useState<AzureFormState>(INITIAL_AZURE)
  const [gcp, setGcp] = React.useState<GcpFormState>(INITIAL_GCP)

  const loadStatus = React.useCallback(async () => {
    setLoading(true)

    try {
      const response = await fetch("/api/cloud/connect", { cache: "no-store" })
      const payload = (await response.json().catch(() => ({}))) as CloudConnectStatus & { error?: string }

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to load cloud connection status")
      }

      setStatus(payload)

      if (payload.source && payload.source !== "demo") {
        setProvider(payload.source)
      }

      if (payload.connection?.provider === "aws") {
        setAws((current) => ({
          ...current,
          label: payload.connection?.label ?? current.label,
          region: payload.connection?.region ?? current.region,
        }))
      }

      if (payload.connection?.provider === "azure") {
        setAzure((current) => ({
          ...current,
          label: payload.connection?.label ?? current.label,
        }))
      }

      if (payload.connection?.provider === "gcp") {
        setGcp((current) => ({
          ...current,
          label: payload.connection?.label ?? current.label,
        }))
      }
    } catch (error) {
      toast.error("Connection status error", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void loadStatus()
    }, 0)

    return () => window.clearTimeout(initialLoad)
  }, [loadStatus])

  const connectionLabel = React.useMemo(() => {
    if (!status?.connection?.connected) {
      return "Not connected"
    }

    const providerLabel = status.connection.provider?.toUpperCase() ?? "CLOUD"
    const accountHint = status.connection.accountHint ? ` (${status.connection.accountHint})` : ""
    return `${providerLabel}${accountHint}`
  }, [status])

  async function connectProvider() {
    setSaving(true)

    try {
      const credentials = buildCredentials(provider, aws, azure, gcp)
      const response = await fetch("/api/cloud/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ source: provider, credentials }),
      })

      const payload = (await response.json().catch(() => ({}))) as ConnectResponse

      const summary = summarizeCapabilityCheck(payload.capabilityCheck)
      setLastCapabilitySummary(summary)
      setLastCapabilityPassed(payload.capabilityCheck?.passed ?? null)

      if (!response.ok) {
        const failedChecks = payload.capabilityCheck?.capabilities.filter(
          (capability) => !capability.passed
        )

        if (failedChecks && failedChecks.length > 0) {
          throw new Error(
            [
              payload.error ?? "Failed to connect cloud provider",
              ...failedChecks.map(
                (capability) =>
                  `${capability.name}: ${capability.detail ?? "Permission or connectivity issue"}`
              ),
            ].join(" | ")
          )
        }

        throw new Error(payload.error ?? "Failed to connect cloud provider")
      }

      toast.success("Cloud provider connected", {
        description: summary,
      })
      await loadStatus()
    } catch (error) {
      toast.error("Connection failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setSaving(false)
    }
  }

  async function connectDemoMode() {
    setSaving(true)

    try {
      const response = await fetch("/api/cloud/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ source: "demo" }),
      })

      const payload = (await response.json().catch(() => ({}))) as { error?: string }

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to enable demo mode")
      }

      setLastCapabilitySummary("Demo mode enabled. No provider capability checks were required.")
      setLastCapabilityPassed(true)
      toast.success("Demo data enabled")
      await loadStatus()
    } catch (error) {
      toast.error("Unable to enable demo mode", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-6 p-6 md:p-8">
      <div>
        <h1 className="text-2xl font-semibold">Cloud Connection</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect your cloud account to load real resources, metrics, and cost data.
        </p>
      </div>

      <Card className="border-border/70 bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Cloud className="size-4" />
            Current Data Source
          </CardTitle>
          <CardDescription>
            Session source: {status?.source ? status.source.toUpperCase() : "Unknown"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {loading ? (
            <p className="text-muted-foreground">Loading connection status...</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={status?.connection?.connected ? "default" : "secondary"}>
                  {status?.connection?.connected ? (
                    <>
                      <CheckCircle2 className="mr-1 size-3.5" />
                      {connectionLabel}
                    </>
                  ) : (
                    "Not connected"
                  )}
                </Badge>
                <Badge variant={status?.isRoot ? "secondary" : "outline"}>
                  {status?.isRoot ? "Root user" : "Standard user"}
                </Badge>
              </div>

              {status?.requiresCloudConnection ? (
                <p className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-amber-100">
                  <ShieldAlert className="mr-1 inline size-4" />
                  Your account must connect a cloud provider before dashboard data can be loaded.
                </p>
              ) : null}

              <p className="rounded-md border border-blue-500/25 bg-blue-500/10 p-3 text-blue-100">
                <Lock className="mr-1 inline size-4" />
                Credentials are encrypted at rest using the server encryption key.
              </p>

              <p className="rounded-md border border-amber-500/25 bg-amber-500/10 p-3 text-amber-100">
                <ShieldAlert className="mr-1 inline size-4" />
                AWS reads live resources and cost data. Azure and GCP currently use provider-specific simulated data in this demo build,
                but capability checks still verify real account connectivity and permissions.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card">
        <CardHeader>
          <CardTitle className="text-base">Connect Provider</CardTitle>
          <CardDescription>Choose a provider and enter credentials.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-xs space-y-1.5">
            <label className="text-xs uppercase tracking-wide text-muted-foreground">Provider</label>
            <Select value={provider} onValueChange={(value) => setProvider(value as CloudProvider)}>
              <SelectTrigger>
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="aws">AWS</SelectItem>
                <SelectItem value="azure">Azure</SelectItem>
                <SelectItem value="gcp">GCP</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {provider === "aws" ? (
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Label (optional)">
                <Input
                  value={aws.label}
                  onChange={(event) => setAws((current) => ({ ...current, label: event.target.value }))}
                  placeholder="Production AWS"
                />
              </Field>
              <Field label="Region">
                <Input
                  value={aws.region}
                  onChange={(event) => setAws((current) => ({ ...current, region: event.target.value }))}
                  placeholder="us-east-1"
                />
              </Field>
              <Field label="Access Key ID">
                <Input
                  value={aws.accessKeyId}
                  onChange={(event) => setAws((current) => ({ ...current, accessKeyId: event.target.value }))}
                  placeholder="AKIA..."
                />
              </Field>
              <Field label="Secret Access Key">
                <Input
                  type="password"
                  value={aws.secretAccessKey}
                  onChange={(event) => setAws((current) => ({ ...current, secretAccessKey: event.target.value }))}
                  placeholder="••••••••••"
                />
              </Field>
              <Field label="Session Token (optional)">
                <Input
                  value={aws.sessionToken}
                  onChange={(event) => setAws((current) => ({ ...current, sessionToken: event.target.value }))}
                  placeholder="Temporary session token"
                />
              </Field>
            </div>
          ) : null}

          {provider === "azure" ? (
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Label (optional)">
                <Input
                  value={azure.label}
                  onChange={(event) => setAzure((current) => ({ ...current, label: event.target.value }))}
                  placeholder="Production Azure"
                />
              </Field>
              <Field label="Subscription ID">
                <Input
                  value={azure.subscriptionId}
                  onChange={(event) => setAzure((current) => ({ ...current, subscriptionId: event.target.value }))}
                  placeholder="Subscription ID"
                />
              </Field>
              <Field label="Tenant ID">
                <Input
                  value={azure.tenantId}
                  onChange={(event) => setAzure((current) => ({ ...current, tenantId: event.target.value }))}
                  placeholder="Tenant ID"
                />
              </Field>
              <Field label="Client ID (optional)">
                <Input
                  value={azure.clientId}
                  onChange={(event) => setAzure((current) => ({ ...current, clientId: event.target.value }))}
                  placeholder="Client ID"
                />
              </Field>
              <Field label="Client Secret (optional)">
                <Input
                  type="password"
                  value={azure.clientSecret}
                  onChange={(event) => setAzure((current) => ({ ...current, clientSecret: event.target.value }))}
                  placeholder="Client secret"
                />
              </Field>
            </div>
          ) : null}

          {provider === "gcp" ? (
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Label (optional)">
                <Input
                  value={gcp.label}
                  onChange={(event) => setGcp((current) => ({ ...current, label: event.target.value }))}
                  placeholder="Production GCP"
                />
              </Field>
              <Field label="Project ID">
                <Input
                  value={gcp.projectId}
                  onChange={(event) => setGcp((current) => ({ ...current, projectId: event.target.value }))}
                  placeholder="my-project-id"
                />
              </Field>
              <div className="md:col-span-2">
                <Field label="Service Account Key">
                  <textarea
                    value={gcp.serviceAccountKey}
                    onChange={(event) =>
                      setGcp((current) => ({ ...current, serviceAccountKey: event.target.value }))
                    }
                    placeholder="Paste service account JSON key"
                    className="min-h-32 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </Field>
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void connectProvider()} disabled={loading || saving}>
              {saving ? "Saving..." : `Connect ${provider.toUpperCase()}`}
            </Button>
            {status?.isRoot ? (
              <Button variant="outline" onClick={() => void connectDemoMode()} disabled={loading || saving}>
                Enable Demo Mode
              </Button>
            ) : null}
            <Button variant="ghost" onClick={() => void loadStatus()} disabled={loading || saving}>
              Refresh status
            </Button>
          </div>

          {lastCapabilitySummary ? (
            <p
              className={
                lastCapabilityPassed === false
                  ? "rounded-md border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-200"
                  : "rounded-md border border-emerald-500/25 bg-emerald-500/10 p-3 text-sm text-emerald-100"
              }
            >
              {lastCapabilitySummary}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </section>
  )
}

function summarizeCapabilityCheck(check?: ProviderCapabilityCheck) {
  if (!check) {
    return ""
  }

  const failed = check.capabilities.filter((capability) => !capability.passed)

  if (failed.length === 0) {
    return `${check.provider.toUpperCase()} capability check passed for ${check.capabilities.length} checks.`
  }

  return `Capability check failed: ${failed.map((capability) => capability.name).join(", "
  )}.`
}

function buildCredentials(
  provider: CloudProvider,
  aws: AwsFormState,
  azure: AzureFormState,
  gcp: GcpFormState
): CloudCredentials {
  if (provider === "aws") {
    return {
      provider,
      label: aws.label || undefined,
      accessKeyId: aws.accessKeyId,
      secretAccessKey: aws.secretAccessKey,
      sessionToken: aws.sessionToken || undefined,
      region: aws.region || "us-east-1",
    }
  }

  if (provider === "azure") {
    return {
      provider,
      label: azure.label || undefined,
      subscriptionId: azure.subscriptionId,
      tenantId: azure.tenantId,
      clientId: azure.clientId || undefined,
      clientSecret: azure.clientSecret || undefined,
    }
  }

  return {
    provider,
    label: gcp.label || undefined,
    projectId: gcp.projectId,
    serviceAccountKey: gcp.serviceAccountKey,
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1.5 text-sm">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}
