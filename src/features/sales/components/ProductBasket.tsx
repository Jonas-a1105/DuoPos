/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ShoppingCart, Trash2, Plus, Minus, Tag, Users } from 'lucide-react';
import { CartItem, Customer, Product, LegalBillingSettings, HardwareDeviceSettings } from '../../../types/index';
import { TableState, KitchenOrder } from './HospitalityAddon';

import { playSound } from '../../../services/audio/soundService';
import { toast } from '../../../shared/ui/FlashNotifications/FlashNotifications';

interface ProductBasketProps {
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  selectedCustomer: Customer | null;
  setSelectedCustomer: (cust: Customer | null) => void;
  useGemsDiscount: boolean;
  setUseGemsDiscount: (use: boolean) => void;
  discountPercent: number;
  setDiscountPercent: (discount: number) => void;
  suspendedTickets: any[];
  setSuspendedTickets: React.Dispatch<React.SetStateAction<any[]>>;
  isMobileCartOpen: boolean;
  setIsMobileCartOpen: (open: boolean) => void;
  isCheckoutOpen: boolean;
  setIsCheckoutOpen: (open: boolean) => void;

  // Math values
  totalAmount: number;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  subtotalVES: number;
  discountAmountVES: number;
  taxAmountVES: number;
  totalAmountVES: number;
  exchangeRate: number;
  gemsToRedeem: number;
  gemsDiscount: number;

  // Hospitality props
  isHospitalityActive: boolean;
  activeTableId: string | null;
  setActiveTableId: (id: string | null) => void;
  activeWaiterName: string;
  setActiveWaiterName: (name: string) => void;
  tables: TableState[];
  setTables: React.Dispatch<React.SetStateAction<TableState[]>>;
  kitchenOrders: KitchenOrder[];
  setKitchenOrders: React.Dispatch<React.SetStateAction<KitchenOrder[]>>;
  setIsSplitModalOpen: (open: boolean) => void;
  setModifierTargetItem: (item: CartItem | null) => void;

  // Global settings & helpers
  billingSettings: LegalBillingSettings;
  hardwareSettings: HardwareDeviceSettings;
  customers: Customer[];
  products: Product[];
  onTriggerEventProgress?: (type: 'scan' | 'loyalty' | 'sale') => void;
  onOpenCheckout: () => void;
  onGrantXp: (amount: number) => void;
  addToCart: (prod: Product) => void;
  removeFromCart: (prodId: string) => void;
  removeAllFromCart: (prodId: string) => void;
}

