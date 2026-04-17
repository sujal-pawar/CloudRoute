"use client"

import * as React from "react"
import {
  Activity,
  BadgeDollarSign,
  RefreshCcw,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { CloudConnectionNotice } from "@/components/layout/CloudConnectionNotice"
import { Skeleton } from "@/components/ui/skeleton"
import { KPICard } from "@/components/dashboard/KPICard"
import { CostTrendChart } from "@/components/dashboard/CostTrendChart"
import { CostBreakdownChart } from "@/components/dashboard/CostBreakdownChart"
import { TeamSpendTable, type TeamSpendRow } from "@/components/dashboard/TeamSpendTable"
import { useAppStore } from "@/lib/store/useAppStore"
import type { CloudResource, CostAnomaly, IdleResource, Recommendation, Team } from "@/lib/types"
import { formatCurrency, formatPercent } from "@/lib/utils"

type CostSeriesPoint = {
  date: string
  totalCost: number
  breakdown: Record<string, number>
}

type CostsResponse = {
  data: CostSeriesPoint[]
  alerts?: {
    ruleName?: string
  }[]
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

type ConnectRequiredResponse = {
  error?: string
  requiresConnection?: boolean
  connectPath?: string
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

type DashboardAIMetrics = {
  costs: {
    totalThisMonth: number
    changePercent: number
    topRecommendation: string
  }
  idleCount: number
  totalWaste: number
  topTeam: {
    name: string
    spend: number
  }
  breachedAlerts: string[]
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
  const [lastUpdatedNow, setLastUpdatedNow] = React.useState(() => Date.now())
  const [connectRequired, setConnectRequired] = React.useState<ConnectRequiredResponse | null>(null)
  const [breachedAlerts, setBreachedAlerts] = React.useState<string[]>([])
  const [aiSummary, setAiSummary] = React.useState<string | null>(null)
  const [aiLoading, setAiLoading] = React.useState(false)
  const [aiError, setAiError] = React.useState<string | null>(null)
  const [aiGeneratedAt, setAiGeneratedAt] = React.useState<Date | null>(null)
  const selectedTeam = useAppStore((store) => store.selectedTeam)
  const activeTeam: Team | null = selectedTeam === "all-teams" ? null : selectedTeam

  const refreshAISummary = React.useCallback(async (metrics: DashboardAIMetrics) => {
    setAiLoading(true)
    setAiError(null)

    try {
      const response = await fetch("/api/ai-summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(metrics),
      })

      const payload = (await response.json().catch(() => ({}))) as {
        summary?: string
        error?: string
      }

      if (!response.ok || !payload.summary) {
        throw new Error(payload.error ?? "Unable to generate AI summary")
      }

      setAiSummary(payload.summary)
      setAiGeneratedAt(new Date())
    } catch (nextError) {
      setAiError(nextError instanceof Error ? nextError.message : "Unable to generate AI summary")
    } finally {
      setAiLoading(false)
    }
  }, [])

  const refreshDashboard = React.useCallback(async (options?: { refreshAI?: boolean }) => {
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

      const blockedResponse = responses.find((response) => response.status === 412)

      if (blockedResponse) {
        const payload = (await blockedResponse.json().catch(() => ({}))) as ConnectRequiredResponse

        setConnectRequired({
          error: payload.error,
          requiresConnection: true,
          connectPath: payload.connectPath ?? "/settings/cloud",
        })
        setState(EMPTY_STATE)
        setLastUpdated(null)
        setBreachedAlerts([])
        setError(null)
        return
      }

      if (responses.some((response) => !response.ok)) {
        throw new Error("Unable to load dashboard data")
      }

      setConnectRequired(null)

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

      const nextBreachedAlerts = Array.from(
        new Set(
          (trend90d.alerts ?? [])
            .map((entry) => entry.ruleName?.trim())
            .filter((name): name is string => Boolean(name))
        )
      )
      setBreachedAlerts(nextBreachedAlerts)

      if (options?.refreshAI ?? false) {
        const metrics = buildDashboardAiMetrics({
          trend90d: trend90d.data,
          team90d: team90d.data,
          idleResources: idle.idleResources,
          recommendations: recommendations.recommendations,
          breachedAlerts: nextBreachedAlerts,
        })

        void refreshAISummary(metrics)
      }

      setError(null)
      setLastUpdated(new Date())
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unknown dashboard error")
    } finally {
      setLoading(false)
    }
  }, [refreshAISummary])

  React.useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void refreshDashboard({ refreshAI: true })
    }, 0)

    const interval = window.setInterval(() => {
      void refreshDashboard({ refreshAI: false })
    }, 30000)

    return () => {
      window.clearTimeout(initialLoad)
      window.clearInterval(interval)
    }
  }, [refreshDashboard])

  React.useEffect(() => {
    const ticker = window.setInterval(() => {
      setLastUpdatedNow(Date.now())
    }, 1000)

    return () => {
      window.clearInterval(ticker)
    }
  }, [])

  const filteredTrend90d = React.useMemo(() => {
    if (!activeTeam) {
      return state.trend90d
    }

    return state.team90d.map((point) => {
      const teamCost = point.breakdown[activeTeam] ?? 0

      return {
        date: point.date,
        totalCost: teamCost,
        breakdown: {
          [activeTeam]: teamCost,
        },
      }
    })
  }, [activeTeam, state.team90d, state.trend90d])

  const filteredResources = React.useMemo(() => {
    if (!activeTeam) {
      return state.resources
    }

    return state.resources.filter((resource) => resource.team === activeTeam)
  }, [activeTeam, state.resources])

  const filteredIdleResources = React.useMemo(() => {
    if (!activeTeam) {
      return state.idleResources
    }

    return state.idleResources.filter((item) => item.resource.team === activeTeam)
  }, [activeTeam, state.idleResources])

  const filteredRecommendations = React.useMemo(() => {
    if (!activeTeam) {
      return state.recommendations
    }

    const teamResourceIds = new Set(filteredResources.map((resource) => resource.id))
    return state.recommendations.filter((recommendation) => teamResourceIds.has(recommendation.resourceId))
  }, [activeTeam, filteredResources, state.recommendations])

  const filteredAnomalies = React.useMemo(() => {
    if (!activeTeam) {
      return state.anomalies
    }

    return state.anomalies.filter((anomaly) => anomaly.team === activeTeam)
  }, [activeTeam, state.anomalies])

  const filteredTeamBreakdown30d = React.useMemo(() => {
    if (!activeTeam) {
      return state.breakdownTeam30d
    }

    return state.breakdownTeam30d.map((point) => {
      const teamCost = point.breakdown[activeTeam] ?? 0

      return {
        date: point.date,
        totalCost: teamCost,
        breakdown: {
          [activeTeam]: teamCost,
        },
      }
    })
  }, [activeTeam, state.breakdownTeam30d])

  const trendChartData = React.useMemo(
    () => filteredTrend90d.map((point) => ({ date: point.date, totalCost: point.totalCost })),
    [filteredTrend90d]
  )

  const serviceBreakdownData = React.useMemo(
    () => (activeTeam ? filteredTeamBreakdown30d : state.breakdownService30d),
    [activeTeam, filteredTeamBreakdown30d, state.breakdownService30d]
  )

  const environmentBreakdownData = React.useMemo(
    () => (activeTeam ? filteredTeamBreakdown30d : state.breakdownEnv30d),
    [activeTeam, filteredTeamBreakdown30d, state.breakdownEnv30d]
  )

  const kpis = React.useMemo(() => {
    const currentMonthTotal = sumTail(filteredTrend90d.map((point) => point.totalCost), 30)
    const lastMonthTotal = sumWindow(filteredTrend90d.map((point) => point.totalCost), 30, 60)
    const monthChangePercent = percentageChange(currentMonthTotal, lastMonthTotal)

    const idleWaste = filteredIdleResources.reduce((sum, item) => sum + item.monthlySavings, 0)
    const pendingSavings = filteredRecommendations
      .filter((recommendation) => recommendation.status === "pending")
      .reduce((sum, recommendation) => sum + recommendation.monthlySavings, 0)

    const wasteIdentified = idleWaste + pendingSavings
    const allTeamRows = buildTeamRows(
      state.team90d,
      state.resources,
      state.idleResources,
      state.recommendations,
      state.anomalies
    )
    const teamRows = activeTeam
      ? allTeamRows.filter((row) => row.team === activeTeam)
      : allTeamRows
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
  }, [
    activeTeam,
    filteredIdleResources,
    filteredRecommendations,
    filteredTrend90d,
    state.anomalies,
    state.recommendations,
    state.resources,
    state.team90d,
    state.idleResources,
  ])

  const showInitialSkeleton = loading && state.trend90d.length === 0

  return (
    <section className="space-y-6 p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Cloud Cost Overview</h1>
          <p className="text-sm text-muted-foreground">
            {lastUpdated
              ? `Last updated: ${formatSecondsAgo(lastUpdatedNow - lastUpdated.getTime())} ago`
              : "Loading data..."}
          </p>
          {activeTeam ? (
            <p className="text-xs text-muted-foreground">Viewing team: {activeTeam}</p>
          ) : null}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => void refreshDashboard({ refreshAI: true })}
        >
          <RefreshCcw className="size-4" />
          Refresh
        </Button>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      {connectRequired?.requiresConnection ? (
        <CloudConnectionNotice
          message={connectRequired.error}
          connectPath={connectRequired.connectPath}
        />
      ) : null}

      {showInitialSkeleton ? (
        <DashboardSkeleton />
      ) : connectRequired?.requiresConnection ? null : (
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
              tooltip="Score drops for idle resources, unacted recommendations, and anomalies. Score improves when recommendations are acted on."
              icon={<Activity className="size-4" />}
            />
          </div>

          <div className="rounded-xl border border-border/70 bg-card p-4 md:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-blue-400" />
                <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">AI Cost Analyst</p>
              </div>
              <p className="text-xs text-muted-foreground">
                {aiGeneratedAt
                  ? `Generated ${formatSecondsAgo(lastUpdatedNow - aiGeneratedAt.getTime())} ago`
                  : "Not generated yet"}
              </p>
            </div>

            <p className="mt-3 min-h-16 text-sm leading-6 text-foreground/90">
              {aiSummary
                ? `"${aiSummary}"`
                : aiLoading
                  ? "Generating analysis..."
                  : "No AI report yet. Click Refresh Analysis to generate an executive summary."}
            </p>

            {aiError ? <p className="mt-2 text-xs text-red-400">{aiError}</p> : null}

            <div className="mt-4 flex items-center justify-between gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const metrics = buildDashboardAiMetrics({
                    trend90d: state.trend90d,
                    team90d: state.team90d,
                    idleResources: state.idleResources,
                    recommendations: state.recommendations,
                    breachedAlerts,
                  })
                  void refreshAISummary(metrics)
                }}
                disabled={aiLoading || state.trend90d.length === 0}
              >
                {aiLoading ? "Refreshing..." : "Refresh Analysis"}
              </Button>
              <span className="text-xs text-muted-foreground">Powered by AI</span>
            </div>
          </div>

          <CostTrendChart
            data={trendChartData}
            anomalies={filteredAnomalies}
          />

          <CostBreakdownChart
            serviceData={serviceBreakdownData}
            teamData={filteredTeamBreakdown30d}
            environmentData={environmentBreakdownData}
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
      <Skeleton className="h-90 rounded-xl" />
      <Skeleton className="h-90 rounded-xl" />
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

