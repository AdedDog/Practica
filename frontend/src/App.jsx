import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"

import { DashboardLayout } from "@/components/DashboardLayout"
import { EventSelection } from "@/components/event-selection"
import { EventDetailPage } from "@/pages/EventDetailPage"
import { AdminLoginPage } from "@/pages/AdminLoginPage"
import { AdminPage } from "@/pages/AdminPage"
import { TeamCabinetPage } from "@/pages/TeamCabinetPage"
import { TeamLoginPage } from "@/pages/TeamLoginPage"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<DashboardLayout />}>
          <Route index element={<EventSelection />} />
          <Route path="events/:slug" element={<EventDetailPage />} />
          <Route path="cabinet/login" element={<TeamLoginPage />} />
          <Route path="cabinet" element={<TeamCabinetPage />} />
          <Route path="admin/login" element={<AdminLoginPage />} />
          <Route path="admin" element={<AdminPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
