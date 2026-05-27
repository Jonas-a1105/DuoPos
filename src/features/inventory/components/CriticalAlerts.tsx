import React, { useState, useMemo } from 'react';
import { Product } from '../../../types';
import { playSound } from '../../../services/sounds';

interface CriticalAlertsProps {
  products: Product[];
  onUpdateProduct: (prod: Product) => void;
  onGrantXp?: (xp: number) => void;
}

export default function CriticalAlerts({
  products,
  onUpdateProduct,
  onGrantXp
}: CriticalAlertsProps) {
  // Supply Logs persistence (for quick reorders)
  const [restockLog, setRestockLog] = useState<any[]>(() => {
    return JSON.parse(localStorage.getItem('duo_pos_restock_log') || '[]');
  });
  const [defaultIdealStock, setDefaultIdealStock] = useState(25);

  const criticalProducts = useMemo(() => {
    return products.filter(p => p.stock <= (p.minStock !== undefined ? p.minStock : 5));
  }, [products]);

  const totalQtyGap = useMemo(() => {
    return criticalProducts.reduce((sum, p) => sum + Math.max(0, defaultIdealStock - p.stock), 0);
  }, [criticalProducts, defaultIdealStock]);

  const totalEstimatedInvestment = useMemo(() => {
    return criticalProducts.reduce((sum, p) => sum + (Math.max(0, defaultIdealStock - p.stock) * p.cost), 0);
  }, [criticalProducts, defaultIdealStock]);

  return (
    <div className="space-y-4 animate-fadeIn text-left">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border-2 border-gray-250 border-b-[6px] rounded-3xl p-4 flex items-center gap-3">
          <span className="text-3xl bg-red-100 border border-red-250 p-2 rounded-2xl">🚨</span>
          <div>
            <span className="text-2xl font-black text-red-500 block leading-none">{criticalProducts.length}</span>
            <span className="text-[10px] font-black uppercase text-gray-400 tracking-wide mt-1 block">Insumos Deficitarios</span>
          </div>
        </div>

        <div className="bg-white border-2 border-gray-250 border-b-[6px] rounded-3xl p-4 flex items-center gap-3">
          <span className="text-3xl bg-yellow-100 border border-yellow-200 p-2 rounded-2xl">📦</span>
          <div>
            <span className="text-2xl font-black text-amber-600 block leading-none">
              {totalQtyGap} un
            </span>
            <span className="text-[10px] font-black uppercase text-gray-400 tracking-wide mt-1 block">Brecha a Stock Ideal</span>
          </div>
        </div>

        <div className="bg-white border-2 border-gray-250 border-b-[6px] rounded-3xl p-4 flex items-center gap-3">
          <span className="text-3xl bg-blue-100 border border-blue-200 p-2 rounded-2xl">💵</span>
          <div>
            <span className="text-2xl font-black text-blue-505 block leading-none">
              ${totalEstimatedInvestment.toFixed(2)}
            </span>
            <span className="text-[10px] font-black uppercase text-gray-400 tracking-wide mt-1 block">Inversión Estimada</span>
          </div>
        </div>
      </div>

      <div className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-5 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="space-y-0.5 text-left flex-1">
          <span className="text-[9px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded font-black uppercase">Fórmula de Reorden Automática</span>
          <h4 className="text-lg font-black text-amber-950">Disparo de Lote Express Duo L1</h4>
          <p className="text-xs text-amber-800 font-bold max-w-lg leading-relaxed">
            Reabastece de golpe todas las existencias críticas hasta el tope ideal de <strong className="text-amber-950">{defaultIdealStock} unidades</strong> por producto. Otorga +50 XP.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="flex flex-col items-center bg-white p-2 border border-amber-200 rounded-2xl font-bold">
            <span className="text-[9px] uppercase text-gray-450">Meta Ideal</span>
            <div className="flex items-center gap-1 mt-0.5">
              <button 
                type="button"
                onClick={() => { playSound('click'); setDefaultIdealStock(p => Math.max(10, p - 5)); }} 
                className="w-6 h-6 bg-slate-100 hover:bg-slate-200 rounded text-center font-black text-xs cursor-pointer select-none"
              >
                -
              </button>
              <span className="text-xs w-6 text-center text-gray-800 font-mono select-none">{defaultIdealStock}</span>
              <button 
                type="button"
                onClick={() => { playSound('click'); setDefaultIdealStock(p => Math.min(100, p + 5)); }} 
                className="w-6 h-6 bg-slate-100 hover:bg-slate-200 rounded text-center font-black text-xs cursor-pointer select-none"
              >
                +
              </button>
            </div>
          </div>

          {criticalProducts.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                const totalQty = criticalProducts.reduce((sum, p) => sum + Math.max(0, defaultIdealStock - p.stock), 0);
                const totalCost = criticalProducts.reduce((sum, p) => sum + (Math.max(0, defaultIdealStock - p.stock) * p.cost), 0);
                
                criticalProducts.forEach(p => {
                  onUpdateProduct({ ...p, stock: defaultIdealStock });
                });

                const newLog = {
                  id: Date.now(),
                  timestamp: new Date().toISOString(),
                  type: 'batch',
                  itemsCount: criticalProducts.length,
                  totalCost,
                  totalQty
                };
                const logs = [newLog, ...restockLog];
                setRestockLog(logs);
                localStorage.setItem('duo_pos_restock_log', JSON.stringify(logs));

                if (onGrantXp) onGrantXp(50);
                playSound('success');
                alert(`🚚 Lote L1 Surtido: Se cargaron ${totalQty} un. para ${criticalProducts.length} productos. Costo: $${totalCost.toFixed(2)}. (+50 XP Logística)`);
              }}
              className="bg-[#ff9600] text-white border-b-4 border-[#df7e00] hover:bg-[#ffa726] active:border-b-0 active:translate-y-1 font-black px-4 py-3 rounded-2xl text-xs uppercase cursor-pointer select-none"
            >
              Surtir Todo L1 🚚
            </button>
          ) : (
            <span className="text-xs font-black text-green-600 bg-green-55 border border-green-200 px-4 py-3 rounded-2xl select-none">BODEGA CRÍTICA AL 100% ✅</span>
          )}
        </div>
      </div>

      {/* List of critical items */}
      <div className="bg-white border-2 border-gray-205 border-b-[6px] rounded-3xl p-5 space-y-4">
        <h4 className="text-xs font-black uppercase text-gray-400 border-b pb-2">Artículos Bajo el Mínimo Autorizado ({criticalProducts.length})</h4>
        {criticalProducts.length === 0 ? (
          <p className="text-center py-6 text-xs text-gray-400 font-bold">🎉 Todos los productos cumplen el margen mínimo de reserva.</p>
        ) : (
          <div className="divide-y divide-gray-100 text-xs">
            {criticalProducts.map(p => {
              const req = Math.max(0, defaultIdealStock - p.stock);
              return (
                <div key={p.id} className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 first:pt-0">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl select-none">{p.emoji || '📦'}</span>
                    <div>
                      <p className="font-extrabold text-gray-850 text-sm">{p.name}</p>
                      <p className="text-gray-450 text-[10px] font-bold">Stock actual: <strong className="text-red-500">{p.stock} un</strong> / Ideal: {defaultIdealStock}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateProduct({ ...p, stock: p.stock + 10 });
                        const log = { id: Date.now(), timestamp: new Date().toISOString(), type: 'single', productName: p.name, emoji: p.emoji, qty: 10, cost: p.cost * 10 };
                        const logs = [log, ...restockLog];
                        setRestockLog(logs);
                        localStorage.setItem('duo_pos_restock_log', JSON.stringify(logs));
                        if (onGrantXp) onGrantXp(15);
                        playSound('kaching');
                      }}
                      className="bg-white border border-gray-200 text-gray-700 px-3 py-1.5 rounded-xl font-bold hover:bg-gray-50 cursor-pointer select-none"
                    >
                      +10 stock
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onUpdateProduct({ ...p, stock: defaultIdealStock });
                        const log = { id: Date.now(), timestamp: new Date().toISOString(), type: 'single', productName: p.name, emoji: p.emoji, qty: req, cost: p.cost * req };
                        const logs = [log, ...restockLog];
                        setRestockLog(logs);
                        localStorage.setItem('duo_pos_restock_log', JSON.stringify(logs));
                        if (onGrantXp) onGrantXp(20);
                        playSound('success');
                      }}
                      className="bg-[#58cc02] text-white px-3 py-1.5 rounded-xl font-black hover:bg-[#61e002] cursor-pointer select-none"
                    >
                      Surtir Ideal (+{req})
                    </button>
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
