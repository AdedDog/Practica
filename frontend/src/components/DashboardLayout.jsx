import { Outlet } from "react-router-dom"

import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

/** Общий Dashboard: sidebar + контент страницы */
export function DashboardLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex min-h-svh flex-col bg-background">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 md:hidden">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <span className="text-sm font-medium">IT-Куб</span>
        </header>
        <main className="flex flex-1 flex-col overflow-auto">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
