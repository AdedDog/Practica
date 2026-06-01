import * as React from "react"
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom"
import { ru } from "react-day-picker/locale"

import { Calendar, CalendarDayButton } from "@/components/ui/calendar"
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
import { cn, eventOnDate, getEventDays, parseIsoDate, toIsoDate } from "@/lib/utils"
import { ChevronRightIcon, CheckIcon } from "lucide-react"

function isEventLinkActive(pathname, href) {
  if (!href || href === "/") return pathname === "/"
  return pathname === href || pathname.startsWith(`${href}/`)
}

function buildEventsByDate(events) {
  const map = new Map()
  for (const event of events) {
    for (const day of getEventDays(event)) {
      const key = toIsoDate(day)
      if (!map.has(key)) map.set(key, [])
      const list = map.get(key)
      if (!list.some((e) => e.id === event.id)) list.push(event)
    }
  }
  return map
}

function buildEventMenuItems(events, selectedDate) {
  const dated = events.filter((e) => e.start_date)
  const undated = events.filter((e) => !e.start_date)
  const filtered = selectedDate
    ? dated.filter((event) => eventOnDate(event, selectedDate))
    : [...dated, ...undated]

  if (events.length === 0) {
    return [{ label: "Нет активных мероприятий", href: null }]
  }
  if (selectedDate && filtered.length === 0) {
    return [{ label: "Нет мероприятий в этот день", href: null }]
  }
  return filtered.map((event) => ({
    label: event.title,
    href: `/events/${event.slug}`,
  }))
}

const EventsByDateContext = React.createContext(new Map())

function EventCalendarDayButton({ children, modifiers, day, className, ...props }) {
  const eventsByDate = React.useContext(EventsByDateContext)
  const eventCount = eventsByDate.get(toIsoDate(day.date))?.length ?? 0

  return (
    <CalendarDayButton
      day={day}
      modifiers={modifiers}
      className={cn(
        "relative rounded-lg",
        className,
        modifiers.event &&
          "bg-sidebar-primary/20 font-medium hover:bg-sidebar-primary/30"
      )}
      {...props}
    >
      {children}
      {eventCount >= 2 && (
        <span
          className="absolute -top-0.5 -right-0.5 flex size-3.5 min-w-3.5 items-center justify-center rounded-full bg-destructive px-0.5 text-[0.5625rem] font-semibold leading-none text-white"
          aria-label={`${eventCount} мероприятия`}
        >
          {eventCount}
        </span>
      )}
    </CalendarDayButton>
  )
}

const sidebarCalendarComponents = { DayButton: EventCalendarDayButton }

export function Calendars({ calendars, events }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const selectedDate = React.useMemo(() => {
    const raw = searchParams.get("date")
    return raw ? parseIsoDate(raw) : undefined
  }, [searchParams])

  const eventsByDate = React.useMemo(
    () => (events ? buildEventsByDate(events) : new Map()),
    [events]
  )

  const handleDateSelect = React.useCallback(
    (date) => {
      if (!date) {
        navigate("/")
        return
      }
      const iso = toIsoDate(date)
      const dayEvents = eventsByDate.get(iso) ?? []
      if (dayEvents.length === 1) {
        navigate(`/events/${dayEvents[0].slug}?date=${iso}`)
      } else {
        navigate(`/?date=${iso}`)
      }
    },
    [eventsByDate, navigate]
  )

  const eventDates = React.useMemo(
    () => Array.from(eventsByDate.keys()).map((key) => parseIsoDate(key)),
    [eventsByDate]
  )

  const defaultMonth = React.useMemo(() => {
    if (selectedDate) return selectedDate
    if (eventDates.length > 0) return eventDates[0]
    return new Date()
  }, [selectedDate, eventDates])

  return (
    <>
      {calendars.map((calendar, groupIndex) => {
        const items =
          events !== undefined
            ? buildEventMenuItems(events, selectedDate)
            : calendar.items

        return (
          <React.Fragment key={calendar.name}>
            <SidebarGroup key={calendar.name}>
              <Collapsible defaultOpen={groupIndex === 0} className="group/collapsible">
                <SidebarGroupLabel
                  asChild
                  className="group/label w-full text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                  <CollapsibleTrigger>
                    {calendar.name}{" "}
                    <ChevronRightIcon className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                  </CollapsibleTrigger>
                </SidebarGroupLabel>
                <CollapsibleContent>
                  <SidebarGroupContent className="flex flex-col gap-2">
                    {events !== undefined && (
                      <EventsByDateContext.Provider value={eventsByDate}>
                        <Calendar
                          mode="single"
                          locale={ru}
                          defaultMonth={defaultMonth}
                          selected={selectedDate}
                          onSelect={handleDateSelect}
                          modifiers={{
                            event: eventDates,
                          }}
                          components={sidebarCalendarComponents}
                          className="w-full max-w-full bg-transparent p-1 [--cell-radius:var(--radius-md)] [--cell-size:2rem]"
                        />
                      </EventsByDateContext.Provider>
                    )}
                    <SidebarMenu>
                      {items.map((item) => {
                        const label = typeof item === "string" ? item : item.label
                        const href = typeof item === "string" ? null : item.href
                        const key = href ?? label
                        const isActive = isEventLinkActive(location.pathname, href)

                        const marker = (
                          <div
                            data-active={isActive}
                            className="group/calendar-item flex aspect-square size-4 shrink-0 items-center justify-center rounded-sm border border-sidebar-border text-sidebar-primary-foreground data-[active=true]:border-sidebar-primary data-[active=true]:bg-sidebar-primary"
                            aria-hidden
                          >
                            <CheckIcon className="hidden size-3 group-data-[active=true]/calendar-item:block" />
                          </div>
                        )

                        return (
                          <SidebarMenuItem key={key}>
                            <SidebarMenuButton asChild={Boolean(href)} isActive={isActive}>
                              {href ? (
                                <Link to={href}>
                                  {marker}
                                  {label}
                                </Link>
                              ) : (
                                <>
                                  {marker}
                                  {label}
                                </>
                              )}
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </Collapsible>
            </SidebarGroup>
            <SidebarSeparator className="mx-0" />
          </React.Fragment>
        )
      })}
    </>
  )
}
