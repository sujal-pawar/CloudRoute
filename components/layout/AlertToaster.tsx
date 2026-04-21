"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { Toaster, toast } from "sonner"

import { useAppStore } from "@/lib/store/useAppStore"

function isPublicPath(pathname: string) {
  return pathname === "/" || pathname.startsWith("/auth")
}

export function AlertToaster() {
  const pathname = usePathname()
  const loadAlertHistory = useAppStore((state) => state.loadAlertHistory)
  const syncAlertBreaches = useAppStore((state) => state.syncAlertBreaches)
  const shownToastIds = React.useRef<Set<string>>(new Set())
  const [canSyncAlerts, setCanSyncAlerts] = React.useState(false)

  React.useEffect(() => {
    let mounted = true

    const checkSession = async () => {
      if (isPublicPath(pathname)) {
        setCanSyncAlerts(false)
        return
      }

      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" })

        if (!mounted) {
          return
        }

        setCanSyncAlerts(response.ok)
      } catch {
        if (mounted) {
          setCanSyncAlerts(false)
        }
      }
    }

    void checkSession()

    return () => {
      mounted = false
    }
  }, [pathname])

  React.useEffect(() => {
    if (!canSyncAlerts) {
      return
    }

    let mounted = true

    const syncNow = async () => {
      const freshAlerts = await syncAlertBreaches()

      if (!mounted) {
        return
      }

      for (const alertEvent of freshAlerts) {
        if (shownToastIds.current.has(alertEvent.id)) {
          continue
        }

        shownToastIds.current.add(alertEvent.id)
        toast.error(alertEvent.ruleName, {
          description: alertEvent.message,
        })
      }
    }

    void loadAlertHistory()
    void syncNow()

    const intervalId = window.setInterval(() => {
      void syncNow()
    }, 30000)

    return () => {
      mounted = false
      window.clearInterval(intervalId)
    }
  }, [canSyncAlerts, loadAlertHistory, syncAlertBreaches])

  if (!canSyncAlerts) {
    return null
  }

  return <Toaster position="top-right" richColors closeButton />
}