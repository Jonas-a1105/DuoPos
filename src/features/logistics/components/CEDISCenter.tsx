/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Product, Branch, StockTransfer } from '../../../types/index';
import { playSound } from '../../../services/sounds';
import { syncSaveStockTransfer, generateUUID } from '../../../services/supabaseSync';
import { ArrowLeftRight, AlertCircle, X } from 'lucide-react';

interface CEDISCenterProps {
  products: Product[];
  onUpdateProduct: (prod: Product) => void;
  branches: Branch[];
  activeBranchId: string;
  stockTransfers: StockTransfer[];
  setStockTransfers: React.Dispatch<React.SetStateAction<StockTransfer[]>>;
  onGrantXp: (amount: number) => void;
  suggestedRestocksList: {
    branchId: string;
    branchName: string;
    productId: string;
    name: string;
    emoji: string;
    currentStock: number;
    missing: number;
  }[];
  handleBulkDispatchSuggested: () => Promise<void>;
}

export default function CEDISCenter({
  products,
  onUpdateProduct,
  branches,
  activeBranchId,
  stockTransfers,
  setStockTransfers,
  onGrantXp,
  suggestedRestocksList,
  handleBulkDispatchSuggested,
}: CEDISCenterProps) {
  // Localized manual transfer states
  const [transferFrom, setTransferFrom] = useState(activeBranchId);
  const [transferTo, setTransferTo] = useState('');
  const [transferItems, setTransferItems] = useState<{ productId: string; quantity: number }[]>([]);
  const [transferNotes, setTransferNotes] = useState('');
  const [transferError, setTransferError] = useState('');

  // Stock Transfer Actions
  const handleAddTransferItem = () => {
    const firstProd = products[0];
    if (!firstProd) return;
    setTransferItems([...transferItems, { productId: firstProd.id, quantity: 10 }]);
    playSound('click');
  };

  const handleUpdateTransferItem = (index: number, fId: string, qty: number) => {
    const updated = [...transferItems];
    updated[index] = { productId: fId, quantity: qty };
    setTransferItems(updated);
  };

  const handleRemoveTransferItem = (index: number) => {
    setTransferItems(transferItems.filter((_, i) => i !== index));
    playSound('swoosh');
  };

  const handleSubmitTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferFrom || !transferTo) {
      setTransferError('Por favor selecciona la sucursal de origen y destino.');
      return;
    }
    if (transferFrom === transferTo) {
      setTransferError('Origen y destino deben ser distintas sucursales.');
      return;
    }
    if (transferItems.length === 0) {
      setTransferError('Debe ingresar mínimo 1 artículo para transferir.');
      return;
    }

    // Verify stock availability at origin branch
    for (const it of transferItems) {
      const match = products.find((p) => p.id === it.productId);
      const originStock = match?.branchesStock?.[transferFrom] ?? match?.stock ?? 0;
      if (it.quantity <= 0) {
        setTransferError('Las cantidades de traslado deben ser mayores a cero.');
        return;
      }
      if (originStock < it.quantity) {
        setTransferError(`Stock insuficiente para "${match?.name}" en origen. Disponible: ${originStock} un.`);
        return;
      }
    }

    setTransferError('');

    const fromB = branches.find((b) => b.id === transferFrom)!;
    const toB = branches.find((b) => b.id === transferTo)!;

    const itemsList = transferItems.map((it) => {
      const match = products.find((p) => p.id === it.productId)!;
      return {
        productId: it.productId,
        name: match.name,
        emoji: match.emoji || '📦',
        quantity: it.quantity,
      };
    });

    const newTransfer: StockTransfer = {
      id: generateUUID(),
      fromBranchId: transferFrom,
      fromBranchName: fromB.name,
      toBranchId: transferTo,
      toBranchName: toB.name,
      items: itemsList,
      status: 'pending',
      createdAt: new Date().toISOString(),
      notes: transferNotes.trim(),
      carrier: 'Vehículo Repartidor DuoExpress 🚐',
    };

    const updated = [newTransfer, ...stockTransfers];
    setStockTransfers(updated);
    await syncSaveStockTransfer(newTransfer, updated);

    // Reset items form
    setTransferItems([]);
    setTransferNotes('');

    onGrantXp(30);
    playSound('success');

    const displayId = `TR-${newTransfer.id.slice(0, 8).toUpperCase()}`;
    alert(`💡 Orden de Traspaso ${displayId} generada en borrador "Pendiente".`);
  };

  return (
    <div className="space-y-6 animate-fadeIn text-left font-sans">
      <div className="bg-[#1cb0f6] border-2 border-[#1899d6] border-b-8 rounded-3xl p-5 md:p-6 text-white relative overflow-hidden text-left shadow-xs font-sans">
        <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-1.5">
          <span>🏢</span> Centro de Distribución CEDIS DuoPOS
        </h3>
        <p className="text-xs md:text-sm font-semibold text-blue-550 mt-1 max-w-xl">
          Abastece la red de tiendas de la corporación. Compila de forma ágil traspasos sugeridos basados en alertas de
          bajo stock y despliégalos en un solo clic. ¡Gana <strong>+80 XP</strong>!
        </p>
      </div>

      {/* Quick Alarm / Auto restock trigger */}
      {suggestedRestocksList.length > 0 ? (
        <div className="bg-red-50 border-2 border-red-200 rounded-3xl p-5 flex flex-col md:flex-row justify-between items-center gap-4 text-left font-sans">
          <div className="space-y-0.5">
            <span className="text-[9px] bg-red-200 text-red-900 border border-red-300 font-black px-2 py-0.5 rounded uppercase font-sans">
              Crisis de Inventarios
            </span>
            <h4 className="text-base font-black text-red-950">
              Se detectaron {suggestedRestocksList.length} alertas deficitarias en locales
            </h4>
            <p className="text-xs text-red-800 font-bold max-w-lg">
              Varias sucursales tienen insumos críticos con stock inferior al mínimo. CEDIS tiene fondos suficientes
              para despachar un envío masivo de resurtido de inmediato.
            </p>
          </div>

          <button
            onClick={handleBulkDispatchSuggested}
            className="bg-red-500 border-b-4 border-red-700 hover:bg-red-600 active:border-b-0 active:translate-y-1 text-white font-black py-3 px-5 rounded-2xl text-xs uppercase cursor-pointer"
          >
            Atender Alertas Masivas 🚚 (+80 XP)
          </button>
        </div>
      ) : (
        <div className="bg-green-50 border-2 border-green-200 rounded-3xl p-5 text-center text-green-800 font-black text-xs">
          ✅ LOGÍSTICA FLUIDA: Ninguna sucursal reporta bajo stock por debajo de su reserva mínima en este momento.
        </div>
      )}

      {/* Direct Manual Stock Transfer Calculator / Simulator */}
      <div className="bg-white border-2 border-gray-200 border-b-[6px] rounded-3xl p-5 space-y-4 font-sans">
        <h4 className="text-sm font-black uppercase text-gray-400 border-b pb-2 flex items-center gap-1">
          <ArrowLeftRight size={14} /> Calculadora de Despacho Corporativo (Traspaso Directo)
        </h4>

        <form
          onSubmit={handleSubmitTransfer}
          className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs font-bold font-sans"
        >
          <div className="space-y-4 md:col-span-1">
            <div className="space-y-1 text-left">
              <label className="text-gray-500 block uppercase">Sucursal Origen (Emisor)</label>
              <select
                value={transferFrom}
                onChange={(e) => {
                  setTransferFrom(e.target.value);
                  playSound('click');
                }}
                className="w-full px-3.5 py-2.5 bg-gray-50 border-2 rounded-xl outline-none"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.emoji} {b.name} ({b.city})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1 text-left">
              <label className="text-gray-500 block uppercase">Sucursal Destino (Receptor)</label>
              <select
                value={transferTo}
                onChange={(e) => {
                  setTransferTo(e.target.value);
                  playSound('click');
                }}
                className="w-full px-3.5 py-2.5 bg-gray-50 border-2 rounded-xl outline-none"
              >
                <option value="">-- Seleccionar Destino --</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.emoji} {b.name} ({b.city})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1 text-left">
              <label className="text-gray-500 block uppercase">Notas de Despacho</label>
              <textarea
                placeholder="Escriba el motivo, transportista asignado o especificaciones..."
                value={transferNotes}
                onChange={(e) => setTransferNotes(e.target.value)}
                rows={2}
                className="w-full px-3.5 py-2.5 bg-gray-50 border-2 rounded-xl outline-none font-bold text-xs"
              />
            </div>

            {transferError && (
              <p className="text-red-500 text-[10px] uppercase font-black tracking-wide flex items-center gap-0.5">
                <AlertCircle size={10} /> {transferError}
              </p>
            )}

            <button
              type="submit"
              className="w-full bg-[#58cc02] border-b-4 border-[#3c9e01] hover:bg-[#61e002] active:border-b-0 active:translate-y-1 text-white font-black py-3 rounded-2xl text-xs uppercase cursor-pointer"
            >
              Confirmar y Generar Guía de Traspaso 📝
            </button>
          </div>

          <div className="md:col-span-2 space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col justify-between text-left">
            <div className="space-y-2">
              <div className="flex justify-between items-center border-b pb-1">
                <span className="text-xs uppercase font-black text-gray-400 leading-none">
                  Insumos del Lote Directo
                </span>
                <button
                  type="button"
                  onClick={handleAddTransferItem}
                  className="bg-indigo-100 hover:bg-indigo-200 text-indigo-750 tracking-wide font-black px-2.5 py-1 rounded-lg text-[10px] uppercase cursor-pointer animate-none"
                >
                  + Producto
                </button>
              </div>

              {transferItems.length === 0 ? (
                <div className="text-center py-10 font-sans">
                  <span className="text-4xl">🥫</span>
                  <p className="text-gray-400 font-bold text-[11px] pt-2">Agregue artículos al bloque de carga.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[180px] overflow-y-auto">
                  {transferItems.map((item, idx) => {
                    const productMatch = products.find((p) => p.id === item.productId);
                    const originStock = productMatch?.branchesStock?.[transferFrom] ?? productMatch?.stock ?? 0;

                    return (
                      <div
                        key={idx}
                        className="flex flex-wrap items-center gap-2 bg-white border border-gray-150 p-2 rounded-xl text-left first:mt-0 font-sans"
                      >
                        <select
                          value={item.productId}
                          onChange={(e) => handleUpdateTransferItem(idx, e.target.value, item.quantity)}
                          className="flex-1 min-w-[120px] bg-slate-50 border p-1.5 rounded-lg outline-none font-extrabold text-[11px]"
                        >
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.emoji} {p.name}
                            </option>
                          ))}
                        </select>

                        <div className="flex items-center gap-1.5 font-sans">
                          <span className="text-[10px] text-gray-400">
                            Stock Orig: <strong className="text-gray-700 font-extrabold">{originStock}</strong>
                          </span>
                          <input
                            type="number"
                            min={1}
                            max={999}
                            value={item.quantity}
                            onChange={(e) =>
                              handleUpdateTransferItem(idx, item.productId, Math.max(1, parseInt(e.target.value) || 0))
                            }
                            className="w-16 bg-slate-50 border text-center p-1 font-mono rounded-lg outline-none font-bold"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveTransferItem(idx)}
                          className="text-red-500 hover:text-red-600 p-1 rounded-lg border border-red-150 hover:bg-red-50 cursor-pointer flex items-center justify-center"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-white p-3 rounded-xl border border-gray-250 text-left font-bold text-[10px] text-indigo-900 leading-normal">
              ⚡ Las mercancías descontadas en el Origen quedarán retenidas en el estado de "Guía Embarcada" hasta que
              un dependiente en la sucursal de destino registre el ingreso de bodega, garantizando una doble firma de
              confirmación fiscal.
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
