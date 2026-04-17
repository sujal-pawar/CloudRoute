import Link from "next/link"
import {
  ArrowRight,
  ChartNoAxesCombined,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react"

import Prism from "@/components/Prism"
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
    <div className="relative min-h-svh bg-black text-white">
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <Prism
          animationType="rotate"
          timeScale={0.2}
          height={3.5}
          baseWidth={5.5}
          scale={3.6}
          hueShift={0}
          colorFrequency={1}
          noise={0}
          glow={1}
        />
      </div>

      <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.08)_0%,transparent_35%,transparent_70%,rgba(255,255,255,0.06)_100%)]" />

      <section className="relative mx-auto flex w-full  flex-col px-6 py-6 sm:px-10 lg:px-14 lg:py-8">
        <header className="sticky top-4 z-20 flex items-center justify-between rounded-2xl border border-blue-300/15 bg-black px-4 py-3 backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <span className="text-2xl text-blue-300">▲</span>
            <div>
              <h1 className="text-xl font-semibold tracking-wide">CloudRoute</h1>

            </div>
          </div>

          <nav className="flex items-center gap-2">
            <Button
              asChild
              variant="ghost"
              className="h-8 text-white/80 hover:bg-white/10 hover:text-white"
            >
              <Link href="/auth?tab=login">Login</Link>
            </Button>
            <Button
              asChild
              className="h-8 bg-blue-400 px-4 text-slate-950 hover:bg-cyan-300"
            >
              <Link href="/auth?tab=signup">Sign up</Link>
            </Button>
          </nav>
        </header>

        <div className="flex flex-1 items-center justify-center">
          <div className="mx-auto flex max-w-3xl flex-col items-center text-center space-y-6 mt-16">

            {/* Badge */}
            <p className="inline-flex items-center gap-2 rounded-full border border-blue-300/30 bg-blue-300/10 px-3 py-1 text-xs uppercase tracking-[0.22em] text-cyan-100">
              <Sparkles className="size-3.5" />
              Hack Carnival 2026
            </p>

            {/* Heading */}
            <h1 className="text-6xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
              Navigate cloud cost <br /> with confidence
            </h1>

            {/* Description */}
            <p className="max-w-xl text-sm text-white/80 sm:text-base">
              CloudRoute helps teams discover idle resources, prevent budget drift,
              and ship optimization decisions faster with one shared dashboard.
            </p>

            {/* Buttons */}
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <Button
                asChild
                size="lg"
                className="h-10 bg-black px-4 hover:text-black/90 text-slate-100 "
              >
                <Link href="/auth?tab=signup" className="inline-flex items-center gap-2">
                  Start now
                  <ArrowRight className="size-4" />
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-10 border-white/20 bg-white/10 px-4 text-white hover:bg-white/20"
              >
                <Link href="/dashboard">Explore demo dashboard</Link>
              </Button>
            </div>

          </div>
        </div>
      </section>
    </div>
  )
}
