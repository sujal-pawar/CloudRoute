import { NextResponse } from "next/server"

import { generateGeminiText } from "@/lib/ai/gemini"

type AISummaryRequest = {
  costs?: {
    totalThisMonth?: number
    changePercent?: number
    topRecommendation?: string
  }
  idleCount?: number
  totalWaste?: number
  topTeam?: {
    name?: string
    spend?: number
  }
  breachedAlerts?: string[]
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as AISummaryRequest | null

  if (!body?.costs) {
    return NextResponse.json({ error: "Missing costs payload" }, { status: 400 })
  }

  const costs = {
    totalThisMonth: round2(body.costs.totalThisMonth ?? 0),
    changePercent: round2(body.costs.changePercent ?? 0),
    topRecommendation: (body.costs.topRecommendation ?? "None").trim() || "None",
  }

  const idleCount = Math.max(0, Math.floor(body.idleCount ?? 0))
  const totalWaste = round2(body.totalWaste ?? 0)
  const topTeam = {
    name: (body.topTeam?.name ?? "unknown").trim() || "unknown",
    spend: round2(body.topTeam?.spend ?? 0),
  }
  const breachedAlerts = (body.breachedAlerts ?? []).slice(0, 8)

  const prompt = [
    "You are a FinOps analyst.",
    "Write exactly 3 sentences for an executive cloud-cost summary.",
    "Sentence 1: biggest issue and month-over-month context.",
    "Sentence 2: top quick win with specific savings.",
    "Sentence 3: one team that needs attention, optionally referencing breached budget alerts.",
    "No bullet points. No headers. Use concise business language.",
    "",
    "Data:",
    `- Total monthly spend: $${costs.totalThisMonth}`,
    `- Month-over-month change: ${costs.changePercent}%`,
    `- Idle resources found: ${idleCount}`,
    `- Monthly waste identified: $${totalWaste}`,
    `- Highest spending team: ${topTeam.name} at $${topTeam.spend}/month`,
    `- Breached budget alerts: ${breachedAlerts.length > 0 ? breachedAlerts.join(", ") : "none"}`,
    `- Top recommendation: ${costs.topRecommendation}`,
  ].join("\n")

  try {
    const summary = await generateGeminiText(prompt)
    return NextResponse.json({
      summary: normalizeSummary(summary),
      generatedAt: new Date().toISOString(),
      model: process.env.GEMINI_MODEL?.trim() || "gemini-1.5-flash",
      fallback: false,
    })
  } catch {
    return NextResponse.json({
      summary: buildFallbackSummary({ costs, idleCount, totalWaste, topTeam, breachedAlerts }),
      generatedAt: new Date().toISOString(),
      model: "fallback",
      fallback: true,
    })
  }
}

function buildFallbackSummary(input: {
  costs: {
    totalThisMonth: number
    changePercent: number
    topRecommendation: string
  }
  idleCount: number
  totalWaste: number
  topTeam: {
    name: string
    spend: number
  }
  breachedAlerts: string[]
}) {
  const movement =
    input.costs.changePercent > 0
      ? `increased ${Math.abs(input.costs.changePercent)}%`
      : input.costs.changePercent < 0
        ? `decreased ${Math.abs(input.costs.changePercent)}%`
        : "remained flat"

  const sentenceOne = `Cloud spend ${movement} month-over-month to $${input.costs.totalThisMonth}, with the largest pressure coming from ${input.topTeam.name} at $${input.topTeam.spend} this month.`

  const recommendationText =
    input.costs.topRecommendation && input.costs.topRecommendation !== "None"
      ? input.costs.topRecommendation
      : `addressing ${input.idleCount} idle resources`

  const sentenceTwo = `The fastest savings win is ${recommendationText}, and your current waste surface is about $${input.totalWaste} per month.`

  const sentenceThree =
    input.breachedAlerts.length > 0
      ? `Immediate attention is required for ${input.topTeam.name} because budget alerts are already breached (${input.breachedAlerts.join(", ")}).`
      : `Immediate attention should go to ${input.topTeam.name}, which is currently your highest-spending team.`

  return `${sentenceOne} ${sentenceTwo} ${sentenceThree}`
}

function normalizeSummary(text: string) {
  const normalized = text.replace(/\s+/g, " ").trim()

  if (!normalized) {
    return "AI summary could not be generated right now."
  }

  return normalized
}

function round2(value: number) {
  return Math.round(value * 100) / 100
}
