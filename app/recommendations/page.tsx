"use client"

import * as React from "react"
import { toast } from "sonner"

import { RecommendationCard } from "@/components/recommendations/RecommendationCard"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { CloudResource, Recommendation } from "@/lib/types"
import { formatCurrency } from "@/lib/utils"

type RecommendationsResponse = {
  recommendations: Recommendation[]
}

type ResourcesResponse = {
  resources: CloudResource[]
}

type RecommendationsView = Recommendation & {
  team: string
}

type SortBy = "savings" | "effort" | "team"

const EFFORT_ORDER: Record<RecommendationsView["effort"], number> = {
  low: 1,
  medium: 2,
  high: 3,
}

export default function RecommendationsPage() {
  const [recommendations, setRecommendations] = React.useState<RecommendationsView[]>([])
  const [filter, setFilter] = React.useState<"all" | Recommendation["status"]>("all")
  const [sortBy, setSortBy] = React.useState<SortBy>("savings")
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [actingId, setActingId] = React.useState<string | null>(null)

  const loadRecommendations = React.useCallback(async () => {
    try {
      const [recsRes, resourcesRes] = await Promise.all([
        fetch("/api/recommendations", { cache: "no-store" }),
        fetch("/api/resources", { cache: "no-store" }),
      ])

      if (!recsRes.ok || !resourcesRes.ok) {
        throw new Error("Unable to load recommendations")
      }

      const recPayload = (await recsRes.json()) as RecommendationsResponse
      const resourcesPayload = (await resourcesRes.json()) as ResourcesResponse
      const teamByResource = new Map(resourcesPayload.resources.map((resource) => [resource.id, resource.team]))

      const enriched: RecommendationsView[] = recPayload.recommendations.map((recommendation) => ({
        ...recommendation,
        team: teamByResource.get(recommendation.resourceId) ?? "unknown",
      }))

      setRecommendations(enriched)
      setError(null)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Recommendations error")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void loadRecommendations()
    }, 0)

    return () => window.clearTimeout(initialLoad)
  }, [loadRecommendations])

  const filteredRecommendations = React.useMemo(() => {
    const base = recommendations.filter((recommendation) => {
      if (filter === "all") {
        return true
      }

      return recommendation.status === filter
    })

    return [...base].sort((left, right) => {
      if (sortBy === "savings") {
        return right.monthlySavings - left.monthlySavings
      }

      if (sortBy === "effort") {
        return EFFORT_ORDER[left.effort] - EFFORT_ORDER[right.effort]
      }

      return left.team.localeCompare(right.team)
    })
  }, [filter, recommendations, sortBy])

  const summary = React.useMemo(() => {
    const pending = recommendations.filter((recommendation) => recommendation.status === "pending")
    const pendingCount = pending.length
    const savingsOpportunity = pending.reduce((sum, recommendation) => sum + recommendation.monthlySavings, 0)
    const easyWins = pending.filter((recommendation) => recommendation.effort === "low").length

    return {
      pendingCount,
      savingsOpportunity,
      easyWins,
    }
  }, [recommendations])

  const handleAct = async (recommendationId: string) => {
    setActingId(recommendationId)

    try {
      const response = await fetch("/api/act", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ recommendationId }),
      })

      if (!response.ok) {
        throw new Error("Failed to act on recommendation")
      }

      const payload = (await response.json()) as { recommendation: Recommendation }
      setRecommendations((current) =>
        current.map((recommendation) =>
          recommendation.id === recommendationId
            ? {
                ...recommendation,
                ...payload.recommendation,
              }
            : recommendation
        )
      )

      toast.success("Recommendation acted on", {
        description: `${payload.recommendation.resourceName} moved to savings tracker.`,
      })
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : "Unable to act on recommendation"
      toast.error("Action failed", { description: message })
    } finally {
      setActingId(null)
    }
  }

  const handleDismiss = (recommendationId: string) => {
    setRecommendations((current) =>
      current.map((recommendation) =>
        recommendation.id === recommendationId
          ? {
              ...recommendation,
              status: "dismissed",
            }
          : recommendation
      )
    )
  }

  return (
    <section className="space-y-6 p-6 md:p-8">
      <div>
        <h1 className="text-2xl font-semibold">Rightsizing Recommendations</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Turn utilization insights into actionable monthly cloud savings.
        </p>
      </div>

      <div className="grid gap-4 rounded-xl border border-border/70 bg-card p-4 md:grid-cols-3">
        <SummaryCard label="Pending Recommendations" value={String(summary.pendingCount)} />
        <SummaryCard label="Savings Opportunity" value={formatCurrency(summary.savingsOpportunity)} />
        <SummaryCard label="Easy Wins (Low Effort)" value={String(summary.easyWins)} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={filter} onValueChange={(next) => setFilter(next as typeof filter)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="acted">Acted</TabsTrigger>
            <TabsTrigger value="dismissed">Dismissed</TabsTrigger>
          </TabsList>
        </Tabs>

        <Select value={sortBy} onValueChange={(next) => setSortBy(next as SortBy)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="savings">Savings (High to Low)</SelectItem>
            <SelectItem value="effort">Effort</SelectItem>
            <SelectItem value="team">Team</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Preparing rightsizing opportunities...</p>
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-72 rounded-xl" />
            <Skeleton className="h-72 rounded-xl" />
            <Skeleton className="h-72 rounded-xl" />
            <Skeleton className="h-72 rounded-xl" />
          </div>
        </div>
      ) : filteredRecommendations.length === 0 ? (
        <div className="rounded-xl border border-border/70 bg-card p-8 text-center text-sm text-muted-foreground">
          No recommendations match the selected filter.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filteredRecommendations.map((recommendation) => (
            <RecommendationCard
              key={recommendation.id}
              recommendation={recommendation}
              team={recommendation.team}
              onAct={handleAct}
              onDismiss={handleDismiss}
              acting={actingId === recommendation.id}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-2xl font-bold tabular-nums">{value}</p>
    </div>
  )
}
