"use client"

import * as React from "react"
import {
  Activity,
  BadgeDollarSign,
  RefreshCcw,
  TrendingDown,
  TrendingUp,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { KPICard } from "@/components/dashboard/KPICard"
import { CostTrendChart } from "@/components/dashboard/CostTrendChart"
import { CostBreakdownChart } from "@/components/dashboard/CostBreakdownChart"
import { TeamSpendTable, type TeamSpendRow } from "@/components/dashboard/TeamSpendTable"
import type { CloudResource, CostAnomaly, IdleResource, Recommendation, Team } from "@/lib/types"
import { formatCurrency, formatPercent } from "@/lib/utils"

type CostSeriesPoint = {
  date: string
  totalCost: number
  breakdown: Record<string, number>
}

type CostsResponse = {
  data: CostSeriesPoint[]
}

type ResourcesResponse = {
  resources: CloudResource[]
}

type IdleResponse = {
  idleResources: IdleResource[]
}

type RecommendationsResponse = {
  recommendations: Recommendation[]
}

type AnomaliesResponse = {
  anomalies: CostAnomaly[]
}

type DashboardState = {
  trend90d: CostSeriesPoint[]
  team90d: CostSeriesPoint[]
  breakdownService30d: CostSeriesPoint[]
  breakdownTeam30d: CostSeriesPoint[]
  breakdownEnv30d: CostSeriesPoint[]
  resources: CloudResource[]
  idleResources: IdleResource[]
  recommendations: Recommendation[]
  anomalies: CostAnomaly[]
}

const TEAM_BUDGETS: Record<Team, number> = {
  platform: 5200,
  backend: 8000,
  frontend: 3800,
  data: 7600,
  security: 3000,
  devops: 5400,
}

const EMPTY_STATE: DashboardState = {
  trend90d: [],
  team90d: [],
  breakdownService30d: [],
  breakdownTeam30d: [],
  breakdownEnv30d: [],
  resources: [],
  idleResources: [],
  recommendations: [],
  anomalies: [],
}

export default function DashboardPage() {
  const [state, setState] = React.useState<DashboardState>(EMPTY_STATE)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = React.useState<Date | null>(null)

  const refreshDashboard = React.useCallback(async () => {
    try {
      const [
        trend90dRes,
        team90dRes,
        service30dRes,
        team30dRes,
        env30dRes,
        resourcesRes,
        idleRes,
        recsRes,
        anomaliesRes,
      ] = await Promise.all([
        fetch("/api/costs?period=90d&groupBy=service", { cache: "no-store" }),
        fetch("/api/costs?period=90d&groupBy=team", { cache: "no-store" }),
        fetch("/api/costs?period=30d&groupBy=service", { cache: "no-store" }),
        fetch("/api/costs?period=30d&groupBy=team", { cache: "no-store" }),
        fetch("/api/costs?period=30d&groupBy=environment", { cache: "no-store" }),
        fetch("/api/resources", { cache: "no-store" }),
        fetch("/api/idle", { cache: "no-store" }),
        fetch("/api/recommendations", { cache: "no-store" }),
        fetch("/api/anomalies", { cache: "no-store" }),
      ])

      const responses = [
        trend90dRes,
        team90dRes,
        service30dRes,
        team30dRes,
        env30dRes,
        resourcesRes,
        idleRes,
        recsRes,
        anomaliesRes,
      ]

      if (responses.some((response) => !response.ok)) {
        throw new Error("Unable to load dashboard data")
      }

      const [
        trend90d,
        team90d,
        service30d,
        team30d,
        env30d,
        resources,
        idle,
        recommendations,
        anomalies,
      ] = (await Promise.all([
        trend90dRes.json() as Promise<CostsResponse>,
        team90dRes.json() as Promise<CostsResponse>,
        service30dRes.json() as Promise<CostsResponse>,
        team30dRes.json() as Promise<CostsResponse>,
        env30dRes.json() as Promise<CostsResponse>,
        resourcesRes.json() as Promise<ResourcesResponse>,
        idleRes.json() as Promise<IdleResponse>,
        recsRes.json() as Promise<RecommendationsResponse>,
        anomaliesRes.json() as Promise<AnomaliesResponse>,
      ]))

      setState({
        trend90d: trend90d.data,
        team90d: team90d.data,
        breakdownService30d: service30d.data,
        breakdownTeam30d: team30d.data,
        breakdownEnv30d: env30d.data,
        resources: resources.resources,
        idleResources: idle.idleResources,
        recommendations: recommendations.recommendations,
        anomalies: anomalies.anomalies,
      })

      setError(null)
      setLastUpdated(new Date())
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unknown dashboard error")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void refreshDashboard()
    }, 0)

    const interval = window.setInterval(() => {
      void refreshDashboard()
    }, 30000)

    return () => {
      window.clearTimeout(initialLoad)
      window.clearInterval(interval)
    }
  }, [refreshDashboard])

  const kpis = React.useMemo(() => {
    const currentMonthTotal = sumTail(state.trend90d.map((point) => point.totalCost), 30)
    const lastMonthTotal = sumWindow(state.trend90d.map((point) => point.totalCost), 30, 60)
    const monthChangePercent = percentageChange(currentMonthTotal, lastMonthTotal)

    const idleWaste = state.idleResources.reduce((sum, item) => sum + item.monthlySavings, 0)
    const pendingSavings = state.recommendations
      .filter((recommendation) => recommendation.status === "pending")
      .reduce((sum, recommendation) => sum + recommendation.monthlySavings, 0)

    const wasteIdentified = idleWaste + pendingSavings
    const teamRows = buildTeamRows(
      state.team90d,
      state.resources,
      state.idleResources,
      state.recommendations,
      state.anomalies
    )
    const avgOptimizationScore =
      teamRows.length > 0
        ? teamRows.reduce((sum, row) => sum + row.optimizationScore, 0) / teamRows.length
        : 0

    return {
      currentMonthTotal,
      monthChangePercent,
      wasteIdentified,
      pendingSavings,
      avgOptimizationScore,
      teamRows,
    }
  }, [state])

  const showInitialSkeleton = loading && state.trend90d.length === 0

  return (
    <section className="space-y-6 p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Cloud Cost Overview</h1>
          <p className="text-sm text-muted-foreground">
            {lastUpdated ? `Last updated ${lastUpdated.toLocaleTimeString()}` : "Loading data..."}
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => void refreshDashboard()}>
          <RefreshCcw className="size-4" />
          Refresh
        </Button>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      {showInitialSkeleton ? (
        <DashboardSkeleton />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KPICard
              title="Total This Month"
              value={formatCurrency(kpis.currentMonthTotal)}
              description="Aggregate cloud spend over the last 30 days"
              trend={`${formatPercent(kpis.monthChangePercent)} vs last month`}
              trendTone={kpis.monthChangePercent <= 0 ? "positive" : "negative"}
              icon={<BadgeDollarSign className="size-4" />}
            />
            <KPICard
              title="Waste Identified"
              value={formatCurrency(kpis.wasteIdentified)}
              description="Idle + oversized monthly waste"
              trend="Potential for immediate optimization"
              trendTone="negative"
              icon={<TrendingDown className="size-4" />}
            />
            <KPICard
              title="Savings Opportunity"
              value={formatCurrency(kpis.pendingSavings)}
              description="Projected monthly savings from pending actions"
              trend="Pending recommendation value"
              trendTone="positive"
              icon={<TrendingUp className="size-4" />}
            />
            <KPICard
              title="Avg Optimization Score"
              value={`${kpis.avgOptimizationScore.toFixed(1)} / 100`}
              description="Average score across all teams"
              trend="Higher is better"
              trendTone="neutral"
              icon={<Activity className="size-4" />}
            />
          </div>

          <CostTrendChart
            data={state.trend90d.map((point) => ({ date: point.date, totalCost: point.totalCost }))}
            anomalies={state.anomalies}
          />

          <CostBreakdownChart
            serviceData={state.breakdownService30d}
            teamData={state.breakdownTeam30d}
            environmentData={state.breakdownEnv30d}
          />

          <TeamSpendTable rows={kpis.teamRows} />
        </>
      )}
    </section>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
      </div>
      <Skeleton className="h-[360px] rounded-xl" />
      <Skeleton className="h-[360px] rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  )
}

