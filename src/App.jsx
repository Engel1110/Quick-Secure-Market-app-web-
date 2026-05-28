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
  UserCheck,
  Truck,
  Lock,
  CheckCircle2,
  CreditCard,
  Smartphone,
  Shirt,
  Sofa,
  Refrigerator,
  Fan,
  Footprints,
  Star,
  BarChart3,
  Bell,
  X,
  Bot,
  MapPin,
  AlertTriangle,
} from "lucide-react";

function Card({ className = "", children }) {
  return (
    <div className={`rounded-[1.6rem] border border-white/10 bg-white/[0.055] backdrop-blur-xl ${className}`}>
      {children}
    </div>
  );
}

function Button({ className = "", variant = "default", children, ...props }) {
  const styles =
    variant === "outline"
      ? "border border-white/15 bg-white/5 text-white hover:bg-white/10"
      : "bg-blue-600 text-white hover:bg-blue-500 shadow-[0_0_24px_rgba(37,99,235,.25)]";

  return (
    <button
      className={`inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-bold transition-all duration-300 ${styles} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

const landingBg = "/qsm-company.png";

const img = {
  warehouse:
    "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=1600&auto=format&fit=crop",
  delivery:
    "https://images.unsplash.com/photo-1566576721346-d4a3b4eaeb55?q=80&w=900&auto=format&fit=crop",
  verify:
    "https://images.unsplash.com/photo-1581090464777-f3220bbe1b8b?q=80&w=900&auto=format&fit=crop",
  pin: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=900&auto=format&fit=crop",
  payment:
    "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=900&auto=format&fit=crop",
};

const catalog = [
  {
    name: "Tecnología",
    icon: Smartphone,
    items: [
      ["iPhone 13 Pro", "RD$ 45,000", "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?q=80&w=700&auto=format&fit=crop"],
      ["Laptop Dell Latitude", "RD$ 28,000", "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?q=80&w=700&auto=format&fit=crop"],
      ["PlayStation 5", "RD$ 32,000", "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?q=80&w=700&auto=format&fit=crop"],
      ["iPad Air", "RD$ 25,000", "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?q=80&w=700&auto=format&fit=crop"],
    ],
  },
  {
    name: "Ropas",
    icon: Shirt,
    items: [
      ["Camisa original", "RD$ 1,500", "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=700&auto=format&fit=crop"],
      ["Pantalón Levi’s", "RD$ 1,200", "https://images.unsplash.com/photo-1542272604-787c3835535d?q=80&w=700&auto=format&fit=crop"],
      ["Chaqueta Adidas", "RD$ 2,800", "https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=700&auto=format&fit=crop"],
      ["Vestido casual", "RD$ 1,000", "https://images.unsplash.com/photo-1566174053879-31528523f8ae?q=80&w=700&auto=format&fit=crop"],
    ],
  },
  {
    name: "Zapatos",
    icon: Footprints,
    items: [
      ["Nike Air Jordan", "RD$ 6,500", "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=700&auto=format&fit=crop"],
      ["Adidas Ultraboost", "RD$ 4,200", "https://images.unsplash.com/photo-1608231387042-66d1773070a5?q=80&w=700&auto=format&fit=crop"],
      ["Converse Star", "RD$ 2,000", "https://images.unsplash.com/photo-1607522370275-f14206abe5d3?q=80&w=700&auto=format&fit=crop"],
      ["Sandalias Reef", "RD$ 1,500", "https://images.unsplash.com/photo-1603487742131-4160ec999306?q=80&w=700&auto=format&fit=crop"],
    ],
  },
  {
    name: "Electrodomésticos",
    icon: Refrigerator,
    items: [
      ["Nevera Samsung", "RD$ 35,000", "https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?q=80&w=700&auto=format&fit=crop"],
      ["Lavadora LG", "RD$ 22,000", "https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?q=80&w=700&auto=format&fit=crop"],
      ["Microondas", "RD$ 5,500", "https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?q=80&w=700&auto=format&fit=crop"],
      ["Estufa Whirlpool", "RD$ 18,000", "https://images.unsplash.com/photo-1556911220-bff31c812dba?q=80&w=700&auto=format&fit=crop"],
    ],
  },
  {
    name: "Muebles",
    icon: Sofa,
    items: [
      ["Juego de sala", "RD$ 28,000", "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?q=80&w=700&auto=format&fit=crop"],
      ["Cama Queen", "RD$ 16,000", "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?q=80&w=700&auto=format&fit=crop"],
      ["Escritorio moderno", "RD$ 9,000", "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?q=80&w=700&auto=format&fit=crop"],
      ["Silla gamer", "RD$ 7,500", "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?q=80&w=700&auto=format&fit=crop"],
    ],
  },
  {
    name: "Artículo del hogar",
    icon: Fan,
    items: [
      ["Abanico pedestal", "RD$ 2,800", "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=700&auto=format&fit=crop"],
      ["Lámpara de mesa", "RD$ 1,200", "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?q=80&w=700&auto=format&fit=crop"],
      ["Organizador multiuso", "RD$ 850", "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?q=80&w=700&auto=format&fit=crop"],
      ["Set de ollas", "RD$ 2,400", "https://images.unsplash.com/photo-1584990347449-a9a6938924de?q=80&w=700&auto=format&fit=crop"],
    ],
  },
];

const profiles = [
  ["Juan Pérez", "Comprador verificado", "Santo Domingo, RD", "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=400&auto=format&fit=crop"],
  ["María Rodríguez", "Vendedora verificada", "Santiago, RD", "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=400&auto=format&fit=crop"],
  ["Carlos Gómez", "Top Seller RD", "La Romana, RD", "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400&auto=format&fit=crop"],
  ["Laura Sánchez", "Compradora verificada", "Punta Cana, RD", "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=400&auto=format&fit=crop"],
  ["Miguel Tavárez", "Vendedor confiable", "San Pedro, RD", "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=400&auto=format&fit=crop"],
  ["Ana Martínez", "Compradora verificada", "Puerto Plata, RD", "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?q=80&w=400&auto=format&fit=crop"],
];

function ProductCard({ item }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50 p-3 transition-all duration-500 hover:-translate-y-2 hover:scale-[1.02] hover:border-cyan-400/40 hover:shadow-[0_0_40px_rgba(34,211,238,.16)]">
      <div className="absolute right-3 top-3 z-10 rounded-full bg-emerald-500/25 px-2 py-1 text-[10px] font-black text-emerald-200">
        QSM VERIFIED
      </div>
      <img src={item[2]} alt={item[0]} className="h-32 w-full rounded-xl object-cover transition duration-700 group-hover:scale-110" />
      <h4 className="mt-3 text-sm font-black text-white">{item[0]}</h4>
      <p className="mt-2 font-black text-white">{item[1]}</p>
      <div className="mt-2 flex items-center justify-between">
        <span className="rounded-full bg-emerald-500/20 px-2 py-1 text-xs font-bold text-emerald-300">Certificado</span>
        <span className="flex items-center gap-1 text-xs text-amber-300"><Star size={13} fill="currentColor" />4.8</span>
      </div>
      <div className="mt-3 grid grid-cols-[1fr_auto] items-center gap-2 rounded-xl bg-white/5 p-2 text-xs text-slate-300">
        <span>Código único</span>
        <span className="font-black text-cyan-300">QSM-{Math.floor(Math.random() * 9000 + 1000)}</span>
      </div>
    </div>
  );
}

function PublicLanding({ onLogin }) {
  const [adminUser, setAdminUser] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [error, setError] = useState("");
  const [publicTab, setPublicTab] = useState("login");

  const handleAdminLogin = () => {
    if (adminUser.trim().toLowerCase() === "admin" && adminPass.trim().toLowerCase() === "admin") {
      setError("");
      onLogin();
      return;
    }
    setError("Usuario o contraseña incorrectos. Demo: admin / admin");
  };

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#050b18] text-white">
      <section id="inicio" className="relative min-h-screen overflow-hidden">
        <img
          src={landingBg}
          onError={(e) => {
            e.currentTarget.src = img.warehouse;
          }}
          className="absolute inset-0 h-full w-full scale-105 object-cover opacity-75"
          alt="Quick Secure Market empresa"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050b18] via-transparent to-black/30" />

        <header className="relative z-10 mx-auto flex max-w-[1700px] items-center justify-between px-8 py-6">
          <button onClick={() => scrollTo("inicio")} className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-400/30 bg-black/30 backdrop-blur">
              <ShieldCheck className="text-cyan-300" />
            </div>
            <div className="text-left">
              <h1 className="text-3xl font-black text-white">QSM</h1>
              <p className="text-xs text-slate-300">Quick Secure Market</p>
            </div>
          </button>
          <nav className="hidden items-center gap-8 text-sm font-bold text-slate-100 md:flex">
            <button onClick={() => scrollTo("inicio")} className="text-cyan-300">Inicio</button>
            <button onClick={() => scrollTo("nosotros")} className="hover:text-cyan-300">Nosotros</button>
            <button onClick={() => scrollTo("servicios")} className="hover:text-cyan-300">Servicios</button>
            <button onClick={() => scrollTo("contacto")} className="hover:text-cyan-300">Contacto</button>
            <button onClick={() => setPublicTab("register")} className="rounded-xl border border-cyan-400/50 px-6 py-3 hover:bg-cyan-400/10">Registrarse</button>
          </nav>
        </header>

        <main className="relative z-10 mx-auto grid min-h-[calc(100vh-120px)] max-w-[1700px] items-center gap-10 px-8 pb-12 lg:grid-cols-[1fr_470px]">
          <section className="max-w-2xl">
            <h2 className="text-5xl font-black leading-tight md:text-7xl">
              Comercio seguro, <span className="text-cyan-300">confianza total</span>
            </h2>
            <p className="mt-6 text-xl leading-9 text-slate-100">
              Plataforma especializada en compra, venta, almacén QSM, certificación de productos, envío protegido e inteligencia artificial antifraude.
            </p>
            <div className="mt-8 space-y-4 text-sm font-bold text-slate-100">
              {[
                [ShieldCheck, "Verificación de productos"],
                [Warehouse, "Almacén seguro (QSM)"],
                [Lock, "Protección en cada compra"],
              ].map(([Icon, text]) => (
                <div key={text} className="flex items-center gap-3"><Icon className="text-cyan-300" size={20} />{text}</div>
              ))}
            </div>
            <div className="mt-10 grid max-w-xl gap-3 sm:grid-cols-3">
              {[["10K+", "Productos disponibles"], ["5K+", "Clientes registrados"], ["98%", "Satisfacción garantizada"]].map(([num, label]) => (
                <div key={label} className="rounded-2xl border border-white/15 bg-black/35 p-5 backdrop-blur">
                  <p className="text-3xl font-black text-cyan-300">{num}</p>
                  <p className="mt-1 text-xs text-slate-200">{label}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/15 bg-[#10131a]/85 p-8 shadow-[0_0_90px_rgba(34,211,238,.22)] backdrop-blur-xl">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[1.5rem] border border-cyan-400/30 bg-cyan-400/10">
              <ShieldCheck className="h-10 w-10 text-white" />
            </div>
            <h3 className="text-center text-2xl font-black">Bienvenido a<br />Quick Secure Market</h3>
            <div className="mt-7 grid grid-cols-2 border-b border-white/10 text-sm font-bold">
              <button onClick={() => setPublicTab("login")} className={`pb-3 ${publicTab === "login" ? "border-b-2 border-cyan-300 text-cyan-300" : "text-slate-400"}`}>Iniciar sesión</button>
              <button onClick={() => setPublicTab("register")} className={`pb-3 ${publicTab === "register" ? "border-b-2 border-cyan-300 text-cyan-300" : "text-slate-400"}`}>Registrarse</button>
            </div>

            {publicTab === "login" ? (
              <div className="mt-6 space-y-4">
                <input value={adminUser} onChange={(e) => setAdminUser(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-5 py-4 outline-none focus:border-cyan-300" placeholder="Usuario" />
                <input value={adminPass} onChange={(e) => setAdminPass(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()} type="password" className="w-full rounded-xl border border-white/10 bg-white/5 px-5 py-4 outline-none focus:border-cyan-300" placeholder="Contraseña" />
                {error && <p className="text-sm text-red-300">{error}</p>}
                <button onClick={handleAdminLogin} className="w-full rounded-xl bg-cyan-500 px-5 py-4 font-black text-slate-950 transition hover:bg-cyan-300">Iniciar sesión</button>
                <button onClick={() => { setAdminUser("admin"); setAdminPass("admin"); }} className="w-full rounded-xl border border-white/10 bg-white/5 px-5 py-4 text-sm font-bold hover:bg-white/10">Cuenta de administrador</button>
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                <input className="w-full rounded-xl border border-white/10 bg-white/5 px-5 py-3 outline-none focus:border-cyan-300" placeholder="Nombre y apellido real *" />
                <input className="w-full rounded-xl border border-white/10 bg-white/5 px-5 py-3 outline-none focus:border-cyan-300" placeholder="Cédula / ID *" />
                <input className="w-full rounded-xl border border-white/10 bg-white/5 px-5 py-3 outline-none focus:border-cyan-300" placeholder="Correo electrónico *" />
                <button className="w-full rounded-xl border border-dashed border-cyan-300/30 bg-cyan-400/5 px-5 py-3 text-sm font-bold">Subir documento frontal y trasero *</button>
                <button className="w-full rounded-xl border border-dashed border-cyan-300/30 bg-cyan-400/5 px-5 py-3 text-sm font-bold">Selfie + foto de perfil obligatoria *</button>
                <button className="w-full rounded-xl bg-cyan-500 px-5 py-4 font-black text-slate-950 transition hover:bg-cyan-300">Enviar registro para revisión</button>
              </div>
            )}
            <p className="mt-5 text-center text-xs text-slate-400">Plataforma 100% segura y verificada</p>
          </section>
        </main>
      </section>

      <section id="nosotros" className="relative z-10 mx-auto max-w-[1700px] px-8 py-16">
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="p-8"><h3 className="text-2xl font-black">Nosotros</h3><p className="mt-3 text-slate-300">Quick Secure Market conecta compradores y vendedores con certificación física, pago protegido y control antifraude.</p></Card>
          <Card className="p-8"><h3 className="text-2xl font-black">Misión</h3><p className="mt-3 text-slate-300">Reducir estafas digitales y aumentar la confianza en el comercio electrónico dominicano.</p></Card>
          <Card className="p-8"><h3 className="text-2xl font-black">Visión</h3><p className="mt-3 text-slate-300">Convertirnos en el ecosistema de compra y venta segura más confiable de RD.</p></Card>
        </div>
      </section>

      <section id="servicios" className="relative z-10 mx-auto max-w-[1700px] px-8 py-8">
        <h2 className="mb-6 text-4xl font-black">Servicios principales</h2>
        <div className="grid gap-6 md:grid-cols-4">
          {[[PackageCheck, "Certificación"], [Warehouse, "Almacén QSM"], [CreditCard, "Pago protegido"], [Bot, "IA antifraude"]].map(([Icon, title]) => (
            <Card key={title} className="p-6"><Icon className="text-cyan-300" /><h3 className="mt-4 text-xl font-black">{title}</h3><p className="mt-2 text-sm text-slate-300">Servicio diseñado para proteger cada transacción.</p></Card>
          ))}
        </div>
      </section>

      <footer id="contacto" className="relative z-10 mt-10 border-t border-white/10 bg-black/30 px-8 py-10 backdrop-blur">
        <div className="mx-auto flex max-w-[1700px] flex-col justify-between gap-4 md:flex-row md:items-center">
          <p className="text-sm text-slate-300">© 2026 Quick Secure Market · Santo Domingo, RD</p>
          <p className="text-sm text-cyan-300">soporte@quicksecuremarket.com</p>
        </div>
      </footer>
    </div>
  );
}

function AdminDashboardHome({ setScreen }) {
  const stats = [["1,245", "Productos totales"], ["3,428", "Usuarios registrados"], ["856", "Órdenes completadas"], ["24", "Disputas abiertas"], ["RD$ 4.2M", "Ventas este mes"]];
  return (
    <section>
      <div className="mb-8 flex items-center justify-between">
        <div><p className="text-cyan-300 font-bold">QSM Admin</p><h2 className="text-4xl font-black">Dashboard</h2></div>
        <Button onClick={() => setScreen("catalogo")}>Ver catálogo</Button>
      </div>
      <div className="grid gap-5 md:grid-cols-5">
        {stats.map(([n,l]) => <Card key={l} className="p-6"><p className="text-3xl font-black">{n}</p><p className="mt-1 text-sm text-slate-400">{l}</p></Card>)}
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
        <Card className="p-8"><h3 className="text-2xl font-black">Ventas mensuales</h3><div className="mt-8 h-72 rounded-2xl bg-gradient-to-t from-cyan-500/20 to-transparent p-6"><div className="h-full rounded-xl border-b border-l border-cyan-300/30" /></div></Card>
        <Card className="p-8"><h3 className="text-2xl font-black">Órdenes recientes</h3><div className="mt-5 space-y-3">{["#QSM-1001 Juan Pérez RD$ 45,000", "#QSM-1002 María García RD$ 32,500", "#QSM-1003 Luis Rodríguez RD$ 18,900", "#QSM-1004 Ana Martínez RD$ 27,800"].map(x => <div key={x} className="rounded-xl bg-white/5 p-4 text-sm">{x}</div>)}</div></Card>
      </div>
    </section>
  );
}

function LoaderScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center overflow-hidden bg-[#050b18] text-white">
      <div className="absolute h-96 w-96 animate-pulse rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="relative text-center">
        <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-[2rem] border border-cyan-400/30 bg-blue-500/10 shadow-[0_0_70px_rgba(34,211,238,.25)]">
          <ShieldCheck className="h-14 w-14 animate-pulse text-cyan-300" />
        </div>
        <h1 className="mt-6 text-4xl font-black text-cyan-300">Quick Secure Market</h1>
        <p className="mt-3 text-slate-300">Inicializando sistema antifraude...</p>
        <div className="mx-auto mt-6 h-2 w-72 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-2/3 animate-pulse rounded-full bg-cyan-400" />
        </div>
      </div>
    </div>
  );
}

function AboutQuickSecure() {
  return (
    <Card className="mt-8 p-8">
      <div className="grid gap-6 lg:grid-cols-3">
        <div>
          <p className="font-bold text-cyan-300">Sobre Quick Secure</p>
          <h2 className="mt-2 text-3xl font-black">Comercio seguro para República Dominicana</h2>
        </div>
        <div className="rounded-2xl bg-white/5 p-5">
          <h3 className="font-black">Misión</h3>
          <p className="mt-2 text-sm leading-6 text-slate-300">Reducir fraudes digitales mediante identidad verificada, certificación física, pago protegido e inteligencia artificial.</p>
        </div>
        <div className="rounded-2xl bg-white/5 p-5">
          <h3 className="font-black">Visión</h3>
          <p className="mt-2 text-sm leading-6 text-slate-300">Convertirse en el ecosistema dominicano de confianza para comprar y vender productos online de forma segura.</p>
        </div>
      </div>
    </Card>
  );
}

function TestimonialsBlock() {
  const testimonials = [
    ["María Rodríguez", "Me sentí segura comprando. El producto llegó certificado y con seguimiento."],
    ["Carlos Gómez", "Como vendedor, el almacén QSM me da confianza para vender más rápido."],
    ["Laura Sánchez", "El PIN de entrega y el pago protegido hacen que todo sea más transparente."],
  ];
  return (
    <section className="mt-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-black">Lo que dicen nuestros usuarios</h2>
        <span className="text-sm text-cyan-300">Testimonios demo →</span>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {testimonials.map(([name, text]) => (
          <Card key={name} className="p-5 transition hover:-translate-y-1 hover:border-cyan-300/30">
            <div className="flex items-center gap-2 text-amber-300">{Array.from({ length: 5 }).map((_, i) => <Star key={i} size={14} fill="currentColor" />)}</div>
            <p className="mt-4 text-sm leading-6 text-slate-300">“{text}”</p>
            <p className="mt-4 font-black text-white">{name}</p>
            <p className="text-xs text-emerald-300">Usuario verificado</p>
          </Card>
        ))}
      </div>
    </section>
  );
}

function FooterBlock() {
  return (
    <footer className="mt-12 border-t border-white/10 bg-[#030816] px-6 py-10">
      <div className="mx-auto grid max-w-[1700px] gap-8 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-3"><ShieldCheck className="text-cyan-300" /><h3 className="text-xl font-black text-cyan-300">Quick Secure Market</h3></div>
          <p className="mt-3 text-sm leading-6 text-slate-400">Plataforma inteligente de comercio seguro con IA antifraude, almacén QSM y pago protegido.</p>
        </div>
        <div><h4 className="font-black">Soporte</h4><p className="mt-3 text-sm text-slate-400">Centro de ayuda</p><p className="mt-2 text-sm text-slate-400">Reportar fraude</p><p className="mt-2 text-sm text-slate-400">Seguimiento</p></div>
        <div><h4 className="font-black">Legal</h4><p className="mt-3 text-sm text-slate-400">Términos y condiciones</p><p className="mt-2 text-sm text-slate-400">Política de privacidad</p><p className="mt-2 text-sm text-slate-400">Protección de datos</p></div>
        <div><h4 className="font-black">Contacto</h4><p className="mt-3 text-sm text-slate-400">soporte@quicksecuremarket.com</p><p className="mt-2 text-sm text-slate-400">Santo Domingo, RD</p><p className="mt-2 text-sm text-cyan-300">© 2026 Quick Secure Market</p></div>
      </div>
    </footer>
  );
}

function SectionTitle({ title, subtitle }) {
  return (
    <div className="mb-8">
      <p className="font-bold text-cyan-300">Quick Secure Market</p>
      <h2 className="mt-2 text-4xl font-black md:text-5xl">{title}</h2>
      <p className="mt-3 max-w-4xl text-slate-300">{subtitle}</p>
    </div>
  );
}

function CatalogPreview({ allProducts }) {
  return (
    <Card className="p-6">
      <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h2 className="text-3xl font-black">Catálogo de productos</h2>
        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <Search size={16} />
          <span className="text-sm text-slate-400">Buscar productos...</span>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {allProducts.slice(0, 12).map(({ item }) => <ProductCard key={item[0]} item={item} />)}
      </div>
    </Card>
  );
}

function ProfilesBlock({ compact = false }) {
  return (
    <section className="mt-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-black">Perfiles destacados</h2>
        <span className="text-sm text-cyan-300">Ver todos →</span>
      </div>
      <div className={`grid gap-4 ${compact ? "sm:grid-cols-3 xl:grid-cols-6" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
        {profiles.map((p) => (
          <Card key={p[0]} className="overflow-hidden transition hover:-translate-y-1 hover:border-cyan-300/30">
            <img src={p[3]} className="h-36 w-full object-cover" />
            <div className="p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-black">{p[0]}</h3>
                <CheckCircle2 className="text-emerald-300" size={18} />
              </div>
              <p className="text-xs text-emerald-300">{p[1]}</p>
              <p className="mt-2 text-xs text-slate-400">{p[2]}</p>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

function AuthModal({ mode, setMode, onClose }) {
  const isRegister = mode === "register";
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur">
      <Card className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto border-blue-400/20 bg-[#071225] p-6 shadow-[0_0_80px_rgba(37,99,235,.25)]">
        <button onClick={onClose} className="absolute right-5 top-5 rounded-xl p-2 hover:bg-white/10"><X size={20} /></button>
        <h2 className="text-3xl font-black">Bienvenido a Quick Secure Market 👋</h2>
        <p className="mt-2 text-sm text-slate-300">{isRegister ? "Crea una cuenta demo con validación obligatoria." : "Inicia sesión para continuar."}</p>
        <div className="mt-6 grid grid-cols-2 rounded-2xl bg-white/5 p-1">
          <button onClick={() => setMode("login")} className={`rounded-xl py-3 text-sm font-bold ${!isRegister ? "bg-blue-600" : "text-slate-300"}`}>Iniciar sesión</button>
          <button onClick={() => setMode("register")} className={`rounded-xl py-3 text-sm font-bold ${isRegister ? "bg-blue-600" : "text-slate-300"}`}>Registrarse</button>
        </div>

        {isRegister ? (
          <div className="mt-6 space-y-5">
            <div className="rounded-2xl border border-cyan-300/20 bg-cyan-400/5 p-4">
              <p className="font-black text-cyan-200">Registro seguro obligatorio</p>
              <p className="mt-1 text-sm leading-6 text-slate-300">
                Todos los usuarios pueden comprar y vender, pero deben completar la validación de identidad antes de publicar, comprar o recibir pagos.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 outline-none focus:border-blue-400" placeholder="Nombre real *" />
              <input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 outline-none focus:border-blue-400" placeholder="Apellido real *" />
              <input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 outline-none focus:border-blue-400" placeholder="Correo electrónico *" />
              <input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 outline-none focus:border-blue-400" placeholder="Teléfono *" />
              <input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 outline-none focus:border-blue-400" placeholder="Cédula de identidad *" />
              <input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 outline-none focus:border-blue-400" placeholder="Provincia / ubicación *" />
              <select className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 outline-none focus:border-blue-400">
                <option>Género *</option><option>Masculino</option><option>Femenino</option><option>Prefiero no decirlo</option>
              </select>
              <input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 outline-none focus:border-blue-400" placeholder="Dirección de referencia *" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {[
                ["Documento frontal *", "Foto clara de la cédula o ID por delante.", "Subir frontal"],
                ["Documento trasero *", "Foto clara de la cédula o ID por detrás.", "Subir trasero"],
                ["Selfie de validación *", "Debe coincidir con el documento registrado.", "Tomar selfie"],
                ["Foto de perfil obligatoria *", "Debe coincidir con la selfie y el documento.", "Seleccionar foto"],
              ].map(([title, text, btn]) => (
                <div key={title} className="rounded-2xl border border-dashed border-cyan-300/30 bg-cyan-400/5 p-4">
                  <p className="font-black">{title}</p>
                  <p className="mt-1 text-sm text-slate-300">{text}</p>
                  <Button className="mt-4" variant="outline">{btn}</Button>
                </div>
              ))}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <input type="password" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 outline-none focus:border-blue-400" placeholder="Contraseña *" />
              <input type="password" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 outline-none focus:border-blue-400" placeholder="Confirmar contraseña *" />
            </div>
            <div className="rounded-2xl bg-emerald-500/10 p-4 text-sm leading-6 text-emerald-200">
              Después del registro, la cuenta queda pendiente de aprobación. La plataforma puede solicitar selfie diaria; si el usuario no confirma su identidad, su cuenta y productos quedan limitados.
            </div>
            <Button onClick={onClose} className="w-full">Crear cuenta demo</Button>
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
            <div className="relative flex h-20 w-20 animate-pulse items-center justify-center rounded-full bg-gradient-to-br from-cyan-300 to-blue-700 text-4xl shadow-[0_0_40px_rgba(34,211,238,.35)]">🤖</div>
            <div><p className="text-sm font-bold text-purple-300">IA Quick Secure</p><h3 className="text-2xl font-black">Sofia Secure</h3><p className="text-xs text-emerald-300">Monitoreo antifraude activo</p></div>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 hover:bg-white/10"><X size={18} /></button>
        </div>
        <div className="mt-4 rounded-2xl bg-white/5 p-4 text-sm leading-6 text-slate-300">
          Hola 👋 Analizo precios, imágenes, reputación, identidad y comportamiento para proteger compradores y vendedores.
        </div>
        <div className="mt-4 space-y-3">
          {alerts.map(([title, text]) => <div key={title} className="rounded-2xl border border-red-400/20 bg-red-500/10 p-3"><p className="font-black text-red-200">{title}</p><p className="mt-1 text-xs leading-5 text-slate-300">{text}</p></div>)}
        </div>
      </Card>
    </div>
  );
}

function DashboardModes({ userMode, setUserMode }) {
  const buyer = ["Pedidos activos", "Historial de compras", "Productos favoritos", "Tracking live", "Disputas", "Nivel de confianza"];
  const seller = ["Productos publicados", "Ventas completadas", "Dinero retenido/liberado", "Reputación", "Productos en revisión", "Analytics simples"];
  const data = userMode === "comprador" ? buyer : seller;
  return (
    <section>
      <SectionTitle title="Dashboard comprador y vendedor" subtitle="La plataforma cambia la experiencia según el rol del usuario, pero mantiene el mismo régimen de seguridad para todos." />
      <div className="mb-6 flex gap-3"><Button onClick={() => setUserMode("comprador")} variant={userMode === "comprador" ? "default" : "outline"}>Modo comprador</Button><Button onClick={() => setUserMode("vendedor")} variant={userMode === "vendedor" ? "default" : "outline"}>Modo vendedor</Button></div>
      <div className="grid gap-6 lg:grid-cols-[1fr_.8fr]">
        <Card className="p-8"><h3 className="text-3xl font-black">Vista de {userMode}</h3><div className="mt-6 grid gap-4 md:grid-cols-2">{data.map((item, i) => <div key={item} className="rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:-translate-y-1 hover:border-cyan-300/40"><p className="text-sm text-cyan-300">Módulo {i + 1}</p><h4 className="mt-2 text-xl font-black">{item}</h4></div>)}</div></Card>
        <Card className="p-8"><h3 className="text-2xl font-black">Reputación avanzada</h3><div className="mt-6 space-y-4">{["⭐ 4.9 vendedor premium", "🟢 Muy confiable", "🛡️ 100 ventas verificadas", "🏆 Top Seller RD"].map((x) => <div key={x} className="rounded-2xl bg-white/5 p-4 text-slate-200">{x}</div>)}</div><div className="mt-6 rounded-[2rem] bg-emerald-500/10 p-6"><p className="text-sm text-emerald-300">Nivel de confianza</p><p className="mt-2 text-5xl font-black">97%</p><div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10"><div className="h-full w-[97%] animate-pulse rounded-full bg-emerald-400" /></div></div></Card>
      </div>
    </section>
  );
}

function HowBlock() {
  const steps = [
    ["Publicas", "El vendedor publica su producto en la plataforma.", img.pin],
    ["Llevas al almacén", "El vendedor lleva el producto al almacén QSM.", img.delivery],
    ["Verificamos", "Expertos revisan y certifican el producto.", img.verify],
    ["Compra segura", "El comprador paga de forma protegida.", img.payment],
    ["PIN de entrega", "El comprador entrega su PIN al recibir.", img.pin],
    ["Pago liberado", "El vendedor recibe su dinero.", img.payment],
  ];
  return <section><SectionTitle title="Cómo funciona Quick Secure Market" subtitle="Un proceso visual para reducir fraude, productos falsos y problemas de entrega." /><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">{steps.map((s, i) => <Card key={s[0]} className="overflow-hidden"><img src={s[2]} className="h-32 w-full object-cover" /><div className="p-4"><span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-black">{i + 1}</span><h3 className="mt-3 font-black">{s[0]}</h3><p className="mt-2 text-xs leading-5 text-slate-300">{s[1]}</p></div></Card>)}</div></section>;
}

function WarehouseBlock() {
  return (
    <section>
      <SectionTitle title="Almacén Quick Secure (QSM)" subtitle="Centro físico donde se reciben, certifican, almacenan y entregan productos." />
      <div className="grid gap-6 lg:grid-cols-4">
        {[[img.delivery, "Recepción segura", "Recibimos el producto del vendedor."], [img.verify, "Verificación experta", "Revisamos, probamos y certificamos."], [img.warehouse, "Almacenamiento", "Guardamos el producto de forma segura."], [img.delivery, "Entrega o envío", "Retiro en almacén o envío a domicilio."]].map(([src, t, d]) => <Card key={t} className="overflow-hidden"><img src={src} className="h-44 w-full object-cover" /><div className="p-5"><h3 className="font-black">{t}</h3><p className="mt-2 text-sm text-slate-300">{d}</p></div></Card>)}
      </div>
    </section>
  );
}

function TrackingBlock() {
  return (
    <section>
      <SectionTitle title="Seguimiento de tu producto" subtitle="Vista para comprador y vendedor durante el proceso de compra, certificación, envío, PIN y liberación del pago." />
      <div className="grid gap-6 lg:grid-cols-[1.3fr_.7fr]">
        <Card className="p-8"><div className="grid gap-6 md:grid-cols-5">{["Comprado", "En almacén QSM", "Certificado", "En camino", "Entregado con PIN"].map((s, i) => <div key={s} className="text-center"><div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${i < 4 ? "bg-emerald-500" : "bg-blue-600"} shadow-[0_0_30px_rgba(34,197,94,.25)]`}><CheckCircle2 /></div><h3 className="mt-3 font-black">{s}</h3><p className="mt-2 text-xs text-slate-400">Estado live · Paso {i + 1}</p></div>)}</div><div className="mt-8 rounded-[2rem] border border-cyan-300/20 bg-cyan-400/5 p-6"><h3 className="text-2xl font-black">Mapa de entrega demo</h3><div className="mt-4 h-72 rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,.3),transparent_20%),linear-gradient(135deg,rgba(15,23,42,.9),rgba(2,6,23,.9))] p-6"><div className="relative h-full w-full"><div className="absolute left-[15%] top-[30%] rounded-2xl bg-white/10 px-4 py-3 text-sm">Vendedor</div><div className="absolute left-[45%] top-[50%] rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black">Almacén QSM</div><div className="absolute right-[10%] top-[22%] rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black">Comprador</div><Truck className="absolute left-[63%] top-[38%] animate-pulse text-cyan-300" /></div></div></div></Card>
        <Card className="p-8"><h3 className="text-2xl font-black">Resumen de orden</h3><div className="mt-6 space-y-4 text-sm text-slate-300"><div className="rounded-2xl bg-white/5 p-4"><b className="text-white">Producto:</b> iPhone 13 Pro certificado</div><div className="rounded-2xl bg-white/5 p-4"><b className="text-white">PIN:</b> <span className="text-2xl font-black tracking-widest text-cyan-300">4829</span></div><div className="rounded-2xl bg-white/5 p-4"><b className="text-white">Pago:</b> Retenido hasta confirmar entrega</div><div className="rounded-2xl bg-white/5 p-4"><b className="text-white">Seguro:</b> Envío a domicilio protegido</div></div></Card>
      </div>
    </section>
  );
}

function AdminPanel() {
  const metrics = [["Usuarios bloqueados", "14"], ["Productos en revisión", "32"], ["Reportes de fraude", "8"], ["Disputas abiertas", "5"]];
  return <section><SectionTitle title="Panel administrador antifraude" subtitle="Control central para revisar usuarios, productos, métricas, reportes y certificaciones visuales." /><div className="grid gap-6 md:grid-cols-4">{metrics.map(([label, value]) => <Card key={label} className="p-6 transition hover:-translate-y-1 hover:border-cyan-300/40"><p className="text-sm text-slate-400">{label}</p><p className="mt-3 text-5xl font-black text-white">{value}</p></Card>)}</div></section>;
}

function DisputesBlock() {
  return <section><SectionTitle title="Sistema de disputas y escrow" subtitle="El dinero queda retenido hasta que el comprador confirma el producto con PIN. Si hay problema, el caso pasa a revisión." /><div className="grid gap-6 md:grid-cols-4">{["Producto no coincide", "Producto llegó dañado", "PIN incorrecto", "Entrega incompleta"].map((x) => <Card key={x} className="p-6"><AlertTriangle className="text-amber-300" /><h3 className="mt-4 text-xl font-black">{x}</h3><p className="mt-2 text-sm text-slate-300">Pago retenido hasta revisión administrativa.</p></Card>)}</div></section>;
}

function ProductDetailBlock() {
  return <section><SectionTitle title="Página completa del producto" subtitle="Vista profesional con imágenes, descripción, estado, certificación QSM, QR, vendedor, score IA e historial." /><div className="grid gap-8 lg:grid-cols-[.9fr_1.1fr]"><Card className="overflow-hidden"><img src={catalog[0].items[0][2]} className="h-[420px] w-full object-cover" /></Card><Card className="p-8"><div className="flex items-start justify-between gap-4"><div><h3 className="text-4xl font-black">iPhone 13 Pro</h3><p className="mt-2 text-slate-300">128GB · Sierra Blue · Usado en buen estado · Certificado</p></div><span className="rounded-full bg-emerald-500/20 px-4 py-2 text-sm font-black text-emerald-300">QSM VERIFIED</span></div><p className="mt-6 text-4xl font-black">RD$ 45,000</p><div className="mt-6 grid gap-4 md:grid-cols-3"><div className="rounded-2xl bg-white/5 p-4"><p className="text-xs text-slate-400">Score IA</p><p className="text-2xl font-black text-emerald-300">92%</p></div><div className="rounded-2xl bg-white/5 p-4"><p className="text-xs text-slate-400">Riesgo</p><p className="text-2xl font-black text-emerald-300">Bajo</p></div><div className="rounded-2xl bg-white/5 p-4"><p className="text-xs text-slate-400">Código</p><p className="text-2xl font-black text-cyan-300">QSM-8842</p></div></div><div className="mt-6 grid gap-4 md:grid-cols-[1fr_auto]"><Button>Comprar con pago protegido</Button><Button variant="outline">Ver QR certificado</Button></div></Card></div></section>;
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [screen, setScreen] = useState("inicio");
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [showAI, setShowAI] = useState(false);
  const [userMode, setUserMode] = useState("comprador");
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1600);
    return () => clearTimeout(timer);
  }, []);
  const allProducts = useMemo(() => catalog.flatMap((c) => c.items.map((i) => ({ category: c.name, item: i }))), []);

  const nav = [
    ["inicio", "Dashboard", Home],
    ["catalogo", "Catálogo", Grid3X3],
    ["seguimiento", "Órdenes", PackageCheck],
    ["producto", "Productos", PackageCheck],
    ["almacen", "Almacén QSM", Warehouse],
    ["perfiles", "Usuarios", Users],
    ["perfiles", "Perfiles registrados", Users],
    ["seguridad", "Verificaciones", ShieldCheck],
    ["admin", "Reportes", BarChart3],
    ["disputas", "Disputas", AlertTriangle],
    ["dashboard", "Configuración", UserCheck],
  ];

  if (loading) {
    return <LoaderScreen />;
  }

  if (!isAuthenticated) {
    return <PublicLanding onLogin={() => { setIsAuthenticated(true); setScreen("catalogo"); }} />;
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#050b18] text-white">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,.25),transparent_35%),radial-gradient(circle_at_80%_40%,rgba(14,165,233,.15),transparent_35%)]" />
      <div className="fixed left-10 top-32 -z-10 h-56 w-56 animate-pulse rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="fixed bottom-10 right-10 -z-10 h-72 w-72 animate-pulse rounded-full bg-purple-500/10 blur-3xl" />

      <div className="flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-white/10 bg-[#07111f]/95 p-5 backdrop-blur-xl xl:block">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/20 bg-blue-500/15">
              <ShieldCheck className="text-cyan-300" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">QSM</h2>
              <p className="text-xs text-cyan-300">ADMIN</p>
            </div>
          </div>
          <p className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-500">Menu principal</p>
          <nav className="space-y-2">
            {nav.map(([key, label, Icon], index) => (
              <button key={`${label}-${index}`} onClick={() => setScreen(key)} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-bold transition ${screen === key ? "bg-cyan-500 text-slate-950" : "text-slate-300 hover:bg-white/10"}`}>
                <Icon size={17} />{label}
              </button>
            ))}
          </nav>
          <button onClick={() => setIsAuthenticated(false)} className="mt-8 flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-red-300 hover:bg-red-500/10">Salir</button>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-50 border-b border-white/10 bg-[#050b18]/95 backdrop-blur-xl">
            <div className="mx-auto flex min-h-[82px] max-w-[1700px] items-center justify-between gap-4 px-6 py-3">
              <div className="flex items-center gap-4">
                <button className="rounded-xl border border-white/10 bg-white/5 p-3 xl:hidden"><Grid3X3 size={18} /></button>
                <div>
                  <h1 className="text-2xl font-black">{screen === "inicio" ? "Dashboard" : screen.charAt(0).toUpperCase() + screen.slice(1)}</h1>
                  <p className="text-xs text-slate-400">Panel administrativo Quick Secure Market</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button className="relative rounded-xl border border-white/10 bg-white/5 p-3"><Bell size={18} /><span className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1.5 text-xs">12</span></button>
                <button onClick={() => setScreen("perfiles")} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 backdrop-blur-md hover:bg-white/10">
                  <img src={profiles[0][3]} className="h-11 w-11 rounded-full border border-cyan-400/30 object-cover" />
                  <div className="hidden text-left md:block"><p className="text-sm font-bold text-white">Admin</p><p className="text-xs text-slate-400">Administrador</p></div>
                </button>
              </div>
            </div>
          </header>

      {authOpen && <AuthModal mode={authMode} setMode={setAuthMode} onClose={() => setAuthOpen(false)} />}
      {showAI && <AIWidget onClose={() => setShowAI(false)} />}

      <main className="mx-auto max-w-[1700px] px-6 py-8">
        {screen === "inicio" && (
          <section className="grid gap-8 xl:grid-cols-[1fr_1.15fr]">
            <div>
              <Card className="overflow-hidden shadow-[0_0_60px_rgba(37,99,235,.15)]">
                <div className="relative min-h-[460px] p-8">
                  <img src={img.warehouse} className="absolute inset-0 h-full w-full scale-105 object-cover opacity-40 transition duration-[3000ms] hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#050b18] via-[#050b18]/70 to-transparent" />
                  <div className="absolute right-6 top-6 hidden animate-pulse rounded-2xl border border-cyan-300/30 bg-cyan-400/10 px-4 py-3 text-sm font-bold text-cyan-200 shadow-[0_0_30px_rgba(34,211,238,.25)] md:block">Verificación activa 24/7</div>
                  <div className="relative max-w-xl">
                    <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-slate-100"><ShieldCheck size={16} className="text-cyan-300" /> Compra y vende de forma segura</div>
                    <h2 className="text-5xl font-black leading-tight md:text-6xl">Comercio seguro, <span className="text-blue-400">confianza total</span></h2>
                    <p className="mt-5 text-lg leading-8 text-slate-200">Verificamos cada producto en nuestro almacén para que compres y vendas con total tranquilidad.</p>
                    <div className="mt-8 flex flex-wrap gap-3"><Button onClick={() => setScreen("catalogo")}>Explorar catálogo →</Button><Button onClick={() => setScreen("funciona")} variant="outline">Cómo funciona</Button><Button onClick={() => setShowAI(true)} variant="outline">IA Quick Secure</Button></div>
                  </div>
                  <div className="absolute bottom-6 left-8 right-8 grid gap-3 md:grid-cols-4">
                    {[["+5,000", "Productos certificados"], ["+2,500", "Usuarios verificados"], ["+1,800", "Ventas completadas"], ["98%", "Satisfacción"]].map(([n, l]) => <div key={l} className="rounded-2xl border border-white/10 bg-black/30 p-4 backdrop-blur"><p className="text-2xl font-black text-cyan-300">{n}</p><p className="text-xs text-slate-300">{l}</p></div>)}
                  </div>
                </div>
              </Card>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[[ShieldCheck, "Productos certificados", "Revisados por expertos"], [Lock, "Compras protegidas", "Pago seguro y garantía"], [Truck, "Envíos seguros", "Entrega rápida y protegida"], [Bot, "IA antifraude", "Análisis inteligente"]].map(([Icon, t, s]) => <Card key={t} className="group p-5 transition hover:-translate-y-1 hover:bg-white/10"><Icon className="text-cyan-300 transition group-hover:scale-110" /><p className="mt-3 font-black">{t}</p><p className="text-xs text-slate-400">{s}</p></Card>)}
              </div>
              <AboutQuickSecure />
              <TestimonialsBlock />
              <ProfilesBlock compact />
            </div>
            <div className="space-y-6"><CatalogPreview allProducts={allProducts} /><Card className="border-purple-400/30 bg-purple-500/10 p-6"><div className="flex items-center justify-between gap-4"><div><p className="text-sm font-bold text-purple-300">IA Quick Secure</p><h3 className="mt-1 text-2xl font-black">Sofia Secure 🤖</h3><p className="mt-2 text-sm leading-6 text-slate-300">Guía al usuario, explica productos, alerta sobre riesgos y ayuda a comprar seguro.</p></div><Button onClick={() => setShowAI(true)}>Chatear ahora</Button></div></Card></div>
          </section>
        )}

        {screen === "dashboard" && <DashboardModes userMode={userMode} setUserMode={setUserMode} />}
        {screen === "catalogo" && <section><SectionTitle title="Catálogo de productos" subtitle="Cada categoría tiene productos de prueba, fotos, precio y estado certificado." /><div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">{catalog.map((group) => <Card key={group.name} className="p-6"><div className="mb-5 flex items-center justify-between"><div className="flex items-center gap-3"><group.icon className="text-cyan-300" /><h3 className="text-2xl font-black">{group.name}</h3></div><span className="text-xs text-cyan-300">Ver todo →</span></div><div className="grid grid-cols-2 gap-3">{group.items.map((item) => <ProductCard key={item[0]} item={item} />)}</div></Card>)}</div></section>}
        {screen === "seguridad" && <section><SectionTitle title="Seguridad y validación obligatoria" subtitle="La foto de perfil debe coincidir con el documento cargado para activar la cuenta." /><div className="grid gap-6 lg:grid-cols-3"><Card className="p-8"><UserCheck className="text-cyan-300" /><h3 className="mt-4 text-2xl font-black">Perfil verificado</h3><p className="mt-3 text-slate-300">Documento frontal, documento trasero, selfie y foto de perfil obligatoria.</p></Card><Card className="p-8"><ShieldCheck className="text-cyan-300" /><h3 className="mt-4 text-2xl font-black">Control diario</h3><p className="mt-3 text-slate-300">Si el usuario no confirma su identidad, su cuenta queda limitada.</p></Card><Card className="p-8"><Lock className="text-cyan-300" /><h3 className="mt-4 text-2xl font-black">Producto congelado</h3><p className="mt-3 text-slate-300">Productos con duplicidad o reportes quedan en revisión.</p></Card></div></section>}
        {screen === "almacen" && <WarehouseBlock />}
        {screen === "funciona" && <HowBlock />}
        {screen === "perfiles" && <section><SectionTitle title="Perfiles verificados" subtitle="Usuarios de ejemplo con foto, ciudad, rol y estado de verificación." /><ProfilesBlock /></section>}
        {screen === "seguimiento" && <TrackingBlock />}
        {screen === "disputas" && <DisputesBlock />}
        {screen === "producto" && <ProductDetailBlock />}
        {screen === "admin" && <AdminPanel />}
      </main>

      <button onClick={() => setShowAI(true)} className="fixed bottom-6 right-6 z-[70] flex h-20 w-20 animate-bounce items-center justify-center rounded-full border border-cyan-400/30 bg-gradient-to-br from-cyan-500 to-blue-700 shadow-[0_0_40px_rgba(34,211,238,0.35)]">
        <Bot className="h-10 w-10 text-white" />
      </button>

      <FooterBlock />
        </div>
      </div>
    </div>
  );
}
