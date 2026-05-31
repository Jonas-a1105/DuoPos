import React from 'react';
import { CashShift } from '../../../types';
import { playSound } from '../../../services/audio/soundService';
import { Printer } from 'lucide-react';

interface ShiftReportDetailModalProps {
  shift: CashShift | null;
  onClose: () => void;
  onPrint: (shift: CashShift) => void;
}

export default function ShiftReportDetailModal({ shift, onClose, onPrint }: ShiftReportDetailModalProps) {
  if (!shift) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-3xs flex items-center justify-center p-4">
      <div className="bg-white border-2 border-gray-200 border-b-8 rounded-3xl p-5 md:p-6 max-w-sm w-full space-y-4 animate-scaleUp text-gray-855 shadow-2xl relative">
        <div className="flex justify-between items-center border-b pb-2">
          <h3 className="text-base font-black text-gray-805 uppercase flex items-center gap-1 leading-none mt-1 text-left">
            🧾 Informe del Turno {shift.id.substring(shift.id.indexOf('-') + 1)}
          </h3>
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

        <div className="space-y-3.5 text-xs text-gray-650 font-bold leading-normal text-left">
          <div className="space-y-2 bg-gray-50 border p-3 rounded-2xl">
            <div className="flex justify-between">
              <span>Cajero Responsable:</span>
              <span className="text-gray-800 font-extrabold">{shift.employeeName}</span>
            </div>
            <div className="flex justify-between">
              <span>Apertura General:</span>
              <span className="font-mono text-[10px] text-gray-700">
                {new Date(shift.openingTime).toLocaleDateString()} a las{' '}
                {new Date(shift.openingTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            {shift.closingTime && (
              <div className="flex justify-between">
                <span>Clausura Auditada:</span>
                <span className="font-mono text-[10px] text-gray-700">
                  {new Date(shift.closingTime).toLocaleDateString()} a las{' '}
                  {new Date(shift.closingTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-2 pt-1">
            <span className="text-[10px] font-black uppercase text-gray-400 block tracking-wider">
              Cuentas Auditadas
            </span>

            <div className="flex justify-between">
              <span>Fondo Físico Inicial:</span>
              <span className="font-mono text-gray-800">${shift.initialCash.toFixed(2)}</span>
            </div>

            <div className="flex justify-between font-extrabold text-[#58cc02]">
              <span>Ventas en Efectivo:</span>
              <span>+${shift.salesVolume.toFixed(2)}</span>
            </div>

            <div className="flex justify-between">
              <span>Movimientos de Ajuste:</span>
              {(() => {
                let moveSum = 0;
                shift.movements.forEach((m) => {
                  moveSum += m.type === 'in' ? m.amount : -m.amount;
                });
                return (
                  <span className={`font-mono ${moveSum >= 0 ? 'text-[#3c9e01]' : 'text-amber-500'}`}>
                    {moveSum >= 0 ? '+' : '-'}${Math.abs(moveSum).toFixed(2)}
                  </span>
                );
              })()}
            </div>

            <div className="border-t border-dashed my-2"></div>

            <div className="flex justify-between font-black text-gray-750">
              <span>Sueldo Teórico Esperado:</span>
              <span className="font-mono">${shift.expectedCash.toFixed(2)}</span>
            </div>

            <div className="flex justify-between font-black text-indigo-650 bg-indigo-50 p-1.5 rounded border border-indigo-100">
              <span>Efectivo Real Declarado:</span>
              <span className="font-mono">${(shift.actualCash || 0).toFixed(2)}</span>
            </div>

            <div className="flex justify-between font-black">
              <span>Descuadre Reportado:</span>
              <span
                className={`font-mono underline ${Math.abs(shift.difference || 0) > 0.05 ? 'text-red-500 font-black' : 'text-emerald-650'}`}
              >
                ${shift.difference?.toFixed(2)}
              </span>
            </div>
          </div>

          {shift.movements.length > 0 && (
            <div className="space-y-1.5 pt-1.5">
              <span className="text-[9px] font-black uppercase text-[#9c9c9c] tracking-widest block">
                Eventos Manuales de Arca ({shift.movements.length})
              </span>
              <div className="max-h-[105px] overflow-y-auto space-y-1 pr-1">
                {shift.movements.map((m, i) => (
                  <div
                    key={i}
                    className="text-[10px] leading-relaxed bg-gray-55 border p-1.5 rounded-lg flex justify-between"
                  >
                    <span className="truncate max-w-[150px]">{m.reason}</span>
                    <span
                      className={`font-mono text-right shrink-0 ${m.type === 'in' ? 'text-[#3c9e01]' : 'text-amber-505'}`}
                    >
                      {m.type === 'in' ? '+' : '-'}${m.amount}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2">
          <button
            type="button"
            onClick={() => onPrint(shift)}
            className="bg-white border-2 border-gray-200 border-b-4 hover:bg-gray-50 font-black text-[10px] uppercase tracking-wider py-2 rounded-xl cursor-pointer text-gray-600 flex items-center justify-center gap-1.5 shadow-2xs"
          >
            <Printer size={13} /> Imprimir 🧾
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              playSound('click');
            }}
            className="bg-[#1cb0f6] text-white border-b-4 border-sky-700 hover:bg-sky-400 font-black text-[10px] uppercase tracking-wider py-2 rounded-xl cursor-pointer flex items-center justify-center shadow-xs"
          >
            Entendido 🦉
          </button>
        </div>
      </div>
    </div>
  );
}
