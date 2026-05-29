import React, { useState, useEffect, useMemo } from 'react';
import { User, Transaction, Product, Customer, ExpressEvent } from '../../types';
import { playSound } from '../../services/sounds';
import { toast } from '../../components/Modal/FlashNotifications';
import AeroMascot from '../../components/Mascot/AeroMascot';
import type { AeroMood } from '../../components/Mascot/AeroMascot';
import { LicenseDetails } from '../../services/licensing';
import { Trophy, Coins, Zap, CheckCircle2, Lock, ShieldAlert, Gift } from 'lucide-react';

// Subcomponents modularized
import QuestsSection from './components/QuestsSection';
import LeagueLeaderboard from './components/LeagueLeaderboard';
import SagaMap from './components/SagaMap';
import PointsShop from './components/PointsShop';

export interface Quest {
  id: string;
  title: string;
  description: string;
  target: number;
  current: number;
  xpReward: number;
  gemReward: number;
  icon: string;
  type: 'sale' | 'barcode' | 'customer' | 'invoice';
}

export interface TrophyMilestone {
  id: string;
  title: string;
  description: string;
  target: number;
  current: number;
  xpReward: number;
  gemReward: number;
  badgeId: string;
  icon: string;
}

interface GamificationScreenProps {
  user: User;
  onUpdateUser: (updatedUser: User) => void;
  transactions: Transaction[];
  products: Product[];
  customers: Customer[];
  licenseDetails: LicenseDetails;
  activeEvent?: ExpressEvent | null;
  onTriggerExpressEvent?: (type: 'happy_hour' | 'scan_challenge' | 'loyalty_challenge') => void;
}

