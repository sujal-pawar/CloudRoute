"use client"

import * as React from "react"

import { SavingsTimeline } from "@/components/savings/SavingsTimeline"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { SavingsEntry } from "@/lib/types"
import { formatCurrency, formatDate, formatPercent } from "@/lib/utils"

type SavingsResponse = {
  savings: SavingsEntry[]
  totalRealizedSavings: number
  count: number
}

export default function SavingsTrackerPage() {
  const [entries, setEntries] = React.useState<SavingsEntry[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const initialLoad = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/savings", { cache: "no-store" })

        if (!response.ok) {
          throw new Error("Unable to load savings tracker data")
        }

        const payload = (await response.json()) as SavingsResponse
        setEntries(payload.savings)
        setError(null)
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Savings tracker error")
      } finally {
        setLoading(false)
      }
    }, 0)

    return () => window.clearTimeout(initialLoad)
  }, [])

  const metrics = React.useMemo(() => {
    const totalProjectedMonthly = round2(
      entries.reduce((sum, entry) => sum + entry.projectedMonthlySavings, 0)
    )
    const totalRealized = round2(entries.reduce((sum, entry) => sum + entry.totalRealizedSavings, 0))
    const projectedToDate = round2(
      entries.reduce(
        (sum, entry) => sum + (entry.projectedMonthlySavings / 30) * entry.actualSavingsByDay.length,
        0
      )
    )

    return {
      totalProjectedMonthly,
      totalRealized,
      realizationRate: projectedToDate > 0 ? round2((totalRealized / projectedToDate) * 100) : 0,
    }
  }, [entries])

  return (
    <section className="space-y-6 p-6 md:p-8">
      <div>
        <h1 className="text-2xl font-semibold">Savings Tracker</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Monitor projected vs realized savings from acted recommendations.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      {loading ? (
        <SavingsTrackerSkeleton />
      ) : (
        <>
          <div className="grid gap-4 rounded-xl border border-border/70 bg-card p-4 md:grid-cols-3">
            <MetricCard label="Total Projected Savings" value={formatCurrency(metrics.totalProjectedMonthly)} />
            <MetricCard label="Total Realized Savings" value={formatCurrency(metrics.totalRealized)} />
            <MetricCard label="Realization Rate" value={formatPercent(metrics.realizationRate)} />
          </div>

          {entries.length === 0 ? (
            <Card className="rounded-xl border-border/70 bg-card">
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No acted recommendations yet. Act on a recommendation to start tracking realized savings.
              </CardContent>
            </Card>
          ) : (
            <>
              <SavingsTimeline entries={entries} />

              <div className="overflow-x-auto rounded-xl border border-border/70 bg-card p-4">
                <h3 className="mb-3 text-base font-semibold">Acted Recommendation Outcomes</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Resource</TableHead>
                      <TableHead>Acted At</TableHead>
                      <TableHead>Projected Monthly</TableHead>
                      <TableHead>Realized To Date</TableHead>
                      <TableHead>Realization</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((entry) => {
                      const projectedToDate = (entry.projectedMonthlySavings / 30) * entry.actualSavingsByDay.length
                      const rate = projectedToDate > 0
                        ? (entry.totalRealizedSavings / projectedToDate) * 100
                        : 0

                      return (
                        <TableRow key={entry.recommendationId} className="transition-colors hover:bg-muted/20">
                          <TableCell className="font-medium">{entry.resourceName}</TableCell>
                          <TableCell className="text-muted-foreground">{formatDate(entry.actedAt)}</TableCell>
                          <TableCell className="font-mono tabular-nums">
                            {formatCurrency(entry.projectedMonthlySavings)}
                          </TableCell>
                          <TableCell className="font-mono tabular-nums text-emerald-500">
                            {formatCurrency(entry.totalRealizedSavings)}
                          </TableCell>
                          <TableCell className="font-mono tabular-nums">
                            <span className={rate >= 85 ? "text-emerald-500" : "text-amber-500"}>
                              {formatPercent(rate)}
                            </span>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </>
      )}
    </section>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/70 bg-muted/20 p-3 transition-colors hover:bg-muted/30">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-2xl font-bold tabular-nums">{value}</p>
    </div>
  )
}

function SavingsTrackerSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
      <Skeleton className="h-[320px] w-full rounded-xl" />
      <Skeleton className="h-56 w-full rounded-xl" />
    </div>
  )
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}
