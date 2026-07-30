import { useState, useEffect, useRef, type ReactNode } from "react";
import BookingCalendar from "./components/BookingCalendar";
import AdminPanel from "./components/AdminPanel";
import WhatsAppButton from "./components/WhatsAppButton";
import Intro from "./components/Intro";
import { SALON, MAPS_EMBED_URL, MAPS_DIR_URL } from "./config";
import { BUSINESS_HOURS, DAY_LABELS, DAY_LABELS_FULL, type ViewType } from "./types";

// ─── Imágenes ──────────────────────────────────────────────────────────
const IMG = {
  fade: "https://images.pexels.com/photos/33461079/pexels-photo-33461079.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=900",
  shave: "https://images.pexels.com/photos/12302333/pexels-photo-12302333.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=900",
  interior: "https://images.pexels.com/photos/18090356/pexels-photo-18090356.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=1600",
  balm: "https://images.pexels.com/photos/33380942/pexels-photo-33380942.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=900",
};

const GALLERY = [
  { src: IMG.fade, alt: "Degradado en ejecución", title: "El fade", tag: "01 · Técnica" },
  { src: IMG.shave, alt: "Afeitado con navaja", title: "El ritual", tag: "02 · Navaja" },
  { src: IMG.balm, alt: "Cuidado de barba", title: "El detalle", tag: "03 · Barba" },
  { src: IMG.interior, alt: "Interior de la barbería", title: "La casa", tag: "04 · Salón" },
];

const SERVICES = [
  { num: "01", title: "Corte clásico", desc: "Tijera, peine y pulso. El corte de siempre, bien ejecutado y asesorado según tu cráneo.", price: "22", duration: "40 min" },
  { num: "02", title: "Degradado / Fade", desc: "Líneas limpias y transiciones sin costura. Skin, low, mid o high, en milímetros contados.", price: "26", duration: "45 min" },
  { num: "03", title: "Arreglo de barba", desc: "Perfilado con navaja, tijera y aceite. La barba que tu cara pide, no la que impone la moda.", price: "15", duration: "25 min" },
  { num: "04", title: "Afeitado con navaja", desc: "Toalla caliente, navaja afilada al momento y bálsamo. El ritual completo de toda la vida.", price: "20", duration: "30 min" },
  { num: "05", title: "Corte + barba", desc: "El combo de la casa. Sales con todo en su sitio y la nuca como un espejo.", price: "32", duration: "60 min" },
  { num: "06", title: "Color para canas", desc: "Cobertura natural, mate y discreta. Sin efecto tinte. Nadie lo nota; tú sí.", price: "28", duration: "50 min" },
];

const TESTIMONIALS = [
  { name: "Javier M.", text: "Llevo dos años viniendo y no cambio. Entienden lo que quiero sin que lo explique. Eso no se compra.", where: "Chamberí · Madrid" },
  { name: "Andrés P.", text: "El fade más limpio que me han hecho. Y el afeitado con navaja juega en otra liga. Salgo nuevo.", where: "Eixample · Barcelona" },
  { name: "Sergio L.", text: "Vine por un colega y ahora vengo cada tres semanas sin falta. El trato es de los de antes.", where: "Ruzafa · Valencia" },
  { name: "Raúl T.", text: "Me taparon las canas sin que pareciera teñido. Natural, rápido y sin discurso. Volveré.", where: "Triana · Sevilla" },
];

const NAV_LINKS = [
  { label: "Casa", href: "#hero" },
  { label: "Carta", href: "#servicios" },
  { label: "Oficio", href: "#galeria" },
  { label: "Voces", href: "#testimonios" },
  { label: "Reservas", href: "#booking-calendar" },
  { label: "Dónde", href: "#ubicacion" },
];

// ─── Estado abierto / cerrado ──────────────────────────────────────────────
function getOpenStatus() {
  const now = new Date();
  const idx = now.getDay();
  const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const hours = BUSINESS_HOURS[idx];
  const open = !!hours && hhmm >= hours.open && hhmm <= hours.close;
  return { idx, hhmm, open, hours };
}

