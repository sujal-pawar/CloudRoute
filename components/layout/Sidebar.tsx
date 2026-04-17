"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ChevronUp,
  BellRing,
  CreditCard,
  LogOut,
  LayoutDashboard,
  PauseCircle,
  PiggyBank,
  Cloud,
  Settings,
  Sparkles,
} from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

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
  { title: "Cloud Connect", href: "/settings/cloud", icon: Cloud },
]

interface CurrentUser {
  name: string
  username: string
}

export function SidebarNav() {
  const pathname = usePathname()
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)

  useEffect(() => {
    let isMounted = true

    async function loadUser() {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" })

        if (response.status === 401) {
          if (isMounted) {
            setCurrentUser(null)
          }
          return
        }

        if (!response.ok) {
          return
        }

        const data = await response.json().catch(() => null)

        if (isMounted && data?.user) {
          setCurrentUser({
            name: data.user.name,
            username: data.user.username,
          })
        }
      } catch {
        // Ignore profile request failures in the shell.
      }
    }

    void loadUser()

    return () => {
      isMounted = false
    }
  }, [])

  const avatarFallback = useMemo(() => {
    const source = currentUser?.name || currentUser?.username || "CR"
    return source
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("")
  }, [currentUser])

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      })
    } finally {
      window.location.href = "/auth"
    }
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg">
              <Link href="/dashboard">
              <span className="text-[#367df9] drop-shadow-[0_0_10px_rgba(168,85,247,0.45)] text-3xl" >▲</span>
                <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate font-semibold">CloudRoute</span>
                  <span className="truncate text-xs text-zinc-500 ">Cost optimization </span>
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
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
                  <Avatar className="size-8 rounded-lg">
                    <AvatarFallback className="rounded-lg bg-linear-to-br from-cyan-500 to-violet-500 text-[10px] font-semibold text-white">
                      {avatarFallback}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                    <span className="truncate font-semibold">{currentUser?.name || "Name"}</span>
                    <span className="truncate text-xs text-sidebar-foreground/70">@{currentUser?.username || "userlogin"}</span>
                  </div>
                  <ChevronUp className="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align="end"
                className="w-(--radix-popper-anchor-width) min-w-56 rounded-xl"
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-2 py-1.5 text-left text-sm">
                    <Avatar className="size-8 rounded-lg">
                      <AvatarFallback className="rounded-lg bg-linear-to-br from-cyan-500 to-blue-500 text-[10px] font-semibold text-white">
                        {avatarFallback}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left leading-tight">
                      <span className="truncate font-semibold">{currentUser?.name || "Name"}</span>
                      <span className="truncate text-xs text-muted-foreground">@{currentUser?.username || "userlogin"}</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem>
                    <Settings />
                    Account
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <CreditCard />
                    Billing
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}