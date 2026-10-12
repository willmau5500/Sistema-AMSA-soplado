"use client";

import { useEffect, useState } from "react";

// Modo planta: interfaz ampliada con botones y campos grandes para tablet y guantes.
export default function ModoPlanta() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem("modoPlanta") === "1";
      setOn(v);
      document.documentElement.classList.toggle("modo-planta", v);
    } catch {}
  }, []);

  function alternar() {
    const v = !on;
    setOn(v);
    document.documentElement.classList.toggle("modo-planta", v);
    try { localStorage.setItem("modoPlanta", v ? "1" : "0"); } catch {}
  }

  return (
    <>
      <style>{css}</style>
      <button type="button" className={"mp-toggle" + (on ? " on" : "")} onClick={alternar} title="Interfaz ampliada para tablet">
        Modo planta: {on ? "activado" : "apagado"}
      </button>
    </>
  );
}

const css = `
.mp-toggle{ border:1px solid #D5DBE2; background:#fff; color:#3A4654; border-radius:8px; padding:7px 12px; font:inherit; font-size:12.5px; cursor:pointer; white-space:nowrap; }
.mp-toggle.on{ background:#123B7A; color:#fff; border-color:#123B7A; }
@media (max-width:560px){ .mp-toggle{ display:none; } }

html.modo-planta body{ zoom:1.18; }
html.modo-planta button, html.modo-planta select, html.modo-planta input:not([type=checkbox]):not([type=radio]){ min-height:48px; font-size:16px; }
html.modo-planta .nav-item{ padding-top:14px; padding-bottom:14px; }
html.modo-planta .mp-toggle{ min-height:0; font-size:12.5px; }
`;
