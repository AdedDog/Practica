import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"

import { ApiError, teamLogin, teamResendOtp, teamVerifyOtp } from "@/lib/api"
import {
  clearOtpSubjectId,
  getOtpSubjectId,
  setOtpSubjectId,
  setToken,
} from "@/lib/auth"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp"

/**
 * Форма входа в кабинет команды (стиль shadcn login-01).
 * Шаг 1: логин + пароль → шаг 2: OTP.
 */
export function TeamLoginForm({ className, ...props }) {
  const navigate = useNavigate()
  const [phase, setPhase] = useState(() => (getOtpSubjectId() ? "otp" : "login"))
  const [login, setLogin] = useState("")
  const [password, setPassword] = useState("")
  const [otp, setOtp] = useState("")
  const [error, setError] = useState("")
  const [otpHint, setOtpHint] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await teamLogin(login.trim(), password)
      setOtpSubjectId(res.subject_id)
      setOtpHint(res.message || "")
      setPhase("otp")
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ошибка входа")
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify(e) {
    e.preventDefault()
    const subjectId = getOtpSubjectId()
    if (!subjectId) {
      setPhase("login")
      return
    }
    setError("")
    setLoading(true)
    try {
      const res = await teamVerifyOtp(subjectId, otp)
      setToken(res.access_token)
      clearOtpSubjectId()
      navigate("/cabinet", { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Неверный код")
    } finally {
      setLoading(false)
    }
  }

  async function handleResend(channel) {
    const subjectId = getOtpSubjectId()
    if (!subjectId) return
    setError("")
    try {
      const res = await teamResendOtp(subjectId, channel)
      if (res?.message) setOtpHint(res.message)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось отправить код")
    }
  }

  if (phase === "otp") {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card>
          <CardHeader>
            <CardTitle>Код подтверждения</CardTitle>
            <CardDescription>
              {otpHint || "Шаг 2 из 2. Введите код из письма или консоли backend."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <p className="mb-4 text-sm text-destructive">{error}</p>
            )}
            <form onSubmit={handleVerify}>
              <FieldGroup>
                <Field className="items-center">
                  <div className="flex justify-center py-2">
                    <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                      <InputOTPGroup>
                        {[0, 1, 2, 3, 4, 5].map((i) => (
                          <InputOTPSlot key={i} index={i} />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                </Field>
                <Field>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loading || otp.length < 4}
                  >
                    {loading ? "Проверка…" : "Войти в кабинет"}
                  </Button>
                  <div className="mt-3 flex flex-wrap justify-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleResend("email")}
                    >
                      Код на email
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleResend("sms")}
                    >
                      Код по SMS
                    </Button>
                  </div>
                  <FieldDescription className="text-center">
                    <button
                      type="button"
                      className="underline-offset-4 hover:underline"
                      onClick={() => {
                        clearOtpSubjectId()
                        setPhase("login")
                        setOtp("")
                        setError("")
                      }}
                    >
                      Назад к логину
                    </button>
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Вход в личный кабинет</CardTitle>
          <CardDescription>
            Логин и пароль вы получили при регистрации команды. Шаг 1 из 2.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
          <form onSubmit={handleLogin}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="login">Логин</FieldLabel>
                <Input
                  id="login"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  placeholder="team-a1b2c3d4"
                  required
                  autoComplete="username"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Пароль</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </Field>
              <Field>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Проверка…" : "Продолжить"}
                </Button>
                <FieldDescription className="text-center">
                  Нет учётных данных?{" "}
                  <Link to="/" className="underline-offset-4 hover:underline">
                    Перейти к мероприятиям и зарегистрировать команду
                  </Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
