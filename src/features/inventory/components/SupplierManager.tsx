import React, { useState, useMemo } from 'react';
import { Supplier } from '../../../types';
import { CATEGORIES } from '../../../initialData';
import { playSound } from '../../../services/audio/soundService';
import { Edit, Trash, X, Check, Truck } from 'lucide-react';

interface SupplierManagerProps {
  suppliers: Supplier[];
  onAddSupplier: (sup: Omit<Supplier, 'id' | 'balance'>) => void;
  onUpdateSupplier: (sup: Supplier) => void;
  onDeleteSupplier: (id: string) => void;
  onGrantXp?: (xp: number) => void;
  onSelectTab: (tab: 'catalog' | 'alerts' | 'suppliers' | 'orders' | 'accounts') => void;
  onSelectSupplierForPayout: (id: string) => void;
}

export default function SupplierManager({
  suppliers,
  onAddSupplier,
  onUpdateSupplier,
  onDeleteSupplier,
  onGrantXp,
  onSelectTab,
  onSelectSupplierForPayout,
}: SupplierManagerProps) {
  // Supplier Form States
  const [isSupplierFormOpen, setIsSupplierFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supName, setSupName] = useState('');
  const [supContact, setSupContact] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supEmail, setSupEmail] = useState('');
  const [supCategory, setSupCategory] = useState('Bebidas');
  const [supAddress, setSupAddress] = useState('');
  const [supDeliveryDays, setSupDeliveryDays] = useState(2);
  const [supReliability, setSupReliability] = useState(90);
  const [supError, setSupError] = useState('');

  const averageReliability = useMemo(() => {
    if (suppliers.length === 0) return 100;
    const sum = suppliers.reduce((acc, s) => acc + s.reliability, 0);
    return Math.round(sum / suppliers.length);
  }, [suppliers]);

  const totalAccountsPayable = useMemo(() => {
    return suppliers.reduce((acc, s) => acc + (s.balance || 0), 0);
  }, [suppliers]);

  const handleOpenNewSupplier = () => {
    setEditingSupplier(null);
    setSupName('');
    setSupContact('');
    setSupPhone('');
    setSupEmail('');
    setSupCategory('Bebidas');
    setSupAddress('');
    setSupDeliveryDays(2);
    setSupReliability(95);
    setSupError('');
    setIsSupplierFormOpen(true);
    playSound('click');
  };

  const handleOpenEditSupplier = (sup: Supplier) => {
    setEditingSupplier(sup);
    setSupName(sup.name);
    setSupContact(sup.contact);
    setSupPhone(sup.phone);
    setSupEmail(sup.email);
    setSupCategory(sup.category);
    setSupAddress(sup.address);
    setSupDeliveryDays(sup.deliveryDays);
    setSupReliability(sup.reliability || 90);
    setSupError('');
    setIsSupplierFormOpen(true);
    playSound('click');
  };

  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supName.trim()) {
      setSupError('Nombre requerido.');
      return;
    }

    if (editingSupplier) {
      const updated: Supplier = {
        ...editingSupplier,
        name: supName.trim(),
        contact: supContact.trim(),
        phone: supPhone.trim(),
        email: supEmail.trim(),
        category: supCategory,
        address: supAddress.trim(),
        deliveryDays: Number(supDeliveryDays),
        reliability: Number(supReliability),
      };
      onUpdateSupplier(updated);
      playSound('success');
    } else {
      const newS: Omit<Supplier, 'id' | 'balance'> = {
        name: supName.trim(),
        contact: supContact.trim(),
        phone: supPhone.trim(),
        email: supEmail.trim(),
        category: supCategory,
        address: supAddress.trim(),
        deliveryDays: Number(supDeliveryDays),
        reliability: Number(supReliability),
      };
      onAddSupplier(newS);
      if (onGrantXp) onGrantXp(25);
      playSound('levelup');
    }

    setIsSupplierFormOpen(false);
  };

  const handleDeleteSupplier = (id: string) => {
    if (confirm('¿Eliminar este proveedor de la cadena?')) {
      onDeleteSupplier(id);
      playSound('swoosh');
    }
  };

  return (
    <div className="space-y-4 animate-fadeIn text-left">
      {/* Onboard Header action */}
      <div className="flex justify-end gap-2 mb-2">
        <button
          id="btn-new-supplier"
          onClick={handleOpenNewSupplier}
          className="bg-indigo-650 text-white border-b-4 border-indigo-850 hover:bg-indigo-600 active:border-b-0 active:translate-y-[4px] font-black py-3 px-5 rounded-2xl transition-all duration-100 flex items-center gap-1.5 tracking-wide uppercase text-xs cursor-pointer select-none"
        >
          <Truck size={16} /> Onboard Proveedor
        </button>
      </div>

      {/* Supplier Dashboard Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-indigo-55 border-2 border-indigo-200 rounded-3xl p-4 flex items-center gap-3">
          <span className="text-3xl select-none">👥</span>
          <div>
            <span className="text-2xl font-black text-indigo-950 block leading-none">{suppliers.length}</span>
            <span className="text-[10px] uppercase font-black text-indigo-500 leading-none mt-1.5 block">
              Aliados Frecuentes
            </span>
          </div>
        </div>

        <div className="bg-emerald-50 border-2 border-emerald-200 rounded-3xl p-4 flex items-center gap-3">
          <span className="text-3xl select-none">🏆</span>
          <div>
            <span className="text-2xl font-black text-emerald-700 block leading-none">{averageReliability}%</span>
            <span className="text-[10px] uppercase font-black text-emerald-600 leading-none mt-1.5 block">
              Fiabilidad Media
            </span>
          </div>
        </div>

        <div className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-4 flex items-center gap-3">
          <span className="text-3xl select-none">💵</span>
          <div>
            <span className="text-2xl font-black text-amber-700 block leading-none">
              ${totalAccountsPayable.toFixed(2)}
            </span>
            <span className="text-[10px] uppercase font-black text-amber-600 leading-none mt-1.5 block">
              Deudas Pendientes AP
            </span>
          </div>
        </div>
      </div>

      {/* Grid listing suppliers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-left">
        {suppliers.map((sup) => (
          <div
            key={sup.id}
            className="bg-white border-2 border-gray-200 border-b-[6px] rounded-3xl p-4.5 flex flex-col justify-between space-y-3 relative"
          >
            <div className="space-y-2 text-left">
              <div className="flex justify-between items-start">
                <span className="text-2xl select-none">🏢</span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleOpenEditSupplier(sup)}
                    className="p-1 border border-indigo-205 text-indigo-500 rounded-lg hover:bg-indigo-50 cursor-pointer"
                  >
                    <Edit size={12} />
                  </button>
                  <button
                    onClick={() => handleDeleteSupplier(sup.id)}
                    className="p-1 border border-red-200 text-red-500 rounded-lg hover:bg-red-50 cursor-pointer"
                  >
                    <Trash size={12} />
                  </button>
                </div>
              </div>

              <div>
                <h4 className="text-base font-black text-gray-800 leading-tight">{sup.name}</h4>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">
                  Especialidad: {sup.category}
                </p>
              </div>

              <div className="space-y-1 text-xs">
                <p className="font-semibold text-gray-650 flex items-center gap-1">
                  <span>👤 Contacto:</span> <strong className="text-gray-850 font-extrabold">{sup.contact}</strong>
                </p>
                <p className="text-gray-500 flex items-center gap-1">
                  <span>📞 Cel:</span> {sup.phone}
                </p>
                <p className="text-gray-500 flex items-center gap-1 text-[11px] truncate">
                  <span>✉️ Email:</span> {sup.email}
                </p>
                <p className="text-[10px] text-gray-400 italic font-medium leading-tight">{sup.address}</p>
              </div>
            </div>

            <div className="pt-2 border-t border-dashed border-gray-200 space-y-2">
              <div className="flex justify-between items-center text-[10px] font-black">
                <span className="text-gray-400">FIABILIDAD COMERCIAL:</span>
                <span
                  className={
                    sup.reliability >= 95
                      ? 'text-green-600'
                      : sup.reliability >= 90
                        ? 'text-indigo-650'
                        : 'text-red-500'
                  }
                >
                  {sup.reliability}%
                </span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${sup.reliability >= 95 ? 'bg-green-500' : sup.reliability >= 90 ? 'bg-indigo-500' : 'bg-red-500'}`}
                  style={{ width: `${sup.reliability}%` }}
                />
              </div>

              <div className="flex justify-between items-center bg-gray-50 p-2 rounded-xl text-left border">
                <div>
                  <span className="text-[9px] text-gray-450 block leading-none font-bold">Acarreo de Saldo</span>
                  <span className="text-xs font-black text-gray-700">${sup.balance.toFixed(2)}</span>
                </div>
                {sup.balance > 0 ? (
                  <button
                    onClick={() => {
                      onSelectSupplierForPayout(sup.id);
                      onSelectTab('accounts');
                      playSound('click');
                    }}
                    className="bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300 font-black px-2.5 py-1 rounded-lg text-[9px] uppercase cursor-pointer"
                  >
                    Saldar
                  </button>
                ) : (
                  <span className="text-[9px] text-green-600 bg-green-50 px-2 py-1 rounded-lg border border-green-250 font-black select-none">
                    Al día
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ----------------- FORMS MODAL: CREATE / EDIT SUPPLIER ----------------- */}
      {isSupplierFormOpen && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn text-gray-800">
          <div className="bg-white border-2 border-gray-200 border-b-8 rounded-3xl max-w-lg w-full p-6 space-y-4 relative text-left">
            <button
              onClick={() => setIsSupplierFormOpen(false)}
              className="absolute right-4 top-4 p-2 text-gray-400 hover:text-gray-650 rounded-full"
            >
              <X size={20} />
            </button>

            <div className="space-y-1">
              <h3 className="text-2xl font-black text-gray-800">
                {editingSupplier ? '📝 Modificar Proveedor' : '🤝 Onboard Proveedor Alianza'}
              </h3>
              <p className="text-xs text-gray-400 font-bold">
                Une un nuevo distribuidor oficial a la cadena logística DuoExpress.
              </p>
            </div>

            {supError && (
              <div className="p-2.5 bg-red-50 text-red-650 rounded-xl text-center font-bold text-xs">⚠️ {supError}</div>
            )}

            <form onSubmit={handleSaveSupplier} className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="col-span-2 space-y-1 text-left">
                  <label className="font-extrabold uppercase text-gray-400">Nombre de la Distribuidora</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. 🦉 Cafés del Nido Supremo"
                    value={supName}
                    onChange={(e) => setSupName(e.target.value)}
                    className="w-full bg-slate-50 border p-2 rounded-xl font-bold"
                  />
                </div>

                <div className="space-y-1 text-left">
                  <label className="font-extrabold uppercase text-gray-400">Contacto Directo (Gestor)</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Abelardo Verde"
                    value={supContact}
                    onChange={(e) => setSupContact(e.target.value)}
                    className="w-full bg-slate-50 border p-2 rounded-xl font-bold"
                  />
                </div>

                <div className="space-y-1 text-left">
                  <label className="font-extrabold uppercase text-gray-400">Teléfono Directo</label>
                  <input
                    type="text"
                    required
                    placeholder="555-xxxx"
                    value={supPhone}
                    onChange={(e) => setSupPhone(e.target.value)}
                    className="w-full bg-slate-50 border p-2 rounded-xl font-bold font-mono"
                  />
                </div>

                <div className="space-y-1 text-left">
                  <label className="font-extrabold uppercase text-gray-400">Correo Electrónico</label>
                  <input
                    type="email"
                    required
                    placeholder="canal@duoproduccion.com"
                    value={supEmail}
                    onChange={(e) => setSupEmail(e.target.value)}
                    className="w-full bg-slate-50 border p-2 rounded-xl font-bold"
                  />
                </div>

                <div className="space-y-1 text-left">
                  <label className="font-extrabold uppercase text-gray-400">Categoría Insumo Principal</label>
                  <select
                    value={supCategory}
                    onChange={(e) => setSupCategory(e.target.value)}
                    className="w-full bg-slate-50 border p-2 rounded-xl font-bold text-gray-700 cursor-pointer"
                  >
                    {CATEGORIES.filter((c) => c !== 'Todos').map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1 text-left">
                  <label className="font-extrabold uppercase text-gray-400">Días de Entrega Prometidos</label>
                  <input
                    type="number"
                    required
                    value={supDeliveryDays}
                    onChange={(e) => setSupDeliveryDays(Number(e.target.value))}
                    className="w-full bg-slate-50 border p-2 rounded-xl font-bold font-mono"
                  />
                </div>

                <div className="space-y-1 text-left">
                  <label className="font-extrabold uppercase text-gray-400">Índice Fiabilidad (%)</label>
                  <input
                    type="number"
                    max="100"
                    min="10"
                    required
                    value={supReliability}
                    onChange={(e) => setSupReliability(Number(e.target.value))}
                    className="w-full bg-slate-50 border p-2 rounded-xl font-bold font-mono"
                  />
                </div>

                <div className="col-span-2 space-y-1 text-left">
                  <label className="font-extrabold uppercase text-gray-400">Dirección y Bodega General</label>
                  <input
                    type="text"
                    placeholder="Estilo: Calle #, Col, Ciudad"
                    value={supAddress}
                    onChange={(e) => setSupAddress(e.target.value)}
                    className="w-full bg-slate-50 border p-2 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs pt-2">
                <button
                  type="button"
                  onClick={() => setIsSupplierFormOpen(false)}
                  className="bg-slate-100 hover:bg-slate-205 py-2.5 font-bold rounded-xl border"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 text-white hover:bg-indigo-550 py-2.5 font-black rounded-xl border-b-4 border-indigo-900 flex items-center justify-center gap-0.5 cursor-pointer"
                >
                  <Check size={14} /> Registrar Alianza
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
