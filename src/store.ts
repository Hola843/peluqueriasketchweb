// ─── Store de citas con localStorage ────────────────────────────────────────

import type { Appointment } from "./types";

const STORAGE_KEY = "velure_appointments";
const ADMIN_KEY = "velure_admin";

// ─── Appointments ──────────────────────────────────────────────────────────

export function getAppointments(): Appointment[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveAppointment(a: Appointment): boolean {
  const all = getAppointments();
  all.push(a);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    return true;
  } catch {
    // Safari en modo privado / storage saturado: no persiste entre sesiones.
    return false;
  }
}

export function cancelAppointment(id: string): void {
  const all = getAppointments().map((a) =>
    a.id === id ? { ...a, status: "cancelled" as const } : a
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

/** Marca una cita como "recordatorio 48h enviado" para no repetirlo. */
export function markReminderSent(id: string): void {
  const all = getAppointments().map((a) =>
    a.id === id ? { ...a, reminderSentAt: new Date().toISOString() } : a
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function deleteAppointment(id: string): void {
  const all = getAppointments().filter((a) => a.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function getAppointmentsByDate(date: string): Appointment[] {
  return getAppointments().filter((a) => a.date === date && a.status === "confirmed");
}

export function getBookedSlots(date: string): string[] {
  return getAppointmentsByDate(date).map((a) => a.time);
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ─── Admin ─────────────────────────────────────────────────────────────────

const ADMIN_PASSWORD = "velure2024";

export function isAdminLoggedIn(): boolean {
  return localStorage.getItem(ADMIN_KEY) === "true";
}

export function loginAdmin(password: string): boolean {
  if (password === ADMIN_PASSWORD) {
    localStorage.setItem(ADMIN_KEY, "true");
    return true;
  }
  return false;
}

export function logoutAdmin(): void {
  localStorage.removeItem(ADMIN_KEY);
}

// ─── Helpers de tiempo ─────────────────────────────────────────────────────

export function generateTimeSlots(open: string, close: string): string[] {
  const slots: string[] = [];
  let [h, m] = open.split(":").map(Number);
  const [ch, cm] = close.split(":").map(Number);
  const endMinutes = ch * 60 + cm;

  while (h * 60 + m < endMinutes) {
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    m += 30;
    if (m >= 60) {
      h += 1;
      m = 0;
    }
  }
  return slots;
}

export function getDayName(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"][d.getDay()];
}

export function isDateInPast(dateStr: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(dateStr + "T12:00:00");
  return date < today;
}

export function formatDateDisplay(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const days = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  return `${days[d.getDay()]}, ${d.getDate()} de ${months[d.getMonth()]} de ${d.getFullYear()}`;
}
