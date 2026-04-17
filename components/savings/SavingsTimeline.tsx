"use client"

import * as React from "react"
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { SavingsEntry } from "@/lib/types"
import { formatCurrency } from "@/lib/utils"

type SavingsTimelineProps = {
  entries: SavingsEntry[]
}

type SavingsSeriesPoint = {
  date: string
  projectedCumulative: number
  realizedCumulative: number
}

export function SavingsTimeline({ entries }: SavingsTimelineProps) {
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

  const series = React.useMemo(() => buildSavingsSeries(entries), [entries])

  return (
    <Card className="rounded-xl border-border/70 bg-card">
      <CardHeader>
        <CardTitle>Cumulative Savings Since First Action</CardTitle>
      </CardHeader>
      <CardContent>
        <div ref={chartContainerRef} className="h-[320px] w-full">
          {chartSize.width > 0 && chartSize.height > 0 ? (
            <LineChart width={chartSize.width} height={chartSize.height} data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} minTickGap={24} />
              <YAxis
                tick={{ fontSize: 12 }}
                width={90}
                tickFormatter={(value) => formatCurrency(Number(value))}
              />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
              <Line
                type="monotone"
                dataKey="projectedCumulative"
                name="Projected"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="realizedCumulative"
                name="Realized"
                stroke="#22c55e"
                strokeWidth={2.5}
                dot={false}
              />
            </LineChart>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

function buildSavingsSeries(entries: SavingsEntry[]): SavingsSeriesPoint[] {
  if (entries.length === 0) {
    return []
  }

  const daily = new Map<string, { projected: number; realized: number }>()

  for (const entry of entries) {
    const projectedPerDay = entry.projectedMonthlySavings / 30

    for (const point of entry.actualSavingsByDay) {
      const current = daily.get(point.date) ?? { projected: 0, realized: 0 }
      current.projected += projectedPerDay
      current.realized += point.saving
      daily.set(point.date, current)
    }
  }

  const dates = [...daily.keys()].sort((left, right) => (left < right ? -1 : left > right ? 1 : 0))

  let projectedRunning = 0
  let realizedRunning = 0

  return dates.map((date) => {
    const day = daily.get(date) ?? { projected: 0, realized: 0 }
    projectedRunning += day.projected
    realizedRunning += day.realized

    return {
      date,
      projectedCumulative: round2(projectedRunning),
      realizedCumulative: round2(realizedRunning),
    }
  })
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}
