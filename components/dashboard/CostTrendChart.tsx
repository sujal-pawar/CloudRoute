"use client"

import * as React from "react"
import {
  CartesianGrid,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatCurrency, formatDate } from "@/lib/utils"
import type { CostAnomaly } from "@/lib/types"

type TrendView = "daily" | "weekly" | "monthly"

type CostPoint = {
  date: string
  totalCost: number
}

type CostTrendChartProps = {
  data: CostPoint[]
  anomalies: CostAnomaly[]
}

type TrendSeriesPoint = {
  label: string
  dateLabel: string
  totalCost: number
  hasAnomaly: boolean
}

export const CostTrendChart = React.memo(function CostTrendChart({ data, anomalies }: CostTrendChartProps) {
  const [view, setView] = React.useState<TrendView>("daily")
  const chartContainerRef = React.useRef<HTMLDivElement | null>(null)
  const [chartSize, setChartSize] = React.useState({ width: 0, height: 0 })

  React.useEffect(() => {
    const node = chartContainerRef.current
    if (!node) {
      return
    }

    const updateFromRect = (width: number, height: number) => {
      setChartSize({
        width: Math.max(0, Math.floor(width)),
        height: Math.max(0, Math.floor(height)),
      })
    }

    const initialRect = node.getBoundingClientRect()
    updateFromRect(initialRect.width, initialRect.height)

    const observer = new ResizeObserver((entriesList) => {
      const entry = entriesList[0]
      if (!entry) {
        return
      }

      updateFromRect(entry.contentRect.width, entry.contentRect.height)
    })

    observer.observe(node)

    return () => {
      observer.disconnect()
    }
  }, [])

  const anomalyDates = React.useMemo(() => {
    return new Set(anomalies.map((anomaly) => anomaly.detectedAt.split("T")[0]))
  }, [anomalies])

  const series = React.useMemo(() => {
    return buildTrendSeries(data, view, anomalyDates)
  }, [data, view, anomalyDates])

  return (
    <Card className="rounded-xl border-border/70 bg-card">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
        <CardTitle>Cost Trend (90 Days)</CardTitle>
        <Tabs value={view} onValueChange={(next) => setView(next as TrendView)}>
          <TabsList>
            <TabsTrigger value="daily">Daily</TabsTrigger>
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        <div ref={chartContainerRef} className="h-80 w-full min-w-0">
          {chartSize.width > 0 && chartSize.height > 0 ? (
            <LineChart width={chartSize.width} height={chartSize.height} data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12 }}
                minTickGap={24}
                stroke="var(--color-muted-foreground)"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                width={80}
                stroke="var(--color-muted-foreground)"
                tickFormatter={(value) => formatCurrency(Number(value))}
              />
              <Tooltip
                formatter={(value) => {
                  const numeric = typeof value === "number" ? value : Number(value ?? 0)
                  return formatCurrency(numeric)
                }}
                labelFormatter={(label, payload) => {
                  const point = payload?.[0]?.payload as TrendSeriesPoint | undefined
                  return point?.dateLabel ?? String(label)
                }}
              />
              <Line
                type="monotone"
                dataKey="totalCost"
                stroke="#3b82f6"
                strokeWidth={2.5}
                isAnimationActive={false}
                dot={(dotProps) => {
                  const payload = dotProps.payload as TrendSeriesPoint
                  return payload.hasAnomaly ? (
                    <circle
                      cx={dotProps.cx}
                      cy={dotProps.cy}
                      r={4}
                      fill="#ef4444"
                      stroke="#ef4444"
                    />
                  ) : (
                    <circle
                      cx={dotProps.cx}
                      cy={dotProps.cy}
                      r={2}
                      fill="#3b82f6"
                      stroke="#3b82f6"
                    />
                  )
                }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
})

function buildTrendSeries(
  data: CostPoint[],
  view: TrendView,
  anomalyDates: Set<string>
): TrendSeriesPoint[] {
  if (view === "daily") {
    return data.map((point) => ({
      label: shortDate(point.date),
      dateLabel: formatDate(point.date),
      totalCost: round2(point.totalCost),
      hasAnomaly: anomalyDates.has(point.date),
    }))
  }

  if (view === "weekly") {
    const result: TrendSeriesPoint[] = []

    for (let index = 0; index < data.length; index += 7) {
      const bucket = data.slice(index, index + 7)
      if (bucket.length === 0) {
        continue
      }

      const firstDate = bucket[0].date
      const lastDate = bucket[bucket.length - 1].date

      result.push({
        label: `${shortDate(firstDate)}-${shortDate(lastDate)}`,
        dateLabel: `${formatDate(firstDate)} to ${formatDate(lastDate)}`,
        totalCost: round2(bucket.reduce((sum, point) => sum + point.totalCost, 0)),
        hasAnomaly: bucket.some((point) => anomalyDates.has(point.date)),
      })
    }

    return result
  }

  const monthlyMap = new Map<string, { total: number; dates: string[]; anomaly: boolean }>()

  for (const point of data) {
    const monthKey = point.date.slice(0, 7)
    const existing = monthlyMap.get(monthKey)

    if (existing) {
      existing.total += point.totalCost
      existing.dates.push(point.date)
      existing.anomaly = existing.anomaly || anomalyDates.has(point.date)
      continue
    }

    monthlyMap.set(monthKey, {
      total: point.totalCost,
      dates: [point.date],
      anomaly: anomalyDates.has(point.date),
    })
  }

  return [...monthlyMap.entries()].map(([monthKey, value]) => ({
    label: monthLabel(monthKey),
    dateLabel: `${formatDate(value.dates[0])} to ${formatDate(value.dates[value.dates.length - 1])}`,
    totalCost: round2(value.total),
    hasAnomaly: value.anomaly,
  }))
}

function shortDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
  }).format(new Date(value))
}

function monthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-")
  return new Intl.DateTimeFormat("en-US", { month: "short" }).format(
    new Date(Number(year), Number(month) - 1, 1)
  )
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

CostTrendChart.displayName = "CostTrendChart"