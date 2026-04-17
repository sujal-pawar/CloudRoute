"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { Bell, Moon, SunMedium } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { useTheme } from "@/components/theme-provider"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAppStore } from "@/lib/store/useAppStore"

const pageTitles: Record<string, { title: string; description: string }> = {
  "/dashboard": {
    title: "Dashboard",
    description: "Live cloud spend, waste, and optimization signals.",
  },
  "/idle-resources": {
    title: "Idle Resources",
    description: "Resources burning money with near-zero usage.",
  },
  "/recommendations": {
    title: "Recommendations",
    description: "Rightsizing actions with projected savings.",
  },
  "/alerts": {
    title: "Alerts",
    description: "Threshold rules and breach history.",
  },
  "/anomalies": {
    title: "Anomalies",
    description: "Spikes that need attention.",
  },
  "/savings-tracker": {
    title: "Savings Tracker",
    description: "Projected vs realized savings over time.",
  },
  "/resources": {
    title: "Resources",
    description: "Cloud inventory across teams and environments.",
  },
}

export function TopBar() {
  const pathname = usePathname()
  const { resolvedTheme, setTheme } = useTheme()
  const selectedTeam = useAppStore((state) => state.selectedTeam)
  const setSelectedTeam = useAppStore((state) => state.setSelectedTeam)
  const unreadCount = useAppStore((state) => state.unreadAlertIds.length)
  const markAlertsRead = useAppStore((state) => state.markAlertsRead)

  const page = pageTitles[pathname] ?? {
    title: "FinOps Cloud Cost Optimization",
    description: "Track spend, waste, alerts, and savings.",
  }

  const isDark = resolvedTheme !== "light"

  return (
    <header className="flex h-14 items-center justify-between gap-3 border-b px-4 md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <SidebarTrigger className="shrink-0" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{page.title}</p>
          <p className="truncate text-xs text-muted-foreground">{page.description}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Select value={selectedTeam} onValueChange={setSelectedTeam}>
          <SelectTrigger size="sm" className="hidden w-45 md:flex">
            <SelectValue placeholder="Select team" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all-teams">All teams</SelectItem>
            <SelectItem value="platform">Platform</SelectItem>
            <SelectItem value="backend">Backend</SelectItem>
            <SelectItem value="frontend">Frontend</SelectItem>
            <SelectItem value="data">Data</SelectItem>
            <SelectItem value="security">Security</SelectItem>
            <SelectItem value="devops">DevOps</SelectItem>
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="relative"
          onClick={markAlertsRead}
        >
          <Bell className="size-4" />
          {unreadCount > 0 ? (
            <Badge className="absolute -top-1 -right-1 min-w-4 rounded-full px-1 py-0 text-[10px] leading-4">
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          ) : null}
          <span className="sr-only">Alerts</span>
        </Button>

        <div className="hidden rounded-full border px-3 py-1 text-xs text-muted-foreground md:block">
          {isDark ? "Dark mode" : "Light mode"}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => setTheme(isDark ? "light" : "dark")}
        >
          {isDark ? <SunMedium className="size-4" /> : <Moon className="size-4" />}
          <span className="hidden sm:inline">{isDark ? "Light" : "Dark"}</span>
        </Button>
      </div>
    </header>
  )
}