import React, { useState, useMemo } from 'react';
import { Customer, LeagueType, CashShift } from '../../types';
import { playSound } from '../../services/sounds';

// Subcomponents imports
import CustomerDirectory from './components/CustomerDirectory';
import CustomerFormModal from './components/CustomerFormModal';
import CustomerLedgerModal from './components/CustomerLedgerModal';
import DebtPaymentModal from './components/DebtPaymentModal';
import LoyaltyStore from './components/LoyaltyStore';
import CRMCampaignEngine from './components/CRMCampaignEngine';

interface CustomersScreenProps {
  customers: Customer[];
  onAddCustomer: (
    customer: Omit<Customer, 'id' | 'registeredAt' | 'purchasesCount' | 'totalSpent' | 'gems' | 'league'> & {
      creditLimit?: number;
      creditUsed?: number;
      creditHistory?: any[];
    },
  ) => void;
  onUpdateCustomer: (customer: Customer) => void;
  onDeleteCustomer: (id: string) => void;
  onGrantXp: (amount: number) => void;
  activeShift: CashShift | null;
  onAddShiftMovement: (type: 'in' | 'out', amount: number, reason: string) => void;
}

// Duolingo League Color and Emoji Map
export const LEAGUE_METADATA: Record<
  LeagueType,
  { name: string; color: string; bg: string; border: string; text: string; emoji: string; nextThreshold: number }
> = {
  Bronce: {
    name: 'Bronce',
    color: '#cd7f32',
    bg: 'bg-[#faf2eb]',
    border: 'border-[#e6c2a4]',
    text: 'text-[#8a5229]',
    emoji: '🥉',
    nextThreshold: 150,
  },
  Plata: {
    name: 'Plata',
    color: '#c0c0c0',
    bg: 'bg-[#f2f2f2]',
    border: 'border-[#d9d9d9]',
    text: 'text-[#616161]',
    emoji: '🥈',
    nextThreshold: 300,
  },
  Oro: {
    name: 'Oro',
    color: '#ffd700',
    bg: 'bg-[#fffbeb]',
    border: 'border-[#fde047]',
    text: 'text-[#a16207]',
    emoji: '🥇',
    nextThreshold: 600,
  },
  Zafiro: {
    name: 'Zafiro',
    color: '#1cb0f6',
    bg: 'bg-[#f0f9ff]',
    border: 'border-[#bae6fd]',
    text: 'text-[#0369a1]',
    emoji: '🔹',
    nextThreshold: 1200,
  },
  Rubí: {
    name: 'Rubí',
    color: '#ff4b4b',
    bg: 'bg-[#fef2f2]',
    border: 'border-[#fecaca]',
    text: 'text-[#b91c1c]',
    emoji: '❤️',
    nextThreshold: 2500,
  },
  Esmeralda: {
    name: 'Esmeralda',
    color: '#58cc02',
    bg: 'bg-[#f0fdf4]',
    border: 'border-[#bbf7d0]',
    text: 'text-[#15803d]',
    emoji: '🟢',
    nextThreshold: 5000,
  },
  Obsidiana: {
    name: 'Obsidiana',
    color: '#4b4b4b',
    bg: 'bg-[#f4f4f5]',
    border: 'border-[#e4e4e7]',
    text: 'text-[#27272a]',
    emoji: '💎',
    nextThreshold: 99999,
  },
};

