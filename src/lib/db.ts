import type { Appointment } from "../types";

const ENV = (import.meta as any).env as Record<string, string | undefined>;
const SUPA_URL = (ENV.VITE_SUPABASE_URL || "https://iggvfxtokroifoozelts.supabase.co").replace(/\/$/, "");
const SUPA_ANON = ENV.VITE_SUPABASE_ANON_KEY || "sb_publishable_jCUdxRTIADD_luHbSr-VAQ_SWZGbZpK";
export const CLOUD = !!SUPA_URL && !!SUPA_ANON;

const LS_KEY = "velure_appointments";

function lsAll(): Appointment[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch { return []; }
}
function lsSet(all: Appointment[]): boolean {
  try { localStorage.setItem(LS_KEY, JSON.stringify(all)); return true; } catch { return false; }
}

let TOKEN = typeof sessionStorage !== "undefined" ? sessionStorage.getItem("velure_token") || "" : "";
export function isCloudSignedIn(): boolean { return CLOUD && !!TOKEN; }

async function headers(json = false): Promise<Record<string, string>> {
  const h: Record<string, string> = { apikey: SUPA_ANON };
  if (json) h["Content-Type"] = "application/json";
  if (TOKEN) h["Authorization"] = `Bearer ${TOKEN}`;
  return h;
}

export let lastAuthError = "";
export async function signIn(email: string, password: string): Promise<{ ok: boolean; error?: string }> {
  lastAuthError = "";
  if (!CLOUD) return { ok: false, error: "Supabase no configurado" };
  try {
    const r = await fetch(`${SUPA_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: SUPA_ANON, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!r.ok) {
      let msg = "Email o contraseña incorrectos";
      try { const j = await r.json(); msg = j?.error_description || j?.msg || j?.error || msg; } catch { /* noop */ }
      lastAuthError = `${r.status}: ${msg}`;
      return { ok: false, error: msg };
    }
    const data = await r.json();
    TOKEN = data.access_token || "";
    if (typeof sessionStorage !== "undefined") {
      if (TOKEN) sessionStorage.setItem("velure_token", TOKEN);
      else sessionStorage.removeItem("velure_token");
    }
    return { ok: !!TOKEN };
  } catch (e: any) {
    lastAuthError = String(e?.message || e);
    return { ok: false, error: "Error de conexión con Supabase" };
  }
}

export function signOut(): void {
  TOKEN = "";
  if (typeof sessionStorage !== "undefined") sessionStorage.removeItem("velure_token");
}

function toRow(a: Appointment): Record<string, unknown> {
  return {
    id: a.id, date: a.date, time: a.time, service: a.service,
    client_name: a.clientName, client_email: a.clientEmail, client_phone: a.clientPhone,
    notes: a.notes || "", status: a.status, reminder_sent: !!a.reminderSentAt,
  };
}
function fromRow(r: Record<string, any>): Appointment {
  return {
    id: r.id, date: r.date, time: r.time, service: r.service,
    clientName: r.client_name, clientEmail: r.client_email, clientPhone: r.client_phone,
    notes: r.notes || "", status: r.status,
    reminderSentAt: r.reminder_sent ? (r.updated_at || r.created_at || new Date().toISOString()) : undefined,
    createdAt: r.created_at || r.createdAt || new Date().toISOString(),
  };
}

const COL: Record<string, string> = {
  clientName: "client_name", clientEmail: "client_email", clientPhone: "client_phone",
  reminderSentAt: "reminder_sent", createdAt: "created_at",
};

export async function listAppointments(): Promise<Appointment[]> {
  if (!CLOUD) return lsAll();
  if (!TOKEN) return [];
  try {
    const r = await fetch(`${SUPA_URL}/rest/v1/appointments?order=date.asc&order=time.asc`, { headers: await headers() });
    if (!r.ok) return lsAll();
    return ((await r.json()) as any[]).map(fromRow);
  } catch { return lsAll(); }
}

export let cloudWriteFailed = false;
export async function insertAppointment(a: Appointment): Promise<boolean> {
  cloudWriteFailed = false;
  const localOk = (() => { const all = lsAll(); all.push(a); return lsSet(all); })();
  if (!CLOUD) return localOk;
  try {
    const r = await fetch(`${SUPA_URL}/rest/v1/appointments`, {
      method: "POST", headers: await headers(true), body: JSON.stringify(toRow(a)),
    });
    if (!r.ok) cloudWriteFailed = true;
    return localOk;
  } catch { cloudWriteFailed = true; return localOk; }
}

export async function updateAppointment(id: string, patch: Partial<Appointment>): Promise<void> {
  lsSet(lsAll().map((a) => (a.id === id ? { ...a, ...patch } : a)));
  if (!CLOUD || !TOKEN) return;
  const row: Record<string, unknown> = {};
  for (const k of Object.keys(patch)) {
    const col = COL[k] || k;
    row[col] = k === "reminderSentAt" ? !!(patch as any)[k] : (patch as any)[k];
  }
  try {
    await fetch(`${SUPA_URL}/rest/v1/appointments?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH", headers: await headers(true), body: JSON.stringify(row),
    });
  } catch { /* silencioso */ }
}

