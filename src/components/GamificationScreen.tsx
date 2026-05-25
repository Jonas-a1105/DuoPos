import React, { useState, useEffect } from 'react';
import { User, Transaction, Product, Customer } from '../types';
import { playSound } from '../utils/sounds';
import { toast } from './FlashNotifications';
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
  Sparkle, 
  ChevronRight,
  Gift,
  HelpCircle
} from 'lucide-react';

interface GamificationScreenProps {
  user: User;
  onUpdateUser: (updatedUser: User) => void;
  transactions: Transaction[];
  products: Product[];
  customers: Customer[];
}

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

export interface StoreItem {
  id: string;
  title: string;
  category: 'skin' | 'powerup' | 'title';
  description: string;
  cost: number;
  icon: string;
  rarity: 'comun' | 'raro' | 'epico' | 'legendario';
  accentClass: string;
  value?: string;
}

export default function GamificationScreen({
  user,
  onUpdateUser,
  transactions,
  products,
  customers
}: GamificationScreenProps) {
  const [activeSubTab, setActiveSubTab] = useState<'quests' | 'trophies' | 'store'>('quests');
  
  // Real statistical calculations for today's achievements
  const todayStr = new Date().toISOString().split('T')[0];
  const todayTransactions = transactions.filter(t => t.date.startsWith(todayStr));
  
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
  const quests: Quest[] = [
    {
      id: 'quest-sale',
      title: 'El Madrugador POS 🌅',
      description: 'Realiza al menos 1 transacción de venta hoy.',
      target: 1,
      current: todayTransactions.length,
      xpReward: 20,
      gemReward: 10,
      icon: '🛒',
      type: 'sale'
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
      type: 'barcode'
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
      type: 'customer'
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
      type: 'invoice'
    }
  ];

  // Lifetime Trophies linked to DB stats
  const trophiesCount = React.useMemo(() => {
    // Real lifetime stats
    const totalSales = transactions.length;
    const printedTickets = transactions.filter(t => t.xpGained >= 15).length; // XP 15 is from printing tickets
    const loyalCustomers = customers.length;
    const currentMaxLevel = user.level;
    
    // Check if there was any closeout shift with zero difference (cached in local logs or simulated)
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
        icon: '💼'
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
        icon: '👑'
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
        icon: '👥'
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
        icon: '🖨️'
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
        icon: '📊'
      }
    ] as TrophyMilestone[];
  }, [transactions, customers, user.level]);

  // Virtural Employee Store Items
  const storeItems: StoreItem[] = [
    // Theme layouts changing styles globally
    {
      id: 'skin-standard',
      title: 'Nido Verde (Clásico) 🦉',
      category: 'skin',
      description: 'El look clásico original de Duolingo, nítido y resplandeciente.',
      cost: 0,
      icon: '🟢',
      rarity: 'comun',
      accentClass: 'from-green-400 to-[#58cc02]',
      value: 'standard'
    },
    {
      id: 'skin-galaxy',
      title: 'Espacio Profundo 🌌',
      category: 'skin',
      description: 'Modo nocturno interestelar. Fondo ultra gótico con estrellas violetas y neblina lila.',
      cost: 80,
      icon: '⭐',
      rarity: 'raro',
      accentClass: 'from-violet-600 to-indigo-900',
      value: 'dark-galaxy'
    },
    {
      id: 'skin-cyberpunk',
      title: 'Neon Cyberpunk ⚡',
      category: 'skin',
      description: 'Punto de venta del año 2077. Negro líquido con bordes brillantes cian y magenta.',
      cost: 150,
      icon: '👾',
      rarity: 'epico',
      accentClass: 'from-pink-500 to-cyan-500',
      value: 'neon-cyberpunk'
    },
    {
      id: 'skin-emerald',
      title: 'Palacio Esmeralda 👑',
      category: 'skin',
      description: 'Lujo corporativo medieval. Verde esmeralda con ribetes dorados brillantes.',
      cost: 200,
      icon: '💍',
      rarity: 'legendario',
      accentClass: 'from-[#0d5c3a] to-yellow-600',
      value: 'emerald-palace'
    },
    {
      id: 'skin-bubblegum',
      title: 'Bubblegum Pastel 🌸',
      category: 'skin',
      description: 'Glaseado dulce y tierno. Rosado de fresa pastel con formas redondeadas acolchadas.',
      cost: 70,
      icon: '🍬',
      rarity: 'raro',
      accentClass: 'from-pink-300 to-[#ff4b93]',
      value: 'bubblegum-cute'
    },
    // Powerups / Buffers
    {
      id: 'power-streak',
      title: 'Protector de Racha (Streak Freeze) ❄️',
      category: 'powerup',
      description: 'Evita perder tu racha de ventas hoy aunque no registres facturas.',
      cost: 50,
      icon: '🧊',
      rarity: 'comun',
      accentClass: 'from-sky-300 to-[#1cb0f6]'
    },
    {
      id: 'power-xpboost',
      title: 'Poción de Doble XP (Booster🧪)',
      category: 'powerup',
      description: 'Multiplica por 2 todos los puntos de XP que consigas en tus próximas 3 ventas.',
      cost: 40,
      icon: '🧪',
      rarity: 'raro',
      accentClass: 'from-[#a435f0] to-[#b95fff]'
    },
    // Prestige Titles
    {
      id: 'title-buho',
      title: 'Rango: Búho Supremo 🦉',
      category: 'title',
      description: 'Tu racha infunde respeto inmediato. Reemplaza tu título de rango comercial.',
      cost: 60,
      icon: '📜',
      rarity: 'comun',
      accentClass: 'from-amber-400 to-[#e5a002]',
      value: 'Búho Supremo 🦉'
    },
    {
      id: 'title-shark',
      title: 'Rango: Tiburón de Ventas 🦈',
      category: 'title',
      description: 'No hay cliente que escape a tu sugerencia de donas. Rápido y voraz.',
      cost: 95,
      icon: '🌊',
      rarity: 'epico',
      accentClass: 'from-blue-400 to-indigo-600',
      value: 'Tiburón de Ventas 🦈'
    },
    {
      id: 'title-obsidian',
      title: 'Rango: Banquero de Obsidiana 💎',
      category: 'title',
      description: 'Poder absoluto sobre los balances contables. Máximo honor galáctico.',
      cost: 160,
      icon: '♠️',
      rarity: 'legendario',
      accentClass: 'from-gray-800 to-slate-900',
      value: 'Banquero de Obsidiana 💎'
    }
  ];

  // Helper local states parsed
  const unlockedSkinsList = user.unlockedSkins || ['skin-standard'];
  const unlockedBadgesList = user.unlockedBadges || [];
  const completedQuestsList = user.completedMissionsToday || [];
  const currentGems = user.gems ?? 40; // Default startup support

  // Handle claiming quest rewards
  const handleClaimQuest = (quest: Quest) => {
    // Play sound effects
    playSound('success');

    const updatedMissions = [...completedQuestsList, quest.id];
    
    // Earn XP and Gems
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
        'Socio Corporativo de Duo 💎'
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
      completedMissionsTimestamp: todayStr
    };

    onUpdateUser(nextUser);
    toast.success(`¡Misión reclamada! Ganaste +${quest.xpReward} XP y +${quest.gemReward} Gemas 💎`, { title: 'Recompensa Diaria' });
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
        'Socio Corporativo de Duo 💎'
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
      unlockedBadges: updatedBadges
    };

    onUpdateUser(nextUser);
    toast.achievement(`¡Trofeo Conquistado! Unlocked [${trophy.title}] • +${trophy.xpReward} XP y +${trophy.gemReward} Gemas`, { title: 'Trofeo Desbloqueado 🏆' });
  };

  // Handle buying items in Virtual store
  const handleBuyItem = (item: StoreItem) => {
    if (currentGems < item.cost) {
      playSound('error');
      toast.error(`Gemas insuficientes. Necesitas ${item.cost} Gemas (Tienes ${currentGems})`, { title: 'Tienda Bloqueada 🔒' });
      return;
    }

    playSound('success');
    const remainingGems = currentGems - item.cost;
    let nextUser: User = { ...user, gems: remainingGems };

    if (item.category === 'skin' && item.value) {
      // Skin purchase
      const nextUnlockedSkins = [...unlockedSkinsList, item.id];
      nextUser = {
        ...nextUser,
        unlockedSkins: nextUnlockedSkins,
        activeSkin: item.value
      };
      toast.success(`Se ha comprado la Skin layout "${item.title}". ¡Equipada automáticamente!`, { title: 'Tienda DuoPOS 🛍️' });
    } 
    else if (item.category === 'title' && item.value) {
      // Title upgrade
      nextUser = {
        ...nextUser,
        levelTitle: item.value
      };
      toast.success(`Establecido nuevo Rango Titular: "${item.title}" ✨`, { title: 'Rango Actualizado ✨' });
    }
    else if (item.id === 'power-streak') {
      // Streak freeze count
      const nextSavedCount = (user.dailyStreakSavedCount ?? 0) + 1;
      nextUser = {
        ...nextUser,
        dailyStreakSavedCount: nextSavedCount
      };
      toast.success('¡Has comprado 1 Congelador de Racha ❄️! Te protegerá automáticamente.', { title: 'Escudo Activado 🧊' });
    }
    else if (item.id === 'power-xpboost') {
      // XP double values
      toast.success('Poción de Doble XP comprada. ¡Tus siguientes 3 ventas otorgarán el doble de puntos!', { title: 'Booster de Fila 🧪' });
      localStorage.setItem('duo_pos_xp_booster_charges', '3');
    }

    onUpdateUser(nextUser);
  };

  const handleEquipSkin = (item: StoreItem) => {
    if (!item.value) return;
    playSound('click');
    const nextUser: User = {
      ...user,
      activeSkin: item.value
    };
    onUpdateUser(nextUser);
    toast.info(`Tema cambiado a: "${item.title}"`, { title: 'Personalización Visual 🔄' });
  };

  // Debug Simulator tool: Increments daily stats instantly so user can see quests completion
  const handleSimulateAction = (type: 'scan' | 'customer' | 'invoice') => {
    playSound('click');
    if (type === 'scan') {
      setDailyStats(prev => ({ ...prev, barcodeScans: Math.min(prev.barcodeScans + 1, 3) }));
      toast.info('Se simuló un escaneo de código de barra inteligente. +1 escaneo.', { title: 'Depurador de Misiones 👾' });
    } else if (type === 'customer') {
      setDailyStats(prev => ({ ...prev, customersRegistered: Math.min(prev.customersRegistered + 1, 1) }));
      toast.info('Se simuló el registro de un cliente Premium. +1 cliente hoy.', { title: 'Depurador de Misiones 👾' });
    } else {
      setDailyStats(prev => ({ ...prev, invoicesEmitted: Math.min(prev.invoicesEmitted + 1, 1) }));
      toast.info('Se simuló el timbrado con éxito de un comprobante legal fiscal. +1 firma.', { title: 'Depurador de Misiones 👾' });
    }
  };

  const getRarityBadge = (rarity: StoreItem['rarity']) => {
    switch (rarity) {
      case 'comun': return <span className="text-[8px] bg-gray-100 text-gray-700 px-1.5 py-0.5 border border-gray-200 rounded font-black uppercase">Común</span>;
      case 'raro': return <span className="text-[8px] bg-purple-100 text-purple-750 px-1.5 py-0.5 border border-purple-200 rounded font-black uppercase">Raro</span>;
      case 'epico': return <span className="text-[8px] bg-indigo-100 text-indigo-750 px-1.5 py-0.5 border border-indigo-200 rounded font-black uppercase">Épico</span>;
      case 'legendario': return <span className="text-[8px] bg-yellow-100 text-amber-800 px-1.5 py-0.5 border border-amber-300 rounded font-black uppercase animate-pulse">Legendario</span>;
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-fadeIn font-sans pb-12 text-[#2d2d2d] text-left">
      
      {/* SECTION 1: LEVEL UP PROGRESS HEADER CARD */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 border-b-[8px] rounded-3xl p-5 md:p-6 flex flex-col md:flex-row items-center gap-6 justify-between shadow-xs">
        
        {/* User visual & current character details */}
        <div className="flex items-center gap-4.5 w-full md:w-auto">
          <div className="relative">
            <div className="bg-white border-2 border-green-200 p-3 h-18 w-18 rounded-3xl flex items-center justify-center text-4xl shadow-md">
              🦉
            </div>
            {/* Active equipped titles badge badge */}
            <span className="absolute -bottom-1 -right-1 bg-yellow-400 text-amber-950 font-black text-[9px] px-1.5 py-0.5 rounded-full border border-white leading-none shadow">
              PRO
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
          <div className="bg-white border-2 border-indigo-150 border-b-4 rounded-2xl p-3 px-4.5 flex items-center gap-3 shadow-xs flex-1 md:flex-none">
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

      {/* SUB-TABS SELECTOR DE DUOPOS (Quests, Trophies, Store) */}
      <div className="flex border-b-2 border-gray-150 gap-1 sm:gap-2">
        <button
          type="button"
          onClick={() => { playSound('click'); setActiveSubTab('quests'); }}
          className={`px-4 sm:px-6 py-3 font-black text-xs sm:text-sm uppercase tracking-wider border-b-4 -mb-0.5 transition-all outline-none ${
            activeSubTab === 'quests'
              ? 'border-[#58cc02] text-[#58cc02] font-black'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          📅 Misiones Diarias
        </button>
        <button
          type="button"
          onClick={() => { playSound('click'); setActiveSubTab('trophies'); }}
          className={`px-4 sm:px-6 py-3 font-black text-xs sm:text-sm uppercase tracking-wider border-b-4 -mb-0.5 transition-all outline-none ${
            activeSubTab === 'trophies'
              ? 'border-[#1cb0f6] text-[#1cb0f6] font-black'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          🏆 Trofeos de Vida
        </button>
        <button
          type="button"
          onClick={() => { playSound('click'); setActiveSubTab('store'); }}
          className={`px-4 sm:px-6 py-3 font-black text-xs sm:text-sm uppercase tracking-wider border-b-4 -mb-0.5 transition-all outline-none ${
            activeSubTab === 'store'
              ? 'border-[#ff9600] text-[#ff9600] font-black'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          🛍️ Tienda DuoPOS
        </button>
      </div>

      {/* TAB SUB-DISPLAY 1: DAILY QUESTS LIST */}
      {activeSubTab === 'quests' && (
        <div className="space-y-6">
          
          {/* Instructions banner */}
          <div className="bg-[#eefcf2] border-2 border-[#58cc02] rounded-3xl p-4.5 flex gap-3.5 items-start">
            <span className="text-3xl select-none flex-shrink-0">🦉</span>
            <div className="space-y-1">
              <h4 className="text-sm font-black text-[#1c7b01] uppercase tracking-wide">Consejo de Duo: racha contable diaria</h4>
              <p className="text-xs text-[#2b8a0e] font-extrabold leading-normal">
                Alcanza tus misiones diarias registrando operaciones reales en el POS. Si completas tus misiones, podrás canjear cosméticos en la Tienda Oficial. ¡Ojo: No dejes que la racha muera! 
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quests.map((quest) => {
              const pct = Math.min(Math.round((quest.current / quest.target) * 100), 100);
              const isClaimed = completedQuestsList.includes(quest.id);
              const isDone = quest.current >= quest.target;

              return (
                <div 
                  key={quest.id}
                  className={`bg-white border-2 rounded-3xl p-5 flex flex-col justify-between transition-all relative overflow-hidden ${
                    isClaimed 
                      ? 'border-gray-250 opacity-65 bg-gray-50/50' 
                      : isDone 
                        ? 'border-green-300 shadow-[0_0_12px_#22c55e/10] border-b-6 shadow-sm ring-1 ring-green-150' 
                        : 'border-[#e5e5e5] border-b-6 shadow-sm hover:border-gray-300'
                  }`}
                >
                  <div className="flex gap-3.5">
                    {/* Mission Icon Badge with progress circular background element */}
                    <div className={`p-2.5 rounded-2xl text-2xl h-11 w-11 flex items-center justify-center border-2 border-gray-100 flex-shrink-0 ${
                      isDone && !isClaimed ? 'bg-green-50 border-green-200 scale-105 animate-pulse' : 'bg-white'
                    }`}>
                      {quest.icon}
                    </div>

                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-extrabold text-[#3c3c3c] text-sm tracking-tight">{quest.title}</h4>
                        {isClaimed && <span className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center gap-0.5">Claimed ✔️</span>}
                      </div>
                      <p className="text-xs font-semibold text-gray-500 leading-normal">{quest.description}</p>
                    </div>
                  </div>

                  {/* Progress bar inside quest display */}
                  <div className="mt-5 space-y-2">
                    <div className="flex justify-between items-center text-[10.5px] font-black text-gray-400">
                      <span>Progreso del Objetivo</span>
                      <span className={isDone ? 'text-green-500' : 'text-gray-500'}>
                        {quest.current} / {quest.target} ({pct}%)
                      </span>
                    </div>

                    <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden p-[1.5px]">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${isDone ? 'bg-green-500' : 'bg-gray-400'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    {/* Quest action rewards and control claiming */}
                    <div className="flex items-center justify-between pt-3 border-t border-dashed border-gray-100 mt-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase text-gray-400">Recompensa:</span>
                        <span className="bg-green-50 border border-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-md font-black flex items-center gap-0.5">
                          +{quest.xpReward} XP
                        </span>
                        <span className="bg-amber-50 border border-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-md font-black flex items-center gap-0.5">
                          +{quest.gemReward} 💎
                        </span>
                      </div>

                      {/* Claim or Status Button */}
                      {isClaimed ? (
                        <div className="text-gray-400 font-extrabold text-xs flex items-center gap-1 py-1.5 px-3">
                          <Check className="text-gray-400" size={14} /> Completado
                        </div>
                      ) : isDone ? (
                        <button
                          type="button"
                          onClick={() => handleClaimQuest(quest)}
                          className="bg-green-500 text-white font-black text-xs uppercase tracking-wider py-1.5 px-4.5 rounded-xl border-b-4 border-green-700 hover:bg-green-400 active:translate-y-0.5 active:border-b-0 cursor-pointer shadow-md shadow-green-100 animate-bounce duration-750"
                        >
                          Reclamar 🎉
                        </button>
                      ) : (
                        <span className="text-gray-400 font-black text-[10px] uppercase border border-gray-200 rounded-xl px-3.5 py-1.5 leading-none">
                          En Progreso
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* SIMULATION CONTROLS BOX (TO DEMO REWARDS EASILY) */}
          <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-4.5 mt-6 relative select-none">
            <h4 className="text-xs font-black text-amber-800 uppercase tracking-widest flex items-center gap-1.5">
              <span>🎮 Simulador Rápido de Acciones POS (Zona de Pruebas de Gamificación)</span>
            </h4>
            <p className="text-xs text-amber-900/80 font-semibold mt-1">
              ¿Quieres desbloquear las recompensas rápido? Pulsa estos botones para simular operaciones que incrementen inmediatamente los indicadores cotidianos:
            </p>
            <div className="flex flex-wrap gap-2.5 mt-3.5">
              <button
                type="button"
                onClick={() => handleSimulateAction('scan')}
                className="bg-white hover:bg-gray-50 border-2 border-gray-250 border-b-4 text-[#3c3c3c] font-bold text-xs py-1.5 px-3 rounded-xl transition-all active:translate-y-0.5"
              >
                📷 Simular Escaneo Barras (+1)
              </button>
              <button
                type="button"
                onClick={() => handleSimulateAction('customer')}
                className="bg-white hover:bg-gray-50 border-2 border-gray-250 border-b-4 text-[#3c3c3c] font-bold text-xs py-1.5 px-3 rounded-xl transition-all active:translate-y-0.5"
              >
                🤝 Simular Registro Cliente (+1)
              </button>
              <button
                type="button"
                onClick={() => handleSimulateAction('invoice')}
                className="bg-white hover:bg-gray-50 border-2 border-gray-250 border-b-4 text-[#3c3c3c] font-bold text-xs py-1.5 px-3 rounded-xl transition-all active:translate-y-0.5"
              >
                ⚖️ Simular Timbrado Electrónico (+1)
              </button>
            </div>
          </div>

        </div>
      )}

      {/* TAB SUB-DISPLAY 2: LIFETIME TROPHIES */}
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
                    <div className={`p-4 h-16 w-16 rounded-2xl text-4xl flex items-center justify-center border-2 border-gray-100 flex-shrink-0 relative ${
                      isDone && !isClaimed ? 'bg-[#e6f7ff] border-blue-200 scale-102 animate-bounce' : 'bg-white'
                    }`}>
                      <span className="absolute text-[11px] top-[-3px] right-[-3px]">👑</span>
                      {trophy.icon}
                    </div>

                    <div className="space-y-1 w-full">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 w-full">
                        <h4 className="font-extrabold text-[#3c3c3c] text-base tracking-tight">{trophy.title}</h4>
                        {isClaimed && <span className="bg-indigo-100 text-indigo-700 text-[8.5px] font-black uppercase px-2 py-0.5 rounded-md w-fit mx-auto sm:mx-0">¡Desbloqueado!</span>}
                      </div>

                      <p className="text-xs font-semibold text-gray-500 leading-normal">{trophy.description}</p>
                      
                      {/* Metric state */}
                      <p className="text-[10px] text-gray-400 font-extrabold uppercase mt-1">
                        Estadística actual: <strong className="text-gray-700 font-mono text-[11px]">{trophy.current}</strong> de <strong className="text-gray-700 font-mono text-[11px]">{trophy.target}</strong>
                      </p>
                    </div>
                  </div>

                  {/* Right: progress values / controls */}
                  <div className="flex flex-col items-center sm:items-end justify-center gap-3 w-full md:w-56 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 md:border-l border-dashed border-gray-150 pl-0 md:pl-5">
                    
                    {/* Linear slider meter gauge */}
                    <div className="w-full space-y-1">
                      <div className="flex justify-between items-center text-[9px] font-black text-gray-400 leading-none">
                        <span>Hito de Progreso</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="bg-gray-150 h-2 rounded-full overflow-hidden w-full">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${isDone ? 'bg-indigo-500' : 'bg-amber-400'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full justify-between sm:justify-end mt-1.5">
                      {/* Reward label info */}
                      <div className="flex items-center gap-1">
                        <span className="bg-blue-50 border border-blue-105 text-blue-700 text-[9px] font-black px-2 py-0.5 rounded-md">+{trophy.xpReward} XP</span>
                        <span className="bg-amber-50 border border-amber-105 text-amber-700 text-[9px] font-black px-2 py-0.5 rounded-md">+{trophy.gemReward} 💎</span>
                      </div>

                      {/* Process state claim button */}
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

      {/* TAB SUB-DISPLAY 3: DUO GENERAL STORE */}
      {activeSubTab === 'store' && (
        <div className="space-y-6">
          
          <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-3xl p-5 text-white flex flex-col sm:flex-row items-center justify-between gap-5 border-b-[6px] border-amber-800 shadow-md">
            <div className="space-y-1 text-center sm:text-left">
              <span className="bg-amber-800/55 text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-wider">Tienda de Compras Oficial</span>
              <h3 className="text-2xl font-black tracking-tight">Utiliza tus gemas de racha DuoPOS</h3>
              <p className="text-xs text-amber-100 font-semibold max-w-xl">
                Al canjear estas recompensas, cambiará de inmediato la apariencia visual del sistema, desbloquearás flairs especiales visibles en tu perfil y activarás multiplicadores de experiencia en transacciones.
              </p>
            </div>

            <div className="bg-white text-amber-600 font-black px-5 py-3.5 rounded-2xl border-2 border-amber-200 border-b-4 flex items-center gap-2 text-xl shadow-inner select-none shrink-0 font-mono">
              <span>{currentGems}</span>
              <Coins className="text-amber-500" strokeWidth={2.5} size={22} />
            </div>
          </div>

          {/* List items segmented by style panels */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {storeItems.map((item) => {
              // Check if they already own this item
              const isPurchasedSkin = item.category === 'skin' && unlockedSkinsList.includes(item.id);
              const isEquippedSkin = item.category === 'skin' && user.activeSkin === item.value;
              const isEquippedTitle = item.category === 'title' && user.levelTitle === item.value;
              const isStreakFreezeOwned = item.id === 'power-streak' && (user.dailyStreakSavedCount ?? 0) > 0;

              // Check if currently equipped/applied
              const isEquipped = isEquippedSkin || isEquippedTitle;
              const isOwnedNotEquipped = isPurchasedSkin;

              return (
                <div 
                  key={item.id}
                  className="bg-white border-2 border-gray-250 border-b-6 rounded-3xl p-4 flex flex-col justify-between hover:border-gray-300 transition-all shadow-sm"
                >
                  <div className="space-y-3">
                    
                    {/* Header item with color gradient banner representation */}
                    <div className={`h-24 w-full rounded-2xl bg-gradient-to-tr ${item.accentClass} flex items-center justify-center text-4xl shadow-inner relative border border-white/20 overflow-hidden`}>
                      {/* Grid overlay */}
                      <div className="absolute inset-0 bg-black/5 opacity-10 pointer-events-none" />
                      <span className="transform hover:scale-110 duration-200 transition-all select-none">{item.icon}</span>
                      
                      <div className="absolute top-2 left-2">
                        {getRarityBadge(item.rarity)}
                      </div>

                      {item.category === 'skin' && (
                        <span className="absolute bottom-2 right-2 bg-black/40 text-white font-black text-[7.5px] tracking-wider px-2 py-0.5 rounded uppercase">
                          Skins Layout
                        </span>
                      )}
                      {item.category === 'powerup' && (
                        <span className="absolute bottom-2 right-2 bg-indigo-950/60 text-indigo-200 font-black text-[7.5px] tracking-wider px-2 py-0.5 rounded uppercase">
                          Activador
                        </span>
                      )}
                      {item.category === 'title' && (
                        <span className="absolute bottom-2 right-2 bg-amber-950/60 text-amber-200 font-black text-[7.5px] tracking-wider px-2 py-0.5 rounded uppercase">
                          Rango
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <h4 className="font-extrabold text-[#3c3c3c] text-sm tracking-tight">{item.title}</h4>
                      <p className="text-xs text-gray-400 font-bold leading-normal min-h-[36px]">{item.description}</p>
                    </div>

                  </div>

                  {/* Pricing footer and buy triggers */}
                  <div className="pt-2 border-t border-dashed border-gray-100 mt-4 flex items-center justify-between">
                    
                    {/* Price Tag values or Inventory display label */}
                    <div>
                      {isEquipped ? (
                        <span className="text-[#58cc02] text-[10px] font-black uppercase flex items-center gap-0.5">
                          🟢 EQUIPADO
                        </span>
                      ) : isOwnedNotEquipped ? (
                        <span className="text-indigo-650 text-[10px] font-black uppercase flex items-center gap-0.5">
                          Adquirido
                        </span>
                      ) : item.id === 'power-streak' && isStreakFreezeOwned ? (
                        <span className="text-[#1cb0f6] text-[10px] font-black uppercase flex items-center gap-0.5">
                          Activos: x{user.dailyStreakSavedCount} ❄️
                        </span>
                      ) : (
                        <div className="flex items-center gap-1 font-mono text-gray-800 font-black text-xs bg-amber-50 border border-amber-100/70 p-1 px-2.5 rounded-full">
                          <span>{item.cost}</span>
                          <Coins className="text-amber-500" size={13} strokeWidth={2.5} />
                        </div>
                      )}
                    </div>

                    {/* Operational shopping buttons */}
                    {isEquipped ? (
                      <button
                        type="button"
                        disabled
                        className="bg-gray-100 border border-gray-200 text-gray-400 font-black text-[9px] uppercase tracking-wider py-1.5 px-3 rounded-xl select-none"
                      >
                        En Uso 🔒
                      </button>
                    ) : isOwnedNotEquipped ? (
                      <button
                        type="button"
                        onClick={() => handleEquipSkin(item)}
                        className="bg-indigo-600 text-white font-black text-[9.5px] uppercase tracking-wider py-1.5 px-3 rounded-xl border-b-2 border-indigo-800 hover:bg-indigo-500 active:translate-y-0.5 active:border-b-0 cursor-pointer"
                      >
                        Equipar 🔄
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleBuyItem(item)}
                        className="bg-[#ff9600] text-white font-black text-[9.5px] uppercase tracking-wider py-1.5 px-3.5 rounded-xl border-b-2 border-amber-700 hover:bg-amber-500 active:translate-y-0.5 active:border-b-0 cursor-pointer shadow-xs shadow-orange-50"
                      >
                        {item.cost === 0 ? 'Obtener Gratis' : 'Canjear 💎'}
                      </button>
                    )}

                  </div>

                </div>
              );
            })}
          </div>

        </div>
      )}

    </div>
  );
}