export default function GamificationScreen({
  user,
  onUpdateUser,
  transactions,
  products,
  customers,
  licenseDetails,
  activeEvent,
  onTriggerExpressEvent,
}: GamificationScreenProps) {
  const [activeSubTab, setActiveSubTab] = useState<'quests' | 'leagues' | 'map' | 'season' | 'trophies' | 'store'>(
    'quests',
  );

  const unlockedBadgesList = user.unlockedBadges || [];
  const completedQuestsList = user.completedMissionsToday || [];
  const currentGems = user.gems ?? 40; // Default startup support
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Real statistical calculations for today's achievements
  const todayTransactions = useMemo(() => {
    return transactions.filter((t) => t.date.startsWith(todayStr));
  }, [transactions, todayStr]);

  // Resolve local play stats for temporary actions (scans, invoices, perfect balances)
  const [dailyStats, setDailyStats] = useState(() => {
    try {
      const saved = localStorage.getItem(`duo_pos_daily_acts_${todayStr}`);
      return saved ? JSON.parse(saved) : { barcodeScans: 0, invoicesEmitted: 0, customersRegistered: 0 };
    } catch {
      return { barcodeScans: 0, invoicesEmitted: 0, customersRegistered: 0 };
    }
  });

  useEffect(() => {
    localStorage.setItem(`duo_pos_daily_acts_${todayStr}`, JSON.stringify(dailyStats));
  }, [dailyStats, todayStr]);

  // Define actual Daily Quests
  const quests: Quest[] = useMemo(
    () => [
      {
        id: 'quest-sale',
        title: 'El Madrugador POS 🌅',
        description: 'Realiza al menos 1 transacción de venta hoy.',
        target: 1,
        current: todayTransactions.length,
        xpReward: 20,
        gemReward: 10,
        icon: '🛒',
        type: 'sale',
      },
      {
        id: 'quest-barcode',
        title: 'Escaneo Veloz 🔍',
        description: 'Escanea por lo menos 2 códigos de barra de productos en el visor.',
        target: 2,
        current: dailyStats.barcodeScans,
        xpReward: 30,
        gemReward: 15,
        icon: '📷',
        type: 'barcode',
      },
      {
        id: 'quest-customer',
        title: 'Camaradería Duolingo 👥',
        description: 'Registra o actualiza al menos 1 cliente en Duo loyalty hoy.',
        target: 1,
        current: dailyStats.customersRegistered,
        xpReward: 25,
        gemReward: 10,
        icon: '🤝',
        type: 'customer',
      },
      {
        id: 'quest-invoice',
        title: 'Maestro Fiscal 🧾',
        description: 'Genera o imprime 1 ticket de venta con timbrado electrónico.',
        target: 1,
        current: dailyStats.invoicesEmitted,
        xpReward: 40,
        gemReward: 20,
        icon: '📡',
        type: 'invoice',
      },
    ],
    [todayTransactions.length, dailyStats],
  );

  // Lifetime Trophies linked to DB stats
  const trophiesCount = useMemo(() => {
    const totalSales = transactions.length;
    const printedTickets = transactions.filter((t) => t.xpGained >= 15).length; // XP 15 is from printing tickets
    const loyalCustomers = customers.length;
    const currentMaxLevel = user.level;
    const storedPerfects = localStorage.getItem('duo_pos_perfect_shifts') || '1';
    const perfectShiftCount = parseInt(storedPerfects, 10);

    return [
      {
        id: 'trophy-sales',
        title: 'Cajero de Clase Mundial 🥉',
        description: 'Completa un total de 10 transacciones en DuoPOS.',
        target: 10,
        current: totalSales,
        xpReward: 100,
        gemReward: 50,
        badgeId: 'expert_cashier',
        icon: '💼',
      },
      {
        id: 'trophy-level',
        title: 'El Nido Dorado 🏆',
        description: 'Alcanza el Nivel 4 en la red de cajeros.',
        target: 4,
        current: currentMaxLevel,
        xpReward: 150,
        gemReward: 75,
        badgeId: 'golden_nest',
        icon: '👑',
      },
      {
        id: 'trophy-loyalty',
        title: 'Imán de Clientes ⭐️',
        description: 'Registra un total de 5 clientes premium en el club de racha.',
        target: 5,
        current: loyalCustomers,
        xpReward: 120,
        gemReward: 60,
        badgeId: 'client_magnet',
        icon: '👥',
      },
      {
        id: 'trophy-thermal',
        title: 'Héroe del Internet de las Cosas (IoT) 🔌',
        description: 'Realiza 5 impresiones ESC/POS raw en el emulador térmico.',
        target: 5,
        current: printedTickets,
        xpReward: 100,
        gemReward: 50,
        badgeId: 'iot_hero',
        icon: '🖨️',
      },
      {
        id: 'trophy-shift',
        title: 'Auditor Financiero Perfecto 💎',
        description: 'Cierra una caja con un arqueo impecable sin discrepancia.',
        target: 1,
        current: perfectShiftCount,
        xpReward: 200,
        gemReward: 100,
        badgeId: 'perfect_audit',
        icon: '📊',
      },
    ] as TrophyMilestone[];
  }, [transactions, customers, user.level]);

  // Handle claiming quest rewards
  const handleClaimQuest = (questId: string) => {
    const quest = quests.find((q) => q.id === questId);
    if (!quest) return;

    playSound('success');
    const updatedMissions = [...completedQuestsList, quest.id];

    let updatedXp = user.xp + quest.xpReward;
    let currentLevel = user.level;
    let title = user.levelTitle;
    let didLevelUp = false;

    let neededXp = currentLevel * 100;
    while (updatedXp >= neededXp) {
      updatedXp -= neededXp;
      currentLevel += 1;
      neededXp = currentLevel * 100;
      didLevelUp = true;
    }

    if (didLevelUp) {
      const titles = [
        'Monolingüe Comercial 🦉',
        'Cajero de Bronce 🥉',
        'Supervisor de Rachas 🥈',
        'Experto en Finanzas 🥇',
        'Duo Maestro Glorioso 👑',
        'Dios del Escáner de Barras ⚡',
        'Socio Corporativo de Duo 💎',
      ];
      title = titles[Math.min(currentLevel - 1, titles.length - 1)];
      playSound('levelup');
      toast.achievement(`¡Subiste al nivel ${currentLevel}! Título: ${title}`, { title: '¡NIVEL ALCANZADO! 🎉' });
    }

    const nextGems = currentGems + quest.gemReward;
    const nextGemsTotal = (user.gemsEarnedTotal ?? 0) + quest.gemReward;

    const nextUser: User = {
      ...user,
      xp: updatedXp,
      level: currentLevel,
      levelTitle: title,
      gems: nextGems,
      gemsEarnedTotal: nextGemsTotal,
      completedMissionsToday: updatedMissions,
      completedMissionsTimestamp: todayStr,
      weeklyXp: (user.weeklyXp ?? 0) + quest.xpReward,
    };

    onUpdateUser(nextUser);
    toast.success(`¡Misión reclamada! Ganaste +${quest.xpReward} XP y +${quest.gemReward} Gemas 💎`, {
      title: 'Recompensa Diaria',
    });
  };

  // Handle claiming lifetime trophies
  const handleClaimTrophy = (trophy: TrophyMilestone) => {
    playSound('levelup');
    const updatedBadges = [...unlockedBadgesList, trophy.id];

    let updatedXp = user.xp + trophy.xpReward;
    let currentLevel = user.level;
    let title = user.levelTitle;
    let didLevelUp = false;

    let neededXp = currentLevel * 100;
    while (updatedXp >= neededXp) {
      updatedXp -= neededXp;
      currentLevel += 1;
      neededXp = currentLevel * 100;
      didLevelUp = true;
    }

    if (didLevelUp) {
      const titles = [
        'Monolingüe Comercial 🦉',
        'Cajero de Bronce 🥉',
        'Supervisor de Rachas 🥈',
        'Experto en Finanzas 🥇',
        'Duo Maestro Glorioso 👑',
        'Dios del Escáner de Barras ⚡',
        'Socio Corporativo de Duo 💎',
      ];
      title = titles[Math.min(currentLevel - 1, titles.length - 1)];
      toast.achievement(`¡Subiste al nivel ${currentLevel}! Título: ${title}`, { title: '¡NIVEL ALCANZADO! 🎉' });
    }

    const nextGems = currentGems + trophy.gemReward;
    const nextGemsTotal = (user.gemsEarnedTotal ?? 0) + trophy.gemReward;

    const nextUser: User = {
      ...user,
      xp: updatedXp,
      level: currentLevel,
      levelTitle: title,
      gems: nextGems,
      gemsEarnedTotal: nextGemsTotal,
      unlockedBadges: updatedBadges,
      weeklyXp: (user.weeklyXp ?? 0) + trophy.xpReward,
    };

    onUpdateUser(nextUser);
    toast.achievement(
      `¡Trofeo Conquistado! Unlocked [${trophy.title}] • +${trophy.xpReward} XP y +${trophy.gemReward} Gemas`,
      { title: 'Trofeo Desbloqueado 🏆' },
    );
  };

  // Local helper for daily quest triggers in demo control center
  const handleSimulateAction = (type: 'scan' | 'customer' | 'invoice') => {
    playSound('click');
    if (type === 'scan') {
      setDailyStats((prev: any) => ({ ...prev, barcodeScans: Math.min(prev.barcodeScans + 1, 3) }));
      toast.info('Se simuló un escaneo de código de barra inteligente. +1 escaneo.', {
        title: 'Depurador de Misiones 👾',
      });
    } else if (type === 'customer') {
      setDailyStats((prev: any) => ({ ...prev, customersRegistered: Math.min(prev.customersRegistered + 1, 1) }));
      toast.info('Se simuló el registro de un cliente Premium. +1 cliente hoy.', { title: 'Depurador de Misiones 👾' });
    } else {
      setDailyStats((prev: any) => ({ ...prev, invoicesEmitted: Math.min(prev.invoicesEmitted + 1, 1) }));
      toast.info('Se simuló el timbrado con éxito de un comprobante legal fiscal. +1 firma.', {
        title: 'Depurador de Misiones 👾',
      });
    }
  };

  // Render generic rarity tags
  const getRarityBadge = (rarity: string) => {
    switch (rarity) {
      case 'comun':
        return (
          <span className="text-[8px] bg-gray-100 text-gray-700 px-1.5 py-0.5 border border-gray-200 rounded font-black uppercase">
            Común
          </span>
        );
      case 'raro':
        return (
          <span className="text-[8px] bg-purple-100 text-purple-700 px-1.5 py-0.5 border border-purple-200 rounded font-black uppercase">
            Raro
          </span>
        );
      case 'epico':
        return (
          <span className="text-[8px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 border border-indigo-200 rounded font-black uppercase">
            Épico
          </span>
        );
      case 'legendario':
        return (
          <span className="text-[8px] bg-yellow-100 text-amber-800 px-1.5 py-0.5 border border-amber-300 rounded font-black uppercase animate-pulse">
            Legendario
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-fadeIn font-sans pb-12 text-[#2d2d2d] text-left">
      {/* SECTION 1: LEVEL UP PROGRESS HEADER CARD */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 border-b-[8px] rounded-3xl p-5 md:p-6 flex flex-col md:flex-row items-center gap-6 justify-between shadow-xs">
        {/* User visual & current character details */}
        <div className="flex items-center gap-4.5 w-full md:w-auto">
          <div className="relative">
            <div className="bg-white border-2 border-green-200 p-1.5 rounded-3xl flex items-center justify-center shadow-md">
              <AeroMascot
                size={60}
                activeAccessory={user.activeAccessory}
                level={user.level}
                mood={(() => {
                  const allDone = quests.every((q) => q.current >= q.target);
                  if (allDone) return 'happy' as AeroMood;
                  return 'neutral' as AeroMood;
                })()}
              />
            </div>
            {/* Active equipped tier badge */}
            <span className="absolute -bottom-1 -right-1 bg-yellow-400 text-amber-950 font-black text-[9px] px-1.5 py-0.5 rounded-full border border-white leading-none shadow z-10 uppercase">
              {licenseDetails.tier}
            </span>
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-black tracking-tight text-gray-800 flex items-center gap-2">
              Club de Gamificación de {user.username}
              <span className="text-yellow-500 text-xl animate-pulse">✨</span>
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-green-600 text-white text-[10px] uppercase font-black px-2.5 py-0.5 rounded-lg border-b border-green-800">
                Nivel {user.level}
              </span>
              <span className="text-xs text-gray-500 font-extrabold flex items-center gap-1.5">
                👑 {user.levelTitle}
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic currency counter card with large display */}
        <div className="flex gap-4.5 w-full md:w-auto">
          {/* Gem bank */}
          <div className="bg-white border-2 border-amber-100 border-b-4 rounded-2xl p-3 px-4.5 flex items-center gap-3 shadow-xs flex-1 md:flex-none">
            <Coins className="text-amber-500 h-6 w-6 stroke-[2.5]" />
            <div>
              <span className="block text-xs font-black text-gray-400 leading-none">MIS GEMAS</span>
              <span className="text-xl font-black text-amber-600 font-mono tracking-tight">{currentGems}</span>
            </div>
          </div>

          {/* Double XP charges if active */}
          <div className="bg-white border-2 border-indigo-155 border-b-4 rounded-2xl p-3 px-4.5 flex items-center gap-3 shadow-xs flex-1 md:flex-none">
            <Zap className="text-indigo-600 h-6 w-6 stroke-[2.5]" />
            <div>
              <span className="block text-xs font-black text-gray-400 leading-none">BOOSTER XP</span>
              <span className="text-xl font-black text-indigo-700 font-mono tracking-tight">
                {localStorage.getItem('duo_pos_xp_booster_charges') || '0'}x 🧪
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SUB-TABS SELECTOR DE DUOPOS (Quests, Leagues, Map, Trophies, Store) */}
      <div className="flex border-b-2 border-gray-150 gap-1 sm:gap-2 overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => {
            playSound('click');
            setActiveSubTab('quests');
          }}
          className={`px-4 sm:px-6 py-3 font-black text-xs sm:text-sm uppercase tracking-wider border-b-4 -mb-0.5 transition-all outline-none shrink-0 ${
            activeSubTab === 'quests'
              ? 'border-[#58cc02] text-[#58cc02] font-black'
              : 'border-transparent text-gray-400 hover:text-gray-655'
          }`}
        >
          📅 Misiones
        </button>
        <button
          type="button"
          onClick={() => {
            playSound('click');
            setActiveSubTab('leagues');
          }}
          className={`px-4 sm:px-6 py-3 font-black text-xs sm:text-sm uppercase tracking-wider border-b-4 -mb-0.5 transition-all outline-none shrink-0 ${
            activeSubTab === 'leagues'
              ? 'border-[#8c52ff] text-[#8c52ff] font-black'
              : 'border-transparent text-gray-400 hover:text-gray-655'
          }`}
        >
          ⚔️ Ligas
        </button>
        <button
          type="button"
          onClick={() => {
            playSound('click');
            setActiveSubTab('map');
          }}
          className={`px-4 sm:px-6 py-3 font-black text-xs sm:text-sm uppercase tracking-wider border-b-4 -mb-0.5 transition-all outline-none shrink-0 ${
            activeSubTab === 'map'
              ? 'border-[#00d9ff] text-[#00d9ff] font-black'
              : 'border-transparent text-gray-400 hover:text-gray-655'
          }`}
        >
          🗺️ Camino
        </button>
        <button
          type="button"
          onClick={() => {
            playSound('click');
            setActiveSubTab('season');
          }}
          className={`px-4 sm:px-6 py-3 font-black text-xs sm:text-sm uppercase tracking-wider border-b-4 -mb-0.5 transition-all outline-none shrink-0 ${
            activeSubTab === 'season'
              ? 'border-[#ff4b93] text-[#ff4b93] font-black'
              : 'border-transparent text-gray-400 hover:text-gray-655'
          }`}
        >
          🎟️ Pase
        </button>
        <button
          type="button"
          onClick={() => {
            playSound('click');
            setActiveSubTab('trophies');
          }}
          className={`px-4 sm:px-6 py-3 font-black text-xs sm:text-sm uppercase tracking-wider border-b-4 -mb-0.5 transition-all outline-none shrink-0 ${
            activeSubTab === 'trophies'
              ? 'border-[#1cb0f6] text-[#1cb0f6] font-black'
              : 'border-transparent text-gray-400 hover:text-gray-655'
          }`}
        >
          🏆 Trofeos
        </button>
        <button
          type="button"
          onClick={() => {
            playSound('click');
            setActiveSubTab('store');
          }}
          className={`px-4 sm:px-6 py-3 font-black text-xs sm:text-sm uppercase tracking-wider border-b-4 -mb-0.5 transition-all outline-none shrink-0 ${
            activeSubTab === 'store'
              ? 'border-[#ff9600] text-[#ff9600] font-black'
              : 'border-transparent text-gray-400 hover:text-gray-655'
          }`}
        >
          🛍️ Tienda
        </button>
      </div>

      {/* TAB SUB-DISPLAY: QUIESTS */}
      {activeSubTab === 'quests' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2">
            <QuestsSection
              activeQuest={quests.find((q) => !completedQuestsList.includes(q.id)) || null}
              dailyQuests={quests.filter((q) => !completedQuestsList.includes(q.id))}
              onClaimQuestReward={handleClaimQuest}
              onTriggerExpressEvent={onTriggerExpressEvent || (() => {})}
              onSwitchTab={setActiveSubTab}
            />
          </div>

          {/* Right sidebar: completed quests and demo controls */}
          <div className="space-y-4">
            <div className="bg-white border-2 border-gray-250 border-b-6 rounded-3xl p-5 space-y-4">
              <h4 className="font-extrabold text-gray-800 text-sm uppercase tracking-wider">
                Misiones Completadas Hoy
              </h4>

              <div className="space-y-2">
                {quests
                  .filter((q) => completedQuestsList.includes(q.id))
                  .map((quest) => (
                    <div
                      key={quest.id}
                      className="flex items-center justify-between p-3 bg-green-50 border border-green-150 rounded-xl"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{quest.icon}</span>
                        <div className="text-left">
                          <p className="font-bold text-xs text-green-950 leading-none">{quest.title}</p>
                          <span className="text-[9px] font-black text-green-700/80 uppercase">Completada ✔️</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-black text-green-600 bg-white border border-green-200 px-2 py-0.5 rounded">
                        +{quest.xpReward} XP
                      </span>
                    </div>
                  ))}

                {quests.filter((q) => completedQuestsList.includes(q.id)).length === 0 && (
                  <p className="text-xs text-gray-400 font-extrabold py-6 text-center">
                    No has completado misiones hoy aún. ¡A cobrar!
                  </p>
                )}
              </div>
            </div>

            {/* Demo quests simulator tools */}
            <div className="bg-indigo-50/50 border border-indigo-250 rounded-3xl p-5 space-y-3.5">
              <h4 className="font-black text-indigo-900 text-xs uppercase tracking-widest">🛠️ Depurador de Turno</h4>
              <p className="text-[11px] text-indigo-955/70 font-semibold leading-normal">
                Agiliza la validación de misiones y pases incrementando tus estadísticas de venta instantáneamente:
              </p>
              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleSimulateAction('scan')}
                  className="w-full bg-white hover:bg-gray-50 border-2 border-indigo-200 border-b-4 text-[#3c3c3c] font-black text-xs py-2 px-3 rounded-xl transition-all active:translate-y-0.5"
                >
                  🔍 Simular Escaneo (+1)
                </button>
                <button
                  type="button"
                  onClick={() => handleSimulateAction('customer')}
                  className="w-full bg-white hover:bg-gray-50 border-2 border-indigo-200 border-b-4 text-[#3c3c3c] font-black text-xs py-2 px-3 rounded-xl transition-all active:translate-y-0.5"
                >
                  👥 Simular Registro Cliente (+1)
                </button>
                <button
                  type="button"
                  onClick={() => handleSimulateAction('invoice')}
                  className="w-full bg-white hover:bg-gray-50 border-2 border-indigo-200 border-b-4 text-[#3c3c3c] font-black text-xs py-2 px-3 rounded-xl transition-all active:translate-y-0.5"
                >
                  🧾 Simular Comprobante SAT (+1)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB SUB-DISPLAY: LEAGUES */}
      {activeSubTab === 'leagues' && <LeagueLeaderboard user={user} onUpdateUser={onUpdateUser} />}

      {/* TAB SUB-DISPLAY: PROGRESSION MAP (🗺️ CAMINO DEL EMPRENDEDOR) */}
      {activeSubTab === 'map' && (
        <SagaMap user={user} onUpdateUser={onUpdateUser} transactions={transactions} customers={customers} />
      )}

      {/* TAB SUB-DISPLAY: SEASON (🎟️ PASE DE TEMPORADA DE DUO) */}
      {activeSubTab === 'season' && (
        <div className="space-y-6">
          {/* Main header banner card */}
          <div className="bg-gradient-to-r from-pink-500 via-[#ff4b93] to-red-500 border-2 border-pink-600 border-b-[8px] rounded-3xl p-6 text-white relative overflow-hidden shadow-md">
            <div className="absolute right-0 top-0 opacity-10 text-[180px] leading-none pointer-events-none select-none font-bold">
              🎟️
            </div>

            <div className="relative z-10 space-y-4">
              <div className="flex flex-wrap justify-between items-center gap-3">
                <div className="space-y-1 text-left">
                  <span className="bg-white/25 backdrop-blur-xs text-white text-[10px] uppercase font-black px-2.5 py-0.5 rounded-lg">
                    Temporada Activa 📅
                  </span>
                  <h3 className="text-2xl md:text-3xl font-black tracking-tight">🎟️ Pase de Temporada de Duo</h3>
                  <p className="text-xs text-pink-100 font-extrabold max-w-xl">
                    ¡Acumula XP en el POS para desbloquear recompensas exclusivas! Cada venta y misión diaria te ayuda a
                    avanzar en el pase de Duo.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    playSound('click');
                    const updatedUser = {
                      ...user,
                      seasonXp: (user.seasonXp ?? 0) + 150,
                      xp: user.xp + 150, // Keep in sync
                      weeklyXp: (user.weeklyXp ?? 0) + 150,
                    };
                    onUpdateUser(updatedUser);
                    toast.success('¡Se simularon +150 XP de Temporada! Revisa las recompensas desbloqueadas.', {
                      title: 'Simulación de XP',
                    });
                  }}
                  className="bg-white text-pink-600 font-black text-xs uppercase px-4 py-2 rounded-2xl border-b-4 border-pink-200 hover:bg-pink-50 active:translate-y-[2px] active:border-b-2 transition-all cursor-pointer shadow-xs"
                >
                  ⚡ Simular +150 XP
                </button>
              </div>

              {/* Progress tracker */}
              <div className="bg-black/15 border border-white/20 rounded-2xl p-4 space-y-2">
                <div className="flex justify-between items-end text-xs font-black">
                  <span>PROGRESO DE TEMPORADA</span>
                  <span className="text-sm font-black font-mono">{user.seasonXp ?? 0} / 1400 XP</span>
                </div>

                {/* Custom bar */}
                <div className="w-full bg-white/20 h-6 rounded-xl p-1 overflow-hidden relative border border-white/10 shadow-inner flex items-center">
                  <div
                    className="h-full rounded-lg bg-white transition-all duration-500"
                    style={{ width: `${Math.min(((user.seasonXp ?? 0) / 1400) * 100, 100)}%` }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black tracking-wider uppercase text-pink-900 drop-shadow-xs mix-blend-difference">
                    {Math.min(Math.round(((user.seasonXp ?? 0) / 1400) * 100), 100)}% COMPLETADO (META: 1400 XP)
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Active Event Promo Card */}
          {activeEvent && activeEvent.type === 'happy_hour' && (
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 border-2 border-amber-600 border-b-[6px] rounded-3xl p-4.5 text-white flex justify-between items-center gap-4 animate-pulse">
              <div className="flex items-center gap-3">
                <span className="text-3xl">⚡</span>
                <div className="text-left">
                  <h4 className="font-black text-sm uppercase tracking-wider">¡HORA FELIZ ACTIVA!</h4>
                  <p className="text-xs font-extrabold opacity-90">
                    Todo el XP obtenido de ventas se duplica, ¡ideal para subir el Pase de Temporada!
                  </p>
                </div>
              </div>
              <span className="text-lg font-mono font-black bg-black/10 px-3 py-1 rounded-xl">
                {Math.floor(activeEvent.remainingSeconds / 60)}:
                {(activeEvent.remainingSeconds % 60).toString().padStart(2, '0')}
              </span>
            </div>
          )}

          {/* Trigger events manually (demo control center) */}
          <div className="bg-white border-2 border-[#e5e5e5] border-b-4 rounded-3xl p-5 space-y-3 text-left">
            <h4 className="text-sm font-black text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
              <span>👾 Panel de Control de Eventos Express</span>
              <span className="bg-purple-100 text-purple-700 text-[9px] font-black uppercase px-2 py-0.5 rounded border border-purple-200">
                Pruebas en Vivo
              </span>
            </h4>
            <p className="text-xs text-gray-500 font-extrabold">
              Haz clic en cualquiera de los botones de abajo para disparar eventos express del cajero y simular el reto
              del POS en vivo:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => onTriggerExpressEvent && onTriggerExpressEvent('happy_hour')}
                className="bg-amber-50 hover:bg-amber-100 border-2 border-amber-200 border-b-4 text-amber-800 font-black text-xs py-3 rounded-2xl transition-all cursor-pointer active:translate-y-[2px] active:border-b-2 flex items-center justify-center gap-1.5 uppercase"
              >
                <span>⚡ Hora Feliz (5m)</span>
              </button>
              <button
                type="button"
                onClick={() => onTriggerExpressEvent && onTriggerExpressEvent('scan_challenge')}
                className="bg-sky-50 hover:bg-sky-100 border-2 border-sky-200 border-b-4 text-sky-800 font-black text-xs py-3 rounded-2xl transition-all cursor-pointer active:translate-y-[2px] active:border-b-2 flex items-center justify-center gap-1.5 uppercase"
              >
                <span>🔍 Reto Escaneo (60s)</span>
              </button>
              <button
                type="button"
                onClick={() => onTriggerExpressEvent && onTriggerExpressEvent('loyalty_challenge')}
                className="bg-emerald-50 hover:bg-emerald-100 border-2 border-emerald-200 border-b-4 text-emerald-800 font-black text-xs py-3 rounded-2xl transition-all cursor-pointer active:translate-y-[2px] active:border-b-2 flex items-center justify-center gap-1.5 uppercase"
              >
                <span>🤝 Fidelización (3m)</span>
              </button>
            </div>
          </div>

          {/* Rewards timeline grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                tier: 1,
                xpRequired: 100,
                reward: { type: 'gems', value: 50, name: '50 Gemas 💎', icon: '💎', rarity: 'comun' },
              },
              {
                tier: 2,
                xpRequired: 250,
                reward: { type: 'xpBoost', value: 3, name: '3 Pociones de Doble XP 🧪', icon: '🧪', rarity: 'raro' },
              },
              {
                tier: 3,
                xpRequired: 450,
                reward: {
                  type: 'accessory',
                  value: 'accessory-hat',
                  name: 'Sombrero de Copa 🎩',
                  icon: '🎩',
                  rarity: 'epico',
                },
              },
              {
                tier: 4,
                xpRequired: 700,
                reward: { type: 'gems', value: 100, name: '100 Gemas 💎', icon: '💎', rarity: 'raro' },
              },
              {
                tier: 5,
                xpRequired: 1000,
                reward: {
                  type: 'skin',
                  value: 'retro-8bit',
                  name: 'Skin Retro 8-Bits 🕹️',
                  icon: '🕹️',
                  rarity: 'legendario',
                },
              },
              {
                tier: 6,
                xpRequired: 1400,
                reward: {
                  type: 'title',
                  value: 'Socio de Élite de Duo 👑🦉',
                  name: 'Rango: Socio de Élite de Duo 👑🦉',
                  icon: '👑',
                  rarity: 'legendario',
                },
              },
            ].map((tierItem) => {
              const currentXp = user.seasonXp ?? 0;
              const isUnlocked = currentXp >= tierItem.xpRequired;
              const isClaimed = (user.seasonRewardsClaimed || []).includes(tierItem.tier);

              const handleClaim = () => {
                if (!isUnlocked || isClaimed) return;

                let nextUser = { ...user };
                const nextClaimed = [...(user.seasonRewardsClaimed || []), tierItem.tier];
                nextUser.seasonRewardsClaimed = nextClaimed;

                playSound('success');

                let rewardMsg = '';

                if (tierItem.reward.type === 'gems') {
                  const gemsVal = tierItem.reward.value as number;
                  nextUser.gems = (user.gems ?? 40) + gemsVal;
                  nextUser.gemsEarnedTotal = (user.gemsEarnedTotal ?? 40) + gemsVal;
                  rewardMsg = `¡Canjeado +${gemsVal} Gemas 💎 exitosamente!`;
                } else if (tierItem.reward.type === 'xpBoost') {
                  const boosterVal = tierItem.reward.value as number;
                  const currentCharges = parseInt(localStorage.getItem('duo_pos_xp_booster_charges') || '0', 10);
                  localStorage.setItem('duo_pos_xp_booster_charges', (currentCharges + boosterVal).toString());
                  rewardMsg = `¡Has recibido ${boosterVal} Pociones de Doble XP 🧪! Úsalas en tus siguientes ventas.`;
                } else if (tierItem.reward.type === 'accessory') {
                  const accId = tierItem.reward.value as string;
                  const currentAccessories = user.unlockedAccessories || [];
                  if (currentAccessories.includes(accId)) {
                    nextUser.gems = (user.gems ?? 40) + 40;
                    nextUser.gemsEarnedTotal = (user.gemsEarnedTotal ?? 40) + 40;
                    rewardMsg = `Como ya tienes el Sombrero de Copa, ¡has recibido 40 Gemas 💎 de consolación!`;
                  } else {
                    nextUser.unlockedAccessories = [...currentAccessories, accId];
                    nextUser.activeAccessory = accId;
                    rewardMsg = `¡Has desbloqueado y equipado el Sombrero de Copa 🎩 para Duo!`;
                  }
                } else if (tierItem.reward.type === 'skin') {
                  const skinVal = tierItem.reward.value as string;
                  const currentSkins = user.unlockedSkins || ['skin-standard'];
                  const skinId = `skin-${skinVal}`;
                  if (currentSkins.includes(skinId)) {
                    nextUser.gems = (user.gems ?? 40) + 100;
                    nextUser.gemsEarnedTotal = (user.gemsEarnedTotal ?? 40) + 100;
                    rewardMsg = `Como ya tienes la Skin Retro, ¡has recibido 100 Gemas 💎 de consolación!`;
                  } else {
                    nextUser.unlockedSkins = [...currentSkins, skinId];
                    nextUser.activeSkin = skinVal;
                    rewardMsg = `¡Has desbloqueado y equipado la Skin Retro 8-Bits 🕹️!`;
                  }
                } else if (tierItem.reward.type === 'title') {
                  const titleVal = tierItem.reward.value as string;
                  nextUser.levelTitle = titleVal;
                  rewardMsg = `¡Nuevo Rango Titular otorgado: "${titleVal}" ✨!`;
                }

                onUpdateUser(nextUser);
                toast.success(rewardMsg, { title: 'Recompensa del Pase 🎟️' });
              };

              return (
                <div
                  key={tierItem.tier}
                  className={`bg-white border-2 rounded-3xl p-5 flex flex-col justify-between space-y-4 shadow-sm transition-all relative ${
                    isClaimed
                      ? 'border-gray-200 opacity-75'
                      : isUnlocked
                        ? 'border-pink-300 hover:scale-[1.02] shadow-md'
                        : 'border-gray-150 grayscale'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-gray-400">NIVEL {tierItem.tier}</span>
                    <span className="font-mono text-xs font-extrabold text-[#ff4b93] bg-pink-50 border border-pink-100 px-2 py-0.5 rounded-lg">
                      {tierItem.xpRequired} XP
                    </span>
                  </div>

                  <div className="flex items-center gap-4 py-2">
                    <div
                      className={`p-4 h-16 w-16 rounded-2xl flex items-center justify-center text-4xl shadow-inner ${
                        isClaimed
                          ? 'bg-gray-100'
                          : isUnlocked
                            ? 'bg-pink-50 border border-pink-100 text-pink-600'
                            : 'bg-gray-100'
                      }`}
                    >
                      <span className="select-none">{tierItem.reward.icon}</span>
                    </div>
                    <div className="text-left space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-sm font-black text-gray-800 leading-tight">{tierItem.reward.name}</h4>
                        {getRarityBadge(tierItem.reward.rarity)}
                      </div>
                      <p className="text-[10px] text-gray-400 font-extrabold leading-tight">
                        {tierItem.reward.type === 'gems'
                          ? 'Moneda premium virtual'
                          : tierItem.reward.type === 'xpBoost'
                            ? 'Acelerador de experiencia'
                            : tierItem.reward.type === 'accessory'
                              ? 'Personaliza tu mascota'
                              : tierItem.reward.type === 'skin'
                                ? 'Tema estético global'
                                : 'Título y Rango honorífico'}
                      </p>
                    </div>
                  </div>

                  {isClaimed ? (
                    <button
                      type="button"
                      disabled
                      className="w-full bg-gray-100 border-2 border-gray-250 text-gray-400 font-black text-xs uppercase py-2.5 rounded-2xl flex items-center justify-center gap-1.5 leading-none"
                    >
                      <CheckCircle2 size={14} className="text-green-500" /> Reclamado
                    </button>
                  ) : isUnlocked ? (
                    <button
                      type="button"
                      onClick={handleClaim}
                      className="w-full bg-gradient-to-r from-pink-500 to-[#ff4b93] border-2 border-pink-600 border-b-4 hover:from-pink-600 hover:to-pink-500 text-white font-black text-xs uppercase py-2.5 rounded-2xl active:translate-y-[2px] active:border-b-2 transition-all cursor-pointer flex items-center justify-center gap-1.5 leading-none shadow-xs"
                    >
                      <Gift size={14} /> Reclamar
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="w-full bg-gray-50 border-2 border-gray-150 text-gray-400 font-black text-xs uppercase py-2.5 rounded-2xl flex items-center justify-center gap-1.5 leading-none"
                    >
                      <Lock size={14} /> Bloqueado (Faltan {tierItem.xpRequired - currentXp} XP)
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB SUB-DISPLAY: LIFETIME TROPHIES */}
      {activeSubTab === 'trophies' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4">
            {trophiesCount.map((trophy) => {
              const isClaimed = unlockedBadgesList.includes(trophy.id);
              const isDone = trophy.current >= trophy.target;
              const pct = Math.min(Math.round((trophy.current / trophy.target) * 100), 100);

              return (
                <div
                  key={trophy.id}
                  className={`bg-white border-2 rounded-3xl p-5 flex flex-col md:flex-row items-center justify-between gap-5 transition-all relative ${
                    isClaimed
                      ? 'border-gray-250 bg-gray-50/50 opacity-65'
                      : isDone
                        ? 'border-indigo-300 shadow-[0_0_15px_rgba(28,176,246,0.1)] border-b-6 shadow-sm ring-1 ring-blue-150'
                        : 'border-[#e5e5e5] border-b-6 shadow-sm hover:border-gray-300'
                  }`}
                >
                  {/* Left: Trophy Emblem or Cup */}
                  <div className="flex flex-col sm:flex-row items-center gap-4.5 flex-1 w-full text-center sm:text-left">
                    <div
                      className={`p-4 h-16 w-16 rounded-2xl text-4xl flex items-center justify-center border-2 border-gray-100 flex-shrink-0 relative ${
                        isDone && !isClaimed ? 'bg-[#e6f7ff] border-blue-200 scale-102 animate-bounce' : 'bg-white'
                      }`}
                    >
                      <span className="absolute text-[11px] top-[-3px] right-[-3px]">👑</span>
                      {trophy.icon}
                    </div>

                    <div className="space-y-1 w-full">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 w-full">
                        <h4 className="font-extrabold text-[#3c3c3c] text-base tracking-tight">{trophy.title}</h4>
                        {isClaimed && (
                          <span className="bg-indigo-100 text-indigo-700 text-[8.5px] font-black uppercase px-2 py-0.5 rounded-md w-fit mx-auto sm:mx-0">
                            ¡Desbloqueado!
                          </span>
                        )}
                      </div>

                      <p className="text-xs font-semibold text-gray-550 text-gray-500 leading-normal">
                        {trophy.description}
                      </p>

                      <p className="text-[10px] text-gray-400 font-extrabold uppercase mt-1">
                        Estadística actual:{' '}
                        <strong className="text-gray-700 font-mono text-[11px]">{trophy.current}</strong> de{' '}
                        <strong className="text-gray-700 font-mono text-[11px]">{trophy.target}</strong>
                      </p>
                    </div>
                  </div>

                  {/* Right: progress values / controls */}
                  <div className="flex flex-col items-center sm:items-end justify-center gap-3 w-full md:w-56 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 md:border-l border-dashed border-gray-150 pl-0 md:pl-5">
                    <div className="w-full space-y-1">
                      <div className="flex justify-between items-center text-[9px] font-black text-gray-400 leading-none">
                        <span>Hito de Progreso</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="bg-gray-155 h-2 rounded-full overflow-hidden w-full">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${isDone ? 'bg-indigo-500' : 'bg-amber-400'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full justify-between sm:justify-end mt-1.5">
                      <div className="flex items-center gap-1">
                        <span className="bg-blue-50 border border-blue-100 text-blue-750 text-[9px] font-black px-2 py-0.5 rounded-md">
                          +{trophy.xpReward} XP
                        </span>
                        <span className="bg-amber-50 border border-amber-100 text-amber-700 text-[9px] font-black px-2 py-0.5 rounded-md">
                          +{trophy.gemReward} 💎
                        </span>
                      </div>

                      {isClaimed ? (
                        <div className="font-extrabold text-[#1cb0f6] text-xs py-1 px-2 uppercase tracking-wide bg-blue-50 border border-blue-150 rounded-xl leading-none">
                          Reclamado ✔️
                        </div>
                      ) : isDone ? (
                        <button
                          type="button"
                          onClick={() => handleClaimTrophy(trophy)}
                          className="w-full sm:w-auto bg-[#1cb0f6] text-white font-black text-xs uppercase tracking-wider py-1.5 px-4 rounded-xl border-b-4 border-blue-700 hover:bg-sky-400 active:translate-y-0.5 active:border-b-0 cursor-pointer text-center"
                        >
                          CONSEGUIR 🏆
                        </button>
                      ) : (
                        <span className="text-gray-400 font-extrabold text-[9px] uppercase border border-gray-200 rounded-xl px-2.5 py-1 leading-none select-none">
                          Bloqueado
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB SUB-DISPLAY: POINTS SHOP */}
      {activeSubTab === 'store' && (
        <PointsShop user={user} onUpdateUser={onUpdateUser} licenseDetails={licenseDetails} />
      )}
    </div>
  );
}
