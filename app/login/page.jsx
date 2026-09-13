"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// ---------- Formas del morph (preforma / sobrepaso / botella) ----------
const PREFORM = [80,20,120,20, 120,20,120,40,120,55, 120,55,120,58,120,62, 120,285, 120,300,80,300,80,285, 80,62, 80,58,80,58,80,55, 80,55,80,40,80,20];
const OVERSHOOT = [80,20,120,20, 120,20,120,40,120,55, 120,58,155,72,180,110, 180,268, 180,300,20,300,20,268, 20,110, 45,72,80,58,80,55, 80,55,80,40,80,20];
const BOTTLE = [80,20,120,20, 120,20,120,40,120,55, 120,58,148,75,168,115, 168,265, 168,298,32,298,32,265, 32,115, 52,75,80,58,80,55, 80,55,80,40,80,20];

function buildPath(n) {
  return `M${n[0]},${n[1]} L${n[2]},${n[3]} `
    + `C${n[4]},${n[5]} ${n[6]},${n[7]} ${n[8]},${n[9]} `
    + `C${n[10]},${n[11]} ${n[12]},${n[13]} ${n[14]},${n[15]} `
    + `L${n[16]},${n[17]} `
    + `C${n[18]},${n[19]} ${n[20]},${n[21]} ${n[22]},${n[23]} `
    + `L${n[24]},${n[25]} `
    + `C${n[26]},${n[27]} ${n[28]},${n[29]} ${n[30]},${n[31]} `
    + `C${n[32]},${n[33]} ${n[34]},${n[35]} ${n[36]},${n[37]} Z`;
}

function lerpArr(a, b, t) {
  const out = new Array(a.length);
  for (let i = 0; i < a.length; i++) out[i] = a[i] + (b[i] - a[i]) * t;
  return out;
}

function makeBezierEase(x1, y1, x2, y2) {
  const sampleX = (t) => { const mt = 1 - t; return 3*mt*mt*t*x1 + 3*mt*t*t*x2 + t*t*t; };
  const sampleY = (t) => { const mt = 1 - t; return 3*mt*mt*t*y1 + 3*mt*t*t*y2 + t*t*t; };
  const solveT = (x) => {
    let t = x;
    for (let i = 0; i < 6; i++) {
      const xEst = sampleX(t) - x;
      if (Math.abs(xEst) < 1e-4) return t;
      const d = 3*(1-t)*(1-t)*x1 + 6*(1-t)*t*(x2-x1) + 3*t*t*(1-x2);
      if (Math.abs(d) < 1e-6) break;
      t -= xEst / d;
    }
    return t;
  };
  return (x) => sampleY(solveT(Math.min(Math.max(x, 0), 1)));
}

const mechSnap = makeBezierEase(0.87, 0, 0.13, 1);
const elasticOut = makeBezierEase(0.34, 1.56, 0.64, 1);
const easeIn = makeBezierEase(0.55, 0, 1, 0.45);
const easeOut = makeBezierEase(0, 0.55, 0.45, 1);

const CYCLE = 6400;
const T = { t1: 1300, t2: 2050, t3: 2500, t4: 4800, t5: 5100, t6: 5150, t7: 5400 };
const GHOST_OFFSETS = [70, 140, 210];
const GHOST_OPACITY = [0.16, 0.09, 0.045];

function computeState(t) {
  let shape, opacity = 1, squeeze = 1, flash = 0, stage = "preforma";
  if (t < T.t1) {
    shape = PREFORM;
  } else if (t < T.t2) {
    const p = mechSnap((t - T.t1) / (T.t2 - T.t1));
    shape = lerpArr(PREFORM, OVERSHOOT, p);
    flash = p < 0.35 ? p / 0.35 : Math.max(0, 1 - (p - 0.35) / 0.65);
    stage = "soplado";
  } else if (t < T.t3) {
    const p = elasticOut((t - T.t2) / (T.t3 - T.t2));
    shape = lerpArr(OVERSHOOT, BOTTLE, p);
    squeeze = 1 - Math.sin(p * Math.PI) * 0.05;
    flash = Math.max(0, 0.25 - p * 0.25);
    stage = "soplado";
  } else if (t < T.t4) {
    shape = BOTTLE; stage = "botella";
  } else if (t < T.t5) {
    shape = BOTTLE;
    opacity = 1 - easeIn((t - T.t4) / (T.t5 - T.t4));
    stage = "botella";
  } else if (t < T.t6) {
    shape = BOTTLE; opacity = 0;
  } else if (t < T.t7) {
    shape = PREFORM;
    opacity = easeOut((t - T.t6) / (T.t7 - T.t6));
  } else {
    shape = PREFORM;
  }
  return { shape, opacity, squeeze, flash, stage };
}

