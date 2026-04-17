"use client"

import { create } from "zustand"

import type { AlertEvent } from "@/lib/types"

type TeamFilter =
  | "all-teams"
  | "platform"
  | "backend"
  | "frontend"
  | "data"
  | "security"
  | "devops"

type AppStore = {
  selectedTeam: TeamFilter
  alertEvents: AlertEvent[]
  unreadAlertIds: string[]
  isAlertSyncing: boolean
  setSelectedTeam: (team: TeamFilter) => void
  markAlertsRead: () => void
  syncAlertBreaches: () => Promise<AlertEvent[]>
  loadAlertHistory: () => Promise<void>
}

type CostsResponse = {
  alerts?: AlertEvent[]
}

type AlertsResponse = {
  events?: AlertEvent[]
}

export const useAppStore = create<AppStore>((set, get) => ({
  selectedTeam: "all-teams",
  alertEvents: [],
  unreadAlertIds: [],
  isAlertSyncing: false,

  setSelectedTeam: (team) => set({ selectedTeam: team }),

  markAlertsRead: () => {
    set({ unreadAlertIds: [] })
  },

  syncAlertBreaches: async () => {
    set({ isAlertSyncing: true })

    try {
      const response = await fetch("/api/costs?period=30d&groupBy=service", {
        cache: "no-store",
      })

      if (!response.ok) {
        return []
      }

      const payload = (await response.json()) as CostsResponse
      const incomingAlerts = payload.alerts ?? []

      if (incomingAlerts.length === 0) {
        return []
      }

      const state = get()
      const knownEventIds = new Set(state.alertEvents.map((event) => event.id))
      const freshAlerts = incomingAlerts.filter((alert) => !knownEventIds.has(alert.id))

      if (freshAlerts.length > 0) {
        set((current) => ({
          alertEvents: [...freshAlerts, ...current.alertEvents],
          unreadAlertIds: [
            ...freshAlerts.map((alert) => alert.id),
            ...current.unreadAlertIds,
          ],
        }))
      }

      return freshAlerts
    } finally {
      set({ isAlertSyncing: false })
    }
  },

  loadAlertHistory: async () => {
    const response = await fetch("/api/alerts", { cache: "no-store" })
    if (!response.ok) {
      return
    }

    const payload = (await response.json()) as AlertsResponse
    const events = payload.events ?? []

    set((current) => {
      if (current.alertEvents.length > 0) {
        return current
      }

      return {
        ...current,
        alertEvents: events,
      }
    })
  },
}))