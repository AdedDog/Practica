import { useCallback, useEffect, useState } from "react"
import { Link, useLocation } from "react-router-dom"

import { ApiError, getEvents } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"

const THEMES = ["purple", "sky", "orange", "emerald"]

const themeStyles = {
  purple: {
    partner: "text-violet-600",
    borderSelected: "border-violet-500 ring-violet-500/20",
    radio: "border-violet-500 bg-violet-500",
  },
  sky: {
    partner: "text-sky-600",
    borderSelected: "border-sky-400 ring-sky-400/20",
    radio: "border-sky-500 bg-sky-500",
  },
  orange: {
    partner: "text-orange-600",
    borderSelected: "border-orange-400 ring-orange-400/20",
    radio: "border-orange-500 bg-orange-500",
  },
  emerald: {
    partner: "text-emerald-600",
    borderSelected: "border-emerald-500 ring-emerald-500/20",
    radio: "border-emerald-500 bg-emerald-500",
  },
}

function CapacityBadge({ freeSpots, open, className }) {
  return (
    <span
      className={cn(
        "rounded-md px-2 py-0.5 text-xs font-medium tabular-nums",
        !open
          ? "bg-red-50 text-red-600"
          : freeSpots === 0
            ? "bg-red-50 text-red-600"
            : "bg-muted text-muted-foreground",
        className
      )}
    >
      {!open ? "Закрыта" : freeSpots === 0 ? "Нет мест" : `Свободно: ${freeSpots}`}
    </span>
  )
}

function EventCard({ event, selected, onSelect }) {
  const styles = themeStyles[event.theme]

  return (
    <div
      className={cn(
        "relative flex w-full flex-col gap-3 rounded-2xl border bg-card p-5 text-left shadow-sm transition-all hover:shadow-md",
        selected
          ? cn("border-2 ring-2", styles.borderSelected)
          : "border-border hover:border-muted-foreground/25"
      )}
    >
      <CapacityBadge
        freeSpots={event.free_spots}
        open={event.registration_open}
        className="absolute right-5 top-5"
      />
      <button
        type="button"
        onClick={() => onSelect(event.slug)}
        className={cn(
          "flex w-full flex-col gap-3 pr-24 text-left",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        )}
      >
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2",
              selected
                ? cn(styles.radio, "border-transparent")
                : "border-muted-foreground/35 bg-background"
            )}
            aria-hidden
          >
            {selected && <span className="size-2 rounded-full bg-white" />}
          </span>
          <span className={cn("text-sm font-semibold", styles.partner)}>
            IT-Куб
          </span>
        </div>

        <div className="space-y-2 pl-8">
          <h3 className="text-base font-semibold leading-snug text-foreground">
            {event.title}
          </h3>
          <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
            {event.description}
          </p>
        </div>
      </button>

      <div className="flex justify-end pl-8">
        <Button asChild>
          <Link to={`/events/${event.slug}`}>Подробнее о мероприятии</Link>
        </Button>
      </div>
    </div>
  )
}

/**
 * Список мероприятий из backend GET /api/events.
 * Данные подставляются в карточки Dashboard вместо захардкоженного массива.
 */
export function EventSelection() {
  const location = useLocation()
  const [events, setEvents] = useState([])
  const [selectedSlug, setSelectedSlug] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const loadEvents = useCallback(() => {
    setLoading(true)
    setError("")
    getEvents()
      .then((list) => {
        const withThemes = list.map((ev, i) => ({
          ...ev,
          theme: THEMES[i % THEMES.length],
        }))
        setEvents(withThemes)
        setSelectedSlug((prev) =>
          prev && withThemes.some((e) => e.slug === prev) ? prev : withThemes[0]?.slug ?? null
        )
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Ошибка загрузки"))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadEvents()
  }, [loadEvents, location.key])

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6 md:p-8 lg:p-10">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-44" />
          <Skeleton className="h-44" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-5xl p-6 md:p-8">
        <p className="text-destructive">{error}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Запустите backend: <code className="rounded bg-muted px-1">uvicorn app.main:app --reload</code>
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6 md:p-8 lg:p-10">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          Мероприятия
        </h1>
        <p className="text-sm text-muted-foreground md:text-base">
          Актуальные события IT-Куб — данные с сервера
        </p>
      </header>

      {events.length === 0 ? (
        <p className="text-muted-foreground">Сейчас нет активных мероприятий.</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                selected={selectedSlug === event.slug}
                onSelect={setSelectedSlug}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
