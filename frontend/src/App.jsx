import { AppSidebar } from "@/components/app-sidebar"
import { EventSelection } from "@/components/event-selection"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

export default function Page() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-background">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 md:hidden">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <span className="text-sm font-medium">Календарь</span>
        </header>
        <main className="flex flex-1 flex-col overflow-auto">
          <EventSelection />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
