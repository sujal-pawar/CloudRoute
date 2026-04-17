import { NextResponse } from "next/server"

import { generateGeminiText } from "@/lib/ai/gemini"

type RecommendationExplainRequest = {
  resourceName?: string
  team?: string
  type?: string
  currentTier?: string
  suggestedTier?: string
  currentMonthlyCost?: number
  projectedMonthlyCost?: number
  monthlySavings?: number
  annualSavings?: number
  reasoning?: string
  effort?: string
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as RecommendationExplainRequest | null

  if (!body?.resourceName) {
    return NextResponse.json({ error: "resourceName is required" }, { status: 400 })
  }

  const payload = {
    resourceName: body.resourceName,
    team: body.team ?? "unknown",
    type: body.type ?? "rightsize",
    currentTier: body.currentTier ?? "unknown",
    suggestedTier: body.suggestedTier ?? "unknown",
    currentMonthlyCost: round2(body.currentMonthlyCost ?? 0),
    projectedMonthlyCost: round2(body.projectedMonthlyCost ?? 0),
    monthlySavings: round2(body.monthlySavings ?? 0),
    annualSavings: round2(body.annualSavings ?? 0),
    reasoning: body.reasoning ?? "No detailed reasoning provided",
    effort: body.effort ?? "unknown",
  }

  const prompt = [
    "You are a senior FinOps engineer.",
    "Write exactly 3 sentences explaining why this recommendation is safe and financially valuable.",
    "Include expected savings and practical confidence language.",
    "No bullet points. No headers.",
    "",
    "Recommendation data:",
    `- Resource: ${payload.resourceName}`,
    `- Team: ${payload.team}`,
    `- Type: ${payload.type}`,
    `- Current tier: ${payload.currentTier}`,
    `- Suggested tier: ${payload.suggestedTier}`,
    `- Current monthly cost: $${payload.currentMonthlyCost}`,
    `- Projected monthly cost: $${payload.projectedMonthlyCost}`,
    `- Monthly savings: $${payload.monthlySavings}`,
    `- Annual savings: $${payload.annualSavings}`,
    `- Effort: ${payload.effort}`,
    `- Existing reasoning: ${payload.reasoning}`,
  ].join("\n")

  try {
    const explanation = await generateGeminiText(prompt)
    return NextResponse.json({
      explanation: normalizeText(explanation),
      fallback: false,
    })
  } catch {
    return NextResponse.json({
      explanation: buildFallbackExplanation(payload),
      fallback: true,
    })
  }
}

function buildFallbackExplanation(payload: {
  resourceName: string
  team: string
  currentTier: string
  suggestedTier: string
  currentMonthlyCost: number
  projectedMonthlyCost: number
  monthlySavings: number
  annualSavings: number
  reasoning: string
}) {
  const sentenceOne = `${payload.resourceName} is a strong optimization candidate for the ${payload.team} team because it can move from ${payload.currentTier} to ${payload.suggestedTier} while preserving capacity for current demand.`
  const sentenceTwo = `This change reduces monthly run-rate from $${payload.currentMonthlyCost} to about $${payload.projectedMonthlyCost}, creating roughly $${payload.monthlySavings} in monthly savings and $${payload.annualSavings} annually.`
  const sentenceThree = `Based on observed usage and recommendation signals (${payload.reasoning}), this is a low-risk action that should be prioritized in the next optimization cycle.`

  return `${sentenceOne} ${sentenceTwo} ${sentenceThree}`
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim()
}

function round2(value: number) {
  return Math.round(value * 100) / 100
}
