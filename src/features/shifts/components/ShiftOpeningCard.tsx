import React, { useState } from 'react';
import { playSound } from '../../../services/sounds';
import { toast } from '../../../components/Modal/FlashNotifications';

interface ShiftOpeningCardProps {
  onOpenShift: (amount: number) => void;
  onGrantXp: (amount: number) => void;
}

export default function ShiftOpeningCard({ onOpenShift, onGrantXp }: ShiftOpeningCardProps) {
  const [openFund, setOpenFund] = useState('200');

  const selectOpeningPreset = (val: string) => {
    setOpenFund(val);
    playSound('click');
  };

  const handleOpenLocalShift = () => {
    const val = parseFloat(openFund);
    if (isNaN(val) || val < 0) {
      toast.error('⚠️ Por favor ingresa un fondo inicial válido mayor o igual a 0.');
      return;
    }
    onOpenShift(val);
    playSound('kaching');
    onGrantXp(20); // Award opening experience points!
  };

  return (
    <div className="max-w-xl mx-auto bg-white border-2 border-gray-200 border-b-8 rounded-3xl p-6 md:p-8 space-y-6 text-center animate-scaleUp text-gray-855 my-4">
      <div className="space-y-2">
        <span className="text-7xl block select-none drop-shadow-xs leading-none animate-bounce">🔓</span>
        <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">Caja Cerrada temporalmente</h3>
        <p className="text-xs text-gray-400 font-extrabold max-w-sm mx-auto uppercase">
          Declara fondos iniciales para habilitar el motor de ventas
        </p>
      </div>

      {/* Suggestions */}
      <div className="space-y-4 bg-gray-50 border-2 border-dashed border-gray-200 p-5 rounded-2xl text-left">
        <span className="text-[10px] uppercase font-black tracking-widest text-[#777] block text-center md:text-left">
          Monto de Fondo en Efectivo Recomendado
        </span>
        <div className="grid grid-cols-4 gap-2">
          {['100', '200', '500', '1000'].map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => selectOpeningPreset(val)}
              className={`py-2 rounded-xl text-xs font-black border-2 transition-all cursor-pointer ${
                openFund === val
                  ? 'bg-[#58cc02] border-[#58cc02] text-white shadow-xs'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-105'
              }`}
            >
              ${val}
            </button>
          ))}
        </div>

        <div className="space-y-1.5 pt-1">
          <label className="text-[10px] uppercase font-bold text-gray-500 block">
            Fondo Inicial de Caja Manual ($)
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-2.5 font-extrabold text-[#58cc02] text-sm leading-none">$</span>
            <input
              type="number"
              value={openFund}
              onChange={(e) => setOpenFund(e.target.value)}
              placeholder="0.00"
              className="w-full pl-7 pr-4 py-2 bg-white border-2 border-gray-200 focus:border-[#58cc02] rounded-xl font-bold font-mono text-xs text-gray-700 outline-none transition-colors"
              min="0"
            />
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleOpenLocalShift}
        className="w-full bg-[#58cc02] text-white border-b-4 border-[#3c9e01] hover:bg-[#61e002] active:translate-y-0.5 active:border-b-2 py-4 rounded-2xl font-black text-xs uppercase tracking-wider cursor-pointer shadow-xs transition-all flex items-center justify-center gap-1.5"
      >
        Abrir Caja & Iniciar Operación del Día 📁
      </button>
    </div>
  );
}
