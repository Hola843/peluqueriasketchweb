import { useEffect, useRef, useState } from "react";

const CSS = `
.iv-root{
  position:fixed;inset:0;z-index:300;
  display:flex;flex-direction:column;
  align-items:center;justify-content:center;
  overflow:hidden;
  background:#0a0a0a;
}
.iv-root.slide-up{
  transform:translateY(-100%);
  transition:transform 1s cubic-bezier(.65,0,.35,1);
}

/* ── Tijeras ── */
.iv-scissors-wrap{
  position:absolute;
  top:22%;
  left:50%;
  margin-left:-34px;
  width:68px;height:68px;
  display:flex;align-items:center;justify-content:center;
  opacity:0;
  transform:scale(0.6);
  z-index:2;
}

/* Aparecen y se quedan quietas */
[data-phase="1"] .iv-scissors-wrap{
  opacity:1;
  transform:scale(1);
  transition:opacity .4s ease, transform .4s cubic-bezier(.2,.8,.2,1);
}

/* Se van a la izquierda cortando */
[data-phase="2"] .iv-scissors-wrap{
  opacity:1;
  animation:iv-cut-away 2.4s cubic-bezier(.4,0,.2,1) forwards;
}
@keyframes iv-cut-away{
  0%{transform:translateX(0) scale(1) rotate(0deg)}
  10%{transform:translateX(-15px) scale(1.05) rotate(8deg)}
  25%{transform:translateX(-50px) scale(1) rotate(18deg)}
  50%{transform:translateX(-150px) scale(.85) rotate(28deg);opacity:1}
  80%{transform:translateX(-320px) scale(.6) rotate(35deg);opacity:.5}
  100%{transform:translateX(-600px) scale(.4) rotate(42deg);opacity:0}
}

.iv-scissors{
  width:100%;height:100%;
  color:#faf8f3;
}

/* Las hojas cortan mientras se mueven */
[data-phase="2"] .iv-blade-top{animation:iv-snip-cut .32s ease infinite}
[data-phase="2"] .iv-blade-bot{animation:iv-snip-cut-bot .32s ease infinite}
@keyframes iv-snip-cut{
  0%{transform:rotate(0)}
  40%{transform:rotate(-22deg)}
  100%{transform:rotate(0)}
}
@keyframes iv-snip-cut-bot{
  0%{transform:rotate(0)}
  40%{transform:rotate(22deg)}
  100%{transform:rotate(0)}
}

/* ── Pelo cayendo ── */
[data-phase="2"] .iv-hair{
  position:absolute;
  border-radius:1px;
  opacity:0;
  animation:iv-hair-fall 1.6s ease var(--hd) forwards;
}
@keyframes iv-hair-fall{
  0%{opacity:0;transform:translateY(0) rotate(var(--hr))}
  15%{opacity:.65}
  100%{opacity:0;transform:translateY(120px) rotate(var(--hr2)) translateX(var(--hx))}
}

/* ── Texto VELURE ── */
.iv-word{display:flex;gap:0;position:relative;z-index:1}
.iv-letter{
  display:inline-block;
  font-family:Georgia,'Times New Roman',serif;
  font-size:clamp(3rem,13vw,6.5rem);
  font-weight:400;letter-spacing:.06em;
  color:#faf8f3;
  opacity:0;
  transform:translateY(30px) scaleY(.7);
  transform-origin:bottom center;
}
[data-phase="2"] .iv-letter{
  animation:iv-letter-in .7s cubic-bezier(.2,.8,.2,1) var(--ld) forwards;
}
@keyframes iv-letter-in{
  0%{opacity:0;transform:translateY(30px) scaleY(.7)}
  60%{opacity:1;transform:translateY(-3px) scaleY(1.04)}
  100%{opacity:1;transform:translateY(0) scaleY(1)}
}

/* Línea decorativa */
.iv-line{width:0;height:2px;background:#7a1f2b;margin:12px auto 0;opacity:0;position:relative;z-index:1}
[data-phase="2"] .iv-line{animation:iv-line-in .8s ease 1.5s forwards}
@keyframes iv-line-in{to{width:clamp(60px,20vw,140px);opacity:1}}

/* Subtítulo */
.iv-sub{
  font-family:monospace;font-size:11px;letter-spacing:.4em;
  color:rgba(250,248,243,.40);text-transform:uppercase;
  text-align:center;opacity:0;margin-top:10px;
  position:relative;z-index:1;
}
[data-phase="2"] .iv-sub{animation:iv-fade-sub .6s ease 1.9s forwards}
@keyframes iv-fade-sub{to{opacity:1}}

/* ── Barra de progreso ── */
.iv-bar{position:absolute;bottom:0;left:0;right:0;height:2px;background:rgba(250,248,243,.06);z-index:3}
.iv-bar span{display:block;height:100%;width:100%;background:#7a1f2b;transform:scaleX(0);transform-origin:left center;animation:iv-prog 4s linear forwards}
@keyframes iv-prog{to{transform:scaleX(1)}}

/* ── Botón saltar ── */
.iv-skip{
  position:absolute;right:20px;bottom:18px;z-index:4;
  font-family:monospace;font-size:10px;letter-spacing:.2em;
  color:rgba(250,248,243,.30);
  background:none;border:1px solid rgba(250,248,243,.10);
  border-radius:999px;padding:7px 14px;cursor:pointer;
  transition:color .25s,border-color .25s;
}
.iv-skip:hover{color:#7a1f2b;border-color:#7a1f2b}

@media (prefers-reduced-motion: reduce){
  .iv-root{transition-duration:.001ms!important}
  .iv-scissors-wrap{opacity:1!important;transform:scale(1)!important;animation:none!important}
  .iv-blade-top,.iv-blade-bot{animation:none!important}
  .iv-hair{display:none!important}
  .iv-letter{opacity:1!important;transform:none!important}
  .iv-line{width:clamp(60px,20vw,140px)!important;opacity:1!important}
  .iv-sub{opacity:1!important}
}
`;

