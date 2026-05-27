import React, { useMemo, useState } from "react";
import {
  ShieldCheck,
  Home,
  Grid3X3,
  Warehouse,
  HelpCircle,
  Users,
  PackageCheck,
  Search,
  Bell,
  Eye,
  X,
  MessageCircle,
  UserCheck,
  Truck,
  Lock,
  CheckCircle2,
  CreditCard,
  Smartphone,
  Store,
  Shirt,
  Sofa,
  Refrigerator,
  Fan,
  Footprints,
} from "lucide-react";

function Card({ className = "", children }) {
  return <div className={`rounded-[1.6rem] border border-white/10 bg-white/5 backdrop-blur-xl ${className}`}>{children}</div>;
}

function Button({ className = "", variant = "default", children, ...props }) {
  const styles = variant === "outline"
    ? "border border-white/15 bg-white/5 text-white hover:bg-white/10"
    : "bg-blue-600 text-white hover:bg-blue-500";
  return <button className={`rounded-2xl px-5 py-3 text-sm font-bold transition ${styles} ${className}`} {...props}>{children}</button>;
}

const img = {
  warehouse: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=1600&auto=format&fit=crop",
  delivery: "https://images.unsplash.com/photo-1566576721346-d4a3b4eaeb55?q=80&w=900&auto=format&fit=crop",
  verify: "https://images.unsplash.com/photo-1581090464777-f3220bbe1b8b?q=80&w=900&auto=format&fit=crop",
  pin: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=900&auto=format&fit=crop",
  payment: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=900&auto=format&fit=crop",
};

const catalog = [
  { name: "Tecnología", icon: Smartphone, items: [
    ["iPhone 13 Pro", "RD$ 45,000", "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?q=80&w=700&auto=format&fit=crop"],
    ["Laptop Dell Latitude", "RD$ 28,000", "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?q=80&w=700&auto=format&fit=crop"],
    ["PlayStation 5", "RD$ 32,000", "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?q=80&w=700&auto=format&fit=crop"],
    ["iPad Air", "RD$ 25,000", "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?q=80&w=700&auto=format&fit=crop"],
  ]},
  { name: "Ropas", icon: Shirt, items: [
    ["Camisa original", "RD$ 1,500", "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=700&auto=format&fit=crop"],
    ["Pantalón Levi’s", "RD$ 1,200", "https://images.unsplash.com/photo-1542272604-787c3835535d?q=80&w=700&auto=format&fit=crop"],
    ["Chaqueta Adidas", "RD$ 2,800", "https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=700&auto=format&fit=crop"],
    ["Vestido casual", "RD$ 1,000", "https://images.unsplash.com/photo-1566174053879-31528523f8ae?q=80&w=700&auto=format&fit=crop"],
  ]},
  { name: "Zapatos", icon: Footprints, items: [
    ["Nike Air Jordan", "RD$ 6,500", "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=700&auto=format&fit=crop"],
    ["Adidas Ultraboost", "RD$ 4,200", "https://images.unsplash.com/photo-1608231387042-66d1773070a5?q=80&w=700&auto=format&fit=crop"],
    ["Converse Star", "RD$ 2,000", "https://images.unsplash.com/photo-1607522370275-f14206abe5d3?q=80&w=700&auto=format&fit=crop"],
    ["Sandalias Reef", "RD$ 1,500", "https://images.unsplash.com/photo-1603487742131-4160ec999306?q=80&w=700&auto=format&fit=crop"],
  ]},
  { name: "Electrodomésticos", icon: Refrigerator, items: [
    ["Nevera Samsung", "RD$ 35,000", "https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?q=80&w=700&auto=format&fit=crop"],
    ["Lavadora LG", "RD$ 22,000", "https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?q=80&w=700&auto=format&fit=crop"],
    ["Microondas", "RD$ 5,500", "https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?q=80&w=700&auto=format&fit=crop"],
    ["Estufa Whirlpool", "RD$ 18,000", "https://images.unsplash.com/photo-1556911220-bff31c812dba?q=80&w=700&auto=format&fit=crop"],
  ]},
  { name: "Muebles", icon: Sofa, items: [
    ["Juego de sala", "RD$ 28,000", "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?q=80&w=700&auto=format&fit=crop"],
    ["Cama Queen", "RD$ 16,000", "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?q=80&w=700&auto=format&fit=crop"],
    ["Escritorio moderno", "RD$ 9,000", "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?q=80&w=700&auto=format&fit=crop"],
    ["Silla gamer", "RD$ 7,500", "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?q=80&w=700&auto=format&fit=crop"],
  ]},
  { name: "Artículo del hogar", icon: Fan, items: [
    ["Abanico pedestal", "RD$ 2,800", "https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?q=80&w=700&auto=format&fit=crop"],
    ["Lámpara de mesa", "RD$ 1,200", "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?q=80&w=700&auto=format&fit=crop"],
    ["Organizador multiuso", "RD$ 850", "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?q=80&w=700&auto=format&fit=crop"],
    ["Set de ollas", "RD$ 2,400", "https://images.unsplash.com/photo-1584990347449-a9a6938924de?q=80&w=700&auto=format&fit=crop"],
  ]},
];

