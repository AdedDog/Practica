import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"

import { TeamRegistrationForm } from "@/components/TeamRegistrationForm"
import { ApiError, getEvent } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

/**
 * Страница мероприятия: кейсы + регистрация команды в модальном окне.
 */
export function EventDetailPage() {
  const { slug } = useParams()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [registrationCaseId, setRegistrationCaseId] = useState(null)

  const canRegister = event?.registration_open && event?.status === "active"

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    getEvent(slug)
      .then(setEvent)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Ошибка"))
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 p-6 md:p-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="mx-auto max-w-5xl p-6 md:p-8">
        <p className="text-destructive">{error || "Не найдено"}</p>
        <Button variant="link" asChild className="mt-2 px-0">
          <Link to="/">← К списку</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 p-6 md:p-8 lg:p-10">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
          <Link to="/">← Все мероприятия</Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{event.title}</h1>
        <p className="mt-2 text-muted-foreground">{event.description}</p>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Кейсы</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {event.cases.map((c) => (
            <div
              key={c.id}
              className="relative flex flex-col rounded-2xl border bg-card p-5 shadow-sm"
            >
              <span
                className={cn(
                  "absolute right-5 top-5 rounded-md px-2 py-0.5 text-xs font-medium tabular-nums",
                  c.is_full ? "bg-red-50 text-red-600" : "bg-muted text-muted-foreground"
                )}
              >
                {c.is_full ? "Заполнено" : `Свободно: ${c.free}`}
              </span>
              <h3 className="pr-24 font-semibold">{c.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{c.description || "—"}</p>
              <p className="mt-3 text-sm">
                Мест: {c.occupied} / {c.team_limit}
              </p>
              <div className="mt-auto flex justify-end pt-4">
                <Button
                  size="sm"
                  disabled={!canRegister || c.is_full}
                  onClick={() => setRegistrationCaseId(c.id)}
                >
                  Выбрать
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Dialog
        open={registrationCaseId !== null}
        onOpenChange={(open) => {
          if (!open) setRegistrationCaseId(null)
        }}
      >
        <DialogContent className="max-w-2xl">
          {registrationCaseId && (
            <TeamRegistrationForm
              key={registrationCaseId}
              slug={slug}
              cases={event.cases}
              registrationOpen={event.registration_open}
              status={event.status}
              initialCaseId={registrationCaseId}
              embedded
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
