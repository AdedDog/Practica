import * as React from "react"
import { Link, useLocation } from "react-router-dom"

import { Calendars } from "@/components/calendars"
import { NavUser } from "@/components/nav-user"
import { getEvents } from "@/lib/api"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar"

export function AppSidebar({
  ...props
}) {
  const location = useLocation()
  const [events, setEvents] = React.useState([])

  React.useEffect(() => {
    getEvents()
      .then(setEvents)
      .catch(() => setEvents([]))
  }, [location.pathname])

  const calendars = [{ name: "Мероприятия" }]

  return (
    <Sidebar {...props}>
      <SidebarHeader className="h-16 border-b border-sidebar-border">
        <NavUser />
      </SidebarHeader>
      <SidebarContent>
        <Calendars calendars={calendars} events={events} />
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link to="/">
                <span>ВСЕ МЕРОПРИЯТИЯ</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