function buildDashboardAiMetrics(input: {
  trend90d: CostSeriesPoint[]
  team90d: CostSeriesPoint[]
  idleResources: IdleResource[]
  recommendations: Recommendation[]
  breachedAlerts: string[]
}): DashboardAIMetrics {
  const totalThisMonth = sumTail(input.trend90d.map((point) => point.totalCost), 30)
  const lastMonthTotal = sumWindow(input.trend90d.map((point) => point.totalCost), 30, 60)
  const changePercent = percentageChange(totalThisMonth, lastMonthTotal)

  const pendingRecommendations = input.recommendations.filter(
    (recommendation) => recommendation.status === "pending"
  )
  const topRecommendation = pendingRecommendations
    .sort((left, right) => right.monthlySavings - left.monthlySavings)[0]

  const idleWaste = input.idleResources.reduce((sum, item) => sum + item.monthlySavings, 0)
  const pendingSavings = pendingRecommendations.reduce(
    (sum, recommendation) => sum + recommendation.monthlySavings,
    0
  )
  const totalWaste = round2(idleWaste + pendingSavings)

  const teamSpend = calculateTeamSpend(input.team90d)
  const sortedTeams = Object.entries(teamSpend).sort(([, left], [, right]) => right - left)
  const [topTeamName = "unknown", topTeamSpend = 0] = sortedTeams[0] ?? ["unknown", 0]

  return {
    costs: {
      totalThisMonth,
      changePercent,
      topRecommendation: topRecommendation
        ? `${topRecommendation.resourceName} (${topRecommendation.currentTier} -> ${topRecommendation.suggestedTier}) can save ${formatCurrency(topRecommendation.monthlySavings)} per month`
        : "No pending recommendation",
    },
    idleCount: input.idleResources.length,
    totalWaste,
    topTeam: {
      name: topTeamName,
      spend: round2(topTeamSpend),
    },
    breachedAlerts: input.breachedAlerts,
  }
}

function calculateTeamSpend(teamPoints: CostSeriesPoint[]) {
  const spend: Record<string, number> = {}

  for (const point of teamPoints.slice(-30)) {
    for (const [team, cost] of Object.entries(point.breakdown)) {
      spend[team] = (spend[team] ?? 0) + cost
    }
  }

  return spend
}

function formatSecondsAgo(diffMs: number): string {
  const seconds = Math.max(0, Math.floor(diffMs / 1000))

  if (seconds < 60) {
    return `${seconds}s`
  }

  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}m ${remainingSeconds}s`
}
