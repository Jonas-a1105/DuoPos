import React, { useState } from 'react';
import { useUserStore } from '../../stores/useUserStore';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { ErrorBoundary } from '../../shared/ui';

interface MainLayoutProps {
  children: React.ReactNode;
  isMuted: boolean;
  toggleMute: () => void;
  onOpenHardwareHub: () => void;
  onSync: (showToast?: boolean) => Promise<void>;
  isSyncing: boolean;
  lastSyncTime: string | null;
}

function getSkinThemeClasses(skin?: string) {
  switch (skin) {
    case 'dark-galaxy':
      return {
        outer: 'bg-slate-950 text-slate-100 selection:bg-purple-600 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950 via-slate-950 to-slate-950',
        card: 'bg-indigo-950/20 border-violet-950/60 shadow-[0_0_15px_rgba(110,68,255,0.06)] backdrop-blur-xs text-slate-100',
        sidebarActive: 'bg-indigo-950/40 border-violet-500 border-2 border-b-4 text-violet-400 font-extrabold shadow-[0_0_12px_rgba(139,92,246,0.2)]',
        accentText: 'text-violet-450',
        logoText: 'text-violet-400',
      };
    case 'neon-cyberpunk':
      return {
        outer: 'bg-[#09090b] text-cyan-400 selection:bg-pink-500 font-mono',
        card: 'bg-black border-pink-500/30 shadow-[0_0_20px_rgba(244,63,94,0.12)] text-cyan-300',
        sidebarActive: 'bg-zinc-900/50 border-cyan-400 border-2 border-b-4 text-cyan-405 uppercase font-black shadow-[0_0_10px_rgba(34,211,238,0.25)]',
        accentText: 'text-pink-550',
        logoText: 'text-cyan-450 font-black',
      };
    case 'emerald-palace':
      return {
        outer: 'bg-[#0b2417] text-amber-100 selection:bg-yellow-500 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-[#072517] via-[#0c311e] to-[#01140a]',
        card: 'bg-[#113924] border-yellow-600/40 shadow-[0_0_15px_rgba(234,179,8,0.08)] text-amber-50',
        sidebarActive: 'bg-[#0c311e]/80 border-yellow-500 border-2 border-b-4 text-yellow-550 font-bold shadow-[0_0_10px_rgba(234,179,8,0.15)]',
        accentText: 'text-yellow-500',
        logoText: 'text-yellow-600 font-black',
      };
    case 'bubblegum-cute':
      return {
        outer: 'bg-pink-50/50 text-pink-900 selection:bg-pink-300',
        card: 'bg-white border-pink-100 shadow-[0_4px_16px_rgba(244,63,145,0.04)] text-pink-900',
        sidebarActive: 'bg-pink-50 border-[#ff4b93] border-2 border-b-4 text-[#ff4b93] font-black shadow-[0_2px_8px_rgba(255,75,147,0.15)]',
        accentText: 'text-[#ff4b93]',
        logoText: 'text-[#ff4b93] font-extrabold',
      };
    case 'retro-8bit':
      return {
        outer: 'bg-stone-900 text-stone-200 selection:bg-amber-600 font-mono',
        card: 'bg-stone-800 border-stone-700 text-stone-200',
        sidebarActive: 'bg-stone-850 border-amber-500 border-2 border-b-4 text-amber-500 font-bold shadow-[0_0_10px_rgba(245,158,11,0.15)]',
        accentText: 'text-amber-500',
        logoText: 'text-amber-500 font-bold uppercase',
      };
    case 'executive-gold':
      return {
        outer: 'bg-[#0a0a0a] text-yellow-500/90 selection:bg-yellow-600 font-sans',
        card: 'bg-[#151515] border-yellow-600/30 text-yellow-500',
        sidebarActive: 'bg-[#1a1a1a] border-[#ffd700] border-2 border-b-4 text-[#ffd700] font-black shadow-[0_0_15px_rgba(255,215,0,0.15)]',
        accentText: 'text-[#ffd700]',
        logoText: 'text-[#ffd700] font-black uppercase',
      };
    case 'deep-ocean':
      return {
        outer: 'bg-[#072a40] text-sky-150 selection:bg-sky-600',
        card: 'bg-[#0f172a] border-sky-950 text-sky-50 shadow-[0_0_15px_rgba(56,189,248,0.06)]',
        sidebarActive: 'bg-[#0f172a] border-sky-450 border-2 border-b-4 text-sky-400 font-black shadow-[0_0_12px_rgba(56,189,248,0.2)]',
        accentText: 'text-sky-400',
        logoText: 'text-sky-400 font-extrabold',
      };
    default:
      return {
        outer: 'bg-[#f7f7f7] text-[#3c3c3c] selection:bg-[#d2f09d]',
        card: 'bg-white border-[#e5e5e5] text-[#3c3c3c]',
        sidebarActive: 'bg-[#e5e5e5]/10 border-[#1cb0f6] border-2 border-b-4 text-[#1cb0f6]',
        accentText: 'text-[#58cc02]',
        logoText: 'text-[#58cc02]',
      };
  }
}

export default function MainLayout({ children, isMuted, toggleMute, onOpenHardwareHub, onSync, isSyncing, lastSyncTime }: MainLayoutProps) {
  const user = useUserStore((s) => s.user);
  const themeClasses = getSkinThemeClasses(user?.activeSkin);

  return (
    <div className={`min-h-screen font-sans flex flex-col relative antialiased transition-all duration-300 theme-${user?.activeSkin || 'standard'} ${themeClasses.outer}`}>
      <div className="flex-1 flex flex-col md:flex-row max-w-[1440px] w-full mx-auto md:px-4 lg:px-8 mt-4">
        <Sidebar themeClasses={themeClasses} isMuted={isMuted} toggleMute={toggleMute} onSync={onSync} isSyncing={isSyncing} />
        <main className="flex-1 px-4 md:px-0 md:pl-4 overflow-y-auto min-h-screen pb-24 md:pb-0">
          <TopBar
            isMuted={isMuted}
            toggleMute={toggleMute}
            onOpenHardwareHub={onOpenHardwareHub}
            onSync={onSync}
            isSyncing={isSyncing}
            lastSyncTime={lastSyncTime}
          />
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
