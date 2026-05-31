/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Product, Branch, CashRegister, StockTransfer, CashShift, Transaction, User } from '../../types/index';
import { playSound } from '../../services/audio/soundService';
import { syncInsert, syncSaveStockTransfer, generateUUID } from '../../database/supabaseSync';
import { LicenseDetails, PLANS } from '../../services/security/licensingService';
import {
  Building2,
  Monitor,
  ArrowLeftRight,
  Check,
  X,
  Plus,
  Edit2,
  MapPin,
  ClipboardList,
  RefreshCw,
  Sparkles,
  Send,
  Download,
  AlertCircle,
  ShieldCheck,
  ChevronRight,
  CheckCircle2,
  TrendingUp,
  Store,
} from 'lucide-react';

// Import modular subcomponents
import BranchManager from './components/BranchManager';
import RegisterManager from './components/RegisterManager';
import CEDISCenter from './components/CEDISCenter';
import StockTransferLedger from './components/StockTransferLedger';

interface LogisticsScreenProps {
  products: Product[];
  onUpdateProduct: (prod: Product) => void;
  transactions: Transaction[];
  activeShift: CashShift | null;
  shiftHistory: CashShift[];
  onGrantXp: (amount: number) => void;
  branches: Branch[];
  setBranches: React.Dispatch<React.SetStateAction<Branch[]>>;
  activeBranchId: string;
  setActiveBranchId: (id: string) => void;
  registers: CashRegister[];
  setRegisters: React.Dispatch<React.SetStateAction<CashRegister[]>>;
  activeRegisterId: string;
  setActiveRegisterId: (id: string) => void;
  stockTransfers: StockTransfer[];
  setStockTransfers: React.Dispatch<React.SetStateAction<StockTransfer[]>>;
  currentUser: User;
  licenseDetails: LicenseDetails;
}

