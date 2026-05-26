import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  Search,
  ShoppingCart,
  UserCheck,
  AlertTriangle,
  Lock,
  Truck,
  BarChart3,
  Store,
  Star,
  Eye,
  CheckCircle2,
  XCircle,
  Smartphone,
  CreditCard,
} from "lucide-react";
function Card({ className = "", children }) {
  return <div className={className}>{children}</div>;
}

function CardContent({ className = "", children }) {
  return <div className={className}>{children}</div>;
}

function Button({ className = "", variant = "default", children, ...props }) {
  const variantClass =
    variant === "outline"
      ? "border border-slate-300 bg-white text-slate-900 hover:bg-slate-100"
      : "bg-slate-900 text-white hover:bg-slate-800";

  return (
    <button
      className={`inline-flex items-center justify-center font-bold transition ${variantClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

const productImages = {
  ps5: "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?q=80&w=1200&auto=format&fit=crop",
  iphone: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=1200&auto=format&fit=crop",
  laptop: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?q=80&w=1200&auto=format&fit=crop",
};

const products = [
  {
    id: 1,
    name: "Laptop Dell Latitude 5420",
    price: "RD$ 28,500",
    seller: "TechRD Verified",
    category: "Tecnología",
    risk: "Bajo",
    score: 96,
    status: "Vendedor verificado",
    description: "Laptop empresarial en buen estado, garantía de 30 días y entrega segura.",
    image: productImages.laptop,
  },
  {
    id: 2,
    name: "iPhone 13 Pro 256GB",
    price: "RD$ 18,000",
    seller: "Usuario Nuevo",
    category: "Celulares",
    risk: "Alto",
    score: 38,
    status: "Publicación en revisión",
    description: "Precio por debajo del mercado. El sistema solicita validación adicional.",
    image: productImages.iphone,
  },
  {
    id: 3,
    name: "PlayStation 5 Standard",
    price: "RD$ 32,000",
    seller: "GameStore RD",
    category: "Gaming",
    risk: "Medio",
    score: 71,
    status: "Validación parcial",
    description: "Producto popular. Se recomienda pago protegido y entrega verificada.",
    image: productImages.ps5,
  },
];

const fraudAlerts = [
  {
    title: "Precio sospechosamente bajo",
    detail: "iPhone 13 Pro publicado 48% por debajo del precio promedio del mercado.",
    level: "Alto",
  },
  {
    title: "Cuenta recién creada",
    detail: "El vendedor no posee historial de ventas ni identidad completamente validada.",
    level: "Medio",
  },
  {
    title: "Imagen posiblemente reutilizada",
    detail: "La imagen del producto coincide con publicaciones externas detectadas.",
    level: "Alto",
  },
];

const stats = [
  { label: "Usuarios verificados", value: "1,240", icon: UserCheck },
  { label: "Alertas antifraude", value: "86", icon: AlertTriangle },
  { label: "Transacciones protegidas", value: "3,480", icon: CreditCard },
  { label: "Entregas monitoreadas", value: "2,960", icon: Truck },
];

function RiskBadge({ risk }) {
  const styles = {
    Bajo: "bg-emerald-100 text-emerald-700 border-emerald-200",
    Medio: "bg-amber-100 text-amber-700 border-amber-200",
    Alto: "bg-red-100 text-red-700 border-red-200",
  };
  return <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${styles[risk]}`}>Riesgo {risk}</span>;
}

function ScoreBar({ score }) {
  return (
    <div className="mt-3">
      <div className="mb-1 flex justify-between text-xs text-slate-500">
        <span>Score de confianza</span>
        <span>{score}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-200">
        <div className="h-2 rounded-full bg-slate-900" style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

export default function QuickSecureMarketPrototype() {
  const [currentScreen, setCurrentScreen] = useState("landing");
  const [query, setQuery] = useState("");
  const [loginMode, setLoginMode] = useState("login");
  const [productCondition, setProductCondition] = useState("Usado en buen estado");
  const [selectedProduct, setSelectedProduct] = useState(products[0]);
  const [assistantStep, setAssistantStep] = useState("registro");
  const [paymentStatus, setPaymentStatus] = useState("retenido");

  const filteredProducts = useMemo(() => {
    return products.filter((p) =>
      `${p.name} ${p.category} ${p.seller}`.toLowerCase().includes(query.toLowerCase())
    );
  }, [query]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="absolute inset-0 opacity-30">
        <div className="absolute left-0 top-0 h-[500px] w-[500px] animate-pulse rounded-full bg-cyan-500 blur-[140px]" />
        <div className="absolute bottom-0 right-0 h-[500px] w-[500px] animate-pulse rounded-full bg-purple-600 blur-[140px]" />
        <div className="absolute left-1/3 top-1/2 h-[300px] w-[300px] animate-bounce rounded-full bg-blue-500 blur-[120px]" />
      </div>

      <div className="relative z-10">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-slate-900 p-2 text-white">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h1 className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-lg font-black leading-tight text-transparent">Quick Secure Market</h1>
              <p className="text-xs text-slate-500">E-commerce seguro para República Dominicana</p>
            </div>
          </div>
          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
            <a href="#marketplace">Marketplace</a>
            <a href="#security">Seguridad</a>
            <a href="#admin">Panel Admin</a>
            <a href="#results">Resultados</a>
          </nav>
          <Button className="rounded-2xl">Demo de Tesis</Button>
        </div>
      </header>

      <main>

        {currentScreen === "landing" && (
          <section className="relative flex min-h-[90vh] items-center overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(15,23,42,0.12),_transparent_35%)]" />

            <div className="relative mx-auto grid max-w-7xl gap-14 px-5 py-20 md:grid-cols-2 md:items-center">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <span className="mb-5 inline-flex items-center gap-2 rounded-full border bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
                  <ShieldCheck size={16} /> Compra y vende de forma segura
                </span>

                <h1 className="text-5xl font-black leading-tight md:text-7xl">
                  Quick Secure Market
                </h1>

                <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
                  Plataforma inteligente de comercio electrónico enfocada en prevenir fraudes digitales en República Dominicana.
                </p>

                <div className="mt-6 rounded-[2rem] border bg-white p-5 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
                      <Smartphone size={24} />
                    </div>
                    <div>
                      <h3 className="font-black">Quick Secure Assistant</h3>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        Hola 👋 Soy tu asistente de seguridad. Te guiaré paso a paso para registrarte, verificar tu identidad, comprar o publicar productos de forma segura.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                  <Button onClick={() => setCurrentScreen("auth")} className="rounded-2xl px-8 py-6 text-base">
                    Comenzar
                  </Button>

                  <Button variant="outline" className="rounded-2xl px-8 py-6 text-base">
                    Cómo funciona
                  </Button>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                <Card className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/10 backdrop-blur-xl shadow-[0_0_60px_rgba(59,130,246,0.25)]">
                  <div className="bg-gradient-to-r from-slate-950 to-blue-950 p-6 text-white">
                    <h2 className="text-3xl font-black">Sistema Antifraude</h2>
                  </div>

                  <CardContent className="space-y-5 p-6">
                    {fraudAlerts.map((alert, index) => (
                      <div key={index} className="rounded-2xl border bg-slate-50 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="font-bold">{alert.title}</h3>
                          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
                            {alert.level}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-slate-600">{alert.detail}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </section>
        )}

        {currentScreen === "auth" && (
          <section className="flex min-h-[90vh] items-center justify-center px-5 py-20">
            <div className="grid w-full max-w-6xl overflow-hidden rounded-[2rem] border bg-white shadow-2xl md:grid-cols-2">
              <div className="flex flex-col justify-center bg-slate-900 p-10 text-white">
                <h2 className="text-5xl font-black leading-tight">
                  Bienvenido a Quick Secure Market
                </h2>

                <p className="mt-6 text-lg leading-8 text-slate-300">
                  Compra y vende productos de manera segura en República Dominicana.
                </p>
              </div>

              <div className="flex items-center justify-center p-10">
                <Card className="w-full max-w-md rounded-[2rem] border-0 shadow-none">
                  <CardContent className="p-0">
                    <div className="mb-8 flex rounded-2xl bg-slate-100 p-1">
                      <button
                        onClick={() => setLoginMode("login")}
                        className={`flex-1 rounded-2xl px-5 py-3 text-sm font-bold transition ${loginMode === "login" ? "bg-slate-900 text-white" : "text-slate-600"}`}
                      >
                        Iniciar sesión
                      </button>

                      <button
                        onClick={() => setLoginMode("register")}
                        className={`flex-1 rounded-2xl px-5 py-3 text-sm font-bold transition ${loginMode === "register" ? "bg-slate-900 text-white" : "text-slate-600"}`}
                      >
                        Registrarse
                      </button>
                    </div>

                    {loginMode === "login" ? (
                      <div>
                        <h2 className="text-3xl font-black">Iniciar sesión</h2>

                        <div className="mt-8 space-y-5">
                          <input className="w-full rounded-2xl border px-5 py-4 outline-none focus:border-slate-900" placeholder="Correo electrónico" />
                          <input type="password" className="w-full rounded-2xl border px-5 py-4 outline-none focus:border-slate-900" placeholder="Contraseña" />

                          <Button onClick={() => setCurrentScreen("dashboard")} className="w-full rounded-2xl py-6 text-base">
                            Entrar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <h2 className="text-3xl font-black">Crear cuenta verificada</h2>
                        <p className="mt-2 text-sm text-slate-500">
                          Para proteger la plataforma, cada usuario debe validar su identidad.
                        </p>

                        <div className="mt-6 rounded-3xl border bg-slate-50 p-5 text-slate-700">
                          <p className="font-bold">Cuenta única para comprar y vender</p>
                          <p className="mt-1 text-sm leading-6">
                            Todos los usuarios tienen el mismo régimen de seguridad. La plataforma valida identidad, comportamiento y actividad antes de permitir comprar, vender o publicar productos.
                          </p>
                        </div>

                        <div className="mt-6 space-y-4">
                          <input className="w-full rounded-2xl border px-5 py-4 outline-none focus:border-slate-900" placeholder="Nombre completo legal" />
                          <input className="w-full rounded-2xl border px-5 py-4 outline-none focus:border-slate-900" placeholder="Número de cédula o ID" />
                          <input className="w-full rounded-2xl border px-5 py-4 outline-none focus:border-slate-900" placeholder="Correo electrónico" />
                          <input className="w-full rounded-2xl border px-5 py-4 outline-none focus:border-slate-900" placeholder="Número telefónico" />
                          <input className="w-full rounded-2xl border px-5 py-4 outline-none focus:border-slate-900" placeholder="Ubicación / provincia" />
                          <select className="w-full rounded-2xl border px-5 py-4 outline-none focus:border-slate-900">
                            <option>Género</option>
                            <option>Masculino</option>
                            <option>Femenino</option>
                            <option>Prefiero no decirlo</option>
                          </select>

                          <Button onClick={() => setCurrentScreen("identityVerification")} className="w-full rounded-2xl py-6 text-base">
                            Continuar con verificación
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>
        )}

        {currentScreen === "identityVerification" && (
          <section className="mx-auto flex min-h-[90vh] max-w-7xl items-center px-5 py-16">
            <div className="grid w-full gap-8 lg:grid-cols-2 lg:items-center">
              <div>
                <span className="mb-5 inline-flex items-center gap-2 rounded-full border bg-white px-4 py-2 text-sm font-semibold text-slate-700">
                  <UserCheck size={16} /> Verificación tipo KYC
                </span>
                <h2 className="text-4xl font-black md:text-6xl">Confirma que eres una persona real</h2>
                <p className="mt-5 text-lg leading-8 text-slate-600">
                  Esta etapa valida la identidad del usuario antes de permitirle vender o comprar dentro de la plataforma. El objetivo es reducir cuentas falsas, suplantación de identidad y vendedores fraudulentos.
                </p>

                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-3xl border bg-white p-5">
                    <h3 className="font-bold">Documento frontal</h3>
                    <p className="mt-2 text-sm text-slate-500">Foto clara de la cédula o ID por delante.</p>
                  </div>
                  <div className="rounded-3xl border bg-white p-5">
                    <h3 className="font-bold">Documento trasero</h3>
                    <p className="mt-2 text-sm text-slate-500">Foto clara de la cédula o ID por detrás.</p>
                  </div>
                  <div className="rounded-3xl border bg-white p-5">
                    <h3 className="font-bold">Selfie de validación</h3>
                    <p className="mt-2 text-sm text-slate-500">Foto del rostro para comparar con el documento.</p>
                  </div>
                  <div className="rounded-3xl border bg-white p-5">
                    <h3 className="font-bold">Verificación diaria</h3>
                    <p className="mt-2 text-sm text-slate-500">El sistema puede solicitar una selfie una vez al día.</p>
                  </div>
                </div>
              </div>

              <Card className="rounded-[2rem] shadow-2xl">
                <CardContent className="p-8">
                  <h3 className="text-3xl font-black">Centro de verificación</h3>
                  <p className="mt-2 text-sm text-slate-500">Simulación del flujo de validación de identidad.</p>

                  <div className="mt-8 space-y-4">
                    <div className="rounded-3xl border border-dashed p-6 text-center">
                      <UserCheck className="mx-auto mb-3 text-slate-500" />
                      <p className="font-bold">Subir foto de cédula frontal</p>
                      <p className="text-sm text-slate-500">JPG, PNG o PDF</p>
                    </div>
                    <div className="rounded-3xl border border-dashed p-6 text-center">
                      <UserCheck className="mx-auto mb-3 text-slate-500" />
                      <p className="font-bold">Subir foto de cédula trasera</p>
                      <p className="text-sm text-slate-500">JPG, PNG o PDF</p>
                    </div>
                    <div className="rounded-3xl border border-dashed p-6 text-center">
                      <Smartphone className="mx-auto mb-3 text-slate-500" />
                      <p className="font-bold">Tomar selfie de seguridad</p>
                      <p className="text-sm text-slate-500">Comparación facial simulada</p>
                    </div>

                    <div className="rounded-3xl bg-emerald-50 p-5 text-emerald-800">
                      <p className="font-bold">Resultado simulado: Identidad pendiente de aprobación</p>
                      <p className="mt-1 text-sm">El administrador revisará los documentos antes de activar tu cuenta. Luego podrás comprar y vender dentro de la plataforma.</p>
                    </div>

                    <div className="rounded-3xl bg-slate-50 p-5 text-slate-700">
                      <p className="font-bold">Validación continua</p>
                      <p className="mt-1 text-sm">Si el usuario no confirma su identidad diariamente, su cuenta queda limitada y sus productos pasan a revisión automática.</p>
                    </div>

                    <Button onClick={() => setCurrentScreen("securityControl")} className="w-full rounded-2xl py-6 text-base">
                      Finalizar verificación demo
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        )}

        {currentScreen === "securityControl" && (
          <section className="mx-auto max-w-7xl px-5 py-16">
            <div className="mb-8 max-w-3xl">
              <p className="font-semibold text-slate-500">Control continuo de identidad</p>
              <h2 className="text-4xl font-black md:text-5xl">Protección activa contra perfiles falsos</h2>
              <p className="mt-4 text-slate-600">
                La plataforma no solo valida al usuario al registrarse. También puede solicitar una selfie diaria para confirmar que la cuenta sigue siendo usada por la persona real registrada.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <Card className="rounded-[2rem]">
                <CardContent className="p-6">
                  <UserCheck className="mb-4 text-slate-700" />
                  <h3 className="text-xl font-black">Selfie diaria</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">El usuario confirma su identidad con una foto antes de operar en la plataforma.</p>
                </CardContent>
              </Card>

              <Card className="rounded-[2rem]">
                <CardContent className="p-6">
                  <Lock className="mb-4 text-slate-700" />
                  <h3 className="text-xl font-black">Cuenta limitada</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">Si no se valida la identidad, no puede publicar, vender, cobrar ni modificar productos.</p>
                </CardContent>
              </Card>

              <Card className="rounded-[2rem]">
                <CardContent className="p-6">
                  <AlertTriangle className="mb-4 text-slate-700" />
                  <h3 className="text-xl font-black">Producto congelado</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">Si pasan 4 o 5 días sin validación, los productos se congelan y pasan a revisión administrativa.</p>
                </CardContent>
              </Card>
            </div>

            <Card className="mt-8 rounded-[2rem] shadow-xl">
              <CardContent className="p-8">
                <h3 className="text-2xl font-black">Notificación inteligente</h3>
                <p className="mt-3 text-slate-600">
                  En caso de actividad sospechosa, el sistema genera una alerta interna para el equipo de seguridad. Como proyección futura, la plataforma podría generar reportes formales para organismos especializados en delitos tecnológicos.
                </p>
                <Button onClick={() => setCurrentScreen("marketplace")} className="mt-6 rounded-2xl px-6 py-5">
                  Ir al marketplace
                </Button>
              </CardContent>
            </Card>
          </section>
        )}

        {currentScreen === "protectedPayment" && (
          <section className="mx-auto max-w-7xl px-5 py-16">
            <div className="mb-8 max-w-3xl">
              <p className="font-semibold text-slate-500">Sistema de pago protegido</p>
              <h2 className="text-4xl font-black md:text-5xl">El dinero se libera solo cuando el comprador confirma la entrega</h2>
              <p className="mt-4 text-slate-600">
                Quick Secure Market retiene temporalmente el pago para proteger al comprador y al vendedor. El vendedor no recibe el dinero hasta que el comprador confirme que recibió el producto correcto y en la condición acordada.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-4">
              <Card className="rounded-[2rem]">
                <CardContent className="p-6">
                  <CreditCard className="mb-4 text-slate-700" />
                  <h3 className="text-xl font-black">1. Comprador paga</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">El comprador realiza el pago dentro de la plataforma.</p>
                </CardContent>
              </Card>

              <Card className="rounded-[2rem]">
                <CardContent className="p-6">
                  <Lock className="mb-4 text-slate-700" />
                  <h3 className="text-xl font-black">2. Pago retenido</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">La plataforma mantiene el dinero protegido mientras se realiza la entrega.</p>
                </CardContent>
              </Card>

              <Card className="rounded-[2rem]">
                <CardContent className="p-6">
                  <Truck className="mb-4 text-slate-700" />
                  <h3 className="text-xl font-black">3. Entrega validada</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">El comprador confirma que recibió el producto correcto y sin daños no declarados.</p>
                </CardContent>
              </Card>

              <Card className="rounded-[2rem]">
                <CardContent className="p-6">
                  <CheckCircle2 className="mb-4 text-slate-700" />
                  <h3 className="text-xl font-black">4. Dinero liberado</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">Cuando ambas partes están de acuerdo, el dinero se entrega al vendedor.</p>
                </CardContent>
              </Card>
            </div>

            <div className="mt-8 grid gap-8 lg:grid-cols-2">
              <Card className="rounded-[2rem] border border-white/10 bg-white/10 backdrop-blur-xl shadow-[0_0_40px_rgba(59,130,246,0.2)]">
                <CardContent className="p-8">
                  <h3 className="text-2xl font-black">Estado de la transacción</h3>
                  <div className="mt-6 rounded-3xl bg-slate-50 p-6">
                    <p className="text-sm font-semibold text-slate-500">Producto</p>
                    <p className="mt-1 text-xl font-black">iPhone 13 Pro 256GB</p>
                    <p className="mt-4 text-sm font-semibold text-slate-500">Monto retenido</p>
                    <p className="mt-1 text-3xl font-black">RD$ 18,000</p>
                    <p className="mt-4 text-sm font-semibold text-slate-500">Estado actual</p>
                    <span className="mt-2 inline-flex rounded-full border border-amber-200 bg-amber-100 px-4 py-2 text-sm font-bold text-amber-800">
                      Pago retenido por la plataforma
                    </span>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <Button onClick={() => setPaymentStatus("confirmado")} className="rounded-2xl py-6">
                      Confirmar recepción
                    </Button>
                    <Button onClick={() => setPaymentStatus("disputa")} variant="outline" className="rounded-2xl py-6">
                      Reportar problema
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-[2rem] border border-white/10 bg-white/10 backdrop-blur-xl shadow-[0_0_40px_rgba(59,130,246,0.2)]">
                <CardContent className="p-8">
                  <h3 className="text-2xl font-black">Resultado</h3>
                  {paymentStatus === "retenido" && (
                    <div className="mt-6 rounded-3xl bg-amber-50 p-6 text-amber-800">
                      <p className="font-bold">Pago protegido activo</p>
                      <p className="mt-2 text-sm leading-6">El dinero todavía no se entrega al vendedor. La plataforma espera confirmación del comprador.</p>
                    </div>
                  )}
                  {paymentStatus === "confirmado" && (
                    <div className="mt-6 rounded-3xl bg-emerald-50 p-6 text-emerald-800">
                      <p className="font-bold">Entrega confirmada</p>
                      <p className="mt-2 text-sm leading-6">El comprador confirmó que recibió el producto correcto. El pago queda autorizado para el vendedor.</p>
                    </div>
                  )}
                  {paymentStatus === "disputa" && (
                    <div className="mt-6 rounded-3xl bg-red-50 p-6 text-red-800">
                      <p className="font-bold">Transacción en disputa</p>
                      <p className="mt-2 text-sm leading-6">El pago continúa retenido y el caso pasa a revisión administrativa hasta resolver el reclamo.</p>
                    </div>
                  )}

                  <div className="mt-6 rounded-3xl bg-slate-50 p-5 text-slate-700">
                    <p className="font-bold">Valor para la tesis</p>
                    <p className="mt-1 text-sm leading-6">Este módulo reduce fraudes por pagos adelantados, productos falsos, entregas incompletas y vendedores que desaparecen después de recibir el dinero.</p>
                  </div>

                  <Button onClick={() => setCurrentScreen("marketplace")} className="mt-6 w-full rounded-2xl py-6">
                    Volver al marketplace
                  </Button>
                </CardContent>
              </Card>
            </div>
          </section>
        )}

        {currentScreen === "publishProduct" && (
          <section className="mx-auto max-w-7xl px-5 py-16">
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="max-w-3xl">
                <p className="font-semibold text-slate-500">Publicación segura</p>
                <h2 className="text-4xl font-black md:text-5xl">Certifica tu producto antes de venderlo</h2>
                <p className="mt-4 text-slate-600">
                  Quick Secure Market valida la autenticidad y procedencia de cada producto para reducir publicaciones falsas, productos robados y duplicados dentro de la plataforma.
                </p>
              </div>

              <Button onClick={() => setCurrentScreen("marketplace")} className="rounded-2xl px-6 py-5">
                Volver al marketplace
              </Button>
            </div>

            <div className="grid gap-8 lg:grid-cols-2">
              <Card className="rounded-[2rem] border border-white/10 bg-white/10 backdrop-blur-xl shadow-[0_0_40px_rgba(59,130,246,0.2)]">
                <CardContent className="p-8">
                  <h3 className="text-2xl font-black">Información del producto</h3>
                  <p className="mt-2 text-sm text-slate-500">
                    Introduce los datos necesarios para validar el producto.
                  </p>

                  <div className="mt-6 space-y-4">
                    <input className="w-full rounded-2xl border px-5 py-4 outline-none focus:border-slate-900" placeholder="Nombre del producto" />

                    <input className="w-full rounded-2xl border px-5 py-4 outline-none focus:border-slate-900" placeholder="IMEI, serial o identificador único" />

                    <select className="w-full rounded-2xl border px-5 py-4 outline-none focus:border-slate-900">
                      <option>Categoría</option>
                      <option>Celulares</option>
                      <option>Computadoras</option>
                      <option>Gaming</option>
                      <option>Electrónica</option>
                      <option>Hogar</option>
                    </select>

                    <select
                      value={productCondition}
                      onChange={(e) => setProductCondition(e.target.value)}
                      className="w-full rounded-2xl border px-5 py-4 outline-none focus:border-slate-900"
                    >
                      <option>Nuevo</option>
                      <option>Usado en buen estado</option>
                      <option>Usado con rayones</option>
                      <option>Dañado / para piezas</option>
                    </select>

                    <input className="w-full rounded-2xl border px-5 py-4 outline-none focus:border-slate-900" placeholder="Precio de venta RD$" />

                    <textarea
                      className="min-h-32 w-full rounded-2xl border px-5 py-4 outline-none focus:border-slate-900"
                      placeholder="Explica la condición del producto y la razón del precio"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-[2rem] border border-white/10 bg-white/10 backdrop-blur-xl shadow-[0_0_40px_rgba(59,130,246,0.2)]">
                <CardContent className="p-8">
                  <h3 className="text-2xl font-black">Validación de autenticidad</h3>
                  <p className="mt-2 text-sm text-slate-500">
                    La plataforma revisará que el producto sea real y no haya sido reportado previamente.
                  </p>

                  <div className="mt-6 space-y-4">
                    <div className="rounded-3xl border border-dashed p-6 text-center">
                      <CreditCard className="mx-auto mb-3 text-slate-500" />
                      <p className="font-bold">Subir factura digital</p>
                      <p className="text-sm text-slate-500">Factura, recibo o comprobante de compra</p>
                    </div>

                    <div className="rounded-3xl border border-dashed p-6 text-center">
                      <ShoppingCart className="mx-auto mb-3 text-slate-500" />
                      <p className="font-bold">Fotos reales del producto</p>
                      <p className="text-sm text-slate-500">Incluye serial, estado físico y accesorios</p>
                    </div>

                    <div className="rounded-3xl bg-amber-50 p-5 text-amber-800">
                      <p className="font-bold">Detección automática de duplicados</p>
                      <p className="mt-1 text-sm">
                        Si el IMEI o serial ya existe en la plataforma, se solicitará evidencia de transferencia o historial de propiedad.
                      </p>
                    </div>

                    <div className="rounded-3xl bg-slate-50 p-5 text-slate-700">
                      <p className="font-bold">Mensaje visible para compradores</p>
                      <p className="mt-1 text-sm">
                        Este producto fue validado y su condición declarada es: {productCondition}.
                      </p>
                    </div>

                    <Button onClick={() => setCurrentScreen("marketplace")} className="w-full rounded-2xl py-6 text-base">
                      Publicar producto para revisión
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        )}

        {currentScreen === "dashboard" && (
          <section className="mx-auto max-w-7xl px-5 py-16">
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-semibold text-slate-400">Panel personal</p>
                <h2 className="text-4xl font-black">Mi Dashboard</h2>
              </div>

              <Button onClick={() => setCurrentScreen("marketplace")} className="rounded-2xl px-6 py-5">
                Ir al marketplace
              </Button>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="rounded-[2rem] border border-white/10 bg-white/10 backdrop-blur-xl shadow-[0_0_40px_rgba(59,130,246,0.2)]">
                <CardContent className="p-8">
                  <div className="flex items-center gap-4">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-3xl font-black text-white">
                      JD
                    </div>
                    <div>
                      <h3 className="text-2xl font-black">Juan Delgado</h3>
                      <p className="text-slate-400">Cuenta verificada</p>
                    </div>
                  </div>

                  <div className="mt-6 rounded-3xl bg-emerald-500/10 p-5 text-emerald-300">
                    <p className="font-black">Quick Secure Verified</p>
                    <p className="mt-1 text-sm">Identidad validada, actividad estable y productos certificados.</p>
                  </div>

                  <div className="mt-6 space-y-3 text-sm text-slate-300">
                    <div className="flex justify-between">
                      <span>Última verificación facial</span>
                      <span>Hace 2 horas</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Productos activos</span>
                      <span>12</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Ventas completadas</span>
                      <span>48</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-[2rem] border border-white/10 bg-white/10 backdrop-blur-xl shadow-[0_0_40px_rgba(59,130,246,0.2)] lg:col-span-2">
                <CardContent className="p-8">
                  <h3 className="text-3xl font-black">Historial de propiedad</h3>
                  <p className="mt-2 text-slate-400">Seguimiento de autenticidad y transferencia de productos.</p>

                  <div className="mt-8 space-y-5">
                    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <h4 className="text-xl font-black">PlayStation 5 Standard</h4>
                          <p className="text-sm text-slate-400">IMEI/Serial: PS5-DR-2026-004</p>
                        </div>
                        <span className="rounded-full bg-emerald-500/20 px-4 py-2 text-sm font-bold text-emerald-300">
                          Certificado
                        </span>
                      </div>

                      <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
                        <span className="rounded-full bg-white/10 px-4 py-2">Usuario A</span>
                        <span>→</span>
                        <span className="rounded-full bg-white/10 px-4 py-2">Usuario B</span>
                        <span>→</span>
                        <span className="rounded-full bg-cyan-500/20 px-4 py-2 text-cyan-300">Usuario actual</span>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <h4 className="text-xl font-black">Factura Digital Certificada</h4>
                          <p className="text-sm text-slate-400">Quick Secure Certificate #QSM-2026-8842</p>
                        </div>
                        <span className="rounded-full bg-blue-500/20 px-4 py-2 text-sm font-bold text-blue-300">
                          Validada
                        </span>
                      </div>

                      <div className="mt-5 rounded-3xl bg-slate-950/60 p-5">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-slate-400">Propietario actual</p>
                            <p className="font-black">Juan Delgado</p>
                          </div>
                          <div>
                            <p className="text-sm text-slate-400">Estado</p>
                            <p className="font-black text-emerald-300">Autenticado</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        )}

        {currentScreen === "marketplace" && (
          <section className="mx-auto max-w-7xl px-5 py-16">
            <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <p className="font-semibold text-slate-500">Marketplace seguro</p>
                <h2 className="text-3xl font-black md:text-4xl">Productos certificados por la plataforma</h2>
              </div>

              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <Button onClick={() => setCurrentScreen("securityControl")} variant="outline" className="rounded-2xl px-5 py-5">
                  Control de seguridad
                </Button>
                <div className="flex items-center gap-2 rounded-2xl border bg-white px-4 py-3 md:w-96">
                <Search size={18} className="text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar producto"
                  className="w-full bg-transparent text-sm outline-none"
                />
              </div>
              </div>
            </div>

            <div className="mb-6 grid gap-4 rounded-[2rem] border bg-white p-5 shadow-sm md:grid-cols-[auto_1fr_auto] md:items-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white">
                <Smartphone size={26} />
              </div>
              <div>
                <h3 className="font-black">Quick Secure Assistant</h3>
                <p className="text-sm text-slate-600">Puedo explicarte por qué un producto tiene un precio más bajo, ayudarte a publicar o guiarte durante una compra segura.</p>
              </div>
              <Button variant="outline" className="rounded-2xl">Hablar con asistente</Button>
            </div>

            <div className="mb-6 flex justify-end">
              <Button onClick={() => setCurrentScreen("publishProduct")} className="rounded-2xl px-6 py-5">
                Publicar producto
              </Button>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {filteredProducts.map((product) => (
                <Card key={product.id} className="rounded-3xl border border-white/10 bg-white/10 backdrop-blur-xl transition hover:-translate-y-2 hover:shadow-[0_0_40px_rgba(59,130,246,0.35)]">
                  <CardContent className="p-5">
                    <div className="mb-4 overflow-hidden rounded-3xl">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="h-56 w-full object-cover transition duration-500 hover:scale-110"
                      />
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-bold">{product.name}</h3>
                        <p className="mt-1 text-sm text-slate-500">{product.seller}</p>
                      </div>
                      <span className="rounded-full border border-emerald-200 bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Producto verificado</span>
                    </div>
                    <p className="mt-3 text-2xl font-black">{product.price}</p>
                    <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">
                      Producto validado mediante serial, factura digital y revisión de autenticidad.
                    </div>
                    <Button onClick={() => setCurrentScreen("protectedPayment")} className="mt-5 w-full rounded-2xl">
                      Comprar con pago protegido
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}
      </main>
      </div>
    </div>
  );
}
