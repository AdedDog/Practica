import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"

import {
  ApiError,
  adminAddCase,
  adminCreateEvent,
  adminCreateInvites,
  adminDeleteEvent,
  adminDeleteInvite,
  adminExportCsv,
  adminListEvents,
  adminListInvites,
  adminListTeams,
  adminUpdateEvent,
} from "@/lib/api"
import { Check, Copy, Trash2 } from "lucide-react"
import { clearAdminToken, getAdminToken } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { DateRangePicker } from "@/components/date-range-picker"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn, formatEventDateRange, slugFromTitle } from "@/lib/utils"

/**
 * Админ-панель: мероприятия, статистика, команды, коды, CSV.
 */
export function AdminPage() {
  const navigate = useNavigate()
  const [events, setEvents] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [teams, setTeams] = useState([])
  const [invites, setInvites] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [createdCodes, setCreatedCodes] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [slugManual, setSlugManual] = useState(false)

  const [newEvent, setNewEvent] = useState({
    title: "",
    slug: "",
    description: "",
    start_date: "",
    end_date: "",
    caseName: "",
    caseLimit: 5,
  })
  const [eventDates, setEventDates] = useState({ start_date: "", end_date: "" })
  const [newCase, setNewCase] = useState({ name: "", description: "", team_limit: 5 })
  const [inviteCount, setInviteCount] = useState(3)
  const [deletingInviteId, setDeletingInviteId] = useState(null)
  const [copiedInviteId, setCopiedInviteId] = useState(null)
  const [deleteEventOpen, setDeleteEventOpen] = useState(false)
  const [deletingEvent, setDeletingEvent] = useState(false)

  const selected = events.find((e) => e.id === selectedId)

  useEffect(() => {
    if (!getAdminToken()) {
      navigate("/admin/login", { replace: true })
      return
    }
    loadEvents()
  }, [navigate])

  useEffect(() => {
    if (!selectedId) return
    loadEventDetails(selectedId)
  }, [selectedId])

  useEffect(() => {
    if (!selected) {
      setEventDates({ start_date: "", end_date: "" })
      return
    }
    setEventDates({
      start_date: selected.start_date ?? "",
      end_date: selected.end_date ?? "",
    })
  }, [selected])

  async function loadEvents() {
    setLoading(true)
    setError("")
    try {
      const list = await adminListEvents()
      setEvents(list)
      if (list.length && !selectedId) setSelectedId(list[0].id)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearAdminToken()
        navigate("/admin/login", { replace: true })
        return
      }
      setError(err instanceof ApiError ? err.message : "Ошибка")
    } finally {
      setLoading(false)
    }
  }

  async function loadEventDetails(eventId) {
    try {
      const [t, i] = await Promise.all([
        adminListTeams(eventId),
        adminListInvites(eventId),
      ])
      setTeams(t)
      setInvites(i)
    } catch {
      setTeams([])
      setInvites([])
    }
  }

  async function handleCreateEvent(e) {
    e.preventDefault()
    setError("")
    try {
      await adminCreateEvent({
        title: newEvent.title,
        slug: newEvent.slug,
        description: newEvent.description,
        start_date: newEvent.start_date || null,
        end_date: newEvent.end_date || null,
        status: "active",
        registration_open: true,
        cases: newEvent.caseName
          ? [{ name: newEvent.caseName, description: "", team_limit: newEvent.caseLimit }]
          : [],
      })
      setShowCreate(false)
      setSlugManual(false)
      setNewEvent({
        title: "",
        slug: "",
        description: "",
        start_date: "",
        end_date: "",
        caseName: "",
        caseLimit: 5,
      })
      await loadEvents()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ошибка")
    }
  }

  async function handleActivate() {
    if (!selected) return
    await adminUpdateEvent(selected.id, { status: "active", registration_open: true })
    await loadEvents()
  }

  async function handleClose() {
    if (!selected) return
    await adminUpdateEvent(selected.id, { status: "closed", registration_open: false })
    await loadEvents()
  }

  async function handleSaveEventDates(e) {
    e.preventDefault()
    if (!selected) return
    setError("")
    try {
      await adminUpdateEvent(selected.id, {
        start_date: eventDates.start_date || null,
        end_date: eventDates.end_date || null,
      })
      await loadEvents()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ошибка сохранения дат")
    }
  }

  async function handleAddCase(e) {
    e.preventDefault()
    if (!selected) return
    try {
      await adminAddCase(selected.id, newCase)
      setNewCase({ name: "", description: "", team_limit: 5 })
      await loadEvents()
      if (selectedId) await loadEventDetails(selectedId)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ошибка")
    }
  }

  async function handleCreateInvites() {
    if (!selected) return
    try {
      const res = await adminCreateInvites(selected.id, { count: inviteCount })
      setCreatedCodes(res.codes)
      await loadEventDetails(selected.id)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ошибка")
    }
  }

  async function handleCopyInviteCode(invite) {
    if (!invite.code) return
    try {
      await navigator.clipboard.writeText(invite.code)
      setCopiedInviteId(invite.id)
      window.setTimeout(() => setCopiedInviteId(null), 2000)
    } catch {
      setError("Не удалось скопировать код в буфер обмена")
    }
  }

  async function handleDeleteEvent() {
    if (!selected) return
    setDeletingEvent(true)
    setError("")
    try {
      await adminDeleteEvent(selected.id)
      const deletedId = selected.id
      setDeleteEventOpen(false)
      setTeams([])
      setInvites([])
      setCreatedCodes(null)
      const list = await adminListEvents()
      setEvents(list)
      if (list.length) {
        setSelectedId(list.find((e) => e.id !== deletedId)?.id ?? list[0].id)
      } else {
        setSelectedId(null)
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось удалить мероприятие")
    } finally {
      setDeletingEvent(false)
    }
  }

  async function handleDeleteInvite(invite) {
    if (!selected) return
    const label = invite.code || `#${invite.id}`
    if (!window.confirm(`Удалить код приглашения «${label}»?`)) return

    setDeletingInviteId(invite.id)
    setError("")
    try {
      await adminDeleteInvite(selected.id, invite.id)
      setInvites((list) => list.filter((c) => c.id !== invite.id))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось удалить код")
    } finally {
      setDeletingInviteId(null)
    }
  }

  function handleLogout() {
    clearAdminToken()
    navigate("/admin/login")
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Админ-панель</h1>
          <p className="text-sm text-muted-foreground">Управление мероприятиями и регистрациями</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (showCreate) setSlugManual(false)
              setShowCreate(!showCreate)
            }}
          >
            {showCreate ? "Отмена" : "Новое мероприятие"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            Выйти
          </Button>
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      {showCreate && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Создать мероприятие</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateEvent}>
              <FieldGroup className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel>Название</FieldLabel>
                  <Input
                    value={newEvent.title}
                    onChange={(e) => {
                      const title = e.target.value
                      setNewEvent((prev) => ({
                        ...prev,
                        title,
                        slug: slugManual ? prev.slug : slugFromTitle(title),
                      }))
                    }}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel>Slug URL</FieldLabel>
                  <Input
                    value={newEvent.slug}
                    onChange={(e) => {
                      setSlugManual(true)
                      setNewEvent({ ...newEvent, slug: e.target.value })
                    }}
                    placeholder="hackathon-2026"
                    required
                  />
                  <p className="text-muted-foreground mt-1 text-xs">
                    /events/{newEvent.slug || "…"}
                  </p>
                </Field>
                <Field className="sm:col-span-2">
                  <FieldLabel>Описание</FieldLabel>
                  <Input
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  />
                </Field>
                <DateRangePicker
                  id="new-event-dates"
                  className="sm:col-span-2"
                  label="Период мероприятия"
                  startDate={newEvent.start_date}
                  endDate={newEvent.end_date}
                  onChange={({ start_date, end_date }) =>
                    setNewEvent({ ...newEvent, start_date, end_date })
                  }
                />
                <Field>
                  <FieldLabel>Первый кейс</FieldLabel>
                  <Input
                    value={newEvent.caseName}
                    onChange={(e) => setNewEvent({ ...newEvent, caseName: e.target.value })}
                  />
                </Field>
                <Field>
                  <FieldLabel>Лимит команд</FieldLabel>
                  <Input
                    type="number"
                    min={1}
                    value={newEvent.caseLimit}
                    onChange={(e) =>
                      setNewEvent({ ...newEvent, caseLimit: Number(e.target.value) })
                    }
                  />
                </Field>
              </FieldGroup>
              <Button type="submit" className="mt-4">
                Создать
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Мероприятия</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 p-2">
            {events.map((ev) => (
              <button
                key={ev.id}
                type="button"
                onClick={() => setSelectedId(ev.id)}
                className={cn(
                  "w-full rounded-xl px-3 py-2 text-left text-sm transition-colors",
                  selectedId === ev.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                )}
              >
                <span className="font-medium">{ev.title}</span>
                <span className="mt-0.5 block text-xs opacity-80">
                  {formatEventDateRange(ev.start_date, ev.end_date) ?? ev.status}
                </span>
              </button>
            ))}
          </CardContent>
        </Card>

        {selected ? (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{selected.title}</CardTitle>
                <CardDescription>{selected.slug}</CardDescription>
                <CardAction>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setDeleteEventOpen(true)}
                  >
                    Удалить мероприятие
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent className="space-y-3">
                <form onSubmit={handleSaveEventDates} className="flex flex-wrap items-end gap-3">
                  <DateRangePicker
                    id="edit-event-dates"
                    className="min-w-[280px] flex-1"
                    label="Период мероприятия"
                    startDate={eventDates.start_date}
                    endDate={eventDates.end_date}
                    onChange={setEventDates}
                  />
                  <Button type="submit" size="sm" variant="secondary">
                    Сохранить даты
                  </Button>
                </form>
                {selected.status !== "active" && (
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    Статус «{selected.status}» — на главной странице мероприятие не
                    показывается. Нажмите «Активировать».
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={handleActivate}>
                  Активировать
                </Button>
                <Button size="sm" variant="outline" onClick={handleClose}>
                  Завершить
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => adminExportCsv(selected.id, `${selected.slug}.csv`)}
                >
                  Экспорт CSV
                </Button>
                <Button size="sm" variant="ghost" asChild>
                  <Link to={`/events/${selected.slug}`} target="_blank">
                    Открыть на сайте
                  </Link>
                </Button>
                </div>
              </CardContent>
            </Card>

            <Dialog open={deleteEventOpen} onOpenChange={setDeleteEventOpen}>
              <DialogContent showCloseButton={!deletingEvent}>
                <DialogHeader>
                  <DialogTitle>Удалить мероприятие?</DialogTitle>
                  <DialogDescription>
                    Мероприятие «{selected.title}» и все связанные данные будут удалены
                    безвозвратно: кейсы ({selected.cases.length}), команды ({teams.length}),
                    коды приглашения ({invites.length}).
                  </DialogDescription>
                </DialogHeader>
                <div className="flex justify-end gap-2 p-6 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={deletingEvent}
                    onClick={() => setDeleteEventOpen(false)}
                  >
                    Отмена
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={deletingEvent}
                    onClick={handleDeleteEvent}
                  >
                    {deletingEvent ? "Удаление…" : "Удалить"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Статистика по кейсам</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 pr-4">Кейс</th>
                      <th className="pb-2 pr-4">Лимит</th>
                      <th className="pb-2 pr-4">Занято</th>
                      <th className="pb-2">Свободно</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.cases.map((c) => (
                      <tr key={c.id} className="border-b border-border/50">
                        <td className="py-2 pr-4">{c.name}</td>
                        <td className="py-2 pr-4">{c.team_limit}</td>
                        <td className="py-2 pr-4">{c.occupied}</td>
                        <td className="py-2">{c.free}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Добавить кейс</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddCase} className="flex flex-wrap items-end gap-3">
                  <Field>
                    <FieldLabel>Название</FieldLabel>
                    <Input
                      value={newCase.name}
                      onChange={(e) => setNewCase({ ...newCase, name: e.target.value })}
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Лимит</FieldLabel>
                    <Input
                      type="number"
                      min={1}
                      className="w-24"
                      value={newCase.team_limit}
                      onChange={(e) =>
                        setNewCase({ ...newCase, team_limit: Number(e.target.value) })
                      }
                    />
                  </Field>
                  <Button type="submit" size="sm">
                    Добавить
                  </Button>
                </form>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Команды ({teams.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {teams.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Пока нет регистраций</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-2 pr-3">Команда</th>
                        <th className="pb-2 pr-3">Капитан</th>
                        <th className="pb-2 pr-3">Кейс</th>
                        <th className="pb-2">Логин</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teams.map((t) => (
                        <tr key={t.id} className="border-b border-border/50">
                          <td className="py-2 pr-3">{t.team_name}</td>
                          <td className="py-2 pr-3">{t.captain_name}</td>
                          <td className="py-2 pr-3">{t.case_name}</td>
                          <td className="py-2 font-mono text-xs">{t.login}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Коды приглашения</CardTitle>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    className="w-16 h-8"
                    value={inviteCount}
                    onChange={(e) => setInviteCount(Number(e.target.value))}
                  />
                  <Button size="sm" onClick={handleCreateInvites}>
                    Сгенерировать
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {createdCodes && (
                  <p className="mb-3 rounded-lg bg-primary/10 p-3 font-mono text-sm">
                    Новые коды: {createdCodes.join(", ")}
                  </p>
                )}
                <ul className="space-y-1 text-sm">
                  {invites.map((c) => (
                    <li
                      key={c.id}
                      className="flex items-center justify-between gap-2 border-b py-1"
                    >
                      <span className="flex min-w-0 items-center gap-0.5">
                        <span className="font-mono font-medium">
                          {c.code || "—"}
                        </span>
                        {c.code ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            className="text-muted-foreground hover:text-foreground"
                            aria-label={
                              copiedInviteId === c.id
                                ? "Код скопирован"
                                : `Скопировать код ${c.code}`
                            }
                            onClick={() => handleCopyInviteCode(c)}
                          >
                            {copiedInviteId === c.id ? <Check /> : <Copy />}
                          </Button>
                        ) : null}
                        {c.label ? (
                          <span className="ml-1 text-muted-foreground">({c.label})</span>
                        ) : null}
                      </span>
                      <div className="flex shrink-0 items-center gap-1">
                        <span
                          className={cn(
                            "text-xs",
                            c.used ? "text-destructive" : "text-muted-foreground"
                          )}
                        >
                          {c.used
                            ? c.team_name
                              ? `использован: «${c.team_name}»`
                              : "использован"
                            : "свободен"}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          className="text-muted-foreground hover:text-destructive"
                          disabled={deletingInviteId === c.id}
                          aria-label={`Удалить код ${c.code || c.id}`}
                          onClick={() => handleDeleteInvite(c)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

           
          </div>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Выберите или создайте мероприятие
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
