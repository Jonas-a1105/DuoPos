/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { User, Transaction, Product } from '../../types';
import { DUO_CHARACTERS } from '../../initialData';
import { playSound } from '../../services/sounds';
import { Award, Flame, MessageSquare, Download, Upload } from 'lucide-react';
import { setLocalData } from '../../services/supabaseSync';
import { toast } from '../../components/Modal/FlashNotifications';

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
      {/* 1. Header Banner: Hero Streak & XP indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Shift Stats & Active Performance Card */}
        <div className="duo-theme-card p-5 flex items-center gap-4 bg-gradient-to-tr from-sky-50 to-blue-50/50 dark:from-sky-950/20 dark:to-blue-950/10 border-2 border-sky-100 dark:border-sky-900">
          <div className="bg-gradient-to-tr from-sky-400 to-blue-500 p-2.5 rounded-2xl shadow-sm border border-sky-300 text-white flex-shrink-0 select-none text-3xl animate-pulse">
            ⏱️
          </div>
          <div className="flex-1 min-w-0 text-left">
            <span className="text-[10px] font-black uppercase tracking-wider text-sky-600 dark:text-sky-400 block leading-none">
              Mi Turno Activo
            </span>
            <div className="mt-1.5 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-gray-800 dark:text-gray-100 font-mono">
                {todayTransactions.length}
              </span>
              <span className="text-xs font-bold text-gray-400">ventas hoy</span>
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-sm font-black text-[#58cc02] font-mono">
                +{todayTransactions.reduce((acc, t) => acc + (t.xpGained || 0), 0)} XP
              </span>
              <span className="text-[9px] font-bold text-gray-450 uppercase leading-none">ganados hoy</span>
            </div>
          </div>
        </div>

        {/* Experience Points Progression Bar */}
        <div className="duo-theme-card p-5 flex flex-col justify-center space-y-2">
          <div className="flex justify-between items-center text-sm font-black">
            <span className="flex items-center gap-1" style={{ color: 'var(--duo-primary)' }}>
              <Award size={18} /> Puntos de Experiencia (XP)
            </span>
            <span style={{ color: 'var(--duo-text-muted)' }}>
              {user.xp} / {xpNeededForNextLevel} XP
            </span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-zinc-800 h-4 rounded-full p-[2px] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${xpPct}%`, backgroundColor: 'var(--duo-progress-bar)' }}
            />
          </div>
          <p
            className="text-[10px] font-black tracking-wide uppercase text-right"
            style={{ color: 'var(--duo-text-muted)' }}
          >
            ¡Haz ventas o agrega inventario para subir de nivel!
          </p>
        </div>

        {/* Sales Streak Indicator */}
        <div className="duo-theme-card p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-orange-100 dark:bg-orange-950/40 p-2.5 rounded-2xl border border-orange-200 dark:border-orange-900 text-orange-500 flex-shrink-0 animate-pulse">
              <Flame size={28} fill="currentColor" />
            </div>
            <div>
              <span className="text-2xl font-black text-orange-500 block">
                {user.streak} {user.streak === 1 ? 'Día de Racha' : 'Días de Racha'}
              </span>
              <p className="text-xs font-bold" style={{ color: 'var(--duo-text-muted)' }}>
                {isGoalReached ? '¡Racha asegurada para hoy! 🎉' : '¡Factura hoy para proteger tu racha!'}
              </p>
            </div>
          </div>
          <div className="text-3xl select-none">🔥</div>
        </div>
      </div>

      {/* 2. Interactive Character Bubble (Aero - Virtual Assistant) */}
      <div className="w-full flex items-start gap-4 duo-theme-card p-5 md:p-6 shadow-sm">
        <div className="text-7xl select-none transform hover:scale-115 active:-rotate-12 duration-200 flex-shrink-0 relative">
          🦉💼
        </div>
        <div
          className="flex-1 relative border rounded-2xl py-4 px-5 text-base font-bold text-left"
          style={{ backgroundColor: 'var(--duo-bg)', borderColor: 'var(--duo-card-border)', color: 'var(--duo-text)' }}
        >
          {/* Triangular pointer */}
          <div
            className="absolute left-[-8px] top-6 w-0 h-0 border-t-8 border-t-transparent border-r-8 border-b-8 border-b-transparent"
            style={{ borderRightColor: 'var(--duo-bg)' }}
          />
          <div
            className="absolute left-[-9px] top-6 w-0 h-0 border-t-8 border-t-transparent border-r-8 border-b-8 border-b-transparent -z-10"
            style={{ borderRightColor: 'var(--duo-card-border)' }}
          />

          <div className="flex justify-between items-center mb-1.5 text-left">
            <span
              className="text-xs uppercase tracking-wider font-black animate-pulse"
              style={{ color: 'var(--duo-primary)' }}
            >
              Aero • Mentor de Inteligencia Financiera
            </span>
            <span
              className="text-xs flex items-center gap-1 font-extrabold px-2 py-0.5 rounded-full shadow-xs border"
              style={{
                backgroundColor: 'var(--duo-card-bg)',
                borderColor: 'var(--duo-card-border)',
                color: 'var(--duo-text-muted)',
              }}
            >
              <MessageSquare size={12} /> Asesoría en Turno
            </span>
          </div>

          <p className="leading-relaxed font-extrabold pr-2 text-left">
            {isGoalReached
              ? `¡ESPECTACULAR! Hemos alcanzado el objetivo de ventas de hoy ($${todaySalesSum.toFixed(2)} / $${user.dailyGoal.toFixed(2)}). ¡Has salvado la racha familiar y ganado bonificaciones extra!`
              : `Llevamos $${todaySalesSum.toFixed(2)} facturados hoy en ${todayTransactions.length} ventas. Nos faltan $${Math.max(0, user.dailyGoal - todaySalesSum).toFixed(2)} para completar la meta de $${user.dailyGoal}. ¡Sigue adelante con tu racha contable para impresionar al club!`}
          </p>
        </div>
      </div>

      {/* 3. Daily sales target progress bar & Goal Adjustment */}
      <div className="duo-theme-card p-6 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        <div className="md:col-span-2 space-y-3">
          <div className="flex justify-between items-end">
            <div>
              <h3 className="text-xl font-extrabold" style={{ color: 'var(--duo-text)' }}>
                Objetivo de Ventas del Día
              </h3>
              <p className="text-xs font-extrabold uppercase mt-0.5" style={{ color: 'var(--duo-text-muted)' }}>
                Meta actual: <span style={{ color: 'var(--duo-text)' }}>${user.dailyGoal} USD</span>
              </p>
            </div>
            <span className="text-lg font-black" style={{ color: 'var(--duo-primary)' }}>
              {pctGoal}% completado
            </span>
          </div>

          {/* Large custom progress tracker with star award at the end */}
          <div className="relative pt-1">
            <div className="w-full bg-gray-100 dark:bg-zinc-800 h-8 rounded-2xl p-1 overflow-hidden relative border border-gray-200 dark:border-zinc-700 shadow-inner flex items-center">
              <div
                className="h-full rounded-xl transition-all duration-500 border-b-4 flex items-center justify-end pr-2 overflow-hidden"
                style={{
                  width: `${pctGoal}%`,
                  backgroundColor: 'var(--duo-primary)',
                  borderBottomColor: 'var(--duo-primary-dark)',
                }}
              >
                {pctGoal > 15 && (
                  <span className="text-white text-[10px] font-black tracking-widest uppercase animate-pulse">
                    ¡VAMOS POR MÁS!
                  </span>
                )}
              </div>

              {/* Star flag icon at the end */}
              <div
                className={`absolute right-3 text-lg transition-transform ${isGoalReached ? 'scale-125 duration-300 text-yellow-400 animate-bounce' : 'text-gray-300'}`}
              >
                ⭐
              </div>
            </div>
          </div>
        </div>

        {/* Goal edit controls */}
        {user.role === 'admin' ? (
          <div className="bg-gray-50 dark:bg-zinc-900/60 border border-[var(--duo-card-border)] rounded-2xl p-4 flex flex-col justify-between space-y-2">
            <span className="text-xs font-black uppercase text-gray-500 block text-center">
              Ajustar Meta del Día (Admin)
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
            <span className="text-xs font-black uppercase text-gray-400">Meta Diaria</span>
            <span className="text-2xl font-black" style={{ color: 'var(--duo-text)' }}>
              ${user.dailyGoal} USD
            </span>
            <span className="text-[9px] uppercase font-bold" style={{ color: 'var(--duo-text-muted)' }}>
              Bloqueado por Administrador
            </span>
          </div>
        )}
      </div>

      {/* META COOPERATIVA DE SUCURSAL */}
      {(() => {
        const branchSalesGoal = 500;
        const simulatedOtherSales = 285.5;
        const totalBranchSales = todaySalesSum + simulatedOtherSales;
        const branchPct = Math.min(Math.round((totalBranchSales / branchSalesGoal) * 100), 100);
        const isBranchGoalReached = totalBranchSales >= branchSalesGoal;

        const claimedDate = localStorage.getItem('duo_pos_branch_reward_claimed_date') || '';
        const isClaimedToday = claimedDate === todayStr;

        const handleClaimBranchReward = () => {
          if (!isBranchGoalReached || isClaimedToday) return;
          try {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContext) {
              const ctx = new AudioContext();
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.frequency.setValueAtTime(800, ctx.currentTime);
              gain.gain.setValueAtTime(0.1, ctx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
              osc.start();
              osc.stop(ctx.currentTime + 0.3);
            }
          } catch {}

          localStorage.setItem('duo_pos_branch_reward_claimed_date', todayStr);

          if (onUpdateUser) {
            const updatedUser = {
              ...user,
              gems: (user.gems ?? 40) + 50,
              gemsEarnedTotal: (user.gemsEarnedTotal ?? 40) + 50,
            };
            onUpdateUser(updatedUser);
            toast.success(
              '¡Excelente! Has reclamado el Bono de Trabajo en Equipo de la Sucursal: +50 Gemas 💎. ¡Felicidades a todo el equipo!',
            );
          }
        };

        return (
          <div className="duo-theme-card p-6 shadow-sm border-2 border-indigo-200 dark:border-indigo-900 border-b-[8px] rounded-3xl grid grid-cols-1 lg:grid-cols-3 gap-6 items-center animate-scaleUp">
            <div className="lg:col-span-2 space-y-3">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2">
                <div className="text-left">
                  <h3 className="text-xl font-black text-indigo-950 dark:text-indigo-100 flex flex-wrap items-center gap-2">
                    👥 Meta Cooperativa de Sucursal
                    <span className="text-indigo-600 dark:text-indigo-400 animate-pulse text-sm font-black px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-150 dark:border-indigo-900 rounded-full">
                      ¡En Vivo! 🤝
                    </span>
                  </h3>
                  <p className="text-xs font-extrabold uppercase mt-0.5 text-indigo-500 dark:text-indigo-400">
                    Suma grupal de la sucursal activa • Meta:{' '}
                    <span className="font-black text-indigo-950 dark:text-indigo-200">${branchSalesGoal} USD</span>
                  </p>
                </div>
                <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">{branchPct}% completado</span>
              </div>
 
              {/* Progress bar */}
              <div className="relative pt-1">
                <div className="w-full bg-indigo-55 dark:bg-zinc-800 h-8 rounded-2xl p-1 overflow-hidden relative border border-indigo-150 dark:border-zinc-700 shadow-inner flex items-center">
                  <div
                    className="h-full rounded-xl transition-all duration-500 border-b-4 flex items-center justify-end pr-2 overflow-hidden bg-gradient-to-r from-indigo-500 to-[#8c52ff]"
                    style={{
                      width: `${branchPct}%`,
                      borderBottomColor: '#6c22ff',
                    }}
                  >
                    {branchPct > 20 && (
                      <span className="text-white text-[10px] font-black tracking-widest uppercase animate-pulse">
                        ¡UNIDOS SOMOS IMPARABLES!
                      </span>
                    )}
                  </div>
                  <div
                    className={`absolute right-3 text-lg transition-transform ${isBranchGoalReached ? 'scale-125 duration-300 text-yellow-400 animate-bounce' : 'text-gray-300'}`}
                  >
                    🎁
                  </div>
                </div>
              </div>
 
              {/* Cashiers Contribution breakdown */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs font-extrabold text-gray-500 dark:text-gray-400 pt-1">
                <span className="w-full sm:w-auto text-left">Contribuyentes hoy:</span>
                <span className="bg-green-50 dark:bg-green-950/20 border border-green-150 dark:border-green-900/40 text-[#1cb0f6] dark:text-sky-400 px-2 py-0.5 rounded-lg flex items-center gap-1">
                  🦉 {user.username} (Tú): <strong className="text-gray-700 dark:text-gray-200">${todaySalesSum.toFixed(2)}</strong>
                </span>
                <span className="bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 text-indigo-650 dark:text-indigo-300 px-2 py-0.5 rounded-lg">
                  👧 Zari: <strong className="text-gray-700 dark:text-gray-200">$125.00</strong>
                </span>
                <span className="bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 text-indigo-650 dark:text-indigo-300 px-2 py-0.5 rounded-lg">
                  🏃‍♂️ Eddy: <strong className="text-gray-700 dark:text-gray-200">$95.50</strong>
                </span>
                <span className="bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 text-indigo-650 dark:text-indigo-300 px-2 py-0.5 rounded-lg">
                  👦 Junior: <strong className="text-gray-700 dark:text-gray-200">$65.00</strong>
                </span>
              </div>
            </div>
 
            {/* Reward claim panel */}
            <div className="bg-indigo-50/50 dark:bg-zinc-900/60 border border-indigo-150 dark:border-zinc-800 rounded-2xl p-4 flex flex-col justify-center items-center text-center space-y-3 h-full">
              <span className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-400">Bono Grupal de Sucursal</span>

              {isClaimedToday ? (
                <div className="space-y-1">
                  <span className="text-green-600 text-sm font-black flex items-center gap-1 justify-center">
                    ✅ Reclamado Hoy
                  </span>
                  <span className="text-[10px] text-gray-400 font-bold block">
                    ¡Vuelve mañana para colaborar de nuevo!
                  </span>
                </div>
              ) : isBranchGoalReached ? (
                <button
                  type="button"
                  onClick={handleClaimBranchReward}
                  className="w-full duo-theme-btn-primary bg-indigo-600 border-indigo-700 hover:bg-indigo-700 hover:border-indigo-800 text-white py-2 px-3 rounded-xl font-black text-xs transition-all cursor-pointer transform hover:scale-105 active:scale-95 animate-pulse shadow-md"
                >
                  Reclamar Bono 💎 +50G
                </button>
              ) : (
                <div className="space-y-1">
                  <span className="text-gray-400 text-xs font-bold block">
                    Faltan{' '}
                    <strong className="text-indigo-600">
                      ${Math.max(0, branchSalesGoal - totalBranchSales).toFixed(2)} USD
                    </strong>{' '}
                    en conjunto para desbloquear la recompensa grupal diaria.
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })()}

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
