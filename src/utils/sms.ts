// ─── Mensaje de confirmación al cliente por WhatsApp (UltraMsg) ───────────
// UltraMsg conecta el WhatsApp del salón escaneando UN QR (como WhatsApp Web).
// Con el plan gratuito (1 instancia, textos libres) la web puede enviar los
// mensajes de confirmación automáticamente con un simple POST — igual que
// FormSubmit con el email.
//
// CONFIGURACIÓN (una sola vez):
//   1. Entra en ultramsg.com y crea plan gratuito.
//   2. Crea una instancia → escanea el QR con el WhatsApp del salón.
//   3. Copia el Instance ID y el Token que te dan.
//   4. Rellena ULTRAMSG aquí abajo con esos valores.
//
// Si dejas ULTRAMSG vacío el sitio funciona igual, simplemente no se envía
// el mensaje de confirmación (igual que ahora).

const ULTRAMSG = {
  instance: "instance186675",
  token: "sup6ldtsk3abrqw5",
};

export interface WaResult {
  ok: boolean;
  error?: string;
}

function normalizeWaPhone(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");
  if (digits.length === 9) return "34" + digits; // asume España
  return digits;
}

/** Envía (con el WhatsApp del salón) el mensaje de confirmación al cliente. */
export async function sendConfirmationWa(
  clientPhone: string,
  clientName: string,
  serviceLabel: string,
  dateLabel: string,
  time: string
): Promise<WaResult> {
  if (!ULTRAMSG.instance || !ULTRAMSG.token) {
    return { ok: false, error: "UltraMsg no configurado (rellena ULTRAMSG en src/utils/sms.ts)" };
  }

  const message = [
    `¡Hola ${clientName}! 🙌`,
    ``,
    `Gracias por coger tu cita en *VELURE Barber Co.*`,
    ``,
    `✂️ Servicio: ${serviceLabel}`,
    `📅 Fecha: ${dateLabel}`,
    `🕐 Hora: ${time}`,
    ``,
    `Si necesitas cambiarla o cancelarla, responde a este mensaje o llámanos.`,
    `¡Nos vemos pronto!`,
  ].join("\n");

  try {
    const params = new URLSearchParams({
      token: ULTRAMSG.token,
      to: normalizeWaPhone(clientPhone),
      body: message,
      priority: "10",
    });

    const res = await fetch(`https://api.ultramsg.com/${ULTRAMSG.instance}/messages/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!res.ok) return { ok: false, error: `UltraMsg HTTP ${res.status}` };

    const json = await res.json().catch(() => ({}));
    if (json && (json.error || json.success === false)) {
      return { ok: false, error: JSON.stringify(json) };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}
