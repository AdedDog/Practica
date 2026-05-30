import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"

import {
  ApiError,
  getEvent,
  teamChangeCase,
  teamGetMe,
  teamUpdateMe,
} from "@/lib/api"
import { clearToken, getToken } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

/**
 * Кабинет команды: профиль, редактирование, смена кейса (нужен JWT).
 */
export function TeamCabinetPage() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [saved, setSaved] = useState(false)
  const [newCaseId, setNewCaseId] = useState("")

  useEffect(() => {
    if (!getToken()) {
      navigate("/cabinet/login", { replace: true })
      return
    }
    loadProfile()
  }, [navigate])

  async function loadProfile() {
    setLoading(true)
    setError("")
    try {
      const me = await teamGetMe()
      setProfile(me)
      const ev = await getEvent(me.event_slug)
      setCases(ev.cases.filter((c) => c.id !== me.case_id && !c.is_full))
      setNewCaseId("")
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearToken()
        navigate("/cabinet/login", { replace: true })
        return
      }
      setError(err instanceof ApiError ? err.message : "Ошибка загрузки")
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!profile) return
    setError("")
    setSaved(false)
    try {
      const updated = await teamUpdateMe({
        team_name: profile.team_name,
        captain_name: profile.captain_name,
        email: profile.email,
        phone: profile.phone,
      })
      setProfile(updated)
      setSaved(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось сохранить")
    }
  }

  async function handleChangeCase() {
    if (!newCaseId) return
    setError("")
    setSaved(false)
    try {
      const updated = await teamChangeCase(Number(newCaseId))
      setProfile(updated)
      const ev = await getEvent(updated.event_slug)
      setCases(ev.cases.filter((c) => c.id !== updated.case_id && !c.is_full))
      setNewCaseId("")
      setSaved(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось сменить кейс")
    }
  }

  function handleLogout() {
    clearToken()
    navigate("/cabinet/login")
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-6 md:p-10">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (error && !profile) {
    return (
      <div className="mx-auto max-w-2xl p-6 md:p-10">
        <p className="text-destructive">{error}</p>
        <Button variant="link" asChild className="mt-2 px-0">
          <Link to="/cabinet/login">Войти снова</Link>
        </Button>
      </div>
    )
  }

  if (!profile) return null

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6 md:p-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Личный кабинет</h1>
          <p className="mt-1 text-sm text-muted-foreground">{profile.team_name}</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleLogout}>
          Выйти
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {saved && (
        <p className="rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary">
          Изменения сохранены
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Мероприятие</CardTitle>
          <CardDescription>
            <Link
              to={`/events/${profile.event_slug}`}
              className="text-primary underline-offset-4 hover:underline"
            >
              {profile.event_title}
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm">
            Кейс: <strong>{profile.case_name}</strong>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Данные команды</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="team_name">Название команды</FieldLabel>
                <Input
                  id="team_name"
                  value={profile.team_name}
                  onChange={(e) =>
                    setProfile({ ...profile, team_name: e.target.value })
                  }
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="captain_name">ФИО капитана</FieldLabel>
                <Input
                  id="captain_name"
                  value={profile.captain_name}
                  onChange={(e) =>
                    setProfile({ ...profile, captain_name: e.target.value })
                  }
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="phone">Телефон</FieldLabel>
                <Input
                  id="phone"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  required
                />
              </Field>
              <Button type="submit">Сохранить</Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      {cases.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Сменить кейс</CardTitle>
            <CardDescription>Только если есть свободные места</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              {cases.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setNewCaseId(String(c.id))}
                  className={cn(
                    "rounded-2xl border p-3 text-left text-sm transition-colors",
                    newCaseId === String(c.id)
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-border hover:border-muted-foreground/30"
                  )}
                >
                  <span className="font-medium">{c.name}</span>
                  <span className="ml-2 text-muted-foreground">({c.free} своб.)</span>
                </button>
              ))}
            </div>
            <Button
              type="button"
              variant="secondary"
              disabled={!newCaseId}
              onClick={handleChangeCase}
            >
              Сменить кейс
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
