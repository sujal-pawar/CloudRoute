import Link from "next/link"
import { ArrowRight, ChartNoAxesCombined, ShieldCheck, Zap } from "lucide-react"

import { Button } from "@/components/ui/button"

const highlights = [
  {
    title: "Real-time Cost Signals",
    description:
      "Spot spend spikes as they happen with anomaly overlays and team-level trend tracking.",
    icon: ChartNoAxesCombined,
  },
  {
    title: "Guardrails That Trigger",
    description:
      "Create budget alerts and threshold rules so finance and engineering get notified before overruns.",
    icon: ShieldCheck,
  },
  {
    title: "Actionable Optimization",
    description:
      "Turn recommendations into measurable savings with progress timelines and impact summaries.",
    icon: Zap,
  },
]

export default function HomePage() {
  return (
    <div className="relative min-h-svh overflow-hidden bg-[radial-gradient(circle_at_20%_20%,hsl(194_98%_53%/0.22),transparent_40%),radial-gradient(circle_at_80%_15%,hsl(219_94%_65%/0.2),transparent_45%),linear-gradient(135deg,hsl(227_45%_8%),hsl(219_48%_12%))] text-white">
      <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.08)_0%,transparent_35%,transparent_70%,rgba(255,255,255,0.06)_100%)]" />

      <section className="relative mx-auto flex w-full max-w-6xl flex-col px-6 py-10 sm:px-10 lg:px-14 lg:py-14">
        <header className="flex items-center justify-between rounded-2xl border border-white/15 bg-white/5 px-4 py-3 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <span className="text-xl text-cyan-300">▲</span>
            <div>
              <p className="text-sm font-semibold tracking-wide">CloudRoute</p>
              <p className="text-xs text-white/70">FinOps control plane</p>
            </div>
          </div>
          <Button asChild variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/20">
            <Link href="/auth">Login / Sign up</Link>
          </Button>
        </header>

        <div className="mt-12 grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <p className="inline-flex items-center gap-2 rounded-full border border-cyan-300/35 bg-cyan-300/10 px-3 py-1 text-xs uppercase tracking-[0.22em] text-cyan-100">
              Hack Carnival 2026
            </p>
            <h1 className="font-heading text-4xl leading-tight font-semibold sm:text-5xl lg:text-6xl">
              Navigate cloud cost with confidence, not guesswork.
            </h1>
            <p className="max-w-xl text-sm text-white/80 sm:text-base">
              CloudRoute helps teams discover idle resources, prevent budget drift,
              and ship optimization decisions faster with one shared dashboard.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="h-10 bg-cyan-400 px-4 text-slate-900 hover:bg-cyan-300">
                <Link href="/auth" className="inline-flex items-center gap-2">
                  Start now
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-10 border-white/20 bg-white/10 px-4 text-white hover:bg-white/20">
                <Link href="/dashboard">Explore demo dashboard</Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-4">
            {highlights.map((item) => (
              <article
                key={item.title}
                className="rounded-2xl border border-white/15 bg-white/10 p-5 shadow-xl backdrop-blur-sm transition hover:-translate-y-0.5 hover:bg-white/15"
              >
                <item.icon className="size-5 text-cyan-200" />
                <h2 className="mt-3 font-medium text-white">{item.title}</h2>
                <p className="mt-1 text-sm text-white/75">{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
