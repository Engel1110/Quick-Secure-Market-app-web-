import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import AiAssistant from "../components/AiAssistant";

const DEFAULT_SETTINGS = {
  theme: "dark",
  accentColor: "cyan",
  language: "es",
  density: "comfortable",
  animations: true,
  glassEffect: true,
  compactSidebar: false,
  notifications: { messages: true, orders: true, disputes: true, security: true, email: false },
  privacy: { showTrustScore: true, showLocation: true, allowMessages: true },
  security: { twoFactorEnabled: false, loginAlerts: true, sessionTimeout: "30" }
};

function Settings() {
  const savedUser = safeJson(localStorage.getItem("qsm_user")) || safeJson(localStorage.getItem("user")) || {};
  const [activeTab, setActiveTab] = useState("appearance");
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const previewStyle = useMemo(() => getThemePreview(settings.theme, settings.accentColor), [settings.theme, settings.accentColor]);

  useEffect(() => { loadSettings(); }, []);
  useEffect(() => { applyLocalTheme(settings); }, [settings]);

  const loadSettings = async () => {
    try {
      setLoading(true); setError(""); setMessage("");
      const response = await api.get("/settings/me");
      const backendSettings = response.data.settings || response.data.data || response.data;
      setSettings(mergeSettings(DEFAULT_SETTINGS, backendSettings));
    } catch (err) {
      const local = safeJson(localStorage.getItem("qsm_settings"));
      if (local) setSettings(mergeSettings(DEFAULT_SETTINGS, local));
      setError(err?.response?.data?.message || "No se pudo cargar Configuración. Verifica GET /settings/me en el backend.");
    } finally { setLoading(false); }
  };

  const saveSettings = async () => {
    try {
      setSaving(true); setError(""); setMessage("");
      const response = await api.put("/settings/me", settings);
      const updated = response.data.settings || response.data.data || response.data;
      setSettings(mergeSettings(settings, updated));
      localStorage.setItem("qsm_settings", JSON.stringify(settings));
      setMessage("Configuración guardada correctamente.");
    } catch (err) {
      localStorage.setItem("qsm_settings", JSON.stringify(settings));
      setError(err?.response?.data?.message || "No se pudo guardar en backend, pero quedó guardado localmente. Verifica PUT /settings/me.");
    } finally { setSaving(false); }
  };

  const updateSetting = (key, value) => setSettings((prev) => ({ ...prev, [key]: value }));
  const updateNested = (section, key, value) => setSettings((prev) => ({ ...prev, [section]: { ...prev[section], [key]: value } }));

  const changePassword = async (event) => {
    event.preventDefault();
    if (!passwordForm.currentPassword || !passwordForm.newPassword) return setError("Completa la contraseña actual y la nueva contraseña.");
    if (passwordForm.newPassword !== passwordForm.confirmPassword) return setError("La nueva contraseña no coincide.");
    if (passwordForm.newPassword.length < 8) return setError("La nueva contraseña debe tener mínimo 8 caracteres.");
    try {
      setSaving(true); setError(""); setMessage("");
      await api.patch("/settings/password", { currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword });
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setMessage("Contraseña actualizada correctamente.");
    } catch (err) { setError(err?.response?.data?.message || "No se pudo cambiar la contraseña. Verifica PATCH /settings/password."); }
    finally { setSaving(false); }
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.setItem("qsm_settings", JSON.stringify(DEFAULT_SETTINGS));
    setMessage("Configuración restaurada. Presiona Guardar para enviarla al backend.");
  };

  return (
    <div style={page}>
      <style>{`
        *{box-sizing:border-box} html,body,#root{margin:0;padding:0;width:100%;min-height:100%;background:#020617;font-family:Inter,"Plus Jakarta Sans",system-ui,sans-serif;overflow-x:hidden} input,select,button,a{font-family:inherit} button,a{transition:all .25s ease} button:hover,a:hover{transform:translateY(-2px)}
        @keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        @media(max-width:1240px){.settings-page{grid-template-columns:1fr!important}.sidebar-wrapper{display:none!important}.settings-layout,.stats-grid,.two-columns,.theme-grid,.color-grid{grid-template-columns:1fr!important}.hero-row{flex-direction:column!important;align-items:flex-start!important}}
        @media(max-width:760px){.main-content{padding:18px!important}.action-row{grid-template-columns:1fr!important}}
      `}</style>
      <div className="settings-page" style={layout}>
        <div className="sidebar-wrapper"><Sidebar /></div>
        <main className="main-content" style={main}>
          <Topbar />
          <section className="hero-row" style={hero}>
            <div><p style={label}>CONFIGURACIÓN QSM</p><h1 style={title}>Centro de control</h1><p style={subtitle}>Personaliza la experiencia dentro de QSM: modo noche, colores, idioma, notificaciones, privacidad y seguridad.</p></div>
            <div style={heroBadge}><span>⚙️</span><div><strong>{settings.theme === "dark" ? "Modo oscuro" : "Modo claro"}</strong><p>Color activo: {formatAccent(settings.accentColor)}</p></div></div>
          </section>
          <section className="stats-grid" style={statsGrid}>
            <StatCard icon="🎨" title="Tema" value={settings.theme === "dark" ? "Oscuro" : "Claro"} />
            <StatCard icon="🌎" title="Idioma" value={settings.language === "es" ? "Español" : "English"} />
            <StatCard icon="🔔" title="Alertas" value={countEnabled(settings.notifications)} />
            <StatCard icon="🔐" title="Seguridad" value={settings.security.loginAlerts ? "Activa" : "Básica"} />
          </section>
          {message && <div style={successBox}>{message}</div>}{error && <div style={errorBox}>{error}</div>}
          {loading ? <div style={centerCard}><h2>Cargando configuración...</h2><p>QSM está consultando tus preferencias.</p></div> : (
            <section className="settings-layout" style={settingsLayout}>
              <aside style={sideNav}>
                <TabButton active={activeTab==="appearance"} icon="🎨" text="Apariencia" onClick={()=>setActiveTab("appearance")} />
                <TabButton active={activeTab==="language"} icon="🌎" text="Idioma" onClick={()=>setActiveTab("language")} />
                <TabButton active={activeTab==="notifications"} icon="🔔" text="Notificaciones" onClick={()=>setActiveTab("notifications")} />
                <TabButton active={activeTab==="privacy"} icon="🛡️" text="Privacidad" onClick={()=>setActiveTab("privacy")} />
                <TabButton active={activeTab==="security"} icon="🔐" text="Seguridad" onClick={()=>setActiveTab("security")} />
                <TabButton active={activeTab==="account"} icon="👤" text="Cuenta" onClick={()=>setActiveTab("account")} />
              </aside>
              <section style={panel}>
                {activeTab==="appearance" && <>
                  <PanelHeader title="Apariencia" text="Controla cómo se ve QSM después de iniciar sesión." />
                  <div className="theme-grid" style={themeGrid}><ThemeCard active={settings.theme==="dark"} icon="🌙" title="Modo oscuro" text="Ideal para trabajar de noche." onClick={()=>updateSetting("theme","dark")} /><ThemeCard active={settings.theme==="light"} icon="☀️" title="Modo claro" text="Vista limpia y luminosa." onClick={()=>updateSetting("theme","light")} /></div>
                  <h3>Color principal</h3><div className="color-grid" style={colorGrid}>{["cyan","purple","pink","blue","green","orange"].map((color)=><button key={color} onClick={()=>updateSetting("accentColor",color)} style={settings.accentColor===color?activeColorButton(color):colorButton(color)}><span style={colorDot(color)}></span>{formatAccent(color)}</button>)}</div>
                  <div className="two-columns" style={twoColumns}><SettingToggle title="Animaciones" text="Efectos suaves en botones y tarjetas." checked={settings.animations} onChange={(v)=>updateSetting("animations",v)} /><SettingToggle title="Efecto cristal" text="Fondos translúcidos tipo glassmorphism." checked={settings.glassEffect} onChange={(v)=>updateSetting("glassEffect",v)} /><SettingToggle title="Sidebar compacto" text="Reduce el espacio lateral del menú." checked={settings.compactSidebar} onChange={(v)=>updateSetting("compactSidebar",v)} /><div style={settingBox}><h3>Densidad visual</h3><p style={muted}>Controla separación y tamaño.</p><select value={settings.density} onChange={(e)=>updateSetting("density",e.target.value)} style={input}><option value="comfortable">Cómodo</option><option value="compact">Compacto</option><option value="spacious">Espacioso</option></select></div></div>
                  <div style={previewBox}><h3>Vista previa</h3><div style={previewStyle.card}><span style={previewStyle.badge}>QSM</span><h2>Compra protegida</h2><p>Este es un ejemplo de cómo se verá la interfaz con tu tema.</p><button style={previewStyle.button}>Botón principal</button></div></div>
                </>}
                {activeTab==="language" && <><PanelHeader title="Idioma y región" text="Controla el idioma principal, moneda y formato regional." /><div className="two-columns" style={twoColumns}><div style={settingBox}><h3>Idioma principal</h3><select value={settings.language} onChange={(e)=>updateSetting("language",e.target.value)} style={input}><option value="es">Español</option><option value="en">English</option></select></div><InfoBox title="Región" value="República Dominicana" /><InfoBox title="Moneda" value="DOP / RD$" /><InfoBox title="Zona horaria" value="America/Santo_Domingo" /></div></>}
                {activeTab==="notifications" && <><PanelHeader title="Notificaciones" text="Decide qué alertas quieres recibir dentro de QSM." /><div className="two-columns" style={twoColumns}>{Object.entries({messages:"Mensajes",orders:"Órdenes",disputes:"Reclamos",security:"Seguridad",email:"Correo"}).map(([k,t])=><SettingToggle key={k} title={t} text={`Alertas de ${t.toLowerCase()}.`} checked={settings.notifications[k]} onChange={(v)=>updateNested("notifications",k,v)} />)}</div></>}
                {activeTab==="privacy" && <><PanelHeader title="Privacidad" text="Controla qué información se muestra a otros usuarios." /><div className="two-columns" style={twoColumns}><SettingToggle title="Mostrar puntuación QSM" text="Permite mostrar tu confianza." checked={settings.privacy.showTrustScore} onChange={(v)=>updateNested("privacy","showTrustScore",v)} /><SettingToggle title="Mostrar ubicación general" text="Ciudad/provincia, no dirección exacta." checked={settings.privacy.showLocation} onChange={(v)=>updateNested("privacy","showLocation",v)} /><SettingToggle title="Permitir mensajes" text="Usuarios pueden contactarte." checked={settings.privacy.allowMessages} onChange={(v)=>updateNested("privacy","allowMessages",v)} /></div></>}
                {activeTab==="security" && <><PanelHeader title="Seguridad" text="Opciones para proteger tu cuenta QSM." /><div className="two-columns" style={twoColumns}><SettingToggle title="Alertas de inicio" text="Avisar sesiones nuevas." checked={settings.security.loginAlerts} onChange={(v)=>updateNested("security","loginAlerts",v)} /><SettingToggle title="Doble factor" text="Preparado para fase 2FA." checked={settings.security.twoFactorEnabled} onChange={(v)=>updateNested("security","twoFactorEnabled",v)} /><div style={settingBox}><h3>Tiempo de sesión</h3><p style={muted}>Inactividad antes de nueva sesión.</p><select value={settings.security.sessionTimeout} onChange={(e)=>updateNested("security","sessionTimeout",e.target.value)} style={input}><option value="15">15 minutos</option><option value="30">30 minutos</option><option value="60">1 hora</option><option value="240">4 horas</option></select></div></div><form onSubmit={changePassword} style={passwordBox}><h3>Cambiar contraseña</h3><div className="two-columns" style={twoColumns}><input type="password" placeholder="Contraseña actual" value={passwordForm.currentPassword} onChange={(e)=>setPasswordForm({...passwordForm,currentPassword:e.target.value})} style={input}/><input type="password" placeholder="Nueva contraseña" value={passwordForm.newPassword} onChange={(e)=>setPasswordForm({...passwordForm,newPassword:e.target.value})} style={input}/><input type="password" placeholder="Confirmar contraseña" value={passwordForm.confirmPassword} onChange={(e)=>setPasswordForm({...passwordForm,confirmPassword:e.target.value})} style={input}/></div><button type="submit" disabled={saving} style={primaryButton}>Actualizar contraseña</button></form></>}
                {activeTab==="account" && <><PanelHeader title="Cuenta" text="Resumen de tu usuario actual." /><div style={profileBox}><div style={avatar}>{(savedUser.firstName||savedUser.email||"U").charAt(0).toUpperCase()}</div><div><h2>{savedUser.firstName||"Usuario"} {savedUser.lastName||"QSM"}</h2><p>{savedUser.email||"usuario@qsm.com"}</p><strong>Confianza QSM: {savedUser.trustScore||50}/100</strong></div></div><div style={dangerBox}><h3>Zona sensible</h3><p>En una siguiente fase puedes agregar eliminación de cuenta, exportación de datos y cierre de sesiones.</p></div></>}
                <div className="action-row" style={actionRow}><button onClick={resetSettings} style={outlineButton}>Restaurar</button><button onClick={saveSettings} disabled={saving} style={primaryButton}>{saving ? "Guardando..." : "Guardar cambios →"}</button></div>
              </section>
            </section>)}
        </main>
      </div>
      <AiAssistant pageContext="settings" />
    </div>
  );
}

