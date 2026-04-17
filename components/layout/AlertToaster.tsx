"use client"

import * as React from "react"
import { Toaster, toast } from "sonner"

import { useAppStore } from "@/lib/store/useAppStore"

export function AlertToaster() {
  const loadAlertHistory = useAppStore((state) => state.loadAlertHistory)
  const syncAlertBreaches = useAppStore((state) => state.syncAlertBreaches)
  const shownToastIds = React.useRef<Set<string>>(new Set())

  React.useEffect(() => {
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
  }, [loadAlertHistory, syncAlertBreaches])

  return <Toaster position="top-right" richColors closeButton />
}