"use client"

import * as React from "react"
import { ArrowRight, CheckCircle2, Sparkles, XCircle } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import type { Recommendation } from "@/lib/types"
import { formatCurrency } from "@/lib/utils"

type RecommendationCardProps = {
  recommendation: Recommendation
  team?: string
  onAct: (recommendationId: string) => void
  onDismiss: (recommendationId: string) => void
  acting: boolean
}

export function RecommendationCard({
  recommendation,
  team,
  onAct,
  onDismiss,
  acting,
}: RecommendationCardProps) {
  const [aiExplanation, setAiExplanation] = React.useState<string | null>(null)
  const [aiError, setAiError] = React.useState<string | null>(null)
  const [aiLoading, setAiLoading] = React.useState(false)

  const statusTone =
    recommendation.status === "acted"
      ? "bg-emerald-500/15 text-emerald-400"
      : recommendation.status === "dismissed"
        ? "bg-muted text-muted-foreground"
        : "bg-amber-500/15 text-amber-300"

  const effortTone =
    recommendation.effort === "low"
      ? "bg-emerald-500/15 text-emerald-400"
      : recommendation.effort === "medium"
        ? "bg-amber-500/15 text-amber-300"
        : "bg-red-500/15 text-red-300"

  return (
    <Card className="h-full rounded-xl border-border/70 bg-card transition-all hover:-translate-y-0.5 hover:border-emerald-500/40">
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="size-4 text-violet-400" />
              {recommendation.resourceName}
            </CardTitle>
            <CardDescription className="mt-1 uppercase tracking-wide">
              {recommendation.type.replace("-", " ")}
              {team ? ` · ${team}` : ""}
            </CardDescription>
          </div>
          <Badge className={statusTone}>{recommendation.status}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm">
          <Badge variant="outline">{recommendation.currentTier}</Badge>
          <ArrowRight className="size-4 text-muted-foreground" />
          <Badge>{recommendation.suggestedTier}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">Current Cost</p>
            <p className="font-mono text-lg tabular-nums">{formatCurrency(recommendation.currentMonthlyCost)}</p>
          </div>
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
            <p className="text-xs text-emerald-300">Projected Cost</p>
            <p className="font-mono text-lg tabular-nums text-emerald-400">
              {formatCurrency(recommendation.projectedMonthlyCost)}
            </p>
          </div>
        </div>

        <div>
          <p className="text-sm text-muted-foreground">Monthly Savings</p>
          <p className="font-mono text-2xl font-bold text-emerald-500 tabular-nums">
            {formatCurrency(recommendation.monthlySavings)}
          </p>
          <p className="text-xs text-muted-foreground">
            Annual: {formatCurrency(recommendation.annualSavings)}
          </p>
        </div>

        <p className="text-sm text-muted-foreground">{recommendation.reasoning}</p>

        {aiExplanation ? (
          <div className="rounded-lg border border-blue-500/25 bg-blue-500/10 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-300">AI explanation</p>
            <p className="mt-1 text-sm text-blue-100/90">{aiExplanation}</p>
          </div>
        ) : null}

        {aiError ? <p className="text-xs text-red-400">{aiError}</p> : null}

        <div className="flex items-center gap-2">
          <Badge className={effortTone}>{recommendation.effort} effort</Badge>
          {recommendation.actedAt ? (
            <span className="text-xs text-muted-foreground">
              Acted {new Date(recommendation.actedAt).toLocaleDateString()}
            </span>
          ) : null}
        </div>
      </CardContent>

      <CardFooter className="flex flex-wrap justify-between gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={async () => {
            setAiLoading(true)
            setAiError(null)

            try {
              const response = await fetch("/api/ai-recommendation", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  resourceName: recommendation.resourceName,
                  team,
                  type: recommendation.type,
                  currentTier: recommendation.currentTier,
                  suggestedTier: recommendation.suggestedTier,
                  currentMonthlyCost: recommendation.currentMonthlyCost,
                  projectedMonthlyCost: recommendation.projectedMonthlyCost,
                  monthlySavings: recommendation.monthlySavings,
                  annualSavings: recommendation.annualSavings,
                  reasoning: recommendation.reasoning,
                  effort: recommendation.effort,
                }),
              })

              const payload = (await response.json().catch(() => ({}))) as {
                explanation?: string
                error?: string
              }

              if (!response.ok || !payload.explanation) {
                throw new Error(payload.error ?? "Unable to generate AI explanation")
              }

              setAiExplanation(payload.explanation)
            } catch (error) {
              setAiError(error instanceof Error ? error.message : "Unable to generate AI explanation")
            } finally {
              setAiLoading(false)
            }
          }}
          disabled={aiLoading}
        >
          <Sparkles className="mr-1 size-4" />
          {aiLoading ? "Thinking..." : "Ask AI"}
        </Button>

        <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDismiss(recommendation.id)}
          disabled={recommendation.status === "acted"}
        >
          <XCircle className="mr-1 size-4" />
          Dismiss
        </Button>
        <Button
          size="sm"
          onClick={() => onAct(recommendation.id)}
          disabled={acting || recommendation.status !== "pending"}
        >
          <CheckCircle2 className="mr-1 size-4" />
          {acting ? "Acting..." : "Act on This"}
        </Button>
        </div>
      </CardFooter>
    </Card>
  )
}