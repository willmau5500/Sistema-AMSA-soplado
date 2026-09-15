import LogoutButton from "./LogoutButton";

const NAV_PRINCIPAL = [
  { href: "/dashboard", label: "Inicio", icon: HomeIcon },
  { href: "/produccion", label: "Registro de Producción", icon: FactoryIcon },
  { href: "/merma", label: "Registro de Merma", icon: DropIcon },
  { href: "/paradas", label: "Paradas de Máquina", icon: PauseIcon },
];

const NAV_CONFIG = [
  { href: "/metas", label: "Metas de Producción", icon: TargetIcon },
  { label: "Reportes Excel", icon: FileIcon, proximamente: true },
  { label: "Admin. Máquinas", icon: GearIcon, proximamente: true },
  { label: "Admin. Usuarios", icon: UsersIcon, proximamente: true },
  { label: "Admin. Base de Datos", icon: DbIcon, proximamente: true },
];

const PAGE_TITLES = {
  "/dashboard": "Tablero de Control",
  "/produccion": "Registro de Producción",
  "/merma": "Registro de Merma",
  "/paradas": "Paradas de Máquina",
  "/metas": "Metas de Producción",
};

export default function AppShell({ nombre, rol, paginaActual, children }) {
  const titulo = PAGE_TITLES[paginaActual] || "Multisoplado";

  return (
    <>
      <style>{css}</style>
      <div className="shell">
        <aside className="sidebar">
          <div className="sidebar-brand">
            <div className="sidebar-logo-dot" />
            <span>MULTISOPLADO</span>
          </div>

          <div className="nav-section-label">Menú principal</div>
          <nav className="nav-list">
            {NAV_PRINCIPAL.map((item) => (
              <NavItem key={item.label} item={item} active={paginaActual === item.href} />
            ))}
          </nav>

          <div className="nav-section-label">Configuración</div>
          <nav className="nav-list">
            {NAV_CONFIG.map((item) => (
              <NavItem key={item.label} item={item} active={paginaActual === item.href} />
            ))}
          </nav>
        </aside>

        <div className="shell-main">
          <header className="topbar">
            <h1>{titulo}</h1>
            <div className="topbar-user">
              <div className="topbar-user-info">
                <span className="topbar-user-name">{nombre}</span>
                <span className="topbar-user-role">{rol}</span>
              </div>
              <LogoutButton />
            </div>
          </header>

          <main className="shell-content">{children}</main>
        </div>
      </div>
    </>
  );
}

function NavItem({ item, active }) {
  const Icon = item.icon;
  const content = (
    <>
      <Icon />
      <span>{item.label}</span>
      {item.proximamente && <span className="soon-badge">Pronto</span>}
    </>
  );

  if (item.proximamente) {
    return <div className="nav-item disabled">{content}</div>;
  }
  return (
    <a href={item.href} className={"nav-item" + (active ? " active" : "")}>
      {content}
    </a>
  );
}

function HomeIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 10.5 12 3l9 7.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function FactoryIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21V10l6 4v-4l6 4V6l6 4v11H3Z" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function DropIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2s7 8.5 7 13a7 7 0 1 1-14 0c0-4.5 7-13 7-13Z" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function PauseIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>;
}
function TargetIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></svg>;
}
function FileIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" strokeLinecap="round" strokeLinejoin="round" /><path d="M14 2v6h6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function GearIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" /></svg>;
}
function UsersIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function DbIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5" strokeLinecap="round" strokeLinejoin="round" /><path d="M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

const css = `
:root{
  --brand-dark:#123B7A; --brand:#2A6FE0; --brand-light:#3FC6B8;
  --sidebar-bg:#0E2957; --sidebar-bg-2:#123B7A;
  --ink:#16211D; --ink-soft:#5B6B7A; --surface:#F4F6F8; --line:#E2E6EA;
}
*{ box-sizing:border-box; }
.shell{ display:flex; min-height:100vh; font-family:'Inter',sans-serif; }

.sidebar{ width:250px; flex-shrink:0; background:linear-gradient(180deg,var(--sidebar-bg) 0%,var(--sidebar-bg-2) 100%); color:#fff; padding:22px 14px; display:flex; flex-direction:column; position:sticky; top:0; height:100vh; overflow-y:auto; }
.sidebar-brand{ display:flex; align-items:center; gap:10px; font-family:'Space Grotesk',sans-serif; font-weight:700; font-size:14px; letter-spacing:0.04em; padding:0 10px; margin-bottom:28px; }
.sidebar-logo-dot{ width:11px; height:11px; border-radius:50%; background:linear-gradient(135deg,var(--brand-light),#74C6EC); flex-shrink:0; }

.nav-section-label{ font-size:10.5px; text-transform:uppercase; letter-spacing:0.08em; color:rgba(255,255,255,0.4); padding:0 10px; margin:18px 0 8px 0; }
.nav-list{ display:flex; flex-direction:column; gap:2px; }
.nav-item{ display:flex; align-items:center; gap:11px; padding:10px 12px; border-radius:6px; color:rgba(255,255,255,0.75); text-decoration:none; font-size:13.5px; transition:background 0.15s ease, color 0.15s ease; cursor:pointer; }
.nav-item:hover{ background:rgba(255,255,255,0.08); color:#fff; }
.nav-item.active{ background:rgba(63,198,184,0.18); color:#fff; box-shadow:inset 3px 0 0 var(--brand-light); }
.nav-item.disabled{ opacity:0.45; cursor:default; }
.nav-item.disabled:hover{ background:none; color:rgba(255,255,255,0.75); }
.nav-item svg{ flex-shrink:0; }
.soon-badge{ margin-left:auto; font-size:9.5px; background:rgba(255,255,255,0.15); padding:2px 6px; border-radius:10px; letter-spacing:0.02em; }

.shell-main{ flex:1; min-width:0; background:var(--surface); }
.topbar{ display:flex; align-items:center; justify-content:space-between; padding:18px 32px; background:#fff; border-bottom:1px solid var(--line); }
.topbar h1{ font-family:'Space Grotesk',sans-serif; font-size:18px; margin:0; color:var(--ink); }
.topbar-user{ display:flex; align-items:center; gap:14px; }
.topbar-user-info{ display:flex; flex-direction:column; align-items:flex-end; line-height:1.3; }
.topbar-user-name{ font-size:13px; font-weight:600; color:var(--ink); }
.topbar-user-role{ font-size:11px; color:var(--ink-soft); text-transform:capitalize; }

.shell-content{ padding:0; }

@media (max-width:900px){
  .shell{ flex-direction:column; }
  .sidebar{ width:100%; height:auto; position:relative; flex-direction:row; flex-wrap:wrap; align-items:center; padding:14px; }
  .sidebar-brand{ margin-bottom:0; margin-right:16px; }
  .nav-section-label{ display:none; }
  .nav-list{ flex-direction:row; flex-wrap:wrap; }
  .nav-item span:not(.soon-badge){ display:none; }
  .nav-item{ padding:9px; }
  .topbar{ padding:14px 18px; }
}
`;
