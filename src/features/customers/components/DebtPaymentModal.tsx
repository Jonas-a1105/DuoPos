import React, { useState, useEffect } from 'react';
import { Customer, CashShift } from '../../../types';
import { playSound } from '../../../services/sounds';
import { toast } from '../../../components/Modal/FlashNotifications';

interface DebtPaymentModalProps {
  customer: Customer | null;
  onClose: () => void;
  activeShift: CashShift | null;
  onUpdateCustomer: (customer: Customer) => void;
  onAddShiftMovement: (type: 'in' | 'out', amount: number, reason: string) => void;
  onGrantXp: (amount: number) => void;
}

export default function DebtPaymentModal({
  customer,
  onClose,
  activeShift,
  onUpdateCustomer,
  onAddShiftMovement,
  onGrantXp
}: DebtPaymentModalProps) {
  const [payAmount, setPayAmount] = useState('');
  const [payNotes, setPayNotes] = useState('');

  useEffect(() => {
    if (customer) {
      setPayAmount(customer.creditUsed ? customer.creditUsed.toString() : '');
      setPayNotes('');
    }
  }, [customer]);

  if (!customer) return null;

  const handleApplyPayment = (e: React.FormEvent) => {
    e.preventDefault();

    const amountToPay = Number(payAmount) || 0;
    const currentDebt = customer.creditUsed || 0;

    if (amountToPay <= 0) {
      toast.warning('⚠️ El monto a abonar debe ser mayor a 0.');
      return;
    }
    if (amountToPay > currentDebt) {
      toast.warning(`⚠️ No puedes abonar un monto ($${amountToPay.toFixed(2)}) superior a la deuda actual del cliente ($${currentDebt.toFixed(2)}).`);
      return;
    }

    const updatedUsed = Number((currentDebt - amountToPay).toFixed(2));
    const formattedNotes = payNotes.trim() ? payNotes.trim() : 'Abono registrado en módulo Clientes';

    const newHistoryRecord = {
      id: `chhist-${Date.now()}-${Math.floor(Math.random()*1000)}`,
      amount: amountToPay,
      type: 'pay' as const,
      date: new Date().toISOString(),
      notes: formattedNotes
    };

    const updatedCustomer: Customer = {
      ...customer,
      creditUsed: updatedUsed,
      creditHistory: [newHistoryRecord, ...(customer.creditHistory || [])]
    };

    // Update customer in parent app context
    onUpdateCustomer(updatedCustomer);

    // If change is registered and shift is active, prompt/inject movement to shift register
    if (activeShift) {
      onAddShiftMovement('in', amountToPay, `Abono Deuda - Cliente: ${customer.name}`);
    }

    playSound('kaching');
    onGrantXp(15); // reward for debt retrieval!
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn text-gray-800">
      <div className="bg-white border-2 border-gray-200 border-b-8 rounded-3xl max-w-sm w-full p-6 space-y-4 relative shadow-2xl">
        <button
          type="button"
          onClick={() => { onClose(); playSound('click'); }}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-650 rounded-full hover:bg-gray-100 p-1 bg-gray-50 border cursor-pointer font-black text-xs h-7 w-7 flex items-center justify-center select-none"
        >
          ✕
        </button>

        <div className="text-center space-y-1">
          <span className="text-4xl block leading-none select-none">💰</span>
          <h3 className="text-base font-black text-gray-850 uppercase leading-tight mt-1">
            Registrar Abono a Deuda
          </h3>
          <p className="text-[9px] text-[#58cc02] font-extrabold uppercase tracking-widest">
            Disminución de saldo para {customer.name}
          </p>
        </div>

        {/* Warning shift diagnostics linking */}
        {activeShift ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-left">
            <p className="text-[10px] text-green-800 font-extrabold uppercase leading-relaxed flex items-center gap-1 select-none">
              <span>🟢</span> Turno de Caja Activo Detectado
            </p>
            <p className="text-[9px] text-green-700 leading-normal font-bold mt-0.5">
              El dinero de este abono ingresará automáticamente al fondo registrado de la cajera <strong>{activeShift.employeeName}</strong>.
            </p>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-left">
            <p className="text-[10px] text-yellow-800 font-extrabold uppercase leading-tight flex items-center gap-1 select-none">
              <span>⚠️</span> Bolsa de Caja Actualmente Cerrada
            </p>
            <p className="text-[9px] text-yellow-700 leading-normal font-medium mt-0.5">
              El abono se asentará de manera digital en el saldo del cliente, pero recuerda abrir turno de caja para procesar arqueos físicos de efectivo.
            </p>
          </div>
        )}

        <form onSubmit={handleApplyPayment} className="space-y-4 text-xs text-left">
          <div className="bg-gray-50 p-3 rounded-2xl flex justify-between items-center border">
            <span className="text-[10px] font-black uppercase text-gray-400 block">Deuda Total Actual:</span>
            <span className="font-mono text-base font-black text-red-500">
              ${(customer.creditUsed || 0).toFixed(2)}
            </span>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-black text-gray-400 block tracking-wider">
              Monto a Abonar ($) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 font-bold text-gray-400">$</span>
              <input
                type="number"
                required
                min="0.01"
                max={customer.creditUsed || 0}
                step="0.01"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                className="w-full pl-7 pr-4 py-2.5 bg-white border-2 border-gray-200 focus:border-[#1cb0f6] rounded-xl font-black text-[#58cc02] outline-none font-mono"
                placeholder="0.00"
              />
            </div>
            <div className="flex gap-1.5 mt-1.5 justify-center">
              {[
                { label: 'Pago Completo', pct: 1 },
                { label: 'Mitad (50%)', pct: 0.5 },
                { label: 'Un Tercio', pct: 0.33 }
              ].map((tip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setPayAmount((Number((customer.creditUsed || 0) * tip.pct).toFixed(2)).toString())}
                  className="py-1 px-2.5 bg-gray-50 border rounded-lg text-[9px] text-gray-500 font-extrabold hover:bg-gray-100 cursor-pointer"
                >
                  {tip.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-black text-gray-400 block tracking-wider">
              Notas / Concepto del Abono
            </label>
            <input
              type="text"
              value={payNotes}
              onChange={(e) => setPayNotes(e.target.value)}
              className="w-full px-3.5 py-2 border-2 border-gray-200 focus:border-[#1cb0f6] rounded-xl font-bold outline-none"
              placeholder="Ej: Pago parcial entregado en mostrador"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4 pt-1">
            <button
              type="submit"
              className="bg-[#58cc02] text-white border-b-4 border-[#3c9e01] hover:bg-[#61e002] active:translate-y-[2px] py-2.5 rounded-xl font-black text-xs uppercase cursor-pointer"
            >
              Registrar Abono
            </button>
            <button
              type="button"
              onClick={() => { onClose(); playSound('click'); }}
              className="bg-gray-150 text-gray-700 rounded-xl font-bold text-xs uppercase cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
