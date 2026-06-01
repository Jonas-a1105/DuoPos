/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { User, Transaction, Product } from '../../types';
import { DUO_CHARACTERS } from '../../initialData';
import { playSound } from '../../services/audio/soundService';
import { Award, Flame, MessageSquare, Download, Upload } from 'lucide-react';
import { setLocalData } from '../../database/supabaseSync';
import { toast } from '../../shared/ui/FlashNotifications/FlashNotifications';

// Subcomponents imports
import BentoStats from './components/BentoStats';
import SalesChartCard from './components/SalesChartCard';
import AdvancedAnalyticsTab from './components/AdvancedAnalyticsTab';
import DuoCopilotTab from './components/DuoCopilotTab';

interface DashboardScreenProps {
  user: User;
  transactions: Transaction[];
  products: Product[];
  onSetNewGoal: (goal: number) => void;
  onNavigateToSell: () => void;
  onGrantXp?: (amount: number) => void;
  onUpdateUser?: (updatedUser: User) => void;
}

export default function DashboardScreen({
  user,
  transactions,
  products,
  onSetNewGoal,
  onNavigateToSell,
  onGrantXp,
  onUpdateUser,
}: DashboardScreenProps) {
  const activeChar = DUO_CHARACTERS[user.avatar] || DUO_CHARACTERS.duo;

  const [activeDashboardTab, setActiveDashboardTab] = useState<'overview' | 'advanced' | 'copilot'>('overview');

  // Compute stats for TODAY
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const todayTransactions = useMemo(
    () => transactions.filter((t) => t.date.startsWith(todayStr)),
    [transactions, todayStr],
  );
  const todaySalesSum = useMemo(
    () => todayTransactions.reduce((acc, curr) => acc + curr.total, 0),
    [todayTransactions],
  );
  const isGoalReached = todaySalesSum >= user.dailyGoal;

  const pctGoal = useMemo(
    () => Math.min(Math.round((todaySalesSum / user.dailyGoal) * 100), 100),
    [todaySalesSum, user.dailyGoal],
  );
  const xpNeededForNextLevel = user.level * 100;
  const xpPct = Math.min((user.xp / xpNeededForNextLevel) * 100, 100);

  return (
    <div className="space-y-6 md:space-y-8 animate-fadeIn font-sans pb-10 text-left">
      {/* 1. Header Banner: Professional Business Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Today's Sales Card */}
        <div className="duo-theme-card p-5 flex items-center gap-4 bg-gradient-to-tr from-emerald-50 to-green-50/50 dark:from-emerald-950/20 dark:to-green-950/10 border-2 border-emerald-100 dark:border-emerald-900">
          <div className="bg-gradient-to-tr from-emerald-400 to-green-500 p-2.5 rounded-2xl shadow-sm border border-emerald-300 text-white flex-shrink-0 select-none text-2xl">
            💵
          </div>
          <div className="flex-1 min-w-0 text-left">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block leading-none">
              Facturación de Hoy
            </span>
            <div className="mt-1.5 flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-gray-800 dark:text-gray-100 font-mono">
                ${todaySalesSum.toFixed(2)}
              </span>
              <span className="text-xs font-bold text-gray-400">USD</span>
            </div>
            <span className="text-[9px] font-bold text-gray-450 uppercase leading-none block mt-1">Total recaudado en caja</span>
          </div>
        </div>

        {/* Today's Transactions Card */}
        <div className="duo-theme-card p-5 flex items-center gap-4 bg-gradient-to-tr from-sky-50 to-blue-50/50 dark:from-sky-950/20 dark:to-blue-950/10 border-2 border-sky-100 dark:border-sky-900">
          <div className="bg-gradient-to-tr from-sky-400 to-blue-500 p-2.5 rounded-2xl shadow-sm border border-sky-300 text-white flex-shrink-0 select-none text-2xl">
            📝
          </div>
          <div className="flex-1 min-w-0 text-left">
            <span className="text-[10px] font-black uppercase tracking-wider text-sky-600 dark:text-sky-400 block leading-none">
              Transacciones del Turno
            </span>
            <div className="mt-1.5 flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-gray-800 dark:text-gray-100 font-mono">
                {todayTransactions.length}
              </span>
              <span className="text-xs font-bold text-gray-400">ventas hoy</span>
            </div>
            <span className="text-[9px] font-bold text-gray-450 uppercase leading-none block mt-1">Comprobantes emitidos</span>
          </div>
        </div>

        {/* Low Stock Alerts Card */}
        <div className="duo-theme-card p-5 flex items-center gap-4 bg-gradient-to-tr from-rose-50 to-red-50/50 dark:from-rose-950/20 dark:to-red-950/10 border-2 border-rose-100 dark:border-rose-900">
          <div className="bg-gradient-to-tr from-rose-400 to-red-500 p-2.5 rounded-2xl shadow-sm border border-rose-300 text-white flex-shrink-0 select-none text-2xl">
            ⚠️
          </div>
          <div className="flex-1 min-w-0 text-left">
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 block leading-none">
              Alertas de Inventario
            </span>
            <div className="mt-1.5 flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-gray-800 dark:text-gray-100 font-mono">
                {products.filter(p => p.stock <= (p.minStock ?? 5)).length}
              </span>
              <span className="text-xs font-bold text-gray-400">ítems críticos</span>
            </div>
            <span className="text-[9px] font-bold text-gray-450 uppercase leading-none block mt-1">Con stock bajo o nulo</span>
          </div>
        </div>
      </div>

      {/* 2. Interactive Character Bubble (Aero - Virtual Assistant) */}
      {/* 2. Daily sales target progress bar & Goal Adjustment */}
      <div className="duo-theme-card p-6 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        <div className="md:col-span-2 space-y-3">
          <div className="flex justify-between items-end">
            <div>
              <h3 className="text-xl font-extrabold" style={{ color: 'var(--duo-text)' }}>
                Meta Diaria de Facturación
              </h3>
              <p className="text-xs font-bold uppercase mt-0.5" style={{ color: 'var(--duo-text-muted)' }}>
                Objetivo de la Sucursal: <span style={{ color: 'var(--duo-text)' }}>${user.dailyGoal} USD</span>
              </p>
            </div>
            <span className="text-lg font-black" style={{ color: 'var(--duo-primary)' }}>
              {pctGoal}% completado
            </span>
          </div>

          <div className="relative pt-1">
            <div className="w-full bg-gray-150 dark:bg-zinc-800 h-6 rounded-xl p-0.5 overflow-hidden relative border border-gray-250 dark:border-zinc-700 shadow-inner flex items-center">
              <div
                className="h-full rounded-lg transition-all duration-500 flex items-center justify-end pr-2 overflow-hidden bg-gradient-to-r from-emerald-500 to-green-600"
                style={{
                  width: `${pctGoal}%`,
                }}
              >
              </div>
            </div>
          </div>
        </div>

        {/* Goal edit controls */}
        {user.role === 'admin' ? (
          <div className="bg-gray-50 dark:bg-zinc-900/60 border border-[var(--duo-card-border)] rounded-2xl p-4 flex flex-col justify-between space-y-2">
            <span className="text-xs font-black uppercase text-gray-500 block text-center">
              Ajustar Meta Diaria (Admin)
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {[100, 150, 300].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => onSetNewGoal(val)}
                  className={`py-1.5 px-1 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                    user.dailyGoal === val ? 'duo-theme-btn-primary scale-105' : 'duo-theme-btn-secondary'
                  }`}
                >
                  ${val}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 dark:bg-zinc-900/60 border border-[var(--duo-card-border)] rounded-2xl p-4 flex flex-col justify-center items-center text-center space-y-1">
            <span className="text-xs font-black uppercase text-gray-450">Meta Registrada</span>
            <span className="text-2xl font-black text-slate-800 dark:text-zinc-100">
              ${user.dailyGoal} USD
            </span>
            <span className="text-[9px] uppercase font-bold text-gray-400">
              Bloqueado por Restricción de Rol
            </span>
          </div>
        )}
      </div>

      {/* Tab Switcher */}
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
          General 📈
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
          Analíticas Avanzadas 📊
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
          Copilot IA 🧠
          <span className="bg-purple-100 text-purple-600 border border-purple-200 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase leading-none">
            NUEVO
          </span>
        </button>
      </div>

      {/* CORE VIEWPORTS TAB RENDERING */}
      {activeDashboardTab === 'overview' && (
        <div className="space-y-6 md:space-y-8">
          <BentoStats transactions={transactions} products={products} />
          <SalesChartCard
            transactions={transactions}
            products={products}
            user={user}
            onNavigateToSell={onNavigateToSell}
          />
        </div>
      )}

      {activeDashboardTab === 'advanced' && (
        <AdvancedAnalyticsTab transactions={transactions} products={products} user={user} />
      )}

      {activeDashboardTab === 'copilot' && (
        <DuoCopilotTab user={user} transactions={transactions} products={products} onGrantXp={onGrantXp} />
      )}
    </div>
  );
}
