/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Product, Branch, CashRegister, StockTransfer, CashShift, Transaction, User } from '../types';
import { playSound } from '../utils/sounds';
import { 
  Building2, Monitor, ArrowLeftRight, Check, X, Plus, Edit2, 
  MapPin, ClipboardList, RefreshCw, Sparkles, Send, Download, 
  AlertCircle, ShieldCheck, ChevronRight, CheckCircle2, TrendingUp, Store
} from 'lucide-react';
import { syncInsert, syncSaveStockTransfer, generateUUID, ensureValidUuid } from '../utils/supabaseSync';

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
  currentUser
}: LogisticsScreenProps) {
  
  const [activeSubTab, setActiveSubTab] = useState<'branches' | 'registers' | 'transfers' | 'central'>('branches');
  
  // Forms & Temp States
  const [showBranchForm, setShowBranchForm] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchType, setNewBranchType] = useState<'branch' | 'central'>('branch');
  const [newBranchEmoji, setNewBranchEmoji] = useState('🏪');
  const [newBranchCity, setNewBranchCity] = useState('CDMX');
  const [newBranchAddress, setNewBranchAddress] = useState('');
  
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [newRegName, setNewRegName] = useState('');
  const [newRegEmoji, setNewRegEmoji] = useState('💵');
  
  // Direct Transfer Form States (New manual transfer)
  const [transferFrom, setTransferFrom] = useState(activeBranchId);
  const [transferTo, setTransferTo] = useState('');
  const [transferItems, setTransferItems] = useState<{ productId: string; quantity: number }[]>([]);
  const [transferNotes, setTransferNotes] = useState('');
  const [transferError, setTransferError] = useState('');

  // active branch object
  const activeBranch = useMemo(() => {
    return branches.find(b => b.id === activeBranchId) || branches[0];
  }, [branches, activeBranchId]);

  // filtered registers of current branch
  const activeBranchRegisters = useMemo(() => {
    return registers.filter(r => r.branchId === activeBranchId);
  }, [registers, activeBranchId]);

  // Compute stats per branch based on transactions
  const branchesStats = useMemo(() => {
    const stats: Record<string, { totalSales: number; count: number }> = {};
    branches.forEach(b => {
      stats[b.id] = { totalSales: 0, count: 0 };
    });

    transactions.forEach(t => {
      // If transaction has branchId, map it; otherwise fallback to default branch 'branch-centro'
      const bId = t.branchId || 'branch-centro';
      if (stats[bId]) {
        stats[bId].totalSales += t.total;
        stats[bId].count += 1;
      }
    });

    return stats;
  }, [branches, transactions]);

  // Handlers for Branch Creation
  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim() || !newBranchAddress.trim()) {
      alert('Por favor, especifica el nombre y domicilio legal.');
      return;
    }

    const bId = `branch-${Date.now()}`;
    const newB: Branch = {
      id: bId,
      name: newBranchName.trim(),
      type: newBranchType,
      emoji: newBranchEmoji,
      city: newBranchCity,
      address: newBranchAddress.trim()
    };

    const updatedBranches = [...branches, newB];
    setBranches(updatedBranches);
    await syncInsert<Branch>('branches', 'duo_pos_branches', updatedBranches, newB);

    // Also auto-provision a general Cash Register for this branch
    const regId = `reg-${Date.now()}`;
    const newReg: CashRegister = {
      id: regId,
      branchId: bId,
      name: 'Caja General 01 💵',
      emoji: '💵',
      status: 'active'
    };
    const updatedRegs = [...registers, newReg];
    setRegisters(updatedRegs);
    await syncInsert<CashRegister>('cash_registers', 'duo_pos_registers', updatedRegs, newReg);

    // Init stock multiplication for products in this branch if they have branchesStock
    products.forEach(p => {
      const bStock = p.branchesStock || {};
      // CEDIS gets massive initial stock, standard gets standard
      bStock[bId] = newBranchType === 'central' ? 150 : 25;
      onUpdateProduct({ ...p, branchesStock: bStock });
    });

    setShowBranchForm(false);
    setNewBranchName('');
    setNewBranchAddress('');
    onGrantXp(40);
    playSound('levelup');
  };

  // Handlers for Cash Register Creation
  const handleCreateRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRegName.trim()) {
      alert('Especifica el código/nombre identificador de la caja.');
      return;
    }

    const rId = `reg-${Date.now()}`;
    const newReg: CashRegister = {
      id: rId,
      branchId: activeBranchId,
      name: newRegName.trim(),
      emoji: newRegEmoji,
      status: 'active'
    };

    const updated = [...registers, newReg];
    setRegisters(updated);
    await syncInsert<CashRegister>('cash_registers', 'duo_pos_registers', updated, newReg);

    setShowRegisterForm(false);
    setNewRegName('');
    onGrantXp(25);
    playSound('success');
  };

  // Switch Active Branch safely
  const handleSelectBranch = (id: string) => {
    if (activeShift) {
      alert('⚠️ No puedes cambiar de sucursal mientras tengas un turno o corte de caja abierto. Cierra tu turno actual en la pestaña de Caja primero.');
      return;
    }
    setActiveBranchId(id);
    localStorage.setItem('duo_pos_active_branch_id', id);

    // Auto-select the first register in that branch
    const matches = registers.filter(r => r.branchId === id);
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

  // Stock Transfer Actions
  const handleAddTransferItem = () => {
    const firstProd = products[0];
    if (!firstProd) return;
    setTransferItems([...transferItems, { productId: firstProd.id, quantity: 10 }]);
    playSound('click');
  };

  const handleUpdateTransferItem = (index: number, fId: string, qty: number) => {
    const updated = [...transferItems];
    updated[index] = { productId: fId, quantity: qty };
    setTransferItems(updated);
  };

  const handleRemoveTransferItem = (index: number) => {
    setTransferItems(transferItems.filter((_, i) => i !== index));
    playSound('swoosh');
  };

  const handleSubmitTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferFrom || !transferTo) {
      setTransferError('Por favor selecciona la sucursal de origen y destino.');
      return;
    }
    if (transferFrom === transferTo) {
      setTransferError('Origen y destino deben ser distintas sucursales.');
      return;
    }
    if (transferItems.length === 0) {
      setTransferError('Debe ingresar mínimo 1 artículo para transferir.');
      return;
    }

    // Verify stock availability at origin branch
    for (const it of transferItems) {
      const match = products.find(p => p.id === it.productId);
      const originStock = match?.branchesStock?.[transferFrom] ?? (match?.stock ?? 0);
      if (it.quantity <= 0) {
        setTransferError('Las cantidades de traslado deben ser mayores a cero.');
        return;
      }
      if (originStock < it.quantity) {
        setTransferError(`Stock insuficiente para "${match?.name}" en origen. Disponible: ${originStock} un.`);
        return;
      }
    }

    setTransferError('');

    const fromB = branches.find(b => b.id === transferFrom)!;
    const toB = branches.find(b => b.id === transferTo)!;

    const itemsList = transferItems.map(it => {
      const match = products.find(p => p.id === it.productId)!;
      return {
        productId: it.productId,
        name: match.name,
        emoji: match.emoji || '📦',
        quantity: it.quantity
      };
    });

    const newTransfer: StockTransfer = {
      id: generateUUID(),
      fromBranchId: transferFrom,
      fromBranchName: fromB.name,
      toBranchId: transferTo,
      toBranchName: toB.name,
      items: itemsList,
      status: 'pending',
      createdAt: new Date().toISOString(),
      notes: transferNotes.trim(),
      carrier: 'Vehículo Repartidor DuoExpress 🚐'
    };

    const updated = [newTransfer, ...stockTransfers];
    setStockTransfers(updated);
    await syncSaveStockTransfer(newTransfer, updated);

    // Reset items form
    setTransferItems([]);
    setTransferNotes('');
    
    onGrantXp(30);
    playSound('success');
    
    const displayId = `TR-${newTransfer.id.slice(0, 8).toUpperCase()}`;
    alert(`💡 Orden de Traspaso ${displayId} generada en borrador "Pendiente".`);
  };

  // Commit / Ship Stock Transfer
  const handleShipTransfer = async (id: string) => {
    const tr = stockTransfers.find(t => t.id === id);
    if (!tr) return;

    // Deduct stock from ORIGIN branch
    tr.items.forEach(item => {
      const p = products.find(prod => prod.id === item.productId);
      if (p) {
        const stocks = { ...(p.branchesStock || {}) };
        const currentStock = stocks[tr.fromBranchId] ?? p.stock;
        stocks[tr.fromBranchId] = Math.max(0, currentStock - item.quantity);
        onUpdateProduct({ ...p, branchesStock: stocks, stock: tr.fromBranchId === 'branch-centro' ? Math.max(0, currentStock - item.quantity) : p.stock });
      }
    });

    const updated = stockTransfers.map(t => t.id === id ? { ...t, status: 'shipped' as const, shippedAt: new Date().toISOString() } : t);
    setStockTransfers(updated);
    const updatedTransfer = updated.find(t => t.id === id);
    if (updatedTransfer) {
      await syncSaveStockTransfer(updatedTransfer, updated);
    }

    onGrantXp(40);
    playSound('swoosh');
  };

  // Receive stock transfer at destination
  const handleReceiveTransfer = async (id: string) => {
    const tr = stockTransfers.find(t => t.id === id);
    if (!tr) return;

    // Add stock to DESTINATION branch
    tr.items.forEach(item => {
      const p = products.find(prod => prod.id === item.productId);
      if (p) {
        const stocks = { ...(p.branchesStock || {}) };
        const currentStock = stocks[tr.toBranchId] ?? (tr.toBranchId === 'branch-centro' ? p.stock : 0);
        stocks[tr.toBranchId] = currentStock + item.quantity;
        
        // If destination is default 'branch-centro', also sync main fallback stock property
        let mainVal = p.stock;
        if (tr.toBranchId === 'branch-centro') {
          mainVal = currentStock + item.quantity;
        }
        onUpdateProduct({ ...p, branchesStock: stocks, stock: mainVal });
      }
    });

    const updated = stockTransfers.map(t => t.id === id ? { ...t, status: 'received' as const, receivedAt: new Date().toISOString() } : t);
    setStockTransfers(updated);
    const updatedTransfer = updated.find(t => t.id === id);
    if (updatedTransfer) {
      await syncSaveStockTransfer(updatedTransfer, updated);
    }

    onGrantXp(50);
    playSound('levelup');
    const displayId = tr.id.startsWith('TR-') ? tr.id : `TR-${tr.id.slice(0, 8).toUpperCase()}`;
    alert(`🎉 ¡Lote de Traspaso ${displayId} ingresado a bodega! Stock de destino cargado éxitosamente para ${tr.items.length} insumos.`);
  };

  const handleCancelTransfer = async (id: string) => {
    if (confirm('¿Deseas cancelar y anular este traspaso de inventario?')) {
      const updated = stockTransfers.map(t => t.id === id ? { ...t, status: 'cancelled' as const } : t);
      setStockTransfers(updated);
      const updatedTransfer = updated.find(t => t.id === id);
      if (updatedTransfer) {
        await syncSaveStockTransfer(updatedTransfer, updated);
      }
      playSound('error');
    }
  };

  // Suggested Restocks from CEDIS
  const suggestedRestocksList = useMemo(() => {
    const suggestions: { branchId: string; branchName: string; productId: string; name: string; emoji: string; currentStock: number; missing: number }[] = [];
    
    branches.filter(b => b.type === 'branch').forEach(br => {
      products.forEach(p => {
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
              missing
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

    // Group suggested by branch destination to compile clean stock transfers
    const groupedDestinations: Record<string, typeof suggestedRestocksList> = {};
    suggestedRestocksList.forEach(s => {
      if (!groupedDestinations[s.branchId]) {
        groupedDestinations[s.branchId] = [];
      }
      groupedDestinations[s.branchId].push(s);
    });

    let countTransfers = 0;
    const newTransfersList: StockTransfer[] = [...stockTransfers];
    const newlyCreatedTransfers: StockTransfer[] = [];

    Object.entries(groupedDestinations).forEach(([destId, list]) => {
      const destB = branches.find(b => b.id === destId)!;
      
      const trItemsList = list.map(s => {
        // Deduct from CEDIS right away
        const p = products.find(prod => prod.id === s.productId)!;
        const stocks = { ...(p.branchesStock || {}) };
        stocks['branch-central'] = Math.max(0, (stocks['branch-central'] ?? 0) - s.missing);
        
        onUpdateProduct({ ...p, branchesStock: stocks });

        return {
          productId: s.productId,
          name: s.name,
          emoji: s.emoji,
          quantity: s.missing
        };
      });

      const newT: StockTransfer = {
        id: generateUUID(),
        fromBranchId: 'branch-central',
        fromBranchName: 'Almacén Central (CEDIS) 🏢',
        toBranchId: destId,
        toBranchName: destB.name,
        items: trItemsList,
        status: 'shipped', // Automatically dispatched (Shipped)
        createdAt: new Date().toISOString(),
        shippedAt: new Date().toISOString(),
        notes: 'Surtido automatizado de Alarma de Stock Crítico.',
        carrier: 'Mensajería Express DuoExpress 🦉'
      };

      newTransfersList.unshift(newT);
      newlyCreatedTransfers.push(newT);
      countTransfers++;
    });

    setStockTransfers(newTransfersList);
    
    // Save all of them to Supabase (synchronously in local state, asynchronously to Supabase)
    for (const newT of newlyCreatedTransfers) {
      await syncSaveStockTransfer(newT, newTransfersList);
    }

    onGrantXp(80);
    playSound('success');
    alert(`🎉 ¡ÉXITO! Se crearon y embarcaron ${countTransfers} Traspasos Express hacia las sucursales deficitarias. CEDIS ha despachado los insumos.`);
  };

  return (
    <div className="space-y-6 animate-fadeIn font-sans p-1 md:p-3 relative pb-12 w-full text-gray-800 text-left">
      
      {/* Visual Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-800 tracking-tight flex items-center gap-2">
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
                alert('🔒 Acceso Denegado: Solo el Administrador Corporativo puede crear o dar de alta nuevas sucursales físicas.');
              } else {
                setShowBranchForm(true);
                playSound('click');
              }
            }}
            className="bg-green-600 text-white border-b-4 border-green-800 hover:bg-green-500 active:border-b-0 active:translate-y-[4px] font-black py-2.5 px-4 rounded-xl transition-all flex items-center gap-1.5 uppercase text-xs cursor-pointer"
          >
            <Plus size={14} /> Nueva Sucursal
          </button>
        </div>
      </div>

      {/* TOP SUMMARY STATS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              {stockTransfers.filter(tr => tr.status === 'pending' || tr.status === 'shipped').length}
            </span>
            <span className="text-[10px] font-black uppercase text-gray-400">Traspasos en Tránsito</span>
          </div>
        </div>

        <div className="bg-amber-50 border-2 border-amber-200 border-b-[6px] rounded-3xl p-4 flex items-center gap-3">
          <span className="text-3xl select-none">🏢</span>
          <div className="overflow-hidden">
            <span className="text-xs font-black text-amber-800 block truncate leading-none">
              {branches.find(b => b.id === activeBranchId)?.name || 'Sin sucursal'}
            </span>
            <span className="text-[10px] font-black uppercase text-amber-600 leading-tight">Canal Comercial Activo</span>
          </div>
        </div>
      </div>

      {/* Tabs Row */}
      <div className="flex flex-wrap border-b-2 border-gray-200 gap-1 md:gap-4 select-none">
        {[
          { id: 'branches', label: '🏪 Sucursales & Almacenes', count: branches.length },
          { id: 'registers', label: '🖥️ Cajas del Canal', count: activeBranchRegisters.length },
          { id: 'central', label: '🏢 CEDIS (Central Hub)', count: suggestedRestocksList.length, badgeColor: 'bg-red-500 text-white animate-pulse' },
          { id: 'transfers', label: '🚚 Bitácora de Traspaso', count: stockTransfers.length }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveSubTab(tab.id as any); playSound('click'); }}
            className={`pb-3 px-3 text-xs md:text-sm font-black uppercase tracking-wider border-b-4 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === tab.id
                ? 'border-[#58cc02] text-[#58cc02]'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${tab.badgeColor || 'bg-gray-100 text-gray-550'}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ----------------- FORMS MODALS ----------------- */}
      {showBranchForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border-2 border-gray-200 p-5 max-w-md w-full space-y-4 animate-scaleUp text-left">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-lg font-black text-gray-800 flex items-center gap-1">🏦 Dar de Alta Sucursal / CEDIS</h3>
              <button onClick={() => setShowBranchForm(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>

            <form onSubmit={handleCreateBranch} className="space-y-3.5 text-xs font-bold">
              <div className="space-y-1">
                <label className="text-gray-500 block uppercase">Nombre de la Sucursal</label>
                <input
                  type="text"
                  placeholder="Ej. Sucursal Duo Centro, CEDIS Almacén Central"
                  value={newBranchName}
                  onChange={e => setNewBranchName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border-2 rounded-xl focus:border-green-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-gray-500 block uppercase">Tipo de Punto</label>
                  <select
                    value={newBranchType}
                    onChange={e => setNewBranchType(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border-2 rounded-xl outline-none"
                  >
                    <option value="branch">Sucursal Estándar</option>
                    <option value="central">Almacén Central (CEDIS)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-gray-500 block uppercase">Emoji Representativo</label>
                  <input
                    type="text"
                    placeholder="🏪, 🏢, 🦉, 🦁"
                    value={newBranchEmoji}
                    onChange={e => setNewBranchEmoji(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border-2 rounded-xl outline-none text-center text-lg"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-gray-500 block uppercase">Ciudad sede</label>
                <input
                  type="text"
                  placeholder="Ej. CDMX, Monterrey, Guadalajara"
                  value={newBranchCity}
                  onChange={e => setNewBranchCity(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border-2 rounded-xl outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-gray-500 block uppercase">Dirección Física Completa</label>
                <textarea
                  placeholder="Escriba la calle, número, col. y código postal para el timbrado fiscal"
                  value={newBranchAddress}
                  onChange={e => setNewBranchAddress(e.target.value)}
                  rows={2}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border-2 rounded-xl outline-none text-xs font-bold font-sans"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBranchForm(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-extrabold py-3 border-b-4 border-gray-300 rounded-xl uppercase text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#58cc02] text-white font-black py-3 border-b-4 border-[#3c9e01] rounded-xl uppercase text-xs"
                >
                  Confirmar Alta 🚀
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showRegisterForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border-2 border-gray-200 p-5 max-w-sm w-full space-y-4 animate-scaleUp text-left">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-base font-black text-gray-800">🖥️ Añadir Caja / Terminal de Cobro</h3>
              <button onClick={() => setShowRegisterForm(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>

            <form onSubmit={handleCreateRegister} className="space-y-3.5 text-xs font-bold">
              <div className="space-y-1">
                <label className="text-gray-500 block uppercase">Sucursal Destino</label>
                <input
                  type="text"
                  disabled
                  value={activeBranch.name}
                  className="w-full px-3.5 py-2.5 bg-gray-100 border-2 text-gray-500 rounded-xl cursor-not-allowed"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 space-y-1">
                  <label className="text-gray-500 block uppercase">Nombre de Caja</label>
                  <input
                    type="text"
                    placeholder="Ej. Caja Rápida, Kiosco K-2"
                    value={newRegName}
                    onChange={e => setNewRegName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border-2 rounded-xl focus:border-indigo-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-gray-500 block uppercase">Icono</label>
                  <select
                    value={newRegEmoji}
                    onChange={e => setNewRegEmoji(e.target.value)}
                    className="w-full px-2 py-2.5 bg-gray-50 border-2 rounded-xl outline-none"
                  >
                    <option value="💵">💵 Caja</option>
                    <option value="⚡">⚡ Rápida</option>
                    <option value="🤖">🤖 Auto</option>
                    <option value="📱">📱 Móvil</option>
                    <option value="📦">📦 CEDIS</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRegisterForm(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-extrabold py-3 border-b-4 border-gray-300 rounded-xl uppercase text-xs"
                >
                  Cerrar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 text-white font-black py-3 border-b-4 border-indigo-800 rounded-xl uppercase text-xs"
                >
                  Registrar 💾
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- TAB: BRANCHES ----------------- */}
      {activeSubTab === 'branches' && (
        <div className="space-y-5 animate-fadeIn">
          <div className="bg-gradient-to-r from-[#e5f5ff] to-white border-2 border-blue-200 rounded-3xl p-5 flex flex-col md:flex-row justify-between items-center gap-4 text-left">
            <div>
              <span className="text-[9px] bg-blue-200 text-blue-900 font-black px-2 py-0.5 rounded uppercase">Consejo de Logística Duo</span>
              <h4 className="text-base font-black text-blue-950 mt-1">¿Cómo administrar múltiples sucursales?</h4>
              <p className="text-xs text-blue-800 font-bold max-w-xl">
                Cada sucursal mantiene sus existencias de insumos por separado. El Almacén Central (CEDIS) es el Hub general: puede comprar materia prima en volumen a proveedores y rellenar las reservas críticas de las sucursales con envíos express.
              </p>
            </div>
            <div className="bg-white border-2 border-blue-200 px-4 py-2.5 rounded-2xl shrink-0 font-black text-center text-xs text-blue-950">
              ⚡ Cambiar de sucursal es 100% gratuito.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {branches.map(br => {
              const isActive = br.id === activeBranchId;
              const isCentral = br.type === 'central';
              const stats = branchesStats[br.id] || { totalSales: 0, count: 0 };
              const termCount = registers.filter(r => r.branchId === br.id).length;

              return (
                <div 
                  key={br.id} 
                  className={`bg-white border-2 rounded-3xl p-5 flex flex-col justify-between relative transition-all ${
                    isActive 
                      ? 'border-[#58cc02] border-b-8 ring-4 ring-[#58cc02]/10 scale-[1.01]' 
                      : 'border-gray-200 border-b-[6px] hover:border-gray-300'
                  }`}
                >
                  {isActive && (
                    <span className="absolute -top-3 left-4 bg-[#58cc02] border border-white text-white font-black uppercase text-[8px] py-0.5 px-2 rounded-full tracking-wide">
                      ● SUCURSAL ACTIVA
                    </span>
                  )}

                  <div className="space-y-3.5 text-left">
                    <div className="flex justify-between items-start">
                      <span className="text-4xl p-2 bg-slate-50 border border-slate-100 rounded-2xl block">{br.emoji || '🏪'}</span>
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${
                        isCentral ? 'bg-indigo-50 border-indigo-250 text-indigo-700' : 'bg-emerald-50 border-emerald-250 text-emerald-700'
                      }`}>
                        {isCentral ? 'CEDIS / Almacén' : 'Punto de Venta'}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-lg font-black text-gray-800 leading-tight flex items-center gap-1.5 font-sans">
                        {br.name}
                      </h4>
                      <p className="text-[10px] text-gray-400 font-extrabold uppercase flex items-center gap-0.5 pt-0.5">
                        <MapPin size={10} /> {br.city} • {br.address}
                      </p>
                    </div>

                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 grid grid-cols-2 gap-2 text-center">
                      <div>
                        <span className="text-[8px] uppercase font-black text-gray-404 block leading-none">Ventas</span>
                        <span className="text-sm font-black text-gray-800 leading-none">${stats.totalSales.toFixed(2)}</span>
                        <span className="text-[9px] font-bold text-gray-400 block pt-0.5">{stats.count} tanz.</span>
                      </div>
                      <div className="border-l">
                        <span className="text-[8px] uppercase font-black text-gray-404 block leading-none">Terminales</span>
                        <span className="text-sm font-black text-gray-800 leading-none">{termCount}</span>
                        <span className="text-[9px] font-bold text-gray-400 block pt-0.5">Activas</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 mt-1 border-t border-dashed border-gray-100">
                    {isActive ? (
                      <button
                        type="button"
                        disabled
                        className="w-full bg-[#58cc02]/10 text-[#58cc02] border border-[#58cc02]/30 font-black text-xs py-2.5 rounded-xl uppercase tracking-wider cursor-not-allowed select-none text-center"
                      >
                        ✓ Trabajando Aquí
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSelectBranch(br.id)}
                        className="w-full bg-white text-gray-700 border-2 border-gray-200 border-b-4 hover:bg-gray-50 font-black text-xs py-2.5 rounded-xl uppercase tracking-wider cursor-pointer"
                      >
                        Alternar a esta Sucursal 🔌
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ----------------- TAB: REGISTERS (MULTI-CAJA) ----------------- */}
      {activeSubTab === 'registers' && (
        <div className="space-y-4 animate-fadeIn">
          
          <div className="bg-white border-2 border-gray-200 rounded-3xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-left">
            <div>
              <h3 className="text-lg font-black text-gray-800 flex items-center gap-1.5">
                Terminales en: <span className="text-[#58cc02]">{activeBranch.name}</span>
              </h3>
              <p className="text-xs text-gray-400 font-extrabold">Cada terminal o caja registra de forma aislada su propio arqueo de fondos y turnos de cajeros.</p>
            </div>
            
            <button
              onClick={() => {
                if (currentUser.role !== 'admin') {
                  alert('🔒 Acceso Denegado: Solo el Administrador Corporativo puede agregar o configurar nuevas cajas registradoras de flujo legal de dinero.');
                } else {
                  setShowRegisterForm(true);
                  playSound('click');
                }
              }}
              className="bg-indigo-600 border-b-4 border-indigo-800 text-white font-black py-2.5 px-4 rounded-xl text-xs uppercase cursor-pointer"
            >
              + Agregar Caja
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {activeBranchRegisters.map(reg => {
              const isSelected = reg.id === activeRegisterId;
              
              // Find if this register currently has an active shift
              const isShiftOpen = activeShift && activeShift.registerId === reg.id;
              
              return (
                <div 
                  key={reg.id} 
                  className={`bg-white border-2 rounded-3xl p-5 flex flex-col justify-between relative transition-all ${
                    isSelected 
                      ? 'border-indigo-500 border-b-8 ring-4 ring-indigo-500/10' 
                      : 'border-gray-200 border-b-[6px]'
                  }`}
                >
                  <div className="space-y-3 text-left">
                    <div className="flex justify-between items-center">
                      <span className="text-3xl p-1 bg-slate-50 border rounded-xl">{reg.emoji || '🖥️'}</span>
                      
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${
                        isShiftOpen 
                          ? 'bg-green-100 text-green-700 animate-pulse' 
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {isShiftOpen ? '● Turno Abierto' : '● Turno Cerrado'}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-base font-black text-gray-800 leading-tight">{reg.name}</h4>
                      <p className="text-[9px] text-gray-400 font-extrabold uppercase">Ref: #{reg.id}</p>
                    </div>

                    <div className="text-[11px] font-bold text-gray-500 space-y-1 bg-gray-50 p-2.5 rounded-xl border border-dashed border-gray-200">
                      <div className="flex justify-between">
                        <span>Estado Operativo:</span>
                        <span className="text-gray-800">Disponible (Activa)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cajero de Turno:</span>
                        <strong className="text-indigo-600">{isShiftOpen ? activeShift?.employeeName : 'Ninguno'}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-100 mt-3">
                    {isSelected ? (
                      <button
                        type="button"
                        disabled
                        className="w-full bg-indigo-50 text-indigo-600 border border-indigo-200 font-extrabold text-xs py-2 rounded-xl text-center cursor-not-allowed select-none"
                      >
                        ✓ Terminal Vinculada al POS
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSelectRegister(reg.id)}
                        className="w-full bg-white text-gray-650 border border-gray-200 hover:bg-gray-50 font-black text-xs py-2 rounded-xl text-center cursor-pointer"
                      >
                        Vincular esta Terminal 🎯
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ----------------- TAB: ALMACEN CENTRAL (CEDIS / HUB) ----------------- */}
      {activeSubTab === 'central' && (
        <div className="space-y-6 animate-fadeIn">
          
          <div className="bg-[#1cb0f6] border-2 border-[#1899d6] border-b-8 rounded-3xl p-5 md:p-6 text-white relative overflow-hidden text-left shadow-xs">
            <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-1.5">
              <span>🏢</span> Centro de Distribución CEDIS DuoPOS
            </h3>
            <p className="text-xs md:text-sm font-semibold text-blue-50 mt-1 max-w-xl">
              Abastece la red de tiendas de la corporación. Compila de forma ágil traspasos sugeridos basados en alertas de bajo stock y despliégalos en un solo clic. ¡Gana <strong>+80 XP</strong>!
            </p>
          </div>

          {/* Quick Alarm / Auto restock trigger */}
          {suggestedRestocksList.length > 0 ? (
            <div className="bg-red-50 border-2 border-red-200 rounded-3xl p-5 flex flex-col md:flex-row justify-between items-center gap-4 text-left">
              <div className="space-y-0.5">
                <span className="text-[9px] bg-red-200 text-red-900 border border-red-300 font-black px-2 py-0.5 rounded uppercase">Crisis de Inventarios</span>
                <h4 className="text-base font-black text-red-950">Se detectaron {suggestedRestocksList.length} alertas deficitarias en locales</h4>
                <p className="text-xs text-red-800 font-bold max-w-lg">
                  Varias sucursales tienen insumos críticos con stock inferior al mínimo. CEDIS tiene fondos suficientes para despachar un envío masivo de resurtido de inmediato.
                </p>
              </div>

              <button
                onClick={handleBulkDispatchSuggested}
                className="bg-red-500 border-b-4 border-red-700 hover:bg-red-650 active:border-b-0 active:translate-y-1 text-white font-black py-3 px-5 rounded-2xl text-xs uppercase cursor-pointer"
              >
                Atender Alertas Masivas 🚚 (+80 XP)
              </button>
            </div>
          ) : (
            <div className="bg-green-50 border-2 border-green-200 rounded-3xl p-5 text-center text-green-800 font-black text-xs">
              ✅ LOGÍSTICA FLUIDA: Ninguna sucursal reporta bajo stock por debajo de su reserva mínima en este momento.
            </div>
          )}

          {/* Direct Manual Stock Transfer Calculator / Simulator */}
          <div className="bg-white border-2 border-gray-200 border-b-[6px] rounded-3xl p-5 space-y-4">
            <h4 className="text-sm font-black uppercase text-gray-450 border-b pb-2 flex items-center gap-1">
              <ArrowLeftRight size={14} /> Calculadora de Despacho Corporativo (Traspaso Directo)
            </h4>

            <form onSubmit={handleSubmitTransfer} className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs font-bold">
              <div className="space-y-4 md:col-span-1">
                <div className="space-y-1 text-left">
                  <label className="text-gray-500 block uppercase">Sucursal Origen (Emisor)</label>
                  <select 
                    value={transferFrom}
                    onChange={e => { setTransferFrom(e.target.value); playSound('click'); }}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border-2 rounded-xl outline-none"
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.emoji} {b.name} ({b.city})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1 text-left">
                  <label className="text-gray-500 block uppercase">Sucursal Destino (Receptor)</label>
                  <select 
                    value={transferTo}
                    onChange={e => { setTransferTo(e.target.value); playSound('click'); }}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border-2 rounded-xl outline-none"
                  >
                    <option value="">-- Seleccionar Destino --</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.emoji} {b.name} ({b.city})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1 text-left">
                  <label className="text-gray-500 block uppercase">Notas de Despacho</label>
                  <textarea 
                    placeholder="Escriba el motivo, transportista asignado o especificaciones..."
                    value={transferNotes}
                    onChange={e => setTransferNotes(e.target.value)}
                    rows={2}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border-2 rounded-xl outline-none font-bold text-xs"
                  />
                </div>

                {transferError && (
                  <p className="text-red-500 text-[10px] uppercase font-black tracking-wide flex items-center gap-0.5">
                    <AlertCircle size={10} /> {transferError}
                  </p>
                )}

                <button
                  type="submit"
                  className="w-full bg-[#58cc02] border-b-4 border-[#3c9e01] hover:bg-[#61e002] active:border-b-0 active:translate-y-1 text-white font-black py-3 rounded-2xl text-xs uppercase cursor-pointer"
                >
                  Confirmar y Generar Guía de Traspaso 📝
                </button>
              </div>

              <div className="md:col-span-2 space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex justify-between items-center border-b pb-1">
                    <span className="text-xs uppercase font-black text-gray-405 leading-none">Insumos del Lote Directo</span>
                    <button
                      type="button"
                      onClick={handleAddTransferItem}
                      className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 tracking-wide font-black px-2.5 py-1 rounded-lg text-[10px] uppercase cursor-pointer"
                    >
                      + Producto
                    </button>
                  </div>

                  {transferItems.length === 0 ? (
                    <div className="text-center py-10">
                      <span className="text-4xl">🥫</span>
                      <p className="text-gray-400 font-bold text-[11px] pt-2">Agregue artículos al bloque de carga.</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[180px] overflow-y-auto">
                      {transferItems.map((item, idx) => {
                        const productMatch = products.find(p => p.id === item.productId);
                        // lookup current stock of this product at selected origin branch
                        const originStock = productMatch?.branchesStock?.[transferFrom] ?? (productMatch?.stock ?? 0);

                        return (
                          <div key={idx} className="flex flex-wrap items-center gap-2 bg-white border border-gray-150 p-2 rounded-xl text-left first:mt-0">
                            <select
                              value={item.productId}
                              onChange={e => handleUpdateTransferItem(idx, e.target.value, item.quantity)}
                              className="flex-1 min-w-[120px] bg-slate-50 border p-1.5 rounded-lg outline-none font-extrabold text-[11px]"
                            >
                              {products.map(p => (
                                <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>
                              ))}
                            </select>

                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-gray-400">Stock Orig: <strong className="text-gray-700 font-extrabold">{originStock}</strong></span>
                              <input
                                type="number"
                                min={1}
                                max={999}
                                value={item.quantity}
                                onChange={e => handleUpdateTransferItem(idx, item.productId, Math.max(1, parseInt(e.target.value) || 0))}
                                className="w-16 bg-slate-50 border text-center p-1 font-mono rounded-lg outline-none font-bold"
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveTransferItem(idx)}
                              className="text-red-500 hover:text-red-650 p-1 rounded-lg border border-red-150 hover:bg-red-50 cursor-pointer flex items-center justify-center"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="bg-white p-3 rounded-xl border border-gray-250 text-left font-bold text-[10px] text-indigo-950">
                  ⚡ Las mercancías descontadas en el Origen quedarán retenidas en el estado de "Guía Embarcada" hasta que un dependiente en la sucursal de destino registre el ingreso de bodega, garantizando una doble firma de confirmación fiscal.
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- TAB: TRANSFER LEDGER (BITACORA DE TRASPASOS) ----------------- */}
      {activeSubTab === 'transfers' && (
        <div className="space-y-4 animate-fadeIn text-left">
          
          <div className="bg-white border-2 border-gray-200 border-b-[6px] rounded-3xl p-5 space-y-4">
            <h4 className="text-xs font-black uppercase text-gray-450 border-b pb-2">Historial de Embarques y Traslados de Inventario ({stockTransfers.length})</h4>
            
            {stockTransfers.length === 0 ? (
              <p className="text-center py-10 text-xs text-gray-400 font-bold">📂 No se han registrado movimientos de traspaso entre locales.</p>
            ) : (
              <div className="divide-y divide-gray-100 font-sans text-xs">
                {stockTransfers.map(tr => {
                  const isPending = tr.status === 'pending';
                  const isShipped = tr.status === 'shipped';
                  const isReceived = tr.status === 'received';
                  const isCancelled = tr.status === 'cancelled';

                  // Destined to current branch?
                  const isDestinedToActiveBranch = tr.toBranchId === activeBranchId;
                  const isOriginOfActiveBranch = tr.fromBranchId === activeBranchId;

                  return (
                    <div key={tr.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 first:pt-0">
                      <div className="space-y-1 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-mono text-xs font-black text-indigo-600 font-bold">
                            {tr.id.startsWith('TR-') ? tr.id : `TR-${tr.id.slice(0, 8).toUpperCase()}`}
                          </span>
                          <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${
                            isReceived ? 'bg-green-50 text-green-700 border-green-200' :
                            isShipped ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse' :
                            isCancelled ? 'bg-red-50 text-red-550 border-red-200' :
                            'bg-gray-100 text-gray-650 border-gray-250'
                          }`}>
                            {isReceived ? 'Ingresado ✅' : isShipped ? 'En Tránsito 🚐' : isCancelled ? 'Cancelado ❌' : 'Borrador 📝'}
                          </span>

                          <span className="text-[10px] text-gray-405 font-bold">
                            Creado: {new Date(tr.createdAt).toISOString().split('T')[1].slice(0, 5)} hrs UTC
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-1 text-gray-800 pt-1 font-extrabold text-sm">
                          <span>{tr.fromBranchName}</span>
                          <ChevronRight size={14} className="text-gray-400" />
                          <span className="text-[#1cb0f6]">{tr.toBranchName}</span>
                        </div>

                        {tr.notes && <p className="text-[10px] text-gray-405 italic leading-tight">Nota: {tr.notes}</p>}

                        <div className="flex flex-wrap gap-1.5 pt-2">
                          {tr.items.map((it, i) => (
                            <span key={i} className="bg-slate-100 text-slate-700 text-[10px] py-1 px-2 border rounded-lg font-bold">
                              {it.emoji} {it.name} <strong className="text-gray-700 font-extrabold">x{it.quantity} un</strong>
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* CTA Buttons based on state */}
                      <div className="flex flex-wrap gap-1.5 shrink-0">
                        {isPending && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleCancelTransfer(tr.id)}
                              className="bg-white border rounded-lg text-red-500 font-bold px-3 py-1.5 cursor-pointer text-[11px]"
                            >
                              Anular
                            </button>
                            <button
                              type="button"
                              onClick={() => handleShipTransfer(tr.id)}
                              className="bg-indigo-600 text-white font-black px-3.5 py-1.5 rounded-lg text-[11px]"
                            >
                              Embarcar Lote 🚐
                            </button>
                          </>
                        )}

                        {isShipped && isDestinedToActiveBranch && (
                          <button
                            type="button"
                            onClick={() => handleReceiveTransfer(tr.id)}
                            className="bg-[#58cc02] hover:bg-[#61e002] text-white font-black px-4 py-2 rounded-xl text-[11px]"
                          >
                            Dar Entrada a Bodega 📁
                          </button>
                        )}

                        {isShipped && !isDestinedToActiveBranch && (
                          <span className="text-[10px] text-gray-400 font-black uppercase italic bg-slate-50 border border-slate-150 p-2 rounded-xl block">
                            En camino a: {tr.toBranchName.replace(/🦉|🏪|🏢|🦁/g, '')}
                          </span>
                        )}

                        {isReceived && (
                          <div className="flex items-center gap-1 text-green-600 font-black uppercase text-[10px] bg-green-50 px-3 py-1.5 rounded-lg border border-green-200">
                            <CheckCircle2 size={12} /> Completado
                          </div>
                        )}

                        {isCancelled && (
                          <span className="text-gray-400 font-black uppercase text-[10px] bg-gray-50 border p-2 rounded-lg">Anulado</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
