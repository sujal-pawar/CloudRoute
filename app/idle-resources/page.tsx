"use client"

import * as React from "react"

import { IdleResourceTable } from "@/components/idle/IdleResourceTable"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { IdleResource } from "@/lib/types"
import { formatCurrency } from "@/lib/utils"

type IdleResponse = {
  idleResources: IdleResource[]
}

export default function IdleResourcesPage() {
  const [resources, setResources] = React.useState<IdleResource[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const [environment, setEnvironment] = React.useState("all")
  const [resourceType, setResourceType] = React.useState("all")
  const [team, setTeam] = React.useState("all")
  const [minIdleDays, setMinIdleDays] = React.useState(7)

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
      const matchesTeam = team === "all" || item.resource.team === team
      const matchesIdleDays = item.idleDays >= minIdleDays

      return matchesEnvironment && matchesType && matchesTeam && matchesIdleDays
    })
  }, [environment, minIdleDays, resourceType, resources, team])

  const totalWaste = filteredResources.reduce((sum, item) => sum + item.monthlySavings, 0)

  return (
    <section className="space-y-6 p-6 md:p-8">
      <div>
        <h1 className="text-2xl font-semibold">Idle Resources</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {filteredResources.length} resources flagged as idle - {formatCurrency(totalWaste)}/mo waste
        </p>
      </div>

      <div className="grid gap-4 rounded-xl border border-border/70 bg-card p-4 md:grid-cols-4">
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

        <Select value={team} onValueChange={setTeam}>
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
            max={30}
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
        <p className="text-sm text-muted-foreground">Scanning resource fleet for idle signals...</p>
      ) : (
        <IdleResourceTable resources={filteredResources} />
      )}
    </section>
  )
}
