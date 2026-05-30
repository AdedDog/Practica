import { useState } from "react"

import { cn } from "@/lib/utils"

const EVENTS = [
  {
    id: "sportmaster",
    partner: "Спортмастер PRO",
    title: "Персонализированные рекомендации товаров",
    description:
      "Разработать ML-модель рекомендаций на основе истории покупок и поведения пользователя в приложении и на сайте.",
    filled: 0,
    total: 8,
    theme: "purple",
  },
  {
    id: "wildberries",
    partner: "Wildberries",
    title: "Оптимизация логистики последней мили",
    description:
      "Построить алгоритм маршрутизации курьеров с учётом трафика, плотности заказов и SLA доставки.",
    filled: 0,
    total: 8,
    theme: "sky",
  },
  {
    id: "tbank",
    partner: "Т-Банк",
    title: "Антифрод в реальном времени",
    description:
      "Создать пайплайн детекции подозрительных транзакций с латентностью менее 200 мс и explainable-отчётом.",
    filled: 0,
    total: 8,
    theme: "orange",
  },
  {
    id: "mts",
    partner: "МТС — Edge AI",
    title: "Компьютерное зрение на edge-устройствах",
    description:
      "Оптимизировать CV-модель для работы на IoT-камерах с ограниченными ресурсами и офлайн-режимом.",
    filled: 0,
    total: 8,
    theme: "emerald",
  },
]

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

function CapacityBadge({ filled, total }) {
  const isFull = filled >= total
  return (
    <span
      className={cn(
        "rounded-md px-2 py-0.5 text-xs font-medium tabular-nums",
        isFull
          ? "bg-red-50 text-red-600"
          : "bg-muted text-muted-foreground"
      )}
    >
      {filled}/{total}
    </span>
  )
}

function EventCard({ event, selected, onSelect }) {
  const styles = themeStyles[event.theme]

  return (
    <button
      type="button"
      onClick={() => onSelect(event.id)}
      className={cn(
        "flex w-full flex-col gap-3 rounded-2xl border bg-card p-5 text-left shadow-sm transition-all hover:shadow-md",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        selected
          ? cn("border-2 ring-2", styles.borderSelected)
          : "border-border hover:border-muted-foreground/25"
      )}
    >
      <div className="flex items-start justify-between gap-3">
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
            {selected && (
              <span className="size-2 rounded-full bg-white" />
            )}
          </span>
          <span className={cn("text-sm font-semibold", styles.partner)}>
            {event.partner}
          </span>
        </div>
        <CapacityBadge filled={event.filled} total={event.total} />
      </div>

      <div className="space-y-2 pl-8">
        <h3 className="text-base font-semibold leading-snug text-foreground">
          {event.title}
        </h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {event.description}
        </p>
      </div>
    </button>
  )
}

export function EventSelection() {
  const [selectedId, setSelectedId] = useState("sportmaster")

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6 md:p-8 lg:p-10">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          Выбор события
        </h1>
        <p className="text-sm text-muted-foreground md:text-base">
          Выберите задачу от партнёра хакатона
        </p>
      </header>

    

      <div className="grid gap-4 sm:grid-cols-2">
        {EVENTS.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            selected={selectedId === event.id}
            onSelect={setSelectedId}
          />
        ))}
      </div>
    </div>
  )
}