export async function removeAppointment(id: string): Promise<void> {
  lsSet(lsAll().filter((a) => a.id !== id));
  if (!CLOUD || !TOKEN) return;
  try {
    await fetch(`${SUPA_URL}/rest/v1/appointments?id=eq.${encodeURIComponent(id)}`, {
      method: "DELETE", headers: await headers(),
    });
  } catch { /* idem */ }
}

export async function getBookedSlots(date: string): Promise<string[]> {
  if (!CLOUD) return lsAll().filter((a) => a.status === "confirmed" && a.date === date).map((a) => a.time);
  try {
    const r = await fetch(`${SUPA_URL}/rest/v1/rpc/booked_slots`, {
      method: "POST", headers: await headers(true), body: JSON.stringify({ p_date: date }),
    });
    if (!r.ok) return [];
    return (await r.json()) as string[];
  } catch { return []; }
}

export async function getBookedCounts(from: string, to: string): Promise<Record<string, number>> {
  if (!CLOUD) {
    const m: Record<string, number> = {};
    lsAll().filter((a) => a.status === "confirmed").forEach((a) => { m[a.date] = (m[a.date] || 0) + 1; });
    return m;
  }
  try {
    const r = await fetch(`${SUPA_URL}/rest/v1/rpc/booked_counts`, {
      method: "POST", headers: await headers(true), body: JSON.stringify({ p_from: from, p_to: to }),
    });
    if (!r.ok) return {};
    const rows = (await r.json()) as { date: string; cnt: number }[];
    const m: Record<string, number> = {};
    rows.forEach((x) => { m[x.date] = Number(x.cnt); });
    return m;
  } catch { return {}; }
}

export async function probe(): Promise<{ ok: boolean; status: number; detail: string }> {
  if (!CLOUD) return { ok: false, status: 0, detail: "Sin configurar" };
  const today = new Date().toISOString().slice(0, 10);
  try {
    const r = await fetch(`${SUPA_URL}/rest/v1/rpc/booked_slots`, {
      method: "POST", headers: await headers(true), body: JSON.stringify({ p_date: today }),
    });
    const detail = r.ok ? "Conexión y esquema OK" : (await r.text().catch(() => ""));
    return { ok: r.ok, status: r.status, detail };
  } catch (e: any) {
    return { ok: false, status: 0, detail: String(e?.message || e) };
  }
}

export function supabaseUsersUrl(): string {
  try {
    const ref = new URL(SUPA_URL).hostname.split(".")[0];
    return `https://supabase.com/dashboard/project/${ref}/auth/users`;
  } catch {
    return "https://supabase.com/dashboard";
  }
}

export async function probeWrite(): Promise<{ ok: boolean; status: number; detail: string }> {
  if (!CLOUD) return { ok: false, status: 0, detail: "Sin configurar" };
  const id = "probe-" + Date.now();
  const row = {
    id, date: "2000-01-01", time: "00:00", service: "probe",
    client_name: "PRUEBA CONEXION", client_email: "probe@velure.local",
    client_phone: "000000000", notes: "fila de prueba, se borra sola",
    status: "cancelled", reminder_sent: true,
  };
  try {
    const anonH: Record<string, string> = { apikey: SUPA_ANON, "Content-Type": "application/json", Prefer: "return=minimal" };
    const r = await fetch(`${SUPA_URL}/rest/v1/appointments`, { method: "POST", headers: anonH, body: JSON.stringify(row) });
    const detail = r.ok ? "OK" : (await r.text().catch(() => ""));
    if (r.ok) {
      await fetch(`${SUPA_URL}/rest/v1/appointments?id=eq.${id}`, { method: "DELETE", headers: await headers() }).catch(() => {});
    }
    return { ok: r.ok, status: r.status, detail };
  } catch (e: any) {
    return { ok: false, status: 0, detail: String(e?.message || e) };
  }
}
