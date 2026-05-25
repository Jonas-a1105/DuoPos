import React, { useState, useMemo } from 'react';
import { Customer, LeagueType, CashShift } from '../types';
import { 
  Search, Plus, Trash2, Award, Sparkles, Phone, Mail, Calendar, 
  TrendingUp, Gem, UserPlus, Trophy, Edit2, Wallet, ArrowDownLeft, 
  ArrowUpRight, CheckCircle, Clock, FileText, AlertTriangle, Check,
  Megaphone, Users, MessageSquare, Send, Gift, DollarSign, Zap
} from 'lucide-react';
import { playSound } from '../utils/sounds';

interface CustomersScreenProps {
  customers: Customer[];
  onAddCustomer: (customer: Omit<Customer, 'id' | 'registeredAt' | 'purchasesCount' | 'totalSpent' | 'gems' | 'league'> & { creditLimit?: number; creditUsed?: number; creditHistory?: any[] }) => void;
  onUpdateCustomer: (customer: Customer) => void;
  onDeleteCustomer: (id: string) => void;
  onGrantXp: (amount: number) => void;
  activeShift: CashShift | null;
  onAddShiftMovement: (type: 'in' | 'out', amount: number, reason: string) => void;
}

// Duolingo League Color and Emoji Map
export const LEAGUE_METADATA: Record<LeagueType, { name: string; color: string; bg: string; border: string; text: string; emoji: string; nextThreshold: number }> = {
  Bronce: { name: 'Bronce', color: '#cd7f32', bg: 'bg-[#faf2eb]', border: 'border-[#e6c2a4]', text: 'text-[#8a5229]', emoji: '🥉', nextThreshold: 150 },
  Plata: { name: 'Plata', color: '#c0c0c0', bg: 'bg-[#f2f2f2]', border: 'border-[#d9d9d9]', text: 'text-[#616161]', emoji: '🥈', nextThreshold: 300 },
  Oro: { name: 'Oro', color: '#ffd700', bg: 'bg-[#fffbeb]', border: 'border-[#fde047]', text: 'text-[#a16207]', emoji: '🥇', nextThreshold: 600 },
  Zafiro: { name: 'Zafiro', color: '#1cb0f6', bg: 'bg-[#f0f9ff]', border: 'border-[#bae6fd]', text: 'text-[#0369a1]', emoji: '🔹', nextThreshold: 1200 },
  Rubí: { name: 'Rubí', color: '#ff4b4b', bg: 'bg-[#fef2f2]', border: 'border-[#fecaca]', text: 'text-[#b91c1c]', emoji: '❤️', nextThreshold: 2500 },
  Esmeralda: { name: 'Esmeralda', color: '#58cc02', bg: 'bg-[#f0fdf4]', border: 'border-[#bbf7d0]', text: 'text-[#15803d]', emoji: '🟢', nextThreshold: 5000 },
  Obsidiana: { name: 'Obsidiana', color: '#4b4b4b', bg: 'bg-[#f4f4f5]', border: 'border-[#e4e4e7]', text: 'text-[#27272a]', emoji: '💎', nextThreshold: 99999 }
};

