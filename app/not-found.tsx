import Link from "next/link"

import { Button } from "@/components/ui/button"

export default function NotFoundPage() {
  return (
    <main className="flex h-svh items-center justify-center p-6">
      <div className="w-full max-w-xl space-y-4 rounded-xl border border-border/70 bg-card p-6 text-center">
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <p className="text-sm text-muted-foreground">
          The page you requested does not exist or may have been moved.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button asChild variant="secondary">
            <Link href="/dashboard">Go To Dashboard</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Go Home</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/auth">Go To Sign In</Link>
          </Button>
        </div>
      </div>
    </main>
  )
}