function TabButton({active,icon,text,onClick}){return <button onClick={onClick} style={active?activeSideTab:sideTab}><span>{icon}</span>{text}</button>}
function ThemeCard({active,icon,title,text,onClick}){return <button onClick={onClick} style={active?activeThemeCard:themeCard}><span>{icon}</span><strong>{title}</strong><p>{text}</p></button>}
function SettingToggle({title,text,checked,onChange}){return <div style={settingBox}><div><h3>{title}</h3><p style={muted}>{text}</p></div><button onClick={()=>onChange(!checked)} type="button" style={checked?toggleOn:toggleOff}><span style={checked?toggleDotOn:toggleDotOff}></span></button></div>}
function PanelHeader({title,text}){return <div style={panelHeader}><p style={label}>AJUSTES</p><h2>{title}</h2><p style={muted}>{text}</p></div>}
function StatCard({icon,title,value}){return <div style={statCard}><div style={statIcon}>{icon}</div><div><span>{title}</span><strong>{value}</strong></div></div>}
function InfoBox({title,value}){return <div style={settingBox}><h3>{title}</h3><input value={value} readOnly style={input}/></div>}
function safeJson(v){try{return v?JSON.parse(v):null}catch{return null}}
function mergeSettings(base, incoming={}){return {...base,...incoming,notifications:{...base.notifications,...(incoming.notifications||{})},privacy:{...base.privacy,...(incoming.privacy||{})},security:{...base.security,...(incoming.security||{})}}}
function countEnabled(obj){return Object.values(obj||{}).filter(Boolean).length}
function formatAccent(color){return ({cyan:"Cian",purple:"Morado",pink:"Rosado",blue:"Azul",green:"Verde",orange:"Naranja"}[color]||color)}
function getAccentColor(color){return ({cyan:"#35d0c3",purple:"#8b5cf6",pink:"#ec4899",blue:"#38bdf8",green:"#22c55e",orange:"#f59e0b"}[color]||"#35d0c3")}
function applyLocalTheme(settings){const root=document.documentElement;root.style.setProperty("--qsm-accent",getAccentColor(settings.accentColor));root.style.setProperty("--qsm-theme",settings.theme);localStorage.setItem("qsm_theme",settings.theme);localStorage.setItem("qsm_accent",settings.accentColor);localStorage.setItem("qsm_language",settings.language);localStorage.setItem("qsm_settings",JSON.stringify(settings));document.body.dataset.qsmTheme=settings.theme}
function getThemePreview(theme,accentColor){const accent=getAccentColor(accentColor);const dark=theme==="dark";return{card:{marginTop:"16px",padding:"22px",borderRadius:"22px",background:dark?"rgba(2,6,23,.70)":"rgba(255,255,255,.92)",color:dark?"white":"#0f172a",border:`1px solid ${accent}55`},badge:{display:"inline-flex",padding:"7px 11px",borderRadius:"999px",background:`${accent}22`,color:accent,fontWeight:"900"},button:{marginTop:"10px",background:`linear-gradient(135deg, ${accent}, #8b5cf6)`,color:"white",border:"none",padding:"12px 16px",borderRadius:"13px",fontWeight:"950"}}}

