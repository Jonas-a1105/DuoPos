import React, { useMemo, useState } from 'react';
import { Transaction, Product, User } from '../../../types';
import AeroMascot from '../../../components/Mascot/AeroMascot';

interface AdvancedAnalyticsTabProps {
  transactions: Transaction[];
  products: Product[];
  user: User;
}

export default function AdvancedAnalyticsTab({
  transactions,
  products,
  user
}: AdvancedAnalyticsTabProps) {
  const [monthlyTargetProfit, setMonthlyTargetProfit] = useState(1500);

  // Tax calculations
  const taxConfig = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('duo_pos_tax_settings') || '{"taxName": "IVA", "taxRate": 16, "isTaxIncluded": true}');
    } catch {
      return { taxName: 'IVA', taxRate: 16, isTaxIncluded: true };
    }
  }, []);

  // Compute tax liabilities & contributions
  const advancedMetrics = useMemo(() => {
    let grossAllTime = 0;
    let netAllTime = 0;
    let taxAllTime = 0;
    let totalItemsCount = 0;
    
    // Category sales mapping
    const categorySales: Record<string, number> = {};
    const categoryQty: Record<string, number> = {};
    
    // Product contribution
    const productStats: Record<string, { id: string; name: string; emoji: string; qty: number; revenue: number; profit: number }> = {};

    transactions.forEach(t => {
      const totalAmt = t.total;
      grossAllTime += totalAmt;
      
      const rateNum = Number(taxConfig.taxRate) || 0;
      if (taxConfig.isTaxIncluded) {
        const netAmt = totalAmt / (1 + (rateNum / 100));
        netAllTime += netAmt;
        taxAllTime += (totalAmt - netAmt);
      } else {
        netAllTime += totalAmt;
        const taxAmt = totalAmt * (rateNum / 100);
        taxAllTime += taxAmt;
        grossAllTime += taxAmt;
      }

      t.items.forEach(item => {
        totalItemsCount += item.quantity;
        
        // Find product
        const prod = products.find(p => p.id === item.productId);
        const catName = prod ? prod.category : 'Otros';
        const costVal = prod ? prod.cost : (item.price * 0.4);
        const profitVal = (item.price - costVal) * item.quantity;
        
        categorySales[catName] = (categorySales[catName] || 0) + (item.price * item.quantity);
        categoryQty[catName] = (categoryQty[catName] || 0) + item.quantity;

        const prodId = item.productId || 'deleted';
        if (!productStats[prodId]) {
          productStats[prodId] = {
            id: prodId,
            name: item.name,
            emoji: prod?.emoji || '📦',
            qty: 0,
            revenue: 0,
            profit: 0
          };
        }
        productStats[prodId].qty += item.quantity;
        productStats[prodId].revenue += item.price * item.quantity;
        productStats[prodId].profit += profitVal;
      });
    });

    const productsLeaderboard = Object.values(productStats).sort((a, b) => b.revenue - a.revenue);

    return {
      grossAllTime,
      netAllTime,
      taxAllTime,
      totalItemsCount,
      categorySales,
      categoryQty,
      productsLeaderboard
    };
  }, [transactions, products, taxConfig]);

  // Overall financial calculations
  const totalSalesAllTime = transactions.reduce((acc, curr) => acc + curr.total, 0);
  
  let totalCostAllTime = 0;
  transactions.forEach(t => {
    t.items.forEach(item => {
      const prodCost = products.find(p => p.id === item.productId)?.cost || (item.price * 0.4);
      totalCostAllTime += prodCost * item.quantity;
    });
  });
  const totalProfitAllTime = Math.max(0, totalSalesAllTime - totalCostAllTime);

  const doubleChartData = useMemo(() => {
    const data = [];
    for (let i = 4; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const daysTx = transactions.filter(t => t.date.startsWith(dateStr));
      const revenue = daysTx.reduce((sum, t) => sum + t.total, 0);
      
      let costValue = 0;
      daysTx.forEach(t => {
        t.items.forEach(item => {
          const prodCost = products.find(p => p.id === item.productId)?.cost || (item.price * 0.4);
          costValue += prodCost * item.quantity;
        });
      });

      const dayName = d.toLocaleDateString('es-ES', { weekday: 'short' });
      data.push({
        label: dayName.charAt(0).toUpperCase() + dayName.slice(1),
        revenue,
        cost: costValue
      });
    }
    return data;
  }, [transactions, products]);

  const maxVal = Math.max(...doubleChartData.map(c => Math.max(c.revenue, c.cost)), 50);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Detailed compliance indexes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
        
        {/* Net revenue vs tax liability */}
        <div className="bg-white border-2 border-[#e5e5e5] border-b-[6px] rounded-3xl p-5 flex flex-col justify-between min-h-36">
          <div className="flex justify-between items-center text-xs font-black text-gray-400 uppercase tracking-wide">
            <span>Ventas Netas (Base Imponible)</span>
            <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md text-[9px] font-black uppercase border border-blue-200">
              Libre Impuestos
            </span>
          </div>
          <div className="mt-2 text-2xl font-black text-blue-600 tracking-tight font-mono">
            ${advancedMetrics.netAllTime.toFixed(2)}
          </div>
          <p className="text-[10px] text-gray-450 font-bold mt-1 uppercase leading-snug">
            Base acumulada reportable ({taxConfig.isTaxIncluded ? 'Con IVA Incluido' : 'IVA Adicional'})
          </p>
        </div>

        {/* IVA Collected */}
        <div className="bg-white border-2 border-[#e5e5e5] border-b-[6px] rounded-3xl p-5 flex flex-col justify-between min-h-36">
          <div className="flex justify-between items-center text-xs font-black text-gray-400 uppercase tracking-wide">
            <span>Total {taxConfig.taxName} ({taxConfig.taxRate}%) Recaudado</span>
            <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md text-[9px] font-black uppercase border border-amber-200">
              Fisco / SAT
            </span>
          </div>
          <div className="mt-2 text-2xl font-black text-amber-500 tracking-tight font-mono">
            ${advancedMetrics.taxAllTime.toFixed(2)}
          </div>
          <p className="text-[10px] text-gray-455 font-bold mt-1 uppercase">
            Débito fiscal por liquidar
          </p>
        </div>

        {/* Overall profit margins ratio */}
        <div className="bg-white border-2 border-[#e5e5e5] border-b-[6px] rounded-3xl p-5 flex flex-col justify-between min-h-36 font-sans">
          <div className="flex justify-between items-center text-xs font-black text-gray-400 uppercase tracking-wide">
            <span>Margen Neto (ROI)</span>
            <span className="bg-[#e5f6ff] text-[#1cb0f6] px-2 py-0.5 rounded-md text-[9px] font-black uppercase border border-[#1cb0f6]/20">
              Tasa Margen
            </span>
          </div>
          <div className="mt-2 text-2xl font-black text-[#58cc02] tracking-tight font-mono">
            {((totalProfitAllTime / Math.max(totalSalesAllTime, 1)) * 100).toFixed(1)}%
          </div>
          <p className="text-[10px] text-gray-455 font-bold mt-1 uppercase">
            Retorno de inversión promedio
          </p>
        </div>

      </div>

      {/* SVG Double-Bar Chart */}
      <div className="bg-white border-2 border-[#e5e5e5] border-b-[6px] rounded-3xl p-5 md:p-6 space-y-4 text-left">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h4 className="text-base font-black text-gray-850 uppercase">
              📊 Margen de Operaciones: Ventas vs Costos de Fábrica
            </h4>
            <p className="text-xs text-gray-400 font-bold">Historial comparativo de los últimos 5 días comerciales</p>
          </div>
          <div className="flex gap-4 text-[10px] font-black uppercase text-gray-500">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[#58cc02]" /> Ventas</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-blue-400" /> Costos</span>
          </div>
        </div>

        {/* SVG implementation */}
        <div className="w-full h-48 bg-gray-50 border border-gray-100 rounded-2xl p-4 flex flex-col justify-end">
          <div className="flex-1 w-full flex items-end justify-around relative px-2">
            
            {/* Grid labels */}
            <div className="absolute left-0 right-0 top-1/4 border-t border-dashed border-gray-200 w-full h-0 text-[8px] text-gray-300 font-bold pl-1">
              ${(maxVal * 0.75).toFixed(0)}
            </div>
            <div className="absolute left-0 right-0 top-2/4 border-t border-dashed border-gray-200 w-full h-0 text-[8px] text-gray-300 font-bold pl-1">
              ${(maxVal * 0.5).toFixed(0)}
            </div>
            <div className="absolute left-0 right-0 top-3/4 border-t border-dashed border-gray-200 w-full h-0 text-[8px] text-gray-300 font-bold pl-1">
              ${(maxVal * 0.25).toFixed(0)}
            </div>

            {doubleChartData.map((day, idx) => {
              const revPct = Math.max((day.revenue / maxVal) * 100, 4);
              const costPct = Math.max((day.cost / maxVal) * 100, 4);

              return (
                <div key={idx} className="flex flex-col items-center flex-1 mx-1.5 group relative z-10">
                  
                  {/* Floating tooltip */}
                  <div className="absolute bg-[#252525] text-white text-[10px] font-black p-2 rounded-xl -top-12 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-md pointer-events-none z-20 border">
                    Vendido: ${day.revenue.toFixed(2)} | Costo: ${day.cost.toFixed(2)}
                  </div>

                  <div className="flex items-end gap-1">
                    {/* Revenue Bar */}
                    <div 
                      className="w-4 sm:w-6 bg-[#58cc02] border-b-2 border-[#439b02] rounded-t-sm animate-fadeIn"
                      style={{ height: `${revPct}%` }}
                    />
                    {/* Cost Bar */}
                    <div 
                      className="w-4 sm:w-6 bg-blue-400 border-b-2 border-blue-600 rounded-t-sm animate-fadeIn"
                      style={{ height: `${costPct}%` }}
                    />
                  </div>

                  <span className="text-xs font-black text-gray-400 mt-2">{day.label}</span>
                </div>
              );
            })}

          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
        
        {/* Category Contributions */}
        <div className="bg-white border-2 border-[#e5e5e5] border-b-[6px] rounded-3xl p-5 md:p-6 space-y-4 lg:col-span-1">
          <h4 className="text-base font-black text-gray-800 uppercase flex items-center gap-1">
            🍕 Aporte por Categoría
          </h4>
          <p className="text-xs text-gray-400 font-bold">Cuota de facturación acumulada</p>

          <div className="space-y-4 pt-1">
            {(() => {
              const categoriesList = Object.keys(advancedMetrics.categorySales);
              const totalSum = Object.values(advancedMetrics.categorySales).reduce((a, b) => Number(a) + Number(b), 0) as number || 1;

              if (categoriesList.length === 0) {
                return <p className="text-xs text-gray-400 font-bold py-6 text-center">No hay datos registrados aún.</p>;
              }

              return categoriesList.map(cat => {
                const val = Number(advancedMetrics.categorySales[cat]) || 0;
                const pct = Math.round((val / totalSum) * 100);
                const qty = advancedMetrics.categoryQty[cat] || 0;

                return (
                  <div key={cat} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-black">
                      <span className="text-gray-700">{cat} ({qty} u)</span>
                      <span className="text-gray-500">${val.toFixed(2)} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-gray-150 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-[#1cb0f6] h-full rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>

        {/* Products ranking table */}
        <div className="bg-white border-2 border-[#e5e5e5] border-b-[6px] rounded-3xl p-5 md:p-6 space-y-4 lg:col-span-2">
          <h4 className="text-base font-black text-gray-850 uppercase">
            🏆 Bestsellers (Líderes de Movimiento de Caja)
          </h4>
          
          {advancedMetrics.productsLeaderboard.length === 0 ? (
            <p className="text-xs text-gray-400 font-bold py-10 text-center">
              Vende artículos para alimentar el leaderboard de racha comercial.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left font-bold text-gray-600">
                <thead>
                  <tr className="border-b uppercase text-[10px] text-gray-400 font-extrabold pb-2">
                    <th className="pb-2">Artículo</th>
                    <th className="pb-2">Vendidos</th>
                    <th className="pb-2">Ingresos</th>
                    <th className="pb-2 text-right">Ganancia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-sans">
                  {advancedMetrics.productsLeaderboard.slice(0, 5).map((p, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="py-2.5 flex items-center gap-1.5 text-gray-800">
                        <span>{p.emoji}</span>
                        <span className="truncate max-w-[120px]">{p.name}</span>
                      </td>
                      <td className="py-2.5 text-gray-650">{p.qty} un</td>
                      <td className="py-2.5 text-gray-800 font-mono">${p.revenue.toFixed(2)}</td>
                      <td className="py-2.5 text-[#58cc02] text-right font-black font-mono">
                        +${p.profit.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* Goals and solver planner */}
      <div className="bg-amber-50 border-2 border-amber-250 border-b-[6px] rounded-3xl p-5 md:p-6 shadow-xs text-left">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1.5 flex-1">
            <span className="text-amber-800 font-black uppercase text-[10px] tracking-wider block">
              🎯 Proyecciones Comerciales e Inteligencia Financiera
            </span>
            <h3 className="text-lg font-black text-amber-955">Planificador Mensual Solver de Negocios</h3>
            <p className="text-xs text-amber-900 leading-relaxed max-w-xl">
              Averigua cuántas transacciones generales necesitas concretar para alcanzar una meta mensual de ingresos limpios de fábrica según los tickets promedio ponderados.
            </p>
          </div>

          {/* Input Meta de Retorno */}
          <div className="bg-white border-2 border-amber-200 rounded-2xl p-3 shadow-xs shrink-0 w-full sm:w-auto">
            <span className="text-[9px] font-black uppercase text-amber-800 tracking-wider">Meta Ganancia Limpia</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-base font-black text-amber-950">$</span>
              <input
                type="number"
                step="50"
                value={monthlyTargetProfit}
                onChange={(e) => setMonthlyTargetProfit(Math.max(100, Number(e.target.value)))}
                className="w-24 text-base font-black text-amber-950 bg-amber-50 rounded-lg px-2 py-1 border outline-none text-center border-amber-200 font-mono"
              />
              <span className="text-xs text-gray-400">/ mes</span>
            </div>
          </div>
        </div>

        {/* Calculations and characters suggestions box */}
        <div className="mt-4 pt-4 border-t border-amber-200 flex flex-col sm:flex-row items-center gap-4 text-xs text-amber-900">
          <div className="flex-shrink-0"><AeroMascot size={40} activeAccessory={user.activeAccessory} mood="neutral" level={user.level} animate={false} /></div>
          <p className="font-extrabold flex-1 text-center sm:text-left leading-relaxed">
            {(() => {
              const averageProfitPerItem = advancedMetrics.totalItemsCount > 0 
                ? (totalProfitAllTime / advancedMetrics.totalItemsCount)
                : 1.50;
              
              const unitsNeeded = Math.ceil(monthlyTargetProfit / Math.max(averageProfitPerItem, 0.5));
              const averageCartItems = transactions.length > 0 
                ? (advancedMetrics.totalItemsCount / transactions.length) 
                : 2.1;
              
              const salesNeeded = Math.ceil(unitsNeeded / Math.max(averageCartItems, 1));

              return (
                <span>
                  Aero dice: "Para generar <strong className="text-amber-950 font-black">${monthlyTargetProfit} USD</strong> de ganancia pura, estimamos que debes despachar <strong className="text-amber-950 font-black">{unitsNeeded} unidades de mercadería</strong>. Esto equivale a <strong className="text-amber-950 font-black">{salesNeeded} clientes atendidos</strong> en tu mostrador (suponiendo carros promedio de {averageCartItems.toFixed(1)} items). ¡A entrenar esa racha de ventas!"
                </span>
              );
            })()}
          </p>
        </div>
      </div>
    </div>
  );
}