export default function CustomersScreen({
  customers,
  onAddCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
  onGrantXp,
  activeShift,
  onAddShiftMovement,
}: CustomersScreenProps) {
  const [search, setSearch] = useState('');
  const [selectedLeague, setSelectedLeague] = useState<string>('all');
  const [subTab, setSubTab] = useState<'directory' | 'pending' | 'loyalty' | 'crm'>('directory');

  // Modal Triggers States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewHistoryCust, setViewHistoryCust] = useState<Customer | null>(null);
  const [payDebtCust, setPayDebtCust] = useState<Customer | null>(null);

  // Core Math & Filters
  const totalOutstandingDebt = useMemo(() => {
    return customers.reduce((acc, c) => acc + (c.creditUsed || 0), 0);
  }, [customers]);

  const totalAuthorizedCredit = useMemo(() => {
    return customers.reduce((acc, c) => acc + (c.creditLimit || 0), 0);
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    return customers
      .filter((c) => {
        const matchesQuery =
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          (c.phone && c.phone.includes(search)) ||
          (c.email && c.email.toLowerCase().includes(search.toLowerCase()));

        const matchesLeague = selectedLeague === 'all' || c.league === selectedLeague;
        const matchesSubTab = subTab === 'directory' || (c.creditUsed && c.creditUsed > 0);

        return matchesQuery && matchesLeague && matchesSubTab;
      })
      .sort((a, b) => {
        if (subTab === 'pending') {
          return (b.creditUsed || 0) - (a.creditUsed || 0); // Highest debt first
        }
        return a.name.localeCompare(b.name); // Alphabetical
      });
  }, [customers, search, selectedLeague, subTab]);

  return (
    <div className="space-y-6 animate-fadeIn font-sans p-1 md:p-3 pb-12 text-gray-800">
      {/* HEADER HERO */}
      <div className="bg-[#1cb0f6] border-2 border-[#128bd0] border-b-8 rounded-3xl p-5 md:p-6 text-white relative overflow-hidden shadow-xs">
        <div className="absolute right-4 -bottom-3 opacity-15 text-8xl md:text-9xl select-none font-black translate-x-4">
          🎓
        </div>
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2">
            <span className="bg-[#ffd700] text-amber-955 text-[10px] font-black uppercase px-2 py-0.5 tracking-wider rounded-lg border border-white leading-none">
              Finanzas de Racha 💸
            </span>
            <span className="text-white text-xs font-bold font-mono">★ Crédito Social y Fidelidad DuoPOS</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight leading-none">
            Clientes, Fiado y Líneas de Crédito
          </h2>
          <p className="text-xs md:text-sm text-sky-50 leading-relaxed max-w-xl font-bold">
            Configura límites a clientes de confianza, registra ventas a crédito directamente desde el POS y gestiona
            abonos parciales sumándolo directamente a tu cuadre de caja diario.
          </p>
        </div>
      </div>

      {/* SUB-TAB SELECTOR BAR */}
      <div className="flex flex-wrap justify-start border-b-2 border-gray-100 p-0.5 gap-1 select-none">
        <button
          onClick={() => {
            setSubTab('directory');
            playSound('swoosh');
          }}
          className={`py-2 px-4 text-xs font-black uppercase tracking-wide rounded-t-xl transition-all border-t-2 border-x-2 -mb-[2px] cursor-pointer flex items-center gap-1.5 ${
            subTab === 'directory'
              ? 'bg-white border-gray-200 border-b-white text-[#1cb0f6]'
              : 'bg-transparent border-transparent text-gray-400 hover:text-gray-650'
          }`}
        >
          <span>📕</span>
          <span>Directorio de Clientes</span>
        </button>
        <button
          onClick={() => {
            setSubTab('pending');
            playSound('swoosh');
          }}
          className={`py-2 px-4 text-xs font-black uppercase tracking-wide rounded-t-xl transition-all border-t-2 border-x-2 -mb-[2px] cursor-pointer flex items-center gap-1.5 ${
            subTab === 'pending'
              ? 'bg-white border-gray-200 border-b-white text-[#ff4b4b]'
              : 'bg-transparent border-transparent text-gray-400 hover:text-gray-650'
          }`}
        >
          <span>💸</span>
          <span>Cuentas Pendientes (Fiados)</span>
          {customers.filter((c) => (c.creditUsed || 0) > 0).length > 0 && (
            <span className="bg-red-500 text-white text-[9px] font-black w-5 h-5 flex items-center justify-center rounded-full">
              {customers.filter((c) => (c.creditUsed || 0) > 0).length}
            </span>
          )}
        </button>
        <button
          onClick={() => {
            setSubTab('loyalty');
            playSound('swoosh');
          }}
          className={`py-2 px-4 text-xs font-black uppercase tracking-wide rounded-t-xl transition-all border-t-2 border-x-2 -mb-[2px] cursor-pointer flex items-center gap-1.5 ${
            subTab === 'loyalty'
              ? 'bg-white border-gray-200 border-b-white text-[#e6b100]'
              : 'bg-transparent border-transparent text-gray-400 hover:text-gray-650'
          }`}
        >
          <span>💎</span>
          <span>Tienda VIP & Fidelización</span>
        </button>
        <button
          onClick={() => {
            setSubTab('crm');
            playSound('swoosh');
          }}
          className={`py-2 px-4 text-xs font-black uppercase tracking-wide rounded-t-xl transition-all border-t-2 border-x-2 -mb-[2px] cursor-pointer flex items-center gap-1.5 ${
            subTab === 'crm'
              ? 'bg-white border-gray-200 border-b-white text-[#a435f0]'
              : 'bg-transparent border-transparent text-gray-400 hover:text-gray-650'
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
          <div className="text-left">
            <span className="text-[9px] uppercase font-black text-gray-400 block leading-tight">Clientes Activos</span>
            <span className="text-base font-black text-gray-850 leading-none">{customers.length}</span>
          </div>
        </div>

        <div className="bg-white border-2 border-gray-200 rounded-2xl p-4 flex items-center gap-3.5 shadow-xs">
          <div className="bg-rose-50 text-rose-600 p-2 rounded-xl border border-rose-100 font-bold select-none text-xl w-10 h-10 flex items-center justify-center">
            💸
          </div>
          <div className="text-left">
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
          <div className="text-left">
            <span className="text-[9px] uppercase font-black text-gray-400 block leading-tight">
              Cartera Autorizada
            </span>
            <span className="text-base font-black text-[#58cc02] font-mono leading-none">
              ${totalAuthorizedCredit.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="bg-white border-2 border-gray-200 rounded-2xl p-4 flex items-center gap-3.5 shadow-xs">
          <div className="bg-amber-50 text-amber-600 p-2 rounded-xl border border-amber-100 font-bold select-none text-xl w-10 h-10 flex items-center justify-center">
            💎
          </div>
          <div className="text-left">
            <span className="text-[9px] uppercase font-black text-gray-400 block leading-tight">Gemas de Canje</span>
            <span className="text-base font-black text-amber-500 font-mono leading-none">
              {customers.reduce((acc, c) => acc + c.gems, 0)} <span className="text-[10px] text-gray-450">G</span>
            </span>
          </div>
        </div>
      </div>

      {/* CORE VIEWPORT SUB-TAB RENDERING */}
      {(subTab === 'directory' || subTab === 'pending') && (
        <CustomerDirectory
          customers={customers}
          filteredCustomers={filteredCustomers}
          search={search}
          setSearch={setSearch}
          selectedLeague={selectedLeague}
          setSelectedLeague={setSelectedLeague}
          subTab={subTab}
          onOpenNewForm={() => {
            setEditingCustomer(null);
            setIsFormOpen(true);
            playSound('click');
          }}
          onOpenEditForm={(cust) => {
            setEditingCustomer(cust);
            setIsFormOpen(true);
            playSound('click');
          }}
          onOpenLedger={(cust) => setViewHistoryCust(cust)}
          onOpenPayment={(cust) => setPayDebtCust(cust)}
          onDeleteCustomer={onDeleteCustomer}
          onUpdateCustomer={onUpdateCustomer}
          onAddCustomer={onAddCustomer}
          onGrantXp={onGrantXp}
        />
      )}

      {subTab === 'loyalty' && (
        <LoyaltyStore customers={customers} onUpdateCustomer={onUpdateCustomer} onGrantXp={onGrantXp} />
      )}

      {subTab === 'crm' && (
        <CRMCampaignEngine customers={customers} onUpdateCustomer={onUpdateCustomer} onGrantXp={onGrantXp} />
      )}

      {/* MODAL WINDOWS OVERLAYS */}
      <CustomerFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingCustomer(null);
        }}
        editingCustomer={editingCustomer}
        onAddCustomer={onAddCustomer}
        onUpdateCustomer={onUpdateCustomer}
        onGrantXp={onGrantXp}
      />

      <CustomerLedgerModal customer={viewHistoryCust} onClose={() => setViewHistoryCust(null)} />

      <DebtPaymentModal
        customer={payDebtCust}
        onClose={() => setPayDebtCust(null)}
        activeShift={activeShift}
        onUpdateCustomer={onUpdateCustomer}
        onAddShiftMovement={onAddShiftMovement}
        onGrantXp={onGrantXp}
      />
    </div>
  );
}
