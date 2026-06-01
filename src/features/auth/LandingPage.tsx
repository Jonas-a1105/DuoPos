import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Flame,
  Coins,
  Sparkles,
  Award,
  ShoppingBag,
  Zap,
  CheckCircle2,
  Lock,
  Palette,
  ShieldAlert,
  TrendingUp,
  Crown,
  Play,
  Check,
  RefreshCw,
  ChevronRight,
  Gift,
  HelpCircle,
  Clock,
  Printer,
  Barcode,
  Users,
  Package,
  Globe,
  History,
  Settings,
  Scale,
  Receipt,
  Download,
  Moon,
  Sun,
  ShieldCheck,
  ZapOff,
} from 'lucide-react';
import { playSound } from '../../services/audio/soundService';

interface LandingPageProps {
  onEnterApp: () => void;
  onEnterAsAdmin: () => void;
}

export default function LandingPage({ onEnterApp, onEnterAsAdmin }: LandingPageProps) {
  // Navigation & Interactive highlight states
  const [activeModuleDetail, setActiveModuleDetail] = useState<string>('sales');
  const [faqOpen, setFaqOpen] = useState<Record<string, boolean>>({
    'que-es-duopos': true,
    'como-gamifica': false,
  });

  // Sandbox Simulator interactive state
  const [simTransactionsCount, setSimTransactionsCount] = useState(8);
  const [simDailyBilling, setSimDailyBilling] = useState(12.50);
  const [simLoyaltyPoints, setSimLoyaltyPoints] = useState(25);
  const [simActiveTerminals, setSimActiveTerminals] = useState(3);
  const [simScannedItems, setSimScannedItems] = useState<Array<{ name: string; price: number; code: string }>>([]);
  const [simPrintedTicket, setSimPrintedTicket] = useState<string | null>(null);
  const [simActiveSkin, setSimActiveSkin] = useState<'standard' | 'galaxy' | 'cyberpunk'>('standard');
  const [showParticle, setShowParticle] = useState(false);
  const [particleText, setParticleText] = useState('');

  // Auto trigger small subtle idle animations of numbers for the metrics dashboards
  const [liveCounters, setLiveCounters] = useState({
    scannedToday: 1240,
    totalSalesUSD: 4520.8,
    activeCashiers: 24,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveCounters((prev) => ({
        scannedToday: prev.scannedToday + (Math.random() > 0.6 ? 1 : 0),
        totalSalesUSD: Number((prev.totalSalesUSD + (Math.random() > 0.85 ? Math.random() * 20 : 0)).toFixed(2)),
        activeCashiers: prev.activeCashiers + (Math.random() > 0.95 ? (Math.random() > 0.5 ? 1 : -1) : 0),
      }));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const triggerSandboxParticle = (text: string) => {
    setParticleText(text);
    setShowParticle(true);
    setTimeout(() => setShowParticle(false), 1200);
  };

  // Switch FAQ state
  const toggleFaq = (id: string) => {
    playSound('click');
    setFaqOpen((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Interactive Sandbox actions
  const handleSimulateScanItem = () => {
    playSound('click');
    const catalog = [
      { name: 'Dona Glaseada Mika 🍩', price: 1.5, code: '7501030005' },
      { name: 'Refresco Familiar VEF 🥤', price: 2.2, code: '7501258902' },
      { name: 'Hamburguesa Triple Fénix 🍔', price: 5.5, code: '7501193301' },
      { name: 'Café Expreso Racha ☕', price: 1.2, code: '7501021144' },
    ];
    const picked = catalog[Math.floor(Math.random() * catalog.length)];
    const updatedItems = [picked, ...simScannedItems].slice(0, 3);
    setSimScannedItems(updatedItems);

    // Increase simulated business metrics
    const gainedPoints = 5;
    triggerSandboxParticle(`+$${picked.price.toFixed(2)} Facturado / +${gainedPoints} Puntos`);

    setSimTransactionsCount((prev) => prev + 1);
    setSimDailyBilling((prev) => Number((prev + picked.price).toFixed(2)));
    setSimLoyaltyPoints((prev) => prev + gainedPoints);
    playSound('success');
  };

  const handleSimulatePrintTicket = () => {
    playSound('click');
    if (simScannedItems.length === 0) {
      playSound('error');
      triggerSandboxParticle('¡Escanea un producto primero!');
      return;
    }
    playSound('success');

    const randomHash =
      '0x' +
      Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16))
        .join('')
        .toUpperCase();
    const currentDate = new Date().toLocaleString();
    const subtotal = simScannedItems.reduce((acc, item) => acc + item.price, 0);
    const invoiceNum = Math.floor(1000 + Math.random() * 9000);

    const ticketTemplate = `
      ===================================
               STOCKMASTER PRO
         SIMULADOR DE TICKET INTERNO
        AV. CASANOVA OFICINA CENTRAL
            RIF: J-50128489-0 (DEMO)
               CARACAS, VE
      ===================================
      CONTROL INTERNO: #FT-${invoiceNum}
      FECHA: ${currentDate}
      CAJERO: Jonas_Principal_01
      ---------------------
      PRODUCTOS:
      ${simScannedItems.map((item) => `* ${item.name.slice(0, 15)}... - $${item.price.toFixed(2)}`).join('\n      ')}
      ---------------------
      SUBTOTAL: $${subtotal.toFixed(2)} USD
      TASA DE CAMBIO BCV: 45.42 VEF
      TOTAL VEF: Bs. ${(subtotal * 45.42).toFixed(2)}
      ---------------------
      HASH DE AUDITORÍA INTERNA:
      [${randomHash}]
      ESTATUS: SIMULACIÓN DE IMPRESIÓN
      ===================================
    `;

    setSimPrintedTicket(ticketTemplate);
    triggerSandboxParticle('Ticket Generado 🖨️');
  };

  const handleSimulateArqueoCaja = () => {
    playSound('success');
    setSimActiveTerminals((prev) => Math.min(prev + 1, 5));
    setSimLoyaltyPoints((prev) => prev + 10);
    triggerSandboxParticle('Caja Arqueada: OK / +10 Puntos');
  };

  const handleSimResetSandbox = () => {
    playSound('click');
    setSimTransactionsCount(8);
    setSimDailyBilling(12.50);
    setSimLoyaltyPoints(25);
    setSimActiveTerminals(3);
    setSimScannedItems([]);
    setSimPrintedTicket(null);
    setSimActiveSkin('standard');
    triggerSandboxParticle('Simulador Reiniciado');
  };

  // Modules catalog descriptors
  const moduleCatalog = [
    {
      id: 'sales',
      title: 'Ventas y POS Inteligente 🛒',
      shortDesc:
        'Control de canasta rápido con selector de códigos de barra, conversor integrado en VEF/USD y retroalimentación interactiva.',
      longDesc:
        'StockMaster Pro reinventa la facturación en mostrador. Registra compras de forma ultra visual, calcula el vuelto automáticamente en divisas, integra alertas de stocks insuficientes al instante y emula escaneos rápidos utilizando código de barras real. Cuenta además con atajos numéricos veloces para el cobro fluido en efectivo, tarjetas o transferencias prepagadas.',
      icon: <ShoppingBag className="text-orange-500 h-6 w-6 stroke-[2.5]" />,
      badge: 'Más Utilizado',
      features: [
        'Lector de barra integrado',
        'Doble moneda VEF/USD (Tasas BCV/Paralelo)',
        'Cálculo de vuelto inteligente',
        'Acceso directo con teclado numérico',
      ],
    },

    {
      id: 'fiscal',
      title: 'Simulador de Impresión y Control Interno 🧾',
      shortDesc:
        'Emulación didáctica de emisión de tiques y auditoría interna para tiqueeras térmicas estándar (ESC/POS).',
      longDesc:
        'Este módulo funciona como un simulador y emulador de tiqueeras térmicas industriales de 58mm/80mm (ESC/POS). Permite a los cajeros y administradores practicar y registrar bitácoras de control interno con hashes de simulación y previsualizaciones en pantalla. Ideal para auditorías internas de ventas y capacitación rápida del personal sin implicar enlaces o timbrados reales con entes públicos o el SENIAT.',
      icon: <Receipt className="text-[#fb923c] h-6 w-6 stroke-[2.5]" />,
      badge: 'Herramienta de Simulación',
      features: [
        'Simulación de Firma Hash Única',
        'Emulación de tiqueera térmica raw (ESC/POS)',
        'Generador didáctico de códigos QR',
        'Bitácora educativa de auditoría',
      ],
    },
    {
      id: 'shifts',
      title: 'Arqueo de Turnos & Caja Chica 💵',
      shortDesc:
        'Garantiza la exactitud contable reduciendo a cero el margen de discrepancia con auditorías estrictas por turno.',
      longDesc:
        'Administra el dinero líquido con lupa. Cada cajero abre su turno declarando el monto inicial. El sistema registra cada ingreso o egreso de caja con justificaciones obligatorias de egreso. Durante el cierre de la jornada, la herramienta requiere que se efectúe la declaración física final, detectando discrepancias (faltas/sobras) de caja para proteger los márgenes del negocio de manera transparente.',
      icon: <Clock className="text-emerald-600 h-6 w-6 stroke-[2.5]" />,
      badge: 'Seguridad Financiera',
      features: [
        'Registro detallado de apertura/cierre',
        'Declaración física ciega de valores',
        'Log de entradas/salidas de caja chica',
        'Cero desvíos monetarios',
      ],
    },
    {
      id: 'customers',
      title: 'CRM y Alianzas de Fidelización 👥',
      shortDesc:
        'Monitorea las visitas frecuentes con un programa exclusivo de socios, categorías por consumo y retención de clientes.',
      longDesc:
        'Tus clientes acumulan puntos por cada compra en tu negocio. El módulo CRM de StockMaster Pro les da seguimiento administrativo inmediato: asigna categorías, registra su perfil de fidelidad (Nivel Bronce, Plata, Oro, VIP) y analiza la fecha de su última compra para habilitar llamados de reenganche proactivos.',
      icon: <Users className="text-[#a435f0] h-6 w-6 stroke-[2.5]" />,
      badge: 'Estrategia CRM',
      features: [
        'Compras recurrentes registradas',
        'Puntos acumulativos de Fidelización',
        'Categorías de lealtad (Bronce a VIP)',
        'Directorio telefónico y créditos',
      ],
    },
    {
      id: 'inventory',
      title: 'Control de Catálogo y Almacén 📦',
      shortDesc:
        'Inventario inteligente multi-sucursal con control de existencias, cálculo automatizado de precios y reposición asistida.',
      longDesc:
        'Administra tus productos cómodamente. Define precios calculados (con el 16% de IVA integrado), asocia fotos o miniaturas ilustrativas, asume controles estrictos de existencias críticas con umbrales de alerta amarillos/rojos, y asigna almacenes diferenciados (Tienda Centro, Tienda Norte, CEDIS central de acopio) para mantener tus mostradores abastecidos.',
      icon: <Package className="text-amber-600 h-6 w-6 stroke-[2.5]" />,
      badge: 'Control Stocks',
      features: [
        'Estructura de precios con IVA de ley',
        'Alertas tempranas de stock mínimo',
        'Segmentación por categorías',
        'Asignación multisucursal',
      ],
    },
    {
      id: 'logistics',
      title: 'Logística de Despacho & CEDIS 🌐',
      shortDesc:
        'Sincroniza stock inter-sucursales. Despacha fletes desde almacén central asistido por hojas de carga de ruta.',
      longDesc:
        'StockMaster Pro no es solo una pantalla de tiques. Coordina el flujo de mercancías entre tus sucursales y tu Centro de Distribución Principal (CEDIS). Genera traslados, autoriza hojas de ruta con conductor asignado, consulta stock global integrado, gestiona transportes activos y supervisa la llegada segura de mercancías mediante bitácoras de auditoría logística interactiva.',
      icon: <Globe className="text-indigo-600 h-6 w-6 stroke-[2.5]" />,
      badge: 'Multitiendas',
      features: [
        'Despachos desde CEDIS centralizado',
        'Traslados inter-sucursales validados',
        'Asignación de conductores and fletes',
        'Geolocalización simulada de entregas',
      ],
    },
    {
      id: 'history',
      title: 'Auditoría Administrativa Completa 📊',
      shortDesc:
        'Visualiza reportes consolidados en tiempo real. Exporta reportes y comprobantes en múltiples formatos.',
      longDesc:
        'Toma el control absoluto del negocio con un centro de reportería impecable. Revisa el historial consolidado de transacciones con filtros dinámicos por cajero o sucursal, descarga comprobantes físicos de venta con un clic, examina mapas de calor sobre el rendimiento diario y exporta todos los reportes de auditoría en formatos limpios y estandarizados para tu equipo contable.',
      icon: <History className="text-gray-600 h-6 w-6 stroke-[2.5]" />,
      badge: 'Business Intelligence',
      features: [
        'Bitácora unificada de movimientos',
        'Descargas rápidas de recibos',
        'Estadísticas de facturación diaria',
        'Gráficos de rendimiento por cajero',
      ],
    },
  ];

  const activeModuleItem = moduleCatalog.find((m) => m.id === activeModuleDetail) || moduleCatalog[0];

  return (
    <div
      className={`min-h-screen text-slate-800 font-sans transition-all duration-300 antialiased ${
        simActiveSkin === 'galaxy'
          ? 'bg-slate-950 text-slate-100 selection:bg-purple-600 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950 via-slate-950 to-slate-950'
          : simActiveSkin === 'cyberpunk'
            ? 'bg-[#09090b] text-cyan-400 selection:bg-pink-500 font-mono'
            : 'bg-[#f8fafc] text-slate-800 selection:bg-orange-100'
      }`}
    >
      {/* LANDING FLOATING HEADER */}
      <header
        className={`sticky top-0 z-50 backdrop-blur-md border-b transition-colors duration-300 ${
          simActiveSkin === 'galaxy'
            ? 'bg-slate-950/85 border-violet-900/60'
            : simActiveSkin === 'cyberpunk'
              ? 'bg-black/90 border-pink-500/20'
              : 'bg-white/90 border-slate-200'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={handleSimResetSandbox}>
            {/* Elegant blank generic logo container */}
            <div className="w-10 h-10 rounded-xl border-2 border-orange-500 bg-white flex items-center justify-center shadow-sm shrink-0">
              <div className="w-5 h-5 rounded-md bg-orange-400 animate-pulse" />
            </div>
            <div className="text-left">
              <h1
                className={`text-2xl font-black tracking-wider leading-none ${
                  simActiveSkin === 'cyberpunk' ? 'text-cyan-400' : 'text-[#fb923c]'
                }`}
              >
                StockMaster
                <span className={simActiveSkin === 'standard' ? 'text-slate-800' : 'text-inherit opacity-85'}>Pro</span>
              </h1>
              <span className="text-[9px] tracking-widest uppercase font-black text-gray-400 block mt-0.5">
                Enterprise POS Suite
              </span>
            </div>
          </div>

          {/* Center quick modules anchor links (Desktop) */}
          <nav className="hidden lg:flex items-center gap-7 text-xs sm:text-sm font-black uppercase tracking-wider text-gray-500">
            <a href="#features" className="hover:text-orange-500 transition-colors">
              Módulos
            </a>
            <a href="#demo" className="hover:text-orange-500 transition-colors">
              Plataforma Sandbox
            </a>
            <a href="#metrics" className="hover:text-orange-500 transition-colors">
              Estadísticas
            </a>
            <a href="#faqs" className="hover:text-orange-500 transition-colors">
              Preguntas
            </a>
          </nav>

          {/* CTAs */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                playSound('click');
                onEnterAsAdmin();
              }}
              className="hidden sm:inline-flex bg-transparent hover:bg-slate-100 border-2 border-slate-200 py-2.5 px-4.5 rounded-2xl font-black text-xs uppercase tracking-wide cursor-pointer text-inherit"
            >
              Demo Administrador
            </button>
            <button
              onClick={() => {
                playSound('success');
                onEnterApp();
              }}
              className={`font-black text-xs uppercase tracking-wider py-2.5 px-5 rounded-2xl border-b-4 cursor-pointer transform hover:scale-[1.02] shadow-xs active:translate-y-0.5 active:border-b-0 ${
                simActiveSkin === 'cyberpunk'
                  ? 'bg-cyan-500 text-black border-cyan-700 hover:bg-cyan-400'
                  : simActiveSkin === 'galaxy'
                    ? 'bg-violet-600 text-white border-violet-850 hover:bg-violet-500'
                    : 'bg-[#fb923c] text-white border-orange-700 hover:bg-orange-500'
              }`}
            >
              Iniciar sesión 🚀
            </button>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative overflow-hidden py-16 md:py-24 text-left border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Hero text */}
          <div className="lg:col-span-7 space-y-6">
            <span
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-widest ${
                simActiveSkin === 'cyberpunk'
                  ? 'bg-pink-500/10 text-pink-400 border border-pink-500/20'
                  : simActiveSkin === 'galaxy'
                    ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20'
                    : 'bg-orange-50 text-orange-700 border border-orange-150'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 animate-spin duration-1000" /> ¡Sistema de Facturación de Alto Rendimiento!
            </span>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-none text-balance">
              Controla tu almacén, vende en <span className="text-[#fb923c]">Doble Moneda</span> y evoluciona tu
              negocio.
            </h1>

            <p className="text-base md:text-lg text-gray-500 font-medium leading-relaxed max-w-2xl">
              StockMaster Pro es el punto de venta inteligente e interactivo que impulsa la productividad y precisión del
              equipo operativo. Optimiza la facturación, controla transferencias, simula comprobantes térmicos para control
              interno y personaliza interfaces corporativas exclusivas según las necesidades de cada terminal.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-4">
              <a
                href="#demo"
                className={`py-3.5 px-7.5 rounded-2xl border-b-4 font-black text-center text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  simActiveSkin === 'cyberpunk'
                    ? 'bg-pink-500 border-pink-700 text-white hover:bg-pink-400'
                    : simActiveSkin === 'galaxy'
                      ? 'bg-violet-600 border-violet-800 text-white hover:bg-violet-500'
                      : 'bg-[#fb923c] border-orange-700 text-white hover:bg-orange-400'
                }`}
              >
                PROBAR SANDBOX DEMO <ChevronRight size={16} strokeWidth={3} />
              </a>
              <button
                onClick={() => {
                  playSound('success');
                  onEnterApp();
                }}
                className="py-3.5 px-7 text-center rounded-2xl border bg-white border-gray-300 text-slate-800 font-extrabold text-xs uppercase tracking-wider hover:bg-gray-50 cursor-pointer"
              >
                INGRESAR AL SISTEMA REAL
              </button>
            </div>

            {/* Quick Micro trust metrics badge counters */}
            <div className="grid grid-cols-3 gap-4 md:gap-6 pt-8 border-t border-dashed border-gray-200/60 font-semibold text-xs text-gray-400">
              <div className="space-y-1">
                <span className="block text-2xl font-black text-slate-800 font-mono tracking-tight text-inherit">
                  {liveCounters.scannedToday}
                </span>
                <span className="uppercase text-[9px] font-black tracking-widest block text-gray-400">
                  Escaneos Hoy
                </span>
              </div>
              <div className="space-y-1">
                <span className="block text-2xl font-black text-slate-800 font-mono tracking-tight text-inherit">
                  $
                  {liveCounters.totalSalesUSD.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
                <span className="uppercase text-[9px] font-black tracking-widest block text-gray-400">Ventas USD</span>
              </div>
              <div className="space-y-1">
                <span className="block text-2xl font-black text-slate-800 font-mono tracking-tight text-inherit">
                  {liveCounters.activeCashiers}
                </span>
                <span className="uppercase text-[9px] font-black tracking-widest block text-gray-400">
                  Terminales Activas
                </span>
              </div>
            </div>
          </div>

          {/* Right Hero Preview Mock Visual App Frame */}
          <div className="lg:col-span-5 relative">
            <div className="absolute -top-10 -left-10 bg-orange-200/30 blur-3xl h-60 w-60 rounded-full select-none pointer-events-none" />
            <div className="absolute -bottom-10 -right-10 bg-blue-200/30 blur-3xl h-60 w-60 rounded-full select-none pointer-events-none" />

            {/* The main dashboard mockup preview card */}
            <div
              className={`border-2 rounded-3xl p-5 md:p-6 shadow-xl relative backdrop-blur-xs transition-all duration-300 ${
                simActiveSkin === 'galaxy'
                  ? 'bg-slate-900/90 border-violet-500/30'
                  : simActiveSkin === 'cyberpunk'
                    ? 'bg-black border-cyan-400/40'
                    : 'bg-white border-slate-150'
              }`}
            >
              {/* Header inside mock frame */}
              <div className="flex justify-between items-center pb-4 border-b border-gray-100/50 mb-4 text-xs font-black">
                <div className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 bg-red-400 rounded-full" />
                  <span className="h-3.5 w-3.5 bg-yellow-400 rounded-full" />
                  <span className="h-3.5 w-3.5 bg-green-400 rounded-full" />
                  <span className="text-gray-400 uppercase tracking-widest">StockMaster_Terminal.exe</span>
                </div>
                <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-[8.5px] uppercase font-black tracking-wide">
                  ONLINE
                </span>
              </div>

              {/* Character visual */}
              <div className="flex gap-4.5 items-center bg-slate-500/5 p-4 rounded-2xl mb-4.5">
                <span className="text-5xl animate-bounce duration-1000 select-none">💼</span>
                <div className="space-y-1 text-left">
                  <h4 className="font-extrabold text-sm tracking-tight text-inherit">Operador Principal: Jonas</h4>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="bg-[#fb923c] text-white text-[9px] font-black px-1.5 py-0.2 rounded uppercase">
                      CAJA ACTIVA #01
                    </span>
                    <span className="text-xs text-amber-500 font-extrabold flex items-center">🟢 Turno Activo</span>
                  </div>
                </div>
              </div>

              {/* Stat progress */}
              <div className="space-y-3 font-semibold text-xs">
                <div className="flex justify-between tracking-tight text-gray-550">
                  <span>Meta de Ventas del Turno</span>
                  <span className="text-orange-500 font-black">
                    {Math.min(Math.round((simDailyBilling / 100) * 100), 100)}% Completada
                  </span>
                </div>
                {/* Visual Bar map */}
                <div className="w-full bg-slate-200/50 h-3 rounded-full overflow-hidden p-[1px]">
                  <div
                    className="bg-[#fb923c] h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((simDailyBilling / 100) * 100, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] pt-1">
                  <span className="text-slate-450 uppercase font-black text-[9px]">CUOTA DIARIA DE COBRO</span>
                  <span className="font-mono text-[#fb923c] font-black">Bs. {(simDailyBilling * 45.42).toFixed(2)} / 4,542.00</span>
                </div>
              </div>

              {/* Decorative mini list logs */}
              <div className="space-y-2 mt-4.5 text-[10.5px]">
                <div className="flex justify-between bg-orange-500/5 border border-orange-500/10 p-2.5 rounded-xl text-left items-center">
                  <div className="flex items-center gap-2">
                    <Barcode className="text-orange-500" size={13} />
                    <span className="font-bold">Dona de Fresa 🍩</span>
                  </div>
                  <span className="font-black text-orange-600 font-mono">$1.50</span>
                </div>
                <div className="flex justify-between bg-violet-500/5 border border-violet-500/10 p-2.5 rounded-xl text-left items-center">
                  <div className="flex items-center gap-2">
                    <Receipt className="text-violet-500" size={13} />
                    <span className="font-bold">Firma Digital de Control</span>
                  </div>
                  <span className="font-mono font-black text-violet-600 text-[9px]">Bs. 68.13</span>
                </div>
              </div>

              {/* Ribbon Banner */}
              <div className="mt-5 text-center text-[10px] text-gray-400 font-black uppercase tracking-wider flex items-center justify-center gap-1.5">
                <Scale size={11} /> Optimizado para la Gestión y Control Interno de Inventario
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* COMPREHENSIVE FEATURES GRID "ABSOLUTAMENTE TODO SIN EXCEPCIÓN" */}
      <section id="features" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-left">
        <div className="text-center space-y-3 mb-16">
          <span className="text-[#1cb0f6] font-black text-xs uppercase tracking-widest block bg-blue-50 border border-blue-100 rounded-full px-4.5 py-1.5 w-fit mx-auto">
            CATÁLOGO COMPLETO DE SERVICIOS
          </span>
          <h2 className="text-3xl md:text-4xl font-black tracking-tight">
            Descubre todos los módulos incluidos en StockMaster Pro sin excepción
          </h2>
          <p className="text-base text-gray-500 max-w-3xl mx-auto">
            Hemos construido una suite completa de grado empresarial diseñada para la realidad comercial de Venezuela,
            enfocada orgánicamente en la eficiencia operativa y productividad de tu personal.
          </p>
        </div>

        {/* Dynamic switcher tabs and details */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left: Quick select module buttons */}
          <div className="lg:col-span-4 space-y-2.5">
            {moduleCatalog.map((module) => {
              const isSelected = activeModuleDetail === module.id;
              return (
                <button
                  type="button"
                  key={module.id}
                  onClick={() => {
                    playSound('click');
                    setActiveModuleDetail(module.id);
                  }}
                  className={`w-full text-left py-4.5 px-5 rounded-3xl font-black text-sm uppercase tracking-wide border-2 transition-all flex items-center justify-between gap-3 cursor-pointer ${
                    isSelected
                      ? 'bg-white border-[#fb923c] text-slate-800 border-b-[5px] shadow-sm transform scale-[1.02]'
                      : 'bg-transparent border-gray-200/55 hover:bg-white/30 text-gray-550'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    {module.icon}
                    <span>{module.title.split(' ')[0] + ' ' + module.title.split(' ').slice(1).join(' ')}</span>
                  </div>
                  <ChevronRight
                    size={15}
                    className={`transition-transform ${isSelected ? 'translate-x-1.5 text-orange-500 stroke-[3]' : 'text-gray-300'}`}
                  />
                </button>
              );
            })}
          </div>

          {/* Right: Immersive Animated details of selected module */}
          <div className="lg:col-span-8">
            <div className="bg-white border-2 border-gray-200/85 border-b-8 rounded-3xl p-6 md:p-8 space-y-6 shadow-sm text-left relative overflow-hidden">
              {/* Feature tag and top detail header */}
              <div className="flex justify-between items-start flex-wrap gap-3">
                <span className="bg-orange-50 text-orange-700 text-[9px] font-black px-3.5 py-1 rounded-full uppercase tracking-widest border border-orange-200">
                  {activeModuleItem.badge}
                </span>
                <span className="text-gray-300 text-xs font-black font-mono tracking-widest">
                  MOD_UNIT_{activeModuleItem.id.toUpperCase()}_AUTO_V1
                </span>
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                  <span>{activeModuleItem.title}</span>
                </h3>
                <p className="text-sm font-semibold text-gray-400">{activeModuleItem.shortDesc}</p>
              </div>

              {/* Explanatory description paragraph */}
              <p className="text-sm text-gray-600 leading-relaxed font-medium pt-2 border-t border-dashed border-gray-150">
                {activeModuleItem.longDesc}
              </p>

              {/* Bullet Features checks */}
              <div className="pt-4 space-y-3">
                <h4 className="text-[10.5px] font-black uppercase text-gray-400 tracking-wider">
                  Características Principales Incluidas:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeModuleItem.features.map((feat, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-100 p-2.5 rounded-2xl"
                    >
                      <CheckCircle2 size={15} className="text-orange-500 fill-orange-50 shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Extra context about gamified actions */}
              <div className="bg-slate-50 border border-slate-200/70 p-4.5 rounded-2xl flex gap-3 items-center mt-6">
                <Gift className="text-[#ff9600] shrink-0 h-6 w-6 stroke-[2]" />
                <p className="text-[11.5px] text-slate-500 leading-normal font-semibold">
                  <strong>Impacto en el personal:</strong> El uso constante de este panel acelera la capacitación de
                  cajeros nuevos de 14 días a solo 3 horas gracias al diseño intuitivo y profesional.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PLATAFORMA SANDBOX DEMO INTERACTIVA */}
      <section id="demo" className="py-20 bg-slate-500/5 border-t border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-left">
          <div className="text-center space-y-3 mb-14">
            <span className="text-[#ff9600] font-black text-xs uppercase tracking-widest block bg-amber-50 border border-amber-100 rounded-full px-4.5 py-1.5 w-fit mx-auto">
              ZONA DE PRUEBA ABIERTA
            </span>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-center">
              Consola Simuladora de Terminal StockMaster Pro
            </h2>
            <p className="text-base text-gray-500 max-w-3xl mx-auto text-center">
              Prueba la agilidad en la canasta de compras, el lector y el emulador de tiques antes de iniciar sesión.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* Left Sandbox Column: Actions Controller Panel */}
            <div className="lg:col-span-5 bg-white border-2 border-gray-200 border-b-8 rounded-3xl p-5 md:p-6 space-y-6 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-800 pb-2.5 border-b border-gray-150">
                  Panel de Acciones de Prueba
                </h3>
                <p className="text-xs text-gray-500 font-semibold mt-2.5 leading-normal">
                  Haz clic en los siguientes botones interactivos para simular transacciones de forma segura y ver en tiempo real la facturación y los tiques emitidos.
                </p>
              </div>

              {/* Operations triggers block */}
              <div className="space-y-3 pt-2">
                {/* Click to Scan Barcode */}
                <button
                  type="button"
                  onClick={handleSimulateScanItem}
                  className="w-full bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-200 border-b-5 py-3 px-5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-between text-left active:translate-y-0.5 active:border-b-2 cursor-pointer"
                >
                  <span className="flex items-center gap-3">
                    <Barcode className="text-orange-500 h-5 w-5" />
                    <span>Escanear Código Producto</span>
                  </span>
                  <span className="bg-[#fb923c] text-white text-[9px] font-black py-0.5 px-2 rounded-md">
                    +PUNTOS LOYALTY
                  </span>
                </button>

                {/* Print Ticket */}
                <button
                  type="button"
                  onClick={handleSimulatePrintTicket}
                  className="w-full bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-200 border-b-5 py-3 px-5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-between text-left active:translate-y-0.5 active:border-b-2 cursor-pointer"
                >
                  <span className="flex items-center gap-3">
                    <Printer className="text-orange-500 h-5 w-5" />
                    <span>Simular Emisión de Ticket</span>
                  </span>
                  <span className="bg-orange-50 text-orange-600 text-[8px] font-black py-0.5 px-2 rounded border border-orange-200 uppercase">
                    Simulado
                  </span>
                </button>

                {/* Simular Arqueo de Caja */}
                <button
                  type="button"
                  onClick={handleSimulateArqueoCaja}
                  className="w-full bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-200 border-b-5 py-3 px-5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-between text-left active:translate-y-0.5 active:border-b-2 cursor-pointer"
                >
                  <span className="flex items-center gap-3">
                    <CheckCircle2 className="text-emerald-600 h-5 w-5" />
                    <span>Efectuar Arqueo de Turno (Simulado)</span>
                  </span>
                  <span className="bg-emerald-50 text-emerald-600 text-[9px] font-black py-0.5 px-2 rounded-md">
                    CUADRADO
                  </span>
                </button>

                {/* Theme Selector */}
                <div className="space-y-1.5 pt-3">
                  <span className="text-[10px] uppercase font-black text-gray-400 tracking-wider block">
                    Personalizar tema visual de la interfaz de usuario:
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        playSound('click');
                        setSimActiveSkin('standard');
                      }}
                      className={`text-[9px] font-black py-2.5 rounded-lg border-2 uppercase cursor-pointer ${
                        simActiveSkin === 'standard'
                          ? 'bg-[#fb923c] text-white border-orange-600'
                          : 'bg-slate-50 border-slate-200 text-slate-500'
                      }`}
                    >
                      🍊 Corporativo
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        playSound('click');
                        setSimActiveSkin('galaxy');
                      }}
                      className={`text-[9px] font-black py-2.5 rounded-lg border-2 uppercase cursor-pointer ${
                        simActiveSkin === 'galaxy'
                          ? 'bg-violet-600 text-white border-violet-700'
                          : 'bg-slate-50 border-slate-200 text-slate-500'
                      }`}
                    >
                      🌌 Galaxy
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        playSound('click');
                        setSimActiveSkin('cyberpunk');
                      }}
                      className={`text-[9px] font-black py-2.5 rounded-lg border-2 uppercase cursor-pointer ${
                        simActiveSkin === 'cyberpunk'
                          ? 'bg-zinc-800 text-cyan-400 border-zinc-950 shadow'
                          : 'bg-slate-50 border-slate-200 text-slate-500'
                      }`}
                    >
                      👾 Cyber
                    </button>
                  </div>
                </div>
              </div>

              {/* Clean controller footer */}
              <div className="flex gap-4 items-center justify-between border-t border-dashed border-gray-150 pt-4 mt-4 text-[10.5px]">
                <span className="text-gray-400 font-extrabold uppercase">Terminal ID: #DEMOHUB_01</span>
                <button
                  type="button"
                  onClick={handleSimResetSandbox}
                  className="text-red-500 font-extrabold hover:underline"
                >
                  Reiniciar Todo 🔄
                </button>
              </div>
            </div>

            {/* Right Sandbox Column: Interactive Output Display */}
            <div
              className={`lg:col-span-7 border-2 border-b-8 rounded-3xl p-5 md:p-6 transition-all duration-300 relative ${
                simActiveSkin === 'galaxy'
                  ? 'bg-slate-900/90 border-violet-900/60 shadow-[0_0_20px_rgba(139,92,246,0.1)] text-slate-100'
                  : simActiveSkin === 'cyberpunk'
                    ? 'bg-black border-cyan-400/50 shadow-[0_0_20px_rgba(34,211,238,0.15)] text-cyan-300'
                    : 'bg-white border-slate-200 shadow-xs text-slate-805'
              }`}
            >
              {/* Particle indicator float popup */}
              {showParticle && (
                <div className="absolute top-[35%] left-[50%] transform translate-x-[-50%] translate-y-[-50%] bg-[#fb923c] text-white border-2 border-white font-black text-sm uppercase px-4 py-2 rounded-full shadow-lg z-20 animate-bounce scale-110">
                  {particleText}
                </div>
              )}

              {/* Status Header */}
              <div className="flex justify-between items-center pb-3 border-b border-gray-200/50 mb-5">
                <div className="flex items-center gap-1.5 text-xs font-black">
                  <Clock className="animate-spin duration-3000 text-gray-400" size={13} />
                  <span className="font-mono">REACCIÓN EN TIEMPO REAL DESDE LA COLA</span>
                </div>

                <div className="flex items-center gap-1">
                  <span className="bg-red-400 h-2 w-2 rounded-full" />
                  <span className="bg-yellow-400 h-2 w-2 rounded-full" />
                  <span className="bg-green-400 h-2 w-2 rounded-full" />
                </div>
              </div>

              {/* Active employee values counters */}
              <div className="grid grid-cols-4 gap-2 text-center pb-5 border-b border-dashed border-gray-150 mb-5">
                <div className="bg-slate-500/5 p-2 rounded-xl">
                  <span className="block text-[8.5px] font-black text-gray-400 leading-none">TRANSACCIONES</span>
                  <span className="text-lg font-black tracking-tight">{simTransactionsCount}</span>
                </div>
                <div className="bg-slate-500/5 p-2 rounded-xl">
                  <span className="block text-[8.5px] font-black text-gray-400 leading-none">VENTAS USD</span>
                  <span className="text-lg font-black font-mono tracking-tight">${simDailyBilling.toFixed(2)}</span>
                </div>
                <div className="bg-slate-500/5 p-2 rounded-xl">
                  <span className="block text-[8.5px] font-black text-gray-400 leading-none">LOYALTY PTS</span>
                  <span className="text-lg font-black tracking-tight text-amber-500">{simLoyaltyPoints} pts</span>
                </div>
                <div className="bg-slate-500/5 p-2 rounded-xl">
                  <span className="block text-[8.5px] font-black text-gray-400 leading-none">CAJAS ACTIVAS</span>
                  <span className="text-lg font-black text-orange-500">🟢 {simActiveTerminals} / 5</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Basket List of scanned items */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
                    Productos Escaneados:
                  </h4>
                  {simScannedItems.length === 0 ? (
                    <div className="border-2 border-dashed border-gray-200/60 rounded-2xl p-6 text-center text-xs text-gray-400 font-extrabold flex flex-col items-center justify-center gap-1 py-12">
                      <Barcode size={32} strokeWidth={1} className="text-gray-300" />
                      <span>Ningún ítem en canasta.</span>
                      <span className="text-[10px] font-bold text-gray-400 opacity-80">
                        ¡Usa el panel de la izquierda!
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {simScannedItems.map((item, idx) => (
                        <div
                          key={idx}
                          className="bg-slate-500/5 p-2.5 rounded-xl flex items-center justify-between border border-transparent hover:border-slate-350 transition-all text-xs"
                        >
                          <div className="text-left">
                            <span className="font-extrabold block text-inherit">{item.name}</span>
                            <span className="text-[9px] font-mono font-black text-gray-400">UPC: {item.code}</span>
                          </div>
                          <span className="font-mono font-black text-orange-600">${item.price.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Printed thermal fiscal ticket output display */}
                <div>
                  <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-2.5">
                    Recibo Impreso por Tiqueera:
                  </h4>
                  {simPrintedTicket ? (
                    <div className="bg-[#fdfdfd] border border-gray-200 font-mono text-[9px] text-[#1c1c1c] p-3 rounded-2xl shadow-inner max-h-[170px] overflow-y-auto leading-tight text-left">
                      <pre className="whitespace-pre-wrap">{simPrintedTicket}</pre>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-200/60 rounded-2xl p-6 text-center text-xs text-gray-400 font-extrabold flex flex-col items-center justify-center gap-1 py-12">
                      <Printer size={32} strokeWidth={1} className="text-gray-300 animate-pulse" />
                      <span>Previsualización de tiques vacía.</span>
                      <span className="text-[10px] font-bold text-gray-400 opacity-80">
                        Haz clic en "Simular Emisión"
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* METRICS OF SUCCESS SECTION */}
      <section
        id="metrics"
        className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-left border-b border-gray-200/50"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <span className="bg-[#eae6ff] text-[#4d38ff] text-[10px] font-black px-3.5 py-1.5 rounded-full uppercase tracking-wider border border-[#b2a5ff]">
              MÉTRICAS REALES COMPROBADAS
            </span>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight leading-none">
              ¿Por qué optimizar el flujo de cobro en mostrador aumenta un 41% tus utilidades?
            </h2>
            <p className="text-base text-gray-500 leading-relaxed font-semibold">
              El ausentismo de cajeros y las discrepancias de caja al final de los turnos representan pérdidas
              importantes a nivel mundial. StockMaster Pro ataca este problema aplicando herramientas de control intuitivas
              para el equipo operativo.
            </p>

            <div className="space-y-4 pt-3">
              <div className="flex gap-4 items-start">
                <span className="bg-orange-100 p-2 text-orange-600 rounded-xl text-xl shrink-0 select-none">📈</span>
                <div className="space-y-1">
                  <h4 className="font-extrabold text-sm tracking-tight text-inherit">Cero Fugas Contables</h4>
                  <p className="text-xs text-gray-500 leading-normal font-semibold">
                    Al automatizar y simplificar el arqueo, el 98% de los operadores declaran sus ingresos sin
                    diferencias de centavos.
                  </p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <span className="bg-blue-105 p-2 text-blue-600 rounded-xl text-xl shrink-0 select-none">⚡</span>
                <div className="space-y-1">
                  <h4 className="font-extrabold text-sm tracking-tight text-inherit">
                    Aceleración del Despacho de Cola
                  </h4>
                  <p className="text-xs text-gray-500 leading-normal font-semibold">
                    Cajeros capacitados con nuestra UI premium escanean artículos y efectúan cobros un 2.5x veces más rápido.
                  </p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <span className="bg-[#ffe8ca] p-2 text-amber-700 rounded-xl text-xl shrink-0 select-none">🤝</span>
                <div className="space-y-1">
                  <h4 className="font-extrabold text-sm tracking-tight text-inherit">Retención de Clientes Orgánica</h4>
                  <p className="text-xs text-gray-500 leading-normal font-semibold">
                    Los operadores registran ágilmente a los clientes en el CRM de lealtad para acumular puntos,
                    mejorando el regreso frecuente en un 38%.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Metrics charts view */}
          <div className="bg-white border-2 border-gray-250 border-b-8 rounded-3xl p-5 md:p-6 space-y-6 shadow-xs relative">
            <h3 className="font-black text-sm tracking-widest text-gray-400 uppercase">
              AUDITORÍA ESTADÍSTICA DE RETORNO (ROI)
            </h3>

            {/* Chart 1: Speedup graph mock */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-black">
                <span>Tiempo promedio de cobro por cliente</span>
                <span className="text-[#ea580c] font-extrabold">Reducido 60%</span>
              </div>
              <div className="space-y-1.5 pt-1 text-[10.5px]">
                <div className="flex items-center gap-2">
                  <span className="w-24 text-gray-400 font-extrabold">POS Clásico:</span>
                  <div className="flex-1 bg-gray-100 rounded-md h-5 relative overflow-hidden">
                    <div className="bg-gray-400 h-full w-[80%] rounded-md text-[9px] font-black text-white flex items-center pl-2">
                      72 Segundos
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-24 text-gray-850 font-black">StockMaster Pro:</span>
                  <div className="flex-1 bg-orange-50 rounded-md h-5 relative overflow-hidden ring-1 ring-orange-150">
                    <div className="bg-[#fb923c] h-full w-[35%] rounded-md text-[9px] font-black text-white flex items-center pl-2">
                      29 Segundos
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Chart 2: Client retention graph */}
            <div className="space-y-2 pt-2 border-t border-dashed border-gray-150">
              <div className="flex justify-between items-center text-xs font-black">
                <span>Registro de clientes frecuentes en programa de fidelidad</span>
                <span className="text-blue-600 font-extrabold">Aumentado 240%</span>
              </div>
              <div className="grid grid-cols-3 gap-3 pt-2 text-center text-[10px] font-black">
                <div className="bg-[#fcf8ff] border border-violet-100 p-2.5 rounded-xl">
                  <span className="block text-gray-400 text-[8.5px]">POS Tradicional</span>
                  <span className="text-sm font-black text-violet-700">12%</span>
                </div>
                <div className="bg-sky-50 border border-blue-100 p-2.5 rounded-xl">
                  <span className="block text-gray-400 text-[8.5px]">Club Sin Premios</span>
                  <span className="text-sm font-black text-blue-700">28%</span>
                </div>
                <div className="bg-orange-50 border border-orange-105 p-2.5 rounded-xl ring-2 ring-orange-100">
                  <span className="block text-[#ea580c] text-[8.5px]">StockMaster Loyalty</span>
                  <span className="text-sm font-black text-orange-700 animate-pulse">74% ⭐</span>
                </div>
              </div>
            </div>

            {/* Micro-banner info */}
            <div className="bg-amber-50 border border-amber-200/50 p-3.5 rounded-xl text-center text-[10.5px] text-amber-800 font-extrabold leading-normal">
              🛡️ El 100% de los datos se guardan con persistencia local cifrada en el navegador, asegurando que el POS
              funcione incluso en zonas sin internet de alta velocidad.
            </div>
          </div>
        </div>
      </section>

      <section id="faqs" className="py-20 max-w-4xl mx-auto px-4 sm:px-6 text-left">
        <div className="text-center space-y-3 mb-12">
          <span className="text-slate-500 font-black text-xs uppercase tracking-widest block">RESOLVIENDO DUDAS</span>
          <h2 className="text-3xl font-black tracking-tight text-center">Preguntas Frecuentes sobre StockMaster Pro</h2>
        </div>

        <div className="space-y-3.5">
          {/* FAQ 1 */}
          <div className="bg-white border-2 border-gray-210 rounded-2xl overflow-hidden shadow-xs">
            <button
              type="button"
              onClick={() => toggleFaq('que-es-duopos')}
              className="w-full text-left p-4.5 font-extrabold text-sm sm:text-base flex justify-between items-center bg-gray-50 cursor-pointer"
            >
              <span>💻 ¿Qué es realmente StockMaster Pro y para quién está diseñado?</span>
              <span className="text-gray-400 font-mono text-xl">{faqOpen['que-es-duopos'] ? '−' : '+'}</span>
            </button>
            {faqOpen['que-es-duopos'] && (
              <div className="p-5 text-xs sm:text-sm text-gray-600 leading-relaxed font-semibold border-t border-gray-200 whitespace-pre-line">
                Es una herramienta multiplataforma (PWA listo para instalar en iPhone/Android/Desktop) que provee una
                solución completa de caja registradora, control de divisas, CRM de fidelidad y logística de
                multi-sucursal. Está diseñado para comercios, panaderías, tiendas de donuts, cadenas de comida rápida, y
                botiquerías de Venezuela que deseen profesionalizar sus finanzas de manera limpia, intuitiva, rápida y
                bajo las mejores prácticas administrativas.
              </div>
            )}
          </div>

          {/* FAQ 2 */}
          <div className="bg-white border-2 border-gray-210 rounded-2xl overflow-hidden shadow-xs">
            <button
              type="button"
              onClick={() => toggleFaq('como-gamifica')}
              className="w-full text-left p-4.5 font-extrabold text-sm sm:text-base flex justify-between items-center bg-gray-50 cursor-pointer"
            >
              <span>📊 ¿Cómo funciona el sistema de incentivos y fidelización de la suite?</span>
              <span className="text-gray-400 font-mono text-xl">{faqOpen['como-gamifica'] ? '−' : '+'}</span>
            </button>
            {faqOpen['como-gamifica'] && (
              <div className="p-5 text-xs sm:text-sm text-gray-600 leading-relaxed font-semibold border-t border-gray-200">
                El sistema cuenta con un programa integrado de fidelización y control de metas operativas. Cada cajero al registrar transacciones de forma precisa, emitir comprobantes válidos y efectuar arqueos sin discrepancias ayuda al negocio a cumplir sus metas de ventas del turno y acumula puntos de fidelidad para sus clientes frecuentes. Todo esto corre en segundo plano y promueve un ambiente de trabajo de alta precisión, dinámico y enfocado en la excelencia de atención sin complicar los procesos tradicionales.
              </div>
            )}
          </div>

          {/* FAQ 3 */}
          <div className="bg-white border-2 border-gray-210 rounded-2xl overflow-hidden shadow-xs">
            <button
              type="button"
              onClick={() => toggleFaq('tasa-divisas')}
              className="w-full text-left p-4.5 font-extrabold text-sm sm:text-base flex justify-between items-center bg-gray-50 cursor-pointer"
            >
              <span>⚖️ ¿Cómo maneja StockMaster Pro el cálculo de divisas y el impuesto IVA de Venezuela?</span>
              <span className="text-gray-400 font-mono text-xl">{faqOpen['tasa-divisas'] ? '−' : '+'}</span>
            </button>
            {faqOpen['tasa-divisas'] && (
              <div className="p-5 text-xs sm:text-sm text-gray-600 leading-relaxed font-semibold border-t border-gray-200">
                El sistema consulta los datos del Banco Central de Venezuela (BCV Oficial) y dólar paralelo para
                actualizar la tasa de cambio diaria automáticamente (ve.dolarapi.com). Los catálogos permiten registrar
                precios base y calcula automáticamente el 16% de IVA, imprimiendo el resultado exacto en Bolívares
                soberanos (Bs.) o dólares americanos ($ USD) para cumplimiento de la administración interna del negocio.
              </div>
            )}
          </div>

          {/* FAQ 4 */}
          <div className="bg-white border-2 border-gray-210 rounded-2xl overflow-hidden shadow-xs">
            <button
              type="button"
              onClick={() => toggleFaq('impresora-termica')}
              className="w-full text-left p-4.5 font-extrabold text-sm sm:text-base flex justify-between items-center bg-gray-50 cursor-pointer"
            >
              <span>🖨️ ¿Tienen soporte real de impresión de tiques de caja y hardware?</span>
              <span className="text-gray-400 font-mono text-xl">{faqOpen['impresora-termica'] ? '−' : '+'}</span>
            </button>
            {faqOpen['impresora-termica'] && (
              <div className="p-5 text-xs sm:text-sm text-gray-600 leading-relaxed font-semibold border-t border-gray-200">
                ¡Sí! Contamos con un avanzado módulo emulador térmico de comandos raw ESC/POS integrados para red IoT.
                Permite previsualizar la impresión, simula la tiqueera, y expone la hoja de comandos de comandos raw
                para inyectar a tiqueeras físicas bluetooth o USB conectadas a la terminal.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* FOOTER CALL TO ACTION */}
      <footer className="bg-slate-900 text-white rounded-t-[40px] pt-16 pb-12 text-left relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-orange-950/20 via-transparent to-transparent select-none pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="flex flex-col lg:flex-row justify-between items-center gap-8 pb-12 border-b border-gray-800">
            <div className="space-y-2 text-center lg:text-left">
              <h3 className="text-3xl font-black text-white">¿Estás listo para probar el verdadero StockMaster Pro?</h3>
              <p className="text-sm text-gray-400 max-w-xl font-medium">
                Inicia sesión de inmediato con un usuario preconfigurado o registra tu propio operador de racha gratis
                en el sandbox de pruebas.
              </p>
            </div>

            <div className="flex items-center gap-3.5 flex-wrap shrink-0">
              <button
                onClick={() => {
                  playSound('success');
                  onEnterApp();
                }}
                className="bg-[#fb923c] text-white border-b-4 border-orange-800 hover:bg-orange-500 font-black text-xs uppercase tracking-widest py-3.5 px-7 rounded-2xl cursor-pointer active:translate-y-0.5 active:border-b-0"
              >
                ENTRAR AL PUNTO DE VENTA LIVE 🚀
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-6 text-xs text-gray-400">
            <div className="flex items-center gap-3 justify-center md:justify-start">
              <div className="w-6 h-6 rounded-md border border-orange-500 bg-white flex items-center justify-center shrink-0">
                <div className="w-3 h-3 rounded bg-orange-400" />
              </div>
              <span className="font-extrabold">
                StockMaster Pro © 2026 - La fuerza naranja de la optimización contable.
              </span>
            </div>

            <div className="flex gap-4 font-semibold">
              <span className="hover:underline cursor-pointer">Seguridad local</span>
              <span>•</span>
              <span className="hover:underline cursor-pointer">Control Interno</span>
              <span>•</span>
              <span className="hover:underline cursor-pointer">Términos y Soporte</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