export default function CustomersScreen({
  customers,
  onAddCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
  onGrantXp,
  activeShift,
  onAddShiftMovement
}: CustomersScreenProps) {
  const [search, setSearch] = useState('');
  const [selectedLeague, setSelectedLeague] = useState<string>('all');
  const [subTab, setSubTab] = useState<'directory' | 'pending' | 'loyalty' | 'crm'>('directory');
  
  // Registration and editing states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [creditLimitVal, setCreditLimitVal] = useState('500');

  // Manual Gems tuning states
  const [manualGemsAdjustOpen, setManualGemsAdjustOpen] = useState<string | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustType, setAdjustType] = useState<'add' | 'deduct'>('add');

  // Customer detailed history state
  const [viewHistoryCust, setViewHistoryCust] = useState<Customer | null>(null);

  // Customer debt pay state
  const [payDebtCust, setPayDebtCust] = useState<Customer | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payNotes, setPayNotes] = useState('');

  // Loyalty Reward Store state variables
  const [loyaltySelectedCustId, setLoyaltySelectedCustId] = useState<string>('');
  const [rewardSuccessMsg, setRewardSuccessMsg] = useState<string>('');

  // CRM Marketing Campaigns states
  const [crmSegment, setCrmSegment] = useState<'all' | 'vip' | 'debtors' | 'inactive' | 'gem_rich'>('all');
  const [crmTemplate, setCrmTemplate] = useState<string>('reminder');
  const [crmMsg, setCrmMsg] = useState<string>(
    '⚠️ Recordatorio Amistoso DuoPOS: Estimado cliente, cuenta con un saldo pendiente de pago. Puede abonarlo en caja con efectivo, tarjeta o canjeando sus DuoPuntos acumulados. ¡Siga con su racha de compras hoy! 🦉'
  );
  const [crmChannel, setCrmChannel] = useState<'whatsapp' | 'sms' | 'email'>('whatsapp');
  const [crmBroadcasting, setCrmBroadcasting] = useState<boolean>(false);
  const [crmBroadcastProgress, setCrmBroadcastProgress] = useState<number>(0);
  const [crmBroadcastHistory, setCrmBroadcastHistory] = useState<{ id: string, date: string, campaign: string, targetCount: number, channel: string, rewardsInjected: number }[]>([
    {
      id: 'crmhist-1',
      date: new Date(Date.now() - 24*3600*1000).toISOString(),
      campaign: 'Incentivo de Racha (+50 Gemas Gratis) 🦉',
      targetCount: 3,
      channel: 'WhatsApp Web Bot',
      rewardsInjected: 150
    },
    {
      id: 'crmhist-2',
      date: new Date(Date.now() - 3*24*3600*1000).toISOString(),
      campaign: 'Aviso de Abono a Línea de Crédito 💸',
      targetCount: 2,
      channel: 'SMS Directo',
      rewardsInjected: 0
    }
  ]);

  // Core Math & Filters
  const totalOutstandingDebt = useMemo(() => {
    return customers.reduce((acc, c) => acc + (c.creditUsed || 0), 0);
  }, [customers]);

  const totalAuthorizedCredit = useMemo(() => {
    return customers.reduce((acc, c) => acc + (c.creditLimit || 0), 0);
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const matchesQuery = 
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.phone && c.phone.includes(search)) ||
        (c.email && c.email.toLowerCase().includes(search.toLowerCase()));
      
      const matchesLeague = selectedLeague === 'all' || c.league === selectedLeague;
      const matchesSubTab = subTab === 'directory' || (c.creditUsed && c.creditUsed > 0);

      return matchesQuery && matchesLeague && matchesSubTab;
    }).sort((a, b) => {
      if (subTab === 'pending') {
        return (b.creditUsed || 0) - (a.creditUsed || 0); // Highest debt first
      }
      return a.name.localeCompare(b.name); // Alphabetical
    });
  }, [customers, search, selectedLeague, subTab]);

  const handleOpenNewForm = () => {
    setName('');
    setPhone('');
    setEmail('');
    setCreditLimitVal('500');
    setEditingCustomer(null);
    setIsFormOpen(true);
    playSound('click');
  };

  const handleOpenEditForm = (cust: Customer) => {
    setName(cust.name);
    setPhone(cust.phone || '');
    setEmail(cust.email || '');
    setCreditLimitVal(cust.creditLimit !== undefined ? cust.creditLimit.toString() : '0');
    setEditingCustomer(cust);
    setIsFormOpen(true);
    playSound('click');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const parsedLimit = Number(creditLimitVal) || 0;

    if (editingCustomer) {
      // Edit mode
      const updated: Customer = {
        ...editingCustomer,
        name,
        phone,
        email,
        creditLimit: parsedLimit,
        creditUsed: editingCustomer.creditUsed !== undefined ? editingCustomer.creditUsed : 0,
        creditHistory: editingCustomer.creditHistory || []
      };
      onUpdateCustomer(updated);
      playSound('success');
    } else {
      // Add mode
      onAddCustomer({ 
        name, 
        phone, 
        email,
        creditLimit: parsedLimit,
        creditUsed: 0,
        creditHistory: []
      });
      playSound('levelup');
      onGrantXp(25); // Gamified registry task!
    }

    setIsFormOpen(false);
    setName('');
    setPhone('');
    setEmail('');
    setCreditLimitVal('500');
    setEditingCustomer(null);
  };

  const handleAdjustGems = (cust: Customer) => {
    const amount = parseInt(adjustAmount) || 0;
    if (amount <= 0) return;

    let updatedGems = cust.gems;
    if (adjustType === 'add') {
      updatedGems += amount;
      playSound('success');
    } else {
      updatedGems = Math.max(0, updatedGems - amount);
      playSound('click');
    }

    const updated: Customer = {
      ...cust,
      gems: updatedGems
    };
    onUpdateCustomer(updated);
    setManualGemsAdjustOpen(null);
    setAdjustAmount('');
  };

  // Debt payment (Abono de Deuda) handler
  const handleApplyPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payDebtCust) return;

    const amountToPay = Number(payAmount) || 0;
    const currentDebt = payDebtCust.creditUsed || 0;

    if (amountToPay <= 0) {
      alert('⚠️ El monto a abonar debe ser mayor a 0.');
      return;
    }
    if (amountToPay > currentDebt) {
      alert(`⚠️ No puedes abonar un monto ($${amountToPay.toFixed(2)}) superior a la deuda actual del cliente ($${currentDebt.toFixed(2)}).`);
      return;
    }

    const updatedUsed = Number((currentDebt - amountToPay).toFixed(2));
    const formattedNotes = payNotes.trim() ? payNotes.trim() : 'Abono registrado en módulo Clientes';

    const newHistoryRecord = {
      id: `chhist-${Date.now()}-${Math.floor(Math.random()*1000)}`,
      amount: amountToPay,
      type: 'pay' as const,
      date: new Date().toISOString(),
      notes: formattedNotes
    };

    const updatedCustomer: Customer = {
      ...payDebtCust,
      creditUsed: updatedUsed,
      creditHistory: [newHistoryRecord, ...(payDebtCust.creditHistory || [])]
    };

    // Update customer in parent app context
    onUpdateCustomer(updatedCustomer);

    // If change is registered and shift is active, prompt/inject movement to shift register
    if (activeShift) {
      onAddShiftMovement('in', amountToPay, `Abono Deuda - Cliente: ${payDebtCust.name}`);
    }

    playSound('kaching');
    onGrantXp(15); // reward for debt retrieval!
    setPayDebtCust(null);
    setPayAmount('');
    setPayNotes('');
  };

  // -------------------------------------------------------------
  // SEGMENTATION & CAMPAIGN COMPUTATIONS & HANDLERS
  // -------------------------------------------------------------
  const segmentedCRMCustomers = useMemo(() => {
    return customers.filter(c => {
      if (crmSegment === 'vip') {
        return c.league === 'Obsidiana' || c.league === 'Esmeralda' || c.league === 'Rubí' || c.totalSpent >= 500;
      }
      if (crmSegment === 'debtors') {
        return (c.creditUsed || 0) > 0;
      }
      if (crmSegment === 'inactive') {
        return c.purchasesCount <= 1;
      }
      if (crmSegment === 'gem_rich') {
        return c.gems >= 300;
      }
      return true; // all
    });
  }, [customers, crmSegment]);

  const handleTemplateChange = (tmplKey: string) => {
    setCrmTemplate(tmplKey);
    let messageText = '';
    if (tmplKey === 'reminder') {
      messageText = '⚠️ Recordatorio Amistoso DuoPOS: Estimado cliente, cuenta con un saldo pendiente de pago de $__DEB__. Puede abonarlo en caja con efectivo, tarjeta o canjeando sus DuoPuntos acumulados. ¡Siga con su racha de compras hoy! 🦉';
    } else if (tmplKey === 'vip_perk') {
      messageText = '💎 BENEFICIO EXCLUSIVO VIP: Hemos activado un multiplicador de 2.5x gemas en todas tus compras de esta semana por pertenecer a nuestra Liga de Honor. ¡Pasa hoy por tu punto de venta! ⚡';
    } else if (tmplKey === 'gift_gems') {
      messageText = '🎁 REGALO DUOPOS DE RACHA: ¡Felicidades! Queremos premiar tu constancia obsequiándote +100 GEMAS extra directamente a tu cuenta de cliente para canjear en nuestro catálogo de premios. 🦉🍩';
    } else if (tmplKey === 'reactivation') {
      messageText = '👋 ¡Te extrañamos en el POS! Presenta este mensaje directo en tu próxima compra y obtén un cupón de 10% de descuento automático. ¡Mantener activa tu racha es muy fácil! ⭐';
    }
    setCrmMsg(messageText);
    playSound('click');
  };

  const handleLaunchCampaign = () => {
    if (segmentedCRMCustomers.length === 0) {
      alert('⚠️ No hay clientes en este segmento para destinatarios de la campaña.');
      return;
    }
    
    setCrmBroadcasting(true);
    setCrmBroadcastProgress(0);
    playSound('swoosh');
    
    // Simulate broadcasting process step-by-step
    const interval = setInterval(() => {
      setCrmBroadcastProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          
          // Campaign logic execution on finish
          let rewardsApplied = 0;
          if (crmTemplate === 'gift_gems') {
            // Apply actual gift of 100 Gems to each client in the active segment!
            segmentedCRMCustomers.forEach(cust => {
              const updatedCust: Customer = {
                ...cust,
                gems: cust.gems + 100
              };
              onUpdateCustomer(updatedCust);
            });
            rewardsApplied = segmentedCRMCustomers.length * 100;
          }
          
          // Add record to simulated campaign log history
          const campaignName = 
            crmTemplate === 'reminder' ? 'Recordatorio de Deuda (Amigable)' :
            crmTemplate === 'vip_perk' ? 'Promoción VIP 2.5x Multiplicador' :
            crmTemplate === 'gift_gems' ? 'Inyección Masiva de Gemas (+100 G)' :
            'Campaña de Reactivación de Clientes';
          
          const channelName = 
            crmChannel === 'whatsapp' ? 'WhatsApp Web Bot' :
            crmChannel === 'sms' ? 'SMS Directo' : 'Email de Racha';

          const newLog = {
            id: `crmhist-${Date.now()}`,
            date: new Date().toISOString(),
            campaign: `${campaignName} 🚀`,
            targetCount: segmentedCRMCustomers.length,
            channel: channelName,
            rewardsInjected: rewardsApplied
          };

          setCrmBroadcastHistory(prevHist => [newLog, ...prevHist]);
          setCrmBroadcasting(false);
          
          playSound('levelup');
          onGrantXp(100); // 100 XP gained for large-scale marketing action!
          alert(`🎉 ¡Campaña enviada con éxito! Se transmitió a ${segmentedCRMCustomers.length} clientes. Ganaste +100 XP.`);
          return 100;
        }
        return prev + 25; // advance 25% each step
      });
    }, 450);
  };

  // -------------------------------------------------------------
  // REWARDS STORE REDEEMER HANDLER
  // -------------------------------------------------------------
  const handleRedeemReward = (reward: { name: string; cost: number; icon: string }) => {
    if (!loyaltySelectedCustId) {
      alert('⚠️ Para canjear, primero debes seleccionar un Cliente Activo de la lista en la Tienda.');
      return;
    }

    const selectedCust = customers.find(c => c.id === loyaltySelectedCustId);
    if (!selectedCust) {
      alert('⚠️ El cliente seleccionado ya no existe o es inválido.');
      return;
    }

    if (selectedCust.gems < reward.cost) {
      alert(`⚠️ Saldo insuficiente. El cliente ${selectedCust.name} tiene ${selectedCust.gems} Gemas, pero el cupón "${reward.name}" requiere ${reward.cost} Gemas.`);
      playSound('error');
      return;
    }

    // Deduct gems and apply update
    const updatedCust: Customer = {
      ...selectedCust,
      gems: selectedCust.gems - reward.cost,
      // Log it in credit history if they want, but loyalty redemptions are gem-based records.
      // We can append to credit history too for visibility!
      creditHistory: [
        {
          id: `crmredeem-${Date.now()}`,
          amount: 0,
          type: 'pay' as const, // Treat as informational deduction
          date: new Date().toISOString(),
          notes: `Canjeó Certificado: "${reward.name}" (${reward.icon}) - Deducción: ${reward.cost} G`
        },
        ...(selectedCust.creditHistory || [])
      ]
    };

    onUpdateCustomer(updatedCust);
    playSound('levelup');
    onGrantXp(30); // 30 XP employee bonus context

    setRewardSuccessMsg(`🎉 ¡Felicidades! Se canjeó con éxito "${reward.name}" para el cliente ${selectedCust.name}. Se le han debitado ${reward.cost} Gemas.`);
    setTimeout(() => {
      setRewardSuccessMsg('');
    }, 6000);
  };

  return (
    <div className="space-y-6 animate-fadeIn font-sans p-1 md:p-3 pb-12 text-gray-800">
      
      {/* HEADER WIDGET / HEADER HERO */}
      <div className="bg-[#1cb0f6] border-2 border-[#128bd0] border-b-8 rounded-3xl p-5 md:p-6 text-white relative overflow-hidden shadow-xs">
        <div className="absolute right-4 -bottom-3 opacity-15 text-8xl md:text-9xl select-none font-black translate-x-4">
          🎓
        </div>
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2">
            <span className="bg-[#ffd700] text-amber-950 text-[10px] font-black uppercase px-2 py-0.5 tracking-wider rounded-lg border border-white leading-none">
              Finanzas de Racha 💸
            </span>
            <span className="text-white text-xs font-bold font-mono">
              ★ Crédito Social y Fidelidad DuoPOS
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight leading-none">
            Clientes, Fiado y Líneas de Crédito
          </h2>
          <p className="text-xs md:text-sm text-sky-50 leading-relaxed max-w-xl font-bold">
            Configura límites a clientes de confianza, registra ventas a crédito directamente desde el POS y gestiona abonos parciales sumándolo directamente a tu cuadre de caja diario.
          </p>
        </div>
      </div>

      {/* SUB-TAB SELECTOR BAR */}
      <div className="flex flex-wrap justify-start border-b-2 border-gray-100 p-0.5 gap-1 select-none">
        <button
          onClick={() => { setSubTab('directory'); playSound('swoosh'); }}
          className={`py-2 px-4 text-xs font-black uppercase tracking-wide rounded-t-xl transition-all border-t-2 border-x-2 -mb-[2px] cursor-pointer flex items-center gap-1.5 ${
            subTab === 'directory'
              ? 'bg-white border-gray-200 border-b-white text-[#1cb0f6]'
              : 'bg-transparent border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          <span>📕</span>
          <span>Directorio de Clientes</span>
        </button>
        <button
          onClick={() => { setSubTab('pending'); playSound('swoosh'); }}
          className={`py-2 px-4 text-xs font-black uppercase tracking-wide rounded-t-xl transition-all border-t-2 border-x-2 -mb-[2px] cursor-pointer flex items-center gap-1.5 ${
            subTab === 'pending'
              ? 'bg-white border-gray-200 border-b-white text-[#ff4b4b]'
              : 'bg-transparent border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          <span>💸</span>
          <span>Cuentas Pendientes (Fiados)</span>
          {customers.filter(c => (c.creditUsed || 0) > 0).length > 0 && (
            <span className="bg-red-500 text-white text-[9px] font-black w-5 h-5 flex items-center justify-center rounded-full">
              {customers.filter(c => (c.creditUsed || 0) > 0).length}
            </span>
          )}
        </button>
        <button
          onClick={() => { setSubTab('loyalty'); playSound('swoosh'); }}
          className={`py-2 px-4 text-xs font-black uppercase tracking-wide rounded-t-xl transition-all border-t-2 border-x-2 -mb-[2px] cursor-pointer flex items-center gap-1.5 ${
            subTab === 'loyalty'
              ? 'bg-white border-gray-200 border-b-white text-[#e6b100]'
              : 'bg-transparent border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          <span>💎</span>
          <span>Tienda VIP & Fidelización</span>
        </button>
        <button
          onClick={() => { setSubTab('crm'); playSound('swoosh'); }}
          className={`py-2 px-4 text-xs font-black uppercase tracking-wide rounded-t-xl transition-all border-t-2 border-x-2 -mb-[2px] cursor-pointer flex items-center gap-1.5 ${
            subTab === 'crm'
              ? 'bg-white border-gray-200 border-b-white text-[#a435f0]'
              : 'bg-transparent border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          <span>🚀</span>
          <span>CRM & Campañas de Racha</span>
        </button>
      </div>

      {/* CORE STATS SUMMARY BOXES */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border-2 border-gray-200 rounded-2xl p-4 flex items-center gap-3.5 shadow-xs">
          <div className="bg-sky-50 text-sky-600 p-2 rounded-xl border border-sky-100 font-bold select-none text-xl w-10 h-10 flex items-center justify-center">
            👥
          </div>
          <div>
            <span className="text-[9px] uppercase font-black text-gray-400 block leading-tight">Clientes Activos</span>
            <span className="text-base font-black text-gray-850 leading-none">{customers.length}</span>
          </div>
        </div>

        <div className="bg-white border-2 border-gray-200 rounded-2xl p-4 flex items-center gap-3.5 shadow-xs">
          <div className="bg-rose-50 text-rose-600 p-2 rounded-xl border border-rose-100 font-bold select-none text-xl w-10 h-10 flex items-center justify-center">
            💸
          </div>
          <div>
            <span className="text-[9px] uppercase font-black text-gray-400 block leading-tight">Fiado por Cobrar</span>
            <span className="text-base font-black text-red-600 font-mono leading-none">
              ${totalOutstandingDebt.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="bg-white border-2 border-gray-200 rounded-2xl p-4 flex items-center gap-3.5 shadow-xs">
          <div className="bg-emerald-50 text-emerald-600 p-2 rounded-xl border border-emerald-100 font-bold select-none text-xl w-10 h-10 flex items-center justify-center">
            💳
          </div>
          <div>
            <span className="text-[9px] uppercase font-black text-gray-400 block leading-tight">Cartera Autorizada</span>
            <span className="text-base font-black text-[#58cc02] font-mono leading-none">
              ${totalAuthorizedCredit.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="bg-white border-2 border-gray-200 rounded-2xl p-4 flex items-center gap-3.5 shadow-xs">
          <div className="bg-amber-50 text-amber-600 p-2 rounded-xl border border-amber-100 font-bold select-none text-xl w-10 h-10 flex items-center justify-center">
            💎
          </div>
          <div>
            <span className="text-[9px] uppercase font-black text-gray-400 block leading-tight">Gemas de Canje</span>
            <span className="text-base font-black text-amber-500 font-mono leading-none">
              {customers.reduce((acc, c) => acc + c.gems, 0)} <span className="text-[10px] text-gray-450">G</span>
            </span>
          </div>
        </div>
      </div>

      {(subTab === 'directory' || subTab === 'pending') && (
        <>
          {/* SEARCH AND QUICK REGISTER ACTIONS BAR */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
        
        {/* Search bar */}
        <div className="relative w-full md:max-w-md">
          <span className="absolute left-3.5 top-2.5 text-gray-450">
            <Search size={18} strokeWidth={2.5} />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por Nombre, Teléfono o Email..."
            className="w-full pl-10 pr-4 py-2 bg-white border-2 border-gray-200 focus:border-[#1cb0f6] rounded-2xl font-bold text-xs outline-none transition-colors border-b-4"
          />
        </div>

        {/* League Selector filter & Add Button */}
        <div className="flex w-full md:w-auto items-center gap-2 shrink-0">
          <select
            value={selectedLeague}
            onChange={(e) => { setSelectedLeague(e.target.value); playSound('click'); }}
            className="bg-white border-2 border-gray-200 border-b-4 rounded-xl px-3.5 py-1.5 font-bold text-xs outline-none focus:border-[#1cb0f6] text-gray-700 max-w-xs cursor-pointer select-none"
          >
            <option value="all">Todas las Ligas 🏆</option>
            <option value="Bronce">🥉 Liga Bronce</option>
            <option value="Plata">🥈 Liga Plata</option>
            <option value="Oro">🥇 Liga Oro</option>
            <option value="Zafiro">🔹 Liga Zafiro</option>
            <option value="Rubí">❤️ Liga Rubí</option>
            <option value="Esmeralda">🟢 Liga Esmeralda</option>
            <option value="Obsidiana">💎 Liga Obsidiana</option>
          </select>

          <button
            onClick={handleOpenNewForm}
            className="flex-1 md:flex-none py-2 px-4 bg-[#58cc02] text-white border-b-4 border-[#3c9e01] hover:bg-[#61e002] active:translate-y-[2px] active:border-b-2 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <UserPlus size={15} strokeWidth={3} />
            <span>Nuevo Cliente (+25 XP)</span>
          </button>
        </div>
      </div>

      {/* DATA CARDS WRAPPER GRID */}
      {filteredCustomers.length === 0 ? (
        <div className="bg-white border-2 border-gray-200 border-b-4 rounded-3xl p-10 text-center space-y-3.5 max-w-md mx-auto">
          <span className="text-6xl block select-none">🔎</span>
          <h3 className="font-extrabold text-sm uppercase text-gray-700 tracking-tight">No se encontraron clientes</h3>
          <p className="text-xs text-gray-400 leading-relaxed font-bold">
            Intenta cambiar el criterio de búsqueda, el filtro de liga o crea un nuevo cliente.
          </p>
          <button
            onClick={handleOpenNewForm}
            className="mt-2 py-2 px-4 bg-[#1cb0f6] text-white border-b-4 border-[#128bd0] hover:bg-[#34beff] active:translate-y-[2px] rounded-xl font-black text-xs uppercase"
          >
            Registrar Cliente de Racha ⚡
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map((cust) => {
            const meta = LEAGUE_METADATA[cust.league] || LEAGUE_METADATA.Bronce;
            
            // Credit limit stats calculation
            const limit = cust.creditLimit || 0;
            const debt = cust.creditUsed || 0;
            const creditAvailable = Math.max(0, limit - debt);
            
            // Calculate progress of credit used
            const creditUsedPct = limit > 0 ? Math.min(100, Math.round((debt / limit) * 100)) : 0;
            
            // Color states based on credit percentage used
            let progressBgColor = 'bg-[#58cc02]'; // Safe Green
            let progressBorderColor = 'border-green-100';
            if (creditUsedPct >= 80) {
              progressBgColor = 'bg-[#ff4b4b] animate-pulse'; // Danger Red close to limit
              progressBorderColor = 'border-red-100';
            } else if (creditUsedPct >= 50) {
              progressBgColor = 'bg-amber-400'; // Warning Yellow
              progressBorderColor = 'border-amber-100';
            }

            return (
              <div 
                key={cust.id} 
                className={`bg-white border-2 border-b-6 rounded-3xl p-5 hover:border-gray-300 transition-all space-y-4 relative flex flex-col justify-between ${
                  debt > 0 ? 'border-red-300 hover:border-red-400' : 'border-gray-200'
                }`}
              >
                {/* Header block details with League Badge */}
                <div className="space-y-2">
                  <div className="flex justify-between items-start gap-1">
                    <h3 className="text-base font-black text-gray-850 truncate max-w-[150px]" title={cust.name}>
                      {cust.name}
                    </h3>
                    
                    {/* Badge */}
                    <div className={`${meta.bg} ${meta.border} ${meta.text} border text-[9px] font-black uppercase px-2 py-0.5 rounded-lg flex items-center gap-1 select-none`}>
                      <span>{meta.emoji}</span>
                      <span>LIGA {meta.name}</span>
                    </div>
                  </div>

                  {/* Contact records */}
                  <div className="space-y-1 text-xs text-gray-500 font-bold font-sans">
                    {cust.phone && (
                      <p className="flex items-center gap-1.5">
                        <Phone size={11} className="text-gray-400" />
                        <span>{cust.phone}</span>
                      </p>
                    )}
                    {cust.email ? (
                      <p className="flex items-center gap-1.5 truncate">
                        <Mail size={11} className="text-gray-400" />
                        <span className="truncate">{cust.email}</span>
                      </p>
                    ) : (
                      <p className="text-[10px] text-gray-300 font-medium italic">Sin correo registrado</p>
                    )}
                  </div>
                </div>

                {/* LINEA DE CREDITO ("FIADO") DETAILS */}
                <div className="bg-gray-50 border p-3 rounded-2xl space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-black">
                    <span className="text-gray-400 uppercase tracking-widest flex items-center gap-0.5">
                      <span>📝</span> Línea de Crédito ("Fiado")
                    </span>
                    {limit > 0 ? (
                      <span className="font-mono text-gray-500 font-bold">
                        Cupo: ${limit.toFixed(0)}
                      </span>
                    ) : (
                      <span className="text-gray-400 uppercase font-black tracking-wide text-[9px]">Sin Autorizar</span>
                    )}
                  </div>

                  {limit > 0 ? (
                    <div className="space-y-1.5">
                      {/* Debt balances */}
                      <div className="flex justify-between text-xs font-black">
                        <div className="flex flex-col">
                          <span className="text-[8px] text-gray-400 uppercase leading-none">Deuda Activa</span>
                          <span className={`text-sm font-mono mt-0.5 ${debt > 0 ? 'text-red-500' : 'text-gray-500'}`}>
                            ${debt.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-[8px] text-gray-400 uppercase leading-none">Cupo Disponible</span>
                          <span className="text-sm font-mono text-[#58cc02] mt-0.5">
                            ${creditAvailable.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Debt Progression loading bar */}
                      <div className="w-full h-3.5 bg-gray-200 rounded-full overflow-hidden border p-0.5">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${progressBgColor}`} 
                          style={{ width: `${creditUsedPct}%` }}
                        />
                      </div>

                      <div className="flex justify-between items-center text-[8px] text-gray-400 uppercase font-extrabold leading-none">
                        <span>Porcentaje de cupo usado:</span>
                        <span className={debt > 0 ? 'text-red-500 font-black' : 'text-gray-400'}>
                          {creditUsedPct}%
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-1 bg-white border border-[#e5e5e5] rounded-xl">
                      <p className="text-[10px] text-gray-400 font-bold leading-normal">
                        No tiene permitido comprar a crédito.
                      </p>
                      <button
                        onClick={() => handleOpenEditForm(cust)}
                        className="text-[9px] text-[#1cb0f6] font-black uppercase mt-0.5 hover:underline cursor-pointer"
                      >
                        Autorizar Crédito ⚡
                      </button>
                    </div>
                  )}
                </div>

                {/* Loyalty accumulation summaries */}
                <div className="flex items-center justify-between border-t border-dashed border-gray-150 pt-3 text-xs">
                  <div className="flex items-center gap-1.5 select-none shrink-0 font-bold">
                    <span className="text-lg">💎</span>
                    <div>
                      <span className="text-[8px] uppercase font-black text-gray-400 block leading-tight">Gemas Loyalty</span>
                      <span className="text-xs font-black text-[#58cc02] font-mono leading-none">{cust.gems} <span className="text-[9px] text-gray-400">G</span></span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[8px] uppercase font-black text-gray-400 block leading-none">Compras de Racha</span>
                    <span className="text-xs font-black text-gray-500 font-mono inline-block">
                      {cust.purchasesCount} ventas
                    </span>
                  </div>
                </div>

                {/* Operations buttons */}
                <div className="grid grid-cols-4 gap-1 pt-1 border-t border-gray-100 bg-[#fafafa] -mx-5 -mb-5 p-3 rounded-b-3xl">
                  {/* Edit profile info */}
                  <button
                    onClick={() => handleOpenEditForm(cust)}
                    className="py-1.5 px-0.5 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl font-bold text-[9px] flex items-center justify-center gap-0.5 text-gray-600 cursor-pointer shadow-2xs border-b-4 hover:border-b-2 active:translate-y-[2px]"
                    title="Editar Cliente"
                  >
                    <Edit2 size={9} />
                    <span>Editar</span>
                  </button>

                  {/* Estado de Cuenta */}
                  <button
                    onClick={() => { setViewHistoryCust(cust); playSound('click'); }}
                    className="py-1.5 px-0.5 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl font-bold text-[9px] flex items-center justify-center gap-0.5 text-[#1cb0f6] cursor-pointer shadow-2xs border-b-4 hover:border-b-2 active:translate-y-[2px]"
                    title="Ver Historial / Estado de Cuenta"
                  >
                    <FileText size={9} />
                    <span>Historial</span>
                  </button>

                  {/* Abono de Deuda */}
                  <button
                    onClick={() => { setPayDebtCust(cust); setPayAmount(cust.creditUsed ? cust.creditUsed.toString() : ''); playSound('click'); }}
                    disabled={!cust.creditUsed || cust.creditUsed <= 0}
                    className={`py-1.5 px-0.5 rounded-xl font-bold text-[9px] flex items-center justify-center gap-0.5 cursor-pointer shadow-2xs border-b-4 hover:border-b-2 active:translate-y-[2px] transition-all ${
                      cust.creditUsed && cust.creditUsed > 0
                        ? 'bg-[#58cc02] border-[#46a302] hover:bg-[#61e002] text-white'
                        : 'bg-gray-100 border-gray-200 text-gray-300 opacity-50 cursor-not-allowed border-b-2'
                    }`}
                    title="Registrar Abono / Pago"
                  >
                    <Wallet size={9} />
                    <span>Abonar</span>
                  </button>

                  {/* Delete Customer */}
                  <button
                    onClick={() => {
                      if (confirm(`¿Estás seguro de que deseas eliminar a ${cust.name}? El historial cargado persistirá pero ya no acumulará gemas.`)) {
                        onDeleteCustomer(cust.id);
                        playSound('error');
                      }
                    }}
                    className="py-1.5 px-0.5 bg-white border border-gray-200 hover:border-red-100 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-xl font-bold text-[9px] flex items-center justify-center gap-0.5 cursor-pointer shadow-2xs border-b-4 hover:border-b-2 active:translate-y-[2px]"
                  >
                    <Trash2 size={9} />
                    <span>Eliminar</span>
                  </button>
                </div>

                {/* Sub Adjustment quick Gems tool */}
                {manualGemsAdjustOpen === cust.id && (
                  <div className="absolute inset-0 z-10 bg-white/95 backdrop-blur-xs rounded-3xl p-4 flex flex-col justify-center space-y-3">
                    <span className="text-[10px] uppercase font-black text-gray-400 block tracking-wider text-center">
                      Ajustar Gemas Manuales - {cust.name}
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => { setAdjustType('add'); playSound('click'); }}
                        className={`py-1 rounded-xl text-xs font-black border text-center cursor-pointer ${
                          adjustType === 'add' ? 'bg-[#58cc02] border-[#58cc02] text-white' : 'bg-white'
                        }`}
                      >
                        📈 Sumar (+)
                      </button>
                      <button
                        type="button"
                        onClick={() => { setAdjustType('deduct'); playSound('click'); }}
                        className={`py-1 rounded-xl text-xs font-black border text-center cursor-pointer ${
                          adjustType === 'deduct' ? 'bg-red-500 border-red-500 text-white' : 'bg-white'
                        }`}
                      >
                        📉 Restar (-)
                      </button>
                    </div>

                    <div className="relative">
                      <span className="absolute left-3 top-1.5 font-mono font-black text-[#58cc02] text-xs">G</span>
                      <input
                        type="number"
                        value={adjustAmount}
                        onChange={(e) => setAdjustAmount(e.target.value)}
                        placeholder="Cantidad de Gemas..."
                        className="w-full pl-7 pr-3 py-1 border border-gray-200 rounded-xl font-black font-mono text-xs outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleAdjustGems(cust)}
                        className="py-1.5 bg-[#1cb0f6] text-white rounded-xl font-bold text-xs uppercase cursor-pointer"
                      >
                        Aplicar
                      </button>
                      <button
                        onClick={() => { setManualGemsAdjustOpen(null); setAdjustAmount(''); playSound('click'); }}
                        className="py-1.5 bg-gray-150 rounded-xl font-bold text-xs text-gray-650 cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}
        </>
      )}

      {/* -------------------------------------------------------------
          LOYALTY PROGRAM & VIP REWARDS STORE SUB-TAB VIEW
          ------------------------------------------------------------- */}
      {subTab === 'loyalty' && (
        <div className="space-y-6 animate-fadeIn text-left text-gray-850">
          {/* LOYALTY SUMMARY HEADER */}
          <div className="bg-amber-100 border-2 border-amber-300 rounded-3xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="space-y-1.5 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-1.5 text-amber-800 font-extrabold text-sm uppercase">
                <span>🏆</span> Multiplicadores por Liga de Honor DuoPOS
              </div>
              <p className="text-xs text-amber-700 leading-relaxed font-bold">
                Los clientes acumulan gemas por cada venta finalizada. A mayor estatus de racha (liga de honor), mayor es su multiplicador de velocidad de gemas en el punto de venta.
              </p>
            </div>
          </div>

          {/* BRACKETS LIST */}
          <div className="bg-white border-2 border-gray-200 border-b-6 rounded-3xl p-5 text-left">
            <h3 className="text-xs font-black uppercase text-gray-400 tracking-wider mb-3.5">
              Multiplicadores de Liga Vigentes & Distribución de Clientes
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
              {Object.keys(LEAGUE_METADATA).map((leagueKey) => {
                const meta = LEAGUE_METADATA[leagueKey as LeagueType];
                const count = customers.filter(c => c.league === leagueKey).length;
                let mul = "1.0x";
                if (leagueKey === 'Plata') mul = "1.1x";
                if (leagueKey === 'Oro') mul = "1.2x";
                if (leagueKey === 'Zafiro') mul = "1.3x";
                if (leagueKey === 'Rubí') mul = "1.5x";
                if (leagueKey === 'Esmeralda') mul = "1.8x";
                if (leagueKey === 'Obsidiana') mul = "2.5x";

                return (
                  <div key={leagueKey} className={`${meta.bg} ${meta.border} border-2 rounded-2xl p-2.5 text-center flex flex-col justify-between hover:scale-[1.02] transition-transform`}>
                    <div>
                      <span className="text-2xl mt-1 block">{meta.emoji}</span>
                      <span className={`text-[10px] font-black uppercase block ${meta.text} mt-1`}>{meta.name}</span>
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-dashed border-gray-200">
                      <span className="text-xs font-black font-mono text-gray-700 block">{mul} Bonus</span>
                      <span className="text-[9px] font-extrabold text-gray-400 block uppercase mt-0.5">{count} Clientes</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* REWARDS STORE SECTOR */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
            {/* REDEEM CONTROL PANEL (LEFT) */}
            <div className="bg-white border-2 border-gray-200 border-b-6 rounded-3xl p-5 lg:col-span-1 space-y-4">
              <div className="flex items-center gap-1.5 border-b pb-2">
                <span className="text-xl">🛍️</span>
                <div>
                  <h3 className="text-xs font-black uppercase text-gray-700">Canjeador Al Instante</h3>
                  <p className="text-[9px] text-gray-400 font-bold uppercase">Procesa cupones físicos o descuentos</p>
                </div>
              </div>

              {rewardSuccessMsg && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-3 text-xs font-bold leading-normal animate-pulse">
                  {rewardSuccessMsg}
                </div>
              )}

              {/* SELECT CUSTOMER */}
              <div className="space-y-1.5 text-left">
                <label className="text-[10px] uppercase font-black text-gray-400 block tracking-wider">
                  Selecciona el Cliente de la Racha
                </label>
                <select
                  value={loyaltySelectedCustId}
                  onChange={(e) => { setLoyaltySelectedCustId(e.target.value); playSound('click'); }}
                  className="w-full bg-white border-2 border-gray-200 border-b-4 rounded-xl px-3 py-2 font-bold text-xs select-none outline-none focus:border-[#e6b100] text-gray-700 cursor-pointer"
                >
                  <option value="">-- Buscar & Elegir Cliente --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} (💎 {c.gems} Gemas)
                    </option>
                  ))}
                </select>
                {loyaltySelectedCustId && (
                  (() => {
                    const sel = customers.find(c => c.id === loyaltySelectedCustId);
                    if (!sel) return null;
                    const meta = LEAGUE_METADATA[sel.league] || LEAGUE_METADATA.Bronce;
                    return (
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2 mt-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-black text-gray-700">Estatus de Lealtad:</span>
                          <span className={`${meta.bg} ${meta.border} ${meta.text} border text-[9px] font-black uppercase px-2 py-0.5 rounded-lg flex items-center gap-1 select-none`}>
                            <span>{meta.emoji}</span> {meta.name}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs font-bold font-mono">
                          <span>Gemas Disponibles:</span>
                          <span className="text-[#58cc02] font-black">{sel.gems} G</span>
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>
            </div>

            {/* CATALOGUE (RIGHT 2 COLS) */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white border-2 border-gray-200 border-b-6 rounded-3xl p-5 space-y-4">
                <div className="flex justify-between items-center border-b pb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xl">🎁</span>
                    <div className="text-left">
                      <h3 className="text-xs font-black uppercase text-gray-750">Catálogo de Cupones y Recompensas Oficiales DuoPOS</h3>
                      <p className="text-[9px] text-gray-400 font-bold uppercase">Haz click en canjear para debitar las gemas del cliente</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { id: 'item-1', name: 'Canje Refresco / Bebida Helada Gratis', cost: 100, icon: '🥤', desc: 'Bebida de lata a elegir en mostrador. Válido un uso inmediato.' },
                    { id: 'item-2', name: 'Descuento de $50 MXN en venta activa', cost: 200, icon: '🎟️', desc: 'Aplica cupón para descontar directo sobre el total de la compra.' },
                    { id: 'item-3', name: 'Rebanada de Pizza Familiar de Jamón', cost: 350, icon: '🍕', desc: 'Aplica para comida caliente o lunch del día. ¡Canje de racha!' },
                    { id: 'item-4', name: 'Mochila Oficial DuoAcademy', cost: 500, icon: '🎒', desc: 'Regalo físico de edición limitada con bordado premium de la racha.' },
                    { id: 'item-5', name: 'Peluche Auténtico de Duo (Búho)', cost: 1000, icon: '🦉', desc: 'Premio supremo de coleccionista. Otorgable solo a ligas de Honor.' }
                  ].map((reward) => {
                    const isAffordable = (() => {
                      if (!loyaltySelectedCustId) return false;
                      const sel = customers.find(c => c.id === loyaltySelectedCustId);
                      return sel ? sel.gems >= reward.cost : false;
                    })();

                    return (
                      <div 
                        key={reward.id} 
                        className={`border-2 rounded-2xl p-4.5 flex flex-col justify-between transition-all text-left ${
                          isAffordable 
                            ? 'border-yellow-200 bg-yellow-50/50 hover:bg-yellow-50' 
                            : 'border-gray-200 bg-white opacity-85'
                        }`}
                      >
                        <div className="space-y-1 text-left">
                          <div className="flex items-center justify-between">
                            <span className="text-2xl">{reward.icon}</span>
                            <span className="bg-amber-400 text-amber-950 text-[10px] font-black uppercase px-2 py-0.5 rounded-lg border border-amber-300 font-mono">
                              {reward.cost} Gemas
                            </span>
                          </div>
                          <h4 className="text-xs font-black text-gray-800 leading-snug mt-1.5">{reward.name}</h4>
                          <p className="text-[10px] text-gray-500 font-medium leading-relaxed mt-0.5">{reward.desc}</p>
                        </div>

                        <button
                          onClick={() => handleRedeemReward(reward)}
                          className={`w-full py-2 border-b-4 font-black text-[10px] uppercase tracking-wide rounded-xl mt-3.5 transition-all text-center cursor-pointer ${
                            isAffordable
                              ? 'bg-amber-400 hover:bg-amber-500 text-amber-950 border-amber-600'
                              : 'bg-gray-100 hover:bg-gray-150 border-gray-300 text-gray-400 cursor-not-allowed border-b-2'
                          }`}
                        >
                          {isAffordable ? 'Canjear Premio ⚡' : 'Saldo Insuficiente'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          CRM MARKETING ENGINE & SMART SEGMENTATION SUB-TAB VIEW
          ------------------------------------------------------------- */}
      {subTab === 'crm' && (
        <div className="space-y-6 animate-fadeIn text-left text-gray-850">
          {/* INTRO HERO */}
          <div className="bg-indigo-550 border-2 border-indigo-750 text-white rounded-3xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-1.5 text-[#fffbeb] font-black text-sm uppercase">
                <Megaphone size={16} />
                <span>Motor CRM Avanzado & Inteligencia de Difusión</span>
              </div>
              <p className="text-xs text-indigo-100 leading-relaxed font-bold">
                Segmenta elegantemente a tus clientes basándote en su comportamiento de compra, saldos por cobrar o gemas acumuladas. Lanza campañas promocionales para reactivar ventas.
              </p>
            </div>
            <div className="shrink-0 flex items-center gap-1.5 bg-white text-indigo-950 border-2 border-indigo-200 py-1.5 px-3 rounded-2xl font-black text-xs">
              <Users size={14} className="text-indigo-600" />
              <span>{customers.length} Clientes Activos</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
            {/* DESIGNER & COUPLING CONTROL PANEL (LEFT 2 COLS) */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white border-2 border-gray-200 border-b-6 rounded-3xl p-5 space-y-4 text-left">
                <div className="flex items-center gap-2 border-b pb-2">
                  <span className="text-xl">🛠️</span>
                  <div className="text-left">
                    <h3 className="text-xs font-black uppercase text-gray-750">Configurador de Campaña de Marketing</h3>
                    <p className="text-[9px] text-gray-400 font-bold uppercase">Define el público objetivo, plantilla de mensaje y canal de salida</p>
                  </div>
                </div>

                {crmBroadcasting && (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 text-center space-y-2 animate-pulse">
                    <p className="text-xs font-black text-indigo-800 uppercase flex items-center justify-center gap-1">
                      <Zap size={14} className="animate-bounce" /> Transmitiendo Campaña en Tiempo Real...
                    </p>
                    <div className="w-full bg-indigo-100 h-4 rounded-full overflow-hidden border">
                      <div className="bg-indigo-600 h-full rounded-full transition-all duration-300" style={{ width: `${crmBroadcastProgress}%` }} />
                    </div>
                    <span className="text-[10px] text-indigo-500 font-bold block">{crmBroadcastProgress}% Procesado</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                  {/* Segment selection */}
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] uppercase font-black text-gray-400 block tracking-wider font-sans">
                      1. Segmentar Destinatarios
                    </label>
                    <select
                      value={crmSegment}
                      onChange={(e) => { setCrmSegment(e.target.value as any); playSound('click'); }}
                      className="w-full bg-white border-2 border-gray-200 border-b-4 rounded-xl px-3 py-2 font-bold text-xs select-none outline-none focus:border-[#a435f0] text-gray-700 cursor-pointer"
                    >
                      <option value="all">Filtro: Todos los Clientes ({customers.length})</option>
                      <option value="vip">Filtro: Liga Honor (Rubí, Esmeralda, Obsidiana) ({customers.filter(c => c.league === 'Rubí' || c.league === 'Esmeralda' || c.league === 'Obsidiana' || c.totalSpent >= 500).length})</option>
                      <option value="debtors">Filtro: Clientes con Deuda Activa ("Fiados") ({customers.filter(c => (c.creditUsed || 0) > 0).length})</option>
                      <option value="inactive">Filtro: Inactivos / Pasivos (≤ 1 compra) ({customers.filter(c => c.purchasesCount <= 1).length})</option>
                      <option value="gem_rich">Filtro: Rancheros de Gemas (≥ 300 G) ({customers.filter(c => c.gems >= 300).length})</option>
                    </select>
                  </div>

                  {/* Channel selection */}
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] uppercase font-black text-gray-400 block tracking-wider">
                      2. Canal de Comunicación Directo
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { key: 'whatsapp', label: 'WhatsApp', icon: '💬' },
                        { key: 'sms', label: 'SMS Directo', icon: '📱' },
                        { key: 'email', label: 'Email Racha', icon: '✉️' }
                      ].map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => { setCrmChannel(item.key as any); playSound('click'); }}
                          className={`py-2 px-1.5 border-2 border-b-4 rounded-xl font-bold text-[9px] uppercase tracking-wide cursor-pointer transition-all ${
                            crmChannel === item.key
                              ? 'bg-indigo-600 border-indigo-800 text-white'
                              : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          <span className="block text-sm">{item.icon}</span>
                          <span className="mt-0.5 block font-black">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Templates Selector */}
                <div className="space-y-1.5 pt-1 text-left">
                  <label className="text-[10px] uppercase font-black text-gray-400 block tracking-wider">
                    3. Plantillas de Mensajes de Racha Duo
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {[
                      { key: 'reminder', label: 'Alerta Deuda 💸' },
                      { key: 'vip_perk', label: 'Impulso VIP 💎' },
                      { key: 'gift_gems', label: 'Regalo Gemas 🎁' },
                      { key: 'reactivation', label: 'Descuento 🏷️' }
                    ].map((tmpl) => (
                      <button
                        key={tmpl.key}
                        type="button"
                        onClick={() => handleTemplateChange(tmpl.key)}
                        className={`py-2 px-1 border-2 border-b-4 rounded-xl font-black text-[9px] uppercase cursor-pointer transition-all ${
                          crmTemplate === tmpl.key
                            ? 'bg-[#1cb0f6] border-[#108ec7] text-white'
                            : 'bg-white border-gray-200 text-gray-500 hover:bg-slate-50'
                        }`}
                      >
                        {tmpl.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message text area */}
                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] uppercase font-black text-gray-400 block tracking-wider">
                    Vista Previa del Mensaje Personalizado
                  </label>
                  <textarea
                    value={crmMsg}
                    onChange={(e) => setCrmMsg(e.target.value)}
                    rows={3}
                    className="w-full text-xs font-bold p-3 bg-slate-50 border-2 border-gray-200 rounded-2xl focus:border-[#a435f0] outline-none font-sans"
                    placeholder="Escribe el mensaje de difusion directo..."
                  />
                  <div className="flex justify-between items-center text-[9px] text-gray-400 font-extrabold uppercase mt-1">
                    <span>Caracteres: {crmMsg.length}</span>
                    <span>Código: __DEB__ (Inyección automática de saldo)</span>
                  </div>
                </div>

                {/* LAUNCH BTN */}
                <button
                  type="button"
                  onClick={handleLaunchCampaign}
                  disabled={crmBroadcasting || segmentedCRMCustomers.length === 0}
                  className={`w-full py-3 border-b-4 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 ${
                    crmBroadcasting || segmentedCRMCustomers.length === 0
                      ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed border-b-2'
                      : 'bg-[#a435f0] hover:bg-[#8e26da] text-white border-indigo-900 border-b-6 shadow-sm active:translate-y-[2px] active:border-b-4'
                  }`}
                >
                  <Send size={15} />
                  <span>Transmitir Campaña a {segmentedCRMCustomers.length} clientes (+100 XP)</span>
                </button>
              </div>
            </div>

            {/* SECTOR RIGHT (CRM HISTORICAL LOGS AND SELECTION METRICS) */}
            <div className="lg:col-span-1 space-y-4 text-left">
              {/* TARGET RECIPIENTS CAROUSEL */}
              <div className="bg-white border-2 border-gray-200 border-b-6 rounded-3xl p-5 space-y-3 text-left">
                <h3 className="text-xs font-black uppercase text-gray-400 tracking-wider">
                  Destinatarios del Segmento ({segmentedCRMCustomers.length})
                </h3>
                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 text-left">
                  {segmentedCRMCustomers.length === 0 ? (
                    <p className="text-[10px] text-gray-400 italic text-center py-4 font-medium leading-normal">
                      Ningún cliente cumple las condiciones de segmentación activa de racha.
                    </p>
                  ) : (
                    segmentedCRMCustomers.map(c => (
                      <div key={c.id} className="flex justify-between items-center text-xs p-1.5 bg-slate-50 border rounded-xl font-bold">
                        <span className="truncate max-w-[120px] text-gray-700 font-extrabold">{c.name}</span>
                        <div className="flex gap-1.5 items-center shrink-0 font-mono text-[10px]">
                          {c.creditUsed && c.creditUsed > 0 ? (
                            <span className="text-red-500 font-black">${c.creditUsed}</span>
                          ) : (
                            <span className="text-[#58cc02] font-black">{c.gems} G</span>
                          )}
                          <span className="text-gray-300">|</span>
                          <span className="text-gray-400">{c.league}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* CRM CAMPAIGN LOGS */}
              <div className="bg-white border-2 border-gray-200 border-b-6 rounded-3xl p-5 space-y-3 text-left">
                <h3 className="text-xs font-black uppercase text-gray-400 tracking-wider">
                  Historial de Campañas Transmitidas
                </h3>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1 text-left">
                  {crmBroadcastHistory.map((log) => (
                    <div key={log.id} className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-2xl text-xs font-bold text-left space-y-1">
                      <div className="flex justify-between text-[8px] text-indigo-900 uppercase font-black">
                        <span>{log.channel}</span>
                        <span>{new Date(log.date).toLocaleDateString()}</span>
                      </div>
                      <h4 className="text-gray-800 font-black text-xs leading-normal">{log.campaign}</h4>
                      <p className="text-[9px] text-gray-400 font-extrabold uppercase mt-0.5">
                        Transmisión directa a: {log.targetCount} Clientes
                      </p>
                      {log.rewardsInjected > 0 && (
                        <p className="text-[9px] text-emerald-600 font-black uppercase flex items-center gap-0.5 mt-1 animate-pulse">
                          <span>🎁</span> Se inyectaron: +{log.rewardsInjected} G extra totales
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT CLIENT MODAL DIALOG */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn text-gray-800">
          <div className="bg-white border-2 border-gray-200 border-b-8 rounded-3xl max-w-sm w-full p-6 space-y-4 relative shadow-2xl">
            <button
              type="button"
              onClick={() => { setIsFormOpen(false); setEditingCustomer(null); playSound('click'); }}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 p-1 bg-gray-50 border cursor-pointer font-black text-xs h-7 w-7 flex items-center justify-center select-none"
            >
              ✕
            </button>

            <div className="text-center space-y-1">
              <span className="text-4xl block leading-none select-none">⚡</span>
              <h3 className="text-base font-black text-gray-850 uppercase leading-tight mt-1">
                {editingCustomer ? 'Editar Información' : 'Registrar Nuevo Cliente'}
              </h3>
              <p className="text-[9px] text-gray-400 font-extrabold uppercase tracking-wider">
                Control de lealtad y crédito comercial DuoPOS
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs text-left">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-black text-gray-400 block tracking-wider">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 border-2 border-gray-200 focus:border-[#1cb0f6] rounded-xl font-bold outline-none"
                  placeholder="Ej: Oscar el Pintor"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-black text-gray-400 block tracking-wider">
                  Teléfono de Contacto
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2 border-2 border-gray-200 focus:border-[#1cb0f6] rounded-xl font-bold outline-none font-mono"
                  placeholder="Ej: 555-0192"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-black text-gray-400 block tracking-wider">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2 border-2 border-gray-200 focus:border-[#1cb0f6] rounded-xl font-bold outline-none"
                  placeholder="oscar@duoacademy.com"
                />
              </div>

              {/* CREDIT LINE CONFIGURATION IN REGISTRY */}
              <div className="space-y-1 p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                <label className="text-[10px] uppercase font-black text-indigo-700 block tracking-widest flex items-center gap-0.5">
                  <span>💳</span> Límite Autorizado para Crédito ("Fiado")
                </label>
                <p className="text-[8px] text-indigo-500 font-bold leading-tight mb-2 uppercase">
                  Monto máximo que el cliente puede adeudar. Un valor de $0 inhabilita el crédito.
                </p>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-indigo-800 font-black font-mono">$</span>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={creditLimitVal}
                    onChange={(e) => setCreditLimitVal(e.target.value)}
                    className="w-full pl-6 pr-3.5 py-1.5 bg-white border-2 border-indigo-100 focus:border-[#1cb0f6] rounded-xl font-black text-[#a435f0] outline-none font-mono"
                    placeholder="0"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-[#58cc02] text-white border-b-4 border-[#3c9e01] hover:bg-[#61e002] active:translate-y-[2px] active:border-b-2 py-3 rounded-xl font-black text-xs uppercase tracking-wider text-center cursor-pointer transition-all mt-4 flex items-center justify-center gap-1"
              >
                <span>{editingCustomer ? 'Guardar Cambios ⚡' : 'Alta de Cliente (+25 XP) 🎉'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* DETAILED LEDGER HISTORIC VIEW MODAL */}
      {viewHistoryCust && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn text-gray-800">
          <div className="bg-white border-2 border-gray-200 border-b-8 rounded-3xl max-w-md w-full p-6 space-y-4 relative shadow-2xl">
            <button
              type="button"
              onClick={() => { setViewHistoryCust(null); playSound('click'); }}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 p-1 bg-gray-50 border cursor-pointer font-black text-xs h-7 w-7 flex items-center justify-center select-none"
            >
              ✕
            </button>

            <div className="flex items-center gap-2.5">
              <div className="bg-[#ffd700] text-amber-950 p-2.5 rounded-2xl shrink-0 font-bold select-none text-xl border">
                📖
              </div>
              <div className="text-left">
                <span className="text-[10px] uppercase font-black text-[#1cb0f6] block leading-tight">Estado de Cuenta / Ledger</span>
                <h3 className="text-base font-black text-gray-850 truncate max-w-[280px]" title={viewHistoryCust.name}>
                  {viewHistoryCust.name}
                </h3>
              </div>
            </div>

            {/* Quick Credit Line Balance Info inside Account view */}
            <div className="grid grid-cols-3 gap-2 bg-gray-100 border p-3 rounded-2xl text-center">
              <div>
                <span className="text-[8px] uppercase font-black text-gray-400 block">Autorizado</span>
                <span className="text-xs font-black font-mono text-gray-750">
                  ${(viewHistoryCust.creditLimit || 0).toFixed(0)}
                </span>
              </div>
              <div>
                <span className="text-[8px] uppercase font-black text-gray-400 block">Deuda Total</span>
                <span className="text-xs font-black font-mono text-red-500">
                  ${(viewHistoryCust.creditUsed || 0).toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-[8px] uppercase font-black text-gray-400 block">Cupo Libre</span>
                <span className="text-xs font-black font-mono text-green-600">
                  ${Math.max(0, (viewHistoryCust.creditLimit || 0) - (viewHistoryCust.creditUsed || 0)).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Credit Timeline History items */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-wider text-left">Línea de Movimientos Históricos</h4>
              
              <div className="max-h-64 overflow-y-auto pr-1 gap-2.5 flex flex-col">
                {!viewHistoryCust.creditHistory || viewHistoryCust.creditHistory.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 border border-dashed rounded-2xl space-y-2 text-gray-450 font-bold">
                    <span className="text-3xl block">📋</span>
                    <p className="text-xs">Este cliente no cuenta con movimientos registrados todavía.</p>
                  </div>
                ) : (
                  viewHistoryCust.creditHistory.map((mv) => {
                    const isPay = mv.type === 'pay';
                    return (
                      <div 
                        key={mv.id} 
                        className={`flex items-start justify-between p-3 rounded-2xl border transition-all text-xs font-bold ${
                          isPay ? 'bg-green-50/70 border-green-200' : 'bg-red-50/50 border-red-200'
                        }`}
                      >
                        <div className="flex gap-2 text-left min-w-0">
                          <span className={`text-lg p-1 rounded-lg shrink-0 w-8 h-8 flex items-center justify-center ${
                            isPay ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {isPay ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                          </span>
                          <div className="min-w-0">
                            <span className={`text-[10px] font-black uppercase block ${isPay ? 'text-green-700' : 'text-red-700'}`}>
                              {isPay ? 'Abono / Pago Recibido' : 'Cargo a Deuda'}
                            </span>
                            <p className="text-gray-800 break-words font-extrabold mt-0.5">{mv.notes || 'Compra de mercancía'}</p>
                            <span className="text-[9px] text-gray-400 font-medium font-sans flex items-center gap-1 mt-1">
                              <Clock size={10} />
                              {new Date(mv.date).toLocaleString('es-MX', { hour12: true })}
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className={`text-sm font-black font-mono block ${isPay ? 'text-green-600' : 'text-red-500'}`}>
                            {isPay ? '-' : '+'}${mv.amount.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <button
              onClick={() => setViewHistoryCust(null)}
              className="w-full py-2 bg-gray-150 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs uppercase"
            >
              Cerrar Estado de Cuenta
            </button>
          </div>
        </div>
      )}

      {/* REGISTRY DEBT PAY POPUP (ABONO MODAL) */}
      {payDebtCust && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn text-gray-800">
          <div className="bg-white border-2 border-gray-200 border-b-8 rounded-3xl max-w-sm w-full p-6 space-y-4 relative shadow-2xl">
            <button
              type="button"
              onClick={() => { setPayDebtCust(null); playSound('click'); }}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 p-1 bg-gray-50 border cursor-pointer font-black text-xs h-7 w-7 flex items-center justify-center select-none"
            >
              ✕
            </button>

            <div className="text-center space-y-1">
              <span className="text-4xl block leading-none select-none">💰</span>
              <h3 className="text-base font-black text-gray-850 uppercase leading-tight mt-1">
                Registrar Abono a Deuda
              </h3>
              <p className="text-[9px] text-[#58cc02] font-extrabold uppercase tracking-widest">
                Disminución de saldo para {payDebtCust.name}
              </p>
            </div>

            {/* Warning shift diagnostics linking */}
            {activeShift ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-left">
                <p className="text-[10px] text-green-800 font-extrabold uppercase leading-relaxed flex items-center gap-1 select-none">
                  <span>🟢</span> Turno de Caja Activo Detectado
                </p>
                <p className="text-[9px] text-green-700 leading-normal font-bold mt-0.5">
                  El dinero de este abono ingresará automáticamente al fondo registrado de la cajera <strong>{activeShift.employeeName}</strong>.
                </p>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-left">
                <p className="text-[10px] text-yellow-800 font-extrabold uppercase leading-tight flex items-center gap-1 select-none">
                  <span>⚠️</span> Bolsa de Caja Actualmente Cerrada
                </p>
                <p className="text-[9px] text-yellow-700 leading-normal font-medium mt-0.5">
                  El abono se asentará de manera digital en el saldo del cliente, pero recuerda abrir turno de caja para procesar arqueos físicos de efectivo.
                </p>
              </div>
            )}

            <form onSubmit={handleApplyPayment} className="space-y-4 text-xs text-left">
              <div className="bg-gray-50 p-3 rounded-2xl flex justify-between items-center border">
                <span className="text-[10px] font-black uppercase text-gray-400 block">Deuda Total Actual:</span>
                <span className="font-mono text-base font-black text-red-500">
                  ${(payDebtCust.creditUsed || 0).toFixed(2)}
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-black text-gray-400 block tracking-wider">
                  Monto a Abonar ($) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 font-bold text-gray-400">$</span>
                  <input
                    type="number"
                    required
                    min="0.01"
                    max={payDebtCust.creditUsed}
                    step="0.01"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="w-full pl-7 pr-4 py-2.5 bg-white border-2 border-gray-200 focus:border-[#1cb0f6] rounded-xl font-black text-[#58cc02] outline-none font-mono"
                    placeholder="0.00"
                  />
                </div>
                <div className="flex gap-1.5 mt-1.5 justify-center">
                  {[
                    { label: 'Pago Completo', pct: 1 },
                    { label: 'Mitad (50%)', pct: 0.5 },
                    { label: 'Un Tercio', pct: 0.33 }
                  ].map((tip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setPayAmount((Number((payDebtCust.creditUsed || 0) * tip.pct).toFixed(2)).toString())}
                      className="py-1 px-2.5 bg-gray-50 border rounded-lg text-[9px] text-gray-500 font-extrabold hover:bg-gray-100 cursor-pointer"
                    >
                      {tip.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-black text-gray-400 block tracking-wider">
                  Notas / Concepto del Abono
                </label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full px-3.5 py-2 border-2 border-gray-200 focus:border-[#1cb0f6] rounded-xl font-bold outline-none"
                  placeholder="Ej: Pago parcial entregado en mostrador"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 mt-4 pt-1">
                <button
                  type="submit"
                  className="bg-[#58cc02] text-white border-b-4 border-[#3c9e01] hover:bg-[#61e002] active:translate-y-[2px] py-2.5 rounded-xl font-black text-xs uppercase"
                >
                  Registrar Abono
                </button>
                <button
                  type="button"
                  onClick={() => { setPayDebtCust(null); setPayAmount(''); setPayNotes(''); playSound('click'); }}
                  className="bg-gray-150 hover:bg-gray-200 text-gray-650 py-2.5 rounded-xl font-bold text-xs uppercase"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
