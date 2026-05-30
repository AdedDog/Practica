/**
 * Токены и OTP между шагами входа.
 * Команда и админ — разные ключи, чтобы не путать при тестах.
 */

const TEAM_TOKEN_KEY = "itkub_token";
const ADMIN_TOKEN_KEY = "itkub_admin_token";
const TEAM_OTP_SUBJECT_KEY = "itkub_otp_subject_id";
const ADMIN_OTP_SUBJECT_KEY = "itkub_admin_otp_subject_id";

// --- Команда ---
export function getToken() {
  return localStorage.getItem(TEAM_TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TEAM_TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TEAM_TOKEN_KEY);
}

export function setOtpSubjectId(id) {
  sessionStorage.setItem(TEAM_OTP_SUBJECT_KEY, String(id));
}

export function getOtpSubjectId() {
  const v = sessionStorage.getItem(TEAM_OTP_SUBJECT_KEY);
  return v ? Number(v) : null;
}

export function clearOtpSubjectId() {
  sessionStorage.removeItem(TEAM_OTP_SUBJECT_KEY);
}

// --- Админ ---
export function getAdminToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token) {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function clearAdminToken() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

export function setAdminOtpSubjectId(id) {
  sessionStorage.setItem(ADMIN_OTP_SUBJECT_KEY, String(id));
}

export function getAdminOtpSubjectId() {
  const v = sessionStorage.getItem(ADMIN_OTP_SUBJECT_KEY);
  return v ? Number(v) : null;
}

export function clearAdminOtpSubjectId() {
  sessionStorage.removeItem(ADMIN_OTP_SUBJECT_KEY);
}
