/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Product, LegalBillingSettings } from '../../../types/index';
import { playSound } from '../../../services/audio/soundService';

interface RetailControlDeckProps {
  isHospitalityActive: boolean;
  billingSettings: LegalBillingSettings;
  rawBarInput: string;
  setRawBarInput: (val: string) => void;
  products: Product[];
  simulateBarcodeScan: (product: Product) => void;
}

export default function RetailControlDeck({
  isHospitalityActive,
  billingSettings,
  rawBarInput,
  setRawBarInput,
  products,
  simulateBarcodeScan,
}: RetailControlDeckProps) {
  if (isHospitalityActive || billingSettings?.businessProfile !== 'retail') return null;

  return (
    <div className="bg-white border-2 border-orange-200 border-b-[6px] rounded-3xl p-5 space-y-4 animate-fadeIn text-gray-805">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-3 border-gray-150 gap-2">
        <div className="flex items-center gap-2">
          <span className="p-2 bg-orange-50 border border-orange-200 rounded-xl flex items-center justify-center font-black select-none text-xl">
            🛍️
          </span>
          <div className="text-left">
            <h3 className="font-black text-gray-800 text-sm uppercase leading-none">
              Simulador de Escáner EAN & Retail
            </h3>
            <p className="text-[10px] text-orange-600 font-bold uppercase mt-1 tracking-wider">
              Modo Tienda / Supermercado Activo
            </p>
          </div>
        </div>
        <span className="bg-[#ff9600] text-white text-[9px] font-black uppercase px-2 py-1 rounded-md">
          Escaneo Ultra-Rápido
        </span>
      </div>

      {/* Interactive Laser Barcode Simulation Grid */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 flex flex-col items-center justify-center relative overflow-hidden border-2 border-slate-750 min-h-[110px]">
        {/* Laser Red Horizontal Line */}
        <div className="absolute left-0 right-0 h-0.5 bg-red-500 shadow-[0_0_8px_#ef4444] top-1/2 animate-bounce opacity-80" />

        {/* Simulated Barcode lines */}
        <div className="flex gap-1.5 items-end h-10 opacity-40 mb-2">
          <div className="w-1 h-10 bg-white" />
          <div className="w-0.5 h-10 bg-white" />
          <div className="w-2 h-10 bg-white" />
          <div className="w-0.5 h-10 bg-white" />
          <div className="w-1.5 h-10 bg-white" />
          <div className="w-0.5 h-10 bg-white" />
          <div className="w-1 h-10 bg-white" />
          <div className="w-2.5 h-10 bg-white" />
          <div className="w-0.5 h-10 bg-white" />
          <div className="w-1.5 h-10 bg-white" />
          <div className="w-1 h-10 bg-white" />
        </div>
        <div className="text-[10px] font-mono text-gray-350 select-none uppercase tracking-widest font-bold">
          {rawBarInput || 'Sostén o ingresa código de barra para simulación'}
        </div>
      </div>

      {/* Mock Scan trigger form */}
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="sm:col-span-2">
            <input
              type="text"
              placeholder="Ingresar número de código de barra..."
              value={rawBarInput}
              onChange={(e) => setRawBarInput(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border-2 border-[#e5e5e5] rounded-xl font-mono text-xs font-black text-gray-750 placeholder:font-sans outline-none focus:border-orange-500 focus:bg-white"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              if (!rawBarInput) return;
              const found = products.find((p) => p.barcode === rawBarInput || p.id === rawBarInput);
              if (found) {
                simulateBarcodeScan(found);
              } else {
                playSound('error');
                alert(`Código de barras "${rawBarInput}" no encontrado en el catálogo.`);
              }
              setRawBarInput('');
            }}
            className="bg-orange-500 hover:bg-orange-600 text-white py-2 px-3 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-1.5 cursor-pointer border-b-4 border-orange-700 active:translate-y-[2px] active:border-b-0"
          >
            ⚡ Escanear
          </button>
        </div>

        {/* Dropdown with active product codes for fast clicking mock */}
        <div className="border border-dashed border-gray-200 p-3 rounded-2xl space-y-2 bg-amber-50/20">
          <span className="text-[9px] uppercase font-black text-orange-700 block">
            ⚡ Escaneo de Simulación con Un Clic:
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            {products
              .filter((p) => p.barcode)
              .slice(0, 6)
              .map((prod) => (
                <button
                  key={prod.id}
                  type="button"
                  onClick={() => {
                    setRawBarInput(prod.barcode || '');
                    setTimeout(() => {
                      simulateBarcodeScan(prod);
                      setRawBarInput('');
                    }, 320);
                  }}
                  className="bg-white border hover:border-orange-300 p-2 rounded-xl text-left flex items-center gap-2 transition-all cursor-pointer text-[10px] font-bold text-gray-750 group"
                >
                  <span className="text-sm select-none shrink-0">{prod.emoji}</span>
                  <div className="truncate flex-1">
                    <p className="truncate leading-tight font-extrabold group-hover:text-orange-600">{prod.name}</p>
                    <span className="font-mono text-[8px] text-gray-400 font-black block">EAN-{prod.barcode}</span>
                  </div>
                </button>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