// ─── Logo (tijeras abiertas que forman la V de VELURE) ─────────────────────
function LogoMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M24 28.5 L13.5 7" />
      <path d="M24 28.5 L34.5 7" />
      <path d="M24 28.5 L17.5 37.5" />
      <path d="M24 28.5 L30.5 37.5" />
      <circle cx="15" cy="40" r="3.1" />
      <circle cx="33" cy="40" r="3.1" />
      <circle cx="24" cy="28.5" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

function Logo({ className = "", onHome }: { className?: string; onHome?: () => void }) {
  return (
    <a href="#hero" onClick={onHome} className={`group inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark className="w-7 h-7 transition-transform duration-500 group-hover:rotate-[-6deg]" />
      <span className="font-sans font-extrabold tracking-[0.3em] text-[15px] leading-none" style={{ fontFamily: "var(--font-sans)" }}>
        VELURE
      </span>
    </a>
  );
}

// ─── Reveal on scroll ──────────────────────────────────────────────────────
function Reveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const [v, setV] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setV(true); o.disconnect(); } }, { threshold: 0.12 });
    if (ref.current) o.observe(ref.current);
    return () => o.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-[900ms] ease-[cubic-bezier(.2,.8,.2,1)] ${v ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"} ${className}`}
    >
      {children}
    </div>
  );
}

