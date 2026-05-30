import * as React from "react"
import { Link } from "react-router-dom"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { ChevronRightIcon, CheckIcon } from "lucide-react"

export function Calendars({
  calendars
}) {
  return (
    <>
      {calendars.map((calendar, index) => (
        <React.Fragment key={calendar.name}>
          <SidebarGroup key={calendar.name}>
            <Collapsible defaultOpen={index === 0} className="group/collapsible">
              <SidebarGroupLabel
                asChild
                className="group/label w-full text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                <CollapsibleTrigger>
                  {calendar.name}{" "}
                  <ChevronRightIcon
                    className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {calendar.items.map((item, index) => {
                      const label = typeof item === "string" ? item : item.label
                      const href = typeof item === "string" ? null : item.href
                      const key = href ?? label
                      return (
                      <SidebarMenuItem key={key}>
                        <SidebarMenuButton asChild={Boolean(href)}>
                          {href ? (
                            <Link to={href}>
                              <div
                                data-active={index === 0}
                                className="group/calendar-item flex aspect-square size-4 shrink-0 items-center justify-center rounded-sm border border-sidebar-border text-sidebar-primary-foreground data-[active=true]:border-sidebar-primary data-[active=true]:bg-sidebar-primary">
                                <CheckIcon className="hidden size-3 group-data-[active=true]/calendar-item:block" />
                              </div>
                              {label}
                            </Link>
                          ) : (
                            <>
                              <div
                                data-active={index === 0}
                                className="group/calendar-item flex aspect-square size-4 shrink-0 items-center justify-center rounded-sm border border-sidebar-border text-sidebar-primary-foreground data-[active=true]:border-sidebar-primary data-[active=true]:bg-sidebar-primary">
                                <CheckIcon className="hidden size-3 group-data-[active=true]/calendar-item:block" />
                              </div>
                              {label}
                            </>
                          )}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )})}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>
          <SidebarSeparator className="mx-0" />
        </React.Fragment>
      ))}
    </>
  );
}
