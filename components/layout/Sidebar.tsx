"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BellRing,
  CircleGauge,
  LayoutDashboard,
  PauseCircle,
  PiggyBank,
  Sparkles,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

const navItems = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Idle Resources", href: "/idle-resources", icon: PauseCircle },
  { title: "Recommendations", href: "/recommendations", icon: Sparkles },
  { title: "Alerts", href: "/alerts", icon: BellRing },
  { title: "Savings Tracker", href: "/savings-tracker", icon: PiggyBank },
]

export function SidebarNav() {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg">
              <Link href="/dashboard">
                <div className="flex size-10 items-center justify-center rounded-xl bg-linear-to-br from-blue-500 to-cyan-400 text-white shadow-sm group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:rounded-lg">
                  <CircleGauge className="size-5 group-data-[collapsible=icon]:size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate font-semibold">FinOps Cloud Cost</span>
                  <span className="truncate text-xs text-sidebar-foreground/70">Optimization Hub</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    isActive={pathname === item.href}
                  >
                    <Link href={item.href}>
                      <item.icon className="size-4 shrink-0 transition-transform group-data-[collapsible=icon]:size-5" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/30 p-3 group-data-[collapsible=icon]:p-2">
          <p className="text-xs text-sidebar-foreground/80 group-data-[collapsible=icon]:hidden">
            PS-004 Hack Carnival 2026
          </p>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}