/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Product,
  CartItem,
  Transaction,
  User,
  CashShift,
  Customer,
  LegalBillingSettings,
  ExpressEvent,
} from '../../types/index';
import { CATEGORIES, DUO_CHARACTERS, Character } from '../../initialData';
import { Search, Barcode } from 'lucide-react';
import { playSound } from '../../services/sounds';
import FiscalInspectorModal from './components/FiscalInspectorModal';
import PaymentTerminalModal from './components/PaymentTerminalModal';
import { toast } from '../../components/Modal/FlashNotifications';
import { HardwareDeviceSettings } from '../../services/printService';
import {
  DEFAULT_TABLES,
  TableState,
  KitchenOrder,
  ModifierModal,
  SplitBillModal,
  KitchenDisplaySimulator,
} from './HospitalityAddon';

// Subcomponents modularized
import CashDrawer from './components/CashDrawer';
import HospitalityFloorPlan from './components/HospitalityFloorPlan';
import RetailControlDeck from './components/RetailControlDeck';
import ServiceControlDeck from './components/ServiceControlDeck';
import BarcodeScannerModal from './components/BarcodeScannerModal';
import TransactionSuccessSplash from './components/TransactionSuccessSplash';
import CheckoutWizard from './components/CheckoutWizard';
import ProductBasket from './components/ProductBasket';

interface SalesScreenProps {
  products: Product[];
  user: User;
  onGrantXp: (amount: number) => void;
  onAddTransaction: (txn: Transaction) => void;
  onDecreaseStock: (productId: string, qty: number) => void;
  activeShift: CashShift | null;
  shiftHistory: CashShift[];
  onOpenShift: (amount: number) => void;
  onCloseShift: (actualCash: number, expectedCash: number, difference: number, notes: string) => void;
  onAddShiftMovement: (type: 'in' | 'out', amount: number, reason: string) => void;
  customers: Customer[];
  billingSettings: LegalBillingSettings;
  hardwareSettings: HardwareDeviceSettings;
  onOpenHardwareSettings: () => void;
  onUpdateCustomer: (customer: Customer) => void;
  exchangeRate?: number;
  activeRateType?: 'oficial' | 'paralelo';
  exchangeRates?: { oficial: number; paralelo: number };
  activeEvent?: ExpressEvent | null;
  onTriggerEventProgress?: (type: 'scan' | 'loyalty' | 'sale') => void;
}

