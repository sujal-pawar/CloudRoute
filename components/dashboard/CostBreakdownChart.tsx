"use client"

import * as React from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatCurrency } from "@/lib/utils"

type GroupBy = "service" | "team" | "environment"

type BreakdownPoint = {
  date: string
  totalCost: number
  breakdown: Record<string, number>
}

type CostBreakdownChartProps = {
  serviceData: BreakdownPoint[]
  teamData: BreakdownPoint[]
  environmentData: BreakdownPoint[]
}

const SERVICE_COLORS: Record<string, string> = {
  ec2: "#3b82f6",
  rds: "#8b5cf6",
  s3: "#f59e0b",
  lambda: "#22c55e",
  elb: "#06b6d4",
  eks: "#f97316",
}

const TEAM_COLORS: Record<string, string> = {
  platform: "#3b82f6",
  backend: "#8b5cf6",
  frontend: "#22c55e",
  data: "#f59e0b",
  security: "#ef4444",
  devops: "#06b6d4",
}

const ENV_COLORS: Record<string, string> = {
  production: "#3b82f6",
  staging: "#f59e0b",
  development: "#22c55e",
}

export const CostBreakdownChart = React.memo(function CostBreakdownChart({
  serviceData,
  teamData,
  environmentData,
}: CostBreakdownChartProps) {
  const [groupBy, setGroupBy] = React.useState<GroupBy>("service")

  const selectedData =
    groupBy === "service" ? serviceData : groupBy === "team" ? teamData : environmentData

  const keys = React.useMemo(() => {
    const first = selectedData[0]
    return first ? Object.keys(first.breakdown) : []
  }, [selectedData])

  const chartData = React.useMemo(() => {
    return selectedData.map((point) => ({
      date: shortDate(point.date),
      ...point.breakdown,
    }))
  }, [selectedData])

  return (
    <Card className="rounded-xl border-border/70 bg-card">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
        <CardTitle>Cost Breakdown (Last 30 Days)</CardTitle>
        <Tabs value={groupBy} onValueChange={(next) => setGroupBy(next as GroupBy)}>
          <TabsList>
            <TabsTrigger value="service">By Service</TabsTrigger>
            <TabsTrigger value="team">By Team</TabsTrigger>
            <TabsTrigger value="environment">By Environment</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} minTickGap={20} />
              <YAxis
                tick={{ fontSize: 12 }}
                width={80}
                tickFormatter={(value) => formatCurrency(Number(value))}
              />
              <Tooltip
                formatter={(value) => {
                  const numeric = typeof value === "number" ? value : Number(value ?? 0)
                  return formatCurrency(numeric)
                }}
              />
              <Legend />
              {keys.map((key) => (
                <Bar
                  key={key}
                  dataKey={key}
                  stackId="stack"
                  isAnimationActive={false}
                  fill={resolveColor(groupBy, key)}
                  radius={key === keys[keys.length - 1] ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
})

function shortDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
  }).format(new Date(value))
}

function resolveColor(groupBy: GroupBy, key: string): string {
  if (groupBy === "service") {
    return SERVICE_COLORS[key] ?? "#64748b"
  }

  if (groupBy === "team") {
    return TEAM_COLORS[key] ?? "#64748b"
  }

  return ENV_COLORS[key] ?? "#64748b"
}

CostBreakdownChart.displayName = "CostBreakdownChart"