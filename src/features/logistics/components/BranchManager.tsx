/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Product, Branch, CashRegister, User } from '../../../types/index';
import { playSound } from '../../../services/sounds';
import { syncInsert } from '../../../services/supabaseSync';
import { LicenseDetails, PLANS } from '../../../services/licensing';
import { Plus, MapPin, X } from 'lucide-react';

interface BranchManagerProps {
  branches: Branch[];
  setBranches: React.Dispatch<React.SetStateAction<Branch[]>>;
  activeBranchId: string;
  onSelectBranch: (id: string) => void;
  registers: CashRegister[];
  setRegisters: React.Dispatch<React.SetStateAction<CashRegister[]>>;
  products: Product[];
  onUpdateProduct: (prod: Product) => void;
  branchesStats: Record<string, { totalSales: number; count: number }>;
  currentUser: User;
  licenseDetails: LicenseDetails;
  onGrantXp: (amount: number) => void;
  showBranchForm: boolean;
  onCloseForm: () => void;
}

export default function BranchManager({
  branches,
  setBranches,
  activeBranchId,
  onSelectBranch,
  registers,
  setRegisters,
  products,
  onUpdateProduct,
  branchesStats,
  currentUser,
  licenseDetails,
  onGrantXp,
  showBranchForm,
  onCloseForm
}: BranchManagerProps) {
  
  // Localized form states
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchType, setNewBranchType] = useState<'branch' | 'central'>('branch');
  const [newBranchEmoji, setNewBranchEmoji] = useState('🏪');
  const [newBranchCity, setNewBranchCity] = useState('CDMX');
  const [newBranchAddress, setNewBranchAddress] = useState('');

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim() || !newBranchAddress.trim()) {
      alert('Por favor, especifica el nombre y domicilio legal.');
      return;
    }

    const currentTier = licenseDetails?.tier || 'free';
    const limit = PLANS[currentTier]?.allowedBranches || 1;
    if (branches.length >= limit) {
      playSound('error');
      alert(`Límite de sucursales alcanzado: Tu plan [${PLANS[currentTier]?.name}] solo permite hasta ${limit} sucursal(es). Por favor actualiza tu licencia a Pro para habilitar hasta 5 sucursales.`);
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

    onCloseForm();
    setNewBranchName('');
    setNewBranchAddress('');
    onGrantXp(40);
    playSound('levelup');
  };

  return (
    <div className="space-y-5 animate-fadeIn text-left">
      
      {/* Modal Alta Sucursal */}
      {showBranchForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border-2 border-gray-200 p-5 max-w-md w-full space-y-4 animate-scaleUp text-left">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-lg font-black text-gray-800 flex items-center gap-1">🏦 Dar de Alta Sucursal / CEDIS</h3>
              <button onClick={onCloseForm} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
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
                  onClick={onCloseForm}
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

      <div className="bg-gradient-to-r from-[#e5f5ff] to-white border-2 border-blue-200 rounded-3xl p-5 flex flex-col md:flex-row justify-between items-center gap-4 text-left font-sans">
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 font-sans">
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
                    <span className="text-[8px] uppercase font-black text-gray-400 block leading-none">Ventas</span>
                    <span className="text-sm font-black text-gray-800 leading-none">${stats.totalSales.toFixed(2)}</span>
                    <span className="text-[9px] font-bold text-gray-400 block pt-0.5">{stats.count} tanz.</span>
                  </div>
                  <div className="border-l">
                    <span className="text-[8px] uppercase font-black text-gray-400 block leading-none">Terminales</span>
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
                    onClick={() => onSelectBranch(br.id)}
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
  );
}
