import React, { useState, useMemo } from 'react';
import { Supplier } from '../../../types';
import { playSound } from '../../../services/audio/soundService';
import { Calendar, DollarSign, Check, Info, AlertTriangle, Clock, ArrowRight } from 'lucide-react';

interface AccountsPayableProps {
  suppliers: Supplier[];
  activeShift?: any;
  onAddShiftMovement?: (type: 'in' | 'out', amount: number, reason: string) => void;
  onRegisterSupplierPayout: (supplierId: string, amount: number, notes: string) => void;
  onGrantXp?: (xp: number) => void;
  paySupId: string;
  setPaySupId: React.Dispatch<React.SetStateAction<string>>;
}

type FilterStatus = 'all' | 'expired' | 'upcoming' | 'active';

export default function AccountsPayable({
  suppliers,
  activeShift,
  onAddShiftMovement,
  onRegisterSupplierPayout,
  onGrantXp,
  paySupId,
  setPaySupId,
}: AccountsPayableProps) {
  const [payAmountVal, setPayAmountVal] = useState('');
  const [payMethod, setPayMethod] = useState<'cash' | 'transfer'>('cash');
  const [payoutSuccess, setPayoutSuccess] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Auxiliary Date Calculations
  const getDaysRemaining = (dueDateStr?: string): number | null => {
    if (!dueDateStr) return null;
    const dueDate = new Date(dueDateStr + 'T23:59:59');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStatusInfo = (balance: number, dueDateStr?: string): { label: string; color: string; bg: string; daysRemaining: number | null; code: FilterStatus } => {
    if (balance <= 0) return { label: 'Liquidado', color: 'text-gray-400', bg: 'bg-gray-50 border-gray-200', daysRemaining: null, code: 'active' };
    const days = getDaysRemaining(dueDateStr);
    if (days === null) {
      return { label: 'Vigente (Sin Vencimiento)', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', daysRemaining: null, code: 'active' };
    }
    if (days < 0) {
      return { label: `Vencido (${Math.abs(days)}d de retraso)`, color: 'text-red-700', bg: 'bg-red-50 border-red-200', daysRemaining: days, code: 'expired' };
    }
    if (days <= 7) {
      return { label: `Próximo a vencer (${days}d restantes)`, color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200', daysRemaining: days, code: 'upcoming' };
    }
    return { label: `Vigente (${days}d restantes)`, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', daysRemaining: days, code: 'active' };
  };

  // Math Totalizers
  const totals = useMemo(() => {
    let outstanding = 0;
    let expired = 0;
    let upcoming = 0;
    let activeVal = 0;

    suppliers.forEach((s) => {
      if (s.balance > 0) {
        outstanding += s.balance;
        const status = getStatusInfo(s.balance, s.dueDate);
        if (status.code === 'expired') {
          expired += s.balance;
        } else if (status.code === 'upcoming') {
          upcoming += s.balance;
        } else {
          activeVal += s.balance;
        }
      }
    });

    return { outstanding, expired, upcoming, activeVal };
  }, [suppliers]);

  // Filtering suppliers list
  const filteredSuppliers = useMemo(() => {
    return suppliers
      .filter((s) => s.balance > 0)
      .filter((s) => {
        const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.contact.toLowerCase().includes(searchQuery.toLowerCase());
        const status = getStatusInfo(s.balance, s.dueDate);
        const matchesStatus = statusFilter === 'all' || status.code === statusFilter;
        return matchesSearch && matchesStatus;
      });
  }, [suppliers, searchQuery, statusFilter]);

  const selectedSupplier = suppliers.find((s) => s.id === paySupId);

  const handleRegisterPayout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paySupId) {
      alert('Selecciona el proveedor.');
      return;
    }
    const sup = suppliers.find((s) => s.id === paySupId);
    if (!sup) return;

    const val = Number(payAmountVal);
    if (isNaN(val) || val <= 0 || val > sup.balance) {
      alert(`Monto inválido. Rango: $0.01 - $${sup.balance.toFixed(2)}`);
      return;
    }

    // Explicit cash shift deduct logic
    if (payMethod === 'cash') {
      if (!activeShift) {
        alert('⚠️ Turno de Caja Cerrado: Debes iniciar un turno de caja para registrar pagos con efectivo de caja.');
        return;
      }
      if (activeShift.expectedCash < val) {
        if (!confirm(`⚠️ Efectivo insuficiente en caja (Saldo actual: $${activeShift.expectedCash.toFixed(2)}). ¿Proceder de todas formas?`)) {
          return;
        }
      }
      onAddShiftMovement?.('out', val, `Pago Proveedor: ${sup.name}`);
    }

    onRegisterSupplierPayout(
      paySupId,
      val,
      `Abono de cuentas por pagar: ${payMethod === 'cash' ? 'Efectivo de Caja' : 'Transferencia Bancaria'}`,
    );

    if (onGrantXp) onGrantXp(40);
    playSound('kaching');
    setPayoutSuccess(`💸 Abono de $${val.toFixed(2)} registrado exitosamente para ${sup.name}.`);
    setPayAmountVal('');
    setTimeout(() => setPayoutSuccess(''), 5000);
  };

  return (
    <div className="space-y-6 animate-fadeIn text-left font-sans">
      
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/5 border-2 border-amber-200 rounded-3xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h4 className="flex items-center gap-2 text-amber-900 font-black text-base uppercase leading-none">
            <span>💸</span> Portal Corporativo de Cuentas por Pagar
          </h4>
          <p className="text-xs text-amber-850 font-bold max-w-xl leading-relaxed">
            Gestión inteligente de pasivos comerciales. Supervisa vencimientos, liquida facturas de crédito y controla el flujo de caja. Los egresos en efectivo se descuentan en tiempo real del turno de caja activo.
          </p>
        </div>
        {activeShift ? (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-[10px] uppercase tracking-wider px-3.5 py-1.5 rounded-xl self-start md:self-auto select-none">
            🟢 Caja Abierta (Efectivo: ${activeShift.expectedCash?.toFixed(2)})
          </div>
        ) : (
          <div className="bg-red-50 border border-red-200 text-red-800 font-bold text-[10px] uppercase tracking-wider px-3.5 py-1.5 rounded-xl self-start md:self-auto select-none">
            🔴 Turno de Caja Cerrado
          </div>
        )}
      </div>

      {/* 2. Totalizers Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border-2 border-gray-250/70 border-b-[6px] rounded-2xl p-4 space-y-1">
          <span className="text-[9px] uppercase font-black tracking-widest text-gray-400 block leading-none">
            Total Cuentas por Pagar
          </span>
          <div className="text-2xl font-black text-gray-800 font-mono">${totals.outstanding.toFixed(2)}</div>
          <p className="text-[9px] font-bold text-gray-400 uppercase leading-none">Deuda Consolidada</p>
        </div>
        <div className="bg-white border-2 border-red-200 border-b-[6px] rounded-2xl p-4 space-y-1">
          <span className="text-[9px] uppercase font-black tracking-widest text-red-400 block leading-none">
            Total Vencido
          </span>
          <div className="text-2xl font-black text-red-655 font-mono">${totals.expired.toFixed(2)}</div>
          <p className="text-[9px] font-bold text-red-400 uppercase leading-none flex items-center gap-1">
            <AlertTriangle size={10} /> Plazo de Pago Excedido
          </p>
        </div>
        <div className="bg-white border-2 border-orange-200 border-b-[6px] rounded-2xl p-4 space-y-1">
          <span className="text-[9px] uppercase font-black tracking-widest text-orange-400 block leading-none">
            Próximo a Vencer
          </span>
          <div className="text-2xl font-black text-orange-655 font-mono">${totals.upcoming.toFixed(2)}</div>
          <p className="text-[9px] font-bold text-orange-400 uppercase leading-none flex items-center gap-1">
            <Clock size={10} /> Menos de 7 Días Restantes
          </p>
        </div>
        <div className="bg-white border-2 border-emerald-250 border-b-[6px] rounded-2xl p-4 space-y-1">
          <span className="text-[9px] uppercase font-black tracking-widest text-emerald-555 block leading-none">
            Saldo Vigente
          </span>
          <div className="text-2xl font-black text-emerald-600 font-mono">${totals.activeVal.toFixed(2)}</div>
          <p className="text-[9px] font-bold text-emerald-500 uppercase leading-none flex items-center gap-1">
            <Check size={10} /> Al corriente
          </p>
        </div>
      </div>

      {payoutSuccess && (
        <div className="bg-emerald-55 border border-emerald-200 text-emerald-800 text-xs font-black rounded-2xl p-3 animate-pulse flex items-center gap-1.5">
          <Check size={14} /> {payoutSuccess}
        </div>
      )}

      {/* 3. Interactive Split Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left 4 Cols: Pay / Abonos Form */}
        <div className="lg:col-span-4 space-y-6">
          <form
            onSubmit={handleRegisterPayout}
            className="bg-white border-2 border-gray-200 border-b-[6px] rounded-3xl p-5 space-y-4"
          >
            <h4 className="text-xs font-black uppercase text-gray-800 border-b pb-2 tracking-tight flex items-center gap-1">
              <span>💳</span> Registrar Abono de Saldo
            </h4>

            <div className="space-y-1 text-left">
              <label className="text-[10px] font-black uppercase text-gray-400">Seleccionar Proveedor</label>
              <select
                value={paySupId}
                onChange={(e) => {
                  setPaySupId(e.target.value);
                  playSound('click');
                }}
                className="w-full bg-slate-55 border border-gray-200 rounded-xl p-2.5 text-xs font-bold outline-none cursor-pointer text-gray-700 font-sans"
              >
                <option value="">-- Elige un proveedor con saldo --</option>
                {suppliers.filter(s => s.balance > 0).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (${s.balance.toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            {selectedSupplier && (
              <div className="bg-slate-50 border rounded-2xl p-3 space-y-1.5 text-xs">
                <div className="flex justify-between items-center text-gray-500 font-bold">
                  <span>Plazo Configurado:</span>
                  <span className="text-gray-800 font-black">{selectedSupplier.paymentTermDays ?? 30} días</span>
                </div>
                <div className="flex justify-between items-center text-gray-500 font-bold">
                  <span>Fecha de Vencimiento:</span>
                  <span className="text-red-500 font-black">{selectedSupplier.dueDate || 'Sin definir'}</span>
                </div>
                <div className="flex justify-between items-center text-gray-500 font-bold">
                  <span>Límite Restante:</span>
                  <span className="text-gray-800 font-black">${selectedSupplier.balance.toFixed(2)}</span>
                </div>
              </div>
            )}

            <div className="space-y-1 text-left">
              <label className="text-[10px] font-black uppercase text-gray-400">Método de Pago</label>
              <div className="grid grid-cols-2 gap-2 text-xs font-black">
                <button
                  type="button"
                  onClick={() => {
                    setPayMethod('cash');
                    playSound('click');
                  }}
                  className={`py-2 px-1.5 border rounded-xl cursor-pointer transition-colors leading-none ${
                    payMethod === 'cash'
                      ? 'bg-indigo-600 text-white border-indigo-700'
                      : 'bg-slate-55 text-gray-500 border-gray-205 hover:bg-slate-100'
                  }`}
                >
                  Efectivo de Caja
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPayMethod('transfer');
                    playSound('click');
                  }}
                  className={`py-2 px-1.5 border rounded-xl cursor-pointer transition-colors leading-none ${
                    payMethod === 'transfer'
                      ? 'bg-indigo-600 text-white border-indigo-700'
                      : 'bg-slate-55 text-gray-500 border-gray-205 hover:bg-slate-100'
                  }`}
                >
                  Transferencia
                </button>
              </div>
            </div>

            <div className="space-y-1 text-left">
              <label className="text-[10px] font-black uppercase text-gray-400">Monto del Abono ($)</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-450 font-bold text-xs">$</span>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={payAmountVal}
                  onChange={(e) => setPayAmountVal(e.target.value)}
                  className="w-full bg-slate-55 border rounded-xl pl-6 pr-3 py-2 text-xs font-bold outline-none text-gray-800"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!paySupId || !payAmountVal}
              className="w-full bg-[#58cc02] text-white font-black py-3 rounded-2xl text-xs uppercase border-b-4 border-green-700 hover:bg-[#61e002] active:border-b-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none transition-all leading-none"
            >
              Aplicar Abono
            </button>
          </form>

          {/* Supplier Payout History panel */}
          <div className="bg-white border-2 border-gray-200 border-b-[6px] rounded-3xl p-5 space-y-3">
            <h4 className="text-xs font-black uppercase text-gray-850 border-b pb-2 tracking-tight flex items-center gap-1">
              <span>📋</span> Historial Reciente de Abonos
            </h4>
            <div className="divide-y divide-gray-100 max-h-[220px] overflow-y-auto pr-1">
              {selectedSupplier && selectedSupplier.paymentHistory && selectedSupplier.paymentHistory.length > 0 ? (
                selectedSupplier.paymentHistory.map((pay) => (
                  <div key={pay.id} className="py-2 space-y-0.5 text-xs text-left">
                    <div className="flex justify-between items-center font-black">
                      <span className="text-gray-800">${pay.amount.toFixed(2)}</span>
                      <span className="text-[8px] bg-slate-100 text-gray-500 border rounded px-1 py-0.2 uppercase leading-none font-bold">
                        {pay.method === 'cash' ? 'Caja' : 'Banco'}
                      </span>
                    </div>
                    <p className="text-[9px] text-gray-400 font-bold">
                      {new Date(pay.date).toLocaleString('es-ES')}
                    </p>
                    <p className="text-[9.5px] text-gray-500 font-medium truncate italic leading-none">{pay.notes}</p>
                  </div>
                ))
              ) : selectedSupplier ? (
                <p className="text-gray-400 text-center py-6 italic text-[11px] font-bold">
                  No se han registrado abonos anteriores para {selectedSupplier.name}.
                </p>
              ) : (
                <p className="text-gray-400 text-center py-6 italic text-[11px] font-bold">
                  Selecciona un proveedor de arriba para ver sus cobros liquidados.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right 8 Cols: Cuentas Pendientes and Filters */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Filtering Bar */}
          <div className="bg-white border-2 border-gray-200 border-b-[6px] rounded-3xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Buscar por proveedor, contacto o rubro..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-55 border-2 border-gray-150 rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:border-amber-400 focus:bg-white text-gray-700"
              />
            </div>
            
            <div className="flex flex-wrap gap-1 items-center">
              {[
                { key: 'all', label: 'Todos' },
                { key: 'expired', label: '⚠️ Vencidos' },
                { key: 'upcoming', label: '⏳ Próximos' },
                { key: 'active', label: '✅ Vigentes' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => {
                    setStatusFilter(tab.key as any);
                    playSound('click');
                  }}
                  className={`py-1.5 px-3 rounded-xl font-black text-[10px] tracking-wide transition-all border-b-2 uppercase cursor-pointer ${
                    statusFilter === tab.key
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : 'bg-white text-gray-400 border border-gray-205 hover:bg-gray-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Suppliers Outstanding credit cards list */}
          <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
            {filteredSuppliers.length === 0 ? (
              <div className="bg-white border-2 border-gray-200 border-b-[6px] rounded-3xl p-12 text-center space-y-3">
                <span className="text-5xl block animate-bounce">🤝</span>
                <h3 className="text-lg font-black text-gray-650">Sin Cuentas por Pagar</h3>
                <p className="text-gray-400 text-xs font-bold leading-relaxed max-w-sm mx-auto">
                  No hay cuentas pendientes en este estado de filtro. ¡Felicidades por mantener tu negocio con finanzas óptimas!
                </p>
              </div>
            ) : (
              filteredSuppliers.map((s) => {
                const status = getStatusInfo(s.balance, s.dueDate);
                const isSelected = paySupId === s.id;

                return (
                  <div
                    key={s.id}
                    className={`bg-white border-2 rounded-3xl p-4 transition-all hover:scale-101 flex flex-col md:flex-row justify-between md:items-center gap-4 text-left ${
                      isSelected
                        ? 'border-amber-400 bg-amber-50/10 border-b-[6px]'
                        : 'border-gray-200 border-b-4'
                    }`}
                  >
                    <div className="space-y-2 min-w-0">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h5 className="font-black text-gray-800 text-sm leading-none">{s.name}</h5>
                          <span className="text-[8px] bg-slate-100 text-gray-500 border rounded px-1.5 py-0.2 uppercase leading-none font-bold">
                            {s.category}
                          </span>
                          <span className={`text-[8.5px] border rounded px-2 py-0.5 uppercase leading-none font-black ${status.bg} ${status.color}`}>
                            {status.label}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-405 font-bold mt-1.5 leading-none">
                          Encargado: {s.contact} | Teléfono: {s.phone} | Correo: {s.email}
                        </p>
                      </div>

                      {/* Small stats for active debt */}
                      {s.dueDate && (
                        <div className="flex items-center gap-1.5 text-[9.5px] text-gray-400 font-bold">
                          <Calendar size={12} className="text-amber-500" />
                          <span>
                            Plazo: <strong>{s.paymentTermDays ?? 30} días</strong> | Límite:{' '}
                            <strong className="text-red-505 text-red-500 font-mono">{s.dueDate}</strong>
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-4 flex-shrink-0 border-t md:border-t-0 pt-3 md:pt-0">
                      <div className="text-left md:text-right">
                        <span className="text-[9px] text-gray-400 font-black uppercase tracking-tight block leading-none">
                          Saldo Pendiente
                        </span>
                        <span className="text-lg font-black text-red-500 font-mono">${s.balance.toFixed(2)}</span>
                      </div>
                      
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => {
                            setPaySupId(s.id);
                            setPayAmountVal(s.balance.toString());
                            playSound('click');
                          }}
                          className="bg-amber-100 hover:bg-amber-200 border border-amber-300 text-amber-800 font-extrabold px-3 py-2 rounded-xl text-[10px] uppercase cursor-pointer transition-colors leading-none flex items-center gap-1"
                        >
                          Liquidar Todo <ArrowRight size={10} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
