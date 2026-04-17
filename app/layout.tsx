import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { ThemeProvider } from "@/components/theme-provider";
import { SidebarNav } from "@/components/layout/Sidebar";
import { AlertToaster } from "@/components/layout/AlertToaster";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FinOps Cloud Cost Dashboard",
  description: "Cloud cost optimization dashboard for Hack Carnival 2026",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "h-full",
        "antialiased",
        geistSans.variable,
        geistMono.variable,
        "font-sans",
        inter.variable
      )}
    >
      <body className="h-svh overflow-hidden">
        <ThemeProvider>
          <TooltipProvider>
            <SidebarProvider className="h-svh overflow-hidden">
              <SidebarNav />
              <SidebarInset className="min-h-0 min-w-0 overflow-hidden">
                <TopBar />
                <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden scrollbar-hidden">
                  {children}
                </main>
              </SidebarInset>
            </SidebarProvider>
            <AlertToaster />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}