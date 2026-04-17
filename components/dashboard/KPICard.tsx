import type { ReactNode } from "react"
import { CircleHelp } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

type KPICardProps = {
  title: string
  value: string
  description: string
  trend?: string
  trendTone?: "positive" | "negative" | "neutral"
  icon?: ReactNode
  tooltip?: string
}

export function KPICard({
  title,
  value,
  description,
  trend,
  trendTone = "neutral",
  icon,
  tooltip,
}: KPICardProps) {
  return (
    <Card className="h-full rounded-xl border-border/70 bg-card">
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center justify-between text-xs uppercase tracking-wide">
          <span className="flex items-center gap-1.5">
            {title}
            {tooltip ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex size-4 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
                      aria-label={`${title} explanation`}
                    >
                      <CircleHelp className="size-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent sideOffset={6}>{tooltip}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : null}
          </span>
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