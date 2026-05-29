import React from 'react';
import { Transaction, Product, User } from '../../../types';
import { DEFAULT_PRODUCTS } from '../../../initialData';
import { Check, Sparkles } from 'lucide-react';
import { playSound } from '../../../services/sounds';

interface SalesChartCardProps {
  transactions: Transaction[];
  products: Product[];
  user: User;
  onNavigateToSell: () => void;
}

export default function SalesChartCard({ transactions, products, user, onNavigateToSell }: SalesChartCardProps) {
  // Compute stats for TODAY
  const todayStr = new Date().toISOString().split('T')[0];
  const todayTransactions = transactions.filter((t) => t.date.startsWith(todayStr));
  const todaySalesSum = todayTransactions.reduce((acc, curr) => acc + curr.total, 0);
  const isGoalReached = todaySalesSum >= user.dailyGoal;

  // Generate dynamic stats for the past 5 days
  const getPastDaysData = () => {
    const data = [];
    for (let i = 4; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const salesForDay = transactions.filter((t) => t.date.startsWith(dateStr)).reduce((sum, t) => sum + t.total, 0);

      const dayName = d.toLocaleDateString('es-ES', { weekday: 'short' });
      data.push({ label: dayName.charAt(0).toUpperCase() + dayName.slice(1), amount: salesForDay });
    }
    return data;
  };

  const chartData = getPastDaysData();
  const maxAmount = Math.max(...chartData.map((c) => c.amount), 50); // scale reference

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
      {/* Weekly Chart Card */}
      <div className="bg-white border-2 border-[#e5e5e5] border-b-[6px] rounded-3xl p-6 shadow-sm lg:col-span-2 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-black text-gray-800">Historial de Facturación</h3>
            <p className="text-xs text-gray-400 font-bold">Últimos 5 días hábiles de la tienda</p>
          </div>
          <span className="text-xs font-black bg-gray-100 text-gray-600 px-3 py-1 rounded-full uppercase border">
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
            <div className="absolute left-0 right-0 top-2/4 border-t border-dashed border-gray-200 w-full h-0 text-[9px] text-gray-300 font-bold text-left pl-1 flex items-center justify-center">
              ${(maxAmount * 0.5).toFixed(0)}
            </div>
            <div className="absolute left-0 right-0 top-3/4 border-t border-dashed border-gray-200 w-full h-0 text-[9px] text-gray-300 font-bold text-left pl-1">
              ${(maxAmount * 0.25).toFixed(0)}
            </div>

            {chartData.map((item, idx) => {
              const heightPct = Math.max((item.amount / maxAmount) * 100, 6);
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
                    }}
                  />

                  {/* Day label */}
                  <span className="text-xs font-black text-gray-500 mt-2">{item.label}</span>
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
            <div
              className={`flex items-start gap-2.5 p-3 rounded-2xl border transition-all ${
                isGoalReached ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-100'
              }`}
            >
              <div
                className={`p-1.5 rounded-lg border-b-2 text-white ${
                  isGoalReached ? 'bg-[#58cc02] border-[#46a302]' : 'bg-gray-400 border-gray-555'
                }`}
              >
                <Check size={14} strokeWidth={3} />
              </div>
              <div className="text-left">
                <h5
                  className={`text-sm font-extrabold ${isGoalReached ? 'text-[#58cc02] line-through' : 'text-gray-700'}`}
                >
                  ¡Salva el Negocio!
                </h5>
                <p className="text-xs text-gray-400 font-bold mt-0.5">
                  Alcanza $${user.dailyGoal} en ventas del día. (+40 XP)
                </p>
              </div>
            </div>

            <div
              className={`flex items-start gap-2.5 p-3 rounded-2xl border transition-all ${
                products.length > DEFAULT_PRODUCTS.length
                  ? 'bg-green-50 border-green-200'
                  : 'bg-gray-50 border-gray-100'
              }`}
            >
              <div
                className={`p-1.5 rounded-lg border-b-2 text-white ${
                  products.length > DEFAULT_PRODUCTS.length
                    ? 'bg-[#58cc02] border-[#46a302]'
                    : 'bg-gray-400 border-gray-555'
                }`}
              >
                <Check size={14} strokeWidth={3} />
              </div>
              <div className="text-left">
                <h5
                  className={`text-sm font-extrabold ${products.length > DEFAULT_PRODUCTS.length ? 'text-[#58cc02] line-through' : 'text-gray-700'}`}
                >
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
          onClick={() => {
            playSound('click');
            onNavigateToSell();
          }}
          className="w-full bg-[#1cb0f6] text-white border-b-4 border-[#1899d6] hover:bg-[#32beff] active:border-b-0 active:translate-y-[4px] font-black text-sm py-3 rounded-2xl transition-all tracking-wider text-center uppercase cursor-pointer flex items-center justify-center gap-1 mt-4"
        >
          <Sparkles size={16} /> ¡Comenzar a Vender!
        </button>
      </div>
    </div>
  );
}
