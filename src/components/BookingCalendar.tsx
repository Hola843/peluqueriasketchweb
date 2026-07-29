import { useState, useEffect, useRef } from "react";
import type { Appointment } from "../types";
import { BUSINESS_HOURS, MONTH_LABELS, SERVICE_LIST } from "../types";
import { generateId, generateTimeSlots, formatDateDisplay } from "../store";
import * as db from "../lib/db";
import { generateGoogleCalendarLink, createCalendarEvent } from "../utils/calendar";
import { notifyOwnerNewAppointment } from "../utils/notify";
import { sendConfirmationWa } from "../utils/sms";

const WEEKDAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

// ─── Mini Calendar ─────────────────────────────────────────────────────────
function MiniCalendar({ selectedDate, onSelect }: { selectedDate: string; onSelect: (d: string) => void }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Semana de lunes a domingo: getDay() 0=Dom → convertimos a Lun=0 ... Dom=6
  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();

  // Allow only current month + next month
  const isCurrentMonth = month === today.getMonth() && year === today.getFullYear();
    const nextMonthDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const isNextMonth = month === nextMonthDate.getMonth() && year === nextMonthDate.getFullYear();

  const prevMonth = () => { if (!isCurrentMonth) { if (month === 0) { setYear((y) => y - 1); setMonth(11); } else setMonth((m) => m - 1); } };
  const nextMonth = () => { if (!isNextMonth) { if (month === 11) { setYear((y) => y + 1); setMonth(0); } else setMonth((m) => m + 1); } };

  const [apptsByDate, setApptsByDate] = useState<Record<string, number>>({});
  useEffect(() => {
    let on = true;
    const mm = String(month + 1).padStart(2, "0");
    const last = new Date(year, month + 1, 0).getDate();
    db.getBookedCounts(`${year}-${mm}-01`, `${year}-${mm}-${String(last).padStart(2, "0")}`)
      .then((r) => { if (on) setApptsByDate(r); });
    return () => { on = false; };
  }, [year, month]);

  const dayCells: { day: number; date: string; isCurrent: boolean; isPast: boolean; isOther: boolean; isToday: boolean; count: number }[] = [];

  for (let i = firstDay - 1; i >= 0; i--) {
    const d = daysInPrev - i;
    const dateStr = `${year}-${String(month === 0 ? 12 : month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    dayCells.push({ day: d, date: dateStr, isCurrent: false, isPast: true, isOther: true, isToday: false, count: 0 });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${String(year).padStart(4, "0")}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const dateObj = new Date(year, month, d);
    const isPast = dateObj < today;
    const isToday = dateObj.getTime() === today.getTime();
    dayCells.push({ day: d, date: dateStr, isCurrent: dateStr === selectedDate, isPast, isOther: false, isToday, count: apptsByDate[dateStr] || 0 });
  }
  const remaining = 7 - (dayCells.length % 7 === 0 ? 0 : 7 - (dayCells.length % 7));
  for (let d = 1; d <= remaining && remaining < 7; d++) {
    const dateStr = `${String(year).padStart(4, "0")}-${String(month + 2 > 12 ? 1 : month + 2).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    dayCells.push({ day: d, date: dateStr, isCurrent: false, isPast: true, isOther: true, isToday: false, count: 0 });
  }

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="flex items-center justify-between mb-5">
        <button onClick={prevMonth} disabled={isCurrentMonth} aria-label="Mes anterior" className="w-9 h-9 flex items-center justify-center rounded-full text-[#111]/45 hover:text-[#7a1f2b] hover:bg-[#111]/[0.04] transition-all disabled:opacity-20 disabled:pointer-events-none">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <span className="font-display text-2xl text-[#111] tracking-tight">{MONTH_LABELS[month]} {year}</span>
        <button onClick={nextMonth} disabled={isNextMonth} aria-label="Mes siguiente" className="w-9 h-9 flex items-center justify-center rounded-full text-[#111]/45 hover:text-[#7a1f2b] hover:bg-[#111]/[0.04] transition-all disabled:opacity-20 disabled:pointer-events-none">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1.5">
        {WEEKDAY_LABELS.map((d) => (
          <div key={d} className="text-center font-mono text-[10px] tracking-[0.12em] uppercase text-[#111]/35 py-2">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {dayCells.map((cell, i) => {
          const dow = new Date(cell.date + "T12:00:00").getDay();
          const isClosed = BUSINESS_HOURS[dow] === null;
          const isDisabled = cell.isOther || cell.isPast || isClosed;
          return (
            <button
              key={i}
              onClick={() => !isDisabled && onSelect(cell.date)}
              disabled={isDisabled}
              className={`relative aspect-square rounded-lg text-[13px] font-medium transition-all duration-200
                ${cell.isOther ? "opacity-0 pointer-events-none" : ""}
                ${isDisabled && !cell.isOther ? "text-[#111]/15 cursor-not-allowed" : ""}
                ${!isDisabled && !cell.isCurrent ? "text-[#111]/75 hover:bg-[#111]/[0.05] cursor-pointer" : ""}
                ${cell.isCurrent ? "bg-[#7a1f2b] text-white shadow-[0_6px_18px_-6px_rgba(122,31,43,0.6)]" : ""}
                ${cell.isToday && !cell.isCurrent ? "ring-1 ring-[#7a1f2b]/40 text-[#7a1f2b] font-semibold" : ""}`}
            >
              <span className="relative z-10">{cell.day}</span>
              {cell.count > 0 && !cell.isCurrent && !cell.isOther && !cell.isPast && !isClosed && (
                <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#7a1f2b]/70" />
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-5 mt-4 font-mono text-[9px] tracking-[0.12em] uppercase text-[#111]/40">
        <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#7a1f2b]/70" /> Con citas</span>
        <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-sm ring-1 ring-[#7a1f2b]/40" /> Hoy</span>
        <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-sm bg-[#111]/10" /> Cerrado</span>
      </div>
    </div>
  );
}

// ─── Time Slots ────────────────────────────────────────────────────────────
function TimeSlots({ date, selectedTime, onSelect }: { date: string; selectedTime: string; onSelect: (t: string) => void }) {
  const dateObj = new Date(date + "T12:00:00");
  const dow = dateObj.getDay();
  const hours = BUSINESS_HOURS[dow];
  const [booked, setBooked] = useState<string[]>([]);
  useEffect(() => { let on = true; db.getBookedSlots(date).then((r) => { if (on) setBooked(r); }); return () => { on = false; }; }, [date]);
  if (!hours) return null;
  const allSlots = generateTimeSlots(hours.open, hours.close);

  return (
    <div>
      <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-[#111]/45 mb-4 text-center">
        Horarios · {hours.open} – {hours.close}
      </p>
      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-w-sm mx-auto">
        {allSlots.map((slot) => {
          const isBooked = booked.includes(slot);
          const isSelected = slot === selectedTime;
          return (
            <button
              key={slot}
              onClick={() => !isBooked && onSelect(slot)}
              disabled={isBooked}
              className={`py-2.5 rounded-lg text-xs font-medium border transition-all duration-200
                ${isSelected
                  ? "bg-[#7a1f2b] border-[#7a1f2b] text-white font-bold shadow-[0_6px_16px_-6px_rgba(122,31,43,0.6)]"
                  : isBooked
                    ? "bg-[#111]/[0.03] border-transparent text-[#111]/20 line-through cursor-not-allowed"
                    : "bg-[#faf8f3] border-[#111]/12 text-[#111]/75 hover:border-[#7a1f2b]/40 hover:text-[#7a1f2b] cursor-pointer"
                }`}
            >
              {slot}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Success Tick ──────────────────────────────────────────────────────────
const TICK_CSS = `
.st-wrap{position:relative;width:128px;height:128px;margin:0 auto;display:flex;align-items:center;justify-content:center}
.st-glow{position:absolute;inset:-12%;border-radius:50%;background:radial-gradient(circle, rgba(34,197,94,.38), transparent 70%);opacity:0;animation:st-glow 1.7s ease .5s infinite}
@keyframes st-glow{0%,100%{opacity:.3;transform:scale(.95)}50%{opacity:.6;transform:scale(1.06)}}
.st-svg{position:relative;width:128px;height:128px;overflow:visible}
.st-circle{fill:rgba(34,197,94,.12);stroke:#22c55e;stroke-width:5;transform-origin:50% 50%;transform:scale(0);opacity:0;animation:st-pop .55s cubic-bezier(.2,1.5,.4,1) forwards}
@keyframes st-pop{0%{transform:scale(0);opacity:0}70%{transform:scale(1.12);opacity:1}100%{transform:scale(1);opacity:1}}
.st-check{fill:none;stroke:#22c55e;stroke-width:8;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:70;stroke-dashoffset:70;filter:drop-shadow(0 3px 8px rgba(34,197,94,.55));animation:st-draw .42s ease .5s forwards}
@keyframes st-draw{to{stroke-dashoffset:0}}
.st-ring{position:absolute;inset:6%;border-radius:50%;border:3px solid #22c55e;opacity:0;animation:st-ring .85s ease .4s forwards}
.st-ring2{animation-delay:.62s}
@keyframes st-ring{0%{transform:scale(.55);opacity:.75}100%{transform:scale(1.55);opacity:0}}
.st-burst{position:absolute;inset:0;pointer-events:none}
.st-spark{position:absolute;left:50%;top:50%;width:4px;height:13px;margin:-6px 0 0 -2px;border-radius:3px;background:#22c55e;opacity:0;transform-origin:50% 50%;animation:st-spark .72s cubic-bezier(.2,.7,.3,1) .45s forwards}
@keyframes st-spark{0%{opacity:0;transform:rotate(var(--a)) translateY(-26px) scaleY(.3)}25%{opacity:1}100%{opacity:0;transform:rotate(var(--a)) translateY(-62px) scaleY(1)}}
@media (prefers-reduced-motion: reduce){
 .st-circle{transform:scale(1)!important;opacity:1!important;animation:none!important}
 .st-check{stroke-dashoffset:0!important;animation:none!important}
 .st-ring,.st-spark,.st-glow{display:none!important}
}
`;

function SuccessTick() {
  return (
    <div className="st-wrap" role="img" aria-label="Cita confirmada">
      <style>{TICK_CSS}</style>
      <span className="st-glow" />
      <span className="st-ring" />
      <span className="st-ring st-ring2" />
      <span className="st-burst">
        {Array.from({ length: 8 }).map((_, i) => (
          <span key={i} className="st-spark" style={{ ["--a" as any]: `${i * 45}deg` }} />
        ))}
      </span>
      <svg className="st-svg" viewBox="0 0 100 100" fill="none" aria-hidden>
        <circle className="st-circle" cx="50" cy="50" r="44" />
        <path className="st-check" d="M30 52 L44 66 L71 35" />
      </svg>
    </div>
  );
}

// ─── Confirmed view ────────────────────────────────────────────────────────
function BookingConfirmedView({ confirmed, onNewBooking }: { confirmed: Appointment; onNewBooking: () => void }) {
  const svc = SERVICE_LIST.find((s) => s.id === confirmed.service);
  const ev = createCalendarEvent(
    confirmed.clientName, svc?.label || "Cita", confirmed.date, confirmed.time,
    confirmed.clientPhone, confirmed.clientEmail, confirmed.notes,
    confirmed.id.slice(-6).toUpperCase()
  );

  return (
    <div className="text-center animate-fade-in-up space-y-6">
      <SuccessTick />
      <div>
        <h3 className="font-display text-3xl text-[#111] leading-none mb-2">¡Cita confirmada!</h3>
        <p className="text-sm text-[#111]/55">Anota la fecha para no olvidarla</p>
      </div>

      <div className="inline-block border border-[#111]/12 bg-white rounded-2xl p-6 text-left space-y-2.5 max-w-xs mx-auto w-full">
        {[["Servicio", svc?.label], ["Fecha", formatDateDisplay(confirmed.date)], ["Hora", confirmed.time], ["Cliente", confirmed.clientName]].map(([l, v]) => (
          <div key={l as string} className="flex justify-between text-sm gap-4">
            <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-[#111]/40 pt-0.5">{l}</span>
            <span className="text-[#111] font-medium text-right">{v}</span>
          </div>
        ))}
        <div className="pt-2.5 border-t border-[#111]/10 text-center">
          <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-[#7a1f2b]">Código {confirmed.id.slice(-6).toUpperCase()}</span>
        </div>
      </div>

      <div className="max-w-md mx-auto">
        <a href={generateGoogleCalendarLink(ev)} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-lg w-full">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="3" y="4.5" width="18" height="16" rx="2" /><path d="M3 9h18M8 2.5v4M16 2.5v4" /></svg>
          Guardar en Google Calendar
        </a>
      </div>

      <button onClick={onNewBooking} className="btn btn-ghost text-[#111]">Nueva reserva</button>
    </div>
  );
}

// ─── Main Booking Component ────────────────────────────────────────────────
export default function BookingCalendar() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", notes: "" });
  const [confirmed, setConfirmed] = useState<Appointment | null>(null);
  const [error, setError] = useState("");
  const [persisted, setPersisted] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  const scrollToTop = () => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const scrollToCalendar = () => {
    calendarRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  useEffect(() => {
    if (selectedDate && selectedTime && selectedService) {
      setStep(3);
      scrollToTop();
    }
  }, [selectedDate, selectedTime, selectedService]);

  const handleDateSelect = (d: string) => { setSelectedDate(d); setSelectedTime(""); setStep(2); scrollToTop(); };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim() || !form.phone.trim()) { setError("Por favor completa los campos obligatorios."); return; }
    const appointment: Appointment = {
      id: generateId(), date: selectedDate, time: selectedTime, service: selectedService,
      clientName: form.name.trim(), clientEmail: "",
      clientPhone: form.phone.trim(), notes: form.notes.trim(),
      status: "confirmed", createdAt: new Date().toISOString(),
    };
    const didPersist = await db.insertAppointment(appointment);
    setPersisted(didPersist);
    setConfirmed(appointment);
    setStep(3);
    scrollToTop();
    void notifyOwnerNewAppointment(appointment, SERVICE_LIST.find((s) => s.id === appointment.service)?.label || "");

    // WhatsApp automático de confirmación al cliente (UltraMsg, fire-and-forget)
    void sendConfirmationWa(
      appointment.clientPhone,
      appointment.clientName,
      SERVICE_LIST.find((s) => s.id === appointment.service)?.label || appointment.service,
      formatDateDisplay(appointment.date),
      appointment.time
    );
  };

  const handleNewBooking = () => {
    setStep(1); setSelectedDate(""); setSelectedTime(""); setSelectedService("");
    setForm({ name: "", phone: "", notes: "" }); setConfirmed(null); setError(""); setPersisted(true);
  };

  const isFormStep = step === 3 && !confirmed;
  const inputCls = "w-full px-4 py-3 bg-[#faf8f3] border border-[#111]/12 rounded-xl text-sm text-[#111] placeholder-[#111]/35 outline-none focus:border-[#7a1f2b]/60 focus:bg-white transition-colors";
  const labelCls = "block font-mono text-[10px] tracking-[0.16em] uppercase text-[#111]/45 mb-1.5";

  return (
    <div ref={scrollRef} className="w-full max-w-2xl mx-auto">
      {/* Stepper */}
      <div className="flex items-center justify-center gap-3 sm:gap-4 mb-10">
        {[
          { num: 1, label: "Servicio y fecha" },
          { num: 2, label: "Horario" },
          { num: 3, label: "Confirmación" },
        ].map((s, i) => {
          const canGoBack = !confirmed && step > s.num;
          const handleClick = canGoBack ? () => { setStep(s.num as 1 | 2); if (s.num === 1) setSelectedTime(""); scrollToTop(); } : undefined;
          return (
            <div key={s.num} className="flex items-center gap-3 sm:gap-4">
              <button type="button" onClick={handleClick} disabled={!canGoBack} className="flex items-center gap-2.5 group">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-mono text-[11px] font-bold transition-all duration-500 ${step >= s.num ? "bg-[#7a1f2b] text-white" : "bg-[#111]/[0.06] text-[#111]/35"} ${canGoBack ? "cursor-pointer group-hover:scale-110" : ""}`}>
                  {confirmed && s.num === 3 ? "✓" : s.num}
                </div>
                <span className={`hidden sm:block font-mono text-[10px] tracking-[0.16em] uppercase transition-colors ${step >= s.num ? "text-[#7a1f2b]" : "text-[#111]/40"} ${canGoBack ? "group-hover:text-[#7a1f2b]" : ""}`}>{s.label}</span>
              </button>
              {i < 2 && <div className={`w-6 sm:w-10 h-px ${step > s.num ? "bg-[#7a1f2b]/40" : "bg-[#111]/12"}`} />}
            </div>
          );
        })}
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <div className="space-y-8 animate-fade-in-up">
          <div>
            <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-[#111]/45 mb-4 text-center">Elige un servicio</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {SERVICE_LIST.map((svc) => (
                <button
                  key={svc.id}
                  onClick={() => { setSelectedService(svc.id); setTimeout(scrollToCalendar, 100); }}
                  className={`p-4 rounded-xl text-center transition-all duration-300 border ${selectedService === svc.id ? "border-[#7a1f2b] bg-[#7a1f2b]/[0.05] ring-1 ring-[#7a1f2b]/20" : "border-[#111]/12 bg-white hover:border-[#7a1f2b]/30 hover:bg-[#faf8f3]"}`}
                >
                  <p className="text-sm font-semibold text-[#111] leading-tight">{svc.label}</p>
                  <p className="font-mono text-[10px] tracking-[0.08em] text-[#7a1f2b]/80 mt-1.5">{svc.price} · {svc.duration}</p>
                </button>
              ))}
            </div>
          </div>
        <div ref={calendarRef}>
          <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-[#111]/45 mb-4 text-center">Elige una fecha</p>
          <MiniCalendar selectedDate={selectedDate} onSelect={handleDateSelect} />
        </div>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && selectedDate && (
        <div className="animate-fade-in-up space-y-6">
          <p className="font-display text-xl text-[#111] text-center italic">{formatDateDisplay(selectedDate)}</p>
          <TimeSlots date={selectedDate} selectedTime={selectedTime} onSelect={(t) => { setSelectedTime(t); if (selectedService) { setStep(3); scrollToTop(); } }} />
          <div className="text-center">
            <button onClick={() => { setStep(1); scrollToTop(); }} className="font-mono text-[10px] tracking-[0.16em] uppercase text-[#111]/40 hover:text-[#7a1f2b] transition-colors">← Cambiar fecha</button>
          </div>
        </div>
      )}

      {/* Step 3 form */}
      {isFormStep && selectedDate && selectedTime && (
        <form onSubmit={handleBooking} className="animate-fade-in-up space-y-6">
          <div className="border border-[#111]/12 bg-white rounded-2xl p-5 max-w-sm mx-auto">
            <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-[#7a1f2b] mb-3 text-center">Revisa tu reserva</p>
            <div className="space-y-1.5">
              {[
                { label: "Servicio", value: SERVICE_LIST.find((s) => s.id === selectedService)?.label, go: () => { setStep(1); scrollToTop(); } },
                { label: "Fecha", value: formatDateDisplay(selectedDate), go: () => { setStep(1); scrollToTop(); } },
                { label: "Hora", value: selectedTime, go: () => { setStep(2); scrollToTop(); } },
              ].map((row) => (
                <button key={row.label} type="button" onClick={row.go} className="w-full flex items-center justify-between p-3 rounded-xl border border-transparent hover:bg-[#faf8f3] hover:border-[#111]/8 transition-all group text-left">
                  <span>
                    <span className="block font-mono text-[9px] tracking-[0.16em] uppercase text-[#111]/40">{row.label}</span>
                    <span className="block text-sm text-[#111] font-medium mt-0.5">{row.value}</span>
                  </span>
                  <span className="text-[#7a1f2b]/45 group-hover:text-[#7a1f2b] transition-colors text-sm">✎</span>
                </button>
              ))}
            </div>
            <p className="font-mono text-[9px] tracking-[0.12em] uppercase text-[#111]/30 text-center mt-3">Pulsa un campo para modificarlo</p>
          </div>

          <div className="grid gap-4">
            <div><label className={labelCls}>Nombre completo *</label><input type="text" placeholder="Tu nombre" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required className={inputCls} /></div>
            <div><label className={labelCls}>Teléfono *</label><input type="tel" placeholder="+34 600 000 000" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} required className={inputCls} /></div>
            <div><label className={labelCls}>Notas <span className="text-[#111]/25 normal-case tracking-normal">(opcional)</span></label><input type="text" placeholder="Cualquier detalle" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className={inputCls} /></div>
          </div>
          {error && <p className="text-xs text-[#b3261e] text-center">{error}</p>}
          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <button type="button" onClick={() => { setStep(2); scrollToTop(); }} className="btn btn-ghost text-[#111] flex-1">← Atrás</button>
            <button type="submit" className="btn btn-primary flex-1">Confirmar cita <span className="arr">→</span></button>
          </div>
        </form>
      )}

      {confirmed && (
        <>
          {!persisted && (
            <div className="mb-6 max-w-md mx-auto border border-[#b3261e]/30 bg-[#b3261e]/[0.06] rounded-xl p-4 text-left">
              <p className="text-sm text-[#b3261e] font-semibold">No se pudo guardar en este navegador</p>
              <p className="text-xs text-[#111]/60 mt-1">Parece modo privado o un visor interno de la app de correo. El aviso por email al salón sí se ha enviado: anota la cita o repítela en una ventana normal.</p>
            </div>
          )}
          {db.CLOUD && db.cloudWriteFailed && (
            <div className="mb-6 max-w-md mx-auto border border-[#b8860b]/40 bg-[#b8860b]/[0.08] rounded-xl p-4 text-left">
              <p className="text-sm text-[#8a6508] font-semibold">Guardada en este dispositivo</p>
              <p className="text-xs text-[#111]/60 mt-1">La nube no respondió, así que la cita quedó en este navegador. Revisa que ejecutaste el schema en Supabase y que la clave es correcta.</p>
            </div>
          )}
          <BookingConfirmedView confirmed={confirmed} onNewBooking={handleNewBooking} />
        </>
      )}
    </div>
  );
}
