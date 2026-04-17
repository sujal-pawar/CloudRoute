import type { ReactNode } from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type KPICardProps = {
  title: string
  value: string
  description: string
  trend?: string
  trendTone?: "positive" | "negative" | "neutral"
  icon?: ReactNode
}

export function KPICard({
  title,
  value,
  description,
  trend,
  trendTone = "neutral",
  icon,
}: KPICardProps) {
  return (
    <Card className="h-full rounded-xl border-border/70 bg-card">
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center justify-between text-xs uppercase tracking-wide">
          <span>{title}</span>
          {icon ? <span className="text-muted-foreground">{icon}</span> : null}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-1.5">
        <CardTitle className="text-2xl font-bold font-mono tabular-nums">{value}</CardTitle>
        <p className="text-xs text-muted-foreground">{description}</p>
        {trend ? (
          <p
            className={cn(
              "text-xs font-medium",
              trendTone === "positive" && "text-emerald-500",
              trendTone === "negative" && "text-red-500",
              trendTone === "neutral" && "text-muted-foreground"
            )}
          >
            {trend}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}