"use client"

import { useEffect } from "react"
import Link from "next/link"

import { Button } from "@/components/ui/button"

type ErrorPageProps = {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error("Route error boundary captured an error", error)
  }, [error])

  return (
    <main className="flex h-svh items-center justify-center p-6">
      <div className="w-full max-w-xl space-y-4 rounded-xl border border-border/70 bg-card p-6">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="text-sm text-muted-foreground">
          We hit an unexpected issue while rendering this page. You can retry, return to
          the dashboard, or sign in again.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={reset}>
            Retry
          </Button>
          <Button asChild type="button" variant="outline">
            <Link href="/dashboard">Go To Dashboard</Link>
          </Button>
          <Button asChild type="button" variant="outline">
            <Link href="/auth">Go To Sign In</Link>
          </Button>
        </div>
      </div>
    </main>
  )
}
