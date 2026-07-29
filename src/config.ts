// ─── Configuración central del salón ───────────────────────────────────────
export const SALON = {
  name: "VELURE",
  tagline: "BARBER CO.",
  phoneDisplay: "+34 912 345 678",
  phoneRaw: "34912345678",
  whatsappNumber: "34912345678",
  whatsappDefaultMessage: "Hola, quiero reservar una cita en VELURE Barber Co.",
  address: "Calle de la Belleza, 42, 28001 Madrid",
  lat: 40.42001,
  lng: -3.70256,
  email: "hola@velurebarber.co",
  ownerEmail: "martingonzalezfonseca96@gmail.com",
} as const;

export function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");
  if (digits.length === 9) return "34" + digits;
  if (digits.length === 12 && digits.startsWith("34")) return digits;
  return digits || SALON.whatsappNumber;
}

export function waLink(
  message: string = SALON.whatsappDefaultMessage,
  phone: string = SALON.whatsappNumber
): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export function waReminderMessage(
  clientName: string,
  dateLabel: string,
  time: string
): string {
  return (
    `Hola ${clientName}, te escribimos de ${SALON.name} ${SALON.tagline} ` +
    `para recordar tu cita el ${dateLabel} a las ${time}. ` +
    `¿Nos la confirmas? Responde SÍ para confirmar o NO para cancelarla. ¡Gracias!`
  );
}

export function waBookingMessage(service?: string, date?: string, time?: string): string {
  const base = SALON.whatsappDefaultMessage;
  if (service || date || time) {
    return `${base} Me interesa: ${service || "—"}${date ? `, ${date}` : ""}${time ? ` a las ${time}` : ""}.`;
  }
  return base;
}

export const MAPS_EMBED_URL =
  `https://www.google.com/maps?q=${SALON.lat},${SALON.lng}&z=16&output=embed`;

export const MAPS_DIR_URL =
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(SALON.address)}`;

export const NOTIFICATIONS = {
  emailjs: {
    serviceId: "",
    templateId: "",
    publicKey: "",
  },
  adminUrl: "",
} as const;