export default function LogisticsScreen({
  products,
  onUpdateProduct,
  transactions,
  activeShift,
  shiftHistory,
  onGrantXp,
  branches,
  setBranches,
  activeBranchId,
  setActiveBranchId,
  registers,
  setRegisters,
  activeRegisterId,
  setActiveRegisterId,
  stockTransfers,
  setStockTransfers,
  currentUser,
  licenseDetails,
}: LogisticsScreenProps) {
  const [activeSubTab, setActiveSubTab] = useState<'branches' | 'registers' | 'transfers' | 'central'>('branches');

  // Modals Visibility States (shared with subcomponents)
  const [showBranchForm, setShowBranchForm] = useState(false);
  const [showRegisterForm, setShowRegisterForm] = useState(false);

  // active branch object
  const activeBranch = useMemo(() => {
    return branches.find((b) => b.id === activeBranchId) || branches[0];
  }, [branches, activeBranchId]);

  // filtered registers of current branch
  const activeBranchRegisters = useMemo(() => {
    return registers.filter((r) => r.branchId === activeBranchId);
  }, [registers, activeBranchId]);

  // Compute stats per branch based on transactions
  const branchesStats = useMemo(() => {
    const stats: Record<string, { totalSales: number; count: number }> = {};
    branches.forEach((b) => {
      stats[b.id] = { totalSales: 0, count: 0 };
    });

    transactions.forEach((t) => {
      const bId = t.branchId || 'branch-centro';
      if (stats[bId]) {
        stats[bId].totalSales += t.total;
        stats[bId].count += 1;
      }
    });

    return stats;
  }, [branches, transactions]);

  // Switch Active Branch safely with active shift check
  const handleSelectBranch = (id: string) => {
    if (activeShift) {
      alert(
        '⚠️ No puedes cambiar de sucursal mientras tengas un turno o corte de caja abierto. Cierra tu turno actual en la pestaña de Caja primero.',
      );
      return;
    }
    setActiveBranchId(id);
    localStorage.setItem('duo_pos_active_branch_id', id);

    // Auto-select the first register in that branch
    const matches = registers.filter((r) => r.branchId === id);
    if (matches.length > 0) {
      setActiveRegisterId(matches[0].id);
      localStorage.setItem('duo_pos_active_register_id', matches[0].id);
    }

    playSound('click');
  };

  const handleSelectRegister = (id: string) => {
    if (activeShift) {
      alert('⚠️ Cierra el turno activo en la caja actual antes de alternar de terminal de cobro.');
      return;
    }
    setActiveRegisterId(id);
    localStorage.setItem('duo_pos_active_register_id', id);
    playSound('click');
  };

  // Suggested Restocks from CEDIS
  const suggestedRestocksList = useMemo(() => {
    const suggestions: {
      branchId: string;
      branchName: string;
      productId: string;
      name: string;
      emoji: string;
      currentStock: number;
      missing: number;
    }[] = [];

    branches
      .filter((b) => b.type === 'branch')
      .forEach((br) => {
        products.forEach((p) => {
          const currentStock = p.branchesStock?.[br.id] ?? (br.id === 'branch-centro' ? p.stock : 0);
          const limit = p.minStock || 5;
          if (currentStock <= limit) {
            const ideal = 25;
            const missing = ideal - currentStock;
            const cedisStock = p.branchesStock?.['branch-central'] ?? 0;

            if (missing > 0 && cedisStock >= missing) {
              suggestions.push({
                branchId: br.id,
                branchName: br.name,
                productId: p.id,
                name: p.name,
                emoji: p.emoji || '📦',
                currentStock,
                missing,
              });
            }
          }
        });
      });

    return suggestions;
  }, [branches, products]);

  // Bulk dispatch of suggestions from CEDIS
  const handleBulkDispatchSuggested = async () => {
    if (suggestedRestocksList.length === 0) return;

    const groupedDestinations: Record<string, typeof suggestedRestocksList> = {};
    suggestedRestocksList.forEach((s) => {
      if (!groupedDestinations[s.branchId]) {
        groupedDestinations[s.branchId] = [];
      }
      groupedDestinations[s.branchId].push(s);
    });

    let countTransfers = 0;
    const newTransfersList: StockTransfer[] = [...stockTransfers];
    const newlyCreatedTransfers: StockTransfer[] = [];

    Object.entries(groupedDestinations).forEach(([destId, list]) => {
      const destB = branches.find((b) => b.id === destId)!;

      const trItemsList = list.map((s) => {
        const p = products.find((prod) => prod.id === s.productId)!;
        const stocks = { ...(p.branchesStock || {}) };
        stocks['branch-central'] = Math.max(0, (stocks['branch-central'] ?? 0) - s.missing);

        onUpdateProduct({ ...p, branchesStock: stocks });

        return {
          productId: s.productId,
          name: s.name,
          emoji: s.emoji,
          quantity: s.missing,
        };
      });

      const newT: StockTransfer = {
        id: generateUUID(),
        fromBranchId: 'branch-central',
        fromBranchName: 'Almacén Central (CEDIS) 🏢',
        toBranchId: destId,
        toBranchName: destB.name,
        items: trItemsList,
        status: 'shipped',
        createdAt: new Date().toISOString(),
        shippedAt: new Date().toISOString(),
        notes: 'Surtido automatizado de Alarma de Stock Crítico.',
        carrier: 'Mensajería Express DuoExpress 🦉',
      };

      newTransfersList.unshift(newT);
      newlyCreatedTransfers.push(newT);
      countTransfers++;
    });

    setStockTransfers(newTransfersList);

    for (const newT of newlyCreatedTransfers) {
      await syncSaveStockTransfer(newT, newTransfersList);
    }

    onGrantXp(80);
    playSound('success');
    alert(
      `🎉 ¡ÉXITO! Se crearon y embarcaron ${countTransfers} Traspasos Express hacia las sucursales deficitarias. CEDIS ha despachado los insumos.`,
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn font-sans p-1 md:p-3 relative pb-12 w-full text-gray-800 text-left font-sans">
      {/* Visual Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-800 tracking-tight flex items-center gap-2 font-sans">
            <span>🌐</span> Multi-Sucursales & Cestas de Cobro (Multi-Caja)
          </h2>
          <p className="text-gray-400 font-extrabold text-sm">
            Control comercial corporativo: distribuye inventarios desde Almacén Central y monitorea cajas.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            id="btn-add-branch"
            onClick={() => {
              if (currentUser.role !== 'admin') {
                alert(
                  '🔒 Acceso Denegado: Solo el Administrador Corporativo puede crear o dar de alta nuevas sucursales físicas.',
                );
              } else {
                setShowBranchForm(true);
                playSound('click');
              }
            }}
            className="bg-green-600 text-white border-b-4 border-green-800 hover:bg-green-500 active:border-b-0 active:translate-y-[4px] font-black py-2.5 px-4 rounded-xl transition-all flex items-center gap-1.5 uppercase text-xs cursor-pointer font-sans"
          >
            <Plus size={14} /> Nueva Sucursal
          </button>
        </div>
      </div>

      {/* TOP SUMMARY STATS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 font-sans">
        <div className="bg-white border-2 border-gray-200 border-b-[6px] rounded-3xl p-4 flex items-center gap-3">
          <span className="text-3xl bg-green-50 border border-green-150 p-2 rounded-2xl select-none">🏪</span>
          <div>
            <span className="text-2xl font-black text-green-600 block leading-none">{branches.length}</span>
            <span className="text-[10px] font-black uppercase text-gray-400">Puntos de Distribución</span>
          </div>
        </div>

        <div className="bg-white border-2 border-gray-200 border-b-[6px] rounded-3xl p-4 flex items-center gap-3">
          <span className="text-3xl bg-blue-50 border border-blue-150 p-2 rounded-2xl select-none">🖥️</span>
          <div>
            <span className="text-2xl font-black text-blue-500 block leading-none">{registers.length}</span>
            <span className="text-[10px] font-black uppercase text-gray-400">Terminales de Cobro</span>
          </div>
        </div>

        <div className="bg-white border-2 border-gray-200 border-b-[6px] rounded-3xl p-4 flex items-center gap-3">
          <span className="text-3xl bg-teal-50 border border-teal-150 p-2 rounded-2xl select-none">🔄</span>
          <div>
            <span className="text-2xl font-black text-teal-600 block leading-none">
              {stockTransfers.filter((tr) => tr.status === 'pending' || tr.status === 'shipped').length}
            </span>
            <span className="text-[10px] font-black uppercase text-gray-400">Traspasos en Tránsito</span>
          </div>
        </div>

        <div className="bg-amber-50 border-2 border-amber-200 border-b-[6px] rounded-3xl p-4 flex items-center gap-3">
          <span className="text-3xl select-none">🏢</span>
          <div className="overflow-hidden">
            <span className="text-xs font-black text-amber-800 block truncate leading-none font-sans">
              {branches.find((b) => b.id === activeBranchId)?.name || 'Sin sucursal'}
            </span>
            <span className="text-[10px] font-black uppercase text-amber-600 leading-tight">
              Canal Comercial Activo
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Row */}
      <div className="flex flex-wrap border-b-2 border-gray-200 gap-1 md:gap-4 select-none font-sans">
        {[
          { id: 'branches', label: '🏪 Sucursales & Almacenes', count: branches.length },
          { id: 'registers', label: '🖥️ Cajas del Canal', count: activeBranchRegisters.length },
          {
            id: 'central',
            label: '🏢 CEDIS (Central Hub)',
            count: suggestedRestocksList.length,
            badgeColor: 'bg-red-500 text-white animate-pulse',
          },
          { id: 'transfers', label: '🚚 Bitácora de Traspaso', count: stockTransfers.length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveSubTab(tab.id as any);
              playSound('click');
            }}
            className={`pb-3 px-3 text-xs md:text-sm font-black uppercase tracking-wider border-b-4 transition-all cursor-pointer flex items-center gap-1.5 font-sans ${
              activeSubTab === tab.id
                ? 'border-b-[#58cc02] border-b-4 text-[#58cc02]'
                : 'border-b-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${tab.badgeColor || 'bg-gray-100 text-gray-500'}`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ----------------- SUBTAB CONTENTS ----------------- */}
      {activeSubTab === 'branches' && (
        <BranchManager
          branches={branches}
          setBranches={setBranches}
          activeBranchId={activeBranchId}
          onSelectBranch={handleSelectBranch}
          registers={registers}
          setRegisters={setRegisters}
          products={products}
          onUpdateProduct={onUpdateProduct}
          branchesStats={branchesStats}
          currentUser={currentUser}
          licenseDetails={licenseDetails}
          onGrantXp={onGrantXp}
          showBranchForm={showBranchForm}
          onCloseForm={() => setShowBranchForm(false)}
        />
      )}

      {activeSubTab === 'registers' && (
        <RegisterManager
          activeBranch={activeBranch}
          activeBranchId={activeBranchId}
          registers={registers}
          setRegisters={setRegisters}
          activeRegisterId={activeRegisterId}
          onSelectRegister={handleSelectRegister}
          activeShift={activeShift}
          currentUser={currentUser}
          onGrantXp={onGrantXp}
          showRegisterForm={showRegisterForm}
          onCloseForm={() => setShowRegisterForm(false)}
          onOpenRegisterForm={() => setShowRegisterForm(true)}
        />
      )}

      {activeSubTab === 'central' && (
        <CEDISCenter
          products={products}
          onUpdateProduct={onUpdateProduct}
          branches={branches}
          activeBranchId={activeBranchId}
          stockTransfers={stockTransfers}
          setStockTransfers={setStockTransfers}
          onGrantXp={onGrantXp}
          suggestedRestocksList={suggestedRestocksList}
          handleBulkDispatchSuggested={handleBulkDispatchSuggested}
        />
      )}

      {activeSubTab === 'transfers' && (
        <StockTransferLedger
          stockTransfers={stockTransfers}
          setStockTransfers={setStockTransfers}
          activeBranchId={activeBranchId}
          products={products}
          onUpdateProduct={onUpdateProduct}
          onGrantXp={onGrantXp}
        />
      )}
    </div>
  );
}
