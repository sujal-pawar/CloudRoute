import Link from "next/link"
import {
  ArrowRight,
  Sparkles,
} from "lucide-react"

import Prism from "@/components/Prism"
import { PublicNavbar } from "@/components/layout/PublicNavbar"
import { Button } from "@/components/ui/button"

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
        <PublicNavbar active="home" />

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
