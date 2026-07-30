// ─── Tipos compartidos ─────────────────────────────────────────────────────

export interface Appointment {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  service: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  notes: string;
  status: "confirmed" | "cancelled";
  createdAt: string;
  /** ISO timestamp de cuando se envió/registró el recordatorio 48h. */
  reminderSentAt?: string;
}

export type ViewType = "main" | "admin";

// Horarios indexados por getDay() (0 = domingo ... 6 = sábado).
export const BUSINESS_HOURS: Record<number, { open: string; close: string } | null> = {
  0: { open: "10:00", close: "15:00" }, // Domingo
  1: null,                              // Lunes · cerrado
  2: { open: "09:00", close: "20:00" }, // Martes
  3: { open: "09:00", close: "20:00" }, // Miércoles
  4: { open: "09:00", close: "20:00" }, // Jueves
  5: { open: "09:00", close: "20:00" }, // Viernes
  6: { open: "09:00", close: "20:00" }, // Sábado
};

export const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
export const DAY_LABELS_FULL = [
  "Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado",
];
export const MONTH_LABELS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export const SERVICE_LIST = [
  { id: "corte",   label: "Corte Clásico",     price: "22€", duration: "40 min" },
  { id: "fade",    label: "Degradado / Fade",  price: "26€", duration: "45 min" },
  { id: "barba",   label: "Arreglo de Barba",  price: "15€", duration: "25 min" },
  { id: "navaja",  label: "Afeitado con Navaja", price: "20€", duration: "30 min" },
  { id: "combo",   label: "Corte + Barba",     price: "32€", duration: "60 min" },
  { id: "canas",   label: "Color para Canas",  price: "28€", duration: "50 min" },
];
