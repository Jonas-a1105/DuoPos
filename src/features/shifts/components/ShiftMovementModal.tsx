import React, { useState } from 'react';
import { playSound } from '../../../services/sounds';
import { ArrowUpRight, ArrowDownRight, Layers } from 'lucide-react';

interface ShiftMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  computedExpectedCash: number;
  onAddShiftMovement: (type: 'in' | 'out', amount: number, reason: string) => void;
  onGrantXp: (amount: number) => void;
}

export default function ShiftMovementModal({
  isOpen,
  onClose,
  computedExpectedCash,
  onAddShiftMovement,
  onGrantXp,
}: ShiftMovementModalProps) {
  const [moveType, setMoveType] = useState<'in' | 'out'>('in');
  const [moveAmount, setMoveAmount] = useState('');
  const [moveReason, setMoveReason] = useState('');
  const [movementFeedback, setMovementFeedback] = useState('');

  if (!isOpen) return null;

  const handleSubmitMovement = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(moveAmount);
    if (isNaN(amt) || amt <= 0) {
      setMovementFeedback('⚠️ Ingresa un monto mayor a 0');
      return;
    }

    if (moveType === 'out' && amt > computedExpectedCash) {
      setMovementFeedback(
        `⛔ Fondos insuficientes. No puedes extraer más del efectivo real en caja ($${computedExpectedCash.toFixed(2)})`,
      );
      return;
    }

    const reasonClean = moveReason.trim() || (moveType === 'in' ? 'Abastecimiento de Cambio' : 'Retiro Administrativo');
    onAddShiftMovement(moveType, amt, reasonClean);
    playSound('kaching');
    onGrantXp(10); // Reward active operations

    setMoveAmount('');
    setMoveReason('');
    setMovementFeedback('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-3xs flex items-center justify-center p-4">
      <div className="bg-white border-2 border-gray-200 border-b-8 rounded-3xl p-6 max-w-sm w-full space-y-4 animate-scaleUp text-gray-855 shadow-xl">
        <div className="flex justify-between items-center border-b pb-2">
          <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight">📥 Registrar Movimiento Caja</h3>
          <button
            onClick={() => {
              onClose();
              playSound('click');
            }}
            className="text-[#9c9c9c] hover:text-gray-500 text-lg font-black p-1 cursor-pointer font-sans"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmitMovement} className="space-y-4 text-xs text-left">
          {/* Type Switcher */}
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-black text-[#555] block">Dirección del Efectivo</span>
            <div className="grid grid-cols-2 gap-2 bg-gray-55 p-1.5 rounded-2xl border-2 border-gray-200">
              <button
                type="button"
                onClick={() => {
                  setMoveType('in');
                  playSound('click');
                }}
                className={`py-2 rounded-xl text-xs font-black uppercase transition-all tracking-wider flex items-center justify-center gap-1 cursor-pointer ${
                  moveType === 'in' ? 'bg-green-500 text-white shadow-xs' : 'text-gray-500 hover:bg-gray-105'
                }`}
              >
                📥 Entrada (Sencillo)
              </button>
              <button
                type="button"
                onClick={() => {
                  setMoveType('out');
                  playSound('click');
                }}
                className={`py-2 rounded-xl text-xs font-black uppercase transition-all tracking-wider flex items-center justify-center gap-1 cursor-pointer ${
                  moveType === 'out' ? 'bg-amber-500 text-white shadow-xs' : 'text-gray-500 hover:bg-gray-105'
                }`}
              >
                📤 Retiro (Gasto)
              </button>
            </div>
          </div>

          {/* Amount input */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-black text-gray-500 block">Monto a Registrar ($)</label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 font-extrabold text-[#58cc02] text-sm leading-none">$</span>
              <input
                type="number"
                step="0.01"
                required
                value={moveAmount}
                onChange={(e) => setMoveAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-7 pr-4 py-2.5 bg-white border-2 border-gray-200 focus:border-[#58cc02] rounded-xl font-bold font-mono text-xs text-gray-700 outline-none transition-colors"
                min="0.01"
              />
            </div>
          </div>

          {/* Preset Buttons */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-black text-[#555] block">Conceptos Preestablecidos</label>
            <div className="flex flex-wrap gap-1.5">
              {(moveType === 'in'
                ? ['Ingreso de cambio sencillo 💰', 'Ajuste por sustrato extra 📂', 'Fondo adicional']
                : ['Pago a proveedor menor 📦', 'Retiro de seguridad (Fuerte) 🔒', 'Gasto emergente local 🦉']
              ).map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    setMoveReason(label);
                    playSound('click');
                  }}
                  className={`text-[9px] py-1.5 px-2.5 rounded-lg border font-black transition-all cursor-pointer ${
                    moveReason === label
                      ? 'bg-[#1cb0f6] text-white border-[#1cb0f6]'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-105'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Reason Input */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-black text-gray-500 block">
              Observación / Justificación Manual
            </label>
            <textarea
              value={moveReason}
              onChange={(e) => setMoveReason(e.target.value)}
              placeholder="Detalle el motivo del movimiento..."
              rows={2}
              className="w-full p-2.5 bg-white border-2 border-gray-200 focus:border-[#58cc02] rounded-xl font-bold text-xs text-gray-700 outline-none transition-colors"
            />
          </div>

          {movementFeedback && (
            <p className="text-[10px] font-black leading-none text-red-500 uppercase mt-2">{movementFeedback}</p>
          )}

          <button
            type="submit"
            className="w-full bg-[#1cb0f6] text-white border-b-4 border-sky-700 hover:bg-[#32beff] active:border-b-0 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Layers size={13} /> Grabar Operación de Arca 📥
          </button>
        </form>
      </div>
    </div>
  );
}