// ─── Eyebrow (micro-etiqueta) ──────────────────────────────────────────────
function Eyebrow({ n, children, tone = "light" }: { n: string; children: ReactNode; tone?: "light" | "dark" }) {
  const c = tone === "light" ? "text-[#7a1f2b]" : "text-[#faf8f3]/55";
  const line = tone === "light" ? "bg-[#7a1f2b]" : "bg-[#faf8f3]/40";
  return (
    <div className="flex items-center gap-3 mb-5">
      <span className={`font-mono text-[11px] tracking-[0.25em] ${c}`}>{n}</span>
      <span className={`w-7 h-px ${line}`} />
      <span className={`font-mono text-[11px] tracking-[0.25em] uppercase ${c}`}>{children}</span>
    </div>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────
function Navbar({ view, onViewChange }: { view: ViewType; onViewChange: (v: ViewType) => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const go = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setOpen(false);
    const target = href === "#reservas" ? "#booking-calendar" : href;
    if (view !== "main") {
      onViewChange("main");
      setTimeout(() => document.querySelector(target)?.scrollIntoView({ behavior: "smooth" }), 80);
    } else {
      document.querySelector(target)?.scrollIntoView({ behavior: "smooth" });
    }
  };

  if (view === "admin") {
    return (
      <nav className="fixed top-0 inset-x-0 z-50 bg-[#111] border-b border-[#faf8f3]/10">
        <div className="max-w-[1300px] mx-auto px-5 lg:px-10 h-16 flex items-center justify-between">
          <Logo className="text-[#faf8f3]" onHome={() => onViewChange("main")} />
          <button onClick={() => onViewChange("main")} className="nav-link font-mono text-[11px] tracking-[0.18em] uppercase text-[#faf8f3]/70 hover:text-[#faf8f3]">
            ← Volver a la web
          </button>
        </div>
      </nav>
    );
  }

  const dark = !scrolled && !open;
  const ink = dark ? "text-[#faf8f3]" : "text-[#111]";
  const inkSoft = dark ? "text-[#faf8f3]/70 hover:text-[#faf8f3]" : "text-[#111]/65 hover:text-[#111]";
  const barLine = dark ? "bg-[#faf8f3]" : "bg-[#111]";

  return (
    <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${(scrolled || open) ? "bg-[#faf8f3]/92 backdrop-blur-md border-b border-[#111]/8" : "bg-transparent"}`}>
      <div className="max-w-[1300px] mx-auto px-5 lg:px-10 h-16 lg:h-20 flex items-center justify-between">
        <Logo className={ink} />

        <div className="hidden lg:flex items-center gap-9">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} onClick={(e) => go(e, l.href)} className={`nav-link font-mono text-[11px] tracking-[0.18em] uppercase ${inkSoft}`}>
              {l.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <a href="#reservas" onClick={(e) => go(e, "#reservas")} className="hidden sm:inline-flex btn btn-primary btn-sm">
            Reservar
          </a>
          <button onClick={() => setOpen(!open)} className="lg:hidden w-10 h-10 flex flex-col items-center justify-center gap-[5px]" aria-label="Menú">
            <span className={`block w-6 h-px ${barLine} transition-all ${open ? "rotate-45 translate-y-[3px]" : ""}`} />
            <span className={`block w-6 h-px ${barLine} transition-all ${open ? "opacity-0" : ""}`} />
            <span className={`block w-6 h-px ${barLine} transition-all ${open ? "-rotate-45 -translate-y-[3px]" : ""}`} />
          </button>
        </div>
      </div>

      {/* Mobile panel */}
      <div className={`lg:hidden fixed inset-0 top-16 bg-[#faf8f3] transition-all duration-500 ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
        <div className="px-6 pt-10 flex flex-col gap-1">
          {NAV_LINKS.map((l, i) => (
            <a key={l.href} href={l.href} onClick={(e) => go(e, l.href)} className="flex items-baseline gap-4 py-3 border-b border-[#111]/8">
              <span className="font-mono text-[10px] text-[#7a1f2b]">0{i + 1}</span>
              <span className="font-display text-3xl text-[#111]">{l.label}</span>
            </a>
          ))}
          <a href="#reservas" onClick={(e) => go(e, "#reservas")} className="btn btn-primary btn-lg mt-8">Reservar cita <span className="arr">→</span></a>
          <div className="flex gap-3 mt-3">
            <WhatsAppButton variant="inline" tone="light" size="md" label="WhatsApp" />
            <a href={`tel:${SALON.phoneRaw}`} className="btn btn-ghost text-[#111]">Llamar</a>
          </div>
        </div>
      </div>
    </nav>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section id="hero" className="relative bg-[#111] text-[#faf8f3] min-h-[100svh] flex items-center justify-center overflow-hidden">
      <div className="px-6 w-full max-w-4xl mx-auto text-center py-28">
        <Reveal>
          <p className="font-display font-normal text-[#faf8f3] text-[clamp(4rem,17vw,15rem)] leading-[0.85] tracking-[0.01em]">
            VELURE
          </p>
        </Reveal>
        <Reveal delay={140}>
          <p className="mt-7 lg:mt-9 mx-auto max-w-xl text-[#faf8f3]/55 text-[clamp(1rem,1.7vw,1.25rem)] leading-relaxed tracking-[0.01em]">
            Barbería de barrio, cortes con oficio.
          </p>
        </Reveal>
          <Reveal delay={280} className="mt-10 lg:mt-12 flex justify-center">
            <a href="#booking-calendar" className="btn btn-primary btn-lg">Reservar cita <span className="arr">→</span></a>
        </Reveal>
      </div>
    </section>
  );
}

// ─── Servicios ─────────────────────────────────────────────────────────────
function Services() {
  return (
    <section id="servicios" className="bg-white">
      <div className="max-w-[1300px] mx-auto px-5 lg:px-10 py-24 lg:py-32">
        <div className="grid lg:grid-cols-12 gap-8 items-end mb-14 lg:mb-20">
          <div className="lg:col-span-8">
            <Reveal>
              <Eyebrow n="01">La carta</Eyebrow>
              <h2 className="font-display text-[#111] text-[clamp(2.5rem,6vw,5rem)]">
                Servicios <span className="italic font-light text-[#111]/65">de la casa</span>
              </h2>
            </Reveal>
          </div>
          <div className="lg:col-span-4 lg:border-l lg:border-[#111]/10 lg:pl-8">
            <Reveal delay={120}>
              <p className="text-[#111]/55 leading-relaxed">Precios cerrados, sin sorpresas. Seis servicios, cuatro barberos con oficio. Elige o déjate asesorar en la silla.</p>
            </Reveal>
          </div>
        </div>

        <div className="border-t border-[#111]/10">
          {SERVICES.map((svc, i) => (
            <Reveal key={svc.num} delay={i * 60}>
              <div className="group grid grid-cols-12 gap-4 py-7 lg:py-8 border-b border-[#111]/10 items-center">
                <div className="col-span-2 lg:col-span-1 font-mono text-[12px] text-[#7a1f2b]">{svc.num}</div>
                <div className="col-span-10 lg:col-span-5">
                  <h3 className="font-display text-2xl lg:text-4xl text-[#111] leading-none group-hover:text-[#7a1f2b] transition-colors">{svc.title}</h3>
                  <p className="mt-2 text-[#111]/50 text-sm max-w-md leading-relaxed">{svc.desc}</p>
                </div>
                <div className="col-span-5 lg:col-span-3 font-mono text-[11px] tracking-[0.1em] text-[#111]/45">{svc.duration}</div>
                <div className="col-span-7 lg:col-span-3 flex items-center justify-end gap-4">
                  <span className="font-display text-3xl lg:text-4xl text-[#111]">{svc.price}<span className="text-base text-[#111]/45 ml-0.5">€</span></span>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Galería ───────────────────────────────────────────────────────────────
function Gallery() {
  return (
    <section id="galeria" className="bg-[#111]">
      <div className="max-w-[1300px] mx-auto px-5 lg:px-10 py-20 lg:py-28">
        <div className="flex items-end justify-between gap-4 mb-8">
          <Reveal>
            <Eyebrow tone="dark" n="02">El oficio</Eyebrow>
            <h2 className="font-display text-[#faf8f3] text-[clamp(2.2rem,5vw,4rem)]">Galería<span className="text-[#7a1f2b]">.</span></h2>
          </Reveal>
          <Reveal delay={120}>
            <a href="#booking-calendar" className="hidden sm:inline-flex nav-link font-mono text-[11px] tracking-[0.18em] text-[#faf8f3]/70 hover:text-[#faf8f3] pb-1">RESERVAR →</a>
          </Reveal>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 lg:gap-3">
          {GALLERY.map((g, i) => (
            <Reveal key={g.title} delay={i * 80}>
              <div className="gallery-item relative aspect-[4/5] md:aspect-[3/4]">
                <img src={g.src} alt={g.alt} />
                <div className="absolute inset-x-0 bottom-0 p-3 lg:p-4 z-10">
                  <span className="font-mono text-[9px] tracking-[0.2em] text-[#faf8f3]/65">{g.tag}</span>
                  <h3 className="font-display text-lg lg:text-2xl text-[#faf8f3] leading-none mt-1">{g.title}</h3>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Testimonios ───────────────────────────────────────────────────────────
function Testimonials() {
  const INTERVAL = 5200;
  const FADE = 460;
  const n = TESTIMONIALS.length;

  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const pausedRef = useRef(false);
  const accRef = useRef(0);
  useEffect(() => { pausedRef.current = paused; }, [paused]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = () => setReducedMotion(mq.matches);
    handler();
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);

  useEffect(() => {
    if (reducedMotion) { setVisible(true); setProgress(1); return; }
    accRef.current = 0;
    setProgress(0);
    setVisible(true);
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      if (!pausedRef.current) {
        accRef.current += dt;
        const t = accRef.current;
        if (t <= INTERVAL) {
          setProgress(t / INTERVAL);
        } else if (t <= INTERVAL + FADE) {
          setProgress(1);
          setVisible(false);
        } else {
          setIndex((i) => (i + 1) % n);
          accRef.current = 0;
          setProgress(0);
          setVisible(true);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [n, reducedMotion]);

  const go = (i: number) => {
    setIndex(i);
    accRef.current = 0;
    setProgress(0);
    setVisible(true);
  };

  const t = TESTIMONIALS[index];

  return (
    <section id="testimonios" className="bg-[#faf8f3]">
      <div className="max-w-[1300px] mx-auto px-5 lg:px-10 py-24 lg:py-32">
        <div className="grid lg:grid-cols-12 gap-8 items-end mb-14 lg:mb-20">
          <div className="lg:col-span-8">
            <Reveal>
              <Eyebrow n="03">Voces</Eyebrow>
              <h2 className="font-display text-[#111] text-[clamp(2.5rem,6vw,5rem)]">
                Lo que <span className="italic font-light text-[#111]/65">dicen</span>
              </h2>
            </Reveal>
          </div>
        </div>

        <Reveal>
          <div
            role="group"
            aria-roledescription="carrusel"
            aria-label="Testimonios de clientes"
            className="group relative max-w-3xl mx-auto text-center select-none"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocusCapture={() => setPaused(true)}
            onBlurCapture={() => setPaused(false)}
          >
            <span aria-hidden className="font-display text-7xl lg:text-8xl leading-[0.6] text-[#7a1f2b] block">&ldquo;</span>

            <div className="min-h-[230px] sm:min-h-[210px] lg:min-h-[230px] flex items-start justify-center">
              <figure
                className={`transition-all duration-[460ms] ease-[cubic-bezier(.2,.8,.2,1)] ${
                  visible ? "opacity-100 translate-y-0 blur-0" : "opacity-0 -translate-y-3 blur-[3px]"
                }`}
              >
                <blockquote className="font-display italic text-2xl md:text-3xl lg:text-[2.5rem] text-[#111] leading-[1.22] -mt-2">
                  {t.text}
                </blockquote>
                <figcaption className="mt-7 flex items-center justify-center gap-4">
                  <span className="font-sans font-bold text-[#111] tracking-wide">{t.name}</span>
                  <span className="w-6 h-px bg-[#111]/25" />
                  <span className="font-mono text-[10px] tracking-[0.18em] text-[#111]/45 uppercase">{t.where}</span>
                </figcaption>
              </figure>
            </div>

            <div className="mt-9 font-mono text-[11px] tracking-[0.25em] text-[#111]/40">
              <span className="text-[#7a1f2b]">{String(index + 1).padStart(2, "0")}</span>
              <span className="mx-2 text-[#111]/25">—</span>
              <span>{String(n).padStart(2, "0")}</span>
            </div>

            {!reducedMotion && (
              <div className="mt-4 mx-auto max-w-[14rem] h-px bg-[#111]/12 overflow-hidden">
                <div
                  className="h-full w-full origin-left bg-[#7a1f2b]"
                  style={{ transform: `scaleX(${progress})`, willChange: "transform" }}
                />
              </div>
            )}

            <div className="mt-6 flex items-center justify-center gap-3">
              {TESTIMONIALS.map((item, i) => (
                <button
                  key={item.name}
                  onClick={() => go(i)}
                  aria-label={`Ver testimonio ${i + 1} de ${n}`}
                  aria-current={i === index}
                  className={`h-px transition-all duration-500 ease-[cubic-bezier(.2,.8,.2,1)] ${
                    i === index ? "w-10 bg-[#7a1f2b]" : "w-6 bg-[#111]/20 hover:bg-[#111]/45"
                  }`}
                />
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ─── Reservas ──────────────────────────────────────────────────────────────
function Booking() {
  return (
    <section id="reservas" className="bg-[#faf8f3] scroll-mt-8">
      <div className="max-w-[1300px] mx-auto px-5 lg:px-10 py-24 lg:py-32">
        <div className="grid lg:grid-cols-12 gap-8 items-end mb-12">
          <div className="lg:col-span-7">
            <Reveal>
              <Eyebrow n="04">Agenda</Eyebrow>
              <h2 className="font-display text-[#111] text-[clamp(2.5rem,6vw,5rem)]">
                Reserva <span className="italic font-light text-[#111]/65">tu silla</span>
              </h2>
            </Reveal>
          </div>
          <div className="lg:col-span-5 lg:pl-12 lg:border-l lg:border-[#111]/10">
            <Reveal delay={120}>
              <p className="text-[#111]/55 leading-relaxed mb-5">Elige servicio, día y hora. Confirmación al instante. Si te equivocas, puedes volver atrás en cada paso antes de confirmar.</p>
              <ul className="space-y-2.5">
                {["Confirmación al instante", "Cambio o cancelación gratis con 24 h", "Recordatorio por WhatsApp 48 h antes"].map((t) => (
                  <li key={t} className="flex items-center gap-3 text-sm text-[#111]/70">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#7a1f2b] shrink-0" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                    {t}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>
        <Reveal>
          <div id="booking-calendar" className="bg-white border border-[#111]/12 rounded-2xl p-5 sm:p-8 lg:p-12 shadow-[0_24px_70px_-40px_rgba(17,17,17,0.35)]">
            <BookingCalendar />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ─── Ubicación ─────────────────────────────────────────────────────────────
function Location() {
  const { idx, hhmm, open } = getOpenStatus();
  const weekOrder = [1, 2, 3, 4, 5, 6, 0];
  return (
    <section id="ubicacion" className="bg-[#faf8f3]">
      <div className="max-w-[1300px] mx-auto px-5 lg:px-10 py-24 lg:py-32">
        <div className="grid lg:grid-cols-12 gap-8 items-end mb-12">
          <div className="lg:col-span-7">
            <Reveal>
              <Eyebrow n="05">Dónde estamos</Eyebrow>
              <h2 className="font-display text-[#111] text-[clamp(2.5rem,6vw,5rem)]">
                Ven a <span className="italic font-light text-[#111]/65">vernos</span>
              </h2>
            </Reveal>
          </div>
          <div className="lg:col-span-5 lg:pl-12 lg:border-l lg:border-[#111]/10">
            <Reveal delay={120}>
              <div className="flex items-center gap-2 mb-3 font-mono text-[11px] tracking-[0.15em]">
                <span className={`w-1.5 h-1.5 rounded-full ${open ? "bg-[#7a1f2b]" : "bg-[#111]/30"}`} />
                <span className={open ? "text-[#7a1f2b]" : "text-[#111]/50"}>{open ? "ABIERTO AHORA" : "CERRADO AHORA"} · {hhmm}</span>
              </div>
              <p className="text-[#111]/55 leading-relaxed">En el corazón de Madrid. Pásate, siéntate y sal con el corte que te define.</p>
            </Reveal>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-5 lg:gap-6">
          {/* Ficha */}
          <Reveal className="lg:col-span-5">
            <div className="bg-white border border-[#111]/10 p-6 lg:p-8 h-full flex flex-col">
              <div className="mb-6 pb-6 border-b border-[#111]/10">
                <span className="font-mono text-[10px] tracking-[0.2em] text-[#7a1f2b]">DIRECCIÓN</span>
                <p className="font-display text-3xl lg:text-4xl text-[#111] leading-[1] mt-2">{SALON.address}</p>
              </div>

              <div className="mb-6 pb-6 border-b border-[#111]/10">
                <span className="font-mono text-[10px] tracking-[0.2em] text-[#7a1f2b]">HORARIO</span>
                <ul className="mt-3 space-y-1">
                  {weekOrder.map((d) => {
                    const h = BUSINESS_HOURS[d];
                    const today = d === idx;
                    return (
                      <li key={d} className={`flex items-center justify-between py-1.5 px-2 -mx-2 text-[13px] ${today ? "bg-[#7a1f2b]/[0.07]" : ""}`}>
                        <span className="flex items-center gap-2">
                          {today && <span className="w-1.5 h-1.5 rounded-full bg-[#7a1f2b]" />}
                          <span className={`font-mono text-[11px] tracking-[0.1em] ${today ? "text-[#7a1f2b]" : "text-[#111]/60"}`}>
                            <span className="hidden sm:inline">{DAY_LABELS_FULL[d]}</span>
                            <span className="sm:inline lg:hidden">{DAY_LABELS[d]}</span>
                            {today && <span className="ml-2 text-[9px]">HOY</span>}
                          </span>
                        </span>
                        <span className={`font-mono text-[11px] ${h ? (today ? "text-[#111]" : "text-[#111]/70") : "text-[#111]/35"}`}>
                          {h ? `${h.open} – ${h.close}` : "CERRADO"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="space-y-2 mb-7">
                <a href={`tel:${SALON.phoneRaw}`} className="flex items-center justify-between group">
                  <span className="font-mono text-[10px] tracking-[0.2em] text-[#111]/40">TELÉFONO</span>
                  <span className="font-display text-xl text-[#111] group-hover:text-[#7a1f2b] transition-colors">{SALON.phoneDisplay}</span>
                </a>
                <a href={`mailto:${SALON.email}`} className="flex items-center justify-between group">
                  <span className="font-mono text-[10px] tracking-[0.2em] text-[#111]/40">EMAIL</span>
                  <span className="text-sm text-[#111]/75 group-hover:text-[#7a1f2b] transition-colors">{SALON.email}</span>
                </a>
              </div>

              <div className="mt-auto flex flex-col gap-3">
                <a href="#booking-calendar" className="btn btn-primary">Reservar cita <span className="arr">→</span></a>
                <div className="flex gap-3">
                  <a href={MAPS_DIR_URL} target="_blank" rel="noopener noreferrer" className="btn btn-ghost text-[#111] flex-1">Cómo llegar</a>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Mapa */}
          <Reveal delay={120} className="lg:col-span-7 flex flex-col">
            <div className="relative border border-[#111]/10 overflow-hidden h-80 lg:flex-1 lg:min-h-[460px]">
              <div className="absolute top-3 left-3 z-10 font-mono text-[10px] tracking-[0.15em] text-[#111] bg-white/90 backdrop-blur px-2.5 py-1.5 border border-[#111]/10 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-[#7a1f2b]" />
                {SALON.lat.toFixed(4)}°N · {Math.abs(SALON.lng).toFixed(4)}°O
              </div>
              <div className="absolute bottom-3 right-3 z-10 bg-[#111] px-3 py-2">
                <p className="font-display text-lg text-[#faf8f3] leading-none">VELURE</p>
                <p className="font-mono text-[9px] tracking-[0.2em] text-[#faf8f3]/70 mt-0.5">BARBER CO.</p>
              </div>
              <iframe
                title="Ubicación de VELURE Barber Co."
                src={MAPS_EMBED_URL}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="absolute inset-0 w-full h-full border-0"
                style={{ filter: "grayscale(0.2) contrast(1.02)" }}
              />
            </div>
            <a
              href={MAPS_DIR_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary mt-3 w-full sm:w-auto sm:self-start"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11Z" />
                <circle cx="12" cy="10" r="2.5" />
              </svg>
              Cómo llegar
              <span className="arr">→</span>
            </a>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

// ─── Cierre oscuro: CTA dominante + footer ─────────────────────────────────
function ClosingDark({ onViewChange }: { onViewChange: (v: ViewType) => void }) {
  return (
    <div className="bg-[#111] text-[#faf8f3]">
      {/* CTA de cierre */}
      <section className="border-b border-[#faf8f3]/10">
        <div className="max-w-[1300px] mx-auto px-5 lg:px-10 py-24 lg:py-32 grid lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          <div className="lg:col-span-7">
            <Reveal>
              <Eyebrow tone="dark" n="06">Agenda</Eyebrow>
              <h2 className="font-display text-[#faf8f3] text-[clamp(2.8rem,7vw,6rem)]">
                ¿Cuándo<br /><span className="italic font-light">te sentamos?</span>
              </h2>
            </Reveal>
          </div>
          <div className="lg:col-span-5 lg:border-l lg:border-[#faf8f3]/12 lg:pl-10">
            <Reveal delay={120} className="flex flex-col gap-4">
              <a href="#booking-calendar" className="btn btn-primary btn-lg">Reservar cita <span className="arr">→</span></a>
              <div className="flex flex-wrap gap-3">
                <a href={MAPS_DIR_URL} target="_blank" rel="noopener noreferrer" className="btn btn-ghost text-[#faf8f3]">Cómo llegar</a>
              </div>
              <p className="font-mono text-[10px] tracking-[0.15em] text-[#faf8f3]/40 mt-2">CONFIRMACIÓN AL INSTANTE · WHATSAPP O WEB</p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-[1300px] mx-auto px-5 lg:px-10 py-16 lg:py-20">
        <div className="grid md:grid-cols-12 gap-10 lg:gap-12">
          <div className="md:col-span-5">
            <Logo className="text-[#faf8f3]" />
            <p className="mt-5 text-[#faf8f3]/50 max-w-sm leading-relaxed text-sm">
              Barbería de oficio en Madrid. Cuatro barberos, una idea: el detalle por encima de todo.
            </p>
          </div>
          <div className="md:col-span-3">
            <h4 className="font-mono text-[10px] tracking-[0.2em] text-[#faf8f3]/45 mb-5">LA CASA</h4>
            <ul className="space-y-2.5">
              {NAV_LINKS.map((l) => (
                <li key={l.href}><a href={l.href} className="nav-link text-sm text-[#faf8f3]/60 hover:text-[#faf8f3] pb-0.5">{l.label}</a></li>
              ))}
            </ul>
          </div>
          <div className="md:col-span-4">
            <h4 className="font-mono text-[10px] tracking-[0.2em] text-[#faf8f3]/45 mb-5">DÓNDE / CUÁNDO</h4>
            <div className="space-y-3 text-sm text-[#faf8f3]/60">
              <p>{SALON.address}</p>
              <p>{SALON.phoneDisplay}<br />{SALON.email}</p>
              <p className="font-mono text-[10px] tracking-[0.1em] text-[#faf8f3]/40 pt-2 border-t border-[#faf8f3]/10 leading-relaxed">
                MAR–VIE · 09:00–20:00<br />SÁB · 09:00–20:00<br />DOM · 10:00–15:00<br />LUN · CERRADO
              </p>
            </div>
            <button onClick={() => onViewChange("admin")} className="mt-6 nav-link font-mono text-[10px] tracking-[0.18em] text-[#faf8f3]/35 hover:text-[#faf8f3] pb-1">
              → ACCESO INTERNO
            </button>
          </div>
        </div>
        <div className="mt-14 pt-6 border-t border-[#faf8f3]/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <p className="font-mono text-[10px] tracking-[0.15em] text-[#faf8f3]/30">© {new Date().getFullYear()} VELURE BARBER CO. · MADRID</p>
          <div className="flex gap-5 font-mono text-[10px] tracking-[0.15em]">
            <a href="#" className="text-[#faf8f3]/30 hover:text-[#faf8f3]">LEGAL</a>
            <a href="#" className="text-[#faf8f3]/30 hover:text-[#faf8f3]">PRIVACIDAD</a>
            <a href="#" className="text-[#faf8f3]/30 hover:text-[#faf8f3]">COOKIES</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── App ───────────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState<ViewType>("main");
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    const path = window.location.pathname.replace(/\/+$/, "");
    const wantsAdmin =
      path === "/admin" ||
      new URLSearchParams(window.location.search).get("admin") === "1" ||
      window.location.hash.replace(/^#/, "") === "admin";
    if (wantsAdmin) setView("admin");
  }, []);

  const handleExitAdmin = () => {
    setView("main");
    const path = window.location.pathname.replace(/\/+$/, "");
    const params = new URLSearchParams(window.location.search);
    const hadQuery = params.get("admin") === "1";
    const hadHash = window.location.hash.replace(/^#/, "") === "admin";
    if (path === "/admin" || hadQuery || hadHash) {
      params.delete("admin");
      const search = params.toString();
      window.history.replaceState(null, "", "/" + (search ? `?${search}` : ""));
    }
  };

  return (
    <div className="min-h-screen bg-[#faf8f3] text-[#111]">
      {showIntro && <Intro onDone={() => setShowIntro(false)} />}
      <div>
        <Navbar view={view} onViewChange={setView} />

        {view === "main" && (
          <>
            <main>
              <Hero />
              <Services />
              <Gallery />
              <Testimonials />
              <Booking />
              <Location />
            </main>
            <ClosingDark onViewChange={setView} />
            <WhatsAppButton variant="float" />
          </>
        )}

        {view === "admin" && <AdminPanel onLogout={handleExitAdmin} />}
      </div>
    </div>
  );
}
