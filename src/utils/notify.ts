import type { Appointment } from "../types";
import { NOTIFICATIONS, SALON } from "../config";
import { formatDateDisplay } from "../store";

export function buildAdminUrl(): string {
  if (NOTIFICATIONS.adminUrl) return NOTIFICATIONS.adminUrl;
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/admin`;
}

export interface NotifyResult {
  ok: boolean;
  via: "emailjs" | "formsubmit" | "none";
  error?: string;
}

export async function notifyOwnerNewAppointment(
  a: Appointment,
  serviceLabel: string
): Promise<NotifyResult> {
  const adminUrl = buildAdminUrl();
  const dateLabel = formatDateDisplay(a.date);
  const code = a.id.slice(-6).toUpperCase();
  const subject = `Nueva cita · ${a.clientName} · ${dateLabel} ${a.time}`;

  const fields: Record<string, string> = {
    Cliente: a.clientName, Email: a.clientEmail,
    Telefono: a.clientPhone || "—", Servicio: serviceLabel,
    Fecha: dateLabel, Hora: a.time, Codigo: code,
    Notas: a.notes || "—", "Panel de administracion": adminUrl,
  };

  const ej = NOTIFICATIONS.emailjs;
  if (ej.serviceId && ej.templateId && ej.publicKey) {
    try {
      const params: Record<string, string> = {
        to_email: SALON.ownerEmail, subject, panel_admin: adminUrl,
      };
      for (const [k, v] of Object.entries(fields)) {
        params[k.toLowerCase().replace(/\s+/g, "_")] = v;
      }
      const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_id: ej.serviceId, template_id: ej.templateId,
          user_id: ej.publicKey, template_params: params,
        }),
      });
      if (res.ok) return { ok: true, via: "emailjs" };
    } catch { /* sigue a la vía 2 */ }
  }

  try {
    const body = new FormData();
    body.append("_subject", subject);
    body.append("_captcha", "false");
    body.append("_template", "table");
    body.append("name", a.clientName);
    body.append("email", a.clientEmail);
    for (const [k, v] of Object.entries(fields)) body.append(k, v);

    const res = await fetch(
      `https://formsubmit.co/ajax/${encodeURIComponent(SALON.ownerEmail)}`,
      { method: "POST", body }
    );
    if (res.ok) return { ok: true, via: "formsubmit" };
  } catch { /* no hay más vías sin backend */ }

  return { ok: false, via: "none" };
}
