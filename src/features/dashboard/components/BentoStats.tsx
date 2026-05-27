import React from 'react';
import { Transaction, Product } from '../../../types';
import { DollarSign, TrendingUp, ShoppingBag, Package } from 'lucide-react';

interface BentoStatsProps {
  transactions: Transaction[];
  products: Product[];
}

export default function BentoStats({ transactions, products }: BentoStatsProps) {
  // Calculations
  const totalSalesAllTime = transactions.reduce((acc, curr) => acc + curr.total, 0);
  
  let totalCostAllTime = 0;
  transactions.forEach(t => {
    t.items.forEach(item => {
      const prodCost = products.find(p => p.id === item.productId)?.cost || (item.price * 0.4);
      totalCostAllTime += prodCost * item.quantity;
    });
  });
  const totalProfitAllTime = Math.max(0, totalSalesAllTime - totalCostAllTime);

  const averageCartValue = transactions.length > 0 ? (totalSalesAllTime / transactions.length) : 0;
  const lowStockCount = products.filter(p => p.stock <= 5).length;

  return (
    <div className="space-y-6 md:space-y-8 animate-fadeIn text-left">
      <h3 className="text-2xl font-black text-gray-800 tracking-tight">Estadísticas de la Tienda</h3>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        
        {/* Sales Box */}
        <div className="bg-white border-2 border-[#e5e5e5] border-b-[6px] rounded-3xl p-5 hover:translate-y-[-2px] transition-transform flex flex-col justify-between h-36">
          <div className="flex justify-between items-center">
            <span className="text-xs font-black uppercase tracking-wide text-gray-400">Total Vendido</span>
            <div className="bg-green-100 p-1.5 rounded-xl text-[#58cc02]">
              <DollarSign size={16} />
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-2xl md:text-3xl font-black text-gray-800 tracking-tight block">
              ${totalSalesAllTime.toFixed(2)}
            </span>
            <p className="text-[10px] text-gray-400 font-extrabold uppercase">
              Todas las ventas registradas
            </p>
          </div>
        </div>

        {/* Profit Box */}
        <div className="bg-white border-2 border-[#e5e5e5] border-b-[6px] rounded-3xl p-5 hover:translate-y-[-2px] transition-transform flex flex-col justify-between h-36">
          <div className="flex justify-between items-center">
            <span className="text-xs font-black uppercase tracking-wide text-gray-400">Ganancia Neta</span>
            <div className="bg-blue-105 p-1.5 rounded-xl text-blue-500 bg-blue-105">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-2xl md:text-3xl font-black text-blue-500 tracking-tight block">
              ${totalProfitAllTime.toFixed(2)}
            </span>
            <p className="text-[10px] text-gray-400 font-extrabold uppercase leading-none">
              Descontando costes de fábrica
            </p>
          </div>
        </div>

        {/* Average cart */}
        <div className="bg-white border-2 border-[#e5e5e5] border-b-[6px] rounded-3xl p-5 hover:translate-y-[-2px] transition-transform flex flex-col justify-between h-36">
          <div className="flex justify-between items-center">
            <span className="text-xs font-black uppercase tracking-wide text-gray-400">Ticket Promedio</span>
            <div className="bg-yellow-100 p-1.5 rounded-xl text-yellow-500">
              <ShoppingBag size={16} />
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-2xl md:text-3xl font-black text-gray-800 tracking-tight block">
              ${averageCartValue.toFixed(2)}
            </span>
            <p className="text-[10px] text-gray-400 font-extrabold uppercase">
              Por cada cliente cobrado
            </p>
          </div>
        </div>

        {/* Inventory Warning Card */}
        <div className="bg-white border-2 border-[#e5e5e5] border-b-[6px] rounded-3xl p-5 hover:translate-y-[-2px] transition-transform flex flex-col justify-between h-36">
          <div className="flex justify-between items-center">
            <span className="text-xs font-black uppercase tracking-wide text-gray-400">Inventario</span>
            <div className="bg-red-100 p-1.5 rounded-xl text-red-500">
              <Package size={16} />
            </div>
          </div>
          <div className="space-y-1 flex-col">
            <span className="text-2xl md:text-3xl font-black text-gray-805 tracking-tight block flex items-baseline gap-1">
              {products.length} <span className="text-sm text-gray-400 font-extrabold">items</span>
            </span>
            <p className="text-[10px] text-gray-400 font-extrabold uppercase">
              {lowStockCount > 0 
                ? `🚨 ¡Hay ${lowStockCount} artículos con poco stock!` 
                : '✅ Niveles de almacén saludables'
              }
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
