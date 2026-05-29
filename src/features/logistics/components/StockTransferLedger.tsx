/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { StockTransfer, Product } from '../../../types/index';
import { playSound } from '../../../services/sounds';
import { syncSaveStockTransfer } from '../../../services/supabaseSync';
import { ChevronRight, CheckCircle2 } from 'lucide-react';

interface StockTransferLedgerProps {
  stockTransfers: StockTransfer[];
  setStockTransfers: React.Dispatch<React.SetStateAction<StockTransfer[]>>;
  activeBranchId: string;
  products: Product[];
  onUpdateProduct: (prod: Product) => void;
  onGrantXp: (amount: number) => void;
}

export default function StockTransferLedger({
  stockTransfers,
  setStockTransfers,
  activeBranchId,
  products,
  onUpdateProduct,
  onGrantXp,
}: StockTransferLedgerProps) {
  // Commit / Ship Stock Transfer
  const handleShipTransfer = async (id: string) => {
    const tr = stockTransfers.find((t) => t.id === id);
    if (!tr) return;

    // Deduct stock from ORIGIN branch
    tr.items.forEach((item) => {
      const p = products.find((prod) => prod.id === item.productId);
      if (p) {
        const stocks = { ...(p.branchesStock || {}) };
        const currentStock = stocks[tr.fromBranchId] ?? p.stock;
        stocks[tr.fromBranchId] = Math.max(0, currentStock - item.quantity);
        onUpdateProduct({
          ...p,
          branchesStock: stocks,
          stock: tr.fromBranchId === 'branch-centro' ? Math.max(0, currentStock - item.quantity) : p.stock,
        });
      }
    });

    const updated = stockTransfers.map((t) =>
      t.id === id ? { ...t, status: 'shipped' as const, shippedAt: new Date().toISOString() } : t,
    );
    setStockTransfers(updated);
    const updatedTransfer = updated.find((t) => t.id === id);
    if (updatedTransfer) {
      await syncSaveStockTransfer(updatedTransfer, updated);
    }

    onGrantXp(40);
    playSound('swoosh');
  };

  // Receive stock transfer at destination
  const handleReceiveTransfer = async (id: string) => {
    const tr = stockTransfers.find((t) => t.id === id);
    if (!tr) return;

    // Add stock to DESTINATION branch
    tr.items.forEach((item) => {
      const p = products.find((prod) => prod.id === item.productId);
      if (p) {
        const stocks = { ...(p.branchesStock || {}) };
        const currentStock = stocks[tr.toBranchId] ?? (tr.toBranchId === 'branch-centro' ? p.stock : 0);
        stocks[tr.toBranchId] = currentStock + item.quantity;

        // If destination is default 'branch-centro', also sync main fallback stock property
        let mainVal = p.stock;
        if (tr.toBranchId === 'branch-centro') {
          mainVal = currentStock + item.quantity;
        }
        onUpdateProduct({ ...p, branchesStock: stocks, stock: mainVal });
      }
    });

    const updated = stockTransfers.map((t) =>
      t.id === id ? { ...t, status: 'received' as const, receivedAt: new Date().toISOString() } : t,
    );
    setStockTransfers(updated);
    const updatedTransfer = updated.find((t) => t.id === id);
    if (updatedTransfer) {
      await syncSaveStockTransfer(updatedTransfer, updated);
    }

    onGrantXp(50);
    playSound('levelup');
    const displayId = tr.id.startsWith('TR-') ? tr.id : `TR-${tr.id.slice(0, 8).toUpperCase()}`;
    alert(
      `🎉 ¡Lote de Traspaso ${displayId} ingresado a bodega! Stock de destino cargado éxitosamente para ${tr.items.length} insumos.`,
    );
  };

  const handleCancelTransfer = async (id: string) => {
    if (confirm('¿Deseas cancelar y anular este traspaso de inventario?')) {
      const updated = stockTransfers.map((t) => (t.id === id ? { ...t, status: 'cancelled' as const } : t));
      setStockTransfers(updated);
      const updatedTransfer = updated.find((t) => t.id === id);
      if (updatedTransfer) {
        await syncSaveStockTransfer(updatedTransfer, updated);
      }
      playSound('error');
    }
  };

  return (
    <div className="space-y-4 animate-fadeIn text-left font-sans">
      <div className="bg-white border-2 border-gray-200 border-b-[6px] rounded-3xl p-5 space-y-4 font-sans">
        <h4 className="text-xs font-black uppercase text-gray-400 border-b pb-2">
          Historial de Embarques y Traslados de Inventario ({stockTransfers.length})
        </h4>

        {stockTransfers.length === 0 ? (
          <p className="text-center py-10 text-xs text-gray-400 font-bold">
            📂 No se han registrado movimientos de traspaso entre locales.
          </p>
        ) : (
          <div className="divide-y divide-gray-100 font-sans text-xs">
            {stockTransfers.map((tr) => {
              const isPending = tr.status === 'pending';
              const isShipped = tr.status === 'shipped';
              const isReceived = tr.status === 'received';
              const isCancelled = tr.status === 'cancelled';

              // Destined to current branch?
              const isDestinedToActiveBranch = tr.toBranchId === activeBranchId;

              return (
                <div
                  key={tr.id}
                  className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 first:pt-0 font-sans"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 font-sans">
                      <span className="font-mono text-xs font-black text-indigo-650 font-bold">
                        {tr.id.startsWith('TR-') ? tr.id : `TR-${tr.id.slice(0, 8).toUpperCase()}`}
                      </span>
                      <span
                        className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${
                          isReceived
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : isShipped
                              ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                              : isCancelled
                                ? 'bg-red-50 text-red-500 border-red-200'
                                : 'bg-gray-105 text-gray-600 border-gray-250'
                        }`}
                      >
                        {isReceived
                          ? 'Ingresado ✅'
                          : isShipped
                            ? 'En Tránsito 🚐'
                            : isCancelled
                              ? 'Cancelado ❌'
                              : 'Borrador 📝'}
                      </span>

                      <span className="text-[10px] text-gray-400 font-bold">
                        Creado: {new Date(tr.createdAt).toISOString().split('T')[1].slice(0, 5)} hrs UTC
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1 text-gray-800 pt-1 font-extrabold text-sm font-sans">
                      <span>{tr.fromBranchName}</span>
                      <ChevronRight size={14} className="text-gray-400" />
                      <span className="text-[#1cb0f6]">{tr.toBranchName}</span>
                    </div>

                    {tr.notes && <p className="text-[10px] text-gray-400 italic leading-tight">Nota: {tr.notes}</p>}

                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {tr.items.map((it, i) => (
                        <span
                          key={i}
                          className="bg-slate-100 text-slate-700 text-[10px] py-1 px-2 border rounded-lg font-bold"
                        >
                          {it.emoji} {it.name}{' '}
                          <strong className="text-gray-700 font-extrabold">x{it.quantity} un</strong>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* CTA Buttons based on state */}
                  <div className="flex flex-wrap gap-1.5 shrink-0 font-sans">
                    {isPending && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleCancelTransfer(tr.id)}
                          className="bg-white border border-gray-205 rounded-lg text-red-500 font-bold px-3 py-1.5 cursor-pointer text-[11px]"
                        >
                          Anular
                        </button>
                        <button
                          type="button"
                          onClick={() => handleShipTransfer(tr.id)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-3.5 py-1.5 rounded-lg text-[11px] cursor-pointer"
                        >
                          Embarcar Lote 🚐
                        </button>
                      </>
                    )}

                    {isShipped && isDestinedToActiveBranch && (
                      <button
                        type="button"
                        onClick={() => handleReceiveTransfer(tr.id)}
                        className="bg-[#58cc02] hover:bg-[#61e002] text-white font-black px-4 py-2 rounded-xl text-[11px] cursor-pointer"
                      >
                        Dar Entrada a Bodega 📁
                      </button>
                    )}

                    {isShipped && !isDestinedToActiveBranch && (
                      <span className="text-[10px] text-gray-400 font-black uppercase italic bg-slate-50 border border-slate-150 p-2 rounded-xl block">
                        En camino a: {tr.toBranchName.replace(/🦉|🏪|🏢|🦁/g, '')}
                      </span>
                    )}

                    {isReceived && (
                      <div className="flex items-center gap-1 text-green-600 font-black uppercase text-[10px] bg-green-50 px-3 py-1.5 rounded-lg border border-green-200">
                        <CheckCircle2 size={12} /> Completado
                      </div>
                    )}

                    {isCancelled && (
                      <span className="text-gray-450 font-black uppercase text-[10px] bg-gray-50 border p-2 rounded-lg">
                        Anulado
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
