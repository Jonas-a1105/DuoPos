import React, { useState, useMemo } from 'react';
import { Product, Supplier, PurchaseOrder, PurchaseOrderItem } from '../../../types';
import { playSound } from '../../../services/sounds';
import { PlusCircle, X, Check } from 'lucide-react';

interface PurchaseOrderWizardProps {
  purchaseOrders: PurchaseOrder[];
  products: Product[];
  suppliers: Supplier[];
  onSavePurchaseOrder: (po: PurchaseOrder) => void;
  onTransitPurchaseOrder: (id: string, carrier: string, estimatedDelivery: string) => void;
  onReceivePurchaseOrder: (id: string) => void;
  onCancelPurchaseOrder: (id: string) => void;
  onGrantXp?: (xp: number) => void;
}

export default function PurchaseOrderWizard({
  purchaseOrders,
  products,
  suppliers,
  onSavePurchaseOrder,
  onTransitPurchaseOrder,
  onReceivePurchaseOrder,
  onCancelPurchaseOrder,
  onGrantXp,
}: PurchaseOrderWizardProps) {
  // PO Compiler Form States
  const [isOrderFormOpen, setIsOrderFormOpen] = useState(false);
  const [orderSupplierId, setOrderSupplierId] = useState('');
  const [orderPaymentMethod, setOrderPaymentMethod] = useState<'cash' | 'credit'>('cash');
  const [orderCarrier, setOrderCarrier] = useState('DuoExpress Air 🦉');
  const [orderNotes, setOrderNotes] = useState('');
  const [orderItems, setOrderItems] = useState<
    { productId: string; name: string; emoji: string; cost: number; quantity: number }[]
  >([]);
  const [orderError, setOrderError] = useState('');
  const [orderFilterStatus, setOrderFilterStatus] = useState<
    'all' | 'draft' | 'sent' | 'transit' | 'received' | 'cancelled'
  >('all');

  // Math Calculations
  const computedSubtotal = useMemo(() => {
    return orderItems.reduce((acc, it) => acc + it.cost * it.quantity, 0);
  }, [orderItems]);

  const computedTax = useMemo(() => Number((computedSubtotal * 0.16).toFixed(2)), [computedSubtotal]);
  const computedTotal = useMemo(
    () => Number((computedSubtotal + computedTax).toFixed(2)),
    [computedSubtotal, computedTax],
  );

  const handleOpenNewOrder = () => {
    setOrderSupplierId(suppliers[0]?.id || '');
    setOrderPaymentMethod('cash');
    setOrderCarrier('DuoExpress Air 🦉');
    setOrderNotes('');
    setOrderItems([]);
    setOrderError('');
    setIsOrderFormOpen(true);
    playSound('click');
  };

  const handleAddOrderItem = () => {
    const firstProd = products[0];
    if (!firstProd) {
      alert('⚠️ No hay productos en catálogo.');
      return;
    }
    setOrderItems([
      ...orderItems,
      {
        productId: firstProd.id,
        name: firstProd.name,
        emoji: firstProd.emoji || '📦',
        cost: firstProd.cost,
        quantity: 10,
      },
    ]);
    playSound('click');
  };

  const handleUpdateOrderItem = (idx: number, fields: Partial<PurchaseOrderItem>) => {
    const updated = [...orderItems];
    updated[idx] = { ...updated[idx], ...fields } as any;

    if (fields.productId) {
      const match = products.find((p) => p.id === fields.productId);
      if (match) {
        updated[idx].name = match.name;
        updated[idx].emoji = match.emoji || '📦';
        updated[idx].cost = match.cost;
      }
    }
    setOrderItems(updated);
  };

  const handleRemoveOrderItem = (idx: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== idx));
    playSound('swoosh');
  };

  const handleSaveOrder = (status: 'draft' | 'sent') => {
    if (!orderSupplierId) {
      setOrderError('Proveedor requerido.');
      return;
    }
    if (orderItems.length === 0) {
      setOrderError('Debe agregar mínimo 1 artículo.');
      return;
    }

    for (const it of orderItems) {
      if (it.quantity <= 0) {
        setOrderError('Cantidad inválida.');
        return;
      }
      if (it.cost < 0) {
        setOrderError('Costo inválido.');
        return;
      }
    }

    const selectedSup = suppliers.find((s) => s.id === orderSupplierId);
    const newPO: PurchaseOrder = {
      id: `po-${1000 + purchaseOrders.length + 1}`,
      supplierId: orderSupplierId,
      supplierName: selectedSup ? selectedSup.name : 'Proveedor General',
      items: orderItems,
      subtotal: computedSubtotal,
      tax: computedTax,
      total: computedTotal,
      paymentMethod: orderPaymentMethod,
      status,
      createdAt: new Date().toISOString(),
      estimatedDelivery: new Date(Date.now() + (selectedSup?.deliveryDays || 2) * 24 * 3600 * 1000).toISOString(),
      carrier: orderCarrier,
    };

    onSavePurchaseOrder(newPO);
    setIsOrderFormOpen(false);

    if (status === 'sent') {
      if (onGrantXp) onGrantXp(40);
      playSound('success');
    } else {
      playSound('click');
    }
  };

  const handleTransitOrder = (id: string) => {
    const carrier = prompt('Transportista / Chofer:', 'DuoExpress Air 🦉') || 'DuoExpress Air 🦉';
    const estimatedDelivery = new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString();
    onTransitPurchaseOrder(id, carrier, estimatedDelivery);
    playSound('click');
  };

  const handleReceiveOrder = (id: string) => {
    const o = purchaseOrders.find((po) => po.id === id);
    if (!o) return;
    onReceivePurchaseOrder(id);
    if (onGrantXp) onGrantXp(85);
    playSound('levelup');
    alert(`🎉 ¡Lote recibido! Insumos de la orden PO-${o.id} agregados a bodega.`);
  };

  const handleCancelOrder = (id: string) => {
    if (confirm('¿Cancelar esta orden?')) {
      onCancelPurchaseOrder(id);
      playSound('error');
    }
  };

  return (
    <div className="space-y-4 animate-fadeIn text-left">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div className="flex flex-wrap gap-1 select-none">
          {[
            { status: 'all', label: 'Todas' },
            { status: 'draft', label: 'Borrador 📝' },
            { status: 'sent', label: 'Enviadas 🚀' },
            { status: 'transit', label: 'En Tránsito 🚚' },
            { status: 'received', label: 'Recibidas ✅' },
          ].map((s) => (
            <button
              key={s.status}
              onClick={() => {
                setOrderFilterStatus(s.status as any);
                playSound('click');
              }}
              className={`py-1.5 px-3 rounded-lg text-[10px] font-black uppercase border cursor-pointer ${
                orderFilterStatus === s.status
                  ? 'bg-blue-600 text-white border-blue-700'
                  : 'bg-white text-gray-55 border-gray-200'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <button
          onClick={handleOpenNewOrder}
          className="bg-blue-500 hover:bg-blue-600 text-white border-b-4 border-blue-700 active:border-b-0 active:translate-y-1 text-xs py-2.5 px-4 rounded-xl font-black uppercase flex items-center gap-1 cursor-pointer select-none"
        >
          <PlusCircle size={14} /> Elaborar Órden (PO)
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-left">
        {purchaseOrders
          .filter((o) => orderFilterStatus === 'all' || o.status === orderFilterStatus)
          .map((order) => {
            const isDraft = order.status === 'draft';
            const isSent = order.status === 'sent';
            const isTransit = order.status === 'transit';
            const isReceived = order.status === 'received';

            return (
              <div
                key={order.id}
                className="bg-white border-2 border-gray-250 border-b-[6px] rounded-3xl p-4.5 flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-xs font-black text-blue-650">PO Ref: {order.id}</span>
                    <span
                      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg border ${
                        isReceived
                          ? 'bg-green-50 border-green-200 text-green-700'
                          : isTransit
                            ? 'bg-orange-50 border-orange-200 text-orange-700 animate-pulse'
                            : isSent
                              ? 'bg-blue-50 border-blue-200 text-blue-700'
                              : 'bg-slate-100 text-gray-500 border-slate-250'
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>

                  <div className="text-left">
                    <h4 className="font-black text-gray-800 text-sm">{order.supplierName}</h4>
                    <div className="flex gap-2 text-[9px] text-gray-400 font-extrabold uppercase mt-0.5">
                      <span>📅 Emisión: {new Date(order.createdAt).toLocaleDateString()}</span>
                      <span>🚐 {order.carrier}</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 border rounded-xl p-2.5 max-h-32 overflow-y-auto space-y-1 text-xs">
                    {order.items.map((it, i) => (
                      <div
                        key={i}
                        className="flex justify-between items-center text-[11px] font-semibold text-gray-750"
                      >
                        <span>
                          {it.emoji} {it.name} (x{it.quantity})
                        </span>
                        <span className="font-mono">${(it.cost * it.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t space-y-3">
                  <div className="flex justify-between items-baseline text-xs font-bold font-mono">
                    <span className="text-gray-400">
                      TÉRMINOS: {order.paymentMethod === 'cash' ? '🤝 CONTADO' : '💸 CRÉDITO AP'}
                    </span>
                    <span className="text-gray-850 font-black text-sm">TOTAL: ${order.total.toFixed(2)}</span>
                  </div>

                  <div className="flex gap-1">
                    {isDraft && (
                      <>
                        <button
                          onClick={() => {
                            const updatedOrder: PurchaseOrder = { ...order, status: 'sent' };
                            onSavePurchaseOrder(updatedOrder);
                            if (onGrantXp) onGrantXp(40);
                            playSound('success');
                          }}
                          className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-black py-1.5 rounded-xl text-[10px] uppercase cursor-pointer"
                        >
                          Enviar 🚀
                        </button>
                        <button
                          onClick={() => handleCancelOrder(order.id)}
                          className="px-3 py-1.5 border hover:bg-red-50 text-red-500 font-bold rounded-xl text-[10px] uppercase cursor-pointer"
                        >
                          X
                        </button>
                      </>
                    )}

                    {isSent && (
                      <button
                        onClick={() => handleTransitOrder(order.id)}
                        className="w-full bg-[#ff9600] text-white font-black py-1.5 rounded-xl text-[10px] uppercase hover:bg-amber-500 cursor-pointer"
                      >
                        Marcar En Tránsito 🚚
                      </button>
                    )}

                    {isTransit && (
                      <button
                        onClick={() => handleReceiveOrder(order.id)}
                        className="w-full bg-[#58cc02] hover:bg-[#61e002] text-white font-black py-2 rounded-xl text-[10px] uppercase border-b-2 border-green-700 cursor-pointer animate-pulse"
                      >
                        📥 Cargar a Almacén
                      </button>
                    )}

                    {isReceived && (
                      <div className="w-full text-center py-1.5 bg-green-50 text-green-700 rounded-xl font-black text-[9px] uppercase border select-none">
                        Cargado el {order.receivedAt ? new Date(order.receivedAt).toLocaleDateString() : 'N/A'} ✅
                      </div>
                    )}

                    {order.status === 'cancelled' && (
                      <div className="w-full text-center py-1.5 bg-red-50 text-red-650 rounded-xl font-black text-[9px] uppercase border select-none">
                        Orden Cancelada ❌
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {/* ----------------- COMPILER MODAL: NEW PURCHASE ORDER ----------------- */}
      {isOrderFormOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn text-gray-800">
          <div className="bg-white border-2 border-gray-205 border-b-8 rounded-3xl max-w-2xl w-full p-5 space-y-4 relative text-left">
            <button
              onClick={() => setIsOrderFormOpen(false)}
              className="absolute right-4 top-4 p-2 text-gray-400 hover:text-gray-650 rounded-full"
            >
              <X size={20} />
            </button>

            <div className="space-y-1">
              <h3 className="text-xl font-black text-gray-805 flex items-center gap-1.5 select-none">
                🧁 Preparar Órden de Insumos DuoExpress
              </h3>
              <p className="text-xs text-gray-400 font-bold">
                Generará una solicitud de compra oficial dirigida a tu socio de suministro aliado.
              </p>
            </div>

            {orderError && (
              <div className="p-2.5 bg-red-50 text-red-650 border border-red-205 rounded-xl text-xs font-bold">
                {orderError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1 text-left">
                <label className="text-[10px] font-black uppercase text-gray-400">
                  1. Seleccionar Proveedor Alianza
                </label>
                <select
                  value={orderSupplierId}
                  onChange={(e) => setOrderSupplierId(e.target.value)}
                  className="w-full bg-slate-55 border rounded-xl p-2 text-xs font-bold text-gray-700 cursor-pointer"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.category})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1 text-left">
                <label className="text-[10px] font-black uppercase text-gray-400">2. Método de Liquidación</label>
                <select
                  value={orderPaymentMethod}
                  onChange={(e: any) => setOrderPaymentMethod(e.target.value)}
                  className="w-full bg-slate-55 border rounded-xl p-2 text-xs font-bold text-gray-700 cursor-pointer"
                >
                  <option value="cash">Contado (Efectivo inmediato de Caja)</option>
                  <option value="credit">Crédito (Cargar a Cuenta por Pagar de Racha)</option>
                </select>
              </div>

              <div className="space-y-1 text-left">
                <label className="text-[10px] font-black uppercase text-gray-400">3. Transportadora Courier</label>
                <select
                  value={orderCarrier}
                  onChange={(e) => setOrderCarrier(e.target.value)}
                  className="w-full bg-slate-55 border rounded-xl p-2 text-xs font-bold text-gray-700 cursor-pointer"
                >
                  <option value="DuoExpress Air 🦉">DuoExpress Air 🦉 (1-2 días)</option>
                  <option value="Lily-Cargo Cargo 🛒">Lily-Cargo Premium 🛒 (3 días)</option>
                  <option value="Zari-Mobile 🛵">Zari-Mobile Fast 🛵 (Urgente)</option>
                  <option value="Eddy-Speedy 🏃‍♂️">Eddy-Speedy Gym 🏃‍♂️ (Súper Express)</option>
                </select>
              </div>

              <div className="space-y-1 text-left">
                <label className="text-[10px] font-black uppercase text-gray-400">4. Comentarios Generales</label>
                <input
                  type="text"
                  placeholder="Ej: Insumos urgentes del fin de semana"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  className="w-full bg-slate-55 border rounded-xl p-2 text-xs font-bold text-gray-800"
                />
              </div>
            </div>

            {/* Item compilation rows */}
            <div className="space-y-2 border-t pt-3 text-left">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black uppercase text-gray-400">
                  Renglones de Insumos ({orderItems.length})
                </label>
                <button
                  type="button"
                  onClick={handleAddOrderItem}
                  className="text-xs text-blue-500 hover:underline font-black flex items-center gap-0.5 select-none"
                >
                  + Agregar Artículo
                </button>
              </div>

              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {orderItems.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-center bg-slate-50 border p-2 rounded-2xl text-xs">
                    <select
                      value={item.productId}
                      onChange={(e) => handleUpdateOrderItem(idx, { productId: e.target.value })}
                      className="flex-1 bg-white border p-1 rounded-lg font-bold text-gray-700 cursor-pointer text-xs"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.emoji} {p.name}
                        </option>
                      ))}
                    </select>

                    <div className="w-16">
                      <span className="text-[8px] text-gray-400 block font-bold leading-none">Costo un.</span>
                      <input
                        type="number"
                        step="0.01"
                        value={item.cost}
                        onChange={(e) => handleUpdateOrderItem(idx, { cost: Number(e.target.value) })}
                        className="w-full bg-white border p-1 rounded-lg text-xs font-mono font-bold"
                      />
                    </div>

                    <div className="w-16">
                      <span className="text-[8px] text-gray-400 block font-bold leading-none">Cantidad</span>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleUpdateOrderItem(idx, { quantity: Number(e.target.value) })}
                        className="w-full bg-white border p-1 rounded-lg text-xs font-mono font-bold"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveOrderItem(idx)}
                      className="text-red-500 hover:text-red-750 p-1 font-bold select-none cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                ))}

                {orderItems.length === 0 && (
                  <p className="text-center text-[11px] text-gray-400 py-4 italic font-bold">
                    Haz click en "+ Agregar Artículo" para construir el pedido.
                  </p>
                )}
              </div>
            </div>

            {/* Calculations summaries */}
            <div className="bg-slate-55 border p-3 rounded-2xl space-y-1 text-xs">
              <div className="flex justify-between font-bold text-gray-600">
                <span>Subtotal:</span> <span className="font-mono">${computedSubtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-600">
                <span>Impuestos Logísticos (CFDI/16%):</span>{' '}
                <span className="font-mono">${computedTax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-black text-gray-800 text-sm">
                <span>Total de Facturación:</span> <span className="font-mono">${computedTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs pt-2">
              <button
                type="button"
                onClick={() => handleSaveOrder('draft')}
                className="bg-slate-100 hover:bg-slate-205 py-2.5 font-bold rounded-xl border cursor-pointer select-none"
              >
                Guardar Borrador 📝
              </button>
              <button
                type="button"
                onClick={() => handleSaveOrder('sent')}
                className="bg-blue-500 text-white hover:bg-blue-600 py-2.5 font-black rounded-xl border-b-4 border-blue-700 cursor-pointer select-none"
              >
                Transmitir Pedido Oficial 🚀
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
