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

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/idle-resources": "Idle Resources",
  "/recommendations": "Recommendations",
  "/alerts": "Alerts",
  "/anomalies": "Anomalies",
  "/savings-tracker": "Savings Tracker",
  "/resources": "Resources",
  "/settings/cloud": "Cloud Connection",
}

export function TopBar() {
  const pathname = usePathname()
  const { resolvedTheme, setTheme } = useTheme()
  const selectedTeam = useAppStore((state) => state.selectedTeam)
  const setSelectedTeam = useAppStore((state) => state.setSelectedTeam)
  const unreadCount = useAppStore((state) => state.unreadAlertIds.length)
  const markAlertsRead = useAppStore((state) => state.markAlertsRead)

  const pageTitle = pageTitles[pathname] ?? "CloudRoute"

  const isDark = resolvedTheme !== "light"

  return (
    <header className="flex h-16 items-center justify-between gap-3 border-b border-border/70 bg-background/80 px-4 backdrop-blur-sm md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <SidebarTrigger className="shrink-0 rounded-lg border border-border/70 bg-background/60" />
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold tracking-tight text-foreground md:text-xl">{pageTitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-card/70 p-1.5">
        <Select value={selectedTeam} onValueChange={setSelectedTeam}>
          <SelectTrigger size="sm" className="hidden w-40 border-border/70 bg-background/60 md:flex">
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
          className="relative border-border/70 bg-background/60"
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
        
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="border-border/70 bg-background/60"
          onClick={() => setTheme(isDark ? "light" : "dark")}
        >
          {isDark ? <SunMedium className="size-4" /> : <Moon className="size-4" />}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </div>
    </header>
  )
}