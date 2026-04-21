"use client"

import Link from "next/link"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type AuthMode = "login" | "signup"

interface PublicNavbarProps {
  active?: "home" | AuthMode
  onAuthModeChange?: (mode: AuthMode) => void
}

export function PublicNavbar({
  active = "home",
  onAuthModeChange,
}: PublicNavbarProps) {
  const isInteractiveAuth = Boolean(onAuthModeChange)

  return (
    <header className="sticky top-4 z-20 flex items-center justify-between rounded-2xl border border-white/15 bg-slate-950/55 px-4 py-3 backdrop-blur-xl">
      <div className="flex items-center gap-2">
        <span className="text-xl text-cyan-300">▲</span>
        <div>
          <h1 className="text-xl font-semibold tracking-wide text-white">CloudRoute</h1>
        </div>
      </div>

      <nav className="flex items-center gap-2">
        <Button
          asChild
          variant="ghost"
          className={cn(
            "h-8 text-white/80 hover:bg-white/10 hover:text-white",
            active === "home" && "bg-white/10 text-white"
          )}
        >
          <Link href="/">Home</Link>
        </Button>

        {isInteractiveAuth ? (
          <>
            <Button
              type="button"
              variant={active === "login" ? "default" : "ghost"}
              className={cn(
                "h-8 px-4",
                active === "login"
                  ? "bg-cyan-400 text-slate-950 hover:bg-cyan-300"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              )}
              onClick={() => onAuthModeChange?.("login")}
            >
              Login
            </Button>
            <Button
              type="button"
              variant={active === "signup" ? "default" : "ghost"}
              className={cn(
                "h-8 px-4",
                active === "signup"
                  ? "bg-cyan-400 text-slate-950 hover:bg-cyan-300"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              )}
              onClick={() => onAuthModeChange?.("signup")}
            >
              Sign up
            </Button>
          </>
        ) : (
          <>
            <Button
              asChild
              variant={active === "login" ? "default" : "ghost"}
              className={cn(
                "h-8 px-4",
                active === "login"
                  ? "bg-cyan-400 text-slate-950 hover:bg-cyan-300"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              )}
            >
              <Link href="/auth?tab=login">Login</Link>
            </Button>
            <Button
              asChild
              variant={active === "signup" ? "default" : "ghost"}
              className={cn(
                "h-8 px-4",
                active === "signup"
                  ? "bg-cyan-400 text-slate-950 hover:bg-cyan-300"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              )}
            >
              <Link href="/auth?tab=signup">Sign up</Link>
            </Button>
          </>
        )}
      </nav>
    </header>
  )
}