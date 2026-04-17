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
  const [selectedTeam, setSelectedTeam] = React.useState("all-teams")

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

        <Button type="button" variant="outline" size="icon-sm" className="relative">
          <Bell className="size-4" />
          <Badge className="absolute -top-1 -right-1 size-4 rounded-full p-0 text-[10px]">
            2
          </Badge>
          <span className="sr-only">Alerts</span>
        </Button>
        
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => setTheme(isDark ? "light" : "dark")}
        >
          {isDark ? <SunMedium className="size-4" /> : <Moon className="size-4" />}
          
        </Button>
      </div>
    </header>
  )
}