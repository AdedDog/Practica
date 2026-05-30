/**
 * Запросы к backend. Путь /api проксируется Vite → http://127.0.0.1:8000
 */

import { getAdminToken, getToken } from "./auth";

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/**
 * @param {string} path
 * @param {RequestInit & { auth?: false | 'team' | 'admin' }} options
 */
export async function apiFetch(path, options = {}) {
  const { auth = false, headers: customHeaders, ...rest } = options;

  const headers = {
    "Content-Type": "application/json",
    ...customHeaders,
  };

  if (auth === "team") {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  if (auth === "admin") {
    const token = getAdminToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`/api${path}`, { ...rest, headers });
  const data = res.status === 204 ? null : await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      (typeof data?.detail === "string" && data.detail) ||
      "Ошибка запроса";
    throw new ApiError(message, res.status);
  }

  return data;
}

// --- Публичное API ---
export function getEvents() {
  return apiFetch("/events");
}

export function getEvent(slug) {
  return apiFetch(`/events/${slug}`);
}

export function registerTeam(slug, body) {
  return apiFetch(`/events/${slug}/register`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// --- Кабинет команды ---
export function teamLogin(login, password) {
  return apiFetch("/team/login", {
    method: "POST",
    body: JSON.stringify({ login, password }),
  });
}

export function teamVerifyOtp(subjectId, code) {
  return apiFetch(`/team/verify-otp?subject_id=${subjectId}`, {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

export function teamResendOtp(subjectId, channel = "email") {
  return apiFetch(`/team/resend-otp?subject_id=${subjectId}`, {
    method: "POST",
    body: JSON.stringify({ channel }),
  });
}

export function teamGetMe() {
  return apiFetch("/team/me", { auth: "team" });
}

export function teamUpdateMe(body) {
  return apiFetch("/team/me", {
    method: "PATCH",
    auth: "team",
    body: JSON.stringify(body),
  });
}

export function teamChangeCase(caseId) {
  return apiFetch("/team/me/case", {
    method: "PATCH",
    auth: "team",
    body: JSON.stringify({ case_id: caseId }),
  });
}

// --- Админ-панель ---
export function adminLogin(email, password) {
  return apiFetch("/admin/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function adminVerifyOtp(subjectId, code) {
  return apiFetch(`/admin/verify-otp?subject_id=${subjectId}`, {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

export function adminListEvents() {
  return apiFetch("/admin/events", { auth: "admin" });
}

export function adminCreateEvent(body) {
  return apiFetch("/admin/events", {
    method: "POST",
    auth: "admin",
    body: JSON.stringify(body),
  });
}

export function adminUpdateEvent(eventId, body) {
  return apiFetch(`/admin/events/${eventId}`, {
    method: "PATCH",
    auth: "admin",
    body: JSON.stringify(body),
  });
}

export function adminAddCase(eventId, body) {
  return apiFetch(`/admin/events/${eventId}/cases`, {
    method: "POST",
    auth: "admin",
    body: JSON.stringify(body),
  });
}

export function adminListTeams(eventId) {
  return apiFetch(`/admin/events/${eventId}/teams`, { auth: "admin" });
}

export function adminListInvites(eventId) {
  return apiFetch(`/admin/events/${eventId}/invite-codes`, { auth: "admin" });
}

export function adminCreateInvites(eventId, body) {
  return apiFetch(`/admin/events/${eventId}/invite-codes`, {
    method: "POST",
    auth: "admin",
    body: JSON.stringify(body),
  });
}

/** Скачивание CSV — отдельный fetch, не JSON */
export async function adminExportCsv(eventId, filename) {
  const token = getAdminToken();
  const res = await fetch(`/api/admin/events/${eventId}/export`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new ApiError(data?.detail || "Ошибка экспорта", res.status);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "export.csv";
  a.click();
  URL.revokeObjectURL(url);
}
