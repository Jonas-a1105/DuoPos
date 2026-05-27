import React from 'react';
import { CashShift } from '../../../types';

interface ShiftStatsGridProps {
  activeShift: CashShift;
  shiftTotals: { cashSales: number; cardSales: number; pointsSales: number; totalSales: number; ticketCount: number };
  computedExpectedCash: number;
}

export default function ShiftStatsGrid({
  activeShift,
  shiftTotals,
  computedExpectedCash
}: ShiftStatsGridProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 text-left">
      
      {/* 1. Initial fund */}
      <div className="bg-white border-2 border-gray-200 border-b-[6px] rounded-2xl p-4 flex flex-col justify-between h-28">
        <span className="text-[10px] uppercase tracking-wider font-extrabold text-gray-400 block">Fondo de Caja</span>
        <div>
          <span className="text-xl md:text-2xl font-black text-gray-800 font-mono">
            ${activeShift.initialCash.toFixed(2)}
          </span>
          <span className="text-[8px] text-[#949494] font-extrabold uppercase block mt-0.5 leading-none">Inyectado inicial</span>
        </div>
      </div>

      {/* 2. Cash sales */}
      <div className="bg-white border-2 border-gray-200 border-b-[6px] rounded-2xl p-4 flex flex-col justify-between h-28">
        <span className="text-[10px] uppercase tracking-wider font-extrabold text-gray-400 block">Venta Efectivo</span>
        <div>
          <span className="text-xl md:text-2xl font-black text-[#58cc02] font-mono">
            +${shiftTotals.cashSales.toFixed(2)}
          </span>
          <span className="text-[8px] text-gray-450 font-black uppercase block mt-1 leading-none">De {shiftTotals.ticketCount} transacciones</span>
        </div>
      </div>

      {/* 3. Card sales */}
      <div className="bg-white border-2 border-gray-200 border-b-[6px] rounded-2xl p-4 flex flex-col justify-between h-28">
        <span className="text-[10px] uppercase tracking-wider font-extrabold text-gray-400 block">Venta Electrónica</span>
        <div>
          <span className="text-xl md:text-2xl font-black text-blue-500 font-mono">
            ${shiftTotals.cardSales.toFixed(2)}
          </span>
          <span className="text-[8px] text-[#949494] font-bold uppercase block mt-1 leading-none">Cargos a Terminal</span>
        </div>
      </div>

      {/* 4. Movements deposits and withdrawals */}
      {(() => {
        let netMoveAmt = 0;
        activeShift.movements.forEach(m => {
          netMoveAmt += m.type === 'in' ? m.amount : -m.amount;
        });
        return (
          <div className="bg-white border-2 border-gray-200 border-b-[6px] rounded-2xl p-4 flex flex-col justify-between h-28">
            <span className="text-[10px] uppercase tracking-wider font-extrabold text-gray-400 block">Efectivo Suministro</span>
            <div>
              <span className={`text-xl md:text-2xl font-black font-mono ${netMoveAmt >= 0 ? 'text-emerald-505' : 'text-amber-505'}`}>
                {netMoveAmt >= 0 ? '+' : '-'}${Math.abs(netMoveAmt).toFixed(2)}
              </span>
              <span className="text-[8px] text-[#949494] font-bold uppercase block mt-1 leading-none">{activeShift.movements.length} Entradas/Salidas</span>
            </div>
          </div>
        );
      })()}

      {/* 5. Expected Cash in Drawer */}
      <div className="bg-white border-2 border-gray-250 border-b-[6px] rounded-2xl p-4 flex flex-col justify-between h-28 bg-[#fafafa]">
        <span className="text-[10px] uppercase tracking-wider font-black text-gray-500 block">Esperado en Caja</span>
        <div>
          <span className="text-xl md:text-2xl font-black text-indigo-600 font-mono">
            ${computedExpectedCash.toFixed(2)}
          </span>
          <span className="text-[8px] text-gray-400 font-black uppercase block mt-1 leading-none">Efectivo teórico total</span>
        </div>
      </div>

    </div>
  );
}
