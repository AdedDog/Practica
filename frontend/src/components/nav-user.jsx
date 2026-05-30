import { useEffect, useMemo, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { ApiError, teamGetMe } from "@/lib/api"
import {
  clearAdminToken,
  clearToken,
  getAdminToken,
  getToken,
} from "@/lib/auth"
import {
  CalendarDaysIcon,
  ChevronsUpDownIcon,
  LayoutDashboardIcon,
  LogInIcon,
  LogOutIcon,
  ShieldIcon,
} from "lucide-react"

function getInitials(name) {
  if (!name) return "?"
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

function resolveMode(pathname, teamToken, adminToken) {
  if (pathname.startsWith("/admin") && adminToken) return "admin"
  if (pathname.startsWith("/cabinet") && teamToken) return "team"
  if (teamToken) return "team"
  if (adminToken) return "admin"
  return "guest"
}

export function NavUser() {
  const { isMobile } = useSidebar()
  const location = useLocation()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)

  const teamToken = getToken()
  const adminToken = getAdminToken()
  const mode = useMemo(
    () => resolveMode(location.pathname, teamToken, adminToken),
    [location.pathname, teamToken, adminToken]
  )

  useEffect(() => {
    if (mode !== "team") {
      setProfile(null)
      return
    }

    let cancelled = false

    teamGetMe()
      .then((me) => {
        if (!cancelled) setProfile(me)
      })
      .catch((err) => {
        if (cancelled) return
        if (err instanceof ApiError && err.status === 401) clearToken()
        setProfile(null)
      })

    return () => {
      cancelled = true
    }
  }, [mode, teamToken, location.pathname])

  const display =
    mode === "team" && profile
      ? {
          name: profile.team_name,
          subtitle: profile.captain_name,
          fallback: getInitials(profile.team_name),
        }
      : mode === "team"
        ? {
            name: "Команда",
            subtitle: "Загрузка…",
            fallback: "…",
          }
        : mode === "admin"
          ? {
              name: "Администратор",
              subtitle: "Организатор",
              fallback: "АД",
            }
          : {
              name: "IT-Куб",
              subtitle: "Мероприятия и регистрация",
              fallback: "IT",
            }

  function handleLogout() {
    if (mode === "team") {
      clearToken()
      navigate("/cabinet/login")
      return
    }
    if (mode === "admin") {
      clearAdminToken()
      navigate("/admin/login")
    }
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="rounded-[0.375rem] data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
              <Avatar className="h-8 w-8 rounded-[0.375rem]">
                <AvatarImage src="" alt={display.name} />
                <AvatarFallback className="rounded-[0.375rem]">{display.fallback}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{display.name}</span>
                <span className="truncate text-xs">{display.subtitle}</span>
              </div>
              <ChevronsUpDownIcon className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="start"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-[0.375rem]">
                  <AvatarImage src="" alt={display.name} />
                  <AvatarFallback className="rounded-[0.375rem]">{display.fallback}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{display.name}</span>
                  <span className="truncate text-xs">{display.subtitle}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            {mode === "guest" && (
              <DropdownMenuGroup>
                <DropdownMenuItem asChild>
                  <Link to="/cabinet/login">
                    <LogInIcon />
                    Личный кабинет
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/admin/login">
                    <ShieldIcon />
                    Админ-панель
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuGroup>
            )}

            {mode === "team" && (
              <DropdownMenuGroup>
                <DropdownMenuItem asChild>
                  <Link to="/cabinet">
                    <LayoutDashboardIcon />
                    Личный кабинет
                  </Link>
                </DropdownMenuItem>
                {profile?.event_slug && (
                  <DropdownMenuItem asChild>
                    <Link to={`/events/${profile.event_slug}`}>
                      <CalendarDaysIcon />
                      {profile.event_title || "Мероприятие"}
                    </Link>
                  </DropdownMenuItem>
                )}
              </DropdownMenuGroup>
            )}

            {mode === "admin" && (
              <DropdownMenuGroup>
                <DropdownMenuItem asChild>
                  <Link to="/admin">
                    <ShieldIcon />
                    Админ-панель
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuGroup>
            )}

            {mode !== "guest" && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOutIcon />
                  Выйти
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
