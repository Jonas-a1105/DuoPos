/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ChefHat } from 'lucide-react';
import { TableState, KitchenOrder, MOCK_WAITERS } from '../HospitalityAddon';
import { CartItem, Customer } from '../../../types/index';
import { playSound } from '../../../services/sounds';

interface HospitalityFloorPlanProps {
  isHospitalityActive: boolean;
  tables: TableState[];
  activeTableId: string | null;
  activeWaiterName: string;
  cart: CartItem[];
  kitchenOrders: KitchenOrder[];
  setTables: React.Dispatch<React.SetStateAction<TableState[]>>;
  setActiveTableId: (id: string | null) => void;
  setActiveWaiterName: (name: string) => void;
  setCart: (cart: CartItem[]) => void;
  setSelectedCustomer: (customer: Customer | null) => void;
  setIsKdsOpen: (isOpen: boolean) => void;
}

export default function HospitalityFloorPlan({
  isHospitalityActive,
  tables,
  activeTableId,
  activeWaiterName,
  cart,
  kitchenOrders,
  setTables,
  setActiveTableId,
  setActiveWaiterName,
  setCart,
  setSelectedCustomer,
  setIsKdsOpen,
}: HospitalityFloorPlanProps) {
  if (!isHospitalityActive) return null;

  return (
    <div className="bg-white border-2 border-[#e5e5e5] border-b-[6px] rounded-3xl p-5 space-y-4 animate-fadeIn text-gray-805">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-3 border-gray-150 gap-2">
        <div className="flex items-center gap-2">
          <span className="p-2 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-center font-black select-none text-xl">
            🏨
          </span>
          <div className="text-left">
            <h3 className="font-black text-gray-800 text-sm uppercase leading-none">
              Mapa de Mesas y Comensales (F&B)
            </h3>
            <p className="text-[10px] text-[#58cc02] font-black uppercase mt-1 tracking-wider">
              Mesa Activa:{' '}
              {activeTableId ? tables.find((t) => t.id === activeTableId)?.name : 'Ninguna (Mostrador / Fast Food)'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-center w-full sm:w-auto">
          {/* KDS Open simulator button */}
          <button
            type="button"
            onClick={() => {
              setIsKdsOpen(true);
              playSound('click');
            }}
            className="flex-1 sm:flex-none bg-[#ff9600] text-white border-b-4 border-amber-700 hover:bg-[#ffa726] active:translate-y-[2px] active:border-b-0 py-1.5 px-3 rounded-xl font-black text-[10.5px] uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer animate-pulse-slow"
          >
            <ChefHat size={13} /> Monitor Cocina (KDS)
            {kitchenOrders.length > 0 && (
              <span className="bg-red-500 font-mono text-white text-[9px] h-4 min-w-4 px-1 rounded-full flex items-center justify-center font-black animate-bounce">
                {kitchenOrders.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              // Release selection to quick counter sale
              playSound('click');
              setActiveTableId(null);
              setActiveWaiterName('');
            }}
            className="flex-1 sm:flex-none border-2 border-gray-200 hover:bg-slate-50 text-gray-500 py-1.5 px-3 rounded-xl font-black text-[10.5px] uppercase tracking-wider cursor-pointer text-xs"
          >
            Mostrador Rápido 🛍️
          </button>
        </div>
      </div>

      {/* Floor Layout tables grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
        {tables.map((t) => {
          const isSelected = activeTableId === t.id;
          const isOccupied = t.status === 'occupied';
          const activeItemsCount = t.cart?.reduce((acc, it) => acc + it.quantity, 0) || 0;
          const tableTotal =
            t.cart?.reduce((acc, curr) => {
              const addSum = curr.addons ? curr.addons.reduce((s, a) => s + a.price, 0) : 0;
              return acc + (curr.product.price + addSum) * curr.quantity;
            }, 0) || 0;

          return (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                playSound('click');
                if (isSelected) {
                  // deselect
                  setActiveTableId(null);
                  setActiveWaiterName('');
                } else {
                  // select table
                  setActiveTableId(t.id);
                  if (isOccupied) {
                    setCart(t.cart || []);
                    setSelectedCustomer(t.customer || null);
                    setActiveWaiterName(t.waiterName || '');
                  } else {
                    // free table. If screen already has a cart, bind it to this table!
                    if (cart.length > 0) {
                      const bindNow = window.confirm(
                        `¿Pretende asociar los productos del carrito actual a la ${t.name}?`,
                      );
                      if (bindNow) {
                        setTables((prev) =>
                          prev.map((item) => {
                            if (item.id === t.id) {
                              return {
                                ...item,
                                status: 'occupied',
                                cart: cart,
                                waiterName: activeWaiterName || 'Personal General',
                              };
                            }
                            return item;
                          }),
                        );
                      } else {
                        setCart([]);
                      }
                    } else {
                      setCart([]);
                      setSelectedCustomer(null);
                      setActiveWaiterName('');
                    }
                  }
                }
              }}
              className={`p-3 rounded-2xl border-2 transition-all flex flex-col justify-between items-center text-center relative max-h-32 select-none cursor-pointer ${
                isSelected
                  ? 'border-[#1cb0f6] bg-blue-50 text-blue-900 scale-102 font-extrabold shadow-sm'
                  : isOccupied
                    ? 'border-[#ff4b4b] bg-red-50 text-rose-950 font-extrabold shadow-xs'
                    : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700 font-bold'
              }`}
            >
              {/* Top badge or layout indicator */}
              <span className="text-[8px] uppercase tracking-wider font-extrabold block opacity-50 leading-none">
                {t.section}
              </span>

              <div className="my-1.5 flex flex-col items-center">
                <span className="text-xl select-none leading-none mb-1">{isOccupied ? '🍱' : '🍽️'}</span>
                <span className="text-[11px] leading-tight block truncate w-full">{t.name}</span>
              </div>

              {/* Info footer metadata per table */}
              <div className="w-full">
                {isOccupied ? (
                  <div className="text-[8.5px] leading-none text-rose-700 flex flex-col gap-0.5 mt-0.5">
                    <span className="font-extrabold font-mono">${tableTotal.toFixed(2)}</span>
                    <span className="font-bold truncate" title={t.waiterName}>
                      {t.waiterName || 'Mesero'}
                    </span>
                  </div>
                ) : (
                  <span className="text-[8.5px] font-black uppercase text-emerald-600 tracking-wider">LIBRE</span>
                )}
              </div>

              {/* Small visual counter badge */}
              {isOccupied && (
                <span className="absolute -top-1.5 -right-1.5 bg-[#ff4b4b] text-white border-2 border-white rounded-full font-mono font-black text-[8px] h-4.5 w-4.5 flex items-center justify-center animate-bounce leading-none">
                  {activeItemsCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Waiter Assignation & Table details options details */}
      <div className="bg-slate-50 p-3 rounded-2xl border flex flex-col sm:flex-row gap-3 items-center justify-between text-xs font-bold text-gray-700">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">🤵</span>
          <label className="text-xs font-black uppercase text-slate-700">Asignar Mesero Activo:</label>
          <select
            value={activeWaiterName}
            onChange={(e) => {
              playSound('click');
              setActiveWaiterName(e.target.value);
              // Update active table waiter directly
              if (activeTableId) {
                setTables((prev) =>
                  prev.map((t) => {
                    if (t.id === activeTableId) {
                      return { ...t, waiterName: e.target.value };
                    }
                    return t;
                  }),
                );
              }
            }}
            className="bg-white border-2 border-gray-200 rounded-lg px-2 py-1 text-xs font-bold text-gray-750 outline-none focus:border-[#58cc02]"
          >
            <option value="">-- Personal General --</option>
            {MOCK_WAITERS.map((w) => (
              <option key={w.id} value={w.name}>
                {w.name}
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs font-bold text-gray-400">
          <span>Modo Restaurante: Carga mesas, despacha comandas de cocina y divide cuentas.</span>
        </div>
      </div>
    </div>
  );
}
