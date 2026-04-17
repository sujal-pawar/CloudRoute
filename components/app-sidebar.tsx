"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Activity,
  BellRing,
  CircleGauge,
  DatabaseZap,
  LayoutDashboard,
  PauseCircle,
  PiggyBank,
  Sparkles,
  UserCircle2,
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
]

const insightItems = [
  { title: "Anomalies", href: "/anomalies", icon: Activity },
  { title: "Savings Tracker", href: "/savings-tracker", icon: PiggyBank },
  { title: "Resources", href: "/resources", icon: DatabaseZap },
]

export function AppSidebar() {
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
                  <span className="truncate text-xs text-sidebar-foreground/70">
                    Optimization Hub
                  </span>
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
                <SidebarMenuItem key={item.title}>
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

        <SidebarGroup>
          <SidebarGroupLabel>Insights</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {insightItems.map((item) => (
                <SidebarMenuItem key={item.title}>
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
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground group-data-[collapsible=icon]:size-7">
              <UserCircle2 className="size-4 group-data-[collapsible=icon]:size-4" />
            </div>
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <p className="truncate text-sm font-medium">Hack Carnival Demo</p>
              <p className="truncate text-xs text-sidebar-foreground/70">
                Live cost optimization
              </p>
            </div>
          </div>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}