const profiles = [
  ["Juan Pérez", "Comprador verificado", "Santo Domingo, RD", "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=400&auto=format&fit=crop"],
  ["María Rodríguez", "Vendedora verificada", "Santiago, RD", "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=400&auto=format&fit=crop"],
  ["Carlos Gómez", "Vendedor verificado", "La Romana, RD", "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400&auto=format&fit=crop"],
  ["Laura Sánchez", "Compradora verificada", "Punta Cana, RD", "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=400&auto=format&fit=crop"],
  ["Miguel Tavárez", "Vendedor verificado", "San Pedro, RD", "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=400&auto=format&fit=crop"],
  ["Ana Martínez", "Compradora verificada", "Puerto Plata, RD", "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?q=80&w=400&auto=format&fit=crop"],
];

function ProductCard({ item }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50 p-3 transition duration-300 hover:-translate-y-2 hover:border-cyan-300/50 hover:shadow-[0_0_35px_rgba(34,211,238,.18)]">
      <div className="absolute right-3 top-3 z-10 rounded-full bg-emerald-500/20 px-2 py-1 text-[10px] font-black text-emerald-300">QSM VERIFIED</div>
      <img src={item[2]} alt={item[0]} className="h-32 w-full rounded-xl object-cover transition duration-700 group-hover:scale-110" />
      <h4 className="mt-3 text-sm font-black text-white">{item[0]}</h4>
      <p className="mt-2 font-black text-white">{item[1]}</p>
      <div className="mt-2 flex items-center justify-between">
        <span className="inline-flex rounded-full bg-emerald-500/20 px-2 py-1 text-xs font-bold text-emerald-300">Certificado</span>
        <span className="text-xs text-amber-300">★ 4.8</span>
      </div>
      <div className="mt-3 grid grid-cols-[1fr_auto] items-center gap-2 rounded-xl bg-white/5 p-2 text-xs text-slate-300">
        <span>Código único</span>
        <span className="font-black text-cyan-300">QSM-{Math.floor(Math.random() * 9000 + 1000)}</span>
      </div>
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState("inicio");
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [showAI, setShowAI] = useState(false);
  const [userMode, setUserMode] = useState("comprador");
  const allProducts = useMemo(() => catalog.flatMap(c => c.items.map(i => ({ category: c.name, item: i }))), []);

  const nav = [
    ["inicio", "Inicio", Home],
    ["catalogo", "Catálogo", Grid3X3],
    ["seguridad", "Seguridad", ShieldCheck],
    ["almacen", "Almacén QSM", Warehouse],
    ["funciona", "Cómo funciona", HelpCircle],
    ["perfiles", "Perfiles", Users],
    ["seguimiento", "Seguimiento", PackageCheck],
    ["admin", "Admin", ShieldCheck],
  ];

  return (
    <div className="min-h-screen bg-[#050b18] text-white">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,.25),transparent_35%),radial-gradient(circle_at_80%_40%,rgba(14,165,233,.15),transparent_35%)]" />

      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#050b18]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-blue-600/20 p-3"><ShieldCheck className="text-blue-300" /></div>
            <div><h1 className="text-xl font-black text-cyan-300">Quick Secure Market</h1><p className="text-xs text-slate-400">Comercio seguro, compradores protegidos</p></div>
          </div>
          <nav className="hidden items-center gap-2 lg:flex">
            {nav.map(([key, label, Icon]) => <button key={key} onClick={() => setScreen(key)} className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition ${screen===key ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-white/10"}`}><Icon size={15}/>{label}</button>)}
          </nav>
          <div className="flex items-center gap-3">
            <Button onClick={() => { setAuthMode("login"); setAuthOpen(true); }} variant="outline" className="hidden md:block">Iniciar sesión</Button>
            <Button onClick={() => { setAuthMode("register"); setAuthOpen(true); }} className="hidden md:block">Registrarse</Button>
            <button onClick={() => setScreen("perfiles")} className="flex items-center gap-3 rounded-2xl px-3 py-2 hover:bg-white/10">
              <img src={profiles[0][3]} className="h-11 w-11 rounded-full object-cover" />
              <div className="hidden text-left md:block"><p className="font-black">Juan Pérez</p><p className="text-xs text-emerald-300">Comprador verificado</p></div>
            </button>
          </div>
        </div>
      </header>

      {authOpen && <AuthModal mode={authMode} setMode={setAuthMode} onClose={() => setAuthOpen(false)} />}
      {showAI && <AIWidget onClose={() => setShowAI(false)} />}

      <main className="mx-auto max-w-[1500px] px-6 py-8">
        {/* INICIO */}
        {screen === "inicio" && <section className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <Card className="overflow-hidden shadow-[0_0_60px_rgba(37,99,235,.15)]">
              <div className="relative min-h-[460px] p-8">
                <img src={img.warehouse} className="absolute inset-0 h-full w-full scale-105 object-cover opacity-40 transition duration-[3000ms] hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#050b18] via-[#050b18]/70 to-transparent" />
                <div className="absolute right-6 top-6 hidden rounded-2xl border border-cyan-300/30 bg-cyan-400/10 px-4 py-3 text-sm font-bold text-cyan-200 shadow-[0_0_30px_rgba(34,211,238,.25)] md:block animate-pulse">
                  Verificación activa 24/7
                </div>
                <div className="relative max-w-xl">
                  <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-slate-100">
                    <ShieldCheck size={16} className="text-cyan-300" /> Compra y vende de forma segura
                  </div>
                  <h2 className="text-5xl font-black leading-tight md:text-6xl">Comercio seguro, <span className="text-blue-400">confianza total</span></h2>
                  <p className="mt-5 text-lg leading-8 text-slate-200">Verificamos cada producto en nuestro almacén para que compres y vendas con total tranquilidad.</p>
                  <div className="mt-8 flex flex-wrap gap-3">
                    <Button onClick={()=>setScreen("catalogo")} className="group">Explorar catálogo <span className="ml-2 inline-block transition group-hover:translate-x-1">→</span></Button>
                    <Button onClick={()=>setScreen("funciona")} variant="outline">Cómo funciona</Button>
                    <Button onClick={()=>setShowAI(true)} variant="outline">IA Quick Secure</Button>
                  </div>
                </div>
                <div className="absolute bottom-6 left-8 right-8 grid gap-3 md:grid-cols-4">
                  {[["+5,000","Productos certificados"],["+2,500","Usuarios verificados"],["+1,800","Ventas completadas"],["98%","Satisfacción"]].map(([n,l]) => <div key={l} className="rounded-2xl border border-white/10 bg-black/30 p-4 backdrop-blur"><p className="text-2xl font-black text-cyan-300">{n}</p><p className="text-xs text-slate-300">{l}</p></div>)}
                </div>
              </div>
            </Card>
            <div className="mt-6 grid gap-4 sm:grid-cols-4">
              {[ [ShieldCheck,"Productos certificados","Revisados por expertos"],[Lock,"Compras protegidas","Pago seguro y garantía"],[Truck,"Envíos seguros","Entrega rápida y protegida"],[MessageCircle,"Soporte 24/7","Estamos para ayudarte"] ].map(([Icon,t,s]) => <Card key={t} className="group p-5 transition hover:-translate-y-1 hover:bg-white/10"><Icon className="text-cyan-300 transition group-hover:scale-110"/><p className="mt-3 font-black">{t}</p><p className="text-xs text-slate-400">{s}</p></Card>)}
            </div>
            <Card className="mt-6 p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-xl font-black">¿Nuevo en Quick Secure?</h3>
                  <p className="mt-1 text-sm text-slate-300">Crea tu cuenta demo. Nombre, apellido, correo, teléfono, cédula y foto de perfil son obligatorios para presentar la validación.</p>
                </div>
                <div className="flex gap-3">
                  <Button onClick={() => { setAuthMode("register"); setAuthOpen(true); }}>Registrarme</Button>
                  <Button onClick={() => { setAuthMode("login"); setAuthOpen(true); }} variant="outline">Iniciar sesión</Button>
                </div>
              </div>
            </Card>
            <ProfilesBlock compact />
          </div>
          <div className="space-y-6">
            <CatalogPreview allProducts={allProducts} />
            <Card className="border-purple-400/30 bg-purple-500/10 p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-purple-300">IA Quick Secure</p>
                  <h3 className="mt-1 text-2xl font-black">Asistente inteligente</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">Guía al usuario, explica productos, alerta sobre riesgos y ayuda a comprar seguro.</p>
                </div>
                <Button onClick={()=>setShowAI(true)}>Chatear ahora</Button>
              </div>
            </Card>
          </div>
        </section>}

        {/* CATALOGO */}
        {screen === "catalogo" && <section><SectionTitle title="Catálogo de productos" subtitle="Cada categoría tiene productos de prueba, fotos, precio y estado certificado." /><div className="grid gap-6 lg:grid-cols-3">{catalog.map(group => <Card key={group.name} className="p-6"><div className="mb-5 flex items-center justify-between"><div className="flex items-center gap-3"><group.icon className="text-cyan-300"/><h3 className="text-2xl font-black">{group.name}</h3></div><span className="text-xs text-cyan-300">Ver todo →</span></div><div className="grid grid-cols-2 gap-3">{group.items.map(item => <ProductCard key={item[0]} item={item}/>)}</div></Card>)}</div></section>}

        {/* SEGURIDAD */}
        {screen === "seguridad" && <section><SectionTitle title="Seguridad y validación obligatoria" subtitle="La foto de perfil debe coincidir con el documento cargado para activar la cuenta." /><div className="grid gap-6 lg:grid-cols-3"><Card className="p-8"><UserCheck className="text-cyan-300"/><h3 className="mt-4 text-2xl font-black">Perfil verificado</h3><p className="mt-3 text-slate-300">El usuario debe subir cédula, selfie y una foto de perfil. La plataforma valida que coincidan antes de permitir comprar o vender.</p></Card><Card className="p-8"><ShieldCheck className="text-cyan-300"/><h3 className="mt-4 text-2xl font-black">Control diario</h3><p className="mt-3 text-slate-300">Si el usuario no confirma su identidad, su cuenta queda limitada y sus productos pasan a revisión.</p></Card><Card className="p-8"><Lock className="text-cyan-300"/><h3 className="mt-4 text-2xl font-black">Producto congelado</h3><p className="mt-3 text-slate-300">Productos con duplicidad, reportes o falta de verificación quedan congelados hasta revisión administrativa.</p></Card></div></section>}

        {/* ALMACEN */}
        {screen === "almacen" && <WarehouseBlock />}

        {/* COMO FUNCIONA */}
        {screen === "funciona" && <HowBlock />}

        {/* PERFILES */}
        {screen === "perfiles" && <section><SectionTitle title="Perfiles verificados" subtitle="Usuarios de ejemplo con foto, ciudad, rol y estado de verificación." /><ProfilesBlock /></section>}

        {/* SEGUIMIENTO */}
        {screen === "seguimiento" && <TrackingBlock />}

        {/* PANEL ADMIN */}
        {screen === "admin" && <AdminPanel />}
      </main>
    </div>
  );
}

function SectionTitle({ title, subtitle }) { return <div className="mb-8"><p className="font-bold text-cyan-300">Quick Secure Market</p><h2 className="mt-2 text-4xl font-black md:text-5xl">{title}</h2><p className="mt-3 max-w-4xl text-slate-300">{subtitle}</p></div>; }

function CatalogPreview({ allProducts }) { return <Card className="p-6"><div className="mb-5 flex items-center justify-between"><h2 className="text-3xl font-black">Catálogo de productos</h2><div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3"><Search size={16}/><span className="text-sm text-slate-400">Buscar productos...</span></div></div><div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">{allProducts.slice(0,12).map(({item})=><ProductCard key={item[0]} item={item}/>)}</div></Card>; }

function ProfilesBlock({ compact=false }) { return <section className="mt-8"><div className="mb-4 flex items-center justify-between"><h2 className="text-2xl font-black">Perfiles destacados</h2><span className="text-sm text-cyan-300">Ver todos →</span></div><div className={`grid gap-4 ${compact ? "sm:grid-cols-3 lg:grid-cols-6" : "sm:grid-cols-2 lg:grid-cols-3"}`}>{profiles.map(p=><Card key={p[0]} className="overflow-hidden"><img src={p[3]} className="h-36 w-full object-cover"/><div className="p-4"><div className="flex items-center justify-between"><h3 className="font-black">{p[0]}</h3><CheckCircle2 className="text-emerald-300" size={18}/></div><p className="text-xs text-emerald-300">{p[1]}</p><p className="mt-2 text-xs text-slate-400">{p[2]}</p></div></Card>)}</div></section>; }

function HowBlock() { const steps=[["Publicas","El vendedor publica su producto en la plataforma.",img.pin],["Llevas al almacén","El vendedor lleva el producto al almacén QSM.",img.delivery],["Verificamos","Expertos revisan y certifican el producto.",img.verify],["Compra segura","El comprador paga de forma protegida.",img.payment],["PIN de entrega","El comprador entrega su PIN al recibir.",img.pin],["Pago liberado","El vendedor recibe su dinero.",img.payment]]; return <section><SectionTitle title="Cómo funciona Quick Secure Market" subtitle="Un proceso visual para reducir fraude, productos falsos y problemas de entrega."/><div className="grid gap-4 lg:grid-cols-6">{steps.map((s,i)=><Card key={s[0]} className="overflow-hidden"><img src={s[2]} className="h-32 w-full object-cover"/><div className="p-4"><span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-black">{i+1}</span><h3 className="mt-3 font-black">{s[0]}</h3><p className="mt-2 text-xs leading-5 text-slate-300">{s[1]}</p></div></Card>)}</div></section>; }

function WarehouseBlock() { return <section><SectionTitle title="Almacén Quick Secure (QSM)" subtitle="Centro físico donde se reciben, certifican, almacenan y entregan productos."/><div className="grid gap-6 lg:grid-cols-4"><Card className="overflow-hidden"><img src={img.delivery} className="h-44 w-full object-cover"/><div className="p-5"><h3 className="font-black">Recepción segura</h3><p className="mt-2 text-sm text-slate-300">Recibimos el producto del vendedor.</p></div></Card><Card className="overflow-hidden"><img src={img.verify} className="h-44 w-full object-cover"/><div className="p-5"><h3 className="font-black">Verificación experta</h3><p className="mt-2 text-sm text-slate-300">Revisamos, probamos y certificamos.</p></div></Card><Card className="overflow-hidden"><img src={img.warehouse} className="h-44 w-full object-cover"/><div className="p-5"><h3 className="font-black">Almacenamiento</h3><p className="mt-2 text-sm text-slate-300">Guardamos el producto de forma segura.</p></div></Card><Card className="overflow-hidden"><img src={img.delivery} className="h-44 w-full object-cover"/><div className="p-5"><h3 className="font-black">Entrega o envío</h3><p className="mt-2 text-sm text-slate-300">Retiro en almacén o envío a domicilio.</p></div></Card></div><Card className="mt-6 p-8"><div className="grid gap-6 md:grid-cols-3"><div><Truck className="text-cyan-300"/><h3 className="mt-3 font-black">Envío a domicilio</h3><p className="mt-2 text-sm text-slate-300">El comprador puede pagar un monto adicional de envío y seguro.</p></div><div><Lock className="text-cyan-300"/><h3 className="mt-3 font-black">PIN de seguridad</h3><p className="mt-2 text-sm text-slate-300">El comprador confirma la entrega con un código único.</p></div><div><CreditCard className="text-cyan-300"/><h3 className="mt-3 font-black">Pago al vendedor</h3><p className="mt-2 text-sm text-slate-300">El dinero se libera cuando el producto fue entregado correctamente.</p></div></div></Card></section>; }

function TrackingBlock() {
  return (
    <section>
      <SectionTitle title="Seguimiento de tu producto" subtitle="Vista para comprador y vendedor durante el proceso de compra, certificación, envío, PIN y liberación del pago." />
      <div className="grid gap-6 lg:grid-cols-[1.3fr_.7fr]">
        <Card className="p-8">
          <div className="grid gap-6 md:grid-cols-5">
            {["Comprado", "En almacén QSM", "Certificado", "En camino", "Entregado con PIN"].map((s, i) => (
              <div key={s} className="relative text-center">
                {i < 4 && <div className="absolute left-1/2 top-8 hidden h-1 w-full bg-gradient-to-r from-emerald-400 to-blue-500 md:block" />}
                <div className={`relative mx-auto flex h-16 w-16 items-center justify-center rounded-full ${i < 4 ? "bg-emerald-500" : "bg-blue-600"} shadow-[0_0_30px_rgba(34,197,94,.25)]`}><CheckCircle2 /></div>
                <h3 className="mt-3 font-black">{s}</h3>
                <p className="mt-2 text-xs text-slate-400">Estado live · Paso {i + 1}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 rounded-[2rem] border border-cyan-300/20 bg-cyan-400/5 p-6">
            <h3 className="text-2xl font-black">Mapa de entrega demo</h3>
            <div className="mt-4 h-72 overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,.3),transparent_20%),linear-gradient(135deg,rgba(15,23,42,.9),rgba(2,6,23,.9))] p-6">
              <div className="relative h-full w-full">
                <div className="absolute left-[15%] top-[30%] rounded-2xl bg-white/10 px-4 py-3 text-sm">Vendedor</div>
                <div className="absolute left-[45%] top-[50%] rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black">Almacén QSM</div>
                <div className="absolute right-[10%] top-[22%] rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black">Comprador</div>
                <div className="absolute left-[24%] top-[44%] h-1 w-[25%] rotate-12 bg-cyan-400" />
                <div className="absolute right-[24%] top-[39%] h-1 w-[25%] -rotate-12 bg-emerald-400" />
                <Truck className="absolute left-[63%] top-[38%] animate-pulse text-cyan-300" />
              </div>
            </div>
          </div>
        </Card>
        <Card className="p-8">
          <h3 className="text-2xl font-black">Resumen de orden</h3>
          <div className="mt-6 space-y-4 text-sm text-slate-300">
            <div className="rounded-2xl bg-white/5 p-4"><b className="text-white">Producto:</b> iPhone 13 Pro certificado</div>
            <div className="rounded-2xl bg-white/5 p-4"><b className="text-white">PIN:</b> <span className="text-2xl font-black tracking-widest text-cyan-300">4829</span></div>
            <div className="rounded-2xl bg-white/5 p-4"><b className="text-white">Pago:</b> Retenido hasta confirmar entrega</div>
            <div className="rounded-2xl bg-white/5 p-4"><b className="text-white">Seguro:</b> Envío a domicilio protegido</div>
          </div>
        </Card>
      </div>
    </section>
  );
}

function AuthModal({ mode, setMode, onClose }) {
  const isRegister = mode === "register";
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur">
      <Card className="relative w-full max-w-2xl border-blue-400/20 bg-[#071225] p-6 shadow-[0_0_80px_rgba(37,99,235,.25)]">
        <button onClick={onClose} className="absolute right-5 top-5 rounded-xl p-2 hover:bg-white/10"><X size={20}/></button>
        <h2 className="text-3xl font-black">Bienvenido a Quick Secure Market 👋</h2>
        <p className="mt-2 text-sm text-slate-300">{isRegister ? "Crea una cuenta demo con validación obligatoria." : "Inicia sesión para continuar."}</p>
        <div className="mt-6 grid grid-cols-2 rounded-2xl bg-white/5 p-1">
          <button onClick={() => setMode("login")} className={`rounded-xl py-3 text-sm font-bold ${!isRegister ? "bg-blue-600" : "text-slate-300"}`}>Iniciar sesión</button>
          <button onClick={() => setMode("register")} className={`rounded-xl py-3 text-sm font-bold ${isRegister ? "bg-blue-600" : "text-slate-300"}`}>Registrarse</button>
        </div>
        {isRegister ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 outline-none focus:border-blue-400" placeholder="Nombre real *" />
            <input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 outline-none focus:border-blue-400" placeholder="Apellido real *" />
            <input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 outline-none focus:border-blue-400" placeholder="Correo electrónico *" />
            <input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 outline-none focus:border-blue-400" placeholder="Teléfono *" />
            <input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 outline-none focus:border-blue-400" placeholder="Cédula de identidad *" />
            <input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 outline-none focus:border-blue-400" placeholder="Provincia / ubicación *" />
            <div className="rounded-2xl border border-dashed border-cyan-300/30 bg-cyan-400/5 p-4 md:col-span-2">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-black">Foto de perfil obligatoria *</p>
                  <p className="mt-1 text-sm text-slate-300">Debe coincidir con la selfie y el documento para activar la cuenta.</p>
                </div>
                <Button>Seleccionar foto</Button>
              </div>
            </div>
            <input type="password" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 outline-none focus:border-blue-400" placeholder="Contraseña *" />
            <input type="password" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 outline-none focus:border-blue-400" placeholder="Confirmar contraseña *" />
            <Button onClick={onClose} className="md:col-span-2">Crear cuenta demo</Button>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <input className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 outline-none focus:border-blue-400" placeholder="Correo electrónico" />
            <input type="password" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 outline-none focus:border-blue-400" placeholder="Contraseña" />
            <Button onClick={onClose} className="w-full">Entrar</Button>
          </div>
        )}
      </Card>
    </div>
  );
}

function AIWidget({ onClose }) {
  const alerts = [
    ["Precio sospechoso", "Este iPhone está 48% por debajo del promedio. Riesgo medio/alto."],
    ["Imagen reutilizada", "La foto coincide con otra publicación detectada en internet."],
    ["Cuenta nueva", "El vendedor fue creado hace 2 días y requiere verificación adicional."],
  ];
  return (
    <div className="fixed bottom-6 right-6 z-[90] w-[min(460px,calc(100vw-2rem))]">
      <Card className="border-purple-400/30 bg-[#120b2a] p-5 shadow-[0_0_60px_rgba(168,85,247,.25)]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-cyan-300 to-blue-700 text-4xl shadow-[0_0_40px_rgba(34,211,238,.35)] animate-pulse">🤖</div>
            <div>
              <p className="text-sm font-bold text-purple-300">IA Quick Secure</p>
              <h3 className="text-2xl font-black">Sofia Secure</h3>
              <p className="text-xs text-emerald-300">Monitoreo antifraude activo</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 hover:bg-white/10"><X size={18}/></button>
        </div>
        <div className="mt-4 rounded-2xl bg-white/5 p-4 text-sm leading-6 text-slate-300">
          Hola 👋 Analizo precios, imágenes, reputación, identidad y comportamiento para proteger compradores y vendedores.
        </div>
        <div className="mt-4 space-y-3">
          {alerts.map(([title, text]) => (
            <div key={title} className="rounded-2xl border border-red-400/20 bg-red-500/10 p-3">
              <p className="font-black text-red-200">{title}</p>
              <p className="mt-1 text-xs leading-5 text-slate-300">{text}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-2">
          {["¿Por qué este producto es más barato?", "¿Cómo valido mi identidad?", "¿Cómo funciona el almacén QSM?", "¿Cuándo recibe el dinero el vendedor?"].map(q => <button key={q} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-slate-200 hover:bg-white/10">{q}</button>)}
        </div>
      </Card>
    </div>
  );
}

function AdminPanel() {
  const metrics = [["Usuarios bloqueados", "14"], ["Productos en revisión", "32"], ["Reportes de fraude", "8"], ["Disputas abiertas", "5"]];
  return (
    <section>
      <SectionTitle title="Panel administrador antifraude" subtitle="Control central para revisar usuarios, productos, métricas, reportes y certificaciones visuales." />
      <div className="grid gap-6 md:grid-cols-4">
        {metrics.map(([label, value]) => (
          <Card key={label} className="p-6 transition hover:-translate-y-1 hover:border-cyan-300/40">
            <p className="text-sm text-slate-400">{label}</p>
            <p className="mt-3 text-5xl font-black text-white">{value}</p>
          </Card>
        ))}
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_.8fr]">
        <Card className="p-8">
          <h3 className="text-2xl font-black">Cola de revisión</h3>
          <div className="mt-5 space-y-3">
            {["Cuenta nueva sin selfie diaria", "Producto duplicado por IMEI", "Precio fuera del promedio", "Disputa por entrega incompleta"].map((x, i) => (
              <div key={x} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
                <span>{x}</span><span className={`rounded-full px-3 py-1 text-xs font-black ${i < 2 ? "bg-red-500/20 text-red-300" : "bg-amber-500/20 text-amber-300"}`}>{i < 2 ? "Alto" : "Medio"}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-8">
          <h3 className="text-2xl font-black">Certificación visual</h3>
          <div className="mt-6 rounded-[2rem] border border-emerald-300/30 bg-emerald-500/10 p-6 text-center">
            <ShieldCheck className="mx-auto text-emerald-300" size={54}/>
            <p className="mt-3 text-3xl font-black">QSM VERIFIED</p>
            <p className="mt-2 text-sm text-slate-300">Producto revisado, certificado y trazable.</p>
            <div className="mx-auto mt-5 grid h-28 w-28 grid-cols-4 gap-1 rounded-xl bg-white p-2">
              {Array.from({length:16}).map((_,i)=><div key={i} className={`${i%3===0 ? "bg-black" : "bg-slate-300"} rounded-sm`} />)}
            </div>
            <p className="mt-3 text-xs text-cyan-300">QR demo · QSM-8842-DR</p>
          </div>
        </Card>
      </div>
    </section>
  );
}
