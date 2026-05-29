/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  ChefHat,
  NotepadText,
  Users,
  Clock,
  ForkKnife,
  DollarSign,
  Plus,
  Check,
  Trash2,
  SplitSquareVertical,
  MessageSquare,
  Flame,
  AlertCircle,
} from 'lucide-react';
import { CartItem, Product, Customer } from '../../types/index';
import { playSound } from '../../services/sounds';

// Standard mock waiters for DuoPOS
export const MOCK_WAITERS = [
  { id: 'waiter-1', name: 'Lily Waitress 💁‍♀️', role: 'Mesera' },
  { id: 'waiter-2', name: 'Zari Enthusiast 🧕', role: 'Mesera' },
  { id: 'waiter-3', name: 'Oscar Painter 🎨', role: 'Mesero' },
  { id: 'waiter-4', name: 'Duo Captain 🦉', role: 'Capitán' },
];

export interface TableState {
  id: string;
  name: string;
  section: 'Planta Baja' | 'Terraza' | 'Barra' | 'VIP';
  status: 'free' | 'occupied' | 'billing';
  waiterName: string;
  occupiedSince?: string;
  cart: CartItem[];
  customer?: Customer | null;
}

// Default F&B table layouts
export const DEFAULT_TABLES: TableState[] = [
  { id: 'table-1', name: 'Mesa 1 🍽️', section: 'Planta Baja', status: 'free', waiterName: '', cart: [] },
  { id: 'table-2', name: 'Mesa 2 🍽️', section: 'Planta Baja', status: 'free', waiterName: '', cart: [] },
  { id: 'table-3', name: 'Mesa 3 ☕', section: 'Planta Baja', status: 'free', waiterName: '', cart: [] },
  { id: 'table-4', name: 'Terraza 1 🌿', section: 'Terraza', status: 'free', waiterName: '', cart: [] },
  { id: 'table-5', name: 'Terraza 2 🌿', section: 'Terraza', status: 'free', waiterName: '', cart: [] },
  { id: 'table-6', name: 'Barra Centro 🥂', section: 'Barra', status: 'free', waiterName: '', cart: [] },
  { id: 'table-7', name: 'VIP Lounge ✨', section: 'VIP', status: 'free', waiterName: '', cart: [] },
];

// F&B Addons available for purchase
export const PREMIUM_ADDONS = [
  { name: 'Extra Queso Fundido 🧀', price: 1.0 },
  { name: 'Tocino Crujiente 🥓', price: 1.5 },
  { name: 'Aguacate Orgánico 🥑', price: 1.25 },
  { name: 'Doble Ración Carboherradura 🥔', price: 1.75 },
  { name: 'Crema Batida Dulce 🥛', price: 0.75 },
  { name: 'Topping Secreto Racha 🍓', price: 1.2 },
  { name: 'Shot Espresso Adicional ☕', price: 1.0 },
];

export const QUICK_NOTES = [
  'Sin Cebolla',
  'Con mucho hielo',
  'Bien caliente',
  'Para llevar 🛍️',
  'Término medio 🥩',
  'Dividir en dos platos',
  'Alergia al gluten ⚠️',
];

// --- 1. MODIFIER MODAL ---
interface ModifierModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItem: CartItem;
  onSave: (notes: string, addons: { name: string; price: number }[]) => void;
}

