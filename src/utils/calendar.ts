import { SALON } from "../config";

export const OWNER_EMAIL = SALON.ownerEmail;
export const SALON_NAME = `${SALON.name} ${SALON.tagline}`;
export const SALON_ADDRESS = SALON.address;
export const SALON_PHONE = SALON.phoneDisplay;

export interface CalendarEvent {
  title: string;
  description: string;
  location: string;
  startDate: string;
  startTime: string;
  endTime: string;
  organizer?: string;
  attendees?: string[];
  uid?: string;
}

function formatICSDate(date: string, time: string): string {
  const [y, m, d] = date.split("-");
  const [hh, mm] = time.split(":");
  return `${y}${m}${d}T${hh}${mm}00`;
}

function escapeICS(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n").replace(/\r/g, "");
}

export function generateICSContent(event: CalendarEvent): string {
  const uid = event.uid || `${Date.now()}-${Math.random().toString(36).slice(2)}@velurestudio.com`;
  const start = formatICSDate(event.startDate, event.startTime);
  const end = formatICSDate(event.startDate, event.endTime);
  const now = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//VELURE Studio//ES",
    "CALSCALE:GREGORIAN", "METHOD:REQUEST", "BEGIN:VEVENT",
    `UID:${uid}`, `DTSTAMP:${now}`, `DTSTART:${start}`, `DTEND:${end}`,
    `SUMMARY:${escapeICS(event.title)}`, `DESCRIPTION:${escapeICS(event.description)}`,
    `LOCATION:${escapeICS(event.location)}`, "STATUS:CONFIRMED", "SEQUENCE:1",
    `ORGANIZER;CN=${escapeICS(SALON_NAME)}:mailto:${OWNER_EMAIL}`,
  ];

  const allAttendees = event.attendees ? [...event.attendees] : [];
  if (!allAttendees.includes(OWNER_EMAIL)) allAttendees.unshift(OWNER_EMAIL);
  allAttendees.forEach((email) => {
    lines.push(`ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${email}`);
  });

  lines.push("BEGIN:VALARM", "TRIGGER:-PT15M", "ACTION:DISPLAY", "DESCRIPTION:🔔 Recordatorio: Cita en VELURE Studio", "END:VALARM");
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n");
}

export function openInCalendarApp(event: CalendarEvent): void {
  const icsContent = generateICSContent(event);
  const encoded = encodeURIComponent(icsContent);
  const dataUri = `data:text/calendar;charset=utf-8,${encoded}`;
  const win = window.open(dataUri, "_blank");
  if (!win || win.closed || typeof win.closed === "undefined") {
    downloadICSFile(event, `velure-${event.startDate}.ics`);
  }
}

export function syncToOwnerCalendar(event: CalendarEvent): void {
  openInCalendarApp(event);
}

export function generateGoogleCalendarLink(event: CalendarEvent): string {
  const fmt = (date: string, time: string) => {
    const [y, m, d] = date.split("-");
    const [hh, mm] = time.split(":");
    return `${y}${m}${d}T${hh}${mm}00`;
  };

  const params = new URLSearchParams({
    action: "TEMPLATE", text: event.title,
    dates: `${fmt(event.startDate, event.startTime)}/${fmt(event.startDate, event.endTime)}`,
    details: event.description, location: event.location,
    trp: "false", sf: "true", output: "xml",
  });

  const allAttendees = event.attendees ? [...event.attendees] : [];
  if (!allAttendees.includes(OWNER_EMAIL)) allAttendees.unshift(OWNER_EMAIL);
  allAttendees.forEach((email) => params.append("add", email));

  return `https://www.google.com/calendar/render?${params.toString()}`;
}

export function downloadICSFile(event: CalendarEvent, filename = "cita-velure.ics") {
  const content = generateICSContent(event);
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function createCalendarEvent(
  clientName: string, serviceLabel: string, date: string, time: string,
  phone: string, email: string, notes: string, code: string,
): CalendarEvent {
  const endHour = parseInt(time.split(":")[0]) + 1;
  const endTime = `${String(endHour).padStart(2, "0")}:${time.split(":")[1]}`;

  return {
    title: `✂️ ${clientName} - ${serviceLabel}`,
    description: [
      `👤 Cliente: ${clientName}`, `📞 Teléfono: ${phone}`,
      `✉️ Email: ${email}`, `💇 Servicio: ${serviceLabel}`,
      `📝 Notas: ${notes || "Sin notas"}`, `🔑 Código: ${code}`,
      ``, `📍 ${SALON_ADDRESS}`, `📞 ${SALON_PHONE}`,
    ].join("\n"),
    location: SALON_ADDRESS,
    startDate: date, startTime: time, endTime,
    organizer: OWNER_EMAIL,
    attendees: [OWNER_EMAIL, email],
  };
}
