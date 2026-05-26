import React, { useState, useEffect } from 'react';
import { User, Transaction, Product, Customer, ExpressEvent } from '../types';
import { playSound } from '../utils/sounds';
import { toast } from './FlashNotifications';
import DuoMascot from './DuoMascot';
import type { DuoMood } from './DuoMascot';
import { LicenseDetails } from '../utils/licensing';
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
  licenseDetails: LicenseDetails;
  activeEvent?: ExpressEvent | null;
  onTriggerExpressEvent?: (type: 'happy_hour' | 'scan_challenge' | 'loyalty_challenge') => void;
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
  category: 'skin' | 'powerup' | 'title' | 'accessory';
  description: string;
  cost: number;
  icon: string;
  rarity: 'comun' | 'raro' | 'epico' | 'legendario';
  accentClass: string;
  value?: string;
  levelRequired?: number;
}

export default function GamificationScreen({
  user,
  onUpdateUser,
  transactions,
  products,
  customers,
  licenseDetails,
  activeEvent,
  onTriggerExpressEvent
}: GamificationScreenProps) {
  const [activeSubTab, setActiveSubTab] = useState<'quests' | 'leagues' | 'map' | 'season' | 'trophies' | 'store'>('quests');
  const [activeStoreCategory, setActiveStoreCategory] = useState<'all' | 'skin' | 'accessory' | 'title' | 'powerup'>('all');

  // ================= LEAGUE SYSTEM STATE & HELPERS =================
  const capitalize = (str: string) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const getLeagueIcon = (tier: string) => {
    switch (tier) {
      case 'bronce': return '🥉';
      case 'plata': return '🥈';
      case 'oro': return '🥇';
      case 'zafiro': return '🔷';
      case 'rubi': return '🔺';
      case 'esmeralda': return '🟢';
      case 'diamante': return '💎';
      case 'obsidiana': return '♠️';
      default: return '🛡️';
    }
  };

  const getAvatarEmoji = (avatar: string) => {
    switch (avatar) {
      case 'duo': return '🦉';
      case 'lily': return '👧';
      case 'zari': return '💅';
      case 'eddy': return '🏃‍♂️';
      case 'junior': return '👦';
      default: return '🦉';
    }
  };

  const generateLeagueParticipants = (tier: string) => {
    const duolingoNames = [
      { name: 'Zari la Fashionista 💅', avatar: 'lily' },
      { name: 'Lily la Apática ✝️', avatar: 'lily' },
      { name: 'Oscar el Artista 🎨', avatar: 'eddy' },
      { name: 'Vikram el Chef 🍛', avatar: 'junior' },
      { name: 'Eddy el Entrenador 🏃‍♂️', avatar: 'eddy' },
      { name: 'Junior el Curioso 👦', avatar: 'junior' },
      { name: 'Lucy la Enigmática 💁‍♀️', avatar: 'lily' },
      { name: 'Falstaff el Oso 🐻', avatar: 'duo' },
      { name: 'Bea la Entusiasta 🐝', avatar: 'lily' },
      { name: 'Lin la Sabia 👵', avatar: 'lily' },
      { name: 'Ari el Loro 🦜', avatar: 'duo' },
      { name: 'Bari el Panda 🐼', avatar: 'duo' },
      { name: 'Cari el Koala 🐨', avatar: 'duo' },
      { name: 'Duo Ayudante 🦉', avatar: 'duo' },
      { name: 'Pato el Pato 🦆', avatar: 'duo' }
    ];

    const shuffledNames = [...duolingoNames].sort(() => 0.5 - Math.random()).slice(0, 14);

    let baseMultiplier = 1;
    switch (tier) {
      case 'bronce': baseMultiplier = 1; break;
      case 'plata': baseMultiplier = 1.5; break;
      case 'oro': baseMultiplier = 2; break;
      case 'zafiro': baseMultiplier = 2.5; break;
      case 'rubi': baseMultiplier = 3; break;
      case 'esmeralda': baseMultiplier = 3.5; break;
      case 'diamante': baseMultiplier = 4; break;
      case 'obsidiana': baseMultiplier = 5; break;
    }

    return shuffledNames.map((item, idx) => {
      const randomXp = Math.floor((Math.random() * 150 + 20) * baseMultiplier);
      return {
        id: `sim-user-${idx}-${tier}`,
        name: item.name,
        avatar: item.avatar,
        weeklyXp: randomXp,
        league: tier as any
      };
    });
  };

  const [leagueData, setLeagueData] = useState<{
    tier: string;
    participants: Array<{ id: string; name: string; avatar: string; weeklyXp: number; league: string }>;
  }>(() => {
    const currentTier = user.employeeLeague || 'bronce';
    const saved = localStorage.getItem('duo_pos_weekly_league');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.tier === currentTier) {
          return parsed;
        }
      } catch (e) {}
    }
    
    const newParticipants = generateLeagueParticipants(currentTier);
    const data = {
      tier: currentTier,
      participants: newParticipants
    };
    localStorage.setItem('duo_pos_weekly_league', JSON.stringify(data));
    return data;
  });

  const sortedLeaderboard = React.useMemo(() => {
    const userParticipant = {
      id: user.id || 'current-user-cajero',
      name: `${user.username} (Tú) 🦉`,
      avatar: user.avatar || 'duo',
      weeklyXp: user.weeklyXp ?? 0,
      league: user.employeeLeague || 'bronce',
      isCurrentUser: true
    };

    const filteredSimulated = leagueData.participants.filter(p => p.id !== userParticipant.id);
    const combined = [...filteredSimulated, userParticipant];
    
    return combined.sort((a, b) => b.weeklyXp - a.weeklyXp);
  }, [leagueData, user.weeklyXp, user.employeeLeague, user.username, user.avatar, user.id]);

  const [countdownStr, setCountdownStr] = useState('');
  
  useEffect(() => {
    const getNextMondayCountdown = () => {
      const now = new Date();
      const resultDate = new Date();
      resultDate.setDate(now.getDate() + ((7 - now.getDay()) % 7 || 7));
      resultDate.setHours(0, 0, 0, 0);
      
      const diffMs = resultDate.getTime() - now.getTime();
      if (diffMs <= 0) return 'Quedan 0s';
      
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      
      return `${days}d ${hours}h ${minutes}m`;
    };

    setCountdownStr(getNextMondayCountdown());
    const timer = setInterval(() => {
      setCountdownStr(getNextMondayCountdown());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const handleSimulateWeeklyXp = () => {
    playSound('success');
    const addedXp = 50;
    let nextXp = user.xp + addedXp;
    let nextLevel = user.level;
    let nextTitle = user.levelTitle;
    let didLevelUp = false;
    
    let neededXp = nextLevel * 100;
    while (nextXp >= neededXp) {
      nextXp -= neededXp;
      nextLevel += 1;
      neededXp = nextLevel * 100;
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
      nextTitle = titles[Math.min(nextLevel - 1, titles.length - 1)];
      toast.achievement(`¡Subiste al nivel ${nextLevel}! Título: ${nextTitle}`, { title: '¡NIVEL ALCANZADO! 🎉' });
    }

    const updatedUser: User = {
      ...user,
      xp: nextXp,
      level: nextLevel,
      levelTitle: nextTitle,
      weeklyXp: (user.weeklyXp ?? 0) + addedXp
    };
    onUpdateUser(updatedUser);
    toast.success('¡Se simularon +50 XP semanales! Mira tu posición en la tabla.', { title: 'Simulación de XP' });
  };

  const handleSimulateLeagueEnd = () => {
    const userRankIndex = sortedLeaderboard.findIndex(p => p.isCurrentUser);
    const rank = userRankIndex + 1;
    
    const currentTier = user.employeeLeague || 'bronce';
    const tierOrder = ['bronce', 'plata', 'oro', 'zafiro', 'rubi', 'esmeralda', 'diamante', 'obsidiana'];
    const currentTierIndex = tierOrder.indexOf(currentTier);
    
    let nextTier = currentTier as any;
    let message = '';
    let status = 'safe';
    
    if (rank <= 5) {
      if (currentTierIndex < tierOrder.length - 1) {
        nextTier = tierOrder[currentTierIndex + 1];
        status = 'promo';
        message = `¡Felicidades! Terminaste en el puesto #${rank} (Top 5). ¡Ascendiste a la Liga ${nextTier.toUpperCase()}! 🏆✨`;
        playSound('levelup');
      } else {
        message = `¡Increíble! Terminaste en el puesto #${rank} en la Liga de Obsidiana. ¡Mantienes tu título de Campeón Supremo! 👑`;
        playSound('success');
      }
    } else if (rank >= 11) {
      if (currentTierIndex > 0) {
        nextTier = tierOrder[currentTierIndex - 1];
        status = 'demote';
        message = `Cuidado: Terminaste en el puesto #${rank} (Últimos 5). Descendiste a la Liga ${nextTier.toUpperCase()}. ¡Rachas y ventas te ayudarán a subir! 💔`;
        playSound('error');
      } else {
        message = `Terminaste en el puesto #${rank} en la Liga de Bronce. Mantienes la categoría pero debes esforzarte más. 🦉`;
        playSound('click');
      }
    } else {
      message = `Terminaste en el puesto #${rank} (Zona Segura). ¡Te mantienes en la Liga ${currentTier.toUpperCase()}! Sigue sumando XP. 🛡️`;
      playSound('click');
    }
    
    const updatedUser: User = {
      ...user,
      employeeLeague: nextTier,
      weeklyXp: 0
    };
    
    const newParticipants = generateLeagueParticipants(nextTier);
    const data = {
      tier: nextTier,
      participants: newParticipants
    };
    localStorage.setItem('duo_pos_weekly_league', JSON.stringify(data));
    setLeagueData(data);
    
    onUpdateUser(updatedUser);
    
    if (status === 'promo') {
      toast.achievement(message, { title: '¡ASCENSO CONSEGUIDO! ⚔️' });
    } else if (status === 'demote') {
      toast.error(message, { title: 'Descenso de Liga ⚠️' });
    } else {
      toast.info(message, { title: 'Liga Semanal Finalizada' });
    }
  };

  // ================= PROGRESSION SAGA MAP DATA & HANDLERS =================
  const nodesData = [
    { id: 'node-1', title: 'Inicio del Cajero 🏁', description: 'Realiza tu primera venta en DuoPOS.', metricName: 'Ventas Realizadas', requirement: { metric: 'totalTransactions', target: 1 }, reward: { xp: 40, gems: 20 }, x: 300, y: 750, type: 'milestone' },
    { id: 'node-2', title: 'Cajero de Cobre 🥉', description: 'Registra un total de 5 transacciones de venta.', metricName: 'Ventas Realizadas', requirement: { metric: 'totalTransactions', target: 5 }, reward: { xp: 60, gems: 30 }, x: 440, y: 680, type: 'milestone' },
    { id: 'node-3', title: 'Estrella de Clientes 👥', description: 'Registra 2 clientes en el club de fidelidad.', metricName: 'Clientes Registrados', requirement: { metric: 'customers', target: 2 }, reward: { xp: 80, gems: 40 }, x: 360, y: 600, type: 'milestone' },
    { id: 'node-4', title: 'Cofre Sorpresa Bronce 🎁', description: 'Alcanza el nivel 2 y reclama tus premios sorpresa.', metricName: 'Nivel Requerido', requirement: { metric: 'level', target: 2 }, reward: { xp: 100, gems: 50 }, x: 200, y: 540, type: 'chest' },
    { id: 'node-5', title: 'Dominando la Racha 🔥', description: 'Mantén una racha activa de 3 días de ventas.', metricName: 'Racha de Días', requirement: { metric: 'streak', target: 3 }, reward: { xp: 120, gems: 60 }, x: 160, y: 460, type: 'milestone' },
    { id: 'node-6', title: 'Cajero Profesional 💼', description: 'Alcanza las 15 ventas registradas de por vida.', metricName: 'Ventas Realizadas', requirement: { metric: 'totalTransactions', target: 15 }, reward: { xp: 150, gems: 70 }, x: 280, y: 390, type: 'milestone' },
    { id: 'node-7', title: 'Fidelización Premium ⭐', description: 'Registra 5 clientes en el club de lealtad.', metricName: 'Clientes Registrados', requirement: { metric: 'customers', target: 5 }, reward: { xp: 180, gems: 80 }, x: 420, y: 330, type: 'milestone' },
    { id: 'node-8', title: 'Cofre Reluciente Oro 🎁', description: 'Llega al nivel 4 para abrir el cofre dorado.', metricName: 'Nivel Requerido', requirement: { metric: 'level', target: 4 }, reward: { xp: 200, gems: 100 }, x: 360, y: 250, type: 'chest' },
    { id: 'node-9', title: 'Arqueo Impecable 💎', description: 'Cierra una caja con discrepancia de $0.', metricName: 'Arqueos Perfectos', requirement: { metric: 'perfectShifts', target: 1 }, reward: { xp: 250, gems: 120 }, x: 220, y: 180, type: 'milestone' },
    { id: 'node-10', title: 'JEFE FINAL: Socio de Duo 👑', description: 'Alcanza el nivel 6 en la red de cajeros corporativos.', metricName: 'Nivel Requerido', requirement: { metric: 'level', target: 6 }, reward: { xp: 500, gems: 250 }, x: 300, y: 90, type: 'boss' }
  ];

  const totalSalesVal = transactions.length;
  const totalTransactionsVal = transactions.length;
  const streakVal = user.streak || 0;
  const levelVal = user.level || 1;
  const customersVal = customers.length;
  const perfectShiftsVal = parseInt(localStorage.getItem('duo_pos_perfect_shifts') || '1', 10);

  const getMetricValue = (metric: string) => {
    switch (metric) {
      case 'totalSales': return totalSalesVal;
      case 'totalTransactions': return totalTransactionsVal;
      case 'streak': return streakVal;
      case 'level': return levelVal;
      case 'customers': return customersVal;
      case 'perfectShifts': return perfectShiftsVal;
      default: return 0;
    }
  };

  const [selectedNodeId, setSelectedNodeId] = useState<string>('node-1');

  useEffect(() => {
    if (activeSubTab === 'map') {
      const firstUnclaimed = nodesData.find((node, index) => {
        const isUnlocked = index === 0 || (user.progressionClaimed?.includes(nodesData[index - 1].id) || false);
        const isClaimed = user.progressionClaimed?.includes(node.id) || false;
        return isUnlocked && !isClaimed;
      });
      if (firstUnclaimed) {
        setSelectedNodeId(firstUnclaimed.id);
      }
    }
  }, [activeSubTab, user.progressionClaimed]);

  const handleClaimNode = (nodeId: string) => {
    const node = nodesData.find(n => n.id === nodeId);
    if (!node) return;
    
    playSound('levelup');
    const claimedNodes = [...(user.progressionClaimed || []), nodeId];
    
    let updatedXp = user.xp + node.reward.xp;
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

    const nextGems = (user.gems ?? 40) + node.reward.gems;
    const nextGemsTotal = (user.gemsEarnedTotal ?? 0) + node.reward.gems;

    let nextUnlockedAccessories = [...(user.unlockedAccessories || [])];
    let nextUnlockedSkins = [...(user.unlockedSkins || [])];
    
    if (node.id === 'node-4') {
      const accessoryId = 'accessory-glasses';
      if (!nextUnlockedAccessories.includes(accessoryId)) {
        nextUnlockedAccessories.push(accessoryId);
        toast.achievement('¡Del cofre obtuviste Lentes de Sol 😎!', { title: '¡Cofre Reclamado! 🎁' });
      } else {
        toast.success('¡Del cofre obtuviste +20 gemas extra! 💎', { title: '¡Cofre Reclamado! 🎁' });
      }
    } else if (node.id === 'node-8') {
      const skinId = 'skin-retro';
      if (!nextUnlockedSkins.includes(skinId)) {
        nextUnlockedSkins.push(skinId);
        toast.achievement('¡Del cofre obtuviste la Skin Retro 8-Bits 🕹️!', { title: '¡Cofre Reclamado! 🎁' });
      } else {
        toast.success('¡Del cofre obtuviste +40 gemas extra! 💎', { title: '¡Cofre Reclamado! 🎁' });
      }
    } else if (node.id === 'node-10') {
      const accessoryId = 'accessory-corona';
      if (!nextUnlockedAccessories.includes(accessoryId)) {
        nextUnlockedAccessories.push(accessoryId);
        toast.achievement('¡Venciste al jefe final y desbloqueaste la Corona Real 👑!', { title: '¡CAMINO COMPLETADO! 🏆' });
      }
    }

    const nextUser: User = {
      ...user,
      xp: updatedXp,
      level: currentLevel,
      levelTitle: title,
      gems: nextGems,
      gemsEarnedTotal: nextGemsTotal,
      progressionClaimed: claimedNodes,
      unlockedAccessories: nextUnlockedAccessories,
      unlockedSkins: nextUnlockedSkins
    };

    onUpdateUser(nextUser);
    toast.success(`¡Hito reclamado! Ganaste +${node.reward.xp} XP y +${node.reward.gems} Gemas 💎`, { title: 'Progreso del Camino' });
  };

  const points = [
    { x: 300, y: 750 },
    { x: 440, y: 680 },
    { x: 360, y: 600 },
    { x: 200, y: 540 },
    { x: 160, y: 460 },
    { x: 280, y: 390 },
    { x: 420, y: 330 },
    { x: 360, y: 250 },
    { x: 220, y: 180 },
    { x: 300, y: 90 }
  ];

  // Find furthest unlocked index
  let furthestUnlockedIndex = 0;
  for (let i = 0; i < nodesData.length; i++) {
    const isUnlocked = i === 0 || (user.progressionClaimed?.includes(nodesData[i-1].id) || false);
    if (isUnlocked) {
      furthestUnlockedIndex = i;
    }
  }

  // Create path for active segments
  const activePathD = points.slice(0, furthestUnlockedIndex + 1).map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ');


  
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
      value: 'standard',
      levelRequired: 1
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
      value: 'dark-galaxy',
      levelRequired: 1
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
      value: 'neon-cyberpunk',
      levelRequired: 1
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
      value: 'emerald-palace',
      levelRequired: 1
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
      value: 'bubblegum-cute',
      levelRequired: 1
    },
    {
      id: 'skin-retro',
      title: 'Retro 8-Bits 🕹️',
      category: 'skin',
      description: 'Estilo arcade retro de los 80s con tipografía pixelada y colores clásicos de consola.',
      cost: 120,
      icon: '🕹️',
      rarity: 'raro',
      accentClass: 'from-amber-600 to-stone-850',
      value: 'retro-8bit',
      levelRequired: 5
    },
    {
      id: 'skin-gold',
      title: 'Ejecutivo Oro 👔',
      category: 'skin',
      description: 'Edición especial de lujo total. Fondos oscuros profundos combinados con destellos de oro.',
      cost: 250,
      icon: '👑',
      rarity: 'legendario',
      accentClass: 'from-yellow-500 to-yellow-600',
      value: 'executive-gold',
      levelRequired: 8
    },
    {
      id: 'skin-ocean',
      title: 'Océano Profundo 🌊',
      category: 'skin',
      description: 'Diseño relajante de las profundidades marinas. Azules cian combinado con turquesas.',
      cost: 100,
      icon: '🐠',
      rarity: 'comun',
      accentClass: 'from-cyan-600 to-sky-900',
      value: 'deep-ocean',
      levelRequired: 3
    },
    // Accessories for the Mascot
    {
      id: 'accessory-hat',
      title: 'Sombrero de Copa 🎩',
      category: 'accessory',
      description: 'Dale a tu búho un toque distinguido y elegante con este sombrero aristocrático.',
      cost: 30,
      icon: '🎩',
      rarity: 'comun',
      accentClass: 'from-stone-600 to-slate-800',
      levelRequired: 1
    },
    {
      id: 'accessory-glasses',
      title: 'Lentes de Sol 😎',
      category: 'accessory',
      description: 'Perfectos para los turnos de tarde con alta intensidad y ventas soleadas.',
      cost: 25,
      icon: '😎',
      rarity: 'comun',
      accentClass: 'from-yellow-400 to-amber-500',
      levelRequired: 1
    },
    {
      id: 'accessory-corona',
      title: 'Corona Real 👑',
      category: 'accessory',
      description: 'Solo para los verdaderos monarcas del escaneo rápido. Brilla con autoridad suprema.',
      cost: 80,
      icon: '👑',
      rarity: 'epico',
      accentClass: 'from-yellow-350 to-amber-500',
      levelRequired: 4
    },
    {
      id: 'accessory-traje',
      title: 'Traje Ejecutivo 🕴️',
      category: 'accessory',
      description: 'Viste a tu búho para el éxito corporativo. Impecable saco y corbata oscuros.',
      cost: 60,
      icon: '🕴️',
      rarity: 'raro',
      accentClass: 'from-gray-700 to-zinc-900',
      levelRequired: 2
    },
    {
      id: 'accessory-capa',
      title: 'Capa de Superhéroe 🦸',
      category: 'accessory',
      description: 'Porque salvar rachas de ventas diarias es el trabajo de un verdadero héroe de caja.',
      cost: 100,
      icon: '🦸',
      rarity: 'legendario',
      accentClass: 'from-red-500 to-blue-600',
      levelRequired: 5
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
      accentClass: 'from-sky-300 to-[#1cb0f6]',
      levelRequired: 1
    },
    {
      id: 'power-xpboost',
      title: 'Poción de Doble XP (Booster🧪)',
      category: 'powerup',
      description: 'Multiplica por 2 todos los puntos de XP que consigas en tus próximas 3 ventas.',
      cost: 40,
      icon: '🧪',
      rarity: 'raro',
      accentClass: 'from-[#a435f0] to-[#b95fff]',
      levelRequired: 1
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
      value: 'Búho Supremo 🦉',
      levelRequired: 1
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
      value: 'Tiburón de Ventas 🦈',
      levelRequired: 1
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
      value: 'Banquero de Obsidiana 💎',
      levelRequired: 1
    },
    {
      id: 'title-rayo',
      title: 'Rango: El Rayo del Escaneo ⚡',
      category: 'title',
      description: 'El maestro indiscutido de las transacciones rápidas e implacables.',
      cost: 45,
      icon: '⚡',
      rarity: 'comun',
      accentClass: 'from-yellow-400 to-amber-500',
      value: 'El Rayo del Escaneo ⚡',
      levelRequired: 2
    },
    {
      id: 'title-cierre',
      title: 'Rango: Cierre Perfecto 💯',
      category: 'title',
      description: 'Fórmula perfecta: caja impecable, discrepancia cero, aplauso unánime.',
      cost: 70,
      icon: '💯',
      rarity: 'raro',
      accentClass: 'from-green-400 to-emerald-600',
      value: 'Cierre Perfecto 💯',
      levelRequired: 4
    },
    {
      id: 'title-cazador',
      title: 'Rango: Cazador de Facturas 🎯',
      category: 'title',
      description: 'Tu precisión para capturar RFCs y correos es legendaria.',
      cost: 55,
      icon: '🎯',
      rarity: 'comun',
      accentClass: 'from-blue-400 to-sky-600',
      value: 'Cazador de Facturas 🎯',
      levelRequired: 3
    },
    {
      id: 'title-leyenda',
      title: 'Rango: Leyenda del POS 🌟',
      category: 'title',
      description: 'El honor máximo alcanzable. El cielo de las finanzas sonríe ante tu racha.',
      cost: 200,
      icon: '🌟',
      rarity: 'legendario',
      accentClass: 'from-yellow-450 to-amber-600',
      value: 'Leyenda del POS 🌟',
      levelRequired: 7
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
      completedMissionsTimestamp: todayStr,
      weeklyXp: (user.weeklyXp ?? 0) + quest.xpReward
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
      unlockedBadges: updatedBadges,
      weeklyXp: (user.weeklyXp ?? 0) + trophy.xpReward
    };

    onUpdateUser(nextUser);
    toast.achievement(`¡Trofeo Conquistado! Unlocked [${trophy.title}] • +${trophy.xpReward} XP y +${trophy.gemReward} Gemas`, { title: 'Trofeo Desbloqueado 🏆' });
  };

  // Handle buying items in Virtual store
  const handleBuyItem = (item: StoreItem) => {
    // 1. Level-gating check
    if (item.levelRequired && user.level < item.levelRequired) {
      playSound('error');
      toast.error(`Necesitas ser nivel ${item.levelRequired} para canjear este artículo. Nivel actual: ${user.level}`, { title: 'Nivel Insuficiente 🔒' });
      return;
    }

    // 2. Cost/gems check
    if (currentGems < item.cost) {
      playSound('error');
      toast.error(`Gemas insuficientes. Necesitas ${item.cost} Gemas (Tienes ${currentGems})`, { title: 'Tienda Bloqueada 🔒' });
      return;
    }

    playSound('success');
    const remainingGems = currentGems - item.cost;
    let nextUser: User = { ...user, gems: remainingGems };

    if (item.category === 'skin' && item.value) {
      // Plan-based restrictions for skins
      if (item.id === 'skin-cyberpunk' || item.id === 'skin-emerald' || item.id === 'skin-gold') {
        if (licenseDetails.tier !== 'pro') {
          playSound('error');
          toast.error(`La Skin "${item.title}" requiere el Plan Pro. Actualiza tu plan en Ajustes > Planes.`, { title: 'Plan Pro Requerido 🔒' });
          return;
        }
      } else if (item.id === 'skin-galaxy' || item.id === 'skin-bubblegum' || item.id === 'skin-retro' || item.id === 'skin-ocean') {
        if (licenseDetails.tier === 'free') {
          playSound('error');
          toast.error(`La Skin "${item.title}" requiere el Plan Standard o Pro. Actualiza tu plan en Ajustes > Planes.`, { title: 'Plan Standard o Pro Requerido 🔒' });
          return;
        }
      }

      // Skin purchase
      const nextUnlockedSkins = [...unlockedSkinsList, item.id];
      nextUser = {
        ...nextUser,
        unlockedSkins: nextUnlockedSkins,
        activeSkin: item.value
      };
      toast.success(`Se ha comprado la Skin layout "${item.title}". ¡Equipada automáticamente!`, { title: 'Tienda DuoPOS 🛍️' });
    } 
    else if (item.category === 'accessory') {
      // Mascot accessory purchase
      const nextUnlockedAccessories = [...(user.unlockedAccessories || []), item.id];
      nextUser = {
        ...nextUser,
        unlockedAccessories: nextUnlockedAccessories,
        activeAccessory: item.id
      };
      toast.success(`Se ha comprado el accesorio "${item.title}". ¡Equipado automáticamente! 🦉✨`, { title: 'Tienda DuoPOS 🛍️' });
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

  const handleEquipAccessory = (item: StoreItem) => {
    playSound('click');
    const isCurrentlyEquipped = user.activeAccessory === item.id;
    const nextUser: User = {
      ...user,
      activeAccessory: isCurrentlyEquipped ? '' : item.id
    };
    onUpdateUser(nextUser);
    toast.info(isCurrentlyEquipped ? `Accesorio desequipado 🦉` : `Accesorio equipado: "${item.title}" 🦉✨`, { title: 'Personalización Visual 🔄' });
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
            <div className="bg-white border-2 border-green-200 p-1.5 rounded-3xl flex items-center justify-center shadow-md">
              <DuoMascot size={60} activeAccessory={user.activeAccessory} mood={(() => {
                const allDone = quests.every(q => q.current >= q.target);
                if (allDone) return 'happy' as DuoMood;
                return 'neutral' as DuoMood;
              })()} />
            </div>
            {/* Active equipped titles badge badge */}
            <span className="absolute -bottom-1 -right-1 bg-yellow-400 text-amber-950 font-black text-[9px] px-1.5 py-0.5 rounded-full border border-white leading-none shadow z-10">
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

      {/* SUB-TABS SELECTOR DE DUOPOS (Quests, Leagues, Map, Trophies, Store) */}
      <div className="flex border-b-2 border-gray-150 gap-1 sm:gap-2 overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => { playSound('click'); setActiveSubTab('quests'); }}
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
          onClick={() => { playSound('click'); setActiveSubTab('leagues'); }}
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
          onClick={() => { playSound('click'); setActiveSubTab('map'); }}
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
          onClick={() => { playSound('click'); setActiveSubTab('season'); }}
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
          onClick={() => { playSound('click'); setActiveSubTab('trophies'); }}
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
          onClick={() => { playSound('click'); setActiveSubTab('store'); }}
          className={`px-4 sm:px-6 py-3 font-black text-xs sm:text-sm uppercase tracking-wider border-b-4 -mb-0.5 transition-all outline-none shrink-0 ${
            activeSubTab === 'store'
              ? 'border-[#ff9600] text-[#ff9600] font-black'
              : 'border-transparent text-gray-400 hover:text-gray-655'
          }`}
        >
          🛍️ Tienda
        </button>
      </div>

      {/* TAB SUB-DISPLAY 1: DAILY QUESTS LIST */}
      {activeSubTab === 'quests' && (
        <div className="space-y-6">
          
          {/* Instructions banner */}
          <div className="bg-[#eefcf2] border-2 border-[#58cc02] rounded-3xl p-4.5 flex gap-3.5 items-start">
            <div className="flex-shrink-0"><DuoMascot size={36} activeAccessory={user.activeAccessory} mood="neutral" /></div>
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

      {/* TAB SUB-DISPLAY: LEAGUES */}
      {activeSubTab === 'leagues' && (
        <div className="space-y-6 text-left">
          {/* Header Card with current league information */}
          <div className="bg-gradient-to-r from-indigo-500 to-purple-650 rounded-3xl p-5 md:p-6 text-white flex flex-col md:flex-row items-center justify-between gap-5 border-b-[6px] border-indigo-750 shadow-md">
            <div className="flex items-center gap-4.5 text-center md:text-left flex-col md:flex-row">
              <div className="bg-white/10 p-4 h-16 w-16 rounded-2xl text-4xl flex items-center justify-center border border-white/20 shadow-inner select-none shrink-0 font-mono animate-pulse">
                {getLeagueIcon(user.employeeLeague || 'bronce')}
              </div>
              <div className="space-y-1">
                <span className="bg-indigo-850/55 text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-wider">Liga de Cajeros Semanal</span>
                <h3 className="text-2xl font-black tracking-tight">Liga {capitalize(user.employeeLeague || 'bronce')}</h3>
                <p className="text-xs text-indigo-100 font-semibold max-w-xl">
                  Competencia entre cajeros de la sucursal. Los 5 primeros ascienden de división y los 5 últimos descienden. ¡Suma XP con cada venta y cobra tu racha!
                </p>
              </div>
            </div>

            {/* Countdown widget */}
            <div className="bg-white/15 border border-white/20 p-3 px-4.5 rounded-2xl flex flex-col items-center md:items-end justify-center shrink-0">
              <span className="text-[10px] font-black text-indigo-200 uppercase tracking-widest leading-none">PRÓXIMO REINICIO</span>
              <span className="text-lg font-black font-mono tracking-tight mt-1 flex items-center gap-1.5">
                ⏱️ {countdownStr}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Leaderboard Column (2/3 width) */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white border-2 border-gray-250 border-b-6 rounded-3xl p-4 md:p-5 space-y-4">
                <div className="flex items-center justify-between border-b pb-3 border-gray-150">
                  <h4 className="font-extrabold text-[#3c3c3c] text-sm uppercase tracking-wider">Tabla de Clasificación</h4>
                  <span className="bg-indigo-50 border border-indigo-100 text-indigo-705 text-[10px] px-2 py-0.5 rounded-md font-black">
                    Participantes: {sortedLeaderboard.length}
                  </span>
                </div>

                <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto pr-1">
                  {sortedLeaderboard.map((participant, index) => {
                    const rank = index + 1;
                    const isUser = participant.isCurrentUser;
                    
                    // Zone formatting
                    let zoneBg = '';
                    let rankBadge = '';
                    if (rank <= 5) {
                      zoneBg = 'bg-green-50/45 hover:bg-green-50';
                      rankBadge = 'bg-green-500 text-white';
                    } else if (rank >= 11) {
                      zoneBg = 'bg-red-50/45 hover:bg-red-50';
                      rankBadge = 'bg-red-500 text-white';
                    } else {
                      zoneBg = 'hover:bg-gray-50';
                      rankBadge = 'bg-gray-100 text-gray-500 border border-gray-200';
                    }

                    return (
                      <div 
                        key={participant.id} 
                        className={`flex items-center justify-between p-3.5 transition-all rounded-xl my-1.5 ${zoneBg} ${
                          isUser ? 'ring-2 ring-indigo-400 bg-indigo-50/40 border border-indigo-250 font-extrabold shadow-sm' : ''
                        }`}
                      >
                        {/* Rank and Identity */}
                        <div className="flex items-center gap-3">
                          <span className={`h-6.5 w-6.5 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${rankBadge}`}>
                            {rank}
                          </span>
                          
                          <div className="bg-white border border-gray-200 p-1.5 h-10 w-10 rounded-xl flex items-center justify-center text-xl shadow-xs select-none">
                            {getAvatarEmoji(participant.avatar)}
                          </div>

                          <div className="space-y-0.5 text-left">
                            <span className={`text-xs text-gray-800 tracking-tight flex items-center gap-1.5 ${isUser ? 'font-black text-indigo-950 text-sm' : 'font-bold'}`}>
                              {participant.name}
                              {isUser && <span className="bg-indigo-650 text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded">TÚ</span>}
                            </span>
                            <span className="text-[10px] text-gray-400 font-extrabold flex items-center gap-1">
                              {rank <= 5 ? (
                                <span className="text-green-600">🔺 Zona de Ascenso</span>
                              ) : rank >= 11 ? (
                                <span className="text-red-500">🔻 Zona de Descenso</span>
                              ) : (
                                <span className="text-gray-405">🛡️ Zona Segura</span>
                              )}
                            </span>
                          </div>
                        </div>

                        {/* XP display */}
                        <div className="flex items-center gap-4">
                          <div className="text-right shrink-0">
                            <span className="text-sm font-black text-gray-700 font-mono">{participant.weeklyXp}</span>
                            <span className="text-[9px] font-black text-gray-400 block leading-none">XP</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Sidebar Column: Rules and Simulator (1/3 width) */}
            <div className="space-y-4 text-left">
              {/* Rules summary Card */}
              <div className="bg-white border-2 border-gray-250 border-b-6 rounded-3xl p-5 space-y-3.5">
                <h4 className="font-extrabold text-gray-800 text-sm uppercase tracking-wide flex items-center gap-1">
                  <span>ℹ️ Reglas de División</span>
                </h4>
                <div className="space-y-3 text-xs text-gray-500 font-semibold leading-relaxed">
                  <div className="flex items-start gap-2.5">
                    <span className="text-green-500 text-sm mt-0.5">🔺</span>
                    <p>
                      <strong>Zona de Ascenso (Top 5)</strong>: Finaliza la semana aquí para subir de liga y conseguir un ascenso de división 🏆✨.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="text-gray-400 text-sm mt-0.5">🛡️</span>
                    <p>
                      <strong>Zona Segura (Puestos 6-10)</strong>: Mantienes tu división actual. No hay cambios de tier.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="text-red-500 text-sm mt-0.5">🔻</span>
                    <p>
                      <strong>Zona de Descenso (Bottom 5)</strong>: Si estás por encima de la liga Bronce, bajarás de división al cierre de la semana ⚠️.
                    </p>
                  </div>
                </div>
              </div>

              {/* Simulation Card */}
              <div className="bg-indigo-50/50 border border-indigo-250 rounded-3xl p-5 space-y-4">
                <h4 className="font-black text-indigo-900 text-xs uppercase tracking-widest flex items-center gap-1">
                  <span>🕹️ Herramientas de Liga</span>
                </h4>
                <p className="text-xs text-indigo-955/70 font-semibold leading-normal">
                  Utiliza los simuladores de liga para probar instantáneamente la animación y progresión de las divisiones semanales:
                </p>
                <div className="flex flex-col gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={handleSimulateWeeklyXp}
                    className="w-full bg-white hover:bg-gray-50 border-2 border-indigo-200 border-b-4 text-[#3c3c3c] font-black text-xs py-2 px-3.5 rounded-xl transition-all active:translate-y-0.5 flex items-center justify-center gap-2"
                  >
                    ⚡ Simular +50 XP Semanal
                  </button>
                  <button
                    type="button"
                    onClick={handleSimulateLeagueEnd}
                    className="w-full bg-indigo-650 hover:bg-indigo-750 text-white font-black text-xs py-2 px-3.5 rounded-xl border-b-4 border-indigo-900 transition-all active:translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-105"
                  >
                    🏁 Simular Fin de Semana
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB SUB-DISPLAY: PROGRESSION MAP (🗺️ CAMINO DEL EMPRENDEDOR) */}
      {activeSubTab === 'map' && (
        <div className="space-y-6 text-left">
          <div className="bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-3xl p-5 md:p-6 text-white flex flex-col sm:flex-row items-center justify-between gap-5 border-b-[6px] border-cyan-705 shadow-md">
            <div className="space-y-1 text-center sm:text-left">
              <span className="bg-cyan-800/55 text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-wider">Progreso del Emprendedor</span>
              <h3 className="text-2xl font-black tracking-tight">Camino del Emprendedor DuoPOS</h3>
              <p className="text-xs text-cyan-100 font-semibold max-w-xl">
                Completa hitos operativos reales en el punto de venta para desbloquear cofres de gemas y coronarte como el Socio de Duo definitivo en la cima.
              </p>
            </div>
            <div className="bg-white/15 border border-white/20 p-3 px-4.5 rounded-2xl flex flex-col items-center justify-center shrink-0">
              <span className="text-[10px] font-black text-cyan-200 uppercase tracking-widest leading-none">HITOS RECLAMADOS</span>
              <span className="text-lg font-black font-mono tracking-tight mt-1">
                {user.progressionClaimed?.length || 0} / {nodesData.length}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Left: Interactive Isometric SVG Path Map (2/3 width) */}
            <div className="lg:col-span-2 flex flex-col items-center">
              <div className="w-full bg-[#1e293b] border-2 border-slate-700 rounded-3xl p-4 flex justify-center shadow-lg relative overflow-hidden iso-grid-bg min-h-[500px]">
                {/* SVG Isometric Render */}
                <svg width="600" height="800" className="w-full h-auto max-w-[600px] drop-shadow-md select-none">
                  <defs>
                    <filter id="glow-pulsing" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="5" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>

                  {/* Grid decorations (3D columns or rocks in background) */}
                  <text x="240" y="720" className="text-2xl opacity-60">🌲</text>
                  <text x="490" y="550" className="text-2xl opacity-60">🌳</text>
                  <text x="120" y="420" className="text-3xl opacity-75 animate-bounce" style={{ animationDuration: '3s' }}>🏝️</text>
                  <text x="480" y="320" className="text-2xl opacity-60">🌲</text>
                  <text x="100" y="210" className="text-3xl opacity-40 animate-pulse" style={{ animationDuration: '6s' }}>☁️</text>
                  <text x="500" y="140" className="text-3xl opacity-40 animate-pulse" style={{ animationDuration: '8s' }}>☁️</text>
                  
                  {/* Winding base pipeline (grey) */}
                  <path 
                    d="M 300,750 L 440,680 L 360,600 L 200,540 L 160,460 L 280,390 L 420,330 L 360,250 L 220,180 L 300,90"
                    stroke="#475569"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />

                  {/* Active segment pipeline (glowing/green or blue) */}
                  {points.slice(0, furthestUnlockedIndex + 1).length > 1 && (
                    <path 
                      d={activePathD}
                      stroke="#10b981"
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                      className="animate-pulse"
                    />
                  )}

                  {/* Render Isometric Pillars and Nodes */}
                  {nodesData.map((node, index) => {
                    const isClaimed = user.progressionClaimed?.includes(node.id) || false;
                    const isUnlocked = index === 0 || (user.progressionClaimed?.includes(nodesData[index - 1].id) || false);
                    const metricVal = getMetricValue(node.requirement.metric);
                    const isCompleted = metricVal >= node.requirement.target;
                    const isClaimable = isUnlocked && !isClaimed && isCompleted;
                    const isSelected = selectedNodeId === node.id;
                    
                    // Pillar metrics
                    const cx = node.x;
                    const cy = node.y;
                    const rx = 40;
                    const ry = 20;
                    const h = 20;

                    // Choose colors based on status
                    let topColor = '#64748b'; // Gray/locked
                    let leftColor = '#475569';
                    let rightColor = '#334155';

                    if (isClaimed) {
                      topColor = '#38bdf8'; // Blue/claimed
                      leftColor = '#0284c7';
                      rightColor = '#0369a1';
                    } else if (isClaimable) {
                      topColor = '#fbbf24'; // Yellow/claimable
                      leftColor = '#d97706';
                      rightColor = '#b45309';
                    } else if (isUnlocked) {
                      topColor = '#10b981'; // Green/unlocked in-progress
                      leftColor = '#059669';
                      rightColor = '#047857';
                    }

                    // Special Boss colors
                    if (node.type === 'boss' && !isClaimed) {
                      if (isClaimable) {
                        topColor = '#f59e0b';
                        leftColor = '#d97706';
                        rightColor = '#b45309';
                      } else {
                        topColor = '#ef4444'; // Red for Boss locked/active
                        leftColor = '#dc2626';
                        rightColor = '#b91c1c';
                      }
                    }

                    return (
                      <g 
                        key={node.id} 
                        className={`cursor-pointer group select-none transition-all duration-300 ${isSelected ? 'scale-105' : 'hover:scale-102'}`}
                        onClick={() => { playSound('click'); setSelectedNodeId(node.id); }}
                      >
                        {/* Selected pillar base shadow / ring */}
                        {isSelected && (
                          <ellipse cx={cx} cy={cy + 30} rx={rx + 8} ry={ry + 4} fill="none" stroke="#60a5fa" strokeWidth="2.5" strokeDasharray="4,4" className="animate-spin-slow" />
                        )}

                        {/* Left Side Face */}
                        <polygon 
                          points={`${cx - rx},${cy + ry} ${cx},${cy + 2 * ry} ${cx},${cy + 2 * ry + h} ${cx - rx},${cy + ry + h}`}
                          fill={leftColor}
                        />

                        {/* Right Side Face */}
                        <polygon 
                          points={`${cx},${cy + 2 * ry} ${cx + rx},${cy + ry} ${cx + rx},${cy + ry + h} ${cx},${cy + 2 * ry + h}`}
                          fill={rightColor}
                        />

                        {/* Top Diamond Face */}
                        <polygon 
                          points={`${cx},${cy} ${cx + rx},${cy + ry} ${cx},${cy + 2 * ry} ${cx - rx},${cy + ry}`}
                          fill={topColor}
                          stroke={isSelected ? '#ffffff' : '#ffffff22'}
                          strokeWidth={isSelected ? '2' : '1'}
                          filter={isClaimable ? 'url(#glow-pulsing)' : ''}
                        />

                        {/* Centered Node Icon/Emoji on Top Face */}
                        <text 
                          x={cx} 
                          y={cy + ry + 4} 
                          textAnchor="middle" 
                          className="font-extrabold text-sm select-none"
                          fill="#ffffff"
                        >
                          {isClaimed ? (
                            '✔️'
                          ) : node.type === 'chest' ? (
                            '🎁'
                          ) : node.type === 'boss' ? (
                            '👑'
                          ) : !isUnlocked ? (
                            '🔒'
                          ) : (
                            index + 1
                          )}
                        </text>
                      </g>
                    );
                  })}
                </svg>

                {/* Floating scroll reminder */}
                <div className="absolute bottom-3 right-3 bg-slate-800/80 border border-slate-700 text-white font-extrabold text-[9px] uppercase tracking-widest px-2.5 py-1 rounded-lg select-none">
                  🧭 Mapa Serpenteante 2.5D
                </div>
              </div>
            </div>

            {/* Right: Selected Node Details & Action Card (1/3 width) */}
            <div className="space-y-4">
              {(() => {
                const node = nodesData.find(n => n.id === selectedNodeId);
                if (!node) return null;
                
                const index = nodesData.indexOf(node);
                const isClaimed = user.progressionClaimed?.includes(node.id) || false;
                const isUnlocked = index === 0 || (user.progressionClaimed?.includes(nodesData[index - 1].id) || false);
                const metricVal = getMetricValue(node.requirement.metric);
                const isCompleted = metricVal >= node.requirement.target;
                const isClaimable = isUnlocked && !isClaimed && isCompleted;
                const pct = Math.min(Math.round((metricVal / node.requirement.target) * 100), 100);

                let headerBg = 'from-slate-700 to-slate-800';
                let typeLabel = 'HITO OPERATIVO';
                if (node.type === 'chest') {
                  headerBg = 'from-amber-500 to-amber-600';
                  typeLabel = '🎁 COFRE DE PREMIOS';
                } else if (node.type === 'boss') {
                  headerBg = 'from-red-500 to-red-600';
                  typeLabel = '👑 JEFE FINAL';
                } else if (isClaimed) {
                  headerBg = 'from-cyan-500 to-blue-600';
                } else if (isUnlocked) {
                  headerBg = 'from-green-500 to-emerald-600';
                }

                return (
                  <div className="bg-white border-2 border-gray-250 border-b-6 rounded-3xl overflow-hidden shadow-sm text-left">
                    {/* Header */}
                    <div className={`bg-gradient-to-r ${headerBg} p-4.5 text-white space-y-0.5`}>
                      <span className="bg-black/35 text-[7.5px] font-black uppercase px-2 py-0.5 rounded tracking-widest w-fit">
                        {typeLabel} #{index + 1}
                      </span>
                      <h4 className="text-base font-black tracking-tight">{node.title}</h4>
                    </div>

                    <div className="p-5 space-y-4.5">
                      <p className="text-xs text-gray-505 text-gray-500 font-semibold leading-relaxed">
                        {node.description}
                      </p>

                      {/* Requirement Metric Progress */}
                      <div className="space-y-1.5 bg-gray-50 border border-gray-150 p-3 rounded-xl">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Requisito de Desbloqueo</span>
                        <div className="flex justify-between items-center text-xs font-black text-gray-700 leading-none">
                          <span>{node.metricName}</span>
                          <span className={isCompleted ? 'text-green-600' : 'text-gray-500'}>
                            {metricVal} / {node.requirement.target}
                          </span>
                        </div>
                        
                        <div className="bg-gray-200 h-2 rounded-full overflow-hidden w-full mt-1">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${isCompleted ? 'bg-green-500' : 'bg-amber-400'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>

                      {/* Reward box */}
                      <div className="space-y-1">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Recompensa al Reclamar</span>
                        <div className="flex flex-wrap gap-2 pt-0.5">
                          <span className="bg-blue-50 border border-blue-100 text-blue-700 text-[10px] font-black px-2.5 py-1 rounded-lg">
                            +{node.reward.xp} XP
                          </span>
                          <span className="bg-amber-50 border border-amber-100 text-amber-700 text-[10px] font-black px-2.5 py-1 rounded-lg">
                            +{node.reward.gems} Gemas 💎
                          </span>
                        </div>
                        {node.id === 'node-4' && (
                          <span className="text-[10px] text-amber-700 font-bold block pt-1 animate-pulse">🎁 ¡Un accesorio de búlo sorpresa!</span>
                        )}
                        {node.id === 'node-8' && (
                          <span className="text-[10px] text-amber-700 font-bold block pt-1 animate-pulse">🎁 ¡Una skin de POS sorpresa!</span>
                        )}
                        {node.id === 'node-10' && (
                          <span className="text-[10px] text-amber-700 font-bold block pt-1 animate-pulse">👑 ¡Corona Real para el Búho!</span>
                        )}
                      </div>

                      {/* Claim Button Action */}
                      <div className="pt-2">
                        {isClaimed ? (
                          <button
                            type="button"
                            disabled
                            className="w-full bg-gray-100 border border-gray-200 text-gray-400 font-black text-xs uppercase py-2 px-4 rounded-xl cursor-not-allowed text-center"
                          >
                            Hito Reclamado ✔️
                          </button>
                        ) : isClaimable ? (
                          <button
                            type="button"
                            onClick={() => handleClaimNode(node.id)}
                            className="w-full bg-green-500 hover:bg-green-400 text-white font-black text-xs uppercase tracking-wider py-2 px-4 rounded-xl border-b-4 border-green-700 active:translate-y-0.5 active:border-b-0 cursor-pointer text-center animate-bounce shadow-md"
                          >
                            Reclamar Recompensa 🎉
                          </button>
                        ) : !isUnlocked ? (
                          <div className="text-center p-2 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                            <span className="text-gray-400 font-black text-xs uppercase block">HITO BLOQUEADO 🔒</span>
                            <span className="text-[9.5px] text-gray-400 font-semibold block leading-tight">Completa y reclama los hitos anteriores en el camino.</span>
                          </div>
                        ) : (
                          <div className="text-center p-2 bg-amber-50/50 border border-amber-100 rounded-xl space-y-1">
                            <span className="text-amber-700 font-black text-xs uppercase block">EN PROGRESO ⚡</span>
                            <span className="text-[9.5px] text-amber-650 font-semibold block leading-tight">Alcanza la meta en tu panel de ventas diario para poder reclamar.</span>
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* TAB SUB-DISPLAY 2: SEASON PASS */}
      {activeSubTab === 'season' && (
        <div className="space-y-6">
          {/* Main header banner card */}
          <div className="bg-gradient-to-r from-pink-500 via-[#ff4b93] to-red-500 border-2 border-pink-600 border-b-[8px] rounded-3xl p-6 text-white relative overflow-hidden shadow-md">
            {/* Background elements */}
            <div className="absolute right-0 top-0 opacity-10 text-[180px] leading-none pointer-events-none select-none font-bold">
              🎟️
            </div>
            
            <div className="relative z-10 space-y-4">
              <div className="flex flex-wrap justify-between items-center gap-3">
                <div className="space-y-1">
                  <span className="bg-white/25 backdrop-blur-xs text-white text-[10px] uppercase font-black px-2.5 py-0.5 rounded-lg">
                    Temporada Activa 📅
                  </span>
                  <h3 className="text-2xl md:text-3xl font-black tracking-tight">
                    🎟️ Pase de Temporada de Duo
                  </h3>
                  <p className="text-xs text-pink-100 font-extrabold max-w-xl">
                    ¡Acumula XP en el POS para desbloquear recompensas exclusivas! Cada venta y misión diaria te ayuda a avanzar en el pase de Duo.
                  </p>
                </div>
                
                {/* Simulated XP injection button for testing */}
                <button
                  type="button"
                  onClick={() => {
                    playSound('click');
                    const updatedUser = {
                      ...user,
                      seasonXp: (user.seasonXp ?? 0) + 150,
                      xp: user.xp + 150, // Keep in sync
                      weeklyXp: (user.weeklyXp ?? 0) + 150
                    };
                    onUpdateUser(updatedUser);
                    toast.success('¡Se simularon +150 XP de Temporada! Revisa las recompensas desbloqueadas.', { title: 'Simulación de XP' });
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
                  <span className="text-sm font-black font-mono">
                    {user.seasonXp ?? 0} XP
                  </span>
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

          {/* Active Event Promo Card if happy hour is running */}
          {activeEvent && activeEvent.type === 'happy_hour' && (
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 border-2 border-amber-600 border-b-[6px] rounded-3xl p-4.5 text-white flex justify-between items-center gap-4 animate-pulse">
              <div className="flex items-center gap-3">
                <span className="text-3xl">⚡</span>
                <div>
                  <h4 className="font-black text-sm uppercase tracking-wider">¡HORA FELIZ ACTIVA!</h4>
                  <p className="text-xs font-extrabold opacity-90">Todo el XP obtenido de ventas se duplica, ¡ideal para subir el Pase de Temporada!</p>
                </div>
              </div>
              <span className="text-lg font-mono font-black bg-black/10 px-3 py-1 rounded-xl">
                {Math.floor(activeEvent.remainingSeconds / 60)}:{(activeEvent.remainingSeconds % 60).toString().padStart(2, '0')}
              </span>
            </div>
          )}

          {/* Trigger events manually (demo control center) */}
          <div className="bg-white border-2 border-[#e5e5e5] border-b-4 rounded-3xl p-5 space-y-3">
            <h4 className="text-sm font-black text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
              <span>👾 Panel de Control de Eventos Express</span>
              <span className="bg-purple-100 text-purple-700 text-[9px] font-black uppercase px-2 py-0.5 rounded border border-purple-200">Pruebas en Vivo</span>
            </h4>
            <p className="text-xs text-gray-500 font-extrabold">
              Haz clic en cualquiera de los botones de abajo para disparar eventos express del cajero y simular el reto del POS en vivo:
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
                reward: { type: 'gems', value: 50, name: '50 Gemas 💎', icon: '💎', rarity: 'comun' }
              },
              {
                tier: 2,
                xpRequired: 250,
                reward: { type: 'xpBoost', value: 3, name: '3 Pociones de Doble XP 🧪', icon: '🧪', rarity: 'raro' }
              },
              {
                tier: 3,
                xpRequired: 450,
                reward: { type: 'accessory', value: 'accessory-hat', name: 'Sombrero de Copa 🎩', icon: '🎩', rarity: 'epico' }
              },
              {
                tier: 4,
                xpRequired: 700,
                reward: { type: 'gems', value: 100, name: '100 Gemas 💎', icon: '💎', rarity: 'raro' }
              },
              {
                tier: 5,
                xpRequired: 1000,
                reward: { type: 'skin', value: 'retro-8bit', name: 'Skin Retro 8-Bits 🕹️', icon: '🕹️', rarity: 'legendario' }
              },
              {
                tier: 6,
                xpRequired: 1400,
                reward: { type: 'title', value: 'Socio de Élite de Duo 👑🦉', name: 'Rango: Socio de Élite de Duo 👑🦉', icon: '👑', rarity: 'legendario' }
              }
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
                } 
                else if (tierItem.reward.type === 'xpBoost') {
                  const boosterVal = tierItem.reward.value as number;
                  const currentCharges = parseInt(localStorage.getItem('duo_pos_xp_booster_charges') || '0', 10);
                  localStorage.setItem('duo_pos_xp_booster_charges', (currentCharges + boosterVal).toString());
                  rewardMsg = `¡Has recibido ${boosterVal} Pociones de Doble XP 🧪! Úsalas en tus siguientes ventas.`;
                } 
                else if (tierItem.reward.type === 'accessory') {
                  const accId = tierItem.reward.value as string;
                  const currentAccessories = user.unlockedAccessories || [];
                  if (currentAccessories.includes(accId)) {
                    // Fallback to gems
                    nextUser.gems = (user.gems ?? 40) + 40;
                    nextUser.gemsEarnedTotal = (user.gemsEarnedTotal ?? 40) + 40;
                    rewardMsg = `Como ya tienes el Sombrero de Copa, ¡has recibido 40 Gemas 💎 de consolación!`;
                  } else {
                    nextUser.unlockedAccessories = [...currentAccessories, accId];
                    nextUser.activeAccessory = accId;
                    rewardMsg = `¡Has desbloqueado y equipado el Sombrero de Copa 🎩 para Duo!`;
                  }
                } 
                else if (tierItem.reward.type === 'skin') {
                  const skinVal = tierItem.reward.value as string;
                  const currentSkins = user.unlockedSkins || ['skin-standard'];
                  const skinId = `skin-${skinVal}`;
                  if (currentSkins.includes(skinId)) {
                    // Fallback to gems
                    nextUser.gems = (user.gems ?? 40) + 100;
                    nextUser.gemsEarnedTotal = (user.gemsEarnedTotal ?? 40) + 100;
                    rewardMsg = `Como ya tienes la Skin Retro, ¡has recibido 100 Gemas 💎 de consolación!`;
                  } else {
                    nextUser.unlockedSkins = [...currentSkins, skinId];
                    nextUser.activeSkin = skinVal;
                    rewardMsg = `¡Has desbloqueado y equipado la Skin Retro 8-Bits 🕹️!`;
                  }
                } 
                else if (tierItem.reward.type === 'title') {
                  const titleVal = tierItem.reward.value as string;
                  nextUser.levelTitle = titleVal;
                  rewardMsg = `¡Nuevo Rango Titular otorgado: "${titleVal}" ✨!`;
                }
                
                onUpdateUser(nextUser);
                toast.success(rewardMsg, { title: 'Recompensa del Pase 🎟️' });
              };

              const getRarityBadge = (rarity: string) => {
                switch (rarity) {
                  case 'comun': return <span className="text-[8px] bg-gray-100 text-gray-700 px-1.5 py-0.5 border border-gray-200 rounded font-black uppercase">Común</span>;
                  case 'raro': return <span className="text-[8px] bg-purple-100 text-purple-700 px-1.5 py-0.5 border border-purple-200 rounded font-black uppercase">Raro</span>;
                  case 'epico': return <span className="text-[8px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 border border-indigo-200 rounded font-black uppercase">Épico</span>;
                  case 'legendario': return <span className="text-[8px] bg-yellow-100 text-amber-800 px-1.5 py-0.5 border border-amber-300 rounded font-black uppercase animate-pulse">Legendario</span>;
                  default: return null;
                }
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
                  {/* Status Banner */}
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-gray-400">NIVEL {tierItem.tier}</span>
                    <span className="font-mono text-xs font-extrabold text-[#ff4b93] bg-pink-50 border border-pink-100 px-2 py-0.5 rounded-lg">
                      {tierItem.xpRequired} XP
                    </span>
                  </div>

                  {/* Reward Icon & details */}
                  <div className="flex items-center gap-4 py-2">
                    <div className={`p-4 h-16 w-16 rounded-2xl flex items-center justify-center text-4xl shadow-inner ${
                      isClaimed 
                        ? 'bg-gray-100' 
                        : isUnlocked 
                          ? 'bg-gradient-to-r from-pink-50 to-red-50 text-white' 
                          : 'bg-gray-100'
                    }`}>
                      <span className="select-none">{tierItem.reward.icon}</span>
                    </div>
                    <div className="text-left space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-sm font-black text-gray-800 leading-tight">
                          {tierItem.reward.name}
                        </h4>
                        {getRarityBadge(tierItem.reward.rarity)}
                      </div>
                      <p className="text-[10px] text-gray-400 font-extrabold leading-tight">
                        {tierItem.reward.type === 'gems' ? 'Moneda premium virtual' : 
                         tierItem.reward.type === 'xpBoost' ? 'Acelerador de experiencia' : 
                         tierItem.reward.type === 'accessory' ? 'Personaliza tu mascota' : 
                         tierItem.reward.type === 'skin' ? 'Tema estético global' : 'Título y Rango honorífico'}
                      </p>
                    </div>
                  </div>

                  {/* Action button */}
                  {isClaimed ? (
                    <button
                      type="button"
                      disabled
                      className="w-full bg-gray-100 border-2 border-gray-200 text-gray-400 font-black text-xs uppercase py-2.5 rounded-2xl flex items-center justify-center gap-1.5 leading-none"
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

          {/* Store Sub-Category Tab Selector */}
          <div className="flex border-b-2 border-gray-250 gap-4 overflow-x-auto scrollbar-none pb-0.5">
            {[
              { id: 'all', label: 'Todos 🌐' },
              { id: 'skin', label: 'Temas 🎨' },
              { id: 'accessory', label: 'Accesorios Duo 🦉' },
              { id: 'title', label: 'Títulos 📜' },
              { id: 'powerup', label: 'Potenciadores ⚡' }
            ].map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => { playSound('click'); setActiveStoreCategory(cat.id as any); }}
                className={`pb-2.5 px-2 text-xs font-black uppercase tracking-wider border-b-4 transition-all cursor-pointer shrink-0 ${
                  activeStoreCategory === cat.id
                    ? 'border-[#58cc02] text-[#58cc02]'
                    : 'border-transparent text-gray-400 hover:text-gray-650'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* List items segmented by style panels */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {storeItems
              .filter(item => activeStoreCategory === 'all' || item.category === activeStoreCategory)
              .map((item) => {
                // Check if they already own this item
                const isPurchasedSkin = item.category === 'skin' && unlockedSkinsList.includes(item.id);
                const isEquippedSkin = item.category === 'skin' && user.activeSkin === item.value;
                const isEquippedTitle = item.category === 'title' && user.levelTitle === item.value;
                const isPurchasedAccessory = item.category === 'accessory' && (user.unlockedAccessories || []).includes(item.id);
                const isEquippedAccessory = item.category === 'accessory' && user.activeAccessory === item.id;
                const isStreakFreezeOwned = item.id === 'power-streak' && (user.dailyStreakSavedCount ?? 0) > 0;

                // Check if currently equipped/applied
                const isEquipped = isEquippedSkin || isEquippedTitle || isEquippedAccessory;
                const isOwnedNotEquipped = isPurchasedSkin || isPurchasedAccessory;

                // Level requirements lock
                const isLevelLocked = item.levelRequired ? user.level < item.levelRequired : false;

                // Plan restrictions
                let isPlanLocked = false;
                let planRequiredName = '';
                if (item.category === 'skin') {
                  if (item.id === 'skin-cyberpunk' || item.id === 'skin-emerald' || item.id === 'skin-gold') {
                    if (licenseDetails.tier !== 'pro') {
                      isPlanLocked = true;
                      planRequiredName = 'Plan Pro';
                    }
                  } else if (item.id === 'skin-galaxy' || item.id === 'skin-bubblegum' || item.id === 'skin-retro' || item.id === 'skin-ocean') {
                    if (licenseDetails.tier === 'free') {
                      isPlanLocked = true;
                      planRequiredName = 'Standard o Pro';
                    }
                  }
                }

                return (
                  <div 
                    key={item.id}
                    className={`bg-white border-2 border-gray-250 border-b-6 rounded-3xl p-4 flex flex-col justify-between hover:border-gray-300 transition-all shadow-sm relative ${isLevelLocked ? 'opacity-80' : ''}`}
                  >
                    {isLevelLocked && (
                      <div className="absolute top-2 right-2 z-20 bg-stone-900/90 text-yellow-500 border border-yellow-500/30 text-[9px] font-black tracking-widest px-2.5 py-0.5 rounded-full uppercase flex items-center gap-0.5 shadow-md">
                        <span>🔒 NIVEL {item.levelRequired}</span>
                      </div>
                    )}

                    <div className="space-y-3">
                      
                      {/* Header item with color gradient banner representation */}
                      <div className={`h-24 w-full rounded-2xl bg-gradient-to-tr ${item.accentClass} flex items-center justify-center text-4xl shadow-inner relative border border-white/20 overflow-hidden ${isLevelLocked ? 'grayscale opacity-75' : ''}`}>
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
                        {item.category === 'accessory' && (
                          <span className="absolute bottom-2 right-2 bg-amber-900/60 text-amber-250 font-black text-[7.5px] tracking-wider px-2 py-0.5 rounded uppercase">
                            Accesorio Búho
                          </span>
                        )}
                        {item.category === 'powerup' && (
                          <span className="absolute bottom-2 right-2 bg-indigo-950/60 text-indigo-200 font-black text-[7.5px] tracking-wider px-2 py-0.5 rounded uppercase">
                            Activador
                          </span>
                        )}
                        {item.category === 'title' && (
                          <span className="absolute bottom-2 right-2 bg-emerald-950/60 text-emerald-250 font-black text-[7.5px] tracking-wider px-2 py-0.5 rounded uppercase">
                            Rango Rápido
                          </span>
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-extrabold text-[#3c3c3c] text-sm tracking-tight">{item.title}</h4>
                        </div>
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
                      {isLevelLocked ? (
                        <button
                          type="button"
                          disabled
                          className="bg-gray-100 border border-gray-200 text-gray-400 font-black text-[9px] uppercase tracking-wider py-1.5 px-3 rounded-xl select-none cursor-not-allowed flex items-center gap-1"
                        >
                          <span>🔒 Nivel {item.levelRequired}</span>
                        </button>
                      ) : isEquipped ? (
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
                          onClick={() => {
                            if (item.category === 'skin') {
                              handleEquipSkin(item);
                            } else if (item.category === 'accessory') {
                              handleEquipAccessory(item);
                            }
                          }}
                          className="bg-indigo-650 text-white font-black text-[9.5px] uppercase tracking-wider py-1.5 px-3 rounded-xl border-b-2 border-indigo-800 hover:bg-indigo-500 active:translate-y-0.5 active:border-b-0 cursor-pointer"
                        >
                          Equipar 🔄
                        </button>
                      ) : isPlanLocked ? (
                        <button
                          type="button"
                          onClick={() => {
                            playSound('error');
                            toast.error(`La recompensa "${item.title}" requiere el plan ${planRequiredName}. Actualiza tu licencia en Ajustes > Planes.`, { title: 'Plan Requerido 🔒' });
                          }}
                          className="bg-gray-100 border border-gray-200 text-gray-400 font-black text-[9px] uppercase tracking-wider py-1.5 px-3 rounded-xl cursor-not-allowed flex items-center gap-1"
                        >
                          <span>🔒 {planRequiredName}</span>
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
