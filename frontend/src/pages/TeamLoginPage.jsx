import { Link } from "react-router-dom"

import { TeamLoginForm } from "@/components/team-login-form"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

/** Вход в кабинет внутри Dashboard (форма в стиле shadcn login-01). */
export function TeamLoginPage() {
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      <header className="w-full shrink-0 border-b px-6 py-4 md:px-10 md:py-5">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/">Мероприятия</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Вход в кабинет</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm">
          <TeamLoginForm />
        </div>
      </div>
    </div>
  )
}