export default function SalesScreen({
  products,
  user,
  onGrantXp,
  onAddTransaction,
  onDecreaseStock,
  activeShift,
  shiftHistory,
  onOpenShift,
  onCloseShift,
  onAddShiftMovement,
  customers,
  billingSettings,
  hardwareSettings,
  onOpenHardwareSettings,
  onUpdateCustomer,
  exchangeRate = 53.05,
  activeRateType = 'oficial',
  exchangeRates = { oficial: 53.05, paralelo: 57.1 },
  activeEvent,
  onTriggerEventProgress,
}: SalesScreenProps) {
  const activeChar: Character = DUO_CHARACTERS[user.avatar] || DUO_CHARACTERS.duo;

  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');

  // Promocode States
  const [discountPercent, setDiscountPercent] = useState(0);
  const [promoMessage, setPromoMessage] = useState('');

  // Modals & Navigation triggers
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'points' | 'credit'>('cash');
  const [cashReceived, setCashReceived] = useState<string>('');
  const [isTerminalModalOpen, setIsTerminalModalOpen] = useState(false);

  // Hospitality F&B states
  const isHospitalityActive =
    billingSettings?.businessProfile === 'gastronomy' || billingSettings?.businessProfile === undefined;
  const [tables, setTables] = useState<TableState[]>(() => {
    try {
      const saved = localStorage.getItem('duo_pos_tables');
      return saved ? JSON.parse(saved) : DEFAULT_TABLES;
    } catch {
      return DEFAULT_TABLES;
    }
  });
  const [activeTableId, setActiveTableId] = useState<string | null>(null);
  const [activeWaiterName, setActiveWaiterName] = useState<string>('');
  const [kitchenOrders, setKitchenOrders] = useState<KitchenOrder[]>(() => {
    try {
      const saved = localStorage.getItem('duo_pos_kitchen_orders');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isKdsOpen, setIsKdsOpen] = useState(false);
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [modifierTargetItem, setModifierTargetItem] = useState<CartItem | null>(null);

  // Auto persist F&B data inside LocalStorage
  useEffect(() => {
    localStorage.setItem('duo_pos_tables', JSON.stringify(tables));
  }, [tables]);

  useEffect(() => {
    localStorage.setItem('duo_pos_kitchen_orders', JSON.stringify(kitchenOrders));
  }, [kitchenOrders]);

  // Loyalty customer states
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [useGemsDiscount, setUseGemsDiscount] = useState(false);

  // Advanced Invoicing request states
  const [requestLegalInvoice, setRequestLegalInvoice] = useState(false);
  const [invoiceFiscalName, setInvoiceFiscalName] = useState('');
  const [invoiceTaxId, setInvoiceTaxId] = useState('');
  const [invoicePostalCode, setInvoicePostalCode] = useState('');
  const [invoiceRegime, setInvoiceRegime] = useState('626 - Régimen Simplificado de Confianza (RESICO)');
  const [invoiceUseCFDI, setInvoiceUseCFDI] = useState('G03 - Gastos en general');
  const [invoicePaymentForm, setInvoicePaymentForm] = useState('01 - Efectivo');

  // Custom local state for specialized business profiles
  const [rawBarInput, setRawBarInput] = useState('');
  const [svcName, setSvcName] = useState('');
  const [svcPrice, setSvcPrice] = useState('');

  // Held tickets (Tickets en Espera) States
  const [suspendedTickets, setSuspendedTickets] = useState<
    {
      id: string;
      alias: string;
      cart: CartItem[];
      customer: Customer | null;
      discountPercent: number;
      useGemsDiscount: boolean;
      savedAt: string;
    }[]
  >(() => {
    try {
      const saved = localStorage.getItem('duo_pos_suspended_tickets');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('duo_pos_suspended_tickets', JSON.stringify(suspendedTickets));
  }, [suspendedTickets]);

  // Mixed Payment States
  const [isMixedPayment, setIsMixedPayment] = useState(false);
  const [mixedCashAmount, setMixedCashAmount] = useState('');

  // Sync client profile details to invoice fields when linked
  useEffect(() => {
    if (selectedCustomer) {
      setInvoiceFiscalName(selectedCustomer.fiscalName || selectedCustomer.name);
      setInvoiceTaxId(selectedCustomer.taxId || 'XAXX010101000');
      setInvoicePostalCode(selectedCustomer.postalCode || '06700');
      if (selectedCustomer.regime) {
        setInvoiceRegime(selectedCustomer.regime);
      }
      if (billingSettings?.automaticMockInvoicing) {
        setRequestLegalInvoice(true);
      }
    } else {
      setRequestLegalInvoice(false);
      setInvoiceFiscalName('');
      setInvoiceTaxId('');
      setInvoicePostalCode('');
    }
  }, [selectedCustomer, billingSettings?.automaticMockInvoicing]);

  // Successful transaction review popup
  const [celebrateTxn, setCelebrateTxn] = useState<Transaction | null>(null);
  const [selectedTxnForActiveInvoice, setSelectedTxnForActiveInvoice] = useState<Transaction | null>(null);

  // Webcam Hardware Scanner configurations
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Global Physical Barcode / USB Scanner keypress interceptor
  useEffect(() => {
    let rawBuffer = '';
    let lastKeyTime = Date.now();

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') return;

      const now = Date.now();
      const diff = now - lastKeyTime;
      lastKeyTime = now;

      if (diff > 120) {
        rawBuffer = '';
      }

      if (e.key === 'Enter') {
        if (rawBuffer.length >= 4) {
          const found = products.find((p) => p.barcode === rawBuffer || p.id === rawBuffer);
          if (found) {
            e.preventDefault();
            const inCartQty = cart.find((it) => it.product.id === found.id)?.quantity || 0;
            if (found.stock > inCartQty) {
              setCart((currCart) => {
                const existingIndex = currCart.findIndex((it) => it.product.id === found.id);
                if (existingIndex >= 0) {
                  const updated = [...currCart];
                  updated[existingIndex].quantity += 1;
                  return updated;
                } else {
                  return [...currCart, { product: found, quantity: 1 }];
                }
              });
              playSound('success');
              setIsMobileCartOpen(true);
              toast.success(`Código de barras escaneado: ${found.emoji} ${found.name}`, {
                title: 'Escáner Inteligente 🔍',
              });
              if (onTriggerEventProgress) onTriggerEventProgress('scan');

              setPromoMessage(`⚡ ¡Escaneado: ${found.name} (EAN-${rawBuffer})!`);
              setTimeout(() => setPromoMessage(''), 3000);
            } else {
              playSound('error');
              toast.error(`Sin stock disponible para ${found.name}`, { title: 'Fallo de Escáner 🔍' });
              setPromoMessage(`⛔ Stock insuficiente para: ${found.name}`);
              setTimeout(() => setPromoMessage(''), 3000);
            }
          }
        }
        rawBuffer = '';
      } else {
        if (e.key.length === 1) {
          rawBuffer += e.key;
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [products, cart]);

  // Trigger scanning feedback manually
  const simulateBarcodeScan = (product: Product) => {
    const inCartQty = cart.find((it) => it.product.id === product.id)?.quantity || 0;
    if (product.stock > inCartQty) {
      addToCart(product);
      playSound('success');
      if (onTriggerEventProgress) onTriggerEventProgress('scan');
      setPromoMessage(`⚡ Escáner: ${product.name}`);
      setTimeout(() => setPromoMessage(''), 2500);
    } else {
      playSound('error');
      toast.error(`Stock insuficiente para agregar ${product.name}`, { title: 'Fallo de Escáner 📷' });
    }
  };

  // Cart operations
  const addToCart = (prod: Product) => {
    if (prod.stock <= 0) {
      playSound('error');
      return;
    }

    const existingIndex = cart.findIndex((it) => it.product.id === prod.id);
    const existingQty = existingIndex >= 0 ? cart[existingIndex].quantity : 0;

    if (existingQty >= prod.stock) {
      playSound('error');
      toast.error(
        `Lo sentimos, no puedes agregar más de este producto. El stock total disponible es de ${prod.stock} unidades.`,
        { title: 'Stock Insuficiente' },
      );
      return;
    }

    playSound('click');
    if (existingIndex >= 0) {
      const updated = [...cart];
      updated[existingIndex].quantity += 1;
      setCart(updated);
      toast.success(`Incrementado ${prod.emoji} ${prod.name} en el carrito.`, {
        title: 'Carrito de Compras 🛒',
        duration: 1500,
      });
    } else {
      setCart([...cart, { product: prod, quantity: 1 }]);
      toast.success(`Agregado ${prod.emoji} ${prod.name} al carrito.`, {
        title: 'Carrito de Compras 🛒',
        duration: 1500,
      });
    }
    setIsMobileCartOpen(true);
  };

  const removeFromCart = (prodId: string) => {
    const existingIndex = cart.findIndex((it) => it.product.id === prodId);
    if (existingIndex < 0) return;

    playSound('click');
    const updated = [...cart];
    const prod = updated[existingIndex].product;
    if (updated[existingIndex].quantity > 1) {
      updated[existingIndex].quantity -= 1;
      setCart(updated);
      toast.info(`Reducido ${prod.emoji} ${prod.name} del carrito.`, {
        title: 'Carrito de Compras 🛒',
        duration: 1500,
      });
    } else {
      updated.splice(existingIndex, 1);
      setCart(updated);
      toast.warning(`Removido ${prod.emoji} ${prod.name} del carrito.`, {
        title: 'Carrito de Compras 🛒',
        duration: 1500,
      });
    }
  };

  const removeAllFromCart = (prodId: string) => {
    playSound('swoosh');
    const prod = cart.find((it) => it.product.id === prodId)?.product;
    setCart(cart.filter((it) => it.product.id !== prodId));
    if (prod) {
      toast.warning(`Removido ${prod.emoji} ${prod.name} por completo.`, {
        title: 'Carrito de Compras 🛒',
        duration: 1500,
      });
    }
  };

  // Synchronize payment forms based on selected method
  useEffect(() => {
    if (paymentMethod === 'cash') {
      setInvoicePaymentForm('01 - Efectivo');
    } else if (paymentMethod === 'card') {
      setInvoicePaymentForm('04 - Tarjeta de crédito');
    } else {
      setInvoicePaymentForm('17 - Compensación');
    }
  }, [paymentMethod]);

  const getTaxRateForCategory = (category: string) => {
    if (!billingSettings) return 16;
    const override = billingSettings.categoryOverrides.find((o) => o.category.toLowerCase() === category.toLowerCase());
    return override ? override.rate : billingSettings.generalTaxRate;
  };

  // Live Math calculations
  const subtotal = cart.reduce((acc, curr) => {
    const addonsTotal = curr.addons ? curr.addons.reduce((sum, add) => sum + add.price, 0) : 0;
    const priceToUse = curr.customPrice !== undefined ? curr.customPrice : curr.product.price;
    const itemBaseTotal = (priceToUse + addonsTotal) * curr.quantity;
    const itemLevelDiscount = curr.discountPercent ? (itemBaseTotal * curr.discountPercent) / 100 : 0;
    return acc + (itemBaseTotal - itemLevelDiscount);
  }, 0);

  const basePromoDiscount = (subtotal * discountPercent) / 100;
  const remainingValueForGems = Math.max(0, subtotal - basePromoDiscount);

  let gemsToRedeem = 0;
  let gemsDiscount = 0;

  if (selectedCustomer && useGemsDiscount) {
    const maxRedeemableUnits = Math.min(Math.floor(selectedCustomer.gems / 10), Math.floor(remainingValueForGems));
    gemsToRedeem = maxRedeemableUnits * 10;
    gemsDiscount = maxRedeemableUnits * 1.0;
  }

  const discountAmount = basePromoDiscount + gemsDiscount;
  const netBeforeTaxCalculation = Math.max(0, subtotal - discountAmount);
  const discountRatio = subtotal > 0 ? discountAmount / subtotal : 0;

  let computedTaxSum = 0;
  let computedSubtotalSum = 0;

  cart.forEach((item) => {
    const addonsTotal = item.addons ? item.addons.reduce((sum, add) => sum + add.price, 0) : 0;
    const priceToUse = item.customPrice !== undefined ? item.customPrice : item.product.price;
    const itemPriceWithAddons = priceToUse + addonsTotal;
    const itemGrossInitial = itemPriceWithAddons * item.quantity;
    const itemLevelDiscount = item.discountPercent ? (itemGrossInitial * item.discountPercent) / 100 : 0;
    const itemGrossTotal = Math.max(0, itemGrossInitial - itemLevelDiscount);
    const itemDiscount = itemGrossTotal * discountRatio;
    const itemRemaining = Math.max(0, itemGrossTotal - itemDiscount);
    const itemTaxRate = getTaxRateForCategory(item.product.category);

    if (billingSettings.taxIncludedInPrice) {
      const netVal = itemRemaining / (1 + itemTaxRate / 100);
      const taxVal = itemRemaining - netVal;
      computedSubtotalSum += netVal;
      computedTaxSum += taxVal;
    } else {
      const netVal = itemRemaining;
      const taxVal = netVal * (itemTaxRate / 100);
      computedSubtotalSum += netVal;
      computedTaxSum += taxVal;
    }
  });

  const taxAmount = computedTaxSum;
  const subtotalDesglosado = computedSubtotalSum;
  const totalAmount = billingSettings.taxIncludedInPrice
    ? netBeforeTaxCalculation
    : netBeforeTaxCalculation + taxAmount;

  const cashNum = Number(cashReceived) || 0;
  const changeDue = Math.max(0, cashNum - totalAmount);

  const subtotalVES = subtotal * exchangeRate;
  const discountAmountVES = discountAmount * exchangeRate;
  const taxAmountVES = taxAmount * exchangeRate;
  const totalAmountVES = totalAmount * exchangeRate;
  const changeDueVES = changeDue * exchangeRate;

  // Cashier Hotkeys keydown listener
  useEffect(() => {
    const handleCashierHotkeys = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.getAttribute('contenteditable') === 'true')
      ) {
        return;
      }

      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        const searchInput = document.getElementById('barcode-or-search-input');
        if (searchInput) {
          searchInput.focus();
          (searchInput as any).select();
          playSound('click');
        }
      } else if (e.key === 'x' || e.key === 'X') {
        e.preventDefault();
        if (cart.length > 0) {
          const confirmClear = confirm('¿Deseas vaciar por completo el carrito actual?');
          if (confirmClear) {
            setCart([]);
            setSelectedCustomer(null);
            setDiscountPercent(0);
            setUseGemsDiscount(false);
            playSound('swoosh');
          }
        }
      } else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        if (cart.length > 0) {
          handleOpenCheckout();
        }
      }
    };

    window.addEventListener('keydown', handleCashierHotkeys);
    return () => {
      window.removeEventListener('keydown', handleCashierHotkeys);
    };
  }, [cart, totalAmount, selectedCustomer, discountPercent, useGemsDiscount]);

  const handleSaveModifiers = (notes: string, addons: { name: string; price: number }[]) => {
    if (!modifierTargetItem) return;
    setCart((curr) =>
      curr.map((item) => {
        if (item.product.id === modifierTargetItem.product.id) {
          return { ...item, notes, addons };
        }
        return item;
      }),
    );
    if (activeTableId) {
      setTables((curr) =>
        curr.map((t) => {
          if (t.id === activeTableId) {
            return {
              ...t,
              cart: t.cart.map((item) => {
                if (item.product.id === modifierTargetItem.product.id) {
                  return { ...item, notes, addons };
                }
                return item;
              }),
            };
          }
          return t;
        }),
      );
    }
    setModifierTargetItem(null);
  };

  const handleCompleteSplitPayment = (paidTotal: number, updatedCart?: CartItem[]) => {
    const splitTxn: Transaction = {
      id: `TXN-SPLIT-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toISOString(),
      items: (updatedCart ? cart.filter((it) => !updatedCart.some((u) => u.product.id === it.product.id)) : cart).map(
        (it) => ({
          productId: it.product.id,
          name: `${it.product.name} (Modo Split)`,
          price: it.product.price,
          emoji: it.product.emoji,
          quantity: it.quantity,
          taxRateApplied: getTaxRateForCategory(it.product.category),
          notes: it.notes,
          addons: it.addons,
        }),
      ),
      subtotal: paidTotal * 0.92,
      tax: paidTotal * 0.08,
      discount: 0,
      total: paidTotal,
      paymentMethod: 'card',
      employeeName: user.username,
      xpGained: 5,
      tableId: activeTableId || undefined,
      tableName: activeTableId ? tables.find((t) => t.id === activeTableId)?.name : undefined,
      waiterName: activeWaiterName || undefined,
    };

    onAddTransaction(splitTxn);
    onGrantXp(5);
    toast.success(`Cobro split recibido: $${paidTotal.toFixed(2)} USD. ¡Ganaste +5 XP! 💳`, {
      title: 'Cobro de Cuenta 💔',
    });

    if (updatedCart) {
      setCart(updatedCart);
      if (activeTableId) {
        setTables((prev) =>
          prev.map((t) => {
            if (t.id === activeTableId) {
              return {
                ...t,
                cart: updatedCart,
                status: updatedCart.length > 0 ? 'occupied' : 'free',
                occupiedSince: updatedCart.length > 0 ? t.occupiedSince : undefined,
              };
            }
            return t;
          }),
        );
      }
    } else {
      toast.info(`Cobrado Split Equitativo: $${paidTotal.toFixed(2)} USD.`, { title: 'Cobro de Cuenta 💳' });
    }

    playSound('kaching');
  };

  const handleDispatchKitchenOrder = (orderId: string) => {
    setKitchenOrders((prev) => prev.filter((o) => o.id !== orderId));
  };

  const handleOpenCheckout = () => {
    if (cart.length === 0) return;
    setCashReceived(Math.ceil(totalAmount).toString());
    setIsCheckoutOpen(true);
  };

  const submitCheckout = (cardDetailsFromTerminal?: any) => {
    if (isMixedPayment) {
      const cashPart = Number(mixedCashAmount) || 0;
      if (cashPart < 0) {
        toast.error('El monto en efectivo del pago mixto no puede ser negativo.', { title: 'Error de Pago Mixto' });
        return;
      }
      if (cashPart > totalAmount) {
        toast.error(
          `El monto en efectivo ($${cashPart.toFixed(2)}) supera el total de la compra ($${totalAmount.toFixed(2)}). Desactiva "Pago Mixto" y usa la pestaña estándar de "Efectivo".`,
          { title: 'Error de Pago Mixto' },
        );
        return;
      }
    } else {
      if (paymentMethod === 'cash' && cashNum < totalAmount) {
        toast.error(
          `El efectivo recibido ($${cashNum}) es insuficiente para saldar el total de $${totalAmount.toFixed(2)}.`,
          { title: 'Efectivo Insuficiente' },
        );
        return;
      }

      if (paymentMethod === 'credit') {
        if (!selectedCustomer) {
          toast.error(
            'Para cobrar bajo la línea de crédito ("Fiado"), primero debes asociar un cliente en la barra del carrito.',
            { title: 'Crédito no disponible' },
          );
          return;
        }
        const limit = selectedCustomer.creditLimit || 0;
        const used = selectedCustomer.creditUsed || 0;
        const available = limit - used;

        if (limit === 0) {
          toast.error(
            `El cliente ${selectedCustomer.name} no cuenta con línea de crédito activa ("Fiado"). Puedes autorizarla ingresando un límite en la pestaña Clientes.`,
            { title: 'Sin Línea de Crédito' },
          );
          return;
        }
        if (totalAmount > available) {
          toast.error(
            `Límite de crédito disponible superado. Disponible: $${available.toFixed(2)}. Total: $${totalAmount.toFixed(2)}.`,
            { title: 'Crédito Insuficiente' },
          );
          return;
        }
      }

      if (paymentMethod === 'card' && hardwareSettings.paymentTerminal?.enabled && !cardDetailsFromTerminal) {
        setIsTerminalModalOpen(true);
        return;
      }
    }

    playSound('kaching');

    let xpGranted = Math.max(10, Math.round(totalAmount / 4));
    const newTxnId = `TXN-${Math.floor(1000 + Math.random() * 9000)}`;

    let calculatedInvoice = undefined;
    if (requestLegalInvoice && invoiceFiscalName && invoiceTaxId) {
      const mockUuid =
        'DUO00000-' +
        Math.random().toString(36).substring(2, 6).toUpperCase() +
        '-' +
        Math.floor(1000 + Math.random() * 9000) +
        '-4FFF-ACCB-' +
        Math.random().toString(36).substring(2, 14).toUpperCase();
      const nextNo = billingSettings
        ? `${billingSettings.invoicePrefix}${billingSettings.nextInvoiceNumber}`
        : `DUO-FAC-${Math.floor(10000 + Math.random() * 90000)}`;
      const duoSeal =
        'SelloSAT|' +
        activeChar.avatar +
        '|' +
        Math.random().toString(36).substring(2, 15).toUpperCase() +
        '==' +
        '|' +
        user.username.toUpperCase();

      calculatedInvoice = {
        uuid: mockUuid,
        invoiceNo: nextNo,
        fiscalName: invoiceFiscalName.toUpperCase(),
        taxId: invoiceTaxId.toUpperCase(),
        regime: invoiceRegime,
        postalCode: invoicePostalCode,
        certifiedAt: new Date().toISOString(),
        satSignature: duoSeal,
        paymentForm: isMixedPayment ? '99 - Por definir (Pago Mixto)' : invoicePaymentForm,
        useCFDI: invoiceUseCFDI,
      };
    }

    const newTransaction: Transaction = {
      id: newTxnId,
      date: new Date().toISOString(),
      items: cart.map((it) => {
        const itemAddonsPrice = it.addons ? it.addons.reduce((sum, a) => sum + a.price, 0) : 0;
        const itemUnitPrice = it.customPrice !== undefined ? it.customPrice : it.product.price;
        const baseItemTotal = itemUnitPrice + itemAddonsPrice;
        const finalCalculatedItemPrice = it.discountPercent
          ? baseItemTotal * (1 - it.discountPercent / 100)
          : baseItemTotal;
        return {
          productId: it.product.id,
          name: it.discountPercent ? `${it.product.name} (-${it.discountPercent}% desc)` : it.product.name,
          price: finalCalculatedItemPrice,
          emoji: it.product.emoji,
          quantity: it.quantity,
          taxRateApplied: getTaxRateForCategory(it.product.category),
          notes: it.notes,
          addons: it.addons,
        };
      }),
      subtotal: subtotalDesglosado,
      tax: taxAmount,
      discount: discountAmount,
      total: totalAmount,
      paymentMethod: isMixedPayment ? 'cash' : paymentMethod,
      isMixedPayment: isMixedPayment || undefined,
      mixedCashAmount: isMixedPayment ? Number(mixedCashAmount) || 0 : undefined,
      mixedCardAmount: isMixedPayment ? Math.max(0, totalAmount - (Number(mixedCashAmount) || 0)) : undefined,
      employeeName: user.username,
      xpGained: xpGranted,
      customerId: selectedCustomer?.id || undefined,
      gemsGained: selectedCustomer ? Math.max(1, Math.floor(totalAmount)) : undefined,
      gemsRedeemed: gemsToRedeem > 0 ? gemsToRedeem : undefined,
      tableId: activeTableId || undefined,
      tableName: activeTableId ? tables.find((t) => t.id === activeTableId)?.name : undefined,
      waiterName: activeWaiterName || undefined,
      isInvoiceRequested: requestLegalInvoice,
      invoiceData: calculatedInvoice,
      cardPaymentDetails: cardDetailsFromTerminal || undefined,
    };

    cart.forEach((item) => {
      onDecreaseStock(item.product.id, item.quantity);
    });

    onAddTransaction(newTransaction);
    onGrantXp(xpGranted);

    toast.achievement(
      `Venta de $${newTransaction.total.toFixed(2)} USD procesada correctamente. ¡Ganaste +${xpGranted} XP! 💎`,
      { title: 'Ticket Terminado 🎉' },
    );

    if (activeTableId) {
      setTables((prev) =>
        prev.map((t) => {
          if (t.id === activeTableId) {
            return {
              ...t,
              status: 'free',
              waiterName: '',
              cart: [],
              customer: null,
              occupiedSince: undefined,
            };
          }
          return t;
        }),
      );
      setActiveTableId(null);
      setActiveWaiterName('');
    }

    setCelebrateTxn(newTransaction);
    setIsCheckoutOpen(false);

    // Clear cart
    setCart([]);
    setDiscountPercent(0);
    setSelectedCustomer(null);
    setUseGemsDiscount(false);
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'Todos' || p.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6 animate-fadeIn font-sans p-1 md:p-3 pb-12">
      <CashDrawer
        user={user}
        activeShift={activeShift}
        shiftHistory={shiftHistory}
        onOpenShift={onOpenShift}
        onCloseShift={onCloseShift}
        onAddShiftMovement={onAddShiftMovement}
      />

      {activeShift && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT TWO COLUMNS: Simulators, Search & Grid */}
          <div className="lg:col-span-2 space-y-4">
            <HospitalityFloorPlan
              isHospitalityActive={isHospitalityActive}
              tables={tables}
              activeTableId={activeTableId}
              activeWaiterName={activeWaiterName}
              cart={cart}
              kitchenOrders={kitchenOrders}
              setTables={setTables}
              setActiveTableId={setActiveTableId}
              setActiveWaiterName={setActiveWaiterName}
              setCart={setCart}
              setSelectedCustomer={setSelectedCustomer}
              setIsKdsOpen={setIsKdsOpen}
            />

            <RetailControlDeck
              isHospitalityActive={isHospitalityActive}
              billingSettings={billingSettings}
              rawBarInput={rawBarInput}
              setRawBarInput={setRawBarInput}
              products={products}
              simulateBarcodeScan={simulateBarcodeScan}
            />

            <ServiceControlDeck
              isHospitalityActive={isHospitalityActive}
              billingSettings={billingSettings}
              svcName={svcName}
              setSvcName={setSvcName}
              svcPrice={svcPrice}
              setSvcPrice={setSvcPrice}
              setCart={setCart}
              setPromoMessage={setPromoMessage}
            />

            {/* MINIMARKET BANNER BLOCK */}
            {billingSettings?.businessProfile === 'market' && (
              <div className="bg-white border-2 border-indigo-200 border-b-[6px] rounded-3xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 animate-fadeIn text-gray-805">
                <div className="flex items-center gap-3">
                  <span className="p-2.5 bg-indigo-55 bg-indigo-50 border border-indigo-200 rounded-2xl text-2xl select-none leading-none flex items-center justify-center">
                    🛒
                  </span>
                  <div className="text-left">
                    <h4 className="font-extrabold text-xs uppercase text-gray-800 leading-none">
                      Modo Abastos & Minimarket
                    </h4>
                    <p className="text-[10px] text-indigo-700 font-bold uppercase mt-1 leading-normal tracking-wider">
                      Venta Directa de Catálogo Activa (Sin Módulos Extra de Servicio o Mesas)
                    </p>
                  </div>
                </div>
                <span className="bg-indigo-500 text-white text-[9px] font-black uppercase px-2.5 py-1 rounded-md leading-none select-none tracking-widest shrink-0">
                  100% Despejado
                </span>
              </div>
            )}

            {/* Search query block */}
            <div className="bg-white border-2 border-[#e5e5e5] border-b-[6px] rounded-3xl p-4 md:p-5 flex flex-col md:flex-row gap-3 items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto items-stretch sm:items-center">
                <div className="relative flex-1 md:w-64">
                  <span className="absolute left-3.5 top-3 text-gray-400">
                    <Search size={18} />
                  </span>
                  <input
                    id="barcode-or-search-input"
                    type="text"
                    placeholder="Buscar artículo..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border-2 border-[#e5e5e5] rounded-xl font-bold text-gray-750 outline-none focus:border-[#58cc02] focus:bg-white transition-all text-xs"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsScannerOpen(true);
                    playSound('click');
                  }}
                  className="bg-[#1cb0f6] text-white border-b-4 border-[#128bd0] hover:bg-[#34beff] active:translate-y-[2px] active:border-b-0 py-2 px-3 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-1.5 cursor-pointer select-none"
                  title="Escanear Código de Barras (Cámara y Manual)"
                >
                  <Barcode size={14} />
                  <span>Escáner</span>
                </button>
              </div>

              {/* Speedy Category buttons slider */}
              <div className="flex gap-1 overflow-x-auto w-full md:w-auto py-1 scrollbar-thin">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`py-1.5 px-3 rounded-lg font-black text-[10px] md:text-xs tracking-wider uppercase border-b-2 cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-white text-[#58cc02] border-[#58cc02] border border-b-2'
                        : 'bg-white text-[#949494] border border-gray-150 hover:bg-gray-50'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Product Items Selection Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredProducts.map((prod) => {
                const inCartQty = cart.find((it) => it.product.id === prod.id)?.quantity || 0;
                const hasAvailableStock = prod.stock > inCartQty;
                const isOutOfStockAll = prod.stock === 0;

                return (
                  <button
                    key={prod.id}
                    disabled={!hasAvailableStock}
                    onClick={() => addToCart(prod)}
                    className={`bg-white border-2 rounded-2xl p-4 flex flex-col items-center justify-between h-44 text-center group transition-all relative select-none cursor-pointer ${
                      !hasAvailableStock
                        ? 'opacity-65 border-gray-150 border-b-2 bg-gray-50 cursor-not-allowed'
                        : 'border-[#e5e5e5] border-b-[6px] hover:border-[#58cc02] active:translate-y-[4px] active:border-b-0'
                    }`}
                  >
                    <span
                      className={`absolute top-2 right-2 text-[9px] px-1.5 py-0.5 rounded-md font-black ${
                        isOutOfStockAll
                          ? 'bg-red-150 text-red-600 border border-red-200'
                          : prod.stock - inCartQty <= 3
                            ? 'bg-orange-100 text-orange-600 border border-orange-200'
                            : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      Stock: {prod.stock - inCartQty}
                    </span>

                    <div className="text-4xl filter drop-shadow-sm mt-2 select-none transform group-hover:scale-110 duration-100 min-h-[40px] flex items-center justify-center">
                      {isOutOfStockAll ? '😭' : prod.emoji || '📦'}
                    </div>

                    <div className="space-y-0.5 w-full">
                      <h5 className="font-extrabold text-xs text-gray-800 line-clamp-1 truncate leading-tight">
                        {prod.name}
                      </h5>
                      <p className="text-[10px] text-gray-400 font-extrabold pb-1">{prod.category}</p>
                      <div className="flex flex-col bg-green-50/50 py-1 px-1 rounded-lg border border-green-150 w-full select-none">
                        <span className="text-xs font-black text-[#58cc02] block leading-tight">
                          ${prod.price.toFixed(2)}
                        </span>
                        <span className="text-[9px] font-bold text-gray-400 block leading-tight mt-0.5">
                          {(prod.price * exchangeRate).toLocaleString('es-VE', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{' '}
                          Bs.
                        </span>
                      </div>
                    </div>

                    {inCartQty > 0 && (
                      <div className="absolute top-2 left-2 bg-[#1cb0f6] text-white border-b-2 border-[#1899d6] text-[10px] w-6 h-6 rounded-full flex items-center justify-center font-black animate-scaleUp">
                        +{inCartQty}
                      </div>
                    )}

                    {!hasAvailableStock && (
                      <div className="absolute inset-x-2 bottom-2 bg-red-50 border border-red-200 text-red-500 font-black text-[9px] uppercase py-0.5 rounded-md">
                        {isOutOfStockAll ? 'Agotado' : 'Límite alcanzado'}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT ONE COLUMN: Cart Panel & Slide drawers */}
          <ProductBasket
            cart={cart}
            setCart={setCart}
            selectedCustomer={selectedCustomer}
            setSelectedCustomer={setSelectedCustomer}
            useGemsDiscount={useGemsDiscount}
            setUseGemsDiscount={setUseGemsDiscount}
            discountPercent={discountPercent}
            setDiscountPercent={setDiscountPercent}
            suspendedTickets={suspendedTickets}
            setSuspendedTickets={setSuspendedTickets}
            isMobileCartOpen={isMobileCartOpen}
            setIsMobileCartOpen={setIsMobileCartOpen}
            isCheckoutOpen={isCheckoutOpen}
            setIsCheckoutOpen={setIsCheckoutOpen}
            totalAmount={totalAmount}
            subtotal={subtotal}
            discountAmount={discountAmount}
            taxAmount={taxAmount}
            subtotalVES={subtotalVES}
            discountAmountVES={discountAmountVES}
            taxAmountVES={taxAmountVES}
            totalAmountVES={totalAmountVES}
            exchangeRate={exchangeRate}
            gemsToRedeem={gemsToRedeem}
            gemsDiscount={gemsDiscount}
            isHospitalityActive={isHospitalityActive}
            activeTableId={activeTableId}
            setActiveTableId={setActiveTableId}
            activeWaiterName={activeWaiterName}
            setActiveWaiterName={setActiveWaiterName}
            tables={tables}
            setTables={setTables}
            kitchenOrders={kitchenOrders}
            setKitchenOrders={setKitchenOrders}
            setIsSplitModalOpen={setIsSplitModalOpen}
            setModifierTargetItem={setModifierTargetItem}
            billingSettings={billingSettings}
            hardwareSettings={hardwareSettings}
            customers={customers}
            products={products}
            onTriggerEventProgress={onTriggerEventProgress}
            onOpenCheckout={handleOpenCheckout}
            onGrantXp={onGrantXp}
            addToCart={addToCart}
            removeFromCart={removeFromCart}
            removeAllFromCart={removeAllFromCart}
          />
        </div>
      )}

      <CheckoutWizard
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        user={user}
        totalAmount={totalAmount}
        totalAmountVES={totalAmountVES}
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
        selectedCustomer={selectedCustomer}
        cashReceived={cashReceived}
        setCashReceived={setCashReceived}
        cashNum={cashNum}
        changeDue={changeDue}
        changeDueVES={changeDueVES}
        exchangeRate={exchangeRate}
        isMixedPayment={isMixedPayment}
        setIsMixedPayment={setIsMixedPayment}
        mixedCashAmount={mixedCashAmount}
        setMixedCashAmount={setMixedCashAmount}
        requestLegalInvoice={requestLegalInvoice}
        setRequestLegalInvoice={setRequestLegalInvoice}
        invoiceFiscalName={invoiceFiscalName}
        setInvoiceFiscalName={setInvoiceFiscalName}
        invoiceTaxId={invoiceTaxId}
        setInvoiceTaxId={setInvoiceTaxId}
        invoicePostalCode={invoicePostalCode}
        setInvoicePostalCode={setInvoicePostalCode}
        invoiceRegime={invoiceRegime}
        setInvoiceRegime={setInvoiceRegime}
        invoiceUseCFDI={invoiceUseCFDI}
        setInvoiceUseCFDI={setInvoiceUseCFDI}
        submitCheckout={submitCheckout}
        billingSettings={billingSettings}
        gemsToRedeem={gemsToRedeem}
        gemsDiscount={gemsDiscount}
      />

      <TransactionSuccessSplash
        celebrateTxn={celebrateTxn}
        setCelebrateTxn={setCelebrateTxn}
        user={user}
        billingSettings={billingSettings}
        hardwareSettings={hardwareSettings}
        setSelectedTxnForActiveInvoice={setSelectedTxnForActiveInvoice}
        onGrantXp={onGrantXp}
        exchangeRate={exchangeRate}
        setPromoMessage={setPromoMessage}
      />

      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        products={products}
        simulateBarcodeScan={simulateBarcodeScan}
      />

      {isTerminalModalOpen && (
        <PaymentTerminalModal
          isOpen={isTerminalModalOpen}
          onClose={() => setIsTerminalModalOpen(false)}
          totalAmount={totalAmount}
          hardwareSettings={hardwareSettings}
          onSuccess={(cardDetails) => {
            setIsTerminalModalOpen(false);
            submitCheckout(cardDetails);
          }}
          onGrantXp={onGrantXp}
        />
      )}

      {selectedTxnForActiveInvoice && (
        <FiscalInspectorModal
          transaction={selectedTxnForActiveInvoice}
          billingSettings={billingSettings}
          onClose={() => setSelectedTxnForActiveInvoice(null)}
        />
      )}

      {/* Hospitality extra modals */}
      {modifierTargetItem && (
        <ModifierModal
          isOpen={!!modifierTargetItem}
          cartItem={modifierTargetItem}
          onClose={() => setModifierTargetItem(null)}
          onSave={handleSaveModifiers}
        />
      )}

      {isSplitModalOpen && (
        <SplitBillModal
          isOpen={isSplitModalOpen}
          onClose={() => setIsSplitModalOpen(false)}
          cart={cart}
          totalAmount={totalAmount}
          onCompleteSplit={handleCompleteSplitPayment}
        />
      )}

      {isKdsOpen && (
        <KitchenDisplaySimulator
          isOpen={isKdsOpen}
          onClose={() => setIsKdsOpen(false)}
          kitchenOrders={kitchenOrders}
          onDispatchOrder={handleDispatchKitchenOrder}
          onGrantXp={onGrantXp}
        />
      )}
    </div>
  );
}