function sumTail(values: number[], count: number): number {
  return round2(values.slice(-count).reduce((sum, value) => sum + value, 0))
}

function sumWindow(values: number[], fromEndStart: number, fromEndStop: number): number {
  return round2(values.slice(-fromEndStop, -fromEndStart).reduce((sum, value) => sum + value, 0))
}

function percentageChange(current: number, previous: number): number {
  if (previous === 0) {
    return 0
  }

  return round2(((current - previous) / previous) * 100)
}

function buildTeamRows(
  teamCosts: CostSeriesPoint[],
  resources: CloudResource[],
  idleResources: IdleResource[],
  recommendations: Recommendation[],
  anomalies: CostAnomaly[]
): TeamSpendRow[] {
  const teams: Team[] = ["platform", "backend", "frontend", "data", "security", "devops"]
  const resourceToTeam = new Map(resources.map((resource) => [resource.id, resource.team]))

  return teams.map((team) => {
    const currentMonthCost = round2(
      teamCosts.slice(-30).reduce((sum, point) => sum + (point.breakdown[team] ?? 0), 0)
    )
    const lastMonthCost = round2(
      teamCosts.slice(-60, -30).reduce((sum, point) => sum + (point.breakdown[team] ?? 0), 0)
    )

    const totalCount = resources.filter((resource) => resource.team === team).length
    const idleCount = idleResources.filter((resource) => resource.resource.team === team).length
    const pendingRecommendationCount = recommendations.filter((recommendation) => {
      return recommendation.status === "pending" && resourceToTeam.get(recommendation.resourceId) === team
    }).length
    const actedRecommendationCount = recommendations.filter((recommendation) => {
      return recommendation.status === "acted" && resourceToTeam.get(recommendation.resourceId) === team
    }).length
    const anomalyCount = anomalies.filter((anomaly) => anomaly.team === team && !anomaly.resolved).length

    const optimizationScore = calculateScore(
      totalCount,
      idleCount,
      pendingRecommendationCount,
      actedRecommendationCount,
      anomalyCount
    )

    return {
      team,
      currentMonthCost,
      lastMonthCost,
      changePercent: percentageChange(currentMonthCost, lastMonthCost),
      resourceCount: totalCount,
      idleCount,
      optimizationScore,
      budget: TEAM_BUDGETS[team],
    }
  })
}

function calculateScore(
  totalCount: number,
  idleCount: number,
  pendingRecommendationCount: number,
  actedRecommendationCount: number,
  anomalyCount: number
): number {
  if (totalCount === 0) {
    return 100
  }

  const score =
    100 -
    (idleCount / totalCount) * 40 -
    pendingRecommendationCount * 3 -
    anomalyCount * 5 +
    actedRecommendationCount * 5

  return round2(Math.max(0, Math.min(100, score)))
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}