function ScissorsSVG() {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" className="iv-scissors" aria-hidden>
      <g className="iv-blade-top" style={{ transformOrigin: "24px 28.5px" }}>
        <path d="M24 28.5 L13.5 7" />
        <path d="M24 28.5 L17.5 37.5" />
        <circle cx="15" cy="40" r="3.1" />
      </g>
      <g className="iv-blade-bot" style={{ transformOrigin: "24px 28.5px" }}>
        <path d="M24 28.5 L34.5 7" />
        <path d="M24 28.5 L30.5 37.5" />
        <circle cx="33" cy="40" r="3.1" />
      </g>
      <circle cx="24" cy="28.5" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

const HAIRS = Array.from({ length: 16 }).map((_, i) => {
  const w = 1 + (i % 3);
  const h = 10 + (i * 7) % 18;
  return {
    left: `${28 + (i * 2.8)}%`,
    top: `${15 + (i % 5) * 6}%`,
    hd: `${0.1 + i * 0.08}s`,
    hr: `${-20 + (i * 13) % 40}deg`,
    hr2: `${-25 + (i * 17) % 50}deg`,
    hx: `${8 + (i * 7) % 30}px`,
    w: `${w}px`,
    h: `${h}px`,
  };
});

export default function Intro({ onDone }: { onDone: () => void }) {
  const [show, setShow] = useState(false);
  const [phase, setPhase] = useState(0);
  const [sliding, setSliding] = useState(false);
  const done = useRef(false);

  const reduced =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const onDoneRef = useRef(onDone);
  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);

  useEffect(() => {
    setShow(true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const finish = () => {
      if (done.current) return;
      done.current = true;
      setSliding(true);
      setTimeout(() => {
        document.body.style.overflow = prev;
        onDoneRef.current();
      }, 1100);
    };

    (window as any).__velureIntroSkip = finish;

    if (reduced) {
      setPhase(1);
      const t = window.setTimeout(finish, 300);
      return () => { clearTimeout(t); document.body.style.overflow = prev; };
    }

    // 0.3s → tijeras aparecen (se quedan quietas 1 segundo)
    // 1.3s → empiezan a cortarse + se van a la izquierda + pelos + VELURE
    // 4s → slide up
    const t1 = window.setTimeout(() => setPhase(1), 300);
    const t2 = window.setTimeout(() => setPhase(2), 1300);
    const t3 = window.setTimeout(finish, 4000);

    return () => {
      [t1, t2, t3].forEach(clearTimeout);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!show) return null;

  const skip = () => (window as any).__velureIntroSkip?.();

  const letters = "VELURE".split("");
  const letterDelay = 0.25;

  return (
    <div className={`iv-root ${sliding ? "slide-up" : ""}`} data-phase={phase}>
      <style>{CSS}</style>

      {/* Tijeras */}
      <div className="iv-scissors-wrap">
        <ScissorsSVG />
      </div>

      {/* Pelo cayendo */}
      {phase >= 2 && HAIRS.map((h, i) => (
        <span
          key={i}
          className="iv-hair"
          style={{
            left: h.left,
            top: h.top,
            width: h.w,
            height: h.h,
            background: `rgba(250,248,243,${0.15 + (i % 3) * 0.08})`,
            ["--hd" as string]: h.hd,
            ["--hr" as string]: h.hr,
            ["--hr2" as string]: h.hr2,
            ["--hx" as string]: h.hx,
          }}
        />
      ))}

      {/* Texto VELURE */}
      <div className="iv-word">
        {letters.map((c, i) => (
          <span
            key={i}
            className="iv-letter"
            style={{ ["--ld" as string]: `${0.2 + i * letterDelay}s` }}
          >
            {c}
          </span>
        ))}
      </div>
      <div className="iv-line" />
      <div className="iv-sub">BARBER CO. · MADRID</div>

      <div className="iv-bar"><span /></div>
      <button className="iv-skip" onClick={skip}>SALTAR</button>
    </div>
  );
}
