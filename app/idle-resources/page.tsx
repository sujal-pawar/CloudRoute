"use client"

import * as React from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { IdleResourceTable } from "@/components/idle/IdleResourceTable"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import type { IdleResource } from "@/lib/types"
import { useAppStore, type TeamFilter } from "@/lib/store/useAppStore"
import { formatCurrency } from "@/lib/utils"

type IdleResponse = {
  idleResources: IdleResource[]
}

type SelectedIdleResource = {
  resource: IdleResource
  number: number
}

export default function IdleResourcesPage() {
  const [resources, setResources] = React.useState<IdleResource[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [selectedResource, setSelectedResource] = React.useState<SelectedIdleResource | null>(null)

  const [environment, setEnvironment] = React.useState("all")
  const [resourceType, setResourceType] = React.useState("all")
  const [minIdleDays, setMinIdleDays] = React.useState(7)
  const selectedTeam = useAppStore((state) => state.selectedTeam)
  const setSelectedTeam = useAppStore((state) => state.setSelectedTeam)

  React.useEffect(() => {
    const loadIdleResources = async () => {
      try {
        const response = await fetch("/api/idle", { cache: "no-store" })
        if (!response.ok) {
          throw new Error("Unable to load idle resources")
        }

        const payload = (await response.json()) as IdleResponse
        setResources(payload.idleResources)
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Idle data error")
      } finally {
        setLoading(false)
      }
    }

    void loadIdleResources()
  }, [])

  const filteredResources = React.useMemo(() => {
    return resources.filter((item) => {
      const matchesEnvironment = environment === "all" || item.resource.environment === environment
      const matchesType = resourceType === "all" || item.resource.type === resourceType
      const matchesTeam = selectedTeam === "all-teams" || item.resource.team === selectedTeam
      const matchesIdleDays = item.idleDays >= minIdleDays

      return matchesEnvironment && matchesType && matchesTeam && matchesIdleDays
    })
  }, [environment, minIdleDays, resourceType, resources, selectedTeam])

  const selectedResourceForPanel = React.useMemo(() => {
    if (!selectedResource) {
      return null
    }

    const stillVisible = filteredResources.some(
      (item) => item.resource.id === selectedResource.resource.resource.id
    )

    return stillVisible ? selectedResource : null
  }, [filteredResources, selectedResource])

  const totalWaste = filteredResources.reduce((sum, item) => sum + item.monthlySavings, 0)

  return (
    <section className="min-w-0 space-y-6 overflow-x-hidden p-4 sm:p-6 md:p-8 scrollbar-hidden">
      <div>
        <h1 className="text-2xl font-semibold">Idle Resources</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {filteredResources.length} resources flagged as idle - {formatCurrency(totalWaste)}/mo waste
        </p>
      </div>

      <div className="grid gap-4 rounded-xl border border-border/70 bg-card p-4 sm:grid-cols-2 xl:grid-cols-4">
        <Select value={environment} onValueChange={setEnvironment}>
          <SelectTrigger>
            <SelectValue placeholder="Environment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Environments</SelectItem>
            <SelectItem value="production">Production</SelectItem>
            <SelectItem value="staging">Staging</SelectItem>
            <SelectItem value="development">Development</SelectItem>
          </SelectContent>
        </Select>

        <Select value={resourceType} onValueChange={setResourceType}>
          <SelectTrigger>
            <SelectValue placeholder="Resource Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="ec2">EC2</SelectItem>
            <SelectItem value="rds">RDS</SelectItem>
            <SelectItem value="s3">S3</SelectItem>
            <SelectItem value="lambda">Lambda</SelectItem>
            <SelectItem value="elb">ELB</SelectItem>
            <SelectItem value="eks">EKS</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={selectedTeam === "all-teams" ? "all" : selectedTeam}
          onValueChange={(value) => {
            setSelectedTeam(value === "all" ? "all-teams" : (value as TeamFilter))
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Team" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Teams</SelectItem>
            <SelectItem value="platform">Platform</SelectItem>
            <SelectItem value="backend">Backend</SelectItem>
            <SelectItem value="frontend">Frontend</SelectItem>
            <SelectItem value="data">Data</SelectItem>
            <SelectItem value="security">Security</SelectItem>
            <SelectItem value="devops">DevOps</SelectItem>
          </SelectContent>
        </Select>

        <div className="rounded-lg border border-border/70 px-3 py-2">
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>Min Idle Days</span>
            <span className="font-mono tabular-nums">{minIdleDays}d</span>
          </div>
          <input
            className="w-full"
            type="range"
            min={1}
            max={60}
            value={minIdleDays}
            onChange={(event) => setMinIdleDays(Number(event.target.value))}
          />
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Scanning resource fleet for idle signals...</p>
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.8fr)]">
          <IdleResourceTable
            resources={filteredResources}
            onReview={(resource, number) => setSelectedResource({ resource, number })}
          />

          <aside className="min-w-0 rounded-xl border border-border/70 bg-card p-4 scrollbar-hidden">
            {selectedResourceForPanel ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Selected Resource</p>
                  <h2 className="mt-1 text-xl font-semibold">
                    #{selectedResourceForPanel.number} {selectedResourceForPanel.resource.name}
                  </h2>
                  <p className="text-xs uppercase text-muted-foreground">
                    {selectedResourceForPanel.resource.type} · {selectedResourceForPanel.resource.team} · {selectedResourceForPanel.resource.environment}
                  </p>
                </div>

                <div className="grid gap-2 text-sm">
                  <DetailRow label="Idle Reason" value={selectedResourceForPanel.resource.idleReason} />
                  <DetailRow label="Monthly Cost" value={formatCurrency(selectedResourceForPanel.resource.resource.monthlyCost)} />
                  <DetailRow label="Potential Savings" value={formatCurrency(selectedResourceForPanel.resource.monthlySavings)} highlight />
                  <DetailRow label="Idle Days" value={`${selectedResourceForPanel.resource.idleDays} days`} />
                  <DetailRow label="Confidence" value={`${selectedResourceForPanel.resource.confidence}%`} />
                  <DetailRow label="Region" value={selectedResourceForPanel.resource.resource.region} />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="capitalize">
                    {selectedResourceForPanel.resource.recommendation.replace("-", " ")}
                  </Badge>
                  <Badge className="bg-emerald-500/15 text-emerald-400">{selectedResourceForPanel.resource.confidence}% confidence</Badge>
                </div>

                <Button className="w-full" variant="outline" onClick={() => setSelectedResource(null)}>
                  Close details
                </Button>
              </div>
            ) : (
              <div className="flex h-full min-h-80 items-center justify-center rounded-lg border border-dashed border-border/70 p-6 text-center">
                <div className="space-y-3">
                  <p className="text-sm font-medium">Select a resource</p>
                  <p className="text-sm text-muted-foreground">
                    Use the button in the table to show full resource details here.
                  </p>
                </div>
              </div>
            )}
          </aside>
        </div>
      )}
    </section>
  )
}

function DetailRow({
  label,
  value,
  highlight = false,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={highlight ? "mt-1 font-mono text-base font-semibold text-emerald-400" : "mt-1 text-sm text-foreground"}>
        {value}
      </p>
    </div>
  )
}
