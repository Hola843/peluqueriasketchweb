import { useState, useEffect } from "react";
import type { Appointment } from "../types";

const WEEKDAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
import { BUSINESS_HOURS, MONTH_LABELS, SERVICE_LIST } from "../types";
import { generateId, generateTimeSlots, loginAdmin, logoutAdmin, isAdminLoggedIn, formatDateDisplay } from "../store";
import * as db from "../lib/db";
import { downloadICSFile, generateGoogleCalendarLink, createCalendarEvent } from "../utils/calendar";
import { waLink, waReminderMessage, normalizePhone } from "../config";

// ─── Login ─────────────────────────────────────────────────────────────────
function LoginForm({ onLogin }: { onLogin: () => void }) {
  const cloud = db.CLOUD;
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    if (cloud) {
      const r = await db.signIn(email.trim(), pass);
      if (r.ok) { setBusy(false); onLogin(); return; }
      if (loginAdmin(pass)) { setBusy(false); onLogin(); return; }
      setBusy(false);
      setError(r.error || "Credenciales incorrectas");
    } else {
      setBusy(false);
      if (loginAdmin(pass)) onLogin();
      else { setError("Contraseña incorrecta"); setPass(""); }
    }
  };

  return (
    <div className="relative min-h-screen pt-16 flex items-center justify-center p-6 bg-[#0c0c0c] overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
      <svg viewBox="0 0 48 48" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[78vmin] h-[78vmin] text-white/[0.035] -rotate-6 pointer-events-none" fill="none" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M24 28.5 L13.5 7" /><path d="M24 28.5 L34.5 7" /><path d="M24 28.5 L17.5 37.5" /><path d="M24 28.5 L30.5 37.5" /><circle cx="15" cy="40" r="3.1" /><circle cx="33" cy="40" r="3.1" /><circle cx="24" cy="28.5" r="1.6" fill="currentColor" stroke="none" />
      </svg>
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.78) 100%)" }} />
      <span className="absolute top-20 left-6 w-5 h-5 border-l border-t border-amber-400/30 pointer-events-none" />
      <span className="absolute top-20 right-6 w-5 h-5 border-r border-t border-amber-400/30 pointer-events-none" />
      <span className="absolute bottom-6 left-6 w-5 h-5 border-l border-b border-amber-400/30 pointer-events-none" />
      <span className="absolute bottom-6 right-6 w-5 h-5 border-r border-b border-amber-400/30 pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm">
        <div className="relative bg-[#141414] border border-white/10 rounded-2xl p-8 text-center shadow-[0_30px_90px_-25px_rgba(0,0,0,0.9)]">
          <span className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-amber-400/70 to-transparent" />
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#141414] px-3 py-1 rounded-full border border-white/10 font-mono text-[9px] tracking-[0.3em] text-amber-400/80">ACCESO INTERNO</span>
          <div className="w-14 h-14 mx-auto rounded-xl border border-amber-400/40 bg-amber-500/10 flex items-center justify-center text-2xl mb-5 mt-2">🔐</div>
          <h2 className="font-display text-3xl text-white leading-none mb-2">Acceso interno</h2>
          <p className="font-mono text-[11px] tracking-[0.12em] text-white/45 mb-7">{cloud ? "Entra con tu cuenta de Supabase" : "Introduce la contraseña para continuar"}</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            {cloud && (
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email de Supabase" required className="w-full px-5 py-3.5 bg-[#0a0a0a] border border-white/12 rounded-xl text-sm text-white placeholder-white/30 outline-none focus:border-amber-400/60 transition-colors text-center" autoFocus />
            )}
            <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Contraseña" required className="w-full px-5 py-3.5 bg-[#0a0a0a] border border-white/12 rounded-xl text-sm text-white placeholder-white/30 outline-none focus:border-amber-400/60 transition-colors text-center tracking-[0.3em]" autoFocus={!cloud} />
            {error && <p className="text-xs text-red-400">{error}</p>}
            <button type="submit" disabled={busy} className="w-full px-6 py-3 rounded-xl text-sm font-semibold tracking-wider uppercase text-[#0d0d0d] bg-gradient-to-r from-amber-300 to-amber-500 hover:shadow-[0_12px_30px_-10px_rgba(201,169,110,0.6)] transition-all disabled:opacity-50">
              {busy ? "Entrando…" : "Acceder"}
            </button>
          </form>
          <p className="font-mono text-[10px] tracking-[0.2em] text-white/25 mt-6">{cloud ? "SUPABASE · SESIÓN SEGURA" : "SOLO PERSONAL AUTORIZADO"}</p>
        </div>
        <p className="text-center font-mono text-[9px] tracking-[0.3em] text-amber-400/40 mt-5">VELURE · BARBER CO.</p>
      </div>
    </div>
  );
}

