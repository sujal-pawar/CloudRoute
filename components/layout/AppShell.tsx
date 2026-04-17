"use client"

import { usePathname } from "next/navigation"

import { SidebarNav } from "@/components/layout/Sidebar"
import { TopBar } from "@/components/layout/TopBar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

function isPublicPath(pathname: string) {
  return pathname === "/" || pathname.startsWith("/auth")
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  if (isPublicPath(pathname)) {
    return (
      <main className="min-h-svh overflow-y-auto overflow-x-hidden">
        {children}
      </main>
    )
  }

  return (
    <SidebarProvider className="h-svh overflow-hidden">
      <SidebarNav />
      <SidebarInset className="min-h-0 min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden scrollbar-hidden">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
