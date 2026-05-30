import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"

import { ApiError, adminLogin, adminVerifyOtp } from "@/lib/api"
import {
  clearAdminOtpSubjectId,
  getAdminOtpSubjectId,
  setAdminOtpSubjectId,
  setAdminToken,
} from "@/lib/auth"
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
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp"

/** Вход администратора: email + пароль → OTP → JWT (отдельный токен). */
export function AdminLoginPage() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState(() => (getAdminOtpSubjectId() ? "otp" : "login"))
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("admin123")
  const [otp, setOtp] = useState("")
  const [error, setError] = useState("")
  const [otpHint, setOtpHint] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await adminLogin(email.trim().toLowerCase(), password)
      setAdminOtpSubjectId(res.subject_id)
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
    const subjectId = getAdminOtpSubjectId()
    if (!subjectId) {
      setPhase("login")
      return
    }
    setError("")
    setLoading(true)
    try {
      const res = await adminVerifyOtp(subjectId, otp)
      setAdminToken(res.access_token)
      clearAdminOtpSubjectId()
      navigate("/admin", { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Неверный код")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 p-6 md:p-10">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2">
          <Link to="/">← На главную</Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Админ-панель</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Email и пароль из ADMIN_EMAIL / ADMIN_PASSWORD в backend/.env
        </p>
      </div>

      {phase === "login" ? (
        <Card>
          <CardHeader>
            <CardTitle>Вход организатора</CardTitle>
            <CardDescription>Шаг 1 из 2</CardDescription>
          </CardHeader>
          <CardContent>
            {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
            <form onSubmit={handleLogin}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
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
                  />
                </Field>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Проверка…" : "Продолжить"}
                </Button>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Код подтверждения</CardTitle>
            <CardDescription>
              {otpHint || "Введите код из письма или консоли backend."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
            <form onSubmit={handleVerify} className="space-y-6">
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <InputOTPSlot key={i} index={i} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button type="submit" className="w-full" disabled={loading || otp.length < 4}>
                {loading ? "Проверка…" : "Войти"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  clearAdminOtpSubjectId()
                  setPhase("login")
                }}
              >
                Назад
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
