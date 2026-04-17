"use client"

import Link from "next/link"

import { Button } from "@/components/ui/button"

type GlobalErrorPageProps = {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalErrorPage({ error, reset }: GlobalErrorPageProps) {
  console.error("Global error boundary captured an error", error)

  return (
    <html lang="en">
      <body className="flex min-h-svh items-center justify-center bg-background p-6 text-foreground">
        <div className="w-full max-w-xl space-y-4 rounded-xl border border-border/70 bg-card p-6">
          <h1 className="text-xl font-semibold">Application error</h1>
          <p className="text-sm text-muted-foreground">
            A critical error occurred. You can retry the render or return to a safe page.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={reset}>
              Retry
            </Button>
            <Button asChild type="button" variant="outline">
              <Link href="/">Go Home</Link>
            </Button>
            <Button asChild type="button" variant="outline">
              <Link href="/auth">Go To Sign In</Link>
            </Button>
          </div>
        </div>
      </body>
    </html>
  )
}
