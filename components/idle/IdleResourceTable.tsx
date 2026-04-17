"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Line, LineChart } from "recharts"

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
import type { IdleResource } from "@/lib/types"
import { formatCurrency } from "@/lib/utils"

type IdleResourceTableProps = {
  resources: IdleResource[]
  onReview: (resource: IdleResource, index: number) => void
}

export function IdleResourceTable({ resources, onReview }: IdleResourceTableProps) {
  const [showSecondaryColumns, setShowSecondaryColumns] = React.useState(false)

  if (resources.length === 0) {
    return (
      <div className="rounded-xl border border-border/70 bg-card p-8 text-center text-sm text-muted-foreground">
        No idle resources match the current filter settings.
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border/70 bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {showSecondaryColumns ? "Optimization metrics view" : "Resource context view"}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1"
          onClick={() => setShowSecondaryColumns((current) => !current)}
        >
          {showSecondaryColumns ? (
            <>
              <ChevronLeft className="size-4" />
              Back
            </>
          ) : (
            <>
              Next
              <ChevronRight className="size-4" />
            </>
          )}
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            {!showSecondaryColumns ? (
              <>
                <TableHead>Resource</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Environment</TableHead>
                <TableHead>Idle Reason</TableHead>
              </>
            ) : (
              <>
                <TableHead>CPU Trend (14d)</TableHead>
                <TableHead>Monthly Cost</TableHead>
                <TableHead>Potential Savings</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Act</TableHead>
              </>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {resources.map((item, index) => {
            const trendData = item.resource.usageMetrics.dailyUsage.slice(-14)
            const confidenceTone = item.confidence >= 90
              ? "bg-emerald-500/15 text-emerald-400"
              : "bg-amber-500/15 text-amber-400"

            return (
              <TableRow key={item.resource.id}>
                <TableCell className="w-12 align-top font-mono text-xs text-muted-foreground">
                  {index + 1}
                </TableCell>
                {!showSecondaryColumns ? (
                  <>
                    <TableCell className="min-w-44 align-top">
                      <div className="space-y-0.5">
                        <p className="max-w-40 truncate font-medium">{item.resource.name}</p>
                        <p className="text-xs text-muted-foreground uppercase">{item.resource.type}</p>
                      </div>
                    </TableCell>
                    <TableCell className="capitalize align-top">{item.resource.team}</TableCell>
                    <TableCell className="capitalize align-top">{item.resource.environment}</TableCell>
                    <TableCell className="max-w-72 align-top text-xs leading-5 text-muted-foreground">
                      <span className="line-clamp-2">{item.idleReason}</span>
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell className="align-top">
                      <div className="h-9 w-28">
                        <LineChart width={112} height={36} data={trendData}>
                          <Line
                            type="monotone"
                            dataKey="cpuPercent"
                            stroke="#22c55e"
                            strokeWidth={1.5}
                            dot={false}
                          />
                        </LineChart>
                      </div>
                    </TableCell>
                    <TableCell className="align-top font-mono tabular-nums">
                      {formatCurrency(item.resource.monthlyCost)}
                    </TableCell>
                    <TableCell className="align-top font-mono tabular-nums text-emerald-500">
                      {formatCurrency(item.monthlySavings)}
                    </TableCell>
                    <TableCell className="align-top">
                      <Badge className={confidenceTone}>{item.confidence}%</Badge>
                    </TableCell>
                    <TableCell className="align-top">
                      <Badge variant="outline" className="capitalize">
                        {item.recommendation.replace("-", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="align-top">
                      <Button size="sm" variant="outline" onClick={() => onReview(item, index + 1)}>
                        View details
                      </Button>
                    </TableCell>
                  </>
                )}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}