export function ModifierModal({ isOpen, onClose, cartItem, onSave }: ModifierModalProps) {
  if (!isOpen) return null;

  const [notes, setNotes] = useState(cartItem.notes || '');
  const [selectedAddons, setSelectedAddons] = useState<{ name: string; price: number }[]>(cartItem.addons || []);

  const handleToggleAddon = (addon: { name: string; price: number }) => {
    playSound('click');
    const isAlreadySelected = selectedAddons.some((a) => a.name === addon.name);
    if (isAlreadySelected) {
      setSelectedAddons(selectedAddons.filter((a) => a.name !== addon.name));
    } else {
      setSelectedAddons([...selectedAddons, addon]);
    }
  };

  const handleQuickNote = (note: string) => {
    playSound('click');
    setNotes((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return note;
      if (trimmed.toLowerCase().includes(note.toLowerCase())) return prev; // Avoid duplicate
      return `${trimmed}, ${note}`;
    });
  };

  const handleSaveAndSubmit = () => {
    playSound('levelup');
    onSave(notes, selectedAddons);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border-2 border-gray-200 border-b-8 rounded-3xl w-full max-w-lg p-6 shadow-2xl animate-scaleUp">
        <div className="flex justify-between items-start border-b pb-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-3xl">{cartItem.product.emoji}</span>
            <div>
              <h3 className="font-black text-gray-805 text-base uppercase leading-none">Modificadores de Platillo</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">
                Personalizando: {cartItem.product.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 font-extrabold p-1 text-sm bg-gray-100 rounded-full h-6 w-6 flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
          {/* Quick notes chips */}
          <div className="space-y-1.5 text-left">
            <label className="text-[10px] font-black uppercase text-gray-450 block">Notas de Cocina Comunes</label>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_NOTES.map((note, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleQuickNote(note)}
                  className="py-1 px-2.5 bg-gray-100 hover:bg-[#58cc02]/10 hover:text-[#58cc02] hover:border-[#58cc02] transition-colors rounded-xl border text-[10.5px] font-bold text-gray-600 cursor-pointer"
                >
                  {note}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Notes text entry */}
          <div className="space-y-1 text-left">
            <label className="text-[10px] font-black uppercase text-gray-450 block">
              Notas de Preparación Personalizadas
            </label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-gray-400">📝</span>
              <input
                type="text"
                placeholder="Ej. Sin aderezo, cebolla morada asada aparte..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl font-bold text-xs outline-none text-gray-700 focus:border-[#58cc02] focus:bg-white"
              />
            </div>
          </div>

          {/* Premium Addons list */}
          <div className="space-y-1.5 text-left pt-2 border-t">
            <label className="text-[10px] font-black uppercase text-gray-450 block">
              Ingredientes Extras / Complementos PREMIUM
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PREMIUM_ADDONS.map((addon, index) => {
                const isSelected = selectedAddons.some((a) => a.name === addon.name);
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleToggleAddon(addon)}
                    className={`p-2.5 rounded-xl border-2 transition-all text-left flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-green-50 border-[#58cc02] text-green-900 font-extrabold scale-102 shadow-xs'
                        : 'bg-white border-gray-205 text-gray-700 font-bold hover:bg-gray-50'
                    }`}
                  >
                    <div className="text-[10.5px]">
                      <span>{addon.name}</span>
                    </div>
                    <span
                      className={`text-[10px] font-black ${isSelected ? 'text-[#3c9e01]' : 'text-gray-405 font-mono'}`}
                    >
                      +${addon.price.toFixed(2)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="pt-4 border-t mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 border-2 border-gray-200 text-gray-500 hover:bg-gray-50 rounded-xl text-xs font-black uppercase cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSaveAndSubmit}
            className="flex-1 py-2.5 bg-[#58cc02] text-white border-b-4 border-green-700 hover:bg-[#61e002] rounded-xl text-xs font-black uppercase cursor-pointer"
          >
            Aplicar Cambios
          </button>
        </div>
      </div>
    </div>
  );
}

// --- 2. SPLIT BILL MODAL ---
interface SplitBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  totalAmount: number;
  onCompleteSplit: (paidTotal: number, updatedCart?: CartItem[]) => void;
}

export function SplitBillModal({ isOpen, onClose, cart, totalAmount, onCompleteSplit }: SplitBillModalProps) {
  if (!isOpen) return null;

  const [splitType, setSplitType] = useState<'equal' | 'item'>('equal');
  const [equalParts, setEqualParts] = useState(2);
  const [paidPart, setPaidPart] = useState(1);
  const [hasPaidParts, setHasPaidParts] = useState<number[]>([]);

  // Item splitting state
  const [itemSelections, setItemSelections] = useState<Record<string, { payQty: number; origItem: CartItem }>>(() => {
    const states: Record<string, { payQty: number; origItem: CartItem }> = {};
    cart.forEach((it) => {
      states[it.product.id] = { payQty: 0, origItem: it };
    });
    return states;
  });

  const handleEqualPartsChange = (val: number) => {
    playSound('click');
    setEqualParts(Math.max(2, Math.min(10, val)));
    setHasPaidParts([]);
  };

  const handleToggleItemSelection = (productId: string, action: 'add' | 'remove') => {
    playSound('click');
    const curr = itemSelections[productId];
    const maxQty = curr.origItem.quantity;

    setItemSelections((prev) => {
      let nextQty = prev[productId].payQty;
      if (action === 'add' && nextQty < maxQty) {
        nextQty += 1;
      } else if (action === 'remove' && nextQty > 0) {
        nextQty -= 1;
      }
      return {
        ...prev,
        [productId]: { ...prev[productId], payQty: nextQty },
      };
    });
  };

  // Calculations for items
  const selectedItemsTotal = Object.values(itemSelections).reduce((sum: number, data: any) => {
    const addonsPrice = data.origItem.addons ? data.origItem.addons.reduce((s: number, a: any) => s + a.price, 0) : 0;
    const basePrice = data.origItem.product.price + addonsPrice;
    return sum + basePrice * data.payQty;
  }, 0) as number;

  const handlePayEqualPart = (partNum: number) => {
    playSound('levelup');
    setHasPaidParts((prev) => [...prev, partNum]);
    const pricePerDiner = totalAmount / equalParts;
    onCompleteSplit(pricePerDiner);
  };

  const handlePayItemSplit = () => {
    if (selectedItemsTotal <= 0) {
      playSound('error');
      alert('⚠️ Por favor, selecciona al menos un artículo para cobrar.');
      return;
    }

    playSound('levelup');

    // Construct new remaining cart
    const updatedCart: CartItem[] = [];
    cart.forEach((it) => {
      const splitInfo = itemSelections[it.product.id] as any;
      const remainingQty = it.quantity - (splitInfo?.payQty || 0);
      if (remainingQty > 0) {
        updatedCart.push({
          ...it,
          quantity: remainingQty,
        });
      }
    });

    onCompleteSplit(selectedItemsTotal, updatedCart);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border-2 border-gray-200 border-b-8 rounded-3xl w-full max-w-xl p-6 shadow-2xl animate-scaleUp">
        <div className="flex justify-between items-start border-b pb-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-3xl">🧮</span>
            <div>
              <h3 className="font-black text-gray-805 text-base uppercase leading-none">
                Dividir Cuenta Interactiva (F&B)
              </h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">
                Total de la Cuenta: ${totalAmount.toFixed(2)} USD
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 font-extrabold p-1 text-sm bg-gray-100 rounded-full h-6 w-6 flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        {/* Tab Selector */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            type="button"
            onClick={() => {
              setSplitType('equal');
              playSound('click');
            }}
            className={`py-2 rounded-xl text-xs font-black uppercase border-2 flex items-center justify-center gap-1.5 cursor-pointer ${
              splitType === 'equal'
                ? 'bg-blue-50 border-[#1cb0f6] text-[#1184bb]'
                : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-500'
            }`}
          >
            <Users size={14} /> Split Equitativo
          </button>
          <button
            type="button"
            onClick={() => {
              setSplitType('item');
              playSound('click');
            }}
            className={`py-2 rounded-xl text-xs font-black uppercase border-2 flex items-center justify-center gap-1.5 cursor-pointer ${
              splitType === 'item'
                ? 'bg-orange-50 border-[#ff9600] text-[#c96200]'
                : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-500'
            }`}
          >
            <SplitSquareVertical size={14} /> Cobro por Artículo
          </button>
        </div>

        {/* 1. EQUAL SPLITTING SCREEN */}
        {splitType === 'equal' && (
          <div className="space-y-4 text-left">
            <div className="flex justify-between items-center bg-gray-50 p-3 rounded-2xl border border-gray-150">
              <div>
                <span className="text-[10px] font-black uppercase text-gray-450 block leading-tight">
                  Comensales / Divisiones
                </span>
                <span className="text-sm font-extrabold text-gray-700">Dividir cuenta entre {equalParts} personas</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleEqualPartsChange(equalParts - 1)}
                  className="w-8 h-8 rounded-lg border bg-white flex items-center justify-center font-extrabold text-gray-600 hover:bg-gray-100"
                >
                  -
                </button>
                <span className="text-lg font-mono font-black text-gray-800 w-6 text-center">{equalParts}</span>
                <button
                  type="button"
                  onClick={() => handleEqualPartsChange(equalParts + 1)}
                  className="w-8 h-8 rounded-lg border bg-white flex items-center justify-center font-extrabold text-gray-600 hover:bg-gray-100"
                >
                  +
                </button>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 flex justify-between items-center">
              <div>
                <span className="text-[9px] font-black uppercase text-blue-500 block">Costo Por Persona:</span>
                <span className="text-2xl font-mono font-black text-blue-700">
                  ${(totalAmount / equalParts).toFixed(2)} <span className="text-xs">c/u</span>
                </span>
              </div>
              <span className="text-xs font-black uppercase bg-blue-100 text-blue-800 px-2 py-1 rounded-lg">
                DinaSplit Activo
              </span>
            </div>

            {/* Simulated Diner list with checkboxes/buttons to register they are checkout */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-gray-450 block">
                Registro de Pagos Individuales
              </label>
              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: equalParts }).map((_, i) => {
                  const partNum = i + 1;
                  const isPaid = hasPaidParts.includes(partNum);
                  return (
                    <div
                      key={partNum}
                      className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                        isPaid
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : 'bg-white hover:bg-slate-50 border-gray-150 text-gray-700'
                      }`}
                    >
                      <div>
                        <p className="font-extrabold text-xs">Persona {partNum}</p>
                        <p className="text-[10px] font-mono font-bold leading-none text-gray-400 mt-1">
                          ${(totalAmount / equalParts).toFixed(2)}
                        </p>
                      </div>

                      {isPaid ? (
                        <span className="text-[10px] font-black uppercase bg-[#d2f09d] text-green-800 px-2 py-0.5 rounded-full">
                          ¡PAGADO! ✓
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handlePayEqualPart(partNum)}
                          className="py-1 px-2.5 bg-[#58cc02] hover:bg-[#61e002] text-white rounded-lg text-[9px] uppercase font-black cursor-pointer shadow-sm active:translate-y-0.5"
                        >
                          Cobrar ✨
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 2. CHOOSE SPECIFIC ITEMS TO PAY NOW */}
        {splitType === 'item' && (
          <div className="space-y-4 text-left">
            <p className="text-[10.5px] text-gray-500 leading-tight">
              Seleccione la cantidad exacta de artículos que va a pagar la primera persona en este momento. Los
              productos restantes permanecerán pendientes en la comanda de la mesa.
            </p>

            <div className="border border-gray-150 rounded-2xl bg-white max-h-[180px] overflow-y-auto split-items divide-y">
              {cart.map((it) => {
                const currentSel = itemSelections[it.product.id] || { payQty: 0, origItem: it };
                const addonsPrice = it.addons ? it.addons.reduce((s, a) => s + a.price, 0) : 0;
                const fullPrice = it.product.price + addonsPrice;
                return (
                  <div
                    key={it.product.id}
                    className="p-3 flex items-center justify-between text-xs font-bold font-sans"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xl select-none">{it.product.emoji}</span>
                      <div className="min-w-0">
                        <p className="font-black text-gray-800 truncate leading-none mb-0.5">{it.product.name}</p>
                        <p className="text-[10px] text-gray-400 font-mono leading-none font-bold">
                          Max: {it.quantity} unidades • ${fullPrice.toFixed(2)}/u
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={currentSel.payQty <= 0}
                        onClick={() => handleToggleItemSelection(it.product.id, 'remove')}
                        className="w-6 h-6 rounded-lg border bg-white flex items-center justify-center font-extrabold text-gray-500 disabled:opacity-40"
                      >
                        -
                      </button>
                      <span className="font-mono text-sm font-black text-gray-700 w-5 text-center">
                        {currentSel.payQty}
                      </span>
                      <button
                        type="button"
                        disabled={currentSel.payQty >= it.quantity}
                        onClick={() => handleToggleItemSelection(it.product.id, 'add')}
                        className="w-6 h-6 rounded-lg border bg-white flex items-center justify-center font-extrabold text-gray-500 disabled:opacity-40"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-orange-50 bg-opacity-80 border border-orange-200 rounded-2xl p-4 flex justify-between items-center">
              <div>
                <span className="text-[9px] font-black uppercase text-orange-650 block leading-none">
                  Subtotal Consumo Seleccionado
                </span>
                <span className="text-2xl font-mono font-black text-orange-700 leading-none">
                  ${selectedItemsTotal.toFixed(2)}
                </span>
              </div>
              <button
                type="button"
                onClick={handlePayItemSplit}
                className="py-2.5 px-4 bg-orange-500 hover:bg-orange-400 border-b-4 border-orange-700 active:translate-y-0.5 active:border-b-0 text-white rounded-xl text-xs uppercase font-black cursor-pointer flex items-center gap-1 shadow-sm"
              >
                Procesar Consumo 💳
              </button>
            </div>
          </div>
        )}

        {/* Footer info showing standard closure */}
        <div className="pt-4 border-t mt-4 flex justify-between items-center text-[10px] text-gray-400 font-bold uppercase">
          <span>DuoPOS Hospitality Engine</span>
          <button
            onClick={onClose}
            className="text-gray-500 hover:underline hover:text-gray-700 font-black cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

// --- 3. KITCHEN DISPLAY SIMULATOR (KDS) ---
export interface KitchenOrder {
  id: string;
  tableId: string;
  tableName: string;
  waiterName: string;
  sentAt: string; // ISO string
  items: {
    name: string;
    emoji: string;
    quantity: number;
    notes?: string;
    addons?: { name: string; price: number }[];
  }[];
  status: 'pending' | 'cooking' | 'ready';
}

interface KdsProps {
  isOpen: boolean;
  onClose: () => void;
  kitchenOrders: KitchenOrder[];
  onDispatchOrder: (orderId: string) => void;
  onGrantXp: (amount: number) => void;
}

export function KitchenDisplaySimulator({ isOpen, onClose, kitchenOrders, onDispatchOrder, onGrantXp }: KdsProps) {
  if (!isOpen) return null;

  // Active cooking timers simulated locally
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const it = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(it);
  }, []);

  const getElapsedTime = (sentTimeStr: string) => {
    const elapsedMs = now.getTime() - new Date(sentTimeStr).getTime();
    const elapsedSecs = Math.floor(elapsedMs / 1000);
    const mins = Math.floor(elapsedSecs / 60);
    const secs = elapsedSecs % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFinishCooking = (order: KitchenOrder) => {
    playSound('levelup');
    onDispatchOrder(order.id);
    alert(
      `🛎️ ¡PLATILLOS LISTOS PARA DESPACHO!\n\nDe la mesa "${order.tableName}" (Atendido por ${order.waiterName || 'Mesero'}). El ticket pasará a comensal y sumas +10 XP por cocina!`,
    );
    onGrantXp(10);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#121215] border-4 border-slate-700 rounded-3xl w-full max-w-6xl h-[85vh] shadow-2xl flex flex-col justify-between overflow-hidden animate-zoomIn text-white">
        {/* Dark Metallic Header */}
        <div className="bg-[#1a1a20] border-b-2 border-slate-800 p-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-[#ff9655]/10 border border-[#ff9655] rounded-2xl flex items-center justify-center">
              <ChefHat className="text-[#ff9655] w-6 h-6 animate-pulse" />
            </span>
            <div>
              <h2 className="text-lg font-black tracking-wider uppercase text-[#ff9655] flex items-center gap-1.5 leading-none">
                <span>DuoPOS KDS Emulator</span>
                <span className="bg-orange-950 border border-orange-500 rounded text-orange-400 font-mono text-[9px] px-1 animate-pulse">
                  SISTEMA COMANDAS
                </span>
              </h2>
              <p className="text-[10px] text-gray-550 font-black uppercase mt-1 tracking-widest font-mono">
                Monitor de Ticketera de Cocina y Barra en Tiempo Real
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-400 bg-black/40 border border-slate-800 py-1 px-3 rounded-full font-mono">
              Comandas Activas: {kitchenOrders.length}
            </span>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white font-extrabold bg-white/5 border border-white/10 p-1.5 rounded-xl hover:bg-white/10 select-none cursor-pointer"
            >
              Cerrar Monitor ✕
            </button>
          </div>
        </div>

        {/* Content Rail Grid */}
        <div className="flex-1 bg-[#0b0b0e] p-5 overflow-x-auto overflow-y-hidden flex gap-5 items-stretch scrollbar-thin">
          {kitchenOrders.map((ord, idx) => {
            const sendDateObj = new Date(ord.sentAt);
            const isCookingLong = now.getTime() - sendDateObj.getTime() > 180000; // > 3 min
            return (
              <div
                key={ord.id}
                className="w-80 flex-shrink-0 bg-slate-900 border-2 border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-lg relative overflow-hidden h-full"
              >
                {/* Simulated Metal Rip Header */}
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-red-500 via-orange-400 to-yellow-500"></div>

                <div className="space-y-3 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Header meta details */}
                    <div className="flex justify-between items-start border-b border-white/5 pb-2">
                      <div>
                        <span className="text-[10px] font-black uppercase bg-[#1d9ff8]/20 text-[#1cb0f6] px-1.5 py-0.5 rounded">
                          {ord.tableName}
                        </span>
                        <p className="text-[9px] text-gray-500 uppercase font-black mt-1">
                          Waitstaff: {ord.waiterName || 'General Staff'}
                        </p>
                      </div>
                      <div className="text-right font-mono">
                        <span className="text-[9px] bg-slate-800 p-1 rounded font-black text-white/50">{ord.id}</span>
                        <span
                          className={`block text-xs font-mono font-black mt-1 flex items-center gap-0.5 justify-end ${isCookingLong ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`}
                        >
                          <Clock size={10} /> {getElapsedTime(ord.sentAt)}
                        </span>
                      </div>
                    </div>

                    {/* Comanda Items checklist */}
                    <div className="space-y-2.5 my-3 overflow-y-auto max-h-[290px] pr-1">
                      {ord.items.map((it, itemIdx) => (
                        <div key={itemIdx} className="font-sans border-b border-white/5 pb-1.5 last:border-0">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-xl select-none">{it.emoji}</span>
                              <span className="font-extrabold text-[12.5px] truncate text-white/95">{it.name}</span>
                            </div>
                            <span className="font-mono font-black text-xs text-[#ff9655] bg-orange-950 px-1.5 py-0.5 rounded border border-orange-900/35">
                              x{it.quantity}
                            </span>
                          </div>

                          {/* Render preparation guidelines */}
                          {it.notes && (
                            <p className="text-[10.5px] font-semibold text-yellow-350 bg-yellow-950/40 p-1 rounded mt-1 border border-yellow-900/10 gap-0.5 flex items-center">
                              <span>⚠️</span> Mod: {it.notes}
                            </p>
                          )}

                          {it.addons && it.addons.length > 0 && (
                            <div className="text-[9.5px] font-bold text-emerald-400 space-x-1 mt-0.5 flex flex-wrap gap-1 leading-none">
                              {it.addons.map((add, addIdx) => (
                                <span
                                  key={addIdx}
                                  className="bg-emerald-950/60 border border-emerald-900/50 px-1 py-0.5 rounded inline-block"
                                >
                                  +{add.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Operational status action slider/button */}
                  <div className="pt-3 border-t border-white/5 select-none">
                    <button
                      type="button"
                      onClick={() => handleFinishCooking(ord)}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-98 transition-all text-white border-b-4 border-emerald-800 rounded-xl font-bold uppercase tracking-wider text-xs cursor-pointer flex items-center justify-center gap-1 shadow-md"
                    >
                      🛎️ Despachar a Mesa
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {kitchenOrders.length === 0 && (
            <div className="flex flex-col items-center justify-center mx-auto space-y-4 py-12 text-gray-500 animate-pulse border-2 border-dashed border-slate-800 rounded-3xl px-12 max-w-lg select-none">
              <span className="text-7xl block">💤</span>
              <div>
                <h4 className="font-black text-gray-400 uppercase text-sm font-mono">Bandeja de Comandas Vacía</h4>
                <p className="text-[10px] text-gray-600 leading-normal font-sans max-w-xs mt-1">
                  Activa el "Modo Hospitalidad", selecciona una Mesa y haz clic en "Enviar a Cocina" para transmitir
                  tickets de preparación de platillos al KDS.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* CRT style scanline visual effects and warning */}
        <div className="bg-[#17171e] text-[9.5px] font-mono text-slate-500 p-2 text-center border-t border-slate-800 flex justify-between items-center px-6">
          <span>KDS PORTAL V2.2 // NODE TERMINAL IP: localhost:3000</span>
          <span>Suma racha de cocina activa para duplicar tu botín de XP</span>
        </div>
      </div>
    </div>
  );
}
