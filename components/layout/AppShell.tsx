"use client"

import * as React from "react"
import { usePathname } from "next/navigation"

import { SidebarNav } from "@/components/layout/Sidebar"
import { TopBar } from "@/components/layout/TopBar"
import { Button } from "@/components/ui/button"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

function isPublicPath(pathname: string) {
  return pathname === "/" || pathname.startsWith("/auth")
}

type SessionStatus = "checking" | "valid" | "invalid" | "unavailable"

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [sessionStatus, setSessionStatus] = React.useState<SessionStatus>("checking")

  const validateSession = React.useCallback(async () => {
    if (isPublicPath(pathname)) {
      setSessionStatus("valid")
      return
    }

    setSessionStatus("checking")

    try {
      const response = await fetch("/api/auth/me", { cache: "no-store" })

      if (response.status === 401) {
        setSessionStatus("invalid")
        return
      }

      if (!response.ok) {
        setSessionStatus("unavailable")
        return
      }

      setSessionStatus("valid")
    } catch {
      setSessionStatus("unavailable")
    }
  }, [pathname])

  React.useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void validateSession()
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [validateSession])

  React.useEffect(() => {
    if (sessionStatus !== "invalid") {
      return
    }

    const destination = new URL("/auth", window.location.origin)
    destination.searchParams.set("next", pathname || "/dashboard")
    window.location.assign(destination.toString())
  }, [pathname, sessionStatus])

  if (isPublicPath(pathname)) {
    return (
      <main className="h-svh overflow-y-auto overflow-x-hidden">
        {children}
      </main>
    )
  }

  if (sessionStatus === "checking" || sessionStatus === "invalid") {
    return (
      <main className="flex h-svh items-center justify-center p-6">
        <div className="w-full max-w-md rounded-xl border border-border/70 bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">
            {sessionStatus === "checking"
              ? "Checking your session..."
              : "Redirecting to sign in..."}
          </p>
        </div>
      </main>
    )
  }

  if (sessionStatus === "unavailable") {
    return (
      <main className="flex h-svh items-center justify-center p-6">
        <div className="w-full max-w-lg space-y-4 rounded-xl border border-border/70 bg-card p-6">
          <h2 className="text-lg font-semibold">Connection issue detected</h2>
          <p className="text-sm text-muted-foreground">
            We could not verify your session because the auth API is temporarily unavailable.
            You can retry now or return to the sign-in page.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => void validateSession()}>
              Retry
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const destination = new URL("/auth", window.location.origin)
                destination.searchParams.set("next", pathname || "/dashboard")
                window.location.assign(destination.toString())
              }}
            >
              Go To Sign In
            </Button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <SidebarProvider className="h-svh overflow-hidden">
      <SidebarNav />
      <SidebarInset className="min-h-0 min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden scrollbar-hidden">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
