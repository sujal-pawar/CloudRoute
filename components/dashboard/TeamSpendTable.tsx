"use client"

import * as React from "react"
import { ArrowUpDown } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCurrency, formatPercent } from "@/lib/utils"

export type TeamSpendRow = {
  team: string
  currentMonthCost: number
  lastMonthCost: number
  changePercent: number
  resourceCount: number
  idleCount: number
  optimizationScore: number
  budget: number
}

type SortKey = keyof TeamSpendRow

type TeamSpendTableProps = {
  rows: TeamSpendRow[]
}

export const TeamSpendTable = React.memo(function TeamSpendTable({ rows }: TeamSpendTableProps) {
  const [sortKey, setSortKey] = React.useState<SortKey>("currentMonthCost")
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("desc")

  const sortedRows = React.useMemo(() => {
    const direction = sortDirection === "asc" ? 1 : -1

    return [...rows].sort((left, right) => {
      const leftValue = left[sortKey]
      const rightValue = right[sortKey]

      if (typeof leftValue === "number" && typeof rightValue === "number") {
        return (leftValue - rightValue) * direction
      }

      return String(leftValue).localeCompare(String(rightValue)) * direction
    })
  }, [rows, sortDirection, sortKey])

  const handleSort = (nextKey: SortKey) => {
    if (sortKey === nextKey) {
      setSortDirection((previous) => (previous === "asc" ? "desc" : "asc"))
      return
    }

    setSortKey(nextKey)
    setSortDirection(nextKey === "team" ? "asc" : "desc")
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border/70 bg-card p-4">
      <h3 className="mb-3 text-base font-semibold">Team Spend Overview</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <SortButton label="Team" onClick={() => handleSort("team")} />
            </TableHead>
            <TableHead>
              <SortButton label="This Month" onClick={() => handleSort("currentMonthCost")} />
            </TableHead>
            <TableHead>
              <SortButton label="Vs Last Month" onClick={() => handleSort("changePercent")} />
            </TableHead>
            <TableHead>
              <SortButton label="Resources" onClick={() => handleSort("resourceCount")} />
            </TableHead>
            <TableHead>
              <SortButton label="Idle" onClick={() => handleSort("idleCount")} />
            </TableHead>
            <TableHead>
              <SortButton label="Score" onClick={() => handleSort("optimizationScore")} />
            </TableHead>
            <TableHead>
              <SortButton label="Budget" onClick={() => handleSort("budget")} />
            </TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedRows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                No team spend rows available for the current dataset.
              </TableCell>
            </TableRow>
          ) : sortedRows.map((row) => {
            const scoreTone = row.optimizationScore >= 80
              ? "text-emerald-400 bg-emerald-500/15"
              : row.optimizationScore >= 60
                ? "text-amber-400 bg-amber-500/15"
                : "text-red-400 bg-red-500/15"

            return (
              <TableRow key={row.team} className="transition-colors hover:bg-muted/20">
                <TableCell className="font-medium capitalize">{row.team}</TableCell>
                <TableCell className="font-mono tabular-nums">{formatCurrency(row.currentMonthCost)}</TableCell>
                <TableCell className="font-mono tabular-nums">
                  <span className={row.changePercent <= 0 ? "text-emerald-500" : "text-red-500"}>
                    {formatPercent(row.changePercent)}
                  </span>
                </TableCell>
                <TableCell className="font-mono tabular-nums">{row.resourceCount}</TableCell>
                <TableCell className="font-mono tabular-nums">{row.idleCount}</TableCell>
                <TableCell>
                  <AnimatedScoreBadge score={row.optimizationScore} className={scoreTone} />
                </TableCell>
                <TableCell className="font-mono tabular-nums">{formatCurrency(row.budget)}</TableCell>
                <TableCell>
                  <Button size="sm" variant="outline">Drill In</Button>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
})

function SortButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button variant="ghost" size="sm" className="-ml-2 h-8 px-2" onClick={onClick}>
      {label}
      <ArrowUpDown className="ml-1 size-3" />
    </Button>
  )
}

function AnimatedScoreBadge({ score, className }: { score: number; className: string }) {
  const [displayScore, setDisplayScore] = React.useState(score)
  const scoreRef = React.useRef(score)

  React.useEffect(() => {
    scoreRef.current = displayScore
  }, [displayScore])

  React.useEffect(() => {
    if (scoreRef.current === score) {
      return
    }

    const step = score > scoreRef.current ? 0.5 : -0.5
    const timer = window.setInterval(() => {
      setDisplayScore((current) => {
        const next = roundToOneDecimal(current + step)

        if ((step > 0 && next >= score) || (step < 0 && next <= score)) {
          window.clearInterval(timer)
          return score
        }

        return next
      })
    }, 30)

    return () => {
      window.clearInterval(timer)
    }
  }, [score])

  return <Badge className={className}>{displayScore.toFixed(1)}</Badge>
}

function roundToOneDecimal(value: number) {
  return Math.round(value * 10) / 10
}

TeamSpendTable.displayName = "TeamSpendTable"