export default function LoginPage() {
  const router = useRouter();

  const panelRef = useRef(null);
  const canvasRef = useRef(null);
  const morphPathRef = useRef(null);
  const morphGroupRef = useRef(null);
  const neckFlashRef = useRef(null);
  const ghostsGRef = useRef(null);
  const burstGRef = useRef(null);
  const lblPreformaRef = useRef(null);
  const lblSopladoRef = useRef(null);
  const lblBotellaRef = useRef(null);
  const ghostPathsRef = useRef([]);
  const bokehRef = useRef([]);
  const rafRef = useRef(null);

  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [pouring, setPouring] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // ---------- Spotlight que sigue el cursor ----------
  useEffect(() => {
    const panel = panelRef.current;
    function onMove(e) {
      const r = panel.getBoundingClientRect();
      const mx = ((e.clientX - r.left) / r.width) * 100;
      const my = ((e.clientY - r.top) / r.height) * 100;
      panel.style.setProperty("--mx", mx + "%");
      panel.style.setProperty("--my", my + "%");
    }
    panel.addEventListener("mousemove", onMove);
    return () => panel.removeEventListener("mousemove", onMove);
  }, []);

  // ---------- Animación: morph + partículas + bokeh ----------
  useEffect(() => {
    const svgNS = "http://www.w3.org/2000/svg";
    const ghostsG = ghostsGRef.current;
    ghostPathsRef.current = GHOST_OFFSETS.map(() => {
      const p = document.createElementNS(svgNS, "path");
      p.setAttribute("fill", "url(#bottleGrad)");
      p.setAttribute("opacity", "0");
      ghostsG.appendChild(p);
      return p;
    });

    const panel = panelRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    function resizeCanvas() {
      const r = panel.getBoundingClientRect();
      canvas.width = r.width * devicePixelRatio;
      canvas.height = r.height * devicePixelRatio;
      canvas.style.width = r.width + "px";
      canvas.style.height = r.height + "px";
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      if (bokehRef.current.length === 0) {
        const count = Math.max(6, Math.round((r.width * r.height) / 45000));
        for (let i = 0; i < count; i++) {
          bokehRef.current.push({
            x: Math.random() * r.width,
            y: Math.random() * r.height,
            r: 30 + Math.random() * 70,
            vx: (Math.random() - 0.5) * 0.06,
            vy: -0.05 - Math.random() * 0.08,
            a: 0.02 + Math.random() * 0.035,
            hue: Math.random() > 0.25 ? "green" : "amber",
          });
        }
      }
    }
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    function drawBokeh() {
      const r = panel.getBoundingClientRect();
      ctx.clearRect(0, 0, r.width, r.height);
      for (const p of bokehRef.current) {
        p.x += p.vx; p.y += p.vy;
        if (p.y < -p.r) { p.y = r.height + p.r; p.x = Math.random() * r.width; }
        if (p.x < -p.r) p.x = r.width + p.r;
        if (p.x > r.width + p.r) p.x = -p.r;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        const color = p.hue === "green" ? "63,198,184" : "91,194,234";
        g.addColorStop(0, `rgba(${color},${p.a})`);
        g.addColorStop(1, `rgba(${color},0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    let burstFired = false;

    function spawnBurst() {
      const burstG = burstGRef.current;
      burstG.innerHTML = "";
      const cx = 100, cy = 42, n = 10;
      for (let i = 0; i < n; i++) {
        const angle = (Math.PI * 2 * i) / n + (Math.random() - 0.5) * 0.4;
        const dist = 34 + Math.random() * 22;
        const dot = document.createElementNS(svgNS, "circle");
        dot.setAttribute("cx", cx);
        dot.setAttribute("cy", cy);
        dot.setAttribute("r", 2 + Math.random() * 1.8);
        dot.setAttribute("fill", Math.random() > 0.55 ? "#E8823A" : (Math.random() > 0.5 ? "#5BC2EA" : "#3FC6B8"));
        burstG.appendChild(dot);
        const tx = Math.cos(angle) * dist;
        const ty = Math.sin(angle) * dist;
        const bornAt = performance.now();
        const dur = 420 + Math.random() * 180;
        (function tick() {
          function step(now) {
            const p = Math.min(1, (now - bornAt) / dur);
            const ease = 1 - Math.pow(1 - p, 2);
            dot.setAttribute("cx", cx + tx * ease);
            dot.setAttribute("cy", cy + ty * ease);
            dot.setAttribute("opacity", String(1 - p));
            if (p < 1) requestAnimationFrame(step);
            else dot.remove();
          }
          requestAnimationFrame(step);
        })();
      }
    }

    const start = performance.now();

    function frame(now) {
      const t = (now - start) % CYCLE;
      const state = computeState(t);

      morphPathRef.current.setAttribute("d", buildPath(state.shape));
      morphGroupRef.current.style.opacity = state.opacity;
      morphGroupRef.current.style.transform = `scale(1, ${state.squeeze})`;

      neckFlashRef.current.setAttribute("opacity", state.flash);
      neckFlashRef.current.setAttribute("r", 18 + state.flash * 22);

      ghostPathsRef.current.forEach((gp, i) => {
        let ghostT = t - GHOST_OFFSETS[i];
        if (ghostT < 0) ghostT += CYCLE;
        const gState = computeState(ghostT);
        gp.setAttribute("d", buildPath(gState.shape));
        const activeMotion = t > T.t1 && t < T.t3 ? 1 : 0;
        gp.setAttribute("opacity", String(GHOST_OPACITY[i] * activeMotion * state.opacity));
      });

      if (t >= T.t1 && t < T.t1 + 40) {
        if (!burstFired) { burstFired = true; spawnBurst(); }
      } else if (t < T.t1) {
        burstFired = false;
      }

      lblPreformaRef.current.classList.toggle("on", state.stage === "preforma");
      lblSopladoRef.current.classList.toggle("on", state.stage === "soplado");
      lblBotellaRef.current.classList.toggle("on", state.stage === "botella");

      drawBokeh();
      rafRef.current = requestAnimationFrame(frame);
    }
    rafRef.current = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg("");
    setPouring(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "No se pudo iniciar sesión.");
        setPouring(false);
        return;
      }

      router.push("/dashboard");
    } catch {
      setErrorMsg("Error de conexión. Intenta de nuevo.");
      setPouring(false);
    }
  }

  return (
    <>
      <style>{css}</style>
      <div className="screen">
        <section className="process" ref={panelRef}>
          <canvas className="bokeh-canvas" ref={canvasRef} />

          <div className="brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-multisoplado-white.png" alt="MULTISOPLADO S.A.S." />
            <div className="brand-sub">Control de planta · Multisoplado</div>
          </div>

          <div className="process-stage">
            <div className="process-row">
              <div className="process-copy">
                <h1>De materia prima a botella, todo en un mismo lugar.</h1>
                <p>Registra lotes, controla merma y sigue el cumplimiento de metas de producción en tiempo real.</p>
                <div className="stage-labels">
                  <span ref={lblPreformaRef} className="on">Preforma</span>
                  <span ref={lblSopladoRef}>Soplado</span>
                  <span ref={lblBotellaRef}>Botella</span>
                </div>
              </div>

              <div className="bottle-stage">
                <svg viewBox="0 0 200 320" width="100%" height="auto" style={{ overflow: "visible" }}>
                  <defs>
                    <linearGradient id="bottleGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#3FC6B8" />
                      <stop offset="100%" stopColor="#123B7A" />
                    </linearGradient>
                    <radialGradient id="flashGrad" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#FFD9A8" stopOpacity="0.95" />
                      <stop offset="40%" stopColor="#E8823A" stopOpacity="0.55" />
                      <stop offset="100%" stopColor="#E8823A" stopOpacity="0" />
                    </radialGradient>
                    <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="6" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                    <filter id="softBlurSm" x="-100%" y="-100%" width="300%" height="300%">
                      <feGaussianBlur stdDeviation="3" />
                    </filter>
                  </defs>

                  <g ref={ghostsGRef} opacity="0.9"></g>
                  <circle ref={neckFlashRef} cx="100" cy="42" r="26" fill="url(#flashGrad)" filter="url(#softBlurSm)" opacity="0" />
                  <g ref={burstGRef}></g>

                  <g ref={morphGroupRef} style={{ transformOrigin: "100px 160px" }}>
                    <path
                      ref={morphPathRef}
                      fill="url(#bottleGrad)"
                      stroke="rgba(255,255,255,0.35)"
                      strokeWidth="1.5"
                      filter="url(#softGlow)"
                      d="M80,20 L120,20 C120,20 120,40 120,55 C120,55 120,58 120,62 L120,285 C120,300 80,300 80,285 L80,62 C80,58 80,58 80,55 C80,55 80,40 80,20 Z"
                    />
                  </g>
                </svg>
              </div>
            </div>
          </div>

          <div className="footer-status">
            <div className="status-left">
              <span className="dot"></span>
              Planta activa · Turno en curso
            </div>
          </div>
        </section>

        <section className="login">
          <div className="login-box">
            <div className="mark">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-multisoplado-icon.png" alt="" />
            </div>
            <h2>Iniciar sesión</h2>
            <p className="hint">Ingresa tus credenciales para continuar</p>

            <form onSubmit={handleSubmit}>
              <div className="field">
                <input
                  id="usuario"
                  type="text"
                  placeholder=" "
                  autoComplete="username"
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  className={usuario ? "filled" : ""}
                />
                <label htmlFor="usuario">Usuario</label>
              </div>
              <div className="field">
                <input
                  id="password"
                  type="password"
                  placeholder=" "
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={password ? "filled" : ""}
                />
                <label htmlFor="password">Contraseña</label>
              </div>

              {errorMsg && <p className="error-msg">{errorMsg}</p>}

              <div className="row-between">
                <label className="checkbox">
                  <input type="checkbox" />
                  Recordarme
                </label>
                <a href="#">¿Olvidaste tu contraseña?</a>
              </div>

              <button className={"btn-primary" + (pouring ? " pouring" : "")} type="submit">
                <span className="fill"></span>
                <span className="label">{pouring ? "Entrando..." : "Entrar"}</span>
              </button>
            </form>

            <div className="login-footer">
              Sistema Multisoplado — acceso restringido a personal autorizado
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

const css = `
:root{
  --ink:#16213A; --ink-soft:#4E5A72; --pine:#0F2148; --pine-2:#1B3E73;
  --brand-dark:#123B7A; --brand:#2A6FE0; --brand-light:#3FC6B8; --amber:#E8823A;
  --surface:#F4F5F2; --surface-2:#E9EBE5; --line:#D8DCD3; --white:#FFFFFF;
}
*{ box-sizing:border-box; }
.screen{ display:grid; grid-template-columns:58fr 42fr; min-height:100vh; font-family:'Inter',sans-serif; color:var(--ink); }
.process{ position:relative; background:
    radial-gradient(600px 500px at var(--mx,20%) var(--my,20%), rgba(156,203,75,0.10), transparent 55%),
    linear-gradient(180deg, var(--pine) 0%, var(--pine-2) 100%);
  color:#fff; padding:48px 56px; display:flex; flex-direction:column; justify-content:space-between; overflow:hidden; }
.bokeh-canvas{ position:absolute; inset:0; width:100%; height:100%; z-index:1; pointer-events:none; }
.brand{ display:flex; align-items:center; position:relative; z-index:2; }
.brand img{ height:30px; display:block; }
.brand-sub{ font-size:12.5px; letter-spacing:0.03em; color:rgba(255,255,255,0.5); margin-left:16px; padding-left:16px; border-left:1px solid rgba(255,255,255,0.18); }
.process-stage{ flex:1; display:flex; align-items:center; justify-content:center; padding:12px 0; position:relative; z-index:2; }
.process-row{ display:flex; align-items:center; gap:48px; max-width:620px; width:100%; }
.process-copy h1{ font-family:'Space Grotesk',sans-serif; font-weight:600; font-size:clamp(24px,2.4vw,33px); line-height:1.18; margin:0 0 12px 0; }
.process-copy p{ font-size:14.5px; line-height:1.6; color:rgba(255,255,255,0.6); margin:0 0 20px 0; }
.stage-labels{ display:flex; justify-content:space-between; font-family:'Space Grotesk',sans-serif; font-size:11.5px; letter-spacing:0.03em; color:rgba(255,255,255,0.4); max-width:190px; }
.stage-labels span{ transition:color 0.3s ease; }
.stage-labels span.on{ color:var(--brand-light); }
.bottle-stage{ flex-shrink:0; width:190px; position:relative; }
.footer-status{ display:flex; align-items:center; gap:10px; font-size:13px; color:rgba(255,255,255,0.4); border-top:1px solid rgba(255,255,255,0.1); padding-top:18px; position:relative; z-index:2; }
.dot{ width:7px; height:7px; border-radius:50%; background:var(--brand-light); box-shadow:0 0 0 3px rgba(63,198,184,0.25); }
.login{ background:var(--surface); display:flex; align-items:center; justify-content:center; padding:40px; }
.login-box{ width:100%; max-width:360px; }
.login-box .mark{ margin-bottom:28px; }
.login-box .mark img{ height:34px; }
.login-box h2{ font-family:'Space Grotesk',sans-serif; font-size:23px; font-weight:600; margin:0 0 6px 0; }
.login-box .hint{ font-size:14px; color:var(--ink-soft); margin:0 0 30px 0; }
.field{ position:relative; margin-bottom:22px; }
.field input{ width:100%; padding:18px 14px 8px 14px; font-size:14.5px; color:var(--ink); background:#fff; border:1.5px solid var(--line); border-radius:4px; outline:none; transition:border-color 0.2s ease; }
.field input:focus{ border-color:var(--brand); }
.field label{ position:absolute; left:14px; top:16px; font-size:14.5px; color:#8B948C; pointer-events:none; transform-origin:left top; transition:transform 0.18s cubic-bezier(0.4,0,0.2,1), color 0.18s ease, top 0.18s ease; }
.field input:focus + label, .field input.filled + label{ top:8px; transform:scale(0.74); color:var(--brand-dark); font-weight:600; }
.error-msg{ color:#C0392B; font-size:13.5px; margin:-10px 0 16px 0; }
.row-between{ display:flex; align-items:center; justify-content:space-between; margin:4px 0 26px 0; font-size:13px; flex-wrap:wrap; gap:8px; }
.checkbox{ display:flex; align-items:center; gap:8px; color:var(--ink-soft); }
.checkbox input{ accent-color:var(--brand); width:14px; height:14px; }
.row-between a{ color:var(--brand-dark); text-decoration:none; font-weight:500; }
.row-between a:hover{ text-decoration:underline; }
.btn-primary{ position:relative; width:100%; padding:14px; font-size:14.5px; font-weight:600; color:#fff; background:var(--brand-dark); border:none; border-radius:4px; cursor:pointer; overflow:hidden; isolation:isolate; transition:transform 0.12s ease; }
.btn-primary:hover{ filter:brightness(1.08); }
.btn-primary:active{ transform:scale(0.98); }
.btn-primary .fill{ position:absolute; inset:0; background:var(--brand-light); transform:scaleX(0); transform-origin:left; z-index:-1; }
.btn-primary.pouring .fill{ animation:pour 0.65s cubic-bezier(0.65,0,0.35,1) forwards; }
@keyframes pour{ to{ transform:scaleX(1); } }
.btn-primary .label{ position:relative; z-index:1; }
.login-footer{ margin-top:32px; padding-top:20px; border-top:1px solid var(--surface-2); font-size:12.5px; color:#8B948C; text-align:center; }
@media (max-width:1180px){ .process{ padding:42px 44px; } }
@media (max-width:940px){ .screen{ grid-template-columns:1fr; } .process{ min-height:340px; padding:32px 40px; } .login{ padding:44px 40px; } .process-row{ gap:28px; } .bottle-stage{ width:130px; } }
@media (max-width:560px){ .process{ padding:26px 22px; min-height:300px; } .brand-sub{ display:none; } .process-copy h1{ font-size:20px; } .process-copy p{ display:none; } .process-row{ gap:18px; } .bottle-stage{ width:96px; } .stage-labels{ font-size:9.5px; max-width:140px; } .login{ padding:30px 20px; } .login-box .mark img{ height:28px; } }
`;