export default function ProductBasket({
  cart,
  setCart,
  selectedCustomer,
  setSelectedCustomer,
  useGemsDiscount,
  setUseGemsDiscount,
  discountPercent,
  setDiscountPercent,
  suspendedTickets,
  setSuspendedTickets,
  isMobileCartOpen,
  setIsMobileCartOpen,
  isCheckoutOpen,
  setIsCheckoutOpen,

  totalAmount,
  subtotal,
  discountAmount,
  taxAmount,
  subtotalVES,
  discountAmountVES,
  taxAmountVES,
  totalAmountVES,
  exchangeRate,
  gemsToRedeem,
  gemsDiscount,

  isHospitalityActive,
  activeTableId,
  setActiveTableId,
  activeWaiterName,
  setActiveWaiterName,
  tables,
  setTables,
  kitchenOrders,
  setKitchenOrders,
  setIsSplitModalOpen,
  setModifierTargetItem,

  billingSettings,
  hardwareSettings,
  customers,
  products,
  onTriggerEventProgress,
  onOpenCheckout,
  onGrantXp,
  addToCart,
  removeFromCart,
  removeAllFromCart,
}: ProductBasketProps) {
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState('');
  const [promoMessage, setPromoMessage] = useState('');

  const isTaxIncl = billingSettings?.taxIncludedInPrice;
  const displayedSubtotal = isTaxIncl ? Math.max(0, totalAmount - taxAmount + discountAmount) : subtotal;
  const displayedSubtotalVES = isTaxIncl ? Math.max(0, totalAmountVES - taxAmountVES + discountAmountVES) : subtotalVES;

  // Free Sale / Ad-Hoc Item Creator Modal States
  const [isFreeSaleModalOpen, setIsFreeSaleModalOpen] = useState(false);
  const [freeSaleName, setFreeSaleName] = useState('');
  const [freeSalePrice, setFreeSalePrice] = useState('');
  const [freeSaleQty, setFreeSaleQty] = useState('1');
  const [freeSaleCategory, setFreeSaleCategory] = useState('General');

  // Edit Cart Item Detail Modal States
  const [editingCartItem, setEditingCartItem] = useState<CartItem | null>(null);
  const [editCartItemQty, setEditCartItemQty] = useState('');
  const [editCartItemDiscount, setEditCartItemDiscount] = useState('');
  const [editCartItemPrice, setEditCartItemPrice] = useState('');
  const [editCartItemNotes, setEditCartItemNotes] = useState('');

  const suspendCurrentTicket = () => {
    if (cart.length === 0) return;
    const alias = prompt(
      "Ingresa una referencia o nombre para identificar este ticket (ej. 'Cliente Fila #2', 'Señor de gorra'):",
    );
    if (alias === null) return;
    const finalAlias = alias.trim() || `Ticket #${suspendedTickets.length + 1}`;

    const newSuspended = {
      id: `SUSP-${Date.now()}`,
      alias: finalAlias,
      cart,
      customer: selectedCustomer,
      discountPercent,
      useGemsDiscount,
      savedAt: new Date().toISOString(),
    };

    setSuspendedTickets((prev) => [...prev, newSuspended]);
    setCart([]);
    setSelectedCustomer(null);
    setDiscountPercent(0);
    setPromoInput('');
    setUseGemsDiscount(false);
    playSound('click');
    setPromoMessage(`⏱️ ¡Ticket "${finalAlias}" en espera!`);
    setTimeout(() => setPromoMessage(''), 3000);
  };

  const restoreSuspendedTicket = (ticketId: string) => {
    const ticket = suspendedTickets.find((t) => t.id === ticketId);
    if (!ticket) return;

    if (cart.length > 0) {
      const confirmOverwrite = confirm(
        'Ya tienes artículos en el carrito. ¿Deseas reemplazar el carrito actual con el ticket en espera?',
      );
      if (!confirmOverwrite) return;
    }

    setCart(ticket.cart);
    setSelectedCustomer(ticket.customer);
    setDiscountPercent(ticket.discountPercent);
    setUseGemsDiscount(ticket.useGemsDiscount);
    setSuspendedTickets((prev) => prev.filter((t) => t.id !== ticketId));
    playSound('success');
    setPromoMessage(`✅ Ticket "${ticket.alias}" restaurado.`);
    setTimeout(() => setPromoMessage(''), 3000);
  };

  const deleteSuspendedTicket = (ticketId: string) => {
    if (!confirm('¿Deseas eliminar este ticket en espera de forma permanente?')) return;
    setSuspendedTickets((prev) => prev.filter((t) => t.id !== ticketId));
    playSound('error');
  };

  const openEditCartItemModal = (item: CartItem) => {
    setEditingCartItem(item);
    setEditCartItemQty(item.quantity.toString());
    setEditCartItemDiscount(item.discountPercent !== undefined ? item.discountPercent.toString() : '0');
    setEditCartItemPrice(item.customPrice !== undefined ? item.customPrice.toString() : item.product.price.toString());
    setEditCartItemNotes(item.notes || '');
    playSound('click');
  };

  const handleSaveCartItemEdit = () => {
    if (!editingCartItem) return;
    const qty = Number(editCartItemQty) || 1;
    const discount = Math.min(100, Math.max(0, Number(editCartItemDiscount) || 0));
    const price = Number(editCartItemPrice) || 0;
    const notes = editCartItemNotes.trim();

    if (qty > editingCartItem.product.stock) {
      toast.error(`Lo sentimos, el stock disponible es de solo ${editingCartItem.product.stock} unidades.`, {
        title: 'Stock Insuficiente',
      });
      return;
    }

    setCart((currCart) => {
      return currCart.map((item) => {
        if (item.product.id === editingCartItem.product.id) {
          return {
            ...item,
            quantity: qty,
            customPrice: price === editingCartItem.product.price ? undefined : price,
            discountPercent: discount > 0 ? discount : undefined,
            notes: notes || undefined,
          };
        }
        return item;
      });
    });

    setEditingCartItem(null);
    playSound('success');
  };

  const clearCart = () => {
    playSound('swoosh');
    setCart([]);
    setPromoInput('');
    setDiscountPercent(0);
    setAppliedPromo('');
    setPromoMessage('');
    setSelectedCustomer(null);
    setUseGemsDiscount(false);
  };

  const validatePromo = (e: React.FormEvent) => {
    e.preventDefault();
    const code = promoInput.trim().toUpperCase();

    if (!code) return;

    if (code === 'DUO50') {
      playSound('success');
      setDiscountPercent(50);
      setAppliedPromo('DUO50');
      setPromoMessage('¡Cupón DUO50 aplicado! 50% de descuento concedido.');
    } else if (code === 'SUPERXP') {
      playSound('success');
      setDiscountPercent(10);
      setAppliedPromo('SUPERXP');
      setPromoMessage('¡Cupón SUPERXP! Obtienes 10% de descuento y XP doble!');
    } else if (code === 'FREE') {
      playSound('success');
      setDiscountPercent(100);
      setAppliedPromo('FREE');
      setPromoMessage('¡MILAGRO! ¡Cupón GRATIS aplicado! Coste total 0.');
    } else if (code === 'STREAK') {
      playSound('success');
      setDiscountPercent(15);
      setAppliedPromo('STREAK');
      setPromoMessage('¡Cupón Racha activado! 15% de descuento.');
    } else {
      playSound('error');
      setPromoMessage('⛔ Código inválido. ¡Vuelve a estudiar tu vocabulario!');
    }
    setPromoInput('');
  };

  return (
    <>
      <div className="hidden lg:block space-y-4 text-gray-805">
        <div className="bg-white border-2 border-[#e5e5e5] border-b-[8px] rounded-3xl p-5 flex flex-col min-h-[480px] justify-between shadow-sm">
          {/* Cart Header */}
          <div>
            <div className="flex justify-between items-center pb-3 border-b-2 border-gray-100">
              <span className="font-black text-gray-800 text-xs sm:text-sm flex items-center gap-1.5 uppercase select-none">
                <ShoppingCart size={16} className="text-[#58cc02]" /> Mi Carrito
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFreeSaleName('');
                    setFreeSalePrice('');
                    setFreeSaleQty('1');
                    setFreeSaleCategory('General');
                    setIsFreeSaleModalOpen(true);
                    playSound('click');
                  }}
                  className="text-[9px] bg-sky-50 text-[#1cb0f6] border border-[#1cb0f6] px-2 py-0.5 sm:py-1 rounded-xl font-black uppercase hover:bg-sky-100 transition-all cursor-pointer"
                  title="Agregar un concepto rápido o artículo sin código (Atajo: V)"
                >
                  🏷️ Artículo Rápido
                </button>
                {cart.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={suspendCurrentTicket}
                      className="text-[10px] font-black text-amber-500 hover:text-amber-600 uppercase tracking-widest cursor-pointer"
                      title="Poner el ticket en espera (Atajo: Q)"
                    >
                      ⏱️
                    </button>
                    <button
                      onClick={clearCart}
                      className="text-[10px] font-black text-red-400 hover:text-red-500 uppercase tracking-widest cursor-pointer"
                      title="Vaciar carrito (Atajo: X)"
                    >
                      🗑️
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Cart Items list panel */}
            {cart.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <span className="text-5xl block animate-bounce select-none">🛒</span>
                <h4 className="font-black text-gray-500 text-lg">Carrito vacío</h4>
                <p className="text-xs text-gray-400 font-bold max-w-xs mx-auto px-5 leading-normal">
                  Selecciona productos de la grilla izquierda para sumarlos y comenzar a facturar. ¡A Duo le encantan
                  las facturas llenas!
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1 py-3 border-b border-gray-100">
                {cart.map((it) => (
                  <div
                    key={it.product.id}
                    className="flex justify-between items-center text-xs font-bold text-gray-750"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-2xl select-none flex-shrink-0">{it.product.emoji}</span>
                      <div className="min-w-0 text-left">
                        <p className="font-extrabold text-[#3c3c3c] truncate text-xs leading-none mb-0.5">
                          {it.product.name}
                        </p>
                        <div className="flex items-center flex-wrap gap-1">
                          {it.customPrice !== undefined ? (
                            <>
                              <span className="text-[9px] line-through text-gray-300 font-bold">
                                ${it.product.price.toFixed(2)}
                              </span>
                              <span className="text-[10px] text-blue-600 font-black">
                                ${it.customPrice.toFixed(2)} c/u
                              </span>
                            </>
                          ) : (
                            <span className="text-[10px] text-[#58cc02] font-black">
                              ${it.product.price.toFixed(2)} c/u
                            </span>
                          )}
                          <span
                            className="text-[10px] text-gray-400 font-extrabold bg-[#f1fcf0] border border-green-100 px-1 rounded-md"
                            title="Monto equivalente en Bolívares"
                          >
                            {(
                              (it.customPrice !== undefined ? it.customPrice : it.product.price) * exchangeRate
                            ).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                            Bs.
                          </span>
                          {it.discountPercent && (
                            <span className="text-[8px] bg-red-100 text-red-700 px-1 py-0.2 rounded font-black border border-red-150 animate-pulse">
                              -{it.discountPercent}% OFF
                            </span>
                          )}
                        </div>
                        {it.notes && (
                          <p
                            className="text-[9px] text-indigo-650 bg-indigo-50 px-1.5 py-0.5 rounded inline-block font-black mt-1 leading-normal text-left truncate max-w-[130px]"
                            title={it.notes}
                          >
                            📝 {it.notes}
                          </p>
                        )}
                        {it.addons && it.addons.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1 text-left">
                            {it.addons.map((add, addIdx) => (
                              <span
                                key={addIdx}
                                className="text-[8px] text-[#2c7a02] bg-[#f2ffd4] font-black px-1 py-0.5 rounded border border-[#ccd9ad]"
                              >
                                +{add.name} (+${add.price.toFixed(2)})
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {hardwareSettings.weighingScale.enabled && (
                        <button
                          type="button"
                          onClick={() => {
                            const currWeight = hardwareSettings.weighingScale.mockWeightOverride;
                            if (currWeight <= 0) {
                              playSound('error');
                              toast.error(
                                "La báscula marca 0.000 kg. Abre el panel 'Bus IoT' en la barra superior para definir el peso de simulación.",
                                { title: 'Báscula sin peso' },
                              );
                              return;
                            }
                            playSound('levelup');
                            setCart((currCart) => {
                              return currCart.map((item) => {
                                if (item.product.id === it.product.id) {
                                  return { ...item, quantity: parseFloat(currWeight.toFixed(3)) };
                                }
                                return item;
                              });
                            });
                          }}
                          className="p-1 px-1.5 bg-yellow-50 hover:bg-yellow-100 text-yellow-800 border border-yellow-200 rounded font-black text-[9px] uppercase tracking-tighter flex items-center gap-0.5 cursor-pointer"
                          title={`Medir peso con Báscula Serial (Actual: ${hardwareSettings.weighingScale.mockWeightOverride.toFixed(3)} ${hardwareSettings.weighingScale.unit}). Clic para aplicar.`}
                        >
                          ⚖️ Pesar
                        </button>
                      )}

                      <div className="flex items-center border border-gray-200 rounded-lg bg-gray-50 p-0.5 select-none font-black text-xs">
                        <button
                          onClick={() => removeFromCart(it.product.id)}
                          className="p-1 hover:bg-gray-200 rounded text-gray-500"
                        >
                          <Minus size={11} strokeWidth={3} />
                        </button>
                        <span className="px-2 font-black text-gray-800 font-mono">{it.quantity}</span>
                        <button
                          disabled={it.quantity >= it.product.stock}
                          onClick={() => addToCart(it.product)}
                          className="p-1 hover:bg-gray-200 rounded text-gray-500 disabled:opacity-40"
                        >
                          <Plus size={11} strokeWidth={3} />
                        </button>
                      </div>

                      {isHospitalityActive && (
                        <button
                          type="button"
                          onClick={() => {
                            playSound('click');
                            setModifierTargetItem(it);
                          }}
                          className="p-1 text-gray-400 hover:text-[#58cc02] transition-colors rounded hover:bg-gray-100 cursor-pointer text-xs"
                          title="Personalizar aderezos, ingredientes y cocina de este platillo"
                        >
                          ✏️
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => openEditCartItemModal(it)}
                        className="p-1 text-gray-400 hover:text-orange-500 transition-colors rounded hover:bg-gray-100 cursor-pointer text-xs"
                        title="Ajustar precio, descuento individual o cantidad manualmente"
                      >
                        ⚙️
                      </button>

                      <button
                        onClick={() => removeAllFromCart(it.product.id)}
                        className="p-1 text-gray-300 hover:text-red-400 cursor-pointer"
                        title="Quitar todo"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

            {/* Asociar Cliente de Lealtad */}
            {cart.length > 0 && (
            <div className="bg-[#fcfcfc] border-2 border-gray-100 rounded-2xl p-3 space-y-2 mt-2 select-none text-left">
              <div className="flex justify-between items-center bg-white border border-gray-155 p-2 rounded-xl">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-xl">👥</span>
                  {selectedCustomer ? (
                    <div className="min-w-0">
                      <p className="text-xs font-black text-gray-800 truncate" title={selectedCustomer.name}>
                        {selectedCustomer.name}
                      </p>
                      <p className="text-[9px] text-gray-400 font-extrabold uppercase tracking-wide flex items-center gap-0.5">
                        <span className="text-[#58cc02]">Cashback: ${(selectedCustomer.gems / 10).toFixed(2)} USD</span>
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-black text-gray-400">Sin cliente asociado</p>
                      <p className="text-[9px] text-gray-300 font-bold uppercase">Programa de Cashback</p>
                    </div>
                  )}
                </div>

                {selectedCustomer ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCustomer(null);
                      setUseGemsDiscount(false);
                      playSound('click');
                    }}
                    className="text-red-500 hover:text-red-655 font-extrabold text-[10px] uppercase border border-red-100 px-2 py-1 rounded-lg hover:bg-red-50 cursor-pointer"
                  >
                    Quitar
                  </button>
                ) : (
                  <select
                    value=""
                    onChange={(e) => {
                      const cust = customers.find((c) => c.id === e.target.value);
                      if (cust) {
                        setSelectedCustomer(cust);
                        playSound('success');
                        if (onTriggerEventProgress) onTriggerEventProgress('loyalty');
                      }
                    }}
                    className="text-[#1cb0f6] border border-sky-150 bg-sky-50 rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-wider outline-none cursor-pointer max-w-[110px]"
                  >
                    <option value="">+ Asociar</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} (${(c.gems / 10).toFixed(2)} USD)
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {selectedCustomer && selectedCustomer.gems >= 10 && (
                <div className="bg-white border border-gray-150 rounded-xl p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer font-extrabold text-[10px] uppercase tracking-wider text-gray-655">
                      <input
                        type="checkbox"
                        checked={useGemsDiscount}
                        onChange={(e) => {
                          setUseGemsDiscount(e.target.checked);
                          playSound('click');
                        }}
                        className="rounded border-gray-300 text-[#58cc02] focus:ring-[#58cc02] cursor-pointer"
                      />
                      <span>Aplicar Cashback</span>
                    </label>
                    <span className="text-xs font-black font-mono text-[#58cc02] flex items-center gap-0.5">
                      ${(selectedCustomer.gems / 10).toFixed(2)} USD
                    </span>
                  </div>

                  {useGemsDiscount && (
                    <div className="text-[10px] text-gray-400 font-bold leading-normal pt-1.5 border-t border-dashed">
                      Canjeando <span className="text-[#58cc02] font-black">${(gemsToRedeem / 10).toFixed(2)} USD de cashback</span> por un descuento directo de <span className="text-gray-800 font-black">${gemsDiscount.toFixed(2)} USD</span>.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Promo engine & summaries */}
          <div className="space-y-4 pt-3 text-left">
            {cart.length > 0 && (
              <div className="space-y-1.5 pb-2 border-b border-gray-100/50">
                <form onSubmit={validatePromo} className="flex gap-1.5">
                  <div className="relative flex-1">
                    <span className="absolute left-2.5 top-2 text-gray-400">
                      <Tag size={12} />
                    </span>
                    <input
                      type="text"
                      placeholder="CUPÓN (Ej. DUO50, STREAK)"
                      value={promoInput}
                      onChange={(e) => setPromoInput(e.target.value)}
                      className="w-full pl-7 pr-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg font-black text-gray-750 outline-none text-[10px] focus:border-[#58cc02]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="bg-[#1cb0f6] text-white border-b-2 border-[#1899d6] hover:bg-[#32beff] active:translate-y-[2px] active:border-b-0 font-black text-[10px] tracking-wide px-3 rounded-lg uppercase cursor-pointer"
                  >
                    Aplicar
                  </button>
                </form>
                {promoMessage && (
                  <p
                    className={`text-[10px] font-extrabold italic ${promoMessage.includes('⛔') ? 'text-red-500' : 'text-[#58cc02]'}`}
                  >
                    {promoMessage}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-1.5 text-xs text-gray-500 font-extrabold">
              <div className="flex justify-between items-center">
                <span>{isTaxIncl ? 'Subtotal (sin IVA):' : 'Subtotal:'}</span>
                <div className="text-right">
                  <span className="text-[#3c3c3c] font-black">${displayedSubtotal.toFixed(2)} USD</span>
                  <span className="block text-[10px] text-gray-400 font-bold">
                    {displayedSubtotalVES.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.
                  </span>
                </div>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between items-center text-red-500">
                  <span>Descuento aplicado:</span>
                  <div className="text-right">
                    <span className="font-black">-${discountAmount.toFixed(2)} USD</span>
                    <span className="block text-[10px] text-red-400 font-bold">
                      -
                      {discountAmountVES.toLocaleString('es-VE', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{' '}
                      Bs.
                    </span>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span>{isTaxIncl ? 'Impuesto (IVA Incluido):' : 'Recargo por Impuesto:'}</span>
                <div className="text-right">
                  <span className="text-[#3c3c3c] font-black">${taxAmount.toFixed(2)} USD</span>
                  <span className="block text-[10px] text-gray-400 font-bold">
                    {taxAmountVES.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center text-base font-black text-gray-800 border-t border-gray-100 pt-2.5">
                <span>Total a Cobrar:</span>
                <div className="text-right">
                  <span className="text-xl font-black text-[#58cc02]">${totalAmount.toFixed(2)} USD</span>
                  <span className="block text-xs font-black text-indigo-650 animate-pulse mt-0.5">
                    {totalAmountVES.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.
                  </span>
                </div>
              </div>
            </div>

            {/* Fast F&B Hospitality Actions */}
            {isHospitalityActive && cart.length > 0 && (
              <div className="grid grid-cols-3 gap-2 py-2 border-t border-b border-[#e5e5e5]">
                <button
                  type="button"
                  onClick={() => {
                    if (!activeTableId) {
                      playSound('error');
                      toast.error('Selecciona una Mesa en el mapa superior primero para guardar la comanda.', {
                        title: 'Mesa no seleccionada',
                      });
                      return;
                    }
                    playSound('success');
                    setTables((prev) =>
                      prev.map((t) => {
                        if (t.id === activeTableId) {
                          return {
                            ...t,
                            status: 'occupied',
                            waiterName: activeWaiterName || 'Personal General',
                            cart: cart,
                            customer: selectedCustomer,
                            occupiedSince: t.occupiedSince || new Date().toISOString(),
                          };
                        }
                        return t;
                      }),
                    );
                    toast.info(
                      `Comanda retenida para "${tables.find((t) => t.id === activeTableId)?.name}". Puedes atender otra venta.`,
                      { title: 'Comanda Guardada 💾', duration: 4000 },
                    );
                    setCart([]);
                    setActiveTableId(null);
                    setActiveWaiterName('');
                    setSelectedCustomer(null);
                  }}
                  className="py-2 px-1 bg-sky-50 hover:bg-sky-100 text-sky-700 active:translate-y-0.5 border border-sky-200 rounded-xl text-[9px] uppercase font-black cursor-pointer text-center flex flex-col items-center justify-center gap-1"
                  title="Guardar comanda activa en la mesa seleccionada"
                >
                  <span>💾 Retener Mesa</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playSound('click');
                    const activeTable = tables.find((t) => t.id === activeTableId);
                    const tableName = activeTable ? activeTable.name : 'Venta de Mostrador';

                    const newOrder: KitchenOrder = {
                      id: `KITCHEN-${Math.floor(1000 + Math.random() * 9000).toString()}`,
                      tableId: activeTableId || 'walk-in',
                      tableName: tableName,
                      waiterName: activeWaiterName || 'Personal General',
                      sentAt: new Date().toISOString(),
                      items: cart.map((it) => ({
                        name: it.product.name,
                        emoji: it.product.emoji,
                        quantity: it.quantity,
                        notes: it.notes,
                        addons: it.addons,
                      })),
                      status: 'pending',
                    };

                    setKitchenOrders((prev) => [newOrder, ...prev]);
                    setPromoMessage(`🛎️ [KDS] Comanda enviada a cocina con éxito para la ${tableName}`);
                    setTimeout(() => setPromoMessage(''), 3500);

                    if (activeTableId) {
                      setTables((prev) =>
                        prev.map((t) => {
                          if (t.id === activeTableId) {
                            return {
                              ...t,
                              status: 'occupied',
                              waiterName: activeWaiterName || 'Personal General',
                              cart: cart,
                              customer: selectedCustomer,
                              occupiedSince: t.occupiedSince || new Date().toISOString(),
                            };
                          }
                          return t;
                        }),
                      );
                      toast.info(`Comida enviada a cocina para la "${tableName}".`, {
                        title: 'KDS - Cocina 🛎️',
                        duration: 4000,
                      });
                      setCart([]);
                      setActiveTableId(null);
                      setActiveWaiterName('');
                      setSelectedCustomer(null);
                    } else {
                      toast.info(`Comanda de mostrador enviada al KDS rápido.`, {
                        title: 'KDS - Cocina 🛎️',
                        duration: 4000,
                      });
                    }
                  }}
                  className="py-2 px-1 bg-amber-50 hover:bg-amber-100 text-amber-700 active:translate-y-0.5 border border-amber-200 rounded-xl text-[9px] uppercase font-black cursor-pointer text-center flex flex-col items-center justify-center gap-1"
                  title="Enviar comanda activa a los cocineros en la pantalla KDS"
                >
                  <span>🍳 A Cocina (KDS)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playSound('click');
                    setIsSplitModalOpen(true);
                  }}
                  className="py-2 px-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 active:translate-y-0.5 border border-emerald-200 rounded-xl text-[9px] uppercase font-black cursor-pointer text-center flex flex-col items-center justify-center gap-1"
                  title="Dividir ticket en partes equitativas o pagar cuentas individuales"
                >
                  <span>🧮 Dividir Cuenta</span>
                </button>
              </div>
            )}

            {/* Action checkout button */}
            <button
              disabled={cart.length === 0}
              onClick={onOpenCheckout}
              className={`w-full text-white font-black py-4.5 rounded-2xl border-b-[6px] transition-all tracking-wider text-center uppercase cursor-pointer flex items-center justify-center gap-2 ${
                cart.length === 0
                  ? 'bg-gray-150 text-gray-400 border-gray-200 border-b-0 cursor-not-allowed'
                  : 'bg-[#58cc02] border-[#46a302] hover:bg-[#61e002] active:border-b-0 active:translate-y-[6px]'
              }`}
            >
              Cobrar Ticket
            </button>

            {/* Keyboard cashier shortcuts strip */}
            <div className="pt-3.5 text-[9px] text-gray-400 font-bold flex justify-center items-center flex-wrap gap-x-2.5 gap-y-1 border-t border-gray-100 select-none leading-none mt-1 animate-fadeIn">
              <span className="uppercase font-black tracking-widest text-[8px] text-gray-300">Atajos:</span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.2 bg-gray-50 border border-gray-200 rounded text-gray-500 font-mono text-[8.5px] font-black shadow-xs">
                  F
                </kbd>{' '}
                Buscar
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.2 bg-gray-50 border border-gray-200 rounded text-gray-500 font-mono text-[8.5px] font-black shadow-xs">
                  V
                </kbd>{' '}
                Art. Rápido
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.2 bg-emerald-50 border border-emerald-200 rounded text-emerald-600 font-mono text-[8.5px] font-black shadow-xs">
                  P
                </kbd>{' '}
                Cobrar
              </span>
            </div>
          </div>
        </div>

        {/* Held / Suspended tickets widget list */}
        {suspendedTickets && suspendedTickets.length > 0 && (
          <div className="bg-amber-50/70 border-2 border-amber-200 border-b-[6px] rounded-3xl p-4 space-y-3 shadow-xs animate-fadeIn text-left mt-4">
            <div className="flex justify-between items-center border-b border-amber-200/60 pb-1.5">
              <span className="font-extrabold text-[#3c3c3c] text-xs uppercase flex items-center gap-1">
                ⏱️ Tickets Retenidos en Espera ({suspendedTickets.length})
              </span>
              <span className="bg-amber-500 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-md leading-none select-none">
                Fila Abierta
              </span>
            </div>

            <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
              {suspendedTickets.map((ticket) => {
                const itemsCount = ticket.cart.reduce((sum: number, item: CartItem) => sum + item.quantity, 0);
                const ticketTotal = ticket.cart.reduce((acc: number, curr: CartItem) => {
                  const addonsTotal = curr.addons ? curr.addons.reduce((sum, add) => sum + add.price, 0) : 0;
                  return acc + (curr.product.price + addonsTotal) * curr.quantity;
                }, 0);

                return (
                  <div
                    key={ticket.id}
                    className="bg-white border border-amber-150 p-2.5 rounded-xl flex items-center justify-between text-xs gap-2"
                  >
                    <div className="min-w-0">
                      <p className="font-extrabold text-gray-800 truncate leading-snug">{ticket.alias}</p>
                      <p className="text-[9px] text-amber-700 font-extrabold uppercase mt-0.5">
                        {itemsCount} {itemsCount === 1 ? 'artículo' : 'artículos'} •{' '}
                        <span className="font-mono">${ticketTotal.toFixed(2)}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => restoreSuspendedTicket(ticket.id)}
                        className="bg-[#58cc02] text-white border-b-2 border-[#46a302] px-2 py-1 rounded-lg text-[9px] font-black uppercase hover:bg-[#61e002] active:translate-y-0.5 active:border-b-0 cursor-pointer"
                      >
                        Restaurar
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteSuspendedTicket(ticket.id)}
                        className="text-red-500 hover:text-red-700 p-1 rounded-md hover:bg-red-50 text-[10px] cursor-pointer"
                        title="Eliminar"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* MOBILE FLOATING ACTION SUMMARY BAR */}
      {cart.length > 0 && !isMobileCartOpen && !isCheckoutOpen && (
        <div className="lg:hidden fixed bottom-[72px] inset-x-4 z-40 animate-slideUp text-gray-805">
          <button
            type="button"
            onClick={() => {
              setIsMobileCartOpen(true);
              playSound('click');
            }}
            className="w-full bg-[#58cc02] hover:bg-[#61e002] text-white border-b-4 border-[#46a302] py-3.5 px-4 rounded-2xl flex items-center justify-between font-black uppercase text-[10.5px] sm:text-xs tracking-wider shadow-2xl transition-all active:translate-y-0.5 active:border-b-0 cursor-pointer animate-pulse-slow"
          >
            <span className="flex items-center gap-1.5 font-black">
              <ShoppingCart size={16} className="animate-bounce" />
              <span>Mi Carrito</span>
              <span className="bg-white/25 px-2 py-0.5 rounded-lg text-[9px] font-mono font-black">
                {cart.reduce((sum, i) => sum + i.quantity, 0)}
              </span>
            </span>
            <span className="flex items-center gap-2">
              <span className="flex flex-col items-end leading-tight text-right pr-1">
                <span className="text-[10px] font-bold">
                  Total: <strong className="font-mono font-black text-sm">${totalAmount.toFixed(2)} USD</strong>
                </span>
                <span className="text-[9px] font-black text-white/90">
                  {totalAmountVES.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.
                </span>
              </span>
              <span className="text-lg">👉</span>
            </span>
          </button>
        </div>
      )}

      {/* MOBILE SLIDE-UP BOTTOM SHEET DRAWER */}
      {isMobileCartOpen && (
        <div className="lg:hidden fixed inset-0 z-50 text-gray-805">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-[#141414]/60 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => {
              setIsMobileCartOpen(false);
              playSound('click');
            }}
          />

          {/* Main Sheet Container */}
          <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] bg-white border-t-2 border-[#e5e5e5] rounded-t-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-slideUp">
            {/* Sliding sheet visual handler bar */}
            <div
              className="w-full py-2 flex justify-center items-center cursor-pointer select-none border-b border-gray-100/50"
              onClick={() => {
                setIsMobileCartOpen(false);
                playSound('click');
              }}
            >
              <div className="w-12 h-1.5 bg-gray-200 rounded-full hover:bg-gray-300 transition-colors" />
            </div>

            {/* Scrollable Content wrapper */}
            <div className="flex-1 overflow-y-auto p-5 pb-8 space-y-4">
              {/* Header inside sheet */}
              <div className="flex justify-between items-center pb-2.5 border-b border-gray-150">
                <span className="font-black text-gray-800 text-sm flex items-center gap-1.5 uppercase select-none">
                  <ShoppingCart size={18} className="text-[#58cc02]" /> Carrito Móvil
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFreeSaleName('');
                      setFreeSalePrice('');
                      setFreeSaleQty('1');
                      setFreeSaleCategory('General');
                      setIsFreeSaleModalOpen(true);
                      playSound('click');
                    }}
                    className="text-[9px] bg-sky-50 text-[#1cb0f6] border border-[#1cb0f6] px-2 py-1 rounded-xl font-black uppercase hover:bg-sky-100 transition-all cursor-pointer"
                  >
                    🏷️ Artículo Rápido
                  </button>
                  {cart.length > 0 && (
                    <button
                      onClick={() => {
                        const confirmClear = confirm('¿Deseas vaciar por completo el carrito actual?');
                        if (confirmClear) {
                          setCart([]);
                          setSelectedCustomer(null);
                          setDiscountPercent(0);
                          setPromoInput('');
                          setUseGemsDiscount(false);
                          playSound('swoosh');
                          setIsMobileCartOpen(false);
                        }
                      }}
                      className="text-[10px] font-black text-red-500 hover:text-red-655 uppercase tracking-widest cursor-pointer bg-red-50 px-2 py-1 rounded-xl border border-red-100"
                    >
                      🗑️ Vaciar
                    </button>
                  )}
                </div>
              </div>

              {/* Items List */}
              {cart.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <span className="text-4xl block">🛒</span>
                  <p className="text-xs text-gray-400 font-bold max-w-xs mx-auto leading-normal">
                    Tu carrito de compras está vacío. Agrega artículos tocando los productos de la grilla.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 divide-y divide-gray-50 text-left">
                  {cart.map((it) => (
                    <div
                      key={it.product.id}
                      className="flex justify-between items-center text-xs font-bold text-gray-700 pt-3 first:pt-0"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-2xl select-none flex-shrink-0">{it.product.emoji}</span>
                        <div className="min-w-0 text-left">
                          <p className="font-extrabold text-[#3c3c3c] truncate text-xs leading-tight mb-0.5">
                            {it.product.name}
                          </p>
                          <div className="flex items-center flex-wrap gap-1">
                            {it.customPrice !== undefined ? (
                              <>
                                <span className="text-[9px] line-through text-gray-300 font-bold">
                                  ${it.product.price.toFixed(2)}
                                </span>
                                <span className="text-[10px] text-blue-600 font-black">
                                  ${it.customPrice.toFixed(2)}
                                </span>
                              </>
                            ) : (
                              <span className="text-[10px] text-[#58cc02] font-black">
                                ${it.product.price.toFixed(2)}
                              </span>
                            )}
                            <span
                              className="text-[10px] text-gray-400 font-extrabold bg-[#f1fcf0] border border-green-100 px-1 rounded-md"
                              title="Monto equivalente en Bolívares"
                            >
                              {(
                                (it.customPrice !== undefined ? it.customPrice : it.product.price) * exchangeRate
                              ).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                              Bs.
                            </span>
                            {it.discountPercent && (
                              <span className="text-[8px] bg-red-100 text-red-700 px-1 py-0.2 rounded font-black border border-red-150">
                                -{it.discountPercent}% OFF
                              </span>
                            )}
                          </div>
                          {it.notes && (
                            <p className="text-[9px] text-indigo-655 bg-indigo-50 px-1.5 py-0.5 rounded inline-block font-black mt-1 leading-normal text-left truncate max-w-[130px]">
                              📝 {it.notes}
                            </p>
                          )}
                          {it.addons && it.addons.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1 text-left">
                              {it.addons.map((add, addIdx) => (
                                <span
                                  key={addIdx}
                                  className="text-[8px] text-[#2c7a02] bg-[#f2ffd4] font-black px-1 py-0.5 rounded border border-[#ccd9ad]"
                                >
                                  +{add.name} (+${add.price.toFixed(2)})
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <div className="flex items-center border border-gray-200 rounded-lg bg-gray-50 p-0.5 select-none font-black text-xs">
                          <button
                            onClick={() => removeFromCart(it.product.id)}
                            className="p-1 hover:bg-gray-200 rounded text-gray-500"
                          >
                            <Minus size={11} strokeWidth={3} />
                          </button>
                          <span className="px-1.5 font-black text-gray-800 font-mono">{it.quantity}</span>
                          <button
                            disabled={it.quantity >= it.product.stock}
                            onClick={() => addToCart(it.product)}
                            className="p-1 hover:bg-gray-200 rounded text-gray-500 disabled:opacity-40"
                          >
                            <Plus size={11} strokeWidth={3} />
                          </button>
                        </div>

                        {isHospitalityActive && (
                          <button
                            type="button"
                            onClick={() => {
                              playSound('click');
                              setModifierTargetItem(it);
                            }}
                            className="p-1 text-gray-400 hover:text-[#58cc02] transition-colors rounded hover:bg-gray-100 text-xs"
                          >
                            ✏️
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openEditCartItemModal(it)}
                          className="p-1 text-gray-400 hover:text-orange-500 transition-colors rounded hover:bg-gray-100 text-xs"
                        >
                          ⚙️
                        </button>
                        <button
                          onClick={() => removeAllFromCart(it.product.id)}
                          className="p-1 text-gray-300 hover:text-red-400"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Loyalty customer linkage mobile widget */}
              {cart.length > 0 && (
                <div className="bg-[#fcfcfc] border-2 border-gray-100 rounded-2xl p-3 space-y-2 select-none">
                  <div className="flex justify-between items-center bg-white border border-gray-150 p-2 rounded-xl">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xl">👥</span>
                      {selectedCustomer ? (
                        <div className="min-w-0 text-left">
                          <p className="text-xs font-black text-gray-800 truncate">{selectedCustomer.name}</p>
                          <p className="text-[9px] text-[#58cc02] font-extrabold uppercase tracking-wide">
                            Cashback: ${(selectedCustomer.gems / 10).toFixed(2)} USD
                          </p>
                        </div>
                      ) : (
                        <div className="text-left">
                          <p className="text-xs font-black text-gray-400">Sin cliente asociado</p>
                        </div>
                      )}
                    </div>

                    {selectedCustomer ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCustomer(null);
                          setUseGemsDiscount(false);
                          playSound('click');
                        }}
                        className="text-red-500 hover:text-red-655 font-extrabold text-[10px] uppercase border border-red-100 px-2 py-1 rounded-lg hover:bg-red-50 cursor-pointer"
                      >
                        Quitar
                      </button>
                    ) : (
                      <select
                        value=""
                        onChange={(e) => {
                          const cust = customers.find((c) => c.id === e.target.value);
                          if (cust) {
                            setSelectedCustomer(cust);
                            playSound('success');
                          }
                        }}
                        className="text-[#1cb0f6] border border-sky-150 bg-sky-50 rounded-lg px-2 py-1 text-[10px] font-black uppercase outline-none cursor-pointer max-w-[120px]"
                      >
                        <option value="">+ Asociar Cliente</option>
                        {customers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} (${(c.gems / 10).toFixed(2)} USD)
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {selectedCustomer && selectedCustomer.gems >= 10 && (
                    <div className="bg-white border border-gray-150 rounded-xl p-2">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer font-extrabold text-[10px] uppercase tracking-wider text-gray-655 font-sans">
                          <input
                            type="checkbox"
                            checked={useGemsDiscount}
                            onChange={(e) => {
                              setUseGemsDiscount(e.target.checked);
                              playSound('click');
                            }}
                            className="rounded border-gray-300 text-[#58cc02]"
                          />
                          <span>Aplicar Cashback</span>
                        </label>
                        <span className="text-xs font-black font-mono text-[#58cc02]">${(selectedCustomer.gems / 10).toFixed(2)} USD</span>
                      </div>
                      {useGemsDiscount && (
                        <p className="text-[9px] text-gray-400 font-bold mt-1.5 pt-1.5 border-t border-dashed text-left">
                          Descuento aplicado:{' '}
                          <span className="text-gray-800 font-extrabold">${gemsDiscount.toFixed(2)} USD</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Promo code entry */}
              {cart.length > 0 && (
                <div className="space-y-1.5 pb-1 select-none">
                  <form onSubmit={validatePromo} className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="CUPÓN DE DESCUENTO"
                      value={promoInput}
                      onChange={(e) => setPromoInput(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg font-black text-gray-750 outline-none text-[10px] uppercase"
                    />
                    <button
                      type="submit"
                      className="bg-[#1cb0f6] text-white font-black text-[10px] px-3.5 rounded-lg uppercase cursor-pointer"
                    >
                      Aplicar
                    </button>
                  </form>
                  {promoMessage && (
                    <p
                      className={`text-[10px] font-extrabold text-left ${promoMessage.includes('⛔') ? 'text-red-500' : 'text-[#58cc02]'}`}
                    >
                      {promoMessage}
                    </p>
                  )}
                </div>
              )}

              {/* Math summaries */}
              {cart.length > 0 && (
                <div className="space-y-1.5 text-xs text-gray-500 font-extrabold p-3 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="flex justify-between items-center text-[11px]">
                    <span>{isTaxIncl ? 'Subtotal (sin IVA):' : 'Subtotal:'}</span>
                    <span className="text-gray-700">
                      ${displayedSubtotal.toFixed(2)} USD •{' '}
                      <span className="text-gray-400 font-bold">
                        {displayedSubtotalVES.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                        Bs.
                      </span>
                    </span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between items-center text-[11px] text-red-500">
                      <span>Descuento:</span>
                      <span>
                        -${discountAmount.toFixed(2)} USD •{' '}
                        <span className="text-red-400 font-bold">
                          -
                          {discountAmountVES.toLocaleString('es-VE', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{' '}
                          Bs.
                        </span>
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-[11px]">
                    <span>{isTaxIncl ? 'Impuesto (IVA Incluido):' : 'Impuesto Ventas:'}</span>
                    <span className="text-gray-700">
                      ${taxAmount.toFixed(2)} USD •{' '}
                      <span className="text-gray-400 font-bold">
                        {taxAmountVES.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                        Bs.
                      </span>
                    </span>
                  </div>
                  <div className="flex flex-col text-sm font-black text-gray-800 border-t border-dashed border-gray-200 pt-2 text-right">
                    <div className="flex justify-between items-center w-full">
                      <span>Total a pagar USD:</span>
                      <span className="text-base text-[#58cc02] font-black">${totalAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center w-full mt-1 border-t border-dotted border-gray-100 pt-1">
                      <span className="text-[11px] text-indigo-500">Equivalente VES:</span>
                      <span className="text-sm font-black text-indigo-650 tracking-wide animate-pulse">
                        {totalAmountVES.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                        Bs.
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Kitchen / F&B Fast Actions for mobile */}
              {isHospitalityActive && cart.length > 0 && (
                <div className="grid grid-cols-3 gap-2.5 pt-2 select-none">
                  <button
                    type="button"
                    onClick={() => {
                      if (!activeTableId) {
                        playSound('error');
                        toast.error('Selecciona una Mesa en el mapa superior primero.', {
                          title: 'Mesa no seleccionada',
                        });
                        return;
                      }
                      playSound('success');
                      setTables((prev) =>
                        prev.map((t) => {
                          if (t.id === activeTableId) {
                            return {
                              ...t,
                              status: 'occupied',
                              waiterName: activeWaiterName || 'Personal General',
                              cart: cart,
                              customer: selectedCustomer,
                              occupiedSince: t.occupiedSince || new Date().toISOString(),
                            };
                          }
                          return t;
                        }),
                      );
                      setCart([]);
                      setActiveTableId(null);
                      setSelectedCustomer(null);
                      setIsMobileCartOpen(false);
                    }}
                    className="py-2 px-1 bg-sky-50 text-sky-700 border border-sky-150 rounded-xl text-[9px] uppercase font-black"
                  >
                    💾 Retener Mesa
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playSound('click');
                      const activeTable = tables.find((t) => t.id === activeTableId);
                      const tableName = activeTable ? activeTable.name : 'Venta de Mostrador';

                      const newOrder: KitchenOrder = {
                        id: `KITCHEN-${Math.floor(1000 + Math.random() * 9000).toString()}`,
                        tableId: activeTableId || 'walk-in',
                        tableName: tableName,
                        waiterName: activeWaiterName || 'Personal General',
                        sentAt: new Date().toISOString(),
                        items: cart.map((it) => ({
                          name: it.product.name,
                          emoji: it.product.emoji,
                          quantity: it.quantity,
                          notes: it.notes,
                          addons: it.addons,
                        })),
                        status: 'pending',
                      };

                      setKitchenOrders((prev) => [newOrder, ...prev]);
                      if (activeTableId) {
                        setTables((prev) =>
                          prev.map((t) => {
                            if (t.id === activeTableId) {
                              return { ...t, status: 'occupied', cart: cart };
                            }
                            return t;
                          }),
                        );
                        setCart([]);
                        setActiveTableId(null);
                        setSelectedCustomer(null);
                        setIsMobileCartOpen(false);
                      }
                      toast.info('Enviado a cocina con éxito.', { title: 'KDS - Cocina 🛎️' });
                    }}
                    className="py-2 px-1 bg-amber-50 text-amber-700 border border-amber-150 rounded-xl text-[9px] uppercase font-black"
                  >
                    🍳 A Cocina (KDS)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playSound('click');
                      setIsSplitModalOpen(true);
                    }}
                    className="py-2 px-1 bg-emerald-50 text-emerald-700 border border-[#b2e5cc] rounded-xl text-[9px] uppercase font-black"
                  >
                    🧮 Dividir Cuenta
                  </button>
                </div>
              )}

              {/* Primary call to checkout */}
              {cart.length > 0 && (
                <button
                  onClick={() => {
                    setIsMobileCartOpen(false);
                    onOpenCheckout();
                  }}
                  className="w-full text-white bg-[#58cc02] border-[#46a302] hover:bg-[#61e002] active:border-b-0 active:translate-y-[4px] font-black py-4.5 rounded-2xl border-b-[6px] tracking-wider text-center uppercase cursor-pointer"
                >
                  Cobrar Ticket (${totalAmount.toFixed(2)})
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ADVANCED POS EXTRA MODAL: FREE WORKSTATION SALE */}
      {isFreeSaleModalOpen && (
        <div className="fixed inset-0 z-55 bg-[#141414]/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white border-2 border-[#e5e5e5] border-b-[8px] rounded-3xl p-6 space-y-4 shadow-xl animate-scaleUp text-left text-gray-805">
            <div className="flex justify-between items-center border-b border-gray-150 pb-2">
              <span className="font-extrabold text-gray-800 text-sm uppercase flex items-center gap-1.5">
                🏷️ Venta Ad-Hoc / Artículo Rápido
              </span>
              <button
                onClick={() => setIsFreeSaleModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">
                  Nombre por Concepto o Descripción
                </label>
                <input
                  type="text"
                  placeholder="Ej. Envase Especial, Producto sin código, Servicio"
                  value={freeSaleName}
                  onChange={(e) => setFreeSaleName(e.target.value)}
                  className="w-full pl-3 pr-3 py-2 bg-white border-2 border-[#e5e5e5] rounded-xl font-bold text-sm text-gray-805 outline-none focus:border-[#58cc02]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">
                    Precio Unitario ($)
                  </label>
                  <input
                    type="text"
                    placeholder="0.00"
                    value={freeSalePrice}
                    onChange={(e) => setFreeSalePrice(e.target.value.replace(/[^0-9.]/g, ''))}
                    className="w-full pl-3 pr-3 py-2 bg-white border-2 border-[#e5e5e5] rounded-xl font-mono font-bold text-sm text-gray-805 outline-none focus:border-[#58cc02]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Cantidad de Items</label>
                  <input
                    type="text"
                    placeholder="1"
                    value={freeSaleQty}
                    onChange={(e) => setFreeSaleQty(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full pl-3 pr-3 py-2 bg-white border-2 border-[#e5e5e5] rounded-xl font-mono font-bold text-sm text-gray-805 outline-none focus:border-[#58cc02]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">
                  Categoría Sectorial (Para Impuestos)
                </label>
                <select
                  value={freeSaleCategory}
                  onChange={(e) => setFreeSaleCategory(e.target.value)}
                  className="w-full pl-3 pr-3 py-2 bg-white border-2 border-[#e5e5e5] rounded-xl font-bold text-sm text-gray-805 outline-none focus:border-[#58cc02]"
                >
                  <option value="General">General (Venta libre)</option>
                  <option value="Servicios">Servicios Generales</option>
                  <option value="Alimentos">Alimentos y Bebidas</option>
                  <option value="Electrónicos">Electrónicos / Reparación</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  const name = freeSaleName.trim() || 'Artículo Genérico';
                  const price = Number(freeSalePrice) || 0;
                  const qty = Number(freeSaleQty) || 1;
                  if (price <= 0) {
                    toast.error('Ingresa un precio válido mayor a 0.', { title: 'Precio inválido' });
                    return;
                  }
                  const customProd: Product = {
                    id: `FREE-${Date.now()}`,
                    name,
                    price,
                    cost: price * 0.65,
                    stock: 9999,
                    category: freeSaleCategory,
                    emoji: '🏷️',
                    description: 'Venta rápida libre de mostrador',
                    branchesStock: {
                      'branch-centro': 9999,
                      'branch-central': 9999,
                      'branch-norte': 9999,
                    },
                  };
                  setCart((prev) => [...prev, { product: customProd, quantity: qty }]);
                  setIsFreeSaleModalOpen(false);
                  playSound('success');
                  onGrantXp(5);
                }}
                className="bg-[#58cc02] text-white border-b-4 border-[#46a302] hover:bg-[#61e002] active:border-b-0 active:translate-y-[4px] font-black text-xs py-2.5 rounded-xl uppercase cursor-pointer text-center"
              >
                Agregar al Carrito
              </button>
              <button
                type="button"
                onClick={() => setIsFreeSaleModalOpen(false)}
                className="bg-white text-gray-500 border-2 border-gray-200 border-b-4 hover:bg-gray-50 active:translate-y-[2px] active:border-b-2 font-black text-xs py-2.5 rounded-xl uppercase cursor-pointer text-center"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADVANCED POS EXTRA MODAL: EDIT CART ITEM DETAIL */}
      {editingCartItem && (
        <div className="fixed inset-0 z-55 bg-[#141414]/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white border-2 border-[#e5e5e5] border-b-[8px] rounded-3xl p-6 space-y-4 shadow-xl animate-scaleUp text-left text-gray-850 font-sans">
            <div className="flex justify-between items-center border-b border-gray-150 pb-2">
              <span className="font-extrabold text-gray-800 text-sm uppercase flex items-center gap-1.5">
                ⚙️ Editar Artículo: {editingCartItem.product.emoji} {editingCartItem.product.name}
              </span>
              <button
                onClick={() => setEditingCartItem(null)}
                className="text-gray-400 hover:text-gray-650 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Unit Price Overwrite */}
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">
                  Precio Unitario Overwrite ($)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-400 font-extrabold">$</span>
                  <input
                    type="text"
                    value={editCartItemPrice}
                    onChange={(e) => setEditCartItemPrice(e.target.value.replace(/[^0-9.]/g, ''))}
                    className="w-full pl-6 pr-3 py-2 bg-white border-2 border-[#e5e5e5] focus:border-[#58cc02] rounded-xl font-mono font-bold text-sm text-gray-800 outline-none"
                  />
                </div>
                <span className="text-[9px] text-gray-400 font-bold mt-1 block">
                  Precio regular del catálogo: ${editingCartItem.product.price.toFixed(2)}
                </span>
              </div>

              {/* Quantity setting */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">
                    Cantidad Exacta (Manual)
                  </label>
                  <input
                    type="text"
                    value={editCartItemQty}
                    onChange={(e) => setEditCartItemQty(e.target.value.replace(/[^0-9.]/g, ''))}
                    className="w-full pl-3 pr-3 py-2 bg-white border-2 border-[#e5e5e5] focus:border-[#58cc02] rounded-xl font-mono font-bold text-sm text-gray-800 outline-none"
                  />
                  <span className="text-[9px] text-gray-400 font-bold mt-0.5 block">
                    Stock: {editingCartItem.product.stock}
                  </span>
                </div>

                {/* Item-level discount % */}
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">
                    Descuento de Item (%)
                  </label>
                  <input
                    type="text"
                    placeholder="0"
                    min="0"
                    max="100"
                    value={editCartItemDiscount}
                    onChange={(e) => setEditCartItemDiscount(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full pl-3 pr-3 py-2 bg-white border-2 border-red-200 text-red-600 focus:border-red-500 rounded-xl font-mono font-bold text-sm outline-none"
                  />
                  <span className="text-[9px] text-red-400 font-bold mt-0.5 block">
                    Se resta de esta línea únicamente
                  </span>
                </div>
              </div>

              {/* Specific notes */}
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">
                  Notas de Línea / Instrucciones
                </label>
                <input
                  type="text"
                  placeholder="Ej. Sabor fresa / Caja sin abrir / Empaque dañado"
                  value={editCartItemNotes}
                  onChange={(e) => setEditCartItemNotes(e.target.value)}
                  className="w-full pl-3 pr-3 py-2 bg-white border-2 border-[#e5e5e5] focus:border-[#58cc02] rounded-xl font-bold text-xs text-gray-800 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={handleSaveCartItemEdit}
                className="bg-[#58cc02] text-white border-b-4 border-[#46a302] hover:bg-[#61e002] active:border-b-0 active:translate-y-[4px] font-black text-xs py-2.5 rounded-xl uppercase cursor-pointer text-center"
              >
                Guardar Cambios
              </button>
              <button
                type="button"
                onClick={() => setEditingCartItem(null)}
                className="bg-white text-gray-500 border-2 border-gray-200 border-b-4 hover:bg-gray-50 active:translate-y-[2px] active:border-b-2 font-black text-xs py-2.5 rounded-xl uppercase cursor-pointer text-center"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