// ─── Admin Calendar ────────────────────────────────────────────────────────
function AdminCalendar({ selectedDate, onSelect, appointments }: { selectedDate: string; onSelect: (d: string) => void; appointments: Appointment[] }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  // Semana de lunes a domingo: getDay() 0=Dom → convertimos a Lun=0 ... Dom=6
  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();

  const counts: Record<string, number> = {};
  appointments.filter((a) => a.status === "confirmed").forEach((a) => { counts[a.date] = (counts[a.date] || 0) + 1; });

  const cells: { day: number; date: string; isCurrent: boolean; isOther: boolean; count: number }[] = [];
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = daysInPrev - i;
    const dateStr = `${year}-${String(month === 0 ? 12 : month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ day: d, date: dateStr, isCurrent: false, isOther: true, count: 0 });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${String(year).padStart(4, "0")}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ day: d, date: dateStr, isCurrent: dateStr === selectedDate, isOther: false, count: counts[dateStr] || 0 });
  }
  const remaining = (7 - (cells.length % 7)) % 7;
  for (let d = 1; d <= remaining; d++) {
    const dateStr = `${String(year).padStart(4, "0")}-${String(month + 2 > 12 ? 1 : month + 2).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ day: d, date: dateStr, isCurrent: false, isOther: true, count: 0 });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => { if (month === 0) { setYear((y) => y - 1); setMonth(11); } else setMonth((m) => m - 1); }} className="w-8 h-8 flex items-center justify-center rounded-lg text-white/30 hover:text-amber-400 hover:bg-white/5 transition-all">◀</button>
        <span className="text-sm font-serif-custom font-semibold text-white">{MONTH_LABELS[month]} {year}</span>
        <button onClick={() => { if (month === 11) { setYear((y) => y + 1); setMonth(0); } else setMonth((m) => m + 1); }} className="w-8 h-8 flex items-center justify-center rounded-lg text-white/30 hover:text-amber-400 hover:bg-white/5 transition-all">▶</button>
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {WEEKDAY_LABELS.map((d) => (
          <div key={d} className="text-center text-[9px] uppercase text-white/20 py-1">{d}</div>
        ))}
        {cells.map((c, i) => {
          const dow = new Date(c.date + "T12:00:00").getDay();
          const isClosed = BUSINESS_HOURS[dow] === null;
          const isDisabled = c.isOther || isClosed;
          return (
            <button key={i} onClick={() => !isDisabled && onSelect(c.date)} disabled={isDisabled} className={`relative aspect-square rounded-lg text-xs font-medium transition-all ${c.isOther ? "opacity-0 pointer-events-none" : ""} ${isClosed ? "opacity-20 cursor-not-allowed" : "hover:bg-white/5 cursor-pointer"} ${c.isCurrent ? "bg-amber-500/20 text-amber-400 ring-1 ring-amber-400/30" : "text-white/60"}`}>
              {c.day}
              {c.count > 0 && !c.isCurrent && !c.isOther && !isClosed && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[8px] text-amber-400/60 font-bold">{c.count}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Add Appointment Modal ─────────────────────────────────────────────────
function AddAppointmentModal({ onClose, onAdd }: { onClose: () => void; onAdd: () => void }) {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState("");
  const [service, setService] = useState(SERVICE_LIST[0].id);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [booked, setBooked] = useState<string[]>([]);
  useEffect(() => { let on = true; db.getBookedSlots(date).then((r) => { if (on) setBooked(r); }); return () => { on = false; }; }, [date]);

  const dateObj = new Date(date + "T12:00:00");
  const dow = dateObj.getDay();
  const hours = BUSINESS_HOURS[dow];
  const slots = hours ? generateTimeSlots(hours.open, hours.close) : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !time) return;
    const appt: Appointment = {
      id: generateId(), date, time, service, clientName: name, clientEmail: email,
      clientPhone: phone, notes, status: "confirmed", createdAt: new Date().toISOString(),
    };
    await db.insertAppointment(appt);
    onAdd();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1a1a1a] rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto border border-white/10">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-serif-custom font-bold text-white">Nueva Cita</h3>
          <button onClick={onClose} className="text-white/30 hover:text-white text-lg">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-white/30 mb-1 block">Fecha</label>
            <input type="date" value={date} onChange={(e) => { setDate(e.target.value); setTime(""); }} className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white outline-none focus:border-amber-400/50" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-white/30 mb-1 block">Hora</label>
            {!hours ? <p className="text-xs text-red-400">Cerrado este día</p> : (
              <div className="grid grid-cols-4 gap-1.5">
                {slots.map((s) => (
                  <button key={s} type="button" onClick={() => setTime(s)} disabled={booked.includes(s)} className={`py-1.5 rounded-lg text-xs font-medium transition-all ${time === s ? "bg-amber-500 text-[#0d0d0d]" : booked.includes(s) ? "bg-white/5 text-white/15 line-through cursor-not-allowed" : "bg-white/5 text-white/50 hover:bg-white/10"}`}>
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-white/30 mb-1 block">Servicio</label>
            <select value={service} onChange={(e) => setService(e.target.value)} className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white outline-none focus:border-amber-400/50">
              {SERVICE_LIST.map((s) => (<option key={s.id} value={s.id} className="bg-[#1a1a1a]">{s.label}</option>))}
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-white/30 mb-1 block">Nombre *</label>
            <input type="text" placeholder="Nombre del cliente" value={name} onChange={(e) => setName(e.target.value)} required className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/30 outline-none focus:border-amber-400/50" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-white/30 mb-1 block">Email *</label>
            <input type="email" placeholder="email@ejemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/30 outline-none focus:border-amber-400/50" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-white/30 mb-1 block">Teléfono <span className="normal-case tracking-normal text-white/25">(opcional)</span></label>
            <input type="tel" placeholder="+34 600 000 000" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/30 outline-none focus:border-amber-400/50" />
          </div>
          <input type="text" placeholder="Notas (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/30 outline-none focus:border-amber-400/50" />
          <button type="submit" className="w-full px-6 py-3 text-sm font-semibold tracking-wider uppercase text-[#0d0d0d] bg-gradient-to-r from-amber-300 to-amber-500 rounded-xl hover:shadow-[0_0_25px_rgba(201,169,110,0.3)] transition-all">Guardar Cita</button>
        </form>
      </div>
    </div>
  );
}

// ─── Reminders Panel ───────────────────────────────────────────────────────
function RemindersPanel({ appointments, onSent }: { appointments: Appointment[]; onSent: () => void }) {
  const now = Date.now();
  const WINDOW = 48 * 60 * 60 * 1000;
  const pending = appointments.filter((a) => {
    if (a.status !== "confirmed" || a.reminderSentAt) return false;
    const at = new Date(`${a.date}T${a.time}:00`).getTime();
    const diff = at - now;
    return diff > 0 && diff <= WINDOW;
  });

  return (
    <div className={`mb-8 border rounded-2xl p-5 lg:p-6 ${pending.length ? "border-amber-400/30 bg-amber-500/5" : "border-white/10 bg-white/[0.02]"}`}>
      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="flex items-center gap-3">
          <span className="text-lg">🔔</span>
          <div>
            <h3 className="text-sm font-semibold text-white tracking-wide">Recordatorios 48h por WhatsApp</h3>
            <p className="text-[11px] text-white/40">Citas de las próximas 48h sin recordatorio enviado</p>
          </div>
        </div>
        <span className={`text-xs font-bold px-3 py-1 rounded-full shrink-0 ${pending.length ? "bg-amber-500/20 text-amber-400" : "bg-white/5 text-white/30"}`}>{pending.length}</span>
      </div>
      {pending.length === 0 ? (
        <p className="text-xs text-white/30">No hay recordatorios pendientes ahora mismo. ✓</p>
      ) : (
        <div className="space-y-2">
          {pending.map((a) => {
            const svc = SERVICE_LIST.find((s) => s.id === a.service);
            const phone = normalizePhone(a.clientPhone);
            const hasPhone = !!a.clientPhone.trim();
            const dateLabel = formatDateDisplay(a.date);
            return (
              <div key={a.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                <div className="min-w-0">
                  <p className="text-sm text-white font-medium truncate">{a.clientName} · {hasPhone ? a.clientPhone : <span className="text-white/30">sin teléfono</span>}</p>
                  <p className="text-[11px] text-white/40">{dateLabel} · {a.time} · {svc?.label || a.service}</p>
                </div>
                <a
                  href={hasPhone ? waLink(waReminderMessage(a.clientName, dateLabel, a.time), phone) : undefined}
                  target="_blank" rel="noopener noreferrer" aria-disabled={!hasPhone}
                  onClick={hasPhone ? async () => { await db.updateAppointment(a.id, { reminderSentAt: new Date().toISOString() }); onSent(); } : (e) => e.preventDefault()}
                  className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${hasPhone ? "bg-[#25D366] text-[#06210f] hover:bg-[#1ebe5a]" : "bg-white/5 text-white/25 cursor-not-allowed"}`}
                >
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor" aria-hidden><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.247-.694.247-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  {hasPhone ? "Enviar recordatorio" : "Sin teléfono"}
                </a>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Integration Notes ─────────────────────────────────────────────────────
function IntegrationNotes() {
  return (
    <details className="mt-8 border border-white/10 rounded-2xl bg-white/[0.02] group">
      <summary className="cursor-pointer list-none p-5 lg:p-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-lg">⚙️</span>
          <div>
            <h3 className="text-sm font-semibold text-white tracking-wide">Automatizar recordatorios al 100%</h3>
            <p className="text-[11px] text-white/40">Pasos para configurar backend con Meta / Twilio</p>
          </div>
        </div>
        <span className="text-white/30 group-open:rotate-180 transition-transform shrink-0">▾</span>
      </summary>
      <div className="px-5 lg:px-6 pb-6 space-y-5 text-sm text-white/60 border-t border-white/5 pt-5">
        <p>Para enviar recordatorios automáticos 48h antes sin abrir el panel, necesitas un backend. El panel de arriba ya cubre el flujo manual.</p>
        <div className="p-4 rounded-xl bg-white/5 border border-white/5">
          <p className="text-xs font-semibold text-amber-400 mb-2">Meta WhatsApp Cloud API (oficial)</p>
          <ol className="list-decimal list-inside space-y-1 text-[12px] text-white/55">
            <li>Crea app en developers.facebook.com → producto WhatsApp</li>
            <li>Obtén PHONE_NUMBER_ID, ACCESS_TOKEN y plantilla aprobada</li>
            <li>Guarda citas en Supabase (ya configurado)</li>
            <li>Despliega cron que dispare el template cada hora</li>
          </ol>
        </div>
        <div className="p-4 rounded-xl bg-white/5 border border-white/5">
          <p className="text-xs font-semibold text-amber-400 mb-2">Twilio (más corto)</p>
          <ol className="list-decimal list-inside space-y-1 text-[12px] text-white/55">
            <li>Activa WhatsApp Messaging en Twilio</li>
            <li>Variables: TWILIO_SID, TWILIO_TOKEN, TWILIO_WA_FROM</li>
            <li>Cron: twilio.messages.create(...)</li>
          </ol>
        </div>
      </div>
    </details>
  );
}

// ─── Main Admin Panel ──────────────────────────────────────────────────────
export default function AdminPanel({ onLogout }: { onLogout: () => void }) {
  const [loggedIn, setLoggedIn] = useState(db.CLOUD ? db.isCloudSignedIn() : isAdminLoggedIn());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState<"all" | "confirmed" | "cancelled">("all");
  const [sortBy, setSortBy] = useState<"date" | "name">("date");
  const [diag, setDiag] = useState<{ ok: boolean; status: number; detail: string } | null>(null);
  const [lastSync, setLastSync] = useState<number>(0);
  const [writeProbe, setWriteProbe] = useState<{ ok: boolean; status: number; detail: string } | null>(null);

  const refresh = () => { db.listAppointments().then(setAppointments); };
  const doRefresh = () => { refresh(); setLastSync(Date.now()); };

  useEffect(() => { doRefresh(); }, [loggedIn]);
  useEffect(() => {
    if (!db.isCloudSignedIn()) return;
    const id = window.setInterval(doRefresh, 30000);
    return () => window.clearInterval(id);
  }, [loggedIn]);

  if (!loggedIn) return <LoginForm onLogin={() => setLoggedIn(true)} />;

  const filtered = appointments
    .filter((a) => filter === "all" || a.status === filter)
    .sort((a, b) => sortBy === "date" ? a.date.localeCompare(b.date) || a.time.localeCompare(b.time) : a.clientName.localeCompare(b.clientName));

  const dayAppts = appointments.filter((a) => a.date === selectedDate && a.status === "confirmed");
  const totalConfirmed = appointments.filter((a) => a.status === "confirmed").length;
  const totalCancelled = appointments.filter((a) => a.status === "cancelled").length;
  const uniqueClients = new Set(appointments.filter((a) => a.status === "confirmed").map((a) => a.clientEmail)).size;

  return (
    <div className="min-h-screen bg-[#0d0d0d] pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl lg:text-3xl font-serif-custom font-bold text-white">Panel de <span className="text-gold-gradient">Administración</span></h1>
            <p className="text-sm text-white/40 mt-1">Gestiona todas las citas de VELURE</p>
            <span className={`mt-3 inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.15em] uppercase px-2.5 py-1 rounded-full ${db.CLOUD && db.isCloudSignedIn() ? "bg-emerald-500/15 text-emerald-400" : db.CLOUD ? "bg-amber-500/15 text-amber-400" : "bg-white/5 text-white/40"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${db.CLOUD && db.isCloudSignedIn() ? "bg-emerald-400" : db.CLOUD ? "bg-amber-400" : "bg-white/30"}`} />
              {db.CLOUD && db.isCloudSignedIn() ? "Nube conectada · Supabase" : db.CLOUD ? "Supabase · sesión local" : "Guardado en este navegador"}
            </span>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button onClick={() => setShowAdd(true)} className="px-5 py-2.5 text-xs font-semibold tracking-wider uppercase text-[#0d0d0d] bg-gradient-to-r from-amber-300 to-amber-500 rounded-xl hover:shadow-[0_0_20px_rgba(201,169,110,0.3)] transition-all">+ Nueva Cita</button>
            <button onClick={() => { db.signOut(); logoutAdmin(); onLogout(); }} className="px-5 py-2.5 text-xs font-medium text-white/40 border border-white/10 rounded-xl hover:bg-white/5 transition-all">Salir</button>
          </div>
        </div>

        {/* Cloud mode warning */}
        {db.CLOUD && !db.isCloudSignedIn() && (
          <div className="mb-8 flex gap-3 items-start border border-amber-400/30 bg-amber-500/[0.08] rounded-xl p-4">
            <span className="text-amber-400 leading-none mt-0.5 text-lg">⚠</span>
            <div className="text-[12px] text-white/65 leading-relaxed">
              <p className="font-semibold text-white/90 mb-1">El panel está en MODO LOCAL: por eso no ves aquí las citas que entran por la web.</p>
              <p>Esas citas sí están en la nube; para verlas aquí debes entrar con tu usuario de Supabase.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <a href={db.supabaseUsersUrl()} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400 text-[#0d0d0d] text-[11px] font-semibold tracking-wide hover:bg-amber-300 transition-colors">Crear usuario en Supabase →</a>
                <button onClick={() => { db.signOut(); logoutAdmin(); setLoggedIn(false); }} className="px-3 py-1.5 rounded-lg border border-white/15 text-white/70 text-[11px] hover:bg-white/5 transition-colors">Salir y entrar con Supabase</button>
              </div>
              {db.lastAuthError && <p className="mt-2 text-[11px] text-amber-300/80">Último intento con Supabase: <code className="text-amber-200">{db.lastAuthError}</code></p>}
            </div>
          </div>
        )}

        {/* Cloud diagnostics */}
        {db.CLOUD && (
          <div className="mb-8 border border-white/10 bg-white/[0.02] rounded-xl p-4 flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] tracking-[0.12em] uppercase text-white/50">
              <span>Nube: <span className="text-emerald-400">configurada</span></span>
              <span>Sesión: {db.isCloudSignedIn() ? <span className="text-emerald-400">Supabase</span> : <span className="text-amber-400">local</span>}</span>
              <span>Citas: <span className={db.isCloudSignedIn() ? "text-emerald-400" : "text-white/40"}>{db.isCloudSignedIn() ? totalConfirmed : "—"}</span></span>
              {diag && <span>Lectura: {diag.ok ? <span className="text-emerald-400">OK · {diag.status}</span> : <span className="text-red-400">{diag.status || "error"}</span>}</span>}
              {writeProbe && <span>Escritura: {writeProbe.ok ? <span className="text-emerald-400">OK · {writeProbe.status}</span> : <span className="text-red-400">{writeProbe.status || "error"}</span>}</span>}
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => { db.probe().then(setDiag); }} className="px-3 py-1.5 rounded-lg border border-white/15 text-white/70 text-[11px] tracking-wide hover:bg-white/5 transition-colors">Comprobar lectura</button>
              <button onClick={() => { db.probeWrite().then(setWriteProbe); }} disabled={!db.isCloudSignedIn()} className="px-3 py-1.5 rounded-lg border border-white/15 text-white/70 text-[11px] tracking-wide hover:bg-white/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">Probar escritura</button>
              <button onClick={doRefresh} className="px-3 py-1.5 rounded-lg border border-white/15 text-white/70 text-[11px] tracking-wide hover:bg-white/5 transition-colors">↻ {lastSync ? `hace ${Math.max(0, Math.round((Date.now() - lastSync) / 1000))}s` : "recargar"}</button>
            </div>
            {writeProbe && !writeProbe.ok && <p className="text-[11px] text-amber-300/90">Escritura pública denegada ({writeProbe.status}): el móvil no puede guardar en la nube.</p>}
            {writeProbe && writeProbe.ok && <p className="text-[11px] text-emerald-400/90">La escritura pública funciona: el móvil SÍ guarda en la nube.</p>}
          </div>
        )}

        {!db.CLOUD && (
          <div className="mb-8 flex gap-3 items-start border border-amber-400/20 bg-amber-500/5 rounded-xl p-4">
            <span className="text-amber-400 leading-none mt-0.5">ⓘ</span>
            <p className="text-[12px] text-white/55 leading-relaxed">Las citas se guardan solo en el <strong className="text-white/80">navegador desde el que abras este panel</strong>. Para verlas desde cualquier dispositivo, conecta Supabase (ver README).</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Citas Confirmadas", value: totalConfirmed, color: "text-amber-400" },
            { label: "Canceladas", value: totalCancelled, color: "text-red-400" },
            { label: "Clientes Únicos", value: uniqueClients, color: "text-emerald-400" },
            { label: "Total Citas", value: appointments.length, color: "text-white" },
          ].map((stat) => (
            <div key={stat.label} className="glass rounded-xl p-4 text-center">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-[10px] uppercase tracking-wider text-white/30 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Reminders */}
        <RemindersPanel appointments={appointments} onSent={refresh} />

        <div className="grid lg:grid-cols-[320px_1fr] gap-8">
          {/* Calendar sidebar */}
          <div className="glass rounded-2xl p-5 h-fit">
            <h3 className="text-xs uppercase tracking-wider text-white/40 mb-4">Calendario</h3>
            <AdminCalendar selectedDate={selectedDate} onSelect={setSelectedDate} appointments={appointments} />
            {dayAppts.length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/5">
                <p className="text-[10px] uppercase tracking-wider text-amber-400/60 mb-3">{formatDateDisplay(selectedDate)}</p>
                <div className="space-y-2">
                  {dayAppts.map((a) => (
                    <div key={a.id} className="p-2 rounded-lg bg-white/5 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-white truncate">{a.clientName}</p>
                        <p className="text-[10px] text-white/40">{a.time} · {SERVICE_LIST.find(s => s.id === a.service)?.label}</p>
                      </div>
                      <button onClick={() => { db.updateAppointment(a.id, { status: "cancelled" }); refresh(); }} className="text-[10px] text-red-400/60 hover:text-red-400 whitespace-nowrap">Cancelar</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {dayAppts.length === 0 && <div className="mt-4 pt-4 border-t border-white/5 text-center"><p className="text-xs text-white/20">Sin citas este día</p></div>}
          </div>

          {/* All appointments table */}
          <div className="glass rounded-2xl p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <h3 className="text-xs uppercase tracking-wider text-white/40">Todas las citas <span className="text-amber-400 ml-2">({filtered.length})</span></h3>
              <div className="flex gap-2 flex-wrap items-center">
                {(["all", "confirmed", "cancelled"] as const).map((f) => (
                  <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-wider font-medium transition-all ${filter === f ? "bg-amber-500/20 text-amber-400" : "text-white/30 hover:text-white/60"}`}>
                    {f === "all" ? "Todas" : f === "confirmed" ? "Activas" : "Canceladas"}
                  </button>
                ))}
                <button onClick={() => setSortBy((s) => (s === "date" ? "name" : "date"))} className="px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-wider text-white/30 hover:text-white/60 transition-all">
                  {sortBy === "date" ? "Por Fecha" : "Por Nombre"}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left py-3 px-2 text-[10px] uppercase tracking-wider text-white/30 font-medium">Cliente</th>
                    <th className="text-left py-3 px-2 text-[10px] uppercase tracking-wider text-white/30 font-medium">Fecha</th>
                    <th className="text-left py-3 px-2 text-[10px] uppercase tracking-wider text-white/30 font-medium">Hora</th>
                    <th className="text-left py-3 px-2 text-[10px] uppercase tracking-wider text-white/30 font-medium hidden sm:table-cell">Servicio</th>
                    <th className="text-left py-3 px-2 text-[10px] uppercase tracking-wider text-white/30 font-medium">Estado</th>
                    <th className="text-right py-3 px-2 text-[10px] uppercase tracking-wider text-white/30 font-medium">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-10 text-xs text-white/20">No hay citas {filter !== "all" ? (filter === "confirmed" ? "activas" : "canceladas") : ""}</td></tr>
                  )}
                  {filtered.map((a) => (
                    <tr key={a.id} className="border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-2"><p className="text-xs text-white font-medium">{a.clientName}</p></td>
                      <td className="py-3 px-2 text-xs text-white/50">{new Date(a.date + "T12:00:00").toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" })}</td>
                      <td className="py-3 px-2 text-xs text-white/70">{a.time}</td>
                      <td className="py-3 px-2 text-xs text-white/50 hidden sm:table-cell">{SERVICE_LIST.find((s) => s.id === a.service)?.label || a.service}</td>
                      <td className="py-3 px-2">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-semibold ${a.status === "confirmed" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                          {a.status === "confirmed" ? "Activa" : "Cancelada"}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <div className="flex gap-1 justify-end">
                          {a.status === "confirmed" && (
                            <>
                              <a href={(() => { const svc = SERVICE_LIST.find(s => s.id === a.service); const ev = createCalendarEvent(a.clientName, svc?.label || "Cita", a.date, a.time, a.clientPhone, a.clientEmail, a.notes, a.id.slice(-6).toUpperCase()); return generateGoogleCalendarLink(ev); })()} target="_blank" rel="noopener noreferrer" className="text-[10px] text-amber-400/50 hover:text-amber-400 px-2 py-1 rounded hover:bg-amber-500/10 transition-all">📆</a>
                              <button onClick={() => { const svc = SERVICE_LIST.find(s => s.id === a.service); const ev = createCalendarEvent(a.clientName, svc?.label || "Cita", a.date, a.time, a.clientPhone, a.clientEmail, a.notes, a.id.slice(-6).toUpperCase()); downloadICSFile(ev, `velure-${a.date}-${a.clientName.replace(/\s+/g, "-")}.ics`); }} className="text-[10px] text-amber-400/30 hover:text-amber-400 px-2 py-1 rounded hover:bg-amber-500/10 transition-all">📥</button>
                              <button onClick={() => { db.updateAppointment(a.id, { status: "cancelled" }); refresh(); }} className="text-[10px] text-red-400/50 hover:text-red-400 px-2 py-1 rounded hover:bg-red-500/10 transition-all">Cancelar</button>
                            </>
                          )}
                          <button onClick={() => { db.removeAppointment(a.id); refresh(); }} className="text-[10px] text-white/20 hover:text-red-300 px-2 py-1 rounded hover:bg-white/5 transition-all">Eliminar</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <IntegrationNotes />
      </div>

      {showAdd && <AddAppointmentModal onClose={() => setShowAdd(false)} onAdd={refresh} />}
    </div>
  );
}
