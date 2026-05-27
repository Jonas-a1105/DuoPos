/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Product, CartItem, LegalBillingSettings } from '../../../types/index';
import { playSound } from '../../../services/sounds';

interface ServiceControlDeckProps {
  isHospitalityActive: boolean;
  billingSettings: LegalBillingSettings;
  svcName: string;
  setSvcName: (val: string) => void;
  svcPrice: string;
  setSvcPrice: (val: string) => void;
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  setPromoMessage: (val: string) => void;
}

export default function ServiceControlDeck({
  isHospitalityActive,
  billingSettings,
  svcName,
  setSvcName,
  svcPrice,
  setSvcPrice,
  setCart,
  setPromoMessage,
}: ServiceControlDeckProps) {
  if (isHospitalityActive || billingSettings?.businessProfile !== 'general') return null;

  return (
    <div className="bg-white border-2 border-emerald-200 border-b-[6px] rounded-3xl p-5 space-y-4 animate-fadeIn text-gray-805">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-3 border-gray-150 gap-2">
        <div className="flex items-center gap-2">
          <span className="p-2 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-center font-black select-none text-xl">
            💼
          </span>
          <div className="text-left">
            <h3 className="font-black text-gray-800 text-sm uppercase leading-none">Módulo de Servicios y Consultorías</h3>
            <p className="text-[10px] text-emerald-600 font-bold uppercase mt-1 tracking-wider">
              Facturación Ágiles al Vuelo
            </p>
          </div>
        </div>
        <span className="bg-emerald-500 text-white text-[9px] font-black uppercase px-2 py-1 rounded-md">
          Servicios y Aranceles
        </span>
      </div>

      {/* Service Creator Fast-Form */}
      <div className="bg-emerald-50/20 border border-emerald-100 rounded-2xl p-4 space-y-3">
        <span className="text-[9px] uppercase font-black text-emerald-800 block">
          🛠️ Registrar Servicio Ad-Hoc e Inyectar en Carrito:
        </span>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className="text-[8px] uppercase font-black text-gray-500 block mb-1 font-bold text-left">Concepto de Servicio</label>
            <input
              type="text"
              placeholder="Ej. Consultoría TI Personalizada"
              value={svcName}
              onChange={(e) => setSvcName(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold outline-none"
            />
          </div>
          <div>
            <label className="text-[8px] uppercase font-black text-gray-500 block mb-1 font-bold text-left">Precio del Servicio ($)</label>
            <input
              type="number"
              min="1"
              placeholder="Ej. 180"
              value={svcPrice}
              onChange={(e) => setSvcPrice(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold outline-none"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            if (!svcName || !svcPrice) {
              playSound('error');
              alert('Por favor indica descripción y precio del servicio.');
              return;
            }
            const newSvcProduct: Product = {
              id: `svc-${Date.now()}`,
              name: svcName,
              price: Number(svcPrice),
              cost: Math.round(Number(svcPrice) * 0.15),
              stock: 9999,
              category: 'Servicios',
              emoji: '💼',
              description: 'Servicio personalizado adicionado al vuelo',
              branchesStock: {
                'branch-centro': 9999,
                'branch-central': 9999,
                'branch-norte': 9999
              }
            };
            
            // Add directly to cart
            setCart(curr => {
              const itemInCart = curr.find(it => it.product.name === svcName);
              if (itemInCart) {
                return curr.map(it => it.product.name === svcName ? { ...it, quantity: it.quantity + 1 } : it);
              }
              return [...curr, { product: newSvcProduct, quantity: 1 }];
            });

            playSound('kaching');
            setPromoMessage(`✅ ¡Servicio Adicionado: ${svcName} ($${svcPrice})!`);
            setTimeout(() => setPromoMessage(''), 2500);
            setSvcName('');
            setSvcPrice('');
          }}
          className="w-full bg-emerald-500 hover:bg-emerald-600 border-b-4 border-emerald-700 active:translate-y-[2px] active:border-b-0 py-2 rounded-xl text-white font-black text-xs uppercase cursor-pointer"
        >
          🚀 Añadir Servicio al Ticket
        </button>
      </div>

      <div className="bg-slate-50 p-3 rounded-xl border grid grid-cols-2 gap-2 text-[10px] text-gray-500 leading-normal font-bold">
        <div>
          👤 <strong>Administrador:</strong> Cajero Principal
        </div>
        <div>
          📅 <strong>Periodo fiscal:</strong> Ejercicio 2026
        </div>
      </div>
    </div>
  );
}
