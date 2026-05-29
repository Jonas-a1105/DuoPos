import React, { useState } from 'react';
import { TaxCategoryOverride } from '../../../types';
import { playSound } from '../../../services/sounds';
import { toast } from '../../../components/Modal/FlashNotifications';
import { Percent, Trash2, Plus } from 'lucide-react';

interface TaxesSettingsProps {
  taxName: string;
  setTaxName: (val: string) => void;
  generalTaxRate: number;
  setGeneralTaxRate: (val: number) => void;
  taxIncludedInPrice: boolean;
  setTaxIncludedInPrice: (val: boolean) => void;
  categoryOverrides: TaxCategoryOverride[];
  setCategoryOverrides: React.Dispatch<React.SetStateAction<TaxCategoryOverride[]>>;
}

export default function TaxesSettings({
  taxName,
  setTaxName,
  generalTaxRate,
  setGeneralTaxRate,
  taxIncludedInPrice,
  setTaxIncludedInPrice,
  categoryOverrides,
  setCategoryOverrides,
}: TaxesSettingsProps) {
  const [newCategory, setNewCategory] = useState('');
  const [newRate, setNewRate] = useState('');

  const handleAddOverride = () => {
    if (!newCategory.trim() || newRate === '') return;
    const rateVal = parseFloat(newRate);
    if (isNaN(rateVal)) return;

    if (categoryOverrides.some((o) => o.category.toLowerCase() === newCategory.trim().toLowerCase())) {
      toast.error('La categoría ya tiene un impuesto asignado.');
      return;
    }

    const updated = [...categoryOverrides, { category: newCategory.trim(), rate: rateVal }];
    setCategoryOverrides(updated);
    setNewCategory('');
    setNewRate('');
    playSound('success');
  };

  const handleRemoveOverride = (category: string) => {
    const updated = categoryOverrides.filter((o) => o.category !== category);
    setCategoryOverrides(updated);
    playSound('error');
  };

  return (
    <div className="space-y-6 animate-fadeIn text-left">
      <div className="border-b pb-3 flex items-center gap-2">
        <span className="text-2xl select-none">📊</span>
        <div>
          <h3 className="text-sm font-black uppercase text-gray-800 tracking-tight font-sans">
            Ajustes del IVA y Tasas Base
          </h3>
          <p className="text-[10px] text-gray-400 font-bold uppercase">
            Define el nombre y valor base del impuesto nacional
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans text-gray-700">
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-black text-gray-450 tracking-wider block">
            Nombre del Impuesto
          </label>
          <input
            type="text"
            required
            value={taxName}
            onChange={(e) => setTaxName(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-200 text-xs font-bold rounded-xl outline-none focus:border-amber-500 focus:bg-white"
            placeholder="Ej: IVA, IGV, ITBMS..."
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] uppercase font-black text-gray-450 tracking-wider block">
            Tasa de Impuesto General (%)
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.01"
              required
              value={generalTaxRate}
              onChange={(e) => setGeneralTaxRate(Number(e.target.value))}
              className="w-full pl-3 pr-10 py-2 bg-gray-50 border-2 border-gray-200 text-xs font-bold rounded-xl outline-none focus:border-amber-500 focus:bg-white font-mono"
              placeholder="16.00"
            />
            <span className="absolute right-3.5 top-2.5 text-[10px] font-black text-gray-400 select-none">%</span>
          </div>
        </div>

        <div className="md:col-span-2 space-y-1">
          <label className="text-[10px] uppercase font-black text-gray-455 tracking-wider block mb-1">
            Cálculo de Precios en Almacén
          </label>
          <label className="flex items-center gap-2 bg-slate-50 border-2 border-slate-205 p-3 rounded-2xl cursor-pointer">
            <input
              type="checkbox"
              checked={taxIncludedInPrice}
              onChange={(e) => setTaxIncludedInPrice(e.target.checked)}
              className="rounded text-amber-500 focus:ring-amber-500 h-4 w-4 border-gray-300 cursor-pointer"
            />
            <div className="select-none text-left">
              <span className="text-[10px] font-black text-slate-700 uppercase block">
                Las tarifas expuestas ya incluyen impuestos (Precio Neto)
              </span>
              <span className="text-[9px] text-gray-400 font-bold block lowercase">
                Habilita esta casilla para que el POS no añada el porcentaje al total al facturar.
              </span>
            </div>
          </label>
        </div>
      </div>

      {/* OVERRIDES SECTION */}
      <div className="space-y-3 pt-3 border-t">
        <div>
          <h4 className="text-[11px] font-black uppercase text-gray-800 tracking-wider flex items-center gap-1">
            <Percent size={14} className="text-amber-500" />
            <span>Excepciones Impositivas por Categoría ({categoryOverrides.length})</span>
          </h4>
          <p className="text-[9.5px] text-gray-400 font-bold leading-normal">
            Aplica un porcentaje diferente para categorías especiales (ej. Alimentos al 0%, Licores al 20%, etc.).
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div className="space-y-1 text-xs">
            <label className="text-[9px] uppercase font-black text-gray-400">Categoría Involucrada</label>
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="Ej: Farmacia, Bebidas..."
              className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-205 rounded-xl outline-none focus:border-amber-500 font-bold text-xs"
            />
          </div>

          <div className="space-y-1 text-xs">
            <label className="text-[9px] uppercase font-black text-gray-400">Tasa de Excepción (%)</label>
            <input
              type="number"
              step="0.01"
              value={newRate}
              onChange={(e) => setNewRate(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-205 rounded-xl outline-none focus:border-amber-500 font-mono text-xs"
            />
          </div>

          <button
            type="button"
            onClick={handleAddOverride}
            className="bg-amber-500 text-white font-black py-2.5 rounded-xl text-xs uppercase border-b-4 border-amber-700 hover:bg-amber-400 active:border-b-0 active:translate-y-1 flex items-center justify-center gap-1 cursor-pointer select-none"
          >
            <Plus size={14} /> Añadir Excepción
          </button>
        </div>

        {/* Override cards list */}
        <div className="bg-slate-50 border rounded-2xl p-4 space-y-2 text-xs">
          {categoryOverrides.length === 0 ? (
            <p className="text-gray-400 font-bold italic text-center py-2">
              No se han registrado excepciones impositivas. Todos los productos tributan al {generalTaxRate}%.
            </p>
          ) : (
            <div className="divide-y divide-gray-150 text-left">
              {categoryOverrides.map((ov) => (
                <div key={ov.category} className="py-2.5 flex justify-between items-center first:pt-0">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-gray-800 uppercase tracking-wide bg-white px-2 py-0.5 rounded-lg border">
                      {ov.category}
                    </span>
                    <span className="text-gray-400 font-bold">aplica un gravamen del</span>
                    <span className="font-mono font-black text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">
                      {ov.rate}%
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveOverride(ov.category)}
                    className="p-1 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
