import React, { useState, useEffect } from 'react';
import { Customer } from '../../../types';
import { playSound } from '../../../services/sounds';

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingCustomer: Customer | null;
  onAddCustomer: (
    customer: Omit<Customer, 'id' | 'registeredAt' | 'purchasesCount' | 'totalSpent' | 'gems' | 'league'> & {
      creditLimit?: number;
      creditUsed?: number;
      creditHistory?: any[];
    },
  ) => void;
  onUpdateCustomer: (customer: Customer) => void;
  onGrantXp: (amount: number) => void;
}

export default function CustomerFormModal({
  isOpen,
  onClose,
  editingCustomer,
  onAddCustomer,
  onUpdateCustomer,
  onGrantXp,
}: CustomerFormModalProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [creditLimitVal, setCreditLimitVal] = useState('500');

  useEffect(() => {
    if (editingCustomer) {
      setName(editingCustomer.name);
      setPhone(editingCustomer.phone || '');
      setEmail(editingCustomer.email || '');
      setCreditLimitVal(editingCustomer.creditLimit !== undefined ? editingCustomer.creditLimit.toString() : '0');
    } else {
      setName('');
      setPhone('');
      setEmail('');
      setCreditLimitVal('500');
    }
  }, [editingCustomer, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const parsedLimit = Number(creditLimitVal) || 0;

    if (editingCustomer) {
      // Edit mode
      const updated: Customer = {
        ...editingCustomer,
        name,
        phone,
        email,
        creditLimit: parsedLimit,
        creditUsed: editingCustomer.creditUsed !== undefined ? editingCustomer.creditUsed : 0,
        creditHistory: editingCustomer.creditHistory || [],
      };
      onUpdateCustomer(updated);
      playSound('success');
    } else {
      // Add mode
      onAddCustomer({
        name,
        phone,
        email,
        creditLimit: parsedLimit,
        creditUsed: 0,
        creditHistory: [],
      });
      playSound('levelup');
      onGrantXp(25); // Gamified registry task!
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn text-gray-800">
      <div className="bg-white border-2 border-gray-200 border-b-8 rounded-3xl max-w-sm w-full p-6 space-y-4 relative shadow-2xl">
        <button
          type="button"
          onClick={() => {
            onClose();
            playSound('click');
          }}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-650 rounded-full hover:bg-gray-100 p-1 bg-gray-50 border cursor-pointer font-black text-xs h-7 w-7 flex items-center justify-center select-none"
        >
          ✕
        </button>

        <div className="text-center space-y-1">
          <span className="text-4xl block leading-none select-none">⚡</span>
          <h3 className="text-base font-black text-gray-850 uppercase leading-tight mt-1">
            {editingCustomer ? 'Editar Información' : 'Registrar Nuevo Cliente'}
          </h3>
          <p className="text-[9px] text-gray-450 font-extrabold uppercase tracking-wider">
            Control de lealtad y crédito comercial DuoPOS
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs text-left">
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-black text-gray-400 block tracking-wider">
              Nombre Completo *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2 border-2 border-gray-200 focus:border-[#1cb0f6] rounded-xl font-bold outline-none"
              placeholder="Ej: Oscar el Pintor"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-black text-gray-400 block tracking-wider">
              Teléfono de Contacto
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3.5 py-2 border-2 border-gray-200 focus:border-[#1cb0f6] rounded-xl font-bold outline-none font-mono"
              placeholder="Ej: 555-0192"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-black text-gray-400 block tracking-wider">
              Correo Electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2 border-2 border-gray-200 focus:border-[#1cb0f6] rounded-xl font-bold outline-none"
              placeholder="oscar@duoacademy.com"
            />
          </div>

          {/* CREDIT LINE CONFIGURATION IN REGISTRY */}
          <div className="space-y-1 p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
            <label className="text-[10px] uppercase font-black text-indigo-700 block tracking-widest flex items-center gap-0.5">
              <span>💳</span> Límite Autorizado para Crédito ("Fiado")
            </label>
            <p className="text-[8px] text-indigo-500 font-bold leading-tight mb-2 uppercase">
              Monto máximo que el cliente puede adeudar. Un valor de $0 inhabilita el crédito.
            </p>
            <div className="relative">
              <span className="absolute left-3 top-2 text-indigo-800 font-black font-mono">$</span>
              <input
                type="number"
                min="0"
                step="10"
                value={creditLimitVal}
                onChange={(e) => setCreditLimitVal(e.target.value)}
                className="w-full pl-6 pr-3.5 py-1.5 bg-white border-2 border-indigo-100 focus:border-[#1cb0f6] rounded-xl font-black text-[#a435f0] outline-none font-mono"
                placeholder="0"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-[#58cc02] text-white border-b-4 border-[#3c9e01] hover:bg-[#61e002] active:translate-y-[2px] active:border-b-2 py-3 rounded-xl font-black text-xs uppercase tracking-wider text-center cursor-pointer transition-all mt-4 flex items-center justify-center gap-1"
          >
            <span>{editingCustomer ? 'Guardar Cambios ⚡' : 'Alta de Cliente (+25 XP) 🎉'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
