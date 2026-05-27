import React from 'react';
import { Customer } from '../../../types';
import { playSound } from '../../../services/sounds';
import { Clock, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

interface CustomerLedgerModalProps {
  customer: Customer | null;
  onClose: () => void;
}

export default function CustomerLedgerModal({
  customer,
  onClose
}: CustomerLedgerModalProps) {
  if (!customer) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn text-gray-800">
      <div className="bg-white border-2 border-gray-200 border-b-8 rounded-3xl max-w-md w-full p-6 space-y-4 relative shadow-2xl">
        <button
          type="button"
          onClick={() => { onClose(); playSound('click'); }}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-655 rounded-full hover:bg-gray-100 p-1 bg-gray-50 border cursor-pointer font-black text-xs h-7 w-7 flex items-center justify-center select-none"
        >
          ✕
        </button>

        <div className="flex items-center gap-2.5">
          <div className="bg-[#ffd700] text-amber-955 p-2.5 rounded-2xl shrink-0 font-bold select-none text-xl border">
            📖
          </div>
          <div className="text-left">
            <span className="text-[10px] uppercase font-black text-[#1cb0f6] block leading-tight">Estado de Cuenta / Ledger</span>
            <h3 className="text-base font-black text-gray-850 truncate max-w-[280px]" title={customer.name}>
              {customer.name}
            </h3>
          </div>
        </div>

        {/* Quick Credit Line Balance Info inside Account view */}
        <div className="grid grid-cols-3 gap-2 bg-gray-100 border p-3 rounded-2xl text-center">
          <div>
            <span className="text-[8px] uppercase font-black text-gray-400 block">Autorizado</span>
            <span className="text-xs font-black font-mono text-gray-750">
              ${(customer.creditLimit || 0).toFixed(0)}
            </span>
          </div>
          <div>
            <span className="text-[8px] uppercase font-black text-gray-400 block">Deuda Total</span>
            <span className="text-xs font-black font-mono text-red-500">
              ${(customer.creditUsed || 0).toFixed(2)}
            </span>
          </div>
          <div>
            <span className="text-[8px] uppercase font-black text-gray-400 block">Cupo Libre</span>
            <span className="text-xs font-black font-mono text-green-600">
              ${Math.max(0, (customer.creditLimit || 0) - (customer.creditUsed || 0)).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Credit Timeline History items */}
        <div className="space-y-2">
          <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-wider text-left">Línea de Movimientos Históricos</h4>
          
          <div className="max-h-64 overflow-y-auto pr-1 gap-2.5 flex flex-col">
            {!customer.creditHistory || customer.creditHistory.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 border border-dashed rounded-2xl space-y-2 text-gray-450 font-bold">
                <span className="text-3xl block">📋</span>
                <p className="text-xs">Este cliente no cuenta con movimientos registrados todavía.</p>
              </div>
            ) : (
              customer.creditHistory.map((mv: any) => {
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

                    <div className="text-right shrink-0 font-mono">
                      <span className={`text-sm font-black block ${isPay ? 'text-green-600' : 'text-red-500'}`}>
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
          onClick={() => { onClose(); playSound('click'); }}
          className="w-full py-2 bg-gray-150 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs uppercase"
        >
          Cerrar Estado de Cuenta
        </button>
      </div>
    </div>
  );
}
