import { useState } from "react"
import { Link } from "react-router-dom"

import { ApiError, registerTeam } from "@/lib/api"
import { cn } from "@/lib/utils"
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

const STEPS = ["Кейс", "Команда", "Код"]

/**
 * Пошаговая регистрация: кейс → данные → invite-код → логин/пароль.
 */
export function TeamRegistrationForm({
  slug,
  cases,
  registrationOpen,
  status,
  initialCaseId,
  onSuccess,
  embedded = false,
}) {
  const [step, setStep] = useState(initialCaseId ? 1 : 0)
  const [caseId, setCaseId] = useState(
    () => initialCaseId ?? cases.find((c) => !c.is_full)?.id ?? ""
  )
  const [teamName, setTeamName] = useState("")
  const [captainName, setCaptainName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [inviteCode, setInviteCode] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(null)

  const canRegister = registrationOpen && status === "active"
  const availableCases = cases.filter((c) => !c.is_full)

  const selectedCase = cases.find((c) => c.id === caseId)

  if (!canRegister) {
    return (
      <Card className={cn("border-dashed", embedded && "border-0 shadow-none ring-0")}>
        <CardHeader>
          <CardTitle className="text-base">Регистрация закрыта</CardTitle>
          <CardDescription>На это мероприятие сейчас нельзя подать заявку.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (availableCases.length === 0) {
    return (
      <Card className={cn("border-dashed", embedded && "border-0 shadow-none ring-0")}>
        <CardHeader>
          <CardTitle className="text-base">Нет свободных мест</CardTitle>
          <CardDescription>Все кейсы заполнены.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (success) {
    return (
      <Card className={cn("border-primary/30 bg-primary/5", embedded && "border-0 shadow-none ring-0")}>
        <CardHeader>
          <CardTitle>Регистрация успешна</CardTitle>
          <CardDescription>{success.message}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 font-mono text-sm">
          <p>
            <span className="text-muted-foreground">Логин: </span>
            <strong>{success.login}</strong>
          </p>
          <p>
            <span className="text-muted-foreground">Пароль: </span>
            <strong>{success.password}</strong>
          </p>
          <p className="text-xs text-muted-foreground">
            Сохраните данные — пароль больше не показывается.
          </p>
          <Button asChild className="mt-2">
            <Link to="/cabinet/login">Войти в личный кабинет</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const steps = initialCaseId ? ["Команда", "Код"] : STEPS
  const activeStepIndex = initialCaseId ? step - 1 : step
  const minStep = initialCaseId ? 1 : 0
  const maxStep = 2

  async function handleSubmit(e) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const result = await registerTeam(slug, {
        case_id: Number(caseId),
        team_name: teamName,
        captain_name: captainName,
        email,
        phone,
        invite_code: inviteCode,
      })
      setSuccess(result)
      onSuccess?.(result)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ошибка регистрации")
    } finally {
      setLoading(false)
    }
  }

  function nextStep() {
    setError("")
    if (step === 0 && !caseId) {
      setError("Выберите кейс")
      return
    }
    if (step === 1) {
      if (!teamName.trim() || !captainName.trim() || !email.trim() || !phone.trim()) {
        setError("Заполните все поля")
        return
      }
    }
    setStep((s) => s + 1)
  }

  return (
    <Card className={cn(embedded && "border-0 shadow-none ring-0")}>
      <CardHeader>
        <CardTitle>Регистрация команды</CardTitle>
        <CardDescription>
          {initialCaseId && selectedCase
            ? `Кейс: ${selectedCase.name}`
            : "Пошаговая форма — данные уходят на backend"}
        </CardDescription>
        <div className="flex flex-wrap gap-2 pt-2">
          {steps.map((label, i) => (
            <span
              key={label}
              className={cn(
                "rounded-full px-3 py-0.5 text-xs font-medium",
                i === activeStepIndex
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {i + 1}. {label}
            </span>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <p className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit}>
          {step === 0 && (
            <FieldGroup className="gap-4">
              <p className="text-sm text-muted-foreground">Выберите направление (кейс):</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {cases.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    disabled={c.is_full}
                    onClick={() => setCaseId(c.id)}
                    className={cn(
                      "rounded-2xl border p-4 text-left transition-colors",
                      c.is_full && "cursor-not-allowed opacity-50",
                      caseId === c.id
                        ? "border-primary ring-2 ring-primary/20"
                        : "border-border hover:border-muted-foreground/30"
                    )}
                  >
                    <p className="font-medium">{c.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {c.is_full ? "Нет мест" : `Свободно: ${c.free}`}
                    </p>
                  </button>
                ))}
              </div>
            </FieldGroup>
          )}

          {step === 1 && (
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="team_name">Название команды</FieldLabel>
                <Input
                  id="team_name"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Например, Adedog-Team"
                  required
                  minLength={2}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="captain_name">ФИО капитана</FieldLabel>
                <Input
                  id="captain_name"
                  value={captainName}
                  onChange={(e) => setCaptainName(e.target.value)}
                  placeholder="Иванов Иван Иванович"
                  required
                  minLength={2}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="team@example.com"
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="phone">Телефон</FieldLabel>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+79280000000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </Field>
            </FieldGroup>
          )}

          {step === 2 && (
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="invite_code">Код приглашения</FieldLabel>
                <Input
                  id="invite_code"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="DEMO-INVITE"
                
                />
              </Field>
              <p className="text-xs text-muted-foreground">
                Демо-код для тестов: <code className="rounded bg-muted px-1">DEMO-INVITE</code>
                {" "}
                (одноразовый — после использования запросите новый у организаторов)
              </p>
            </FieldGroup>
          )}

          <div className="mt-6 flex gap-2">
            {step > minStep && (
              <Button type="button" variant="outline" onClick={() => setStep((s) => s - 1)}>
                Назад
              </Button>
            )}
            {step < maxStep ? (
              <Button type="button" onClick={nextStep}>
                Далее
              </Button>
            ) : (
              <Button type="submit" disabled={loading || !inviteCode.trim()}>
                {loading ? "Отправка…" : "Зарегистрировать"}
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