const page={minHeight:"100vh",width:"100%",background:"radial-gradient(circle at top right, rgba(139,92,246,.14), transparent 34%), radial-gradient(circle at 18% 15%, rgba(53,208,195,.10), transparent 28%), #020617",color:"white"};
const layout={width:"100%",minHeight:"100vh",display:"grid",gridTemplateColumns:"280px minmax(0, 1fr)",overflowX:"hidden"};
const main={width:"100%",minWidth:0,padding:"26px 34px 56px",overflowX:"hidden"};
const hero={display:"flex",justifyContent:"space-between",alignItems:"center",gap:"24px",margin:"22px 0"};
const label={color:"#35d0c3",letterSpacing:"4px",fontSize:"12px",fontWeight:"950",textTransform:"uppercase",margin:0};
const title={fontSize:"clamp(40px,3.6vw,62px)",lineHeight:"1",margin:"10px 0",letterSpacing:"-2px"};
const subtitle={color:"#cbd5e1",lineHeight:"29px",maxWidth:"860px",margin:0};
const heroBadge={display:"flex",alignItems:"center",gap:"14px",minWidth:"270px",background:"rgba(15,23,42,.72)",border:"1px solid rgba(53,208,195,.24)",borderRadius:"22px",padding:"18px"};
const statsGrid={display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:"16px",marginBottom:"20px"};
const statCard={display:"flex",alignItems:"center",gap:"14px",background:"rgba(15,23,42,.72)",border:"1px solid rgba(56,189,248,.15)",borderRadius:"22px",padding:"20px"};
const statIcon={width:"52px",height:"52px",borderRadius:"17px",background:"rgba(53,208,195,.14)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"24px"};
const settingsLayout={display:"grid",gridTemplateColumns:"270px minmax(0,1fr)",gap:"20px"};
const sideNav={background:"rgba(15,23,42,.72)",border:"1px solid rgba(56,189,248,.16)",borderRadius:"26px",padding:"16px",alignSelf:"start",display:"grid",gap:"10px"};
const sideTab={width:"100%",display:"flex",alignItems:"center",gap:"12px",padding:"14px",borderRadius:"15px",background:"rgba(2,6,23,.35)",border:"1px solid rgba(148,163,184,.12)",color:"#cbd5e1",cursor:"pointer",fontWeight:"900",textAlign:"left"};
const activeSideTab={...sideTab,background:"linear-gradient(135deg, rgba(53,208,195,.18), rgba(139,92,246,.20))",border:"1px solid rgba(53,208,195,.35)",color:"white"};
const panel={background:"rgba(15,23,42,.72)",border:"1px solid rgba(56,189,248,.16)",borderRadius:"26px",padding:"26px",animation:"fadeUp .35s ease"};
const panelHeader={marginBottom:"20px"};
const themeGrid={display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:"14px",marginBottom:"22px"};
const themeCard={textAlign:"left",minHeight:"150px",background:"rgba(2,6,23,.45)",border:"1px solid rgba(148,163,184,.14)",borderRadius:"22px",padding:"20px",color:"#cbd5e1",cursor:"pointer"};
const activeThemeCard={...themeCard,background:"linear-gradient(135deg, rgba(53,208,195,.16), rgba(139,92,246,.18))",border:"1px solid rgba(53,208,195,.38)",color:"white"};
const colorGrid={display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:"12px",marginBottom:"22px"};
const colorButton=(color)=>({display:"flex",alignItems:"center",gap:"10px",background:"rgba(2,6,23,.45)",border:"1px solid rgba(148,163,184,.14)",color:"white",padding:"13px",borderRadius:"15px",cursor:"pointer",fontWeight:"900"});
const activeColorButton=(color)=>({...colorButton(color),border:`1px solid ${getAccentColor(color)}`,boxShadow:`0 0 26px ${getAccentColor(color)}33`});
const colorDot=(color)=>({width:"18px",height:"18px",borderRadius:"50%",background:getAccentColor(color)});
const twoColumns={display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:"14px"};
const settingBox={minHeight:"126px",background:"rgba(2,6,23,.40)",border:"1px solid rgba(148,163,184,.12)",borderRadius:"20px",padding:"18px",display:"flex",flexDirection:"column",justifyContent:"space-between",gap:"12px"};
const muted={color:"#cbd5e1",lineHeight:"25px"};
const input={width:"100%",minHeight:"54px",background:"rgba(2,6,23,.55)",border:"1px solid rgba(148,163,184,.16)",color:"white",borderRadius:"15px",padding:"0 14px",outline:"none"};
const toggleOff={width:"62px",height:"34px",borderRadius:"999px",border:"1px solid rgba(148,163,184,.25)",background:"rgba(15,23,42,.80)",cursor:"pointer",padding:"4px",alignSelf:"flex-start"};
const toggleOn={...toggleOff,background:"linear-gradient(135deg,#35d0c3,#8b5cf6)",border:"1px solid rgba(53,208,195,.45)"};
const toggleDotOff={display:"block",width:"24px",height:"24px",borderRadius:"50%",background:"#94a3b8",transform:"translateX(0)"};
const toggleDotOn={...toggleDotOff,background:"white",transform:"translateX(26px)"};
const previewBox={marginTop:"22px",background:"rgba(2,6,23,.35)",border:"1px solid rgba(148,163,184,.10)",borderRadius:"20px",padding:"18px"};
const passwordBox={marginTop:"20px",background:"rgba(2,6,23,.35)",border:"1px solid rgba(148,163,184,.10)",borderRadius:"20px",padding:"18px",display:"grid",gap:"14px"};
const profileBox={display:"flex",alignItems:"center",gap:"18px",background:"rgba(2,6,23,.35)",border:"1px solid rgba(148,163,184,.10)",borderRadius:"20px",padding:"20px"};
const avatar={width:"74px",height:"74px",borderRadius:"24px",background:"linear-gradient(135deg,#35d0c3,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"30px",fontWeight:"950"};
const dangerBox={marginTop:"18px",background:"rgba(127,29,29,.18)",border:"1px solid rgba(248,113,113,.24)",color:"#fecaca",borderRadius:"20px",padding:"18px"};
const actionRow={display:"grid",gridTemplateColumns:"1fr 1.4fr",gap:"12px",marginTop:"24px"};
const outlineButton={textAlign:"center",background:"rgba(15,23,42,.64)",border:"1px solid rgba(148,163,184,.16)",color:"white",borderRadius:"13px",padding:"14px",fontWeight:"950",cursor:"pointer"};
const primaryButton={display:"inline-flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(135deg,#35d0c3,#38bdf8,#8b5cf6)",color:"white",textDecoration:"none",border:"none",padding:"14px 20px",borderRadius:"14px",fontWeight:"950",cursor:"pointer",boxShadow:"0 18px 54px rgba(53,208,195,.18)"};
const successBox={background:"rgba(34,197,94,.14)",border:"1px solid rgba(34,197,94,.32)",color:"#bbf7d0",padding:"14px 18px",borderRadius:"16px",marginBottom:"16px",fontWeight:"800"};
const errorBox={background:"rgba(127,29,29,.24)",border:"1px solid rgba(248,113,113,.30)",color:"#fecaca",padding:"14px 18px",borderRadius:"16px",marginBottom:"16px",fontWeight:"800"};
const centerCard={background:"rgba(15,23,42,.72)",border:"1px solid rgba(56,189,248,.14)",borderRadius:"24px",padding:"44px",textAlign:"center",color:"#cbd5e1"};
export default Settings;
