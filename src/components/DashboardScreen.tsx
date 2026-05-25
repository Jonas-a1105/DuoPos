/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { User, Transaction, Product } from '../types';
import { DUO_CHARACTERS, DEFAULT_PRODUCTS } from '../initialData';
import { playSound } from '../utils/sounds';
import { Award, Flame, ShoppingBag, TrendingUp, DollarSign, Package, Check, Sparkles, MessageSquare, Download, Upload, Bot, Brain, Send, HelpCircle } from 'lucide-react';

interface DashboardScreenProps {
  user: User;
  transactions: Transaction[];
  products: Product[];
  onSetNewGoal: (goal: number) => void;
  onNavigateToSell: () => void;
  onGrantXp?: (amount: number) => void;
}

export default function DashboardScreen({ user, transactions, products, onSetNewGoal, onNavigateToSell, onGrantXp }: DashboardScreenProps) {
  const activeChar = DUO_CHARACTERS[user.avatar] || DUO_CHARACTERS.duo;

  const [activeDashboardTab, setActiveDashboardTab] = React.useState<'overview' | 'advanced' | 'copilot'>('overview');
  const [monthlyTargetProfit, setMonthlyTargetProfit] = React.useState(1500);
  const [copilotResponse, setCopilotResponse] = React.useState<string>('');
  const [copilotLoading, setCopilotLoading] = React.useState<boolean>(false);
  const [copilotQuery, setCopilotQuery] = React.useState<string>('');

  // --- ADVANCED BUSINESS ANALYTICS METRICS ---
  
  // Tax calculations
  // Default to standard 16% IVA unless configured.
  const taxConfig = React.useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('duo_pos_tax_settings') || '{"taxName": "IVA", "taxRate": 16, "isTaxIncluded": true}');
    } catch {
      return { taxName: 'IVA', taxRate: 16, isTaxIncluded: true };
    }
  }, []);

  // Compute tax liabilities
  const advancedMetrics = React.useMemo(() => {
    let grossAllTime = 0;
    let netAllTime = 0;
    let taxAllTime = 0;
    let totalItemsCount = 0;
    
    // Category sales mapping
    const categorySales: Record<string, number> = {};
    const categoryQty: Record<string, number> = {};
    
    // Product contribution
    const productStats: Record<string, { id: string; name: string; emoji: string; qty: number; revenue: number; profit: number }> = {};

    transactions.forEach(t => {
      const totalAmt = t.total;
      grossAllTime += totalAmt;
      
      const rateNum = Number(taxConfig.taxRate) || 0;
      if (taxConfig.isTaxIncluded) {
        const netAmt = totalAmt / (1 + (rateNum / 100));
        netAllTime += netAmt;
        taxAllTime += (totalAmt - netAmt);
      } else {
        netAllTime += totalAmt;
        const taxAmt = totalAmt * (rateNum / 100);
        taxAllTime += taxAmt;
        grossAllTime += taxAmt;
      }

      t.items.forEach(item => {
        totalItemsCount += item.quantity;
        
        // Find product
        const prod = products.find(p => p.id === item.productId);
        const catName = prod ? prod.category : 'Otros';
        const costVal = prod ? prod.cost : (item.price * 0.4);
        const profitVal = (item.price - costVal) * item.quantity;
        
        categorySales[catName] = (categorySales[catName] || 0) + (item.price * item.quantity);
        categoryQty[catName] = (categoryQty[catName] || 0) + item.quantity;

        const prodId = item.productId || 'deleted';
        if (!productStats[prodId]) {
          productStats[prodId] = {
            id: prodId,
            name: item.name,
            emoji: prod?.emoji || '📦',
            qty: 0,
            revenue: 0,
            profit: 0
          };
        }
        productStats[prodId].qty += item.quantity;
        productStats[prodId].revenue += item.price * item.quantity;
        productStats[prodId].profit += profitVal;
      });
    });

    const productsLeaderboard = Object.values(productStats).sort((a, b) => b.revenue - a.revenue);

    return {
      grossAllTime,
      netAllTime,
      taxAllTime,
      totalItemsCount,
      categorySales,
      categoryQty,
      productsLeaderboard
    };
  }, [transactions, products, taxConfig]);

  // Export Database Backup file
  const handleExportDB = () => {
    try {
      const backupData = {
        user,
        products,
        transactions,
        version: 'DuoPOS_v1.8',
        timestamp: new Date().toISOString()
      };
      
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `duopos_respaldo_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Error al exportar los datos: ' + err);
    }
  };

  // Import Database Backup file
  const handleImportDB = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (parsed && typeof parsed === 'object') {
          if (!parsed.user || !parsed.products || !parsed.transactions) {
            alert('⛔ Error: El archivo cargado no tiene un esquema de DuoPOS válido.');
            return;
          }

          localStorage.setItem('duo_pos_active_user', JSON.stringify(parsed.user));
          localStorage.setItem('duo_pos_products', JSON.stringify(parsed.products));
          localStorage.setItem('duo_pos_transactions', JSON.stringify(parsed.transactions));
          
          alert('✅ ¡Base de datos de DuoPOS restaurada éxitosamente! Reiniciando vista...');
          window.location.reload();
        }
      } catch (err) {
        alert('⛔ Fallo de parseo: El archivo no contiene JSON válido.');
      }
    };
    reader.readAsText(file);
  };

  // Compute stats for TODAY (same date)
  const todayStr = new Date().toISOString().split('T')[0];
  const todayTransactions = transactions.filter(t => t.date.startsWith(todayStr));
  
  const todaySalesSum = todayTransactions.reduce((acc, curr) => acc + curr.total, 0);
  const totalQtySold = todayTransactions.reduce((acc, curr) => acc + curr.items.reduce((sum, item) => sum + item.quantity, 0), 0);
  
  // Daily Goal Progress
  const pctGoal = Math.min(Math.round((todaySalesSum / user.dailyGoal) * 100), 100);
  const isGoalReached = todaySalesSum >= user.dailyGoal;

  // Let's compute overall counts
  const totalSalesAllTime = transactions.reduce((acc, curr) => acc + curr.total, 0);
  
  // Profit calculations
  let totalCostAllTime = 0;
  transactions.forEach(t => {
    t.items.forEach(item => {
      // Look up cost
      const prodCost = products.find(p => p.id === item.productId)?.cost || (item.price * 0.4); // fallback if deleted
      totalCostAllTime += prodCost * item.quantity;
    });
  });
  const totalProfitAllTime = Math.max(0, totalSalesAllTime - totalCostAllTime);

  const averageCartValue = transactions.length > 0 ? (totalSalesAllTime / transactions.length) : 0;
  const lowStockCount = products.filter(p => p.stock <= 5).length;

  // XP level calculations & Titles
  const xpNeededForNextLevel = user.level * 100;
  const xpPct = Math.min((user.xp / xpNeededForNextLevel) * 100, 100);

  // Generate dynamic stats for the past 5 days (for custom SVG chart)
  const getPastDaysData = () => {
    const data = [];
    for (let i = 4; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const salesForDay = transactions
        .filter(t => t.date.startsWith(dateStr))
        .reduce((sum, t) => sum + t.total, 0);
      
      const dayName = d.toLocaleDateString('es-ES', { weekday: 'short' });
      data.push({ label: dayName.charAt(0).toUpperCase() + dayName.slice(1), amount: salesForDay });
    }
    return data;
  };

  const chartData = getPastDaysData();
  const maxAmount = Math.max(...chartData.map(c => c.amount), 50); // scale reference

  const handleCallCopilot = async (overridePrompt?: string) => {
    const queryToUse = overridePrompt || copilotQuery;
    if (!queryToUse.trim()) return;
    
    setCopilotLoading(true);
    setCopilotResponse('');
    try {
      const statsContext = {
        employeeName: user.username,
        level: user.level,
        xp: user.xp,
        dailyGoal: user.dailyGoal,
        streak: user.streak,
        totalSalesVolume: transactions.reduce((acc, curr) => acc + curr.total, 0),
        transactionsCount: transactions.length,
        productsCount: products.length,
        lowStockCount: products.filter(p => p.stock <= 5).length,
        categories: Array.from(new Set(products.map(p => p.category))),
        inventoryProducts: products.map(p => ({ name: p.name, stock: p.stock, price: p.price })),
        recentTransactions: transactions.slice(-5).map(t => ({ total: t.total, date: t.date, items: t.items.map(i => i.name) }))
      };

      const systemPrompt = "Eres Duo Copilot, el asistente IA analítico de negocios de alta tecnología de DuoPOS. Tu objetivo es dar recomendaciones estratégicas breves (máximo 4 párrafos cortos), atractivas, lúdicas y extremadamente profesionales. Habla con entusiasmo, usa el tono divertido pero sabio característico del búho Duo. Estructura tus respuestas usando encabezados markdown elegantes, listas de viñetas, y añade sugerencias numéricas específicas de decisiones de racha y precios para las métricas provistas.";

      const userMessage = `Hola Duo Copilot. Mis datos de hoy/históricos de la tienda son:
- Empleado: ${statsContext.employeeName} (Nivel ${statsContext.level}, Racha: ${statsContext.streak} días)
- Volumen de Ventas: $${statsContext.totalSalesVolume.toFixed(2)} USD (Transacciones: ${statsContext.transactionsCount})
- Catálogo: ${statsContext.productsCount} productos (${statsContext.lowStockCount} con stock bajo de 5 unidades)
- Productos principales: ${JSON.stringify(statsContext.inventoryProducts.slice(0, 4))}

Consulta del usuario: ${queryToUse}

Por favor, analízalo con tu telemetría avanzada y dame insights de calibre mundial.`;

      const response = await fetch("/api/gemini/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemPrompt, userMessage }),
      });
      const data = await response.json();
      setCopilotResponse(data.text || "No se ha podido recuperar una respuesta de Duo Copilot.");
      
      if (onGrantXp) {
        onGrantXp(25);
      }
    } catch (err: any) {
      console.error(err);
      setCopilotResponse("⚠️ Error de conexión con Duo Copilot en la nube. Revisa tu racha de conexión.");
    } finally {
      setCopilotLoading(false);
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-fadeIn font-sans pb-10">
      
      {/* 1. Header Banner: Hero Streak & XP indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Profile Card & Level */}
        <div className="bg-white border-2 border-[#e5e5e5] border-b-[6px] rounded-3xl p-5 flex items-center gap-4">
          <div className="bg-gradient-to-tr from-yellow-300 to-amber-400 p-1.5 rounded-2xl shadow-sm border border-amber-300 flex-shrink-0">
            <span className="text-4xl block filter drop-shadow-sm select-none">{activeChar.avatar}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-xl text-gray-800 truncate">{user.username}</span>
              <span className="bg-amber-100 text-amber-800 border-b-2 border-amber-200 text-[10px] px-2 py-0.5 rounded-md font-black uppercase tracking-wider flex items-center gap-0.5">
                Nivel {user.level}
              </span>
            </div>
            <p className="text-xs text-gray-500 font-extrabold truncate uppercase tracking-tight mt-0.5">
              👑 {user.levelTitle}
            </p>
          </div>
        </div>

        {/* Experience Points Progression Bar */}
        <div className="bg-white border-2 border-[#e5e5e5] border-b-[6px] rounded-3xl p-5 flex flex-col justify-center space-y-2">
          <div className="flex justify-between items-center text-sm font-black">
            <span className="text-[#58cc02] flex items-center gap-1">
              <Award size={18} /> Puntos de Experiencia (XP)
            </span>
            <span className="text-gray-500">{user.xp} / {xpNeededForNextLevel} XP</span>
          </div>
          <div className="w-full bg-gray-100 h-4 rounded-full p-[2px] overflow-hidden">
            <div 
              className="bg-[#58cc02] h-full rounded-full transition-all duration-500"
              style={{ width: `${xpPct}%` }}
            />
          </div>
          <p className="text-[10px] text-gray-400 font-black tracking-wide uppercase text-right">
            ¡Haz ventas o agrega inventario para subir de nivel!
          </p>
        </div>

        {/* Sales Streak Indicator */}
        <div className="bg-white border-2 border-[#e5e5e5] border-b-[6px] rounded-3xl p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-orange-100 p-2.5 rounded-2xl border border-orange-200 text-orange-500 flex-shrink-0 animate-pulse">
              <Flame size={28} fill="currentColor" />
            </div>
            <div>
              <span className="text-2xl font-black text-orange-500 block">
                {user.streak} {user.streak === 1 ? 'Día de Racha' : 'Días de Racha'}
              </span>
              <p className="text-xs text-gray-400 font-bold">
                {isGoalReached ? '¡Racha asegurada para hoy! 🎉' : '¡Factura hoy para proteger tu racha!'}
              </p>
            </div>
          </div>
          <div className="text-3xl select-none">🔥</div>
        </div>

      </div>

      {/* 2. Interactive Character Bubble */}
      <div className="w-full flex items-start gap-4 bg-white border-2 border-[#e5e5e5] border-b-[6px] rounded-3xl p-5 md:p-6 shadow-sm">
        <div className="text-7xl select-none transform hover:scale-110 active:-rotate-12 duration-200 flex-shrink-0">
          {activeChar.avatar}
        </div>
        <div className="flex-1 relative bg-[#f2ffd9] border border-[#d2f09d] rounded-2xl py-4 px-5 text-base font-bold text-gray-700">
          {/* Triangular pointer */}
          <div className="absolute left-[-8px] top-6 w-0 h-0 border-t-8 border-t-transparent border-r-8 border-r-[#f2ffd9] border-b-8 border-b-transparent" />
          <div className="absolute left-[-9px] top-6 w-0 h-0 border-t-8 border-t-transparent border-r-8 border-r-[#d2f09d] border-b-8 border-b-transparent -z-10" />
          
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs uppercase tracking-wider text-[#58cc02] font-black">
              {activeChar.name} • Tu Mentor Financiero
            </span>
            <span className="text-xs text-gray-400 flex items-center gap-1 font-extrabold bg-white px-2 py-0.5 rounded-full shadow-xs border border-gray-100">
              <MessageSquare size={12} /> Sugerencia activa
            </span>
          </div>

          <p className="leading-relaxed text-gray-700 font-extrabold pr-2">
            {isGoalReached 
              ? `¡ESPECTACULAR! Hemos alcanzado el objetivo de ventas de hoy ($${todaySalesSum.toFixed(2)} / $${user.dailyGoal.toFixed(2)}). ¡Has salvado la racha familiar y ganado bonificaciones extra!`
              : `Llevamos $${todaySalesSum.toFixed(2)} facturados hoy en ${todayTransactions.length} ventas. Nos faltan $${Math.max(0, user.dailyGoal - todaySalesSum).toFixed(2)} para completar la meta de $${user.dailyGoal}. ${activeChar.idleQuote}`
            }
          </p>
        </div>
      </div>

      {/* 3. Daily sales target progress bar & Goal Adjustment */}
      <div className="bg-white border-2 border-[#e5e5e5] border-b-[6px] rounded-3xl p-6 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        <div className="md:col-span-2 space-y-3">
          <div className="flex justify-between items-end">
            <div>
              <h3 className="text-xl font-extrabold text-[#3c3c3c]">
                Objetivo de Ventas del Día
              </h3>
              <p className="text-xs text-gray-400 font-extrabold uppercase mt-0.5">
                Meta actual: <span className="text-gray-700">${user.dailyGoal} USD</span>
              </p>
            </div>
            <span className="text-lg font-black text-[#58cc02]">
              {pctGoal}% completado
            </span>
          </div>

          {/* Large custom progress tracker with star award at the end */}
          <div className="relative pt-1">
            <div className="w-full bg-gray-100 h-8 rounded-2xl p-1 overflow-hidden relative border border-gray-200 shadow-inner flex items-center">
              <div 
                className="bg-[#58cc02] h-full rounded-xl transition-all duration-500 border-b-4 border-[#46a302] flex items-center justify-end pr-2 overflow-hidden" 
                style={{ width: `${pctGoal}%` }}
              >
                {pctGoal > 15 && (
                  <span className="text-white text-[10px] font-black tracking-widest uppercase animate-pulse">
                    ¡VAMOS POR MÁS!
                  </span>
                )}
              </div>
              
              {/* Star flag icon at the end */}
              <div className={`absolute right-3 text-lg transition-transform ${isGoalReached ? 'scale-125 duration-300 text-yellow-400 animate-bounce' : 'text-gray-300'}`}>
                ⭐
              </div>
            </div>
          </div>
        </div>

        {/* Goal edit controls */}
        <div className="bg-gray-50 border border-[#e5e5e5] rounded-2xl p-4 flex flex-col justify-between space-y-2">
          <span className="text-xs font-black uppercase text-gray-500 block text-center">
            Ajustar Meta del Día
          </span>
          <div className="grid grid-cols-3 gap-1.5">
            {[100, 150, 300].map(val => (
              <button
                key={val}
                type="button"
                onClick={() => onSetNewGoal(val)}
                className={`py-1.5 px-1 rounded-xl font-bold text-xs transition-all ${
                  user.dailyGoal === val
                    ? 'bg-[#58cc02] text-white border-b-4 border-[#46a302] scale-105'
                    : 'bg-white border-2 border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                ${val}
              </button>
            ))}
          </div>
        </div>
      </div>

               {/* Tab Switcher: Overview vs Advanced Business Analytics vs Duo Copilot */}
      <div className="flex border-b-2 border-[#e5e5e5] gap-6 overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveDashboardTab('overview')}
          className={`pb-3 px-1 text-sm font-black uppercase tracking-wider border-b-4 transition-all cursor-pointer shrink-0 ${
            activeDashboardTab === 'overview'
              ? 'border-[#58cc02] text-[#58cc02]'
              : 'border-transparent text-[#8a8a8a] hover:text-[#58cc02]'
          }`}
        >
          Overview 📈
        </button>
        <button
          type="button"
          onClick={() => setActiveDashboardTab('advanced')}
          className={`pb-3 px-1 text-sm font-black uppercase tracking-wider border-b-4 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
            activeDashboardTab === 'advanced'
              ? 'border-[#1cb0f6] text-[#1cb0f6]'
              : 'border-transparent text-[#8a8a8a] hover:text-[#1cb0f6]'
          }`}
        >
          Analíticas Avanzadas ⚡
          <span className="bg-[#e5f6ff] text-[#1cb0f6] border border-[#1cb0f6]/20 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase leading-none">
            PRO
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveDashboardTab('copilot')}
          className={`pb-3 px-1 text-sm font-black uppercase tracking-wider border-b-4 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
            activeDashboardTab === 'copilot'
              ? 'border-purple-500 text-purple-600'
              : 'border-transparent text-[#8a8a8a] hover:text-purple-600'
          }`}
        >
          Duo Copilot IA 🦉✨
          <span className="bg-purple-100 text-purple-600 border border-purple-200 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase leading-none animate-pulse">
            NUEVO
          </span>
        </button>
      </div>

      {activeDashboardTab === 'overview' && (
        <div className="space-y-6 md:space-y-8 animate-fadeIn">
          {/* 4. Bento Grid Financial Stats */}
          <h3 className="text-2xl font-black text-gray-800 tracking-tight">Estadísticas de la Tienda</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            
            {/* Sales Box */}
            <div className="bg-white border-2 border-[#e5e5e5] border-b-[6px] rounded-3xl p-5 hover:translate-y-[-2px] transition-transform flex flex-col justify-between h-36">
              <div className="flex justify-between items-center">
                <span className="text-xs font-black uppercase tracking-wide text-gray-400">Total Vendido</span>
                <div className="bg-green-100 p-1.5 rounded-xl text-[#58cc02]">
                  <DollarSign size={16} />
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-2xl md:text-3xl font-black text-gray-800 tracking-tight block">
                  ${totalSalesAllTime.toFixed(2)}
                </span>
                <p className="text-[10px] text-gray-400 font-extrabold uppercase">
                  Todas las ventas registradas
                </p>
              </div>
            </div>

            {/* Profit Box */}
            <div className="bg-white border-2 border-[#e5e5e5] border-b-[6px] rounded-3xl p-5 hover:translate-y-[-2px] transition-transform flex flex-col justify-between h-36">
              <div className="flex justify-between items-center">
                <span className="text-xs font-black uppercase tracking-wide text-gray-400">Ganancia Neta</span>
                <div className="bg-blue-100 p-1.5 rounded-xl text-blue-500">
                  <TrendingUp size={16} />
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-2xl md:text-3xl font-black text-blue-500 tracking-tight block">
                  ${totalProfitAllTime.toFixed(2)}
                </span>
                <p className="text-[10px] text-gray-400 font-extrabold uppercase leading-none">
                  Descontando costes de fábrica
                </p>
              </div>
            </div>

            {/* Average cart */}
            <div className="bg-white border-2 border-[#e5e5e5] border-b-[6px] rounded-3xl p-5 hover:translate-y-[-2px] transition-transform flex flex-col justify-between h-36">
              <div className="flex justify-between items-center">
                <span className="text-xs font-black uppercase tracking-wide text-gray-400">Ticket Promedio</span>
                <div className="bg-yellow-105 p-1.5 rounded-xl text-yellow-500 bg-yellow-100">
                  <ShoppingBag size={16} />
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-2xl md:text-3xl font-black text-gray-800 tracking-tight block">
                  ${averageCartValue.toFixed(2)}
                </span>
                <p className="text-[10px] text-gray-400 font-extrabold uppercase">
                  Por cada cliente cobrado
                </p>
              </div>
            </div>

            {/* Inventory Warning Card */}
            <div className="bg-white border-2 border-[#e5e5e5] border-b-[6px] rounded-3xl p-5 hover:translate-y-[-2px] transition-transform flex flex-col justify-between h-36">
              <div className="flex justify-between items-center">
                <span className="text-xs font-black uppercase tracking-wide text-gray-400">Inventario</span>
                <div className="bg-red-100 p-1.5 rounded-xl text-red-500">
                  <Package size={16} />
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-2xl md:text-3xl font-black text-gray-800 tracking-tight block flex items-baseline gap-1">
                  {products.length} <span className="text-sm text-gray-400 font-extrabold">items</span>
                </span>
                <p className="text-[10px] text-gray-400 font-extrabold uppercase">
                  {lowStockCount > 0 
                    ? `🚨 ¡Hay ${lowStockCount} artículos con poco stock!` 
                    : '✅ Niveles de almacén saludables'
                  }
                </p>
              </div>
            </div>

          </div>

          {/* 5. Custom Interactive SVG Weekly Sales Analytics Graphic */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Weekly Chart Card */}
            <div className="bg-white border-2 border-[#e5e5e5] border-b-[6px] rounded-3xl p-6 shadow-sm lg:col-span-2 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-black text-gray-800">
                    Historial de Facturación
                  </h3>
                  <p className="text-xs text-gray-400 font-bold">Últimos 5 días hábiles de la tienda</p>
                </div>
                <span className="text-xs font-black bg-gray-100 text-gray-605 px-3 py-1 rounded-full uppercase border">
                  Gráfico en Tiempo Real
                </span>
              </div>

              {/* SVG Vector Chart Panel */}
              <div className="w-full h-48 bg-gray-50 border border-gray-100 rounded-2xl p-4 flex flex-col justify-end space-y-2">
                <div className="flex-1 w-full flex items-end justify-around relative px-2">
                  
                  {/* Grid guide Lines */}
                  <div className="absolute left-0 right-0 top-1/4 border-t border-dashed border-gray-200 w-full h-0 text-[9px] text-gray-300 font-bold text-left pl-1">
                    ${(maxAmount * 0.75).toFixed(0)}
                  </div>
                  <div className="absolute left-0 right-0 top-2/4 border-t border-dashed border-gray-200 w-full h-0 text-[9px] text-gray-300 font-bold text-left pl-1 animate-pulse flex items-center justify-center">
                    ${(maxAmount * 0.5).toFixed(0)}
                  </div>
                  <div className="absolute left-0 right-[#fff] top-3/4 border-t border-dashed border-gray-200 w-full h-0 text-[9px] text-gray-300 font-bold text-left pl-1">
                    ${(maxAmount * 0.25).toFixed(0)}
                  </div>

                  {chartData.map((item, idx) => {
                    const heightPct = Math.max((item.amount / maxAmount) * 100, 6); // min height so empty bars show a bottom dot
                    return (
                      <div key={idx} className="flex flex-col items-center flex-1 mx-2 group relative z-10">
                        
                        {/* Hover tooltip */}
                        <div className="absolute bg-[#3c3c3c] text-white text-[11px] font-black py-1 px-2.5 rounded-lg -top-10 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-md pointer-events-none border-b-2 border-black">
                          ${item.amount.toFixed(2)}
                        </div>

                        {/* Animated Bar with Duolingo Colors */}
                        <div 
                          className="w-8 md:w-12 bg-[#58cc02] border-b-4 border-[#46a302] hover:bg-[#61e002] transition-all rounded-t-lg shadow-sm"
                          style={{ 
                            height: `${heightPct}%`,
                            animation: `slideUp 0.5s ease-out forwards ${idx * 0.08}s`
                          }}
                        />

                        {/* Day label */}
                        <span className="text-xs font-black text-gray-550 mt-2">
                          {item.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Quick Tips / Missions */}
            <div className="bg-white border-2 border-[#e5e5e5] border-b-[6px] rounded-3xl p-6 flex flex-col justify-between">
              <div className="space-y-4">
                <h4 className="text-lg font-black text-gray-850 flex items-center gap-1.5 pb-2 border-b border-gray-100 uppercase text-xs tracking-wider">
                  ⚡ Misiones Activas ({isGoalReached ? '1' : '0'}/1)
                </h4>
                
                <div className="space-y-3">
                  <div className={`flex items-start gap-2.5 p-3 rounded-2xl border transition-all ${
                    isGoalReached ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-100'
                  }`}>
                    <div className={`p-1.5 rounded-lg border-b-2 text-white ${
                      isGoalReached ? 'bg-[#58cc02] border-[#46a302]' : 'bg-gray-400 border-gray-500'
                    }`}>
                      <Check size={14} strokeWidth={3} />
                    </div>
                    <div>
                      <h5 className={`text-sm font-extrabold ${isGoalReached ? 'text-[#58cc02] line-through' : 'text-gray-700'}`}>
                        ¡Salva el Negocio!
                      </h5>
                      <p className="text-xs text-gray-400 font-bold mt-0.5">
                        Alcanza $${user.dailyGoal} en ventas del día. (+40 XP)
                      </p>
                    </div>
                  </div>

                  <div className={`flex items-start gap-2.5 p-3 rounded-2xl border ${
                    products.length > DEFAULT_PRODUCTS.length ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-100'
                  }`}>
                    <div className={`p-1.5 rounded-lg border-b-2 text-white ${
                      products.length > DEFAULT_PRODUCTS.length ? 'bg-[#58cc02] border-[#46a302]' : 'bg-gray-400 border-gray-500'
                    }`}>
                      <Check size={14} strokeWidth={3} />
                    </div>
                    <div>
                      <h5 className={`text-sm font-extrabold ${products.length > DEFAULT_PRODUCTS.length ? 'text-[#58cc02] line-through' : 'text-gray-700'}`}>
                        Artesano Comercial
                      </h5>
                      <p className="text-xs text-gray-400 font-bold mt-0.5">
                        Registra un nuevo producto personalizado en inventario. (+15 XP)
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onNavigateToSell}
                className="w-full bg-[#1cb0f6] text-white border-b-4 border-[#1899d6] hover:bg-[#32beff] active:border-b-0 active:translate-y-[4px] font-black text-sm py-3 rounded-2xl transition-all tracking-wider text-center uppercase cursor-pointer flex items-center justify-center gap-1 mt-4"
              >
                <Sparkles size={16} /> ¡Comenzar a Vender!
              </button>
            </div>

          </div>
        </div>
      )}

      {activeDashboardTab === 'advanced' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Detailed compliance indexes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Net revenue vs tax liability */}
            <div className="bg-white border-2 border-[#e5e5e5] border-b-[6px] rounded-3xl p-5 flex flex-col justify-between min-h-36">
              <div className="flex justify-between items-center text-xs font-black text-gray-400 uppercase tracking-wide">
                <span>Ventas Netas (Base Imponible)</span>
                <span className="bg-blue-105 text-blue-600 px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-blue-50 border border-blue-200">
                  Libre Impuestos
                </span>
              </div>
              <div className="mt-2 text-2xl font-black text-blue-600 tracking-tight">
                ${advancedMetrics.netAllTime.toFixed(2)}
              </div>
              <p className="text-[10px] text-gray-450 font-bold mt-1 uppercase">
                Base acumulada reportable ({taxConfig.isTaxIncluded ? 'Con IVA Incluido' : 'IVA Adicional'})
              </p>
            </div>

            {/* IVA Collected */}
            <div className="bg-white border-2 border-[#e5e5e5] border-b-[6px] rounded-3xl p-5 flex flex-col justify-between min-h-36">
              <div className="flex justify-between items-center text-xs font-black text-gray-400 uppercase tracking-wide">
                <span>Total {taxConfig.taxName} ({taxConfig.taxRate}%) Recaudado</span>
                <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md text-[9px] font-black uppercase border border-amber-200">
                  Fisco / SAT
                </span>
              </div>
              <div className="mt-2 text-2xl font-black text-amber-500 tracking-tight">
                ${advancedMetrics.taxAllTime.toFixed(2)}
              </div>
              <p className="text-[10px] text-gray-450 font-bold mt-1 uppercase">
                Débito fiscal por liquidar
              </p>
            </div>

            {/* Overall profit margins ratio */}
            <div className="bg-white border-2 border-[#e5e5e5] border-b-[6px] rounded-3xl p-5 flex flex-col justify-between min-h-36 font-sans">
              <div className="flex justify-between items-center text-xs font-black text-gray-400 uppercase tracking-wide">
                <span>Margen Neto (ROI)</span>
                <span className="bg-[#e5f6ff] text-[#1cb0f6] px-2 py-0.5 rounded-md text-[9px] font-black uppercase border border-[#1cb0f6]/20">
                  Tasa Margen
                </span>
              </div>
              <div className="mt-2 text-2xl font-black text-[#58cc02] tracking-tight">
                {((totalProfitAllTime / Math.max(totalSalesAllTime, 1)) * 100).toFixed(1)}%
              </div>
              <p className="text-[10px] text-gray-450 font-bold mt-1 uppercase">
                Retorno de inversión promedio
              </p>
            </div>

          </div>

          {/* SVG Double-Bar Chart: comparison of Income vs warehouse COGS */}
          <div className="bg-white border-2 border-[#e5e5e5] border-b-[6px] rounded-3xl p-5 md:p-6 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-base font-black text-gray-800 uppercase">
                  📊 Margen de Operaciones: Ventas vs Costos de Fábrica
                </h4>
                <p className="text-sm text-gray-400 font-bold">Historial comparativo de los últimos 5 días comerciales</p>
              </div>
              <div className="flex gap-4 text-[10px] font-black uppercase text-gray-500">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[#58cc02]" /> Ventas</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-blue-400" /> Costos</span>
              </div>
            </div>

            {/* SVG implementation */}
            {(() => {
              const doubleChartData = (() => {
                const data = [];
                for (let i = 4; i >= 0; i--) {
                  const d = new Date();
                  d.setDate(d.getDate() - i);
                  const dateStr = d.toISOString().split('T')[0];
                  const daysTx = transactions.filter(t => t.date.startsWith(dateStr));
                  const revenue = daysTx.reduce((sum, t) => sum + t.total, 0);
                  
                  let costValue = 0;
                  daysTx.forEach(t => {
                    t.items.forEach(item => {
                      const prodCost = products.find(p => p.id === item.productId)?.cost || (item.price * 0.4);
                      costValue += prodCost * item.quantity;
                    });
                  });

                  const dayName = d.toLocaleDateString('es-ES', { weekday: 'short' });
                  data.push({
                    label: dayName.charAt(0).toUpperCase() + dayName.slice(1),
                    revenue,
                    cost: costValue
                  });
                }
                return data;
              })();

              const maxVal = Math.max(...doubleChartData.map(c => Math.max(c.revenue, c.cost)), 50);

              return (
                <div className="w-full h-48 bg-gray-55 border border-gray-100 rounded-2xl p-4 flex flex-col justify-end bg-gray-50">
                  <div className="flex-1 w-full flex items-end justify-around relative px-2">
                    
                    {/* Grid labels */}
                    <div className="absolute left-0 right-0 top-1/4 border-t border-dashed border-gray-200 w-full h-0 text-[8px] text-gray-300 font-bold pl-1">
                      ${(maxVal * 0.75).toFixed(0)}
                    </div>
                    <div className="absolute left-0 right-0 top-2/4 border-t border-dashed border-gray-200 w-full h-0 text-[8px] text-gray-300 font-bold pl-1">
                      ${(maxVal * 0.5).toFixed(0)}
                    </div>
                    <div className="absolute left-0 right-0 top-3/4 border-t border-dashed border-gray-200 w-full h-0 text-[8px] text-gray-300 font-bold pl-1">
                      ${(maxVal * 0.25).toFixed(0)}
                    </div>

                    {doubleChartData.map((day, idx) => {
                      const revPct = Math.max((day.revenue / maxVal) * 100, 4);
                      const costPct = Math.max((day.cost / maxVal) * 100, 4);

                      return (
                        <div key={idx} className="flex flex-col items-center flex-1 mx-1.5 group relative z-10">
                          
                          {/* Floating tooltip */}
                          <div className="absolute bg-[#252525] text-white text-[10px] font-black p-2 rounded-xl -top-12 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-md pointer-events-none z-20 border">
                            Vendido: ${day.revenue.toFixed(2)} | Costo: ${day.cost.toFixed(2)}
                          </div>

                          <div className="flex items-end gap-1">
                            {/* Revenue Bar */}
                            <div 
                              className="w-4 sm:w-6 bg-[#58cc02] border-b-2 border-[#439b02] rounded-t-sm"
                              style={{ height: `${revPct}%` }}
                            />
                            {/* Cost Bar */}
                            <div 
                              className="w-4 sm:w-6 bg-blue-400 border-b-2 border-blue-600 rounded-t-sm"
                              style={{ height: `${costPct}%` }}
                            />
                          </div>

                          <span className="text-xs font-black text-gray-400 mt-2">{day.label}</span>
                        </div>
                      );
                    })}

                  </div>
                </div>
              );
            })()}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Category Contributions */}
            <div className="bg-white border-2 border-[#e5e5e5] border-b-[6px] rounded-3xl p-5 md:p-6 space-y-4 lg:col-span-1">
              <h4 className="text-base font-black text-gray-800 uppercase flex items-center gap-1">
                🍕 Aporte por Categoría
              </h4>
              <p className="text-sm text-gray-400 font-bold">Cuota de facturación acumulada</p>

              <div className="space-y-4 pt-1">
                {(() => {
                  const categoriesList = Object.keys(advancedMetrics.categorySales);
                  const totalSum = Object.values(advancedMetrics.categorySales).reduce((a: any, b: any) => Number(a) + Number(b), 0) as number || 1;

                  if (categoriesList.length === 0) {
                    return <p className="text-xs text-gray-405 font-bold py-6 text-center">No hay datos registrados aún.</p>;
                  }

                  return categoriesList.map(cat => {
                    const val = Number(advancedMetrics.categorySales[cat]) || 0;
                    const pct = Math.round((val / totalSum) * 100);
                    const qty = advancedMetrics.categoryQty[cat] || 0;

                    return (
                      <div key={cat} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-black">
                          <span className="text-gray-700">{cat} ({qty} u)</span>
                          <span className="text-gray-500">${val.toFixed(2)} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-gray-150 h-2 rounded-full overflow-hidden bg-gray-105">
                          <div 
                            className="bg-[#1cb0f6] h-full rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Products ranking table */}
            <div className="bg-white border-2 border-[#e5e5e5] border-b-[6px] rounded-3xl p-5 md:p-6 space-y-4 lg:col-span-2">
              <h4 className="text-base font-black text-gray-800 uppercase">
                🏆 Bestsellers (Líderes de Movimiento de Caja)
              </h4>
              
              {advancedMetrics.productsLeaderboard.length === 0 ? (
                <p className="text-xs text-gray-405 font-bold py-10 text-center">
                  Vende artículos para alimentar el leaderboard de racha comercial.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left font-bold text-gray-600">
                    <thead>
                      <tr className="border-b uppercase text-[10px] text-gray-400 font-extrabold pb-2">
                        <th className="pb-2">Artículo</th>
                        <th className="pb-2">Vendidos</th>
                        <th className="pb-2">Ingresos</th>
                        <th className="pb-2 text-right">Ganancia</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {advancedMetrics.productsLeaderboard.slice(0, 5).map((p, idx) => (
                        <tr key={idx} className="hover:bg-gray-55">
                          <td className="py-2.5 flex items-center gap-1.5 text-gray-800">
                            <span>{p.emoji}</span>
                            <span className="truncate max-w-[120px]">{p.name}</span>
                          </td>
                          <td className="py-2.5 text-gray-700">{p.qty} un</td>
                          <td className="py-2.5 text-gray-800">${p.revenue.toFixed(2)}</td>
                          <td className="py-2.5 text-[#58cc02] text-right font-black">
                            +${p.profit.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>

          {/* Goals and solver planner */}
          <div className="bg-amber-50 border-2 border-amber-250 border-b-[6px] rounded-3xl p-5 md:p-6 shadow-xs">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="space-y-1.5 flex-1">
                <span className="text-amber-800 font-black uppercase text-[10px] tracking-wider block">
                  🎯 Proyecciones Comerciales e Inteligencia Financiera
                </span>
                <h3 className="text-lg font-black text-amber-950">Planificador Mensual Solver de Negocios</h3>
                <p className="text-xs text-amber-900 leading-relaxed max-w-xl">
                  Averigua cuántas transacciones generales necesitas concretar para alcanzar una meta mensual de ingresos limpios de fábrica según los tickets promedio ponderados.
                </p>
              </div>

              {/* Input Meta de Retorno */}
              <div className="bg-white border-2 border-amber-200 rounded-2xl p-3 shadow-xs shrink-0 w-full sm:w-auto">
                <span className="text-[9px] font-black uppercase text-amber-800 tracking-wider">Meta Ganancia Limpia</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-base font-black text-amber-950">$</span>
                  <input
                    type="number"
                    step="50"
                    value={monthlyTargetProfit}
                    onChange={(e) => setMonthlyTargetProfit(Math.max(100, Number(e.target.value)))}
                    className="w-24 text-base font-black text-amber-950 bg-amber-50 rounded-lg px-2 py-1 border outline-none text-center border-amber-200"
                  />
                  <span className="text-xs text-gray-400">/ mes</span>
                </div>
              </div>
            </div>

            {/* Calculations and characters suggestions box */}
            <div className="mt-4 pt-4 border-t border-amber-200 flex flex-col sm:flex-row items-center gap-4 text-xs text-amber-900">
              <span className="text-4xl">🦉💬</span>
              <p className="font-extrabold flex-1 text-center sm:text-left leading-relaxed">
                {(() => {
                  const averageProfitPerItem = advancedMetrics.totalItemsCount > 0 
                    ? (totalProfitAllTime / advancedMetrics.totalItemsCount)
                    : 1.50; // default estimated margin
                  
                  const unitsNeeded = Math.ceil(monthlyTargetProfit / Math.max(averageProfitPerItem, 0.5));
                  const averageCartItems = transactions.length > 0 
                    ? (advancedMetrics.totalItemsCount / transactions.length) 
                    : 2.1;
                  
                  const salesNeeded = Math.ceil(unitsNeeded / Math.max(averageCartItems, 1));

                  return (
                    <span>
                      Duo dice: "Para generar <strong className="text-amber-950 font-black">${monthlyTargetProfit} USD</strong> de ganancia pura, estimamos que debes despachar <strong className="text-amber-950 font-black">{unitsNeeded} unidades de mercadería</strong>. Esto equivale a <strong className="text-amber-950 font-black">{salesNeeded} clientes atendidos</strong> en tu mostrador (suponiendo carros promedio de {averageCartItems.toFixed(1)} items). ¡A entrenar esa racha de ventas!"
                    </span>
                  );
                })()}
              </p>
            </div>
          </div>

        </div>
      )}

      {activeDashboardTab === 'copilot' && (
        <div className="space-y-6 animate-fadeIn pb-4">
          
          {/* ASSISTANT CARD HEADER */}
          <div className="bg-gradient-to-r from-purple-500 to-indigo-600 bg-purple-600 text-white rounded-3xl p-6 shadow-sm border-b-[6px] border-purple-800 flex flex-col md:flex-row items-center gap-6 relative overflow-hidden">
            <div className="absolute top-[-50px] right-[-20px] text-white opacity-10 font-bold select-none pointer-events-none text-9xl">🦉</div>
            <div className="text-5xl select-none md:text-6xl animate-bounce">🦉✨</div>
            <div className="space-y-1.5 flex-1 text-center md:text-left">
              <span className="bg-purple-400 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider inline-block">Asistente Ejecutivo Premium</span>
              <h3 className="text-xl md:text-2xl font-black tracking-tight text-white uppercase">Duo Copilot IA Analítico</h3>
              <p className="text-xs text-purple-100 font-semibold leading-relaxed max-w-xl">
                Alimentado de forma segura por el motor de inteligencia de <strong className="text-yellow-300">Gemini 3.5 Flash server-side</strong>. Duo Copilot lee en tiempo real tu volumen de ventas, rotación de inventarios y patrones de turnos para entregarte sugerencias de negocio ágiles y altamente rentables.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* QUICK PRE-SET CHALLENGES PANEL */}
            <div className="bg-white border-2 border-gray-200 border-b-[6px] rounded-3xl p-5 space-y-4 lg:col-span-1">
              <span className="text-[10px] uppercase font-black tracking-wider text-gray-400 block leading-none">Consultas Rápidas</span>
              <h4 className="font-extrabold text-sm text-gray-800 uppercase tracking-tight">Preguntas de Negocio Frecuentes</h4>
              <p className="text-xs text-gray-500 leading-relaxed font-bold uppercase">Haz clic en cualquiera de las consultas para analizar las métricas cargadas en este navegador al instante:</p>
              
              <div className="space-y-3 pt-2">
                {[
                  {
                    id: 'demand',
                    title: '🔮 Predecir Demanda',
                    text: 'Realiza un análisis predictivo de rotación sobre mis productos y dime cuáles se agotarán próximamente basado en la velocidad de ventas.',
                    tag: 'CONSEJO DE STOCK'
                  },
                  {
                    id: 'cross',
                    title: '🛒 Venta Cruzada & Combos',
                    text: 'Sugiéreme promociones cruzadas o combos dinámicos gamificados entre mis productos estrella y los de menor movimiento para vaciar bodega.',
                    tag: 'AUMENTAR TICKET'
                  },
                  {
                    id: 'rota',
                    title: '⚡ Optimización de Turno',
                    text: 'Analiza mis transacciones y dime cuáles son las horas pico aproximadas y cómo capacitar a mis cajeros para que ganen gemas rápidamente.',
                    tag: 'METRICAS DE CAJA'
                  },
                  {
                    id: 'league',
                    title: '🏆 Fidelización y Ligas',
                    text: 'Recomienda desafíos de racha semanales inspirados en Duolingo para que mis clientes aumenten sus puntos de fidelidad y compren más.',
                    tag: 'ESTRATEGIA CLUB'
                  }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      try { playSound('click'); } catch {}
                      setCopilotQuery(item.text);
                      handleCallCopilot(item.text);
                    }}
                    disabled={copilotLoading}
                    className="w-full text-left p-3.5 rounded-2xl border-2 border-gray-150 hover:border-purple-300 hover:bg-purple-105/5 transition-all text-xs space-y-2 group cursor-pointer disabled:opacity-50 block"
                  >
                    <div className="flex justify-between items-center bg-gray-50 group-hover:bg-purple-100/30 px-2 py-1 rounded-md transition-colors border">
                      <span className="font-extrabold text-[#7c3aed] uppercase tracking-wide text-[9px] block">
                        {item.title}
                      </span>
                      <span className="text-[8px] bg-purple-100 text-[#7c3aed] font-black px-1.5 py-0.5 rounded-sm">
                        {item.tag}
                      </span>
                    </div>
                    <p className="text-[10.5px] font-bold text-gray-500 line-clamp-2 leading-relaxed uppercase group-hover:text-purple-950">
                      {item.text}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* RESPONSE WORKSPACE & INTERACTIVE CHAT console */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* INTERACTIVE CHAT INPUT BOX */}
              <div className="bg-white border-2 border-gray-200 border-b-[6px] rounded-3xl p-5 space-y-4">
                <span className="text-[10px] uppercase font-black tracking-wider text-gray-400 block leading-none">Consultar libremente</span>
                <div className="space-y-3">
                  <textarea
                    rows={3}
                    value={copilotQuery}
                    onChange={(e) => setCopilotQuery(e.target.value)}
                    placeholder="Escribe tu consulta empresarial personalizada... Ej: '¿Cómo puedo duplicar las ventas de mi producto estrella?' o 'Hazme un análisis de mis ventas netas totales...'"
                    className="w-full font-bold text-sm bg-gray-50 border-2 border-gray-200 focus:border-purple-500 focus:bg-white focus:outline-hidden p-4 rounded-2xl placeholder:text-gray-400 text-gray-850 transition-all uppercase"
                    disabled={copilotLoading}
                  />
                  <div className="flex justify-end items-center gap-2">
                    <button
                      onClick={() => {
                        try { playSound('click'); } catch {}
                        handleCallCopilot();
                      }}
                      disabled={copilotLoading || !copilotQuery.trim()}
                      className="px-5 py-2.5 bg-purple-600 hover:bg-purple-550 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all border-b-4 border-purple-800 active:border-b-0 active:translate-y-[4px] cursor-pointer disabled:opacity-50"
                    >
                      <Send size={13} /> Ver Diagnóstico Inteligente
                    </button>
                  </div>
                </div>
              </div>

              {/* OUTCOME ANALYSIS LOG */}
              {(copilotLoading || copilotResponse) ? (
                <div className="space-y-4">
                  
                  {/* METRIC SENTINEL STATUS BAR */}
                  <div className="bg-purple-50 border border-purple-200 rounded-2xl px-4 py-2.5 flex items-center justify-between text-[10px] text-purple-900 font-extrabold uppercase">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#7c3aed] animate-ping" />
                      <span>Telemetría de racha empresarial conectada</span>
                    </div>
                    <span>REPORTE DEL TURNO DEL CAJERO: {user.username.toUpperCase()}</span>
                  </div>

                  {copilotLoading && (
                    <div className="bg-slate-900 border border-slate-950 rounded-3xl p-8 flex flex-col items-center justify-center text-center space-y-4 min-h-[300px]">
                      <div className="relative">
                        <div className="absolute inset-0 bg-purple-500 rounded-full blur-xl scale-125 opacity-30 animate-pulse" />
                        <Brain size={48} className="text-[#a855f7] animate-pulse relative" />
                      </div>
                      <div className="space-y-1.5 select-none">
                        <h5 className="font-mono text-xs text-white uppercase tracking-widest animate-pulse">Procesando Métricas en Gemini AI...</h5>
                        <p className="font-mono text-[10.5px] text-purple-400 font-bold uppercase leading-relaxed max-w-sm">
                          Sincronizando volumen de racha y estado de inventario...
                        </p>
                      </div>
                      <div className="w-full max-w-xs bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-700/50">
                        <div className="bg-purple-500 h-full rounded-full w-[65%] animate-pulse" />
                      </div>
                    </div>
                  )}

                  {copilotResponse && !copilotLoading && (
                    <div className="bg-white border-2 border-purple-200 border-b-[6px] rounded-3xl p-5 md:p-6 space-y-5 animate-fadeIn text-slate-850">
                      
                      {/* RESPONSE TITLE AND EXTRAS EXPORT */}
                      <div className="border-b pb-3 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">💡</span>
                          <div>
                            <h4 className="font-black text-sm text-purple-950 uppercase leading-none">Análisis Duo Copilot</h4>
                            <p className="text-[8.5px] text-purple-400 font-extrabold uppercase mt-1 leading-none">Firma Digital Verificada con +25 XP Recibidos</p>
                          </div>
                        </div>
                        <span className="bg-purple-50 border border-purple-200/50 text-[#7c3aed] text-[9.5px] font-black uppercase px-2 py-0.5 rounded-lg select-none">
                          Consumido: Server API
                        </span>
                      </div>

                      {/* RESPONSIVE RAW TEXT/MARKDOWN FORMATTER */}
                      <div className="text-xs leading-relaxed space-y-4 whitespace-pre-wrap font-sans text-gray-700 font-bold uppercase text-[10.5px]">
                        {copilotResponse.split('\n').map((line, idx) => {
                          const trim = line.trim();
                          
                          // Convert header markings nicely
                          if (trim.startsWith('###')) {
                            return <h5 key={idx} className="text-[11px] font-black text-slate-900 uppercase pt-2 tracking-tight flex items-center gap-1.5">{trim.replace('###', '')}</h5>;
                          } else if (trim.startsWith('##')) {
                            return <h4 key={idx} className="text-[12px] font-black text-purple-950 uppercase pt-3 pb-1 border-b border-gray-100 tracking-tight flex items-center gap-1.5">{trim.replace('##', '')}</h4>;
                          } else if (trim.startsWith('1.') || trim.match(/^\d+\./)) {
                            return <div key={idx} className="bg-slate-50 border-2 border-gray-150 p-4 rounded-xl mt-2 font-bold text-gray-850 uppercase text-[10.5px] tracking-tight">{line}</div>;
                          } else if (trim.startsWith('-') || trim.startsWith('✓')) {
                            return <p key={idx} className="pl-4 text-gray-600 font-bold flex items-start gap-1.5 text-[10px] leading-relaxed uppercase"><span className="text-purple-500">❖</span> {trim.replace(/^[-✓]/, '').trim()}</p>;
                          } else if (trim.length === 0) {
                            return <div key={idx} className="h-1" />;
                          }
                          
                          return <p key={idx} className="indent-0 text-slate-700">{line}</p>;
                        })}
                      </div>

                      {/* CONGRATULATIONS CONSOLE NOTICE */}
                      <div className="bg-[#e5f6ff] text-[#155375] border border-blue-200 rounded-2xl p-4 flex gap-3 text-xs font-bold items-center">
                        <span className="text-xl">🦉🎯</span>
                        <div className="flex-1 space-y-0.5">
                          <p className="uppercase text-[10.5px] font-black text-[#155375]">¡Misión Inteligente Completada!</p>
                          <p className="text-gray-500 uppercase text-[9px] leading-relaxed">Has recibido <span className="text-purple-700 font-black">+25 de XP corporativo</span> de racha empresarial por consultar a Duo Copilot para mejorar tu tienda.</p>
                        </div>
                      </div>

                    </div>
                  )}

                </div>
              ) : (
                <div className="bg-white border-2 border-dashed border-gray-250 rounded-3xl p-8 flex flex-col items-center justify-center text-center space-y-3 min-h-[300px]">
                  <HelpCircle size={40} className="text-gray-300" />
                  <div className="space-y-1 select-none">
                    <h5 className="font-extrabold text-sm text-gray-750 uppercase">Esperando Consulta Empresarial</h5>
                    <p className="text-[10px] text-gray-400 font-bold leading-normal uppercase max-w-sm">
                      Elige una consulta rápida en el panel de la izquierda o escribe una pregunta libre en el cuadro superior para recibir insights de calibre mundial.
                    </p>
                  </div>
                </div>
              )}

            </div>

          </div>

        </div>
      )}
      <div className="bg-white border-2 border-[#e5e5e5] border-b-[6px] rounded-3xl p-5 md:p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1.5 max-w-xl">
          <h4 className="text-base font-black text-gray-800 uppercase flex items-center gap-1.5">
            💾 Copia de Seguridad y Portabilidad de Datos (Soporte Multi-dispositivo)
          </h4>
          <p className="text-xs text-gray-500 font-bold leading-normal">
            Lleva tu tienda de un dispositivo a otro de verdad y sin simulaciones. Genera un archivo con todo tu inventario, racha actual, nivel de XP y registros históricos de ventas para restaurarla en cualquier navegador o celular.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 w-full md:w-auto shrink-0 justify-end">
          {/* Real Database File Import Trigger */}
          <label className="bg-white text-gray-600 border-2 border-gray-200 border-b-4 hover:bg-gray-50 active:translate-y-[2px] active:border-b-2 py-3.5 px-6 rounded-2xl font-black text-xs uppercase cursor-pointer flex items-center gap-2 tracking-wider transition-all">
            <Upload size={14} /> Restaurar Copia (.json)
            <input 
              type="file" 
              accept=".json" 
              onChange={handleImportDB} 
              className="hidden" 
            />
          </label>

          <button
            onClick={handleExportDB}
            className="bg-[#58cc02] text-white border-b-4 border-[#46a302] hover:bg-[#61e002] active:border-b-0 active:translate-y-[4px] py-3.5 px-6 rounded-2xl font-black text-xs uppercase cursor-pointer flex items-center gap-2 tracking-wider transition-all"
          >
            <Download size={14} /> Respaldar Todo
          </button>
        </div>
      </div>

    </div>
  );
}
