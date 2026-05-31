import React from 'react';
import { Trash2, Plus, Minus } from 'lucide-react';
import { CartItem } from '../../../types';
import { playSound } from '../../../services/audio/soundService';

interface BasketItemRowProps {
  item: CartItem;
  onAdd: (product: CartItem['product']) => void;
  onRemove: (productId: string) => void;
  onRemoveAll: (productId: string) => void;
  onEdit?: (item: CartItem) => void;
  exchangeRate?: number;
}

export function BasketItemRow({
  item,
  onAdd,
  onRemove,
  onRemoveAll,
  onEdit,
  exchangeRate = 1,
}: BasketItemRowProps) {
  const addonsTotal = item.addons ? item.addons.reduce((sum, a) => sum + a.price, 0) : 0;
  const unitPrice = item.customPrice ?? item.product.price;
  const lineTotal = (unitPrice + addonsTotal) * item.quantity;
  const vePrice = unitPrice * exchangeRate;

  return (
    <div className="flex justify-between items-center text-xs font-bold text-gray-700 py-2 border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="text-2xl select-none flex-shrink-0">{item.product.emoji}</span>
        <div className="min-w-0 text-left">
          <p className="font-extrabold text-[#3c3c3c] truncate text-xs">{item.product.name}</p>
          <p className="text-[10px] text-[#58cc02] font-black">
            ${unitPrice.toFixed(2)}
            <span className="text-gray-400 ml-1">
              {(vePrice).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.
            </span>
          </p>
          {item.notes && <p className="text-[9px] text-gray-400 italic">📝 {item.notes}</p>}
          {item.addons && item.addons.length > 0 && (
            <div className="flex gap-1 mt-0.5">
              {item.addons.map((add, i) => (
                <span key={i} className="text-[8px] bg-[#f2ffd4] font-black px-1 rounded border border-[#ccd9ad]">
                  +{add.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        <div className="flex items-center border border-gray-200 rounded-lg bg-gray-50 p-0.5">
          <button onClick={() => onRemove(item.product.id)} className="p-1 hover:bg-gray-200 rounded text-gray-500 cursor-pointer">
            <Minus size={11} strokeWidth={3} />
          </button>
          <span className="px-2 font-black text-gray-800 font-mono">{item.quantity}</span>
          <button
            disabled={item.quantity >= item.product.stock}
            onClick={() => onAdd(item.product)}
            className="p-1 hover:bg-gray-200 rounded text-gray-500 disabled:opacity-40 cursor-pointer"
          >
            <Plus size={11} strokeWidth={3} />
          </button>
        </div>

        <span className="font-black text-gray-800 w-16 text-right font-mono">${lineTotal.toFixed(2)}</span>

        {onEdit && (
          <button onClick={() => onEdit(item)} className="p-1 text-gray-400 hover:text-orange-500 cursor-pointer">
            ⚙️
          </button>
        )}

        <button onClick={() => onRemoveAll(item.product.id)} className="p-1 text-gray-300 hover:text-red-400 cursor-pointer">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}
