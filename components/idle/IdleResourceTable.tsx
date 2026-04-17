"use client"

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
}

export function IdleResourceTable({ resources }: IdleResourceTableProps) {
  if (resources.length === 0) {
    return (
      <div className="rounded-xl border border-border/70 bg-card p-8 text-center text-sm text-muted-foreground">
        No idle resources match the current filter settings.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border/70 bg-card p-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Resource</TableHead>
            <TableHead>Team</TableHead>
            <TableHead>Environment</TableHead>
            <TableHead>Idle Reason</TableHead>
            <TableHead>CPU Trend (14d)</TableHead>
            <TableHead>Monthly Cost</TableHead>
            <TableHead>Potential Savings</TableHead>
            <TableHead>Confidence</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Act</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {resources.map((item) => {
            const trendData = item.resource.usageMetrics.dailyUsage.slice(-14)
            const confidenceTone = item.confidence >= 90
              ? "bg-emerald-500/15 text-emerald-400"
              : "bg-amber-500/15 text-amber-400"

            return (
              <TableRow key={item.resource.id} className="transition-colors hover:bg-muted/20">
                <TableCell>
                  <div>
                    <p className="font-medium">{item.resource.name}</p>
                    <p className="text-xs text-muted-foreground uppercase">{item.resource.type}</p>
                  </div>
                </TableCell>
                <TableCell className="capitalize">{item.resource.team}</TableCell>
                <TableCell className="capitalize">{item.resource.environment}</TableCell>
                <TableCell className="max-w-xs text-xs text-muted-foreground">{item.idleReason}</TableCell>
                <TableCell>
                  <LineChart width={120} height={32} data={trendData}>
                    <Line
                      type="monotone"
                      dataKey="cpuPercent"
                      stroke="#22c55e"
                      strokeWidth={1.5}
                      dot={false}
                    />
                  </LineChart>
                </TableCell>
                <TableCell className="font-mono tabular-nums">
                  {formatCurrency(item.resource.monthlyCost)}
                </TableCell>
                <TableCell className="font-mono tabular-nums text-emerald-500">
                  {formatCurrency(item.monthlySavings)}
                </TableCell>
                <TableCell>
                  <Badge className={confidenceTone}>{item.confidence}%</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {item.recommendation.replace("-", " ")}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="outline">Review</Button>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}