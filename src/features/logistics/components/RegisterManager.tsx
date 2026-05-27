/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Branch, CashRegister, CashShift, User } from '../../../types/index';
import { playSound } from '../../../services/sounds';
import { syncInsert } from '../../../services/supabaseSync';
import { X } from 'lucide-react';

export interface RegisterManagerProps {
  activeBranch: Branch;
  activeBranchId: string;
  registers: CashRegister[];
  setRegisters: React.Dispatch<React.SetStateAction<CashRegister[]>>;
  activeRegisterId: string;
  onSelectRegister: (id: string) => void;
  activeShift: CashShift | null;
  currentUser: User;
  onGrantXp: (amount: number) => void;
  showRegisterForm: boolean;
  onCloseForm: () => void;
  onOpenRegisterForm: () => void;
}

export default function RegisterManager({
  activeBranch,
  activeBranchId,
  registers,
  setRegisters,
  activeRegisterId,
  onSelectRegister,
  activeShift,
  currentUser,
  onGrantXp,
  showRegisterForm,
  onCloseForm,
  onOpenRegisterForm
}: RegisterManagerProps) {
  
  // Localized form states
  const [newRegName, setNewRegName] = useState('');
  const [newRegEmoji, setNewRegEmoji] = useState('💵');

  // filtered registers of current branch
  const activeBranchRegisters = useMemo(() => {
    return registers.filter(r => r.branchId === activeBranchId);
  }, [registers, activeBranchId]);

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

    onCloseForm();
    setNewRegName('');
    onGrantXp(25);
    playSound('success');
  };

  return (
    <div className="space-y-4 animate-fadeIn text-left font-sans">
      
      {/* Modal Añadir Caja */}
      {showRegisterForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border-2 border-gray-200 p-5 max-w-sm w-full space-y-4 animate-scaleUp text-left">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-base font-black text-gray-800">🖥️ Añadir Caja / Terminal de Cobro</h3>
              <button onClick={onCloseForm} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>

            <form onSubmit={handleCreateRegister} className="space-y-3.5 text-xs font-bold">
              <div className="space-y-1">
                <label className="text-gray-500 block uppercase">Sucursal Destino</label>
                <input
                  type="text"
                  disabled
                  value={activeBranch?.name || 'Sucursal Seleccionada'}
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
                  onClick={onCloseForm}
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

      <div className="bg-white border-2 border-gray-200 rounded-3xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-left font-sans">
        <div>
          <h3 className="text-lg font-black text-gray-800 flex items-center gap-1.5 font-sans">
            Terminales en: <span className="text-[#58cc02]">{activeBranch?.name}</span>
          </h3>
          <p className="text-xs text-gray-400 font-extrabold">Cada terminal o caja registra de forma aislada su propio arqueo de fondos y turnos de cajeros.</p>
        </div>
        
        <button
          onClick={() => {
            if (currentUser.role !== 'admin') {
              alert('🔒 Acceso Denegado: Solo el Administrador Corporativo puede agregar o configurar nuevas cajas registradoras de flujo legal de dinero.');
            } else {
              playSound('click');
              onOpenRegisterForm();
            }
          }}
          className="bg-indigo-600 border-b-4 border-indigo-800 text-white font-black py-2.5 px-4 rounded-xl text-xs uppercase cursor-pointer"
        >
          + Agregar Caja
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 font-sans">
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
                      : 'bg-gray-100 text-gray-550'
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

              <div className="pt-3 border-t border-gray-100 mt-3 font-sans">
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
                    onClick={() => onSelectRegister(reg.id)}
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
  );
}
