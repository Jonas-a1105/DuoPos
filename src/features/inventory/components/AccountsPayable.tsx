import React, { useState } from 'react';
import { Supplier } from '../../../types';
import { playSound } from '../../../services/sounds';

interface AccountsPayableProps {
  suppliers: Supplier[];
  activeShift?: any;
  onAddShiftMovement?: (type: 'in' | 'out', amount: number, reason: string) => void;
  onRegisterSupplierPayout: (supplierId: string, amount: number, notes: string) => void;
  onGrantXp?: (xp: number) => void;
  paySupId: string;
  setPaySupId: React.Dispatch<React.SetStateAction<string>>;
}

export default function AccountsPayable({
  suppliers,
  activeShift,
  onAddShiftMovement,
  onRegisterSupplierPayout,
  onGrantXp,
  paySupId,
  setPaySupId
}: AccountsPayableProps) {
  const [payAmountVal, setPayAmountVal] = useState('');
  const [payMethod, setPayMethod] = useState<'cash' | 'transfer'>('cash');
  const [payoutSuccess, setPayoutSuccess] = useState('');

  const handleRegisterPayout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paySupId) { alert('Selecciona el proveedor.'); return; }
    const sup = suppliers.find(s => s.id === paySupId);
    if (!sup) return;

    const val = Number(payAmountVal);
    if (isNaN(val) || val <= 0 || val > sup.balance) {
      alert(`Monto inválido. Rango: $0.01 - $${sup.balance.toFixed(2)}`);
      return;
    }

    onRegisterSupplierPayout(paySupId, val, `Abono de cuentas por pagar: ${payMethod === 'cash' ? 'Efectivo' : 'Transferencia'}`);

    if (onGrantXp) onGrantXp(40);
    playSound('kaching');
    setPayoutSuccess(`💸 Pago de $${val.toFixed(2)} registrado éxitosamente para ${sup.name}.`);
    setPayAmountVal('');
    setTimeout(() => setPayoutSuccess(''), 5000);
  };

  return (
    <div className="space-y-4 animate-fadeIn text-left">
      
      <div className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-5">
        <h4 className="flex items-center gap-1.5 text-amber-900 font-black text-sm">
          <span>💸</span> Portal de Liquidación de Cuentas por Pagar Proveedor
        </h4>
        <p className="text-xs text-amber-800 leading-normal font-bold max-w-xl mt-1">
          Aquí puedes registrar abonos directos para tus proveedores sobre tus pedidos de racha cargados a Crédito. 
          Si seleccionas <strong>Efectivo de Caja</strong>, se descontará automáticamente el efectivo de tu turno de caja registradora activo.
        </p>
      </div>

      {payoutSuccess && (
        <div className="bg-emerald-55 border border-emerald-200 text-emerald-800 text-xs font-black rounded-2xl p-3 animate-pulse">
          {payoutSuccess}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        
        {/* Pay form Left */}
        <form onSubmit={handleRegisterPayout} className="bg-white border-2 border-gray-200 border-b-[6px] rounded-3xl p-5 space-y-4">
          <h4 className="text-xs font-black uppercase text-gray-500 border-b pb-2">Registrar Abono</h4>
          
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-gray-400">Seleccionar Proveedor</label>
            <select
              value={paySupId}
              onChange={(e) => { setPaySupId(e.target.value); playSound('click'); }}
              className="w-full bg-slate-55 border border-gray-200 rounded-xl p-2 text-xs font-bold outline-none cursor-pointer text-gray-700 font-sans"
            >
              <option value="">-- Elige un proveedor --</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name} (${s.balance.toFixed(2)})</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-gray-400">Canal de Egreso</label>
            <div className="grid grid-cols-2 gap-2 text-xs font-black">
              <button
                type="button"
                onClick={() => { setPayMethod('cash'); playSound('click'); }}
                className={`py-2 border rounded-xl cursor-pointer ${
                  payMethod === 'cash' ? 'bg-indigo-650 text-white border-indigo-705' : 'bg-slate-55 text-gray-500 border-gray-200'
                }`}
              >
                Efectivo de Caja
              </button>
              <button
                type="button"
                onClick={() => { setPayMethod('transfer'); playSound('click'); }}
                className={`py-2 border rounded-xl cursor-pointer ${
                  payMethod === 'transfer' ? 'bg-indigo-650 text-white border-indigo-705' : 'bg-slate-55 text-gray-500 border-gray-200'
                }`}
              >
                Transferencia / Banco
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-gray-400">Monto del Abono ($)</label>
            <input
              type="number"
              step="0.01"
              required
              placeholder="0.00"
              value={payAmountVal}
              onChange={(e) => setPayAmountVal(e.target.value)}
              className="w-full bg-slate-55 border rounded-xl p-2 text-xs font-bold outline-none text-gray-800"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-[#58cc02] text-white font-black py-2.5 rounded-xl text-xs uppercase border-b-4 border-green-700 hover:bg-[#61e002] active:border-b-0 cursor-pointer"
          >
            Efectuar Pago ⚡
          </button>
        </form>

        {/* List Right */}
        <div className="lg:col-span-2 bg-white border-2 border-gray-200 border-b-[6px] rounded-3xl p-5 space-y-3">
          <h4 className="text-xs font-black uppercase text-gray-400 tracking-wider">Cuentas Pendientes por Proveedor</h4>
          <div className="divide-y divide-gray-100 text-xs">
            {suppliers.filter(s => s.balance > 0).length === 0 ? (
              <p className="text-gray-405 italic text-center py-6 font-bold">😊 ¡Eres un socio estrella! No tienes cuentas por pagar activas en tus líneas de crédito.</p>
            ) : (
              suppliers.filter(s => s.balance > 0).map(s => (
                <div key={s.id} className="py-2.5 flex justify-between items-center first:pt-0">
                  <div>
                    <p className="font-extrabold text-gray-800">{s.name}</p>
                    <p className="text-[10px] text-gray-405 font-medium mt-0.5">Contacto: {s.contact} | Cel: {s.phone}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-mono font-black text-red-500 text-sm">${s.balance.toFixed(2)}</span>
                    <button
                      onClick={() => {
                        setPaySupId(s.id);
                        setPayAmountVal(s.balance.toString());
                        playSound('click');
                      }}
                      className="bg-indigo-100 hover:bg-indigo-200 border border-indigo-200 text-indigo-700 font-extrabold px-3 py-1 rounded-xl text-[10px] cursor-pointer"
                    >
                      Cargar Todo
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
