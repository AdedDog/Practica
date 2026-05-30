import * as React from "react"
import { Link, useLocation } from "react-router-dom"

import { Calendars } from "@/components/calendars"
import { DatePicker } from "@/components/date-picker"
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
  const [eventItems, setEventItems] = React.useState([])

  React.useEffect(() => {
    getEvents()
      .then((list) =>
        setEventItems(
          list.map((ev) => ({
            label: ev.title,
            href: `/events/${ev.slug}`,
          }))
        )
      )
      .catch(() => setEventItems([]))
  }, [location.pathname])

  const calendars = [
    {
      name: "Мероприятия",
      items:
        eventItems.length > 0
          ? eventItems
          : [{ label: "Нет активных мероприятий", href: "/" }],
    },
  ]

  return (
    <Sidebar {...props}>
      <SidebarHeader className="h-16 border-b border-sidebar-border">
        <NavUser />
      </SidebarHeader>
      <SidebarContent>
        <DatePicker />
        <SidebarSeparator className="mx-0" />
        <Calendars calendars={calendars} />
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link to="/">
                <span>Мероприятия</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link to="/cabinet/login">
                <span>Личный кабинет</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link to="/admin/login">
                <span>Админ-панель</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
