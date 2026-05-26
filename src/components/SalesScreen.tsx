/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Product, CartItem, Transaction, User, CashShift, CashMovement, Customer, LegalBillingSettings, ExpressEvent } from '../types';
import { CATEGORIES, DUO_CHARACTERS, Character } from '../initialData';
import { Search, ShoppingCart, Trash2, Plus, Minus, Tag, Check, Award, Flame, Sparkles, CreditCard, DollarSign, Wallet, Barcode, Camera, RefreshCw, Users, HelpCircle, Gem, Cpu, ChefHat } from 'lucide-react';
import { playSound } from '../utils/sounds';
import FiscalInspectorModal from './FiscalInspectorModal';
import PaymentTerminalModal from './PaymentTerminalModal';
import { toast } from './FlashNotifications';
import { HardwareDeviceSettings, generateRawEscPos } from '../utils/hardware';
import {
  MOCK_WAITERS,
  DEFAULT_TABLES,
  TableState,
  KitchenOrder,
  ModifierModal,
  SplitBillModal,
  KitchenDisplaySimulator
} from './HospitalityAddon';

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

// Browser Web Audio API Synthesizer Helper for cash register "Ka-ching!" sound!
const playKachingSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    // 1. First low click of the drawer opening
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    
    osc1.frequency.setValueAtTime(150, ctx.currentTime);
    osc1.type = 'triangle';
    gain1.gain.setValueAtTime(0.15, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
    osc1.start();
    osc1.stop(ctx.currentTime + 0.05);

    // 2. High-pitched coin ring
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    
    osc2.frequency.setValueAtTime(1800, ctx.currentTime);
    osc2.type = 'sine';
    gain2.gain.setValueAtTime(0.25, ctx.currentTime);
    gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    osc2.start();
    osc2.stop(ctx.currentTime + 0.45);

    // 3. Second coin harmonic ring
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    
    osc3.frequency.setValueAtTime(2200, ctx.currentTime + 0.06);
    osc3.type = 'sine';
    gain3.gain.setValueAtTime(0.20, ctx.currentTime + 0.06);
    gain3.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
    osc3.start();
    osc3.stop(ctx.currentTime + 0.45);

  } catch (err) {
    console.log('Audio error ignored by browser restrictions:', err);
  }
};

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
  exchangeRates = { oficial: 53.05, paralelo: 57.10 },
  activeEvent,
  onTriggerEventProgress
}: SalesScreenProps) {
  const activeChar: Character = DUO_CHARACTERS[user.avatar] || DUO_CHARACTERS.duo;

  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');

  // Shift Control Interactivity States
  const [openingCashInput, setOpeningCashInput] = useState('200'); // Sugg: 200 COP/MXN/USD fondo de caja
  const [isClosingShiftOpen, setIsClosingShiftOpen] = useState(false);
  const [closingCashCount, setClosingCashCount] = useState('');
  const [closingNotes, setClosingNotes] = useState('');

  const [isMovementOpen, setIsMovementOpen] = useState(false);
  const [movementType, setMovementType] = useState<'in' | 'out'>('in');
  const [movementAmount, setMovementAmount] = useState('');
  const [movementReason, setMovementReason] = useState('');

  const [lastClosedShiftReport, setLastClosedShiftReport] = useState<CashShift | null>(null);
  const [activeShiftDrawerTab, setActiveShiftDrawerTab] = useState<'status' | 'history'>('status');
  
  // Promotion Codes State
  const [promoInput, setPromoInput] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0); // e.g. 50 meaning 50% discount
  const [appliedPromo, setAppliedPromo] = useState('');
  const [promoMessage, setPromoMessage] = useState('');

  // Payment popup state
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'points' | 'credit'>('cash');
  const [cashReceived, setCashReceived] = useState<string>('');
  const [isTerminalModalOpen, setIsTerminalModalOpen] = useState(false);

  // Hospitality F&B Add-ons State Managers: derived from active Business Profile
  const isHospitalityActive = billingSettings?.businessProfile === 'gastronomy' || billingSettings?.businessProfile === undefined;
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
  const [gemsRedeemedValue, setGemsRedeemedValue] = useState(0);
  const [gemsDiscountAmount, setGemsDiscountAmount] = useState(0);

  // Advanced Invoicing request states
  const [requestLegalInvoice, setRequestLegalInvoice] = useState(false);
  const [invoiceFiscalName, setInvoiceFiscalName] = useState('');
  const [invoiceTaxId, setInvoiceTaxId] = useState('');
  const [invoicePostalCode, setInvoicePostalCode] = useState('');
  const [invoiceRegime, setInvoiceRegime] = useState('626 - Régimen Simplificado de Confianza (RESICO)');
  const [invoiceUseCFDI, setInvoiceUseCFDI] = useState('G03 - Gastos en general');
  const [invoicePaymentForm, setInvoicePaymentForm] = useState('01 - Efectivo');

  // Custom local state for specialized business profiles (Retail & Service)
  const [rawBarInput, setRawBarInput] = useState('');
  const [svcName, setSvcName] = useState('');
  const [svcPrice, setSvcPrice] = useState('');

  // Held tickets (Tickets en Espera) State and controllers
  const [suspendedTickets, setSuspendedTickets] = useState<{
    id: string;
    alias: string;
    cart: CartItem[];
    customer: Customer | null;
    discountPercent: number;
    useGemsDiscount: boolean;
    savedAt: string;
  }[]>(() => {
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

  const suspendCurrentTicket = () => {
    if (cart.length === 0) return;
    const alias = prompt("Ingresa una referencia o nombre para identificar este ticket (ej. 'Cliente Fila #2', 'Señor de gorra'):");
    if (alias === null) return;
    const finalAlias = alias.trim() || `Ticket #${suspendedTickets.length + 1}`;
    
    const newSuspended = {
      id: `SUSP-${Date.now()}`,
      alias: finalAlias,
      cart,
      customer: selectedCustomer,
      discountPercent,
      useGemsDiscount,
      savedAt: new Date().toISOString()
    };

    setSuspendedTickets(prev => [...prev, newSuspended]);
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
    const ticket = suspendedTickets.find(t => t.id === ticketId);
    if (!ticket) return;
    
    if (cart.length > 0) {
      const confirmOverwrite = confirm("Ya tienes artículos en el carrito. ¿Deseas reemplazar el carrito actual con el ticket en espera?");
      if (!confirmOverwrite) return;
    }

    setCart(ticket.cart);
    setSelectedCustomer(ticket.customer);
    setDiscountPercent(ticket.discountPercent);
    setUseGemsDiscount(ticket.useGemsDiscount);
    setSuspendedTickets(prev => prev.filter(t => t.id !== ticketId));
    playSound('success');
    setPromoMessage(`✅ Ticket "${ticket.alias}" restaurado.`);
    setTimeout(() => setPromoMessage(''), 3000);
  };

  const deleteSuspendedTicket = (ticketId: string) => {
    if (!confirm("¿Deseas eliminar este ticket en espera de forma permanente?")) return;
    setSuspendedTickets(prev => prev.filter(t => t.id !== ticketId));
    playSound('error');
  };

  // Mixed Payment States
  const [isMixedPayment, setIsMixedPayment] = useState(false);
  const [mixedCashAmount, setMixedCashAmount] = useState('');

  // Extended Advanced POS States
  const [isFreeSaleModalOpen, setIsFreeSaleModalOpen] = useState(false);
  const [freeSaleName, setFreeSaleName] = useState('');
  const [freeSalePrice, setFreeSalePrice] = useState('');
  const [freeSaleQty, setFreeSaleQty] = useState('1');
  const [freeSaleCategory, setFreeSaleCategory] = useState('General');

  const [editingCartItem, setEditingCartItem] = useState<CartItem | null>(null);
  const [editCartItemQty, setEditCartItemQty] = useState('');
  const [editCartItemDiscount, setEditCartItemDiscount] = useState('');
  const [editCartItemPrice, setEditCartItemPrice] = useState('');
  const [editCartItemNotes, setEditCartItemNotes] = useState('');

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
  const [copiedNotification, setCopiedNotification] = useState(false);

  // Webcam Hardware Scanner and Simulation configurations
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [activeScanStatus, setActiveScanStatus] = useState<string>('Esperando código...');

  // Global Physical Barcode / USB Scanner keypress interceptor
  useEffect(() => {
    let rawBuffer = '';
    let lastKeyTime = Date.now();

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ignore modifier keys
      if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') return;

      const now = Date.now();
      const diff = now - lastKeyTime;
      lastKeyTime = now;

      // Real USB laser scanners enter characters in less than 40-50ms between strokes
      if (diff > 120) {
        rawBuffer = '';
      }

      if (e.key === 'Enter') {
        if (rawBuffer.length >= 4) {
          // Look up scanned code in products database
          const found = products.find(p => p.barcode === rawBuffer || p.id === rawBuffer);
          if (found) {
            e.preventDefault();
            const inCartQty = cart.find(it => it.product.id === found.id)?.quantity || 0;
            if (found.stock > inCartQty) {
              setCart(currCart => {
                const existingIndex = currCart.findIndex(it => it.product.id === found.id);
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
              toast.success(`Código de barras escaneado: ${found.emoji} ${found.name}`, { title: 'Escáner Inteligente 🔍' });
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
          rawBuffer = '';
        }
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

  // Webcam activation controls
  const startCamera = async () => {
    try {
      setActiveScanStatus('Iniciando webcam...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setActiveScanStatus('¡Cámara Activa! Alinea el código de barra del producto');
    } catch (err) {
      console.warn('Camera device access failed:', err);
      setActiveScanStatus('Acceso denegado a la cámara. Prueba el escáner manual o simula un escaneo.');
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  useEffect(() => {
    if (isScannerOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isScannerOpen]);

  // Trigger scanning feedback manually
  const simulateBarcodeScan = (product: Product) => {
    const inCartQty = cart.find(it => it.product.id === product.id)?.quantity || 0;
    if (product.stock > inCartQty) {
      addToCart(product);
      playSound('success');
      setActiveScanStatus(`✅ Éxito: ¡Escaneado correctamente ${product.name}!`);
      if (onTriggerEventProgress) onTriggerEventProgress('scan');
      setPromoMessage(`⚡ Escáner: ${product.name}`);
      setTimeout(() => setPromoMessage(''), 2500);
    } else {
      playSound('error');
      setActiveScanStatus(`⛔ Agotado: No hay stock libre de ${product.name}`);
      toast.error(`Stock insuficiente para agregar ${product.name}`, { title: 'Fallo de Escáner 📷' });
    }
  };

  const handlePrintEscPosTicket = (txn: Transaction) => {
    playSound('swoosh');
    setPromoMessage('🖨️ [ESC/POS] Enviando binario raw thermal al bus IoT...');
    toast.info('Generando payload binario ESC/POS para el ticket thermal...', { title: 'Imprimiendo... 🖨️', duration: 1500 });
    setTimeout(() => {
      const receiptData = {
        companyName: billingSettings.companyName || 'DuoPOS S.A. de C.V.',
        taxId: billingSettings.companyTaxId || 'DUO091218ACC',
        items: txn.items.map(it => ({
          name: it.name,
          qty: it.quantity,
          price: it.price,
          total: it.price * it.quantity
        })),
        subtotal: txn.subtotal,
        tax: txn.tax,
        discount: txn.discount,
        total: txn.total,
        paymentMethod: txn.paymentMethod,
        date: new Date(txn.date).toLocaleString('es-ES'),
        invoiceNo: txn.invoiceData?.invoiceNo,
        uuid: txn.invoiceData?.uuid,
        cardPaymentDetails: txn.cardPaymentDetails
      };
      
      const rawText = generateRawEscPos(receiptData, hardwareSettings.thermalPrinter);
      console.log('ESC/POS payload successfully generated:\n', rawText);

      toast.success('¡Impresión finalizada! Ticket registrado en el Bus IoT. +15 XP ⚡', { title: 'Impresión Exitosa 🖨️', duration: 5000 });
      alert(`🔌 ¡Impresión ESC/POS Finalizada!\n\nDispositivo: Térmico (${hardwareSettings.thermalPrinter.paperWidth})\nPuerto: ${hardwareSettings.thermalPrinter.connectionType.toUpperCase()}\n\nEl ticket de compra se ha registrado en el emulador del "Bus IoT" en la barra superior. ¡Ganas +15 XP de racha por integración IoT!`);
      onGrantXp(15);
      playSound('levelup');
    }, 800);
  };

  // Real-world dynamic ticket printer
  const handlePrintReceipt = (txn: Transaction) => {
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('⚠️ Pop-up bloqueado. Por favor, permite ventanas emergentes para poder imprimir recibos de facturación.');
        return;
      }

      const hasInvoice = !!txn.invoiceData;
      const inv = txn.invoiceData;
      const curSymbol = billingSettings?.currencySymbol || '$';
      const curDecimals = billingSettings?.currencyDecimals !== undefined ? billingSettings.currencyDecimals : 2;

      const itemsHtml = txn.items.map(it => {
        const rateLabel = it.taxRateApplied !== undefined ? ` [Tasa ${it.taxRateApplied}%]` : '';
        return `
        <tr>
          <td style="padding: 4px 0;">
            ${it.emoji} ${it.name} x${it.quantity}
            <span style="font-size: 8px; color: #666; display: block;">${rateLabel}</span>
          </td>
          <td align="right" style="padding: 4px 0; font-family: monospace;">${curSymbol}${(it.price * it.quantity).toFixed(curDecimals)}</td>
        </tr>
      `}).join('');

      const qrUrl = inv 
        ? `https://api.qrserver.com/v1/create-qr-code/?size=100x100&color=000&data=${encodeURIComponent(`https://duopos.mock/verificar?uuid=${inv.uuid}&total=${txn.total}`)}`
        : '';

      printWindow.document.write(`
        <html>
          <head>
            <title>Ticket DuoPOS - ${txn.id}</title>
            <style>
              body {
                font-family: 'Courier New', Courier, monospace;
                padding: 10px;
                max-width: ${billingSettings?.ticketWidth === '58mm' ? '210px' : '300px'};
                margin: 0 auto;
                font-size: 11px;
                color: #222;
                line-height: 1.3;
              }
              .text-center { text-align: center; }
              .header { font-size: 14px; font-weight: bold; margin-bottom: 2px; color: #58cc02; }
              .separator { border-top: 1px dashed #555; margin: 8px 0; }
              table { width: 100%; font-size: 11px; border-collapse: collapse; }
              .total-row { font-weight: bold; font-size: 12px; border-top: 1px solid #000; }
              .reward { background-color: #f2ffd9; border: 1px dashed #58cc02; padding: 6px; margin-top: 10px; text-align: center; font-family: system-ui, sans-serif; border-radius: 8px; font-weight: bold; color: #46a302; font-size: 11px; }
              .invoice-box { background-color: #fafafa; border: 1px solid #ddd; padding: 8px; border-radius: 6px; font-size: 9px; margin: 10px 0; }
              .seal-text { font-size: 7px; overflow-wrap: break-word; color: #666; font-family: monospace; display: block; margin-top: 3px; }
            </style>
          </head>
          <body>
            <div class="text-center header">🦉 ${billingSettings?.companyName || 'Duo Academia S.A. de C.V.'} 🦉</div>
            ${billingSettings?.customTicketHeader ? `
            <div class="text-center" style="font-size: 9px; font-weight: bold; margin-bottom: 4px; color: #555; line-height: 1.2;">
              ${billingSettings.customTicketHeader}
            </div>` : ''}
            <div class="text-center" style="font-size: 9px; font-weight: bold; color: #555;">
              ${billingSettings?.companyAddress || 'Nido Verde #12, Bosque de Duolingo'}<br/>
              CP: ${billingSettings?.companyPostalCode || '06700'} | RFC: ${billingSettings?.companyTaxId || 'DAC120525D10'}
            </div>
            <div class="separator"></div>
            
            <div><strong>FOLIO TICKET:</strong> ${txn.id}</div>
            <div><strong>FECHA EMISIÓN:</strong> ${new Date(txn.date).toLocaleString()}</div>
            <div><strong>CAJERO:</strong> ${txn.employeeName.toUpperCase()}</div>
            
            ${inv ? `
            <div class="invoice-box">
               <div class="text-center" style="font-weight: bold; text-decoration: underline; margin-bottom: 4px;">FACTURA ELECTRÓNICA LEGAL (SIMULADA)</div>
              <strong>FOLIO FISCAL:</strong> ${inv.invoiceNo}<br/>
              <strong>UUID SAT:</strong> <span style="font-family: monospace; font-size: 8px;">${inv.uuid}</span><br/>
              <strong>FECHA TIMBRADO:</strong> ${new Date(inv.certifiedAt).toLocaleString()}<br/>
              <strong>RÉGIMEN FISCAL EMISOR:</strong> ${billingSettings?.companyRegime || '601 General'}<br/>
              <div style="border-top: 1px solid #eee; margin: 4px 0;"></div>
              <strong>RECEPTOR:</strong> ${inv.fiscalName}<br/>
              <strong>RFC RECEPTOR:</strong> ${inv.taxId}<br/>
              <strong>CP RECEPTOR:</strong> ${inv.postalCode}<br/>
              <strong>USO CFDI:</strong> ${inv.useCFDI}<br/>
              <strong>FORMA PAGO:</strong> ${inv.paymentForm}
            </div>
            ` : ''}
 
            <div class="separator"></div>
            <table>
              <thead>
                <tr>
                  <th align="left" style="border-bottom: 1px solid #333; padding-bottom: 4px;">Detalle</th>
                  <th align="right" style="border-bottom: 1px solid #333; padding-bottom: 4px;">Monto</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
            <div class="separator"></div>
            <table>
              <tr>
                <td>Subtotal (Consumo base):</td>
                <td align="right">${curSymbol}${txn.subtotal.toFixed(curDecimals)}</td>
              </tr>
              ${txn.discount > 0 ? `
              <tr>
                <td>Descuentos/Club:</td>
                <td align="right">-${curSymbol}${txn.discount.toFixed(curDecimals)}</td>
              </tr>` : ''}
              <tr>
                <td>Impuestos desglosados (${billingSettings?.taxName || 'IVA'}):</td>
                <td align="right">${curSymbol}${txn.tax.toFixed(curDecimals)}</td>
              </tr>
              <tr class="total-row">
                <td style="padding-top: 5px;">TOTAL FINAL PAGADO:</td>
                <td align="right" style="padding-top: 5px;">${curSymbol}${txn.total.toFixed(curDecimals)}</td>
              </tr>
            </table>

            <div class="separator"></div>
            <div class="text-center"><strong>MÉTODO DE COBRO:</strong> ${txn.paymentMethod.toUpperCase()}</div>
            
            ${txn.cardPaymentDetails ? `
            <div class="invoice-box" style="margin-top: 6px; font-size: 8px; line-height: 1.4;">
              <div style="font-weight: bold; text-align: center; border-bottom: 1px solid #ddd; padding-bottom: 2px; margin-bottom: 3px; font-size: 8.5px;">CONEXIÓN INTEGRACIÓN POS</div>
              <strong>SUCURSAL TERMINAL:</strong> ${txn.cardPaymentDetails.terminalId}<br/>
              <strong>PROVEEDOR RED:</strong> ${txn.cardPaymentDetails.brand}<br/>
              <strong>TARJETA CLIENTE:</strong> **** **** **** ${txn.cardPaymentDetails.last4}<br/>
              <strong>TITULAR:</strong> ${txn.cardPaymentDetails.cardholderName.toUpperCase()}<br/>
              <strong>COD. AUTORIZACION:</strong> ${txn.cardPaymentDetails.authCode}<br/>
              <strong>EMV AID:</strong> ${txn.cardPaymentDetails.aid}<br/>
              <strong>EMV ARQC:</strong> ${txn.cardPaymentDetails.arqc}<br/>
              ${txn.cardPaymentDetails.signatureBase64 ? `
              <div style="text-align: center; margin-top: 6px; text-transform: uppercase;">
                <span style="font-size: 6.5px; display: block; color: #555; font-weight: bold;">Firma Electrónica Autorizada:</span>
                <img src="${txn.cardPaymentDetails.signatureBase64}" style="height: 30px; max-width: 120px; border: 1px solid #999; padding: 1px; border-radius: 4px; background-color: #fff; display: inline-block; margin-top: 2px;" />
              </div>
              ` : ''}
            </div>
            ` : ''}
            
            ${txn.customerId ? `
            <div class="text-center" style="margin-top: 6px; font-weight: bold; font-size: 10px;">
              💎 CLUB DE GEMAS DUOLINGO:<br />
              ${txn.gemsRedeemed ? `Canjeado: -${txn.gemsRedeemed} G` : ''}
              ${txn.gemsRedeemed && txn.gemsGained ? ' | ' : ''}
              ${txn.gemsGained ? `Acumula: +${txn.gemsGained} G` : ''}
            </div>` : ''}

            ${inv ? `
            <div class="separator"></div>
            <div class="text-center" style="margin-top: 5px;">
              <img src="${qrUrl}" alt="QR SAT" style="width: 80px; height: 80px; display: inline-block;" />
              <div style="font-size: 7px; color: #666; margin-top: 4px;">
                Este documento es una representación impresa de un CFDI simulado educacional.
              </div>
              <div style="border: 1px solid #eee; padding: 4px; text-align: left; margin-top: 4px; border-radius: 4px;">
                <strong style="font-size: 7px; display: block; text-transform: uppercase;">Sello Digital Sat Mock:</strong>
                <span class="seal-text">${inv.satSignature}</span>
                <strong style="font-size: 7px; display: block; text-transform: uppercase; margin-top: 3px;">Autoridad Certificadora:</strong>
                <span style="font-size: 7px; color: #444;">${billingSettings?.certifyingAuthority || 'SAT Ficticio'}</span>
              </div>
            </div>
            ` : ''}

            <div class="reward">
              🎉 ¡PRESTIGIO ADQUIRIDO!<br />Has obtenido +${txn.xpGained} XP de racha
            </div>
            
            <div style="margin-top: 12px; font-size: 9px;" class="text-center">🦉 ¡Exígele a tu competencia mantener su racha! 🦉</div>
            <script>
              window.onload = function() {
                window.print();
                setTimeout(() => { window.close(); }, 1200);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (err) {
      console.error('Error in receipt printing process', err);
    }
  };

  // Real-world native share or clipboard backup
  const handleShareReceipt = async (txn: Transaction) => {
    const shareText = `🦉 DuoPOS Ticket ${txn.id} 🦉\n` +
      `---------------------------\n` +
      `Cajero: ${txn.employeeName}\n` +
      `Fecha: ${new Date(txn.date).toLocaleDateString()}\n` +
      `Detalles:\n` +
      txn.items.map(it => `• ${it.emoji} ${it.name} (x${it.quantity}) - $${(it.price * it.quantity).toFixed(2)}`).join('\n') +
      `\n---------------------------\n` +
      `Subtotal: $${txn.subtotal.toFixed(2)}\n` +
      (txn.discount > 0 ? `Descuento: -$${txn.discount.toFixed(2)}\n` : '') +
      `Impuestos: $${txn.tax.toFixed(2)}\n` +
      `TOTAL: $${txn.total.toFixed(2)} USD\n` +
      `---------------------------\n` +
      (txn.customerId ? `💎 Club de Gemas: ${txn.gemsRedeemed ? `Canjeado -${txn.gemsRedeemed}G ` : ''}${txn.gemsGained ? `| Ganado +${txn.gemsGained}G` : ''}\n---------------------------\n` : '') +
      `🏆 Recompensa: +${txn.xpGained} XP extra acumulados!\n` +
      `¡Gracias por tu racha comercial!`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Ticket DuoPOS - ${txn.id}`,
          text: shareText
        });
      } catch (err) {
        console.log('Dynamic native sharing canceled by user', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
        setCopiedNotification(true);
        setTimeout(() => setCopiedNotification(false), 2000);
      } catch (err) {
        alert('No se pudo copiar el recibo al portapapeles.');
      }
    }
  };

  // Cart operations
  const addToCart = (prod: Product) => {
    if (prod.stock <= 0) {
      playSound('error');
      return;
    }

    // Check if we exceed stock already in cart
    const existingIndex = cart.findIndex(it => it.product.id === prod.id);
    const existingQty = existingIndex >= 0 ? cart[existingIndex].quantity : 0;

    if (existingQty >= prod.stock) {
      playSound('error');
      alert(`⚠️ Lo sentimos, no puedes agregar más de este producto. El stock total disponible es de ${prod.stock} unidades.`);
      return;
    }

    playSound('click');
    if (existingIndex >= 0) {
      const updated = [...cart];
      updated[existingIndex].quantity += 1;
      setCart(updated);
      toast.success(`Incrementado ${prod.emoji} ${prod.name} en el carrito.`, { title: 'Carrito de Compras 🛒', duration: 1500 });
    } else {
      setCart([...cart, { product: prod, quantity: 1 }]);
      toast.success(`Agregado ${prod.emoji} ${prod.name} al carrito.`, { title: 'Carrito de Compras 🛒', duration: 1500 });
    }
    setIsMobileCartOpen(true);
  };

  const removeFromCart = (prodId: string) => {
    const existingIndex = cart.findIndex(it => it.product.id === prodId);
    if (existingIndex < 0) return;

    playSound('click');
    const updated = [...cart];
    const prod = updated[existingIndex].product;
    if (updated[existingIndex].quantity > 1) {
      updated[existingIndex].quantity -= 1;
      setCart(updated);
      toast.info(`Reducido ${prod.emoji} ${prod.name} del carrito.`, { title: 'Carrito de Compras 🛒', duration: 1500 });
    } else {
      updated.splice(existingIndex, 1);
      setCart(updated);
      toast.warning(`Removido ${prod.emoji} ${prod.name} del carrito.`, { title: 'Carrito de Compras 🛒', duration: 1500 });
    }
  };

  const removeAllFromCart = (prodId: string) => {
    playSound('swoosh');
    const prod = cart.find(it => it.product.id === prodId)?.product;
    setCart(cart.filter(it => it.product.id !== prodId));
    if (prod) {
      toast.warning(`Removido ${prod.emoji} ${prod.name} por completo.`, { title: 'Carrito de Compras 🛒', duration: 1500 });
    }
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
      alert(`⚠️ Lo sentimos, el stock disponible es de solo ${editingCartItem.product.stock} unidades.`);
      return;
    }

    setCart(currCart => {
      return currCart.map(item => {
        if (item.product.id === editingCartItem.product.id) {
          return {
            ...item,
            quantity: qty,
            customPrice: price === editingCartItem.product.price ? undefined : price,
            discountPercent: discount > 0 ? discount : undefined,
            notes: notes || undefined
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

  // Promocodes Validation Engine
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
    const override = billingSettings.categoryOverrides.find(
      o => o.category.toLowerCase() === category.toLowerCase()
    );
    return override ? override.rate : billingSettings.generalTaxRate;
  };

  // Live Math
  const subtotal = cart.reduce((acc, curr) => {
    const addonsTotal = curr.addons ? curr.addons.reduce((sum, add) => sum + add.price, 0) : 0;
    const priceToUse = curr.customPrice !== undefined ? curr.customPrice : curr.product.price;
    const itemBaseTotal = (priceToUse + addonsTotal) * curr.quantity;
    const itemLevelDiscount = curr.discountPercent ? (itemBaseTotal * curr.discountPercent) / 100 : 0;
    return acc + (itemBaseTotal - itemLevelDiscount);
  }, 0);
  
  // Calculate Loyalty Gem Discount dynamically (in the Duolingo theme!)
  // Conversion Rate: 10 Gems = $1 discount
  // Minimum multiple of 10 gems, can't exceed actual subtotal minus promo discount
  const basePromoDiscount = (subtotal * discountPercent) / 100;
  const remainingValueForGems = Math.max(0, subtotal - basePromoDiscount);

  let gemsToRedeem = 0;
  let gemsDiscount = 0;

  if (selectedCustomer && useGemsDiscount) {
    // How many units of 10 gems can we redeem?
    const maxRedeemableUnits = Math.min(
      Math.floor(selectedCustomer.gems / 10), // Limit by what the user actually of gems
      Math.floor(remainingValueForGems)       // Limit by remaining value
    );
    gemsToRedeem = maxRedeemableUnits * 10;
    gemsDiscount = maxRedeemableUnits * 1.00;
  }

  const discountAmount = basePromoDiscount + gemsDiscount;
  const netBeforeTaxCalculation = Math.max(0, subtotal - discountAmount);
  
  // Proportional discount ratio to allocate discounts across items
  const discountRatio = subtotal > 0 ? (discountAmount / subtotal) : 0;

  let computedTaxSum = 0;
  let computedSubtotalSum = 0;

  cart.forEach(item => {
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
      // Inclusive Mode
      const netVal = itemRemaining / (1 + (itemTaxRate / 100));
      const taxVal = itemRemaining - netVal;
      computedSubtotalSum += netVal;
      computedTaxSum += taxVal;
    } else {
      // Exclusive Mode
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
    : (netBeforeTaxCalculation + taxAmount);
  
  // Tax basis is the subtotal before adding exclusive taxes or after desglosando inclusive taxes
  const taxableBasis = subtotalDesglosado;

  // Change computation
  const cashNum = Number(cashReceived) || 0;
  const changeDue = Math.max(0, cashNum - totalAmount);

  // VES exchange conversions
  const subtotalVES = subtotal * exchangeRate;
  const discountAmountVES = discountAmount * exchangeRate;
  const taxAmountVES = taxAmount * exchangeRate;
  const totalAmountVES = totalAmount * exchangeRate;
  const changeDueVES = changeDue * exchangeRate;

  // Cashier Hotkeys keydown listener
  useEffect(() => {
    const handleCashierHotkeys = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (
        activeEl.tagName === 'INPUT' || 
        activeEl.tagName === 'TEXTAREA' || 
        activeEl.getAttribute('contenteditable') === 'true'
      )) {
        return; // normal native typing
      }

      // Check keypresses
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        const searchInput = document.getElementById('barcode-or-search-input');
        if (searchInput) {
          searchInput.focus();
          (searchInput as any).select();
          playSound('click');
        }
      } else if (e.key === 'q' || e.key === 'Q') {
        e.preventDefault();
        suspendCurrentTicket();
      } else if (e.key === 'x' || e.key === 'X') {
        e.preventDefault();
        if (cart.length > 0) {
          const confirmClear = confirm("¿Deseas vaciar por completo el carrito actual?");
          if (confirmClear) {
            setCart([]);
            setSelectedCustomer(null);
            setDiscountPercent(0);
            setPromoInput('');
            setUseGemsDiscount(false);
            playSound('swoosh');
          }
        }
      } else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        if (cart.length > 0) {
          setCashReceived(Math.ceil(totalAmount).toString());
          setIsCheckoutOpen(true);
          playSound('click');
        }
      } else if (e.key === 'v' || e.key === 'V') {
        e.preventDefault();
        setFreeSaleName('');
        setFreeSalePrice('');
        setFreeSaleQty('1');
        setFreeSaleCategory('General');
        setIsFreeSaleModalOpen(true);
        playSound('click');
      }
    };

    window.addEventListener('keydown', handleCashierHotkeys);
    return () => {
      window.removeEventListener('keydown', handleCashierHotkeys);
    };
  }, [cart, totalAmount, suspendedTickets, selectedCustomer, discountPercent, useGemsDiscount]);

  const handleSaveModifiers = (notes: string, addons: { name: string; price: number }[]) => {
    if (!modifierTargetItem) return;
    setCart(curr => curr.map(item => {
      if (item.product.id === modifierTargetItem.product.id) {
        return { ...item, notes, addons };
      }
      return item;
    }));
    if (activeTableId) {
      setTables(curr => curr.map(t => {
        if (t.id === activeTableId) {
          return {
            ...t,
            cart: t.cart.map(item => {
              if (item.product.id === modifierTargetItem.product.id) {
                return { ...item, notes, addons };
              }
              return item;
            })
          };
        }
        return t;
      }));
    }
    setModifierTargetItem(null);
  };

  const handleCompleteSplitPayment = (paidTotal: number, updatedCart?: CartItem[]) => {
    // Register partial payment transaction first
    const splitTxn: Transaction = {
      id: `TXN-SPLIT-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toISOString(),
      items: (updatedCart ? cart.filter(it => !updatedCart.some(u => u.product.id === it.product.id)) : cart).map(it => ({
        productId: it.product.id,
        name: `${it.product.name} (Modo Split)`,
        price: it.product.price,
        emoji: it.product.emoji,
        quantity: it.quantity,
        taxRateApplied: getTaxRateForCategory(it.product.category),
        notes: it.notes,
        addons: it.addons
      })),
      subtotal: paidTotal * 0.92,
      tax: paidTotal * 0.08,
      discount: 0,
      total: paidTotal,
      paymentMethod: 'card', 
      employeeName: user.username,
      xpGained: 5,
      tableId: activeTableId || undefined,
      tableName: activeTableId ? tables.find(t => t.id === activeTableId)?.name : undefined,
      waiterName: activeWaiterName || undefined
    };

    onAddTransaction(splitTxn);
    onGrantXp(5);
    toast.success(`Cobro split recibido: $${paidTotal.toFixed(2)} USD. ¡Ganaste +5 XP! 💳`, { title: 'Cobro de Cuenta 💔' });

    if (updatedCart) {
      setCart(updatedCart);
      if (activeTableId) {
        setTables(prev => prev.map(t => {
          if (t.id === activeTableId) {
            return {
              ...t,
              cart: updatedCart,
              status: updatedCart.length > 0 ? 'occupied' : 'free',
              occupiedSince: updatedCart.length > 0 ? t.occupiedSince : undefined
            };
          }
          return t;
        }));
      }
    } else {
      // Equal split. Decrease the total amount or remove as paid
      alert(`💳 Cobrado Split Equitativo: $${paidTotal.toFixed(2)} USD.`);
    }

    playSound('kaching');
    setPromoMessage(`💳 Pago Parcial Procesado: $${paidTotal.toFixed(2)} USD cobrados con éxito!`);
    setTimeout(() => setPromoMessage(''), 4500);
  };

  const handleDispatchKitchenOrder = (orderId: string) => {
    setKitchenOrders(prev => prev.filter(o => o.id !== orderId));
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
        alert("⚠️ El monto en efectivo del pago mixto no puede ser negativo.");
        return;
      }
      if (cashPart > totalAmount) {
        alert(`⚠️ El monto en efectivo ($${cashPart.toFixed(2)}) supera el total de la compra ($${totalAmount.toFixed(2)}). Para dar cambio, desactiva "Pago Mixto" y usa la pestaña estándar de "Efectivo".`);
        return;
      }
    } else {
      if (paymentMethod === 'cash' && cashNum < totalAmount) {
        alert(`⚠️ El efectivo recibido ($${cashNum}) es insuficiente para saldar el total de $${totalAmount.toFixed(2)}.`);
        return;
      }

      if (paymentMethod === 'credit') {
        if (!selectedCustomer) {
          alert('⚠️ Para cobrar bajo la línea de crédito ("Fiado"), primero debes asociar un cliente en la barra del carrito.');
          return;
        }
        const limit = selectedCustomer.creditLimit || 0;
        const used = selectedCustomer.creditUsed || 0;
        const available = limit - used;
        
        if (limit === 0) {
          alert(`⚠️ El cliente ${selectedCustomer.name} no cuenta con línea de crédito activa ("Fiado"). Puedes autorizarla ingresando un límite en la pestaña Clientes.`);
          return;
        }
        if (totalAmount > available) {
          alert(`⚠️ Límite de crédito disponible superado. Disponible: $${available.toFixed(2)}. Total: $${totalAmount.toFixed(2)}.`);
          return;
        }
      }

      // Interactive connection hook to physical/IoT terminal when enabled
      if (paymentMethod === 'card' && hardwareSettings.paymentTerminal?.enabled && !cardDetailsFromTerminal) {
        setIsTerminalModalOpen(true);
        return;
      }
    }

    // Play "Ka-ching!" cash sound!
    playSound('kaching');

    // Compute dynamic level experience (XP)
    // 10 XP base + 1 XP for every $5 sold, double if SUPERXP applied
    let xpGranted = Math.max(10, Math.round(totalAmount / 4));
    if (appliedPromo === 'SUPERXP') {
      xpGranted *= 2;
    }

    const newTxnId = `TXN-${Math.floor(1000 + Math.random() * 9000)}`;
    
    // Gen invoice if requested or automatic invoicing active with customer
    let calculatedInvoice = undefined;
    if (requestLegalInvoice && invoiceFiscalName && invoiceTaxId) {
      // Mock UUID RFC-compliant (e.g., 36 bytes)
      const mockUuid = 'DUO00000-' + Math.random().toString(36).substring(2, 6).toUpperCase() + '-' + Math.floor(1000 + Math.random()*9000) + '-4FFF-ACCB-' + Math.random().toString(36).substring(2, 14).toUpperCase();
      const nextNo = billingSettings ? `${billingSettings.invoicePrefix}${billingSettings.nextInvoiceNumber}` : `DUO-FAC-${Math.floor(10000 + Math.random()*90000)}`;
      
      // cryptographic mock digital signature based on Duo character seals
      const duoSeal = 'SelloSAT|' + activeChar.avatar + '|' + Math.random().toString(36).substring(2, 15).toUpperCase() + '==' + '|' + user.username.toUpperCase();

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
        useCFDI: invoiceUseCFDI
      };
    }

    const newTransaction: Transaction = {
      id: newTxnId,
      date: new Date().toISOString(),
      items: cart.map(it => {
        const itemAddonsPrice = it.addons ? it.addons.reduce((sum, a) => sum + a.price, 0) : 0;
        const itemUnitPrice = it.customPrice !== undefined ? it.customPrice : it.product.price;
        const baseItemTotal = itemUnitPrice + itemAddonsPrice;
        const finalCalculatedItemPrice = it.discountPercent ? baseItemTotal * (1 - it.discountPercent / 100) : baseItemTotal;
        return {
          productId: it.product.id,
          name: it.discountPercent ? `${it.product.name} (-${it.discountPercent}% desc)` : it.product.name,
          price: finalCalculatedItemPrice,
          emoji: it.product.emoji,
          quantity: it.quantity,
          taxRateApplied: getTaxRateForCategory(it.product.category),
          notes: it.notes,
          addons: it.addons
        };
      }),
      subtotal: subtotalDesglosado,
      tax: taxAmount,
      discount: discountAmount,
      total: totalAmount,
      paymentMethod: isMixedPayment ? 'cash' : paymentMethod,
      isMixedPayment: isMixedPayment || undefined,
      mixedCashAmount: isMixedPayment ? (Number(mixedCashAmount) || 0) : undefined,
      mixedCardAmount: isMixedPayment ? Math.max(0, totalAmount - (Number(mixedCashAmount) || 0)) : undefined,
      employeeName: user.username,
      xpGained: xpGranted,
      customerId: selectedCustomer?.id || undefined,
      gemsGained: selectedCustomer ? Math.max(1, Math.floor(totalAmount)) : undefined,
      gemsRedeemed: gemsToRedeem > 0 ? gemsToRedeem : undefined,
      tableId: activeTableId || undefined,
      tableName: activeTableId ? tables.find(t => t.id === activeTableId)?.name : undefined,
      waiterName: activeWaiterName || undefined,
      isInvoiceRequested: requestLegalInvoice,
      invoiceData: calculatedInvoice,
      cardPaymentDetails: cardDetailsFromTerminal || undefined
    };

    // Substract stock of each product
    cart.forEach(item => {
      onDecreaseStock(item.product.id, item.quantity);
    });

    // Save transaction
    onAddTransaction(newTransaction);
    onGrantXp(xpGranted);
    
    toast.achievement(`Venta de $${newTransaction.total.toFixed(2)} USD procesada correctamente. ¡Ganaste +${xpGranted} XP! 💎`, { title: 'Ticket Terminado 🎉' });

    // Trigger physical IoT Cash Drawer solenoide kick if enabled
    if (hardwareSettings.thermalPrinter.enabled && hardwareSettings.thermalPrinter.cashDrawerEnabled && paymentMethod === 'cash') {
      playSound('kaching');
      setPromoMessage('🪙 [IoT Bus] Impulso RJ11 enviado a impresora. ¡Cajón abierto con éxito!');
      setTimeout(() => setPromoMessage(''), 4500);
    }

    // Release table if active in Hospitality mode
    if (activeTableId) {
      setTables(prev => prev.map(t => {
        if (t.id === activeTableId) {
          return {
            ...t,
            status: 'free',
            waiterName: '',
            cart: [],
            customer: null,
            occupiedSince: undefined
          };
        }
        return t;
      }));
      setActiveTableId(null);
      setActiveWaiterName('');
    }

    // Save active txn to display celebration splash screen
    setCelebrateTxn(newTransaction);
    setIsCheckoutOpen(false);
    clearCart();
  };

  // Filters Catalog
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'Todos' || p.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  // Render function for shift Z-audit tickets
  const renderClosedShiftReportModal = () => {
    if (!lastClosedShiftReport) return null;
    const rep = lastClosedShiftReport;

    const diff = rep.difference || 0;
    const isPerfect = Math.abs(diff) < 0.01;
    const isShort = diff < 0;

    const inSum = rep.movements.filter(m => m.type === 'in').reduce((acc, m) => acc + m.amount, 0);
    const outSum = rep.movements.filter(m => m.type === 'out').reduce((acc, m) => acc + m.amount, 0);
    const cashSales = Math.max(0, rep.expectedCash - rep.initialCash - inSum + outSum);

    let characterMsg = "¡Impecable! Tu racha de precisión brilla. La caja cuadra perfectamente. Lily te da un choca esos cinco. 🙌";
    let charAvatar = "lily";
    if (isShort) {
      characterMsg = "🦉🔎 *Duo te observa fijamente desconfiado...* Falta dinero en el conteo final. ¡Asegúrate de registrar cada centavo!";
      charAvatar = "duo";
    } else if (diff > 0) {
      characterMsg = "✨ ¡Vaya! Sobró cambio en el cajón. Asegúrate de que no le hayas cobrado de más a Zari por distraerte con su moda.";
      charAvatar = "lily";
    }

    return (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn text-gray-800">
        <div className="bg-white border-2 border-gray-200 border-b-8 rounded-3xl max-w-sm w-full p-6 relative shadow-2xl">
          <button
            type="button"
            onClick={() => { setLastClosedShiftReport(null); playSound('click'); }}
            className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 p-1 bg-gray-50 border cursor-pointer font-black text-xs h-7 w-7 flex items-center justify-center select-none"
          >
            ✕
          </button>

          <div className="space-y-4 font-mono text-xs text-gray-800 bg-[#fbfdf7] border-2 border-[#e5e5e5] p-4 rounded-2xl relative shadow-inner select-none">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-repeat-x bg-[linear-gradient(135deg,#e5e5e5_25%,transparent_25%),linear-gradient(225deg,#e5e5e5_25%,transparent_25%)] bg-[size:8px_8px] -translate-y-[1.5px]" />

            <div className="text-center space-y-1 mt-1">
              <h4 className="text-sm font-black uppercase tracking-wider text-gray-700">🦜 DUOPOS SYSTEM</h4>
              <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest leading-none">Corte de Caja / Z-Report</p>
              <p className="text-[9px] text-[#949494] font-medium leading-none">Turno: #{rep.id.slice(-6).toUpperCase()}</p>
            </div>

            <div className="border-t border-dashed border-gray-300 py-2 space-y-1 text-[10px] font-bold text-gray-650">
              <p>OPERADOR: <span className="text-gray-800">{rep.employeeName.toUpperCase()}</span></p>
              <p>APERTURA: <span>{new Date(rep.openingTime).toLocaleDateString()} {new Date(rep.openingTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></p>
              {rep.closingTime && (
                <p>CIERRE   : <span>{new Date(rep.closingTime).toLocaleDateString()} {new Date(rep.closingTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></p>
              )}
            </div>

            <div className="border-t border-dashed border-gray-300 py-2.5 space-y-1 text-xs">
              <div className="flex justify-between font-bold">
                <span>(+) FONDO FIJO</span>
                <span>${rep.initialCash.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-600">
                <span>(+) VENTAS EFECTIVO</span>
                <span>${cashSales.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-500">
                <span>(+) COMPIN / TARJETA</span>
                <span>${Math.max(0, rep.salesVolume - cashSales).toFixed(2)}</span>
              </div>

              {rep.movements.length > 0 && (
                <div className="pt-1.5 space-y-1 border-t border-slate-150 text-[10px] text-gray-500 font-medium">
                  <p className="uppercase tracking-widest text-[#949494] text-[8px] font-black">Ajustes manuales y retiros:</p>
                  {rep.movements.map((m) => (
                    <div key={m.id} className="flex justify-between pl-1">
                      <span className="truncate max-w-[120px] text-slate-400">
                        {m.type === 'in' ? '📈' : '📉'} {m.reason}
                      </span>
                      <span className={m.type === 'in' ? 'text-green-600' : 'text-red-500'}>
                        {m.type === 'in' ? '+' : '-'}${m.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t-2 border-dashed border-gray-300 py-2 text-xs space-y-1.5">
              <div className="flex justify-between font-black text-gray-850">
                <span>EFECTIVO ESPERADO:</span>
                <span>${rep.expectedCash.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-black text-gray-700 font-mono">
                <span>EFECTIVO CLASIF. :</span>
                <span>${rep.actualCash !== undefined ? rep.actualCash.toFixed(2) : '-'}</span>
              </div>
              
              <div className={`flex justify-between font-black border-t-2 border-double border-gray-300 pt-1.5 text-xs ${
                isPerfect ? 'text-green-650' : 'text-red-650'
              }`}>
                <span>DIFERENCIA (Z):</span>
                <span>{diff >= 0 ? '+' : ''}${diff.toFixed(2)}</span>
              </div>
            </div>

            <div className="absolute bottom-0 inset-x-0 h-1.5 bg-repeat-x bg-[linear-gradient(315deg,#e5e5e5_25%,transparent_25%),linear-gradient(45deg,#e5e5e5_25%,transparent_25%)] bg-[size:8px_8px] translate-y-[1.5px]" />
          </div>

          <div className="bg-slate-50 border p-3.5 rounded-2xl flex items-start gap-2.5 mt-4 text-xs">
            <span className="text-3xl mt-0.5 select-none">{charAvatar === 'duo' ? '🦉' : '💅'}</span>
            <div className="space-y-0.5 text-left">
              <span className="text-[10px] font-black text-[#58cc02] uppercase tracking-wider block">
                Auditoría DuoPOS
              </span>
              <p className="text-[11px] font-bold text-gray-650 leading-normal">
                {characterMsg}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-2">
            <button
              onClick={() => {
                window.print();
                playSound('click');
              }}
              className="w-full bg-[#1cb0f6] text-white border-b-4 border-[#128bd0] hover:bg-[#34beff] active:translate-y-[2px] active:border-b-2 py-3 rounded-2xl font-black text-xs uppercase text-center cursor-pointer tracking-wider flex items-center justify-center gap-1.5"
            >
              <span>Imprimir Informe 🖨️</span>
            </button>
            <button
              onClick={() => { setLastClosedShiftReport(null); playSound('click'); }}
              className="w-full bg-gray-150 hover:bg-gray-200 py-3 rounded-2xl font-black text-xs text-gray-650 uppercase text-center cursor-pointer"
            >
              Cerrar Reporte
            </button>
          </div>
        </div>
      </div>
    );
  };

  // 1. If register shift is closed, intercept with Shift Opening Flow
  if (!activeShift) {
    const handleAddInitialFondo = () => {
      const fund = parseFloat(openingCashInput) || 0;
      onOpenShift(fund);
      playSound('kaching');
    };

    return (
      <div className="max-w-md mx-auto my-12 bg-white border-2 border-gray-200 border-b-8 rounded-3xl p-6 md:p-8 space-y-6 text-center animate-scaleUp text-gray-850">
        <div className="space-y-2">
          <div className="relative inline-block mt-2">
            <span className="text-8xl block select-none drop-shadow-sm leading-none animate-bounce">
              🔑
            </span>
            <span className="absolute -top-1 -right-1 text-2xl select-none">🦉</span>
          </div>
          <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight">
            Apertura de Turno
          </h2>
          <p className="text-xs text-[#949494] font-bold leading-relaxed px-4">
            ¡Hola, <strong className="text-gray-700">{user.username}</strong>! Para poder facturar y realizar ventas con DuoPOS, debes abrir tu turno declarando tu fondo inicial en efectivo.
          </p>
        </div>

        {/* Suggested presets */}
        <div className="space-y-4 bg-gray-50 border-2 border-dashed border-gray-200 p-4 rounded-2xl text-left">
          <span className="text-[9px] uppercase font-black tracking-widest text-gray-400 block">
            Fondo de Caja Recomendado
          </span>
          <div className="grid grid-cols-4 gap-2">
            {['100', '250', '500', '1000'].map(val => (
              <button
                key={val}
                type="button"
                onClick={() => { setOpeningCashInput(val); playSound('click'); }}
                className={`py-2 rounded-xl text-xs font-black border-2 transition-all cursor-pointer ${
                  openingCashInput === val
                    ? 'bg-[#1cb0f6] border-[#1cb0f6] text-white shadow-xs'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                ${val}
              </button>
            ))}
          </div>

          <div className="space-y-1.5 pt-1">
            <label className="text-[10px] uppercase font-bold text-gray-500 block">
              Monto del fondo inicial ($)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 font-extrabold text-[#58cc02] text-sm leading-none">
                $
              </span>
              <input
                type="number"
                value={openingCashInput}
                onChange={(e) => setOpeningCashInput(e.target.value)}
                placeholder="0.00"
                className="w-full pl-7 pr-4 py-2 bg-white border-2 border-gray-200 focus:border-[#58cc02] rounded-xl font-bold font-mono text-xs text-gray-700 outline-none transition-colors"
                min="0"
              />
            </div>
            <p className="text-[9px] text-[#949494] font-medium leading-normal pt-1.5 leading-relaxed">
              * El fondo de caja inicial es la cantidad en efectivo disponible al abrir para facilitar el cambio sencillo a los clientes. En POS reales, esto evita descuadres.
            </p>
          </div>
        </div>

        <button
          onClick={handleAddInitialFondo}
          className="w-full bg-[#58cc02] text-white border-b-4 border-[#3c9e01] hover:bg-[#61e002] active:translate-y-[2px] active:border-b-2 py-4 rounded-2xl font-black text-xs uppercase tracking-wider shadow-sm cursor-pointer transition-all flex items-center justify-center gap-1.5"
        >
          <span>Abrir Caja & Iniciar Turno 📂</span>
        </button>

        {/* History of Closed Shifts */}
        {shiftHistory.length > 0 && (
          <div className="border-t border-gray-200 pt-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-black tracking-wider text-gray-400">
                Historial de Arqueos de Caja
              </span>
              <span className="text-[9px] bg-sky-50 text-sky-600 font-extrabold py-0.5 px-1.5 rounded-md border border-sky-200 uppercase">
                {shiftHistory.length} Cerrados
              </span>
            </div>
            <div className="max-h-[160px] overflow-y-auto space-y-1.5 pr-1 text-left">
              {shiftHistory.map((hist) => (
                <div key={hist.id} className="bg-gray-50 hover:bg-gray-100 border border-gray-200 p-2.5 rounded-xl flex items-center justify-between text-xs font-bold text-gray-600 transition-colors">
                  <div>
                    <span className="bg-emerald-100 text-[#3c9e01] border border-emerald-250 text-[8px] font-black uppercase tracking-wider py-0.5 px-1.5 rounded-md">
                      Arqueo OK
                    </span>
                    <p className="mt-1 text-[10px] text-gray-700 font-black leading-none">
                      {new Date(hist.openingTime).toLocaleDateString()} a las {new Date(hist.openingTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-[9px] text-[#949494] font-bold mt-0.5 block font-sans">
                      Fondo: ${hist.initialCash.toFixed(2)} • Ventas: ${hist.salesVolume.toFixed(2)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setLastClosedShiftReport(hist); playSound('click'); }}
                    className="text-[#1cb0f6] border border-[#1cb0f6]/20 bg-[#1cb0f6]/5 text-[9px] font-black uppercase tracking-wider py-1.5 px-2.5 rounded-lg hover:bg-sky-100 transition-colors cursor-pointer select-none"
                  >
                    Ver Ticket 🧾
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Overlay Closed Shift Report Modal */}
        {lastClosedShiftReport && renderClosedShiftReportModal()}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn font-sans p-1 md:p-3 pb-12">

      {/* CASH DRAWER PANEL WIDGET */}
      {activeShift && (
        <div className="bg-[#f7f7f7] border-2 border-gray-200 rounded-3xl p-4 flex flex-col md:flex-row gap-4 justify-between items-center shadow-xs">
          <div className="flex items-center gap-3">
            <div className="bg-[#58cc02] text-white p-2.5 rounded-2xl shadow-xs select-none font-black text-lg">
              💰
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-black text-gray-400 tracking-wider">Turno de Caja</span>
                <span className="bg-[#d2f09d] text-[#3c9e01] text-[9px] font-black uppercase px-2 py-0.5 tracking-wider rounded-lg border border-[#a6e246]">
                  Activo
                </span>
              </div>
              <h4 className="text-sm font-black text-gray-800 uppercase">
                Operador: {activeShift.employeeName}
              </h4>
            </div>
          </div>

          {/* Core Live balance tracking */}
          <div className="grid grid-cols-3 gap-3 w-full md:w-auto text-center">
            <div className="bg-white border rounded-2xl py-1.5 px-3 min-w-[95px]">
              <span className="text-[9px] uppercase font-black text-gray-400 block leading-tight">Fondo Fijo</span>
              <span className="text-xs font-mono font-black text-gray-750">${activeShift.initialCash.toFixed(2)}</span>
            </div>
            <div className="bg-white border rounded-2xl py-1.5 px-3 min-w-[95px]">
              <span className="text-[9px] uppercase font-black text-gray-400 block leading-tight">Efectivo Disp</span>
              <span className="text-xs font-mono font-black text-[#58cc02]">${activeShift.expectedCash.toFixed(2)}</span>
            </div>
            <div className="bg-white border rounded-2xl py-1.5 px-3 min-w-[95px]">
              <span className="text-[9px] uppercase font-black text-gray-400 block leading-tight">Total Ventas</span>
              <span className="text-xs font-mono font-black text-gray-750">${activeShift.salesVolume.toFixed(2)}</span>
            </div>
          </div>

          {/* Fast Action Buttons */}
          <div className="flex gap-2 w-full md:w-auto">
            {/* Movimiento de caja (entry/withdraw) button */}
            <button
              type="button"
              onClick={() => { setIsMovementOpen(true); playSound('click'); }}
              className="flex-1 md:flex-none py-2 px-3.5 border-2 border-[#e5e5e5] hover:bg-white text-gray-650 bg-gray-50 text-[10px] font-black uppercase tracking-wider rounded-xl active:translate-y-[2px] transition-all cursor-pointer flex items-center justify-center gap-1"
              title="Ingresar o Retirar efectivo auxiliar para control de caja"
            >
              <span>💸 Movimiento</span>
            </button>

            {/* Cierre de caja button */}
            <button
              type="button"
              onClick={() => { 
                setClosingCashCount(activeShift.expectedCash.toFixed(2));
                setIsClosingShiftOpen(true); 
                playSound('click'); 
              }}
              className="flex-1 md:flex-none py-2 px-4 bg-red-500 text-white border-b-4 border-red-700 hover:bg-red-400 active:translate-y-[2px] active:border-b-0 text-[10px] font-black uppercase tracking-wider rounded-xl cursor-pointer flex items-center justify-center gap-1"
              title="Realizar arqueo de caja manual, cuadrar caja y cerrar turno"
            >
              <span>🔒 Cerrar Caja</span>
            </button>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT TWO COLUMNS: Active Product Grid */}
        <div className="lg:col-span-2 space-y-4">

          {/* HOSPITALITY FLOOR PLAN AND CONTROL DECK */}
          {isHospitalityActive && (
            <div className="bg-white border-2 border-[#e5e5e5] border-b-[6px] rounded-3xl p-5 space-y-4 animate-fadeIn">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-3 border-gray-150 gap-2">
                <div className="flex items-center gap-2">
                  <span className="p-2 bg-indigo-55 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-center font-black select-none text-xl">
                    🏨
                  </span>
                  <div className="text-left">
                    <h3 className="font-black text-gray-800 text-sm uppercase leading-none">Mapa de Mesas y Comensales (F&B)</h3>
                    <p className="text-[10px] text-[#58cc02] font-black uppercase mt-1 tracking-wider">
                      Mesa Activa: {activeTableId ? tables.find(t => t.id === activeTableId)?.name : 'Ninguna (Mostrador / Fast Food)'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 items-center w-full sm:w-auto">
                  {/* KDS Open simulator button */}
                  <button
                    type="button"
                    onClick={() => { setIsKdsOpen(true); playSound('click'); }}
                    className="flex-1 sm:flex-none bg-[#ff9600] text-white border-b-4 border-amber-700 hover:bg-[#ffa726] active:translate-y-[2px] active:border-b-0 py-1.5 px-3 rounded-xl font-black text-[10.5px] uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer animate-pulse-slow"
                  >
                    <ChefHat size={13} /> Monitor Cocina (KDS)
                    {kitchenOrders.length > 0 && (
                      <span className="bg-red-500 font-mono text-white text-[9px] h-4 min-w-4 px-1 rounded-full flex items-center justify-center font-black animate-bounce">{kitchenOrders.length}</span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      // Release selection to quick counter sale
                      playSound('click');
                      setActiveTableId(null);
                      setActiveWaiterName('');
                    }}
                    className="flex-1 sm:flex-none border-2 border-gray-200 hover:bg-gray-55 hover:bg-slate-50 text-gray-500 py-1.5 px-3 rounded-xl font-black text-[10.5px] uppercase tracking-wider cursor-pointer text-xs"
                  >
                    Mostrador Rápido 🛍️
                  </button>
                </div>
              </div>

              {/* Floor Layout tables grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
                {tables.map(t => {
                  const isSelected = activeTableId === t.id;
                  const isOccupied = t.status === 'occupied';
                  const activeItemsCount = t.cart?.reduce((acc, it) => acc + it.quantity, 0) || 0;
                  const tableTotal = t.cart?.reduce((acc, curr) => {
                    const addSum = curr.addons ? curr.addons.reduce((s, a) => s + a.price, 0) : 0;
                    return acc + ((curr.product.price + addSum) * curr.quantity);
                  }, 0) || 0;

                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        playSound('click');
                        if (isSelected) {
                          // deselect
                          setActiveTableId(null);
                          setActiveWaiterName('');
                        } else {
                          // select table
                          setActiveTableId(t.id);
                          if (isOccupied) {
                            setCart(t.cart || []);
                            setSelectedCustomer(t.customer || null);
                            setActiveWaiterName(t.waiterName || '');
                          } else {
                            // free table. If screen already has a cart, bind it to this table!
                            if (cart.length > 0) {
                              const bindNow = window.confirm(`¿Pretende asociar los productos del carrito actual a la ${t.name}?`);
                              if (bindNow) {
                                setTables(prev => prev.map(item => {
                                  if (item.id === t.id) {
                                    return { ...item, status: 'occupied', cart: cart, waiterName: activeWaiterName || 'Personal General' };
                                  }
                                  return item;
                                }));
                              } else {
                                setCart([]);
                              }
                            } else {
                              setCart([]);
                              setSelectedCustomer(null);
                              setActiveWaiterName('');
                            }
                          }
                        }
                      }}
                      className={`p-3 rounded-2xl border-2 transition-all flex flex-col justify-between items-center text-center relative max-h-32 select-none cursor-pointer ${
                        isSelected
                          ? 'border-[#1cb0f6] bg-blue-50 text-blue-900 scale-102 font-extrabold shadow-sm'
                          : isOccupied
                            ? 'border-[#ff4b4b] bg-red-50 text-rose-950 font-extrabold shadow-xs'
                            : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700 font-bold'
                      }`}
                    >
                      {/* Top badge or layout indicator */}
                      <span className="text-[8px] uppercase tracking-wider font-extrabold block opacity-50 leading-none">
                        {t.section}
                      </span>

                      <div className="my-1.5 flex flex-col items-center">
                        <span className="text-xl select-none leading-none mb-1">
                          {isOccupied ? '🍱' : '🍽️'}
                        </span>
                        <span className="text-[11px] leading-tight block truncate w-full">{t.name}</span>
                      </div>

                      {/* Info footer metadata per table */}
                      <div className="w-full">
                        {isOccupied ? (
                          <div className="text-[8.5px] leading-none text-rose-700 flex flex-col gap-0.5 mt-0.5">
                            <span className="font-extrabold font-mono">${tableTotal.toFixed(2)}</span>
                            <span className="font-bold truncate" title={t.waiterName}>{t.waiterName || 'Mesero'}</span>
                          </div>
                        ) : (
                          <span className="text-[8.5px] font-black uppercase text-emerald-600 tracking-wider">
                            LIBRE
                          </span>
                        )}
                      </div>

                      {/* Small visual counter badge */}
                      {isOccupied && (
                        <span className="absolute -top-1.5 -right-1.5 bg-[#ff4b4b] text-white border-2 border-white rounded-full font-mono font-black text-[8px] h-4.5 w-4.5 flex items-center justify-center animate-bounce leading-none">
                          {activeItemsCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Waiter Assignation & Table details options details */}
              <div className="bg-slate-50 p-3 rounded-2xl border flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">🤵</span>
                  <label className="text-xs font-black uppercase text-slate-700">Asignar Mesero Activo:</label>
                  <select
                    value={activeWaiterName}
                    onChange={(e) => {
                      playSound('click');
                      setActiveWaiterName(e.target.value);
                      // Update active table waiter directly
                      if (activeTableId) {
                        setTables(prev => prev.map(t => {
                          if (t.id === activeTableId) {
                            return { ...t, waiterName: e.target.value };
                          }
                          return t;
                        }));
                      }
                    }}
                    className="bg-white border-2 border-gray-200 rounded-lg px-2 py-1 text-xs font-bold text-gray-750 outline-none focus:border-[#58cc02]"
                  >
                    <option value="">-- Personal General --</option>
                    {MOCK_WAITERS.map(w => (
                      <option key={w.id} value={w.name}>{w.name}</option>
                    ))}
                  </select>
                </div>

                <div className="text-xs font-bold text-gray-400">
                  <span>Modo Restaurante: Carga mesas, despacha comandas de cocina y divide cuentas.</span>
                </div>
              </div>
            </div>
          )}

          {/* RETAIL CONTROL DECK (IF RETAIL PROFILE IS ACTIVE) */}
          {!isHospitalityActive && billingSettings?.businessProfile === 'retail' && (
            <div className="bg-white border-2 border-orange-200 border-b-[6px] rounded-3xl p-5 space-y-4 animate-fadeIn">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-3 border-gray-150 gap-2">
                <div className="flex items-center gap-2">
                  <span className="p-2 bg-orange-50 border border-orange-200 rounded-xl flex items-center justify-center font-black select-none text-xl">
                    🛍️
                  </span>
                  <div className="text-left">
                    <h3 className="font-black text-gray-800 text-sm uppercase leading-none">Simulador de Escáner EAN & Retail</h3>
                    <p className="text-[10px] text-orange-600 font-bold uppercase mt-1 tracking-wider">
                      Modo Tienda / Supermercado Activo
                    </p>
                  </div>
                </div>
                <span className="bg-[#ff9600] text-white text-[9px] font-black uppercase px-2 py-1 rounded-md">
                  Escaneo Ultra-Rápido
                </span>
              </div>

              {/* Interactive Laser Barcode Simulation Grid */}
              <div className="bg-slate-900 text-white rounded-2xl p-4 flex flex-col items-center justify-center relative overflow-hidden border-2 border-slate-750 min-h-[110px]">
                {/* Laser Red Horizontal Line */}
                <div className="absolute left-0 right-0 h-0.5 bg-red-500 shadow-[0_0_8px_#ef4444] top-1/2 animate-bounce opacity-80" />
                
                {/* Simulated Barcode lines */}
                <div className="flex gap-1.5 items-end h-10 opacity-40 mb-2">
                  <div className="w-1 h-10 bg-white" />
                  <div className="w-0.5 h-10 bg-white" />
                  <div className="w-2 h-10 bg-white" />
                  <div className="w-0.5 h-10 bg-white" />
                  <div className="w-1.5 h-10 bg-white" />
                  <div className="w-0.5 h-10 bg-white" />
                  <div className="w-1 h-10 bg-white" />
                  <div className="w-2.5 h-10 bg-white" />
                  <div className="w-0.5 h-10 bg-white" />
                  <div className="w-1.5 h-10 bg-white" />
                  <div className="w-1 h-10 bg-white" />
                </div>
                <div className="text-[10px] font-mono text-gray-350 select-none uppercase tracking-widest font-bold">
                  {rawBarInput || 'Sostén o ingresa código de barra para simulación'}
                </div>
              </div>

              {/* Mock Scan trigger form */}
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      placeholder="Ingresar número de código de barra..."
                      value={rawBarInput}
                      onChange={(e) => setRawBarInput(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border-2 border-[#e5e5e5] rounded-xl font-mono text-xs font-black text-gray-750 placeholder:font-sans outline-none focus:border-orange-500 focus:bg-white"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!rawBarInput) return;
                      const found = products.find(p => p.barcode === rawBarInput || p.id === rawBarInput);
                      if (found) {
                        simulateBarcodeScan(found);
                      } else {
                        playSound('error');
                        alert(`Código de barras "${rawBarInput}" no encontrado en el catálogo.`);
                      }
                      setRawBarInput('');
                    }}
                    className="bg-orange-550 bg-orange-500 hover:bg-orange-600 text-white py-2 px-3 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-1.5 cursor-pointer border-b-4 border-orange-700 active:translate-y-[2px] active:border-b-0"
                  >
                    ⚡ Escanear
                  </button>
                </div>

                {/* Dropdown with active product codes for fast clicking mock */}
                <div className="border border-dashed border-gray-200 p-3 rounded-2xl space-y-2 bg-amber-50/20">
                  <span className="text-[9px] uppercase font-black text-orange-700 block">
                    ⚡ Escaneo de Simulación con Un Clic:
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {products.filter(p => p.barcode).slice(0, 6).map(prod => (
                      <button
                        key={prod.id}
                        type="button"
                        onClick={() => {
                          setRawBarInput(prod.barcode || '');
                          setTimeout(() => {
                            simulateBarcodeScan(prod);
                            setRawBarInput('');
                          }, 320);
                        }}
                        className="bg-white border hover:border-orange-350 p-2 rounded-xl text-left flex items-center gap-2 transition-all cursor-pointer text-[10px] font-bold text-gray-750 group"
                      >
                        <span className="text-sm select-none shrink-0">{prod.emoji}</span>
                        <div className="truncate flex-1">
                          <p className="truncate leading-tight font-extrabold group-hover:text-orange-600">{prod.name}</p>
                          <span className="font-mono text-[8px] text-gray-400 font-black block">EAN-{prod.barcode}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SERVICE / GENERAL CONTROL DECK */}
          {!isHospitalityActive && billingSettings?.businessProfile === 'general' && (
            <div className="bg-white border-2 border-emerald-200 border-b-[6px] rounded-3xl p-5 space-y-4 animate-fadeIn">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-3 border-gray-150 gap-2">
                <div className="flex items-center gap-2">
                  <span className="p-2 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-center font-black select-none text-xl">
                    💼
                  </span>
                  <div className="text-left">
                    <h3 className="font-black text-gray-800 text-sm uppercase leading-none">Módulo de Servicios y Consultorías</h3>
                    <p className="text-[10px] text-emerald-600 font-bold uppercase mt-1 tracking-wider">
                      Facturación Ágiles al Vuelo
                    </p>
                  </div>
                </div>
                <span className="bg-emerald-500 text-white text-[9px] font-black uppercase px-2 py-1 rounded-md">
                  Servicios y Aranceles
                </span>
              </div>

              {/* Service Creator Fast-Form */}
              <div className="bg-emerald-50/20 border border-emerald-100 rounded-2xl p-4 space-y-3">
                <span className="text-[9px] uppercase font-black text-emerald-800 block">
                  🛠️ Registrar Servicio Ad-Hoc e Inyectar en Carrito:
                </span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[8px] uppercase font-black text-gray-500 block mb-1 font-bold">Concepto de Servicio</label>
                    <input
                      type="text"
                      placeholder="Ej. Consultoría TI Personalizada"
                      value={svcName}
                      onChange={(e) => setSvcName(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[8px] uppercase font-black text-gray-500 block mb-1 font-bold">Precio del Servicio ($)</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="Ej. 180"
                      value={svcPrice}
                      onChange={(e) => setSvcPrice(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold outline-none"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!svcName || !svcPrice) {
                      playSound('error');
                      alert('Por favor indica descripción y precio del servicio.');
                      return;
                    }
                    const newSvcProduct: Product = {
                      id: `svc-${Date.now()}`,
                      name: svcName,
                      price: Number(svcPrice),
                      cost: Math.round(Number(svcPrice) * 0.15), // minimal estimated cost
                      stock: 9999,
                      category: 'Servicios',
                      emoji: '💼',
                      description: 'Servicio personalizado adicionado al vuelo',
                      branchesStock: {
                        'branch-centro': 9999,
                        'branch-central': 9999,
                        'branch-norte': 9999
                      }
                    };
                    
                    // Add directly to cart
                    setCart(curr => {
                      const itemInCart = curr.find(it => it.product.name === svcName);
                      if (itemInCart) {
                        return curr.map(it => it.product.name === svcName ? { ...it, quantity: it.quantity + 1 } : it);
                      }
                      return [...curr, { product: newSvcProduct, quantity: 1 }];
                    });

                    playSound('kaching');
                    setPromoMessage(`✅ ¡Servicio Adicionado: ${svcName} ($${svcPrice})!`);
                    setTimeout(() => setPromoMessage(''), 2500);
                    setSvcName('');
                    setSvcPrice('');
                  }}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 border-b-4 border-emerald-700 active:translate-y-[2px] active:border-b-0 py-2 rounded-xl text-white font-black text-xs uppercase cursor-pointer"
                >
                  🚀 Añadir Servicio al Ticket
                </button>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border grid grid-cols-2 gap-2 text-[10px] text-gray-500 leading-normal font-bold">
                <div>
                  👤 <strong>Administrador:</strong> Cajero Principal
                </div>
                <div>
                  📅 <strong>Periodo fiscal:</strong> Ejercicio 2026
                </div>
              </div>
            </div>
          )}

          {/* ACTIVE MINIMARKET BANNER BLOCK */}
          {billingSettings?.businessProfile === 'market' && (
            <div className="bg-white border-2 border-indigo-200 border-b-[6px] rounded-3xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 animate-fadeIn">
              <div className="flex items-center gap-3">
                <span className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-2xl text-2xl select-none leading-none flex items-center justify-center">
                  🛒
                </span>
                <div className="text-left">
                  <h4 className="font-extrabold text-xs uppercase text-gray-800 leading-none">Modo Abastos & Minimarket</h4>
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
          
          {/* Header query block */}
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

              {/* Lector de Código de Barras button */}
              <button
                type="button"
                onClick={() => { setIsScannerOpen(true); playSound('click'); }}
                className="bg-[#1cb0f6] text-white border-b-4 border-[#128bd0] hover:bg-[#34beff] active:translate-y-[2px] active:border-b-0 py-2 px-3 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-1.5 cursor-pointer select-none"
                title="Escanear Código de Barras (Cámara y Manual)"
              >
                <Barcode size={14} />
                <span>Escáner</span>
              </button>
            </div>

            {/* Speedy Category buttons slider */}
            <div className="flex gap-1 overflow-x-auto w-full md:w-auto py-1 scrollbar-thin">
              {CATEGORIES.map(cat => (
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
            {filteredProducts.map(prod => {
              const inCartQty = cart.find(it => it.product.id === prod.id)?.quantity || 0;
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
                  
                  {/* Stock counter warning overlay */}
                  <span className={`absolute top-2 right-2 text-[9px] px-1.5 py-0.5 rounded-md font-black ${
                    isOutOfStockAll
                      ? 'bg-red-150 text-red-600 border border-red-200'
                      : prod.stock - inCartQty <= 3
                      ? 'bg-orange-100 text-orange-600 border border-orange-200'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    Stock: {prod.stock - inCartQty}
                  </span>

                  {/* Big emoji visual */}
                  <div className="text-4xl filter drop-shadow-sm mt-2 select-none transform group-hover:scale-110 duration-100 min-h-[40px] flex items-center justify-center">
                    {isOutOfStockAll ? '😭' : prod.emoji || '📦'}
                  </div>

                  {/* Product title details */}
                  <div className="space-y-0.5 w-full">
                    <h5 className="font-extrabold text-xs text-gray-800 line-clamp-1 truncate leading-tight">
                      {prod.name}
                    </h5>
                    <p className="text-[10px] text-gray-400 font-extrabold pb-1">
                      {prod.category}
                    </p>
                    <div className="flex flex-col bg-green-50/50 py-1 px-1 rounded-lg border border-green-150 w-full select-none">
                      <span className="text-xs font-black text-[#58cc02] block leading-tight">
                        ${prod.price.toFixed(2)}
                      </span>
                      <span className="text-[9px] font-bold text-gray-400 block leading-tight mt-0.5" title={`Equivalente en Bolívares usando tasa ${activeRateType}`}>
                        {(prod.price * exchangeRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.
                      </span>
                    </div>
                  </div>

                  {/* Quantity tag already in cart display indicator */}
                  {inCartQty > 0 && (
                    <div className="absolute top-2 left-2 bg-[#1cb0f6] text-white border-b-2 border-[#1899d6] text-[10px] w-6 h-6 rounded-full flex items-center justify-center font-black animate-scaleUp">
                      +{inCartQty}
                    </div>
                  )}

                  {/* Aggregated out of stock cover tag */}
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

        {/* RIGHT ONE COLUMN: Cart Panel */}
        <div className="hidden lg:block space-y-4">
          
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
                  <span className="text-5xl block animate-bounce">🛒</span>
                  <h4 className="font-black text-gray-500 text-lg">Carrito vacío</h4>
                  <p className="text-xs text-gray-400 font-bold max-w-xs mx-auto px-5 leading-normal">
                    Selecciona productos de la grilla izquierda para sumarlos y comenzar a facturar. ¡A Duo le encantan las facturas llenas!
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1 py-3 border-b border-gray-100">
                  {cart.map(it => (
                    <div key={it.product.id} className="flex justify-between items-center text-xs font-bold text-gray-700">
                      
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-2xl select-none flex-shrink-0">{it.product.emoji}</span>
                        <div className="min-w-0 text-left">
                          <p className="font-extrabold text-[#3c3c3c] truncate text-xs leading-none mb-0.5">{it.product.name}</p>
                          <div className="flex items-center flex-wrap gap-1">
                            {it.customPrice !== undefined ? (
                              <>
                                <span className="text-[9px] line-through text-gray-300 font-bold">${it.product.price.toFixed(2)}</span>
                                <span className="text-[10px] text-blue-600 font-black">${it.customPrice.toFixed(2)} c/u</span>
                              </>
                            ) : (
                              <span className="text-[10px] text-[#58cc02] font-black">${it.product.price.toFixed(2)} c/u</span>
                            )}
                            <span className="text-[10px] text-gray-400 font-extrabold bg-[#f1fcf0] border border-green-100 px-1 rounded-md" title="Monto equivalente en Bolívares">
                              {((it.customPrice !== undefined ? it.customPrice : it.product.price) * exchangeRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.
                            </span>
                            {it.discountPercent && (
                              <span className="text-[8px] bg-red-100 text-red-700 px-1 py-0.2 rounded font-black border border-red-150 animate-pulse">
                                -{it.discountPercent}% OFF
                              </span>
                            )}
                          </div>
                          
                          {/* Custom preparation note label */}
                          {it.notes && (
                            <p className="text-[9px] text-indigo-650 bg-indigo-50 px-1.5 py-0.5 rounded inline-block font-black mt-1 leading-normal text-left truncate max-w-[130px]" title={it.notes}>
                              📝 {it.notes}
                            </p>
                          )}
                          
                          {/* Premium ingredients addons labels */}
                          {it.addons && it.addons.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1 text-left">
                              {it.addons.map((add, addIdx) => (
                                <span key={addIdx} className="text-[8px] text-[#2c7a02] bg-[#f2ffd4] font-black px-1 py-0.5 rounded border border-[#ccd9ad]">
                                  +{add.name} (+${add.price.toFixed(2)})
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Quantity controls */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {hardwareSettings.weighingScale.enabled && (
                          <button
                            type="button"
                            onClick={() => {
                              const currWeight = hardwareSettings.weighingScale.mockWeightOverride;
                              if (currWeight <= 0) {
                                playSound('error');
                                alert("⚠️ La báscula marca 0.000 kg. Por favor, abre el panel 'Bus IoT' en la barra superior para definir el peso simulación y vuelve a intentarlo.");
                                return;
                              }
                              playSound('levelup');
                              setCart(currCart => {
                                return currCart.map(item => {
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
                          
                          <span className="px-2 font-black text-gray-800 font-mono">
                            {it.quantity}
                          </span>
                          
                          <button
                            disabled={it.quantity >= it.product.stock}
                            onClick={() => addToCart(it.product)}
                            className="p-1 hover:bg-gray-200 rounded text-gray-500 disabled:opacity-40"
                          >
                            <Plus size={11} strokeWidth={3} />
                          </button>
                        </div>

                        {/* Custom Modifier button for F&B */}
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

                        {/* General Edit / Discount / Custom Price Override Gear for any business profile */}
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
                          className="p-1 text-gray-300 hover:text-red-400"
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

            {/* Asociar Cliente de Lealtad (Duolingo Style Widget) */}
            {cart.length > 0 && (
              <div className="bg-[#fcfcfc] border-2 border-gray-100 rounded-2xl p-3 space-y-2 mt-2 select-none">
                <div className="flex justify-between items-center bg-white border border-gray-150 p-2 rounded-xl">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xl">👥</span>
                    {selectedCustomer ? (
                      <div className="min-w-0">
                        <p className="text-xs font-black text-gray-800 truncate" title={selectedCustomer.name}>
                          {selectedCustomer.name}
                        </p>
                        <p className="text-[9px] text-gray-400 font-extrabold uppercase tracking-wide flex items-center gap-0.5">
                          <span>Liga {selectedCustomer.league}</span> • <span className="text-[#58cc02]">💎 {selectedCustomer.gems} G</span>
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs font-black text-gray-400">Sin cliente asociado</p>
                        <p className="text-[9px] text-gray-300 font-bold uppercase">Suma racha de lealtad</p>
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
                      className="text-red-500 hover:text-red-650 font-extrabold text-[10px] uppercase border border-red-100 px-2 py-1 rounded-lg hover:bg-red-50 cursor-pointer"
                    >
                      Quitar
                    </button>
                  ) : (
                    <select
                      value=""
                      onChange={(e) => {
                        const cust = customers.find(c => c.id === e.target.value);
                        if (cust) {
                          setSelectedCustomer(cust);
                          playSound('success');
                          if (onTriggerEventProgress) onTriggerEventProgress('loyalty');
                        }
                      }}
                      className="text-[#1cb0f6] border border-sky-150 bg-sky-50 rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-wider outline-none cursor-pointer max-w-[110px]"
                    >
                      <option value="">+ Asociar</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} (💎{c.gems})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Gems loyalty points redemption box */}
                {selectedCustomer && selectedCustomer.gems >= 10 && (
                  <div className="bg-white border border-gray-150 rounded-xl p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between pointer-events-auto">
                      <label className="flex items-center gap-2 cursor-pointer font-extrabold text-[10px] uppercase tracking-wider text-gray-650">
                        <input
                          type="checkbox"
                          checked={useGemsDiscount}
                          onChange={(e) => {
                            setUseGemsDiscount(e.target.checked);
                            playSound('click');
                          }}
                          className="rounded border-gray-300 text-[#58cc02] focus:ring-[#58cc02] cursor-pointer"
                        />
                        <span>Canjear Gemas de Duo</span>
                      </label>
                      <span className="text-xs font-black font-mono text-[#58cc02] flex items-center gap-0.5">
                        💎 {selectedCustomer.gems}
                      </span>
                    </div>

                    {useGemsDiscount && (
                      <div className="text-[10px] text-gray-400 font-bold leading-normal pt-1.5 border-t border-dashed">
                        Canjeando <span className="text-[#58cc02] font-black">{gemsToRedeem} gemas</span> por un descuento directo de <span className="text-gray-800 font-black">${gemsDiscount.toFixed(2)} USD</span> (10 Gemas = $1.00 desc).
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Promo engine & Invoice summaries */}
            <div className="space-y-4 pt-3">
              
              {/* Promo code form */}
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
                    <p className={`text-[10px] font-extrabold italic ${promoMessage.includes('⛔') ? 'text-red-500' : 'text-[#58cc02]'}`}>
                      {promoMessage}
                    </p>
                  )}
                </div>
              )}

              {/* Math summaries layout */}
              <div className="space-y-1.5 text-xs text-gray-500 font-extrabold">
                <div className="flex justify-between items-center">
                  <span>Subtotal:</span>
                  <div className="text-right">
                    <span className="text-[#3c3c3c] font-black">${subtotal.toFixed(2)} USD</span>
                    <span className="block text-[10px] text-gray-400 font-bold">{subtotalVES.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.</span>
                  </div>
                </div>
                
                {discountAmount > 0 && (
                  <div className="flex justify-between items-center text-red-500">
                    <span>Descuento aplicado:</span>
                    <div className="text-right">
                      <span className="font-black">-${discountAmount.toFixed(2)} USD</span>
                      <span className="block text-[10px] text-red-400 font-bold">-{discountAmountVES.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.</span>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span>Recargo por Impuesto:</span>
                  <div className="text-right">
                    <span className="text-[#3c3c3c] font-black">${taxAmount.toFixed(2)} USD</span>
                    <span className="block text-[10px] text-gray-400 font-bold">{taxAmountVES.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.</span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-base font-black text-gray-800 border-t border-gray-100 pt-2.5">
                  <span className="flex items-center gap-0.5">Total a Cobrar:</span>
                  <div className="text-right">
                    <span className="text-xl font-black text-[#58cc02]">
                      ${totalAmount.toFixed(2)} USD
                    </span>
                    <span className="block text-xs font-black text-indigo-600 animate-pulse mt-0.5" title={`Tasa de cambio: ${exchangeRate.toFixed(2)}`}>
                      {totalAmountVES.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.
                    </span>
                  </div>
                </div>
              </div>

              {/* Fast F&B Hospitality Actions when mode is active */}
              {isHospitalityActive && cart.length > 0 && (
                <div className="grid grid-cols-3 gap-2 py-2 border-t border-b border-[#e5e5e5]">
                  <button
                    type="button"
                    onClick={() => {
                      if (!activeTableId) {
                        playSound('error');
                        alert("⚠️ Por favor, selecciona una Mesa en el mapa superior primero para guardar la comanda.");
                        return;
                      }
                      playSound('success');
                      setTables(prev => prev.map(t => {
                        if (t.id === activeTableId) {
                          return {
                            ...t,
                            status: 'occupied',
                            waiterName: activeWaiterName || 'Personal General',
                            cart: cart,
                            customer: selectedCustomer,
                            occupiedSince: t.occupiedSince || new Date().toISOString()
                          };
                        }
                        return t;
                      }));
                      alert(`💾 COMANDA DE MESA GUARDADA\n\nSe ha retenido la comanda para "${tables.find(t => t.id === activeTableId)?.name}". Puedes atender otra venta, los productos volverán a cargarse al pautar clic en esta mesa.`);
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
                      const activeTable = tables.find(t => t.id === activeTableId);
                      const tableName = activeTable ? activeTable.name : 'Venta de Mostrador';
                      
                      const newOrder: KitchenOrder = {
                        id: `KITCHEN-${Math.floor(1000 + Math.random() * 9000).toString()}`,
                        tableId: activeTableId || 'walk-in',
                        tableName: tableName,
                        waiterName: activeWaiterName || 'Personal General',
                        sentAt: new Date().toISOString(),
                        items: cart.map(it => ({
                          name: it.product.name,
                          emoji: it.product.emoji,
                          quantity: it.quantity,
                          notes: it.notes,
                          addons: it.addons
                        })),
                        status: 'pending'
                      };
                      
                      setKitchenOrders(prev => [newOrder, ...prev]);
                      setPromoMessage(`🛎️ [KDS] Comanda #203 enviada a cocina con éxito para la ${tableName}`);
                      setTimeout(() => setPromoMessage(''), 3500);

                      // Bind to active table as occupied since it is in preparation
                      if (activeTableId) {
                        setTables(prev => prev.map(t => {
                          if (t.id === activeTableId) {
                            return {
                              ...t,
                              status: 'occupied',
                              waiterName: activeWaiterName || 'Personal General',
                              cart: cart,
                              customer: selectedCustomer,
                              occupiedSince: t.occupiedSince || new Date().toISOString()
                            };
                          }
                          return t;
                        }));
                        // Alert visual success and clean cashier screen
                        alert(`🛎️ ¡COMIDA ENVIADA A COCINA!\n\nSe ha impreso el ticket en el KDS para la "${tableName}". Los cocineros ya están en marcha.`);
                        setCart([]);
                        setActiveTableId(null);
                        setActiveWaiterName('');
                        setSelectedCustomer(null);
                      } else {
                        alert(`🛎️ COMANDA DE MOSTRADOR ENVIADA\n\nTicket enviado al KDS rápido.`);
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
                onClick={handleOpenCheckout}
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
                <span className="uppercase font-black tracking-widest text-[8px] text-gray-300">Atajos POS:</span>
                <span className="flex items-center gap-1"><kbd className="px-1 py-0.2 bg-gray-50 border border-gray-200 rounded text-gray-500 font-mono text-[8.5px] font-black shadow-xs">F</kbd> Buscar</span>
                <span className="flex items-center gap-1"><kbd className="px-1 py-0.2 bg-gray-50 border border-gray-200 rounded text-gray-500 font-mono text-[8.5px] font-black shadow-xs">V</kbd> Art. Rápido</span>
                <span className="flex items-center gap-1"><kbd className="px-1 py-0.2 bg-emerald-50 border border-emerald-200 rounded text-emerald-600 font-mono text-[8.5px] font-black shadow-xs">P</kbd> Cobrar</span>
              </div>
            </div>

          </div>

          {/* Held / Suspended tickets widget list */}
          {suspendedTickets.length > 0 && (
            <div className="bg-amber-50/70 border-2 border-amber-200 border-b-[6px] rounded-3xl p-4 space-y-3 shadow-xs animate-fadeIn text-left">
              <div className="flex justify-between items-center border-b border-amber-200/60 pb-1.5">
                <span className="font-extrabold text-[#3c3c3c] text-xs uppercase flex items-center gap-1">
                  ⏱️ Tickets Retenidos en Espera ({suspendedTickets.length})
                </span>
                <span className="bg-amber-500 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-md leading-none select-none">
                  Fila Abierta
                </span>
              </div>
              
              <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                {suspendedTickets.map(ticket => {
                  const itemsCount = ticket.cart.reduce((sum, item) => sum + item.quantity, 0);
                  const ticketTotal = ticket.cart.reduce((acc, curr) => {
                    const addonsTotal = curr.addons ? curr.addons.reduce((sum, add) => sum + add.price, 0) : 0;
                    return acc + ((curr.product.price + addonsTotal) * curr.quantity);
                  }, 0);

                  return (
                    <div key={ticket.id} className="bg-white border border-amber-150 p-2.5 rounded-xl flex items-center justify-between text-xs gap-2">
                      <div className="min-w-0">
                        <p className="font-extrabold text-gray-800 truncate leading-snug">
                          {ticket.alias}
                        </p>
                        <p className="text-[9px] text-amber-700 font-extrabold uppercase mt-0.5">
                          {itemsCount} {itemsCount === 1 ? 'artículo' : 'artículos'} • <span className="font-mono">${ticketTotal.toFixed(2)}</span>
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
                          className="text-red-500 hover:text-red-700 p-1 rounded-md hover:bg-red-50 text-[10px]"
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

      </div>

      {/* 2. CHOOSE PAYMENT MODAL OVERLAY */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white border-2 border-gray-200 border-b-8 rounded-3xl max-w-md w-full p-6 space-y-5 relative shadow-2xl">
            
            <button
              onClick={() => setIsCheckoutOpen(false)}
              className="absolute right-4 top-4 text-gray-450 hover:text-gray-600 rounded-full hover:bg-gray-100 p-1 bg-gray-50 border"
            >
              ✕
            </button>

            <div className="text-center space-y-1.5">
              <span className="text-4xl">💰</span>
              <h3 className="text-2xl font-black text-gray-800">Cierre de Caja</h3>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">
                Total USD: <span className="text-gray-800 font-black font-mono">${totalAmount.toFixed(2)} USD</span>
              </p>
              <div className="mt-1">
                <span className="text-sm text-indigo-700 font-black uppercase tracking-wider bg-indigo-50 py-1.5 px-3 rounded-2xl border border-indigo-100 inline-block animate-pulse">
                  Total Bs: {totalAmountVES.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.
                </span>
              </div>
            </div>

            {/* Select Method Tabs */}
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase text-gray-500 block">Forma de Pago</label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { key: 'cash', label: 'Efectivo', icon: '💸' },
                  { key: 'card', label: 'Tarjeta', icon: '💳' },
                  { key: 'points', label: 'DuoPuntos', icon: '⭐' },
                  { key: 'credit', label: 'Fiado', icon: '📝' }
                ].map(item => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      if (item.key === 'credit' && !selectedCustomer) {
                        alert('⚠️ Para cobrar bajo la línea de crédito ("Fiado"), primero debes asociar un cliente en la sección del carrito.');
                        return;
                      }
                      setPaymentMethod(item.key as any);
                    }}
                    className={`p-2.5 rounded-2xl border-2 transition-all flex flex-col items-center justify-center border-b-4 cursor-pointer ${
                      paymentMethod === item.key
                        ? 'bg-green-50 border-[#58cc02] scale-102 font-black'
                        : (item.key === 'credit' && !selectedCustomer)
                          ? 'bg-gray-50 border-gray-150 opacity-40 cursor-not-allowed'
                          : 'bg-white border-gray-200 hover:bg-gray-50 active:translate-y-[2px]'
                    }`}
                  >
                    <span className="text-xl block">{item.icon}</span>
                    <span className="text-[9px] font-black mt-1 uppercase text-gray-700">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Mixed Payment Toggle */}
            <div className="bg-[#fafafa] border border-gray-150 p-3 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => { setIsMixedPayment(!isMixedPayment); playSound('click'); }}>
                <span className="text-xl">🔀</span>
                <div className="text-left">
                  <span className="text-[11px] font-black text-gray-800 leading-none block">Registrar como Pago Mixto</span>
                  <span className="text-[9px] font-extrabold text-[#1cb0f6] uppercase tracking-wider block">Combinar Efectivo + Tarjeta</span>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isMixedPayment}
                  onChange={(e) => { setIsMixedPayment(e.target.checked); playSound('click'); }}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#58cc02]" />
              </label>
            </div>

            {/* Calculations depending on payment methods */}
            {isMixedPayment ? (
              <div className="space-y-3.5 p-4 bg-indigo-50/50 rounded-2xl border-2 border-indigo-150 text-left">
                <div className="flex items-center gap-2 text-indigo-800 font-black text-xs uppercase border-b border-indigo-100 pb-1.5">
                  <span>🔀</span>
                  <span>Distribución de Pago Mixto</span>
                </div>
                
                <div className="space-y-3">
                  {/* Cash Portion */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px] uppercase font-black text-gray-400">
                      <span>💸 Porción en Efectivo</span>
                      <span className="text-indigo-600 font-mono">Paso 1</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-gray-400 font-extrabold">$</span>
                      <input
                        type="text"
                        value={mixedCashAmount}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9.]/g, '');
                          setMixedCashAmount(val);
                        }}
                        placeholder="0.00"
                        className="w-full pl-7 pr-3 py-2 bg-white border-2 border-[#e5e5e5] rounded-xl font-black text-sm text-gray-800 outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Card Portion */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px] uppercase font-black text-gray-400">
                      <span>💳 Porción en Tarjeta</span>
                      <span className="text-indigo-650 font-mono">Auto-calculado</span>
                    </div>
                    <div className="flex items-center justify-between bg-white border border-gray-150 p-2.5 rounded-xl font-mono text-sm font-black text-gray-700">
                      <span>Restante a Tarjeta:</span>
                      <span className="text-indigo-650 font-extrabold">
                        ${Math.max(0, totalAmount - (Number(mixedCashAmount) || 0)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Info Note banner */}
                <p className="text-[10px] text-[#2c7a02] bg-[#f2ffd4] font-semibold border border-[#ccd9ad] p-2 rounded-lg leading-normal">
                  💡 **Concepto**: Ingresa el monto en efectivo que entrega el cliente. El resto se procesa y reporta como cobro a tarjeta bancaria.
                </p>
              </div>
            ) : paymentMethod === 'cash' ? (
              <div className="space-y-3 p-4 bg-gray-50 rounded-2xl border">
                <div className="space-y-1 text-left">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-black uppercase text-gray-500">Efectivo Recibido ($)</label>
                    <span className="text-[10px] text-gray-400 font-bold">
                      ~ {(cashNum * exchangeRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.
                    </span>
                  </div>
                  <input
                    type="text"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value.replace(/[^0-9.]/g, ''))}
                    className="w-full px-4 py-3 bg-white border-2 border-[#e5e5e5] rounded-xl font-black text-lg text-gray-800 outline-none text-center focus:border-[#58cc02]"
                    placeholder="0.00"
                  />
                </div>

                {/* Bill quick tips */}
                <div className="flex flex-wrap justify-center gap-1.5">
                  {[
                    { label: 'Exacto', val: Math.ceil(totalAmount) },
                    { label: '+$5', val: Math.ceil(totalAmount) + 5 },
                    { label: '+$10', val: Math.ceil(totalAmount) + 10 },
                    { label: '+$20', val: Math.ceil(totalAmount) + 20 },
                    { label: '$20', val: 20 },
                    { label: '$50', val: 50 },
                    { label: '$100', val: 100 }
                  ].map((bill, index) => {
                    if (bill.val < totalAmount && bill.label.startsWith('$')) return null;
                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setCashReceived(bill.val.toString())}
                        className="py-1 px-2.5 bg-white border border-gray-200 rounded-lg text-xs font-extrabold text-gray-600 hover:bg-gray-100"
                      >
                        {bill.label} (${bill.val})
                      </button>
                    );
                  })}
                </div>

                {/* Change returns display */}
                <div className="flex flex-col bg-white p-3 rounded-xl border border-gray-150 text-left">
                  <div className="flex justify-between items-center w-full">
                    <span className="text-xs font-black uppercase text-gray-400">Cambio Devuelto USD:</span>
                    <span className="font-mono text-lg font-black text-gray-800">
                      ${changeDue.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center w-full border-t border-dashed border-gray-100 pt-1.5 mt-1.5">
                    <span className="text-xs font-black uppercase text-gray-400">Cambio en Bs. (VES):</span>
                    <span className="font-mono text-sm font-black text-indigo-650">
                      {changeDueVES.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.
                    </span>
                  </div>
                </div>
              </div>
            ) : paymentMethod === 'credit' ? (
              <div className="p-4 bg-amber-50 bg-opacity-80 rounded-2xl border border-amber-200 text-left space-y-3">
                <div className="flex items-center gap-2 text-amber-800 font-black text-xs uppercase">
                  <span>📝</span>
                  <span>Cobro Cargado a Línea de Crédito ("Fiado")</span>
                </div>
                {selectedCustomer ? (
                  <div className="text-xs space-y-1.5 text-gray-700 font-bold">
                    <p className="flex justify-between">
                      <span className="text-gray-400 font-black uppercase text-[10px]">Cliente Deudor:</span>
                      <span className="text-gray-900 font-extrabold">{selectedCustomer.name}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-gray-400 font-black uppercase text-[10px]">Límite Autorizado:</span>
                      <span className="text-gray-900 font-mono">${(selectedCustomer.creditLimit || 0).toFixed(2)}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-gray-400 font-black uppercase text-[10px]">Crédito Utilizado:</span>
                      <span className="text-red-650 font-mono">${(selectedCustomer.creditUsed || 0).toFixed(2)}</span>
                    </p>
                    
                    <div className="pt-2 border-t border-dashed border-amber-200 flex justify-between items-center text-xs text-amber-950 font-black">
                      <span>Disponible para "Fiado":</span>
                      <span className="font-mono bg-amber-100 px-2 py-0.5 rounded-lg border border-amber-150">
                        ${Math.max(0, (selectedCustomer.creditLimit || 0) - (selectedCustomer.creditUsed || 0)).toFixed(2)}
                      </span>
                    </div>

                    {((selectedCustomer.creditLimit || 0) - (selectedCustomer.creditUsed || 0)) < totalAmount && (
                      <p className="text-[10px] text-red-500 font-black leading-tight uppercase mt-1">
                        ⚠️ ATENCIÓN: El total de la compra (${totalAmount.toFixed(2)}) supera el cupo disponible de este cliente.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-[10px] text-red-500 italic font-black uppercase">⚠️ Error: Sin cliente asociado</p>
                )}
              </div>
            ) : paymentMethod === 'points' ? (
              <div className="p-4 bg-blue-50 bg-opacity-80 rounded-2xl border border-blue-200 text-left space-y-2 text-xs font-bold text-gray-700">
                <p className="text-blue-800 font-black uppercase text-[10px] flex items-center gap-1"><span>⭐</span> Canje por DuoPuntos / Certificados</p>
                <p>Se realiza el descuento de puntos de su racha activa.</p>
                {selectedCustomer && (
                  <p className="text-[10px] text-gray-500">Saldo actual de gemas: <strong className="text-green-600">{selectedCustomer.gems} G</strong></p>
                )}
              </div>
            ) : (
              <div className="p-4 bg-gray-50 rounded-2xl border text-center font-bold text-xs text-gray-500 space-y-2">
                <p>💳 Modo de cobro electrónico interactivo activado.</p>
                <p className="text-[10px] text-gray-400 italic font-medium">Desliza la tarjeta o aprueba el cupón NFC en la terminal de pago simlativa.</p>
              </div>
            )}

            {/* Loyalty details inside final confirmation */}
            {selectedCustomer && (
              <div className="bg-sky-50 border border-sky-150 p-3 rounded-2xl flex items-center justify-between text-xs font-bold leading-normal text-sky-900">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-xl select-none">🎓</span>
                  <div className="min-w-0">
                    <span className="text-[9px] uppercase font-black text-sky-400 block leading-tight">Cliente Premium de la Racha</span>
                    <span className="text-gray-800 font-extrabold truncate text-xs block">{selectedCustomer.name}</span>
                  </div>
                </div>

                <div className="text-right shrink-0 font-extrabold">
                  {useGemsDiscount && gemsToRedeem > 0 && (
                    <p className="text-red-500 font-black font-mono text-[10px]">
                      📉 Canjea: -{gemsToRedeem} Gems
                    </p>
                  )}
                  <p className="text-[#58cc02] font-black font-mono text-[10px]">
                    📈 Acumula: +{Math.max(1, Math.floor(totalAmount))} Gems
                  </p>
                </div>
              </div>
            )}

            {/* ADVANCED LEGAL BILLING OPTION ACCORDION */}
            <div className="bg-[#fafafa] border-2 border-gray-150 rounded-2xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div 
                  className="flex items-center gap-2 cursor-pointer select-none" 
                  onClick={() => { setRequestLegalInvoice(!requestLegalInvoice); playSound('click'); }}
                >
                  <span className="text-xl">⚖️</span>
                  <div>
                    <span className="text-xs font-black text-gray-800 leading-none block">¿Requieres Factura Legal?</span>
                    <span className="text-[9px] font-black text-[#58cc02] uppercase tracking-wider block">Timbrado Fiscal SAT de la Racha</span>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={requestLegalInvoice}
                    onChange={(e) => { setRequestLegalInvoice(e.target.checked); playSound('click'); }}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#58cc02]" />
                </label>
              </div>

              {requestLegalInvoice && (
                <div className="space-y-3.5 border-t border-dashed border-gray-200 pt-3 animate-fadeIn">
                  
                  {/* Constancia de Situación Fiscal mock OCR parser */}
                  <div className="bg-emerald-50/70 border border-emerald-100 p-2.5 rounded-xl text-[10.5px] text-emerald-800 space-y-1.5 shadow-inner">
                    <div className="flex justify-between items-center">
                      <span className="font-black uppercase tracking-wider block">📄 Constancia de Situación Fiscal (CSF)</span>
                      <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-md font-black font-mono">SIMULADOR OCR</span>
                    </div>
                    <p className="text-[9px] text-emerald-700 font-bold leading-tight">
                      Carga de manera simulada la constancia del contribuyente para auto-completar los datos fiscales legalmente.
                    </p>
                    <div className="flex gap-1.5 pt-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setInvoiceFiscalName('ESCUELA DUOLINGO DE MÉXICO S.A. DE C.V.');
                          setInvoiceTaxId('EDM180525H99');
                          setInvoicePostalCode('06700');
                          setInvoiceRegime('601 - General de Ley Personas Morales');
                          setInvoiceUseCFDI('G03 - Gastos en general');
                          playSound('levelup');
                        }}
                        className="flex-1 bg-white hover:bg-emerald-100/50 border border-emerald-200 text-emerald-800 font-black px-1.5 py-1 rounded-lg text-[8.5px] uppercase cursor-pointer text-center"
                      >
                        🏢 Persona Moral (DuoMex SA)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setInvoiceFiscalName('JUANA REGINA LOPEZ PEREZ');
                          setInvoiceTaxId('LOPJ881112MX8');
                          setInvoicePostalCode('45010');
                          setInvoiceRegime('626 - Régimen Simplificado de Confianza (RESICO)');
                          setInvoiceUseCFDI('G03 - Gastos en general');
                          playSound('levelup');
                        }}
                        className="flex-1 bg-white hover:bg-emerald-100/50 border border-emerald-200 text-emerald-800 font-black px-1.5 py-1 rounded-lg text-[8.5px] uppercase cursor-pointer text-center"
                      >
                        👤 Persona Física (Juana Lopez)
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-black text-gray-400 tracking-wider block">Denominación o Razón Social *</label>
                    <input
                      type="text"
                      required
                      value={invoiceFiscalName}
                      onChange={(e) => setInvoiceFiscalName(e.target.value)}
                      placeholder="Ej. OSCAR EL PINTOR S.A."
                      className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-black uppercase text-gray-800 focus:border-[#58cc02] outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-black text-gray-400 tracking-wider block">Reg. Fiscal (RFC / Tax ID) *</label>
                      <input
                        type="text"
                        required
                        value={invoiceTaxId}
                        onChange={(e) => setInvoiceTaxId(e.target.value)}
                        placeholder="XAXX010101000"
                        className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-black uppercase text-gray-800 focus:border-[#58cc02] outline-none font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-black text-gray-400 tracking-wider block">Código Postal Fiscal *</label>
                      <input
                        type="text"
                        required
                        value={invoicePostalCode}
                        onChange={(e) => setInvoicePostalCode(e.target.value)}
                        placeholder="06700"
                        className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-black text-gray-800 focus:border-[#58cc02] outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-black text-gray-400 block">Régimen Fiscal Legal del Receptor</label>
                    <select
                      value={invoiceRegime}
                      onChange={(e) => setInvoiceRegime(e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-xl text-[10px] font-black text-gray-700 outline-none cursor-pointer"
                    >
                      <option value="601 - General de Ley Personas Morales">601 - General de Ley Personas Morales</option>
                      <option value="626 - Régimen Simplificado de Confianza (RESICO)">626 - Simplificado de Confianza (RESICO)</option>
                      <option value="605 - Sueldos y Salarios e Ingresos Asimilados a Salarios">605 - Sueldos y Salarios</option>
                      <option value="612 - Personas Físicas con Actividades Empresariales">612 - Personas Físicas Empresariales</option>
                      <option value="Sin Obligaciones Fiscales">616 - Sin Obligaciones Fiscales</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-black text-gray-400 block">Uso previsto del CFDI / Factura</label>
                    <select
                      value={invoiceUseCFDI}
                      onChange={(e) => setInvoiceUseCFDI(e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-xl text-[10px] font-black text-gray-700 outline-none cursor-pointer"
                    >
                      <option value="G01 - Adquisición de mercancías">G01 - Adquisición de mercancías</option>
                      <option value="G03 - Gastos en general">G03 - Gastos en general</option>
                      <option value="D01 - Honorarios médicos, dentales y gastos hospitalarios">D01 - Gastos Médicos/Hospitalarios</option>
                      <option value="S01 - Sin efectos fiscales">S01 - Sin efectos fiscales / Justificante</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Action Checkout click buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsCheckoutOpen(false)}
                className="bg-white text-gray-400 border-2 border-gray-200 border-b-4 hover:bg-gray-50 active:translate-y-[2px] active:border-b-2 py-3 rounded-2xl font-black text-sm uppercase text-center cursor-pointer"
              >
                Volver
              </button>
              
              <button
                type="button"
                onClick={submitCheckout}
                className="bg-[#58cc02] text-white border-b-4 border-[#46a302] hover:bg-[#61e002] active:border-b-0 active:translate-y-[4px] py-3 rounded-2xl font-black text-sm uppercase text-center cursor-pointer"
              >
                Registrar Venta
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 3. TRANSACTION SUCCESS CELEBRATION CHUNKY OVERLAY */}
      {celebrateTxn && (
        <div className="fixed inset-0 z-50 bg-[#58cc02] flex flex-col items-center justify-center p-4 font-sans animate-zoomIn text-white text-center">
          
          <div className="max-w-md w-full space-y-6">
            
            {/* Character Bounces high and cheers */}
            <span className="text-9xl block select-none drop-shadow-lg transform animate-bounce duration-500">
              {activeChar.avatar}
            </span>

            <div className="space-y-2 animate-fadeIn">
              <span className="text-2xl font-black tracking-widest text-[#d2f09d] uppercase">
                ¡VENTA REALIZADA!
              </span>
              <h2 className="text-4xl md:text-5xl font-black leading-tight tracking-tight">
                {activeChar.name === 'Lily' ? 'Ugh, lo lograste.' : '¡Excelente Trabajo!'}
              </h2>
              <p className="text-white/90 font-black text-sm max-w-xs mx-auto italic pl-4 pr-4">
                "{activeChar.saleQuote}"
              </p>
            </div>

            {/* Dynamic Receipt Metadata */}
            <div className="bg-white/10 backdrop-blur-md rounded-3xl p-5 border border-white/20 space-y-4">
              <div className="flex justify-between items-center border-b border-white/10 pb-3 text-sm">
                <span className="font-extrabold text-white/80 uppercase tracking-wider text-xs">Monto Recaudado</span>
                <span className="text-2xl font-black font-mono">${celebrateTxn.total.toFixed(2)}</span>
              </div>

              {/* Reward stats */}
              <div className="flex justify-around items-center">
                <div className="flex flex-col items-center">
                  <div className="bg-yellow-400 text-amber-950 p-2.5 rounded-full shadow-md animate-spin-slow">
                    ⭐
                  </div>
                  <span className="text-[10px] uppercase font-black text-white/70 tracking-widest mt-1.5">RECOMPENSA</span>
                  <span className="text-lg font-black mt-0.5">+{celebrateTxn.xpGained} XP</span>
                </div>

                <div className="h-8 w-[1px] bg-white/10" />

                <div className="flex flex-col items-center">
                  <div className="bg-orange-450 p-2 text-xl tracking-wide">
                    🔥
                  </div>
                  <span className="text-[10px] uppercase font-black text-white/70 tracking-widest mt-1.5">RACHA</span>
                  <span className="text-lg font-black mt-0.5">ASEGURADA</span>
                </div>
              </div>

              {celebrateTxn.customerId && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs font-black uppercase text-[#d2f09d] flex items-center justify-between">
                  <span>💎 CLUB DE GEMAS:</span>
                  <span className="font-mono text-white text-[10px]">
                    {celebrateTxn.gemsRedeemed ? `CANJEADO -${celebrateTxn.gemsRedeemed}G` : ''} 
                    {celebrateTxn.gemsRedeemed && celebrateTxn.gemsGained ? ' | ' : ''}
                    {celebrateTxn.gemsGained ? `GANADO +${celebrateTxn.gemsGained}G` : ''}
                  </span>
                </div>
              )}

              {/* Simulated Cash Drawer Alert */}
              {celebrateTxn.paymentMethod === 'cash' && (
                <div className="bg-yellow-400/20 border-2 border-yellow-450 rounded-2xl p-3 text-xs text-yellow-100 flex items-center gap-2.5 shadow-sm animate-pulse text-left">
                  <span className="text-2xl">🔓</span>
                  <div>
                    <span className="font-extrabold text-yellow-300 block uppercase text-[10px] tracking-wider leading-none">Cajón de Dinero Simulado Abierto (Click!)</span>
                    <span className="font-semibold block text-[10px] text-white/95 mt-1 animate-fadeIn">El resorte mecánico se ha disparado. Guarda el efectivo recibido y entrega el cambio correspondiente.</span>
                  </div>
                </div>
              )}
            </div>

            {/* Real printing and sharing actions */}
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => handlePrintReceipt(celebrateTxn)}
                  className="bg-[#1cb0f6] text-white border-b-4 border-[#128bd0] hover:bg-[#34beff] active:translate-y-[2px] active:border-b-2 py-3 px-2 rounded-2xl font-black text-[10.5px] uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer"
                >
                  📄 Ticket Estándar PDF
                </button>

                <button
                  type="button"
                  onClick={() => handlePrintEscPosTicket(celebrateTxn)}
                  className="bg-slate-800 text-teal-300 border-b-4 border-slate-950 hover:bg-slate-700 active:translate-y-[2px] active:border-b-2 py-3 px-2 rounded-2xl font-black text-[10.5px] uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer"
                >
                  🖨️ Ticket Térmico ESC/POS
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleShareReceipt(celebrateTxn)}
                className="w-full bg-yellow-400 text-amber-950 border-b-4 border-[#caa200] hover:bg-[#fed635] active:translate-y-[2px] active:border-b-2 py-2.5 px-2 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {copiedNotification ? (
                  <span className="animate-pulse text-[10px] text-green-900 font-extrabold">¡Copiado en Portapapeles!</span>
                ) : (
                  <>Compartir Recibo 📲</>
                )}
              </button>
            </div>

            {celebrateTxn.invoiceData && (
              <button
                type="button"
                onClick={() => {
                  setSelectedTxnForActiveInvoice(celebrateTxn);
                  playSound('levelup');
                }}
                className="w-full bg-[#1e293b] text-white border-b-6 border-[#0f172a] hover:bg-slate-700 active:translate-y-[2px] active:border-b-2 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
              >
                🔍 Inspeccionar Factura XML/PDF (CFDI v4.0) 🏛️
              </button>
            )}

            {/* Action buttons to resume */}
            <button
              onClick={() => setCelebrateTxn(null)}
              className="w-full bg-white text-[#58cc02] border-b-[6px] border-[#dddddd] hover:bg-gray-50 active:border-b-0 active:translate-y-[6px] py-4 rounded-3xl font-black text-lg uppercase tracking-wider transition-all cursor-pointer"
            >
              Siguiente Cliente
            </button>

            <span className="text-xs text-white/60 font-black uppercase tracking-widest block">
              DuoPOS • El Cajero Ideal
            </span>

          </div>

        </div>
      )}

      {/* 4. HIGH QUALITY HARDWARE / CAMERA BARCODE SCANNER MODAL */}
      {isScannerOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white border-2 border-gray-200 border-b-8 rounded-3xl max-w-2xl w-full p-5 sm:p-6 md:p-8 space-y-6 relative shadow-2xl">
            
            <button
              onClick={() => { setIsScannerOpen(false); playSound('click'); }}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 p-1 bg-gray-50 border cursor-pointer font-black text-xs h-7 w-7 flex items-center justify-center select-none"
            >
              ✕
            </button>

            <div className="text-center space-y-1">
              <span className="text-4xl block animate-pulse">📷</span>
              <h3 className="text-2xl font-black text-gray-800 flex items-center justify-center gap-1.5 uppercase">
                <Barcode className="text-[#1cb0f6]" /> Lector de Código de Barras
              </h3>
              <p className="text-xs text-[#949494] font-black uppercase tracking-wider">
                Compatible con Webcams de Móviles/PC & Pistolas de Escáner USB Externas
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
              
              {/* LEFT COLUMN: LIVE WEBCAM VIDEO OR FALLBACK CONTAINER */}
              <div className="flex flex-col justify-between bg-black rounded-2xl p-4 border-2 border-slate-700 relative overflow-hidden min-h-[280px]">
                
                {/* Simulated/Real Neon Scan line */}
                {cameraStream && (
                  <div className="absolute inset-x-0 h-1 bg-green-500 shadow-[0_0_12px_#22c55e] z-10 animate-scanLine" />
                )}

                <div className="w-full flex-1 flex items-center justify-center relative bg-zinc-900 rounded-xl overflow-hidden min-h-[190px]">
                  {cameraStream ? (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover scale-x-[-1]"
                    />
                  ) : (
                    <div className="text-center p-4 space-y-3">
                      <div className="relative inline-block">
                        <Camera className="text-slate-600 mx-auto animate-pulse" size={48} />
                        <span className="absolute -bottom-1 -right-1 text-xs">⚠️</span>
                      </div>
                      <p className="text-xs text-gray-400 max-w-xs leading-normal">
                        Para escanear usando la cámara del dispositivo, concede permiso de acceso o usa el simulador interactivo de la derecha.
                      </p>
                    </div>
                  )}
                  
                  {/* Scope bracket targets overlay */}
                  <div className="absolute inset-4 pointer-events-none border-2 border-dashed border-white/20 rounded-lg flex items-center justify-center">
                    <div className="w-44 h-24 border-2 border-[#58cc02] rounded-md bg-transparent relative">
                      {/* corner indicators */}
                      <span className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-[#58cc02]" />
                      <span className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-[#58cc02]" />
                      <span className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-[#58cc02]" />
                      <span className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-[#58cc02]" />
                    </div>
                  </div>
                </div>

                {/* Live Status indicator */}
                <div className="mt-3 bg-white/10 text-white rounded-xl px-3 py-2 text-center text-[11px] font-black uppercase tracking-wider">
                  📢 {activeScanStatus}
                </div>
              </div>

              {/* RIGHT COLUMN: SIMULATOR BARCODE INTERACTION CATOLOGUE */}
              <div className="flex flex-col justify-between space-y-3">
                <div className="bg-gray-50 border border-gray-150 p-3 rounded-2xl">
                  <span className="text-[10px] font-black uppercase text-gray-400 block tracking-widest mb-1">
                    Simulación táctil de código
                  </span>
                  <p className="text-[10px] text-gray-500 font-bold leading-normal mb-2">
                    Si no tienes empaques físicos ni cámara activa, haz clic en cualquiera de los productos de la tienda para simular un haz de lectura láser instantánea con DuoPOS:
                  </p>

                  <div className="space-y-1.5 max-h-[190px] overflow-y-auto pr-1">
                    {products.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => simulateBarcodeScan(p)}
                        className="w-full text-left bg-white hover:bg-green-50 hover:border-green-300 border border-gray-200 p-2 rounded-xl flex items-center justify-between text-xs font-bold text-gray-700 transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{p.emoji}</span>
                          <div>
                            <p className="font-extrabold text-gray-800 line-clamp-1 truncate">{p.name}</p>
                            <span className="font-mono text-[9px] text-[#1cb0f6] bg-blue-50/50 py-0.5 px-1.5 rounded-md">
                              EAN-{p.barcode || '7501...'}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] font-black text-[#58cc02] group-hover:underline">
                          Escanear ⚡
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-amber-50/50 border border-amber-150 p-2 rounded-xl text-[10px] text-amber-800 font-bold leading-normal">
                  💡 <strong>Modo Pistola Láser Real:</strong> No necesitas abrir ningún modal para facturar físicamente. Al conectar tu lector, puedes escanear directamente desde la pantalla de ventas a gran velocidad.
                </div>
              </div>

            </div>

            <button
              type="button"
              onClick={() => { setIsScannerOpen(false); playSound('click'); }}
              className="w-full bg-[#58cc02] text-white border-b-4 border-[#46a302] hover:bg-[#61e002] active:translate-y-[2px] active:border-b-2 py-3.5 rounded-2xl font-black text-sm uppercase text-center cursor-pointer tracking-wider"
            >
              Cerrar Escáner
            </button>

          </div>
        </div>
      )}

      {/* 5. ARQUEO DE CAJA / CLOSE REG SHIFT MODAL */}
      {isClosingShiftOpen && activeShift && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn text-gray-800">
          <div className="bg-white border-2 border-gray-200 border-b-8 rounded-3xl max-w-md w-full p-5 sm:p-6 space-y-6 relative shadow-2xl">
            
            <button
              type="button"
              onClick={() => { setIsClosingShiftOpen(false); playSound('click'); }}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-650 rounded-full hover:bg-gray-100 p-1 bg-gray-50 border cursor-pointer font-black text-xs h-7 w-7 flex items-center justify-center select-none"
            >
              ✕
            </button>

            <div className="text-center space-y-1">
              <span className="text-4xl block leading-none select-none">🔒</span>
              <h3 className="text-xl font-black text-gray-850 flex items-center justify-center gap-1.5 uppercase leading-tight mt-2">
                Arqueo e Informe de Cierre
              </h3>
              <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider">
                Cuadrar caja registradora y dar por terminado el turno actual
              </p>
            </div>

            <div className="space-y-4 bg-gray-50 border p-4 rounded-2xl">
              <div className="grid grid-cols-2 gap-3 text-xs font-bold text-gray-605">
                <div>
                  <p className="text-[9px] text-[#949494] uppercase tracking-wider">Fondo de Apertura</p>
                  <p className="text-sm font-black text-gray-800">${activeShift.initialCash.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-[9px] text-[#949494] uppercase tracking-wider">Ventas Acumuladas</p>
                  <p className="text-sm font-black text-gray-800">${activeShift.salesVolume.toFixed(2)}</p>
                </div>
              </div>

              <hr className="border-gray-200" />

              {/* Dynamic breakdown formula */}
              <div className="space-y-1 bg-white p-3 rounded-xl border border-gray-150 text-xs">
                <span className="text-[9px] font-black text-[#949494] uppercase tracking-widest block mb-1">
                  Cálculo Contable Estimado (Z)
                </span>
                <div className="flex justify-between text-gray-500 font-medium">
                  <span>(+) Fondo inicial</span>
                  <span>+${activeShift.initialCash.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between text-gray-500 font-medium">
                  <span>(+) Entregas en efectivo (Ventas)</span>
                  <span>+${Math.max(0, Number((activeShift.expectedCash - activeShift.initialCash - activeShift.movements.filter(m => m.type === 'in').reduce((acc, m) => acc + m.amount, 0) + activeShift.movements.filter(m => m.type === 'out').reduce((acc, m) => acc + m.amount, 0)).toFixed(2))).toFixed(2)}</span>
                </div>

                {activeShift.movements.length > 0 && (
                  <div className="space-y-0.5 border-t pt-2 mt-2 font-medium text-[11px]">
                    {activeShift.movements.map(m => (
                      <div key={m.id} className="flex justify-between text-slate-400">
                        <span>{m.type === 'in' ? '📈 Inyección:' : '📉 Retiro:'} {m.reason}</span>
                        <span className={m.type === 'in' ? 'text-green-600' : 'text-red-500'}>
                          {m.type === 'in' ? '+' : '-'}${m.amount.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-between font-black border-t-2 border-dashed border-gray-200 pt-2 text-gray-800 mt-2 text-xs">
                  <span>EFECTIVO ESPERADO TOTAL:</span>
                  <span>${activeShift.expectedCash.toFixed(2)}</span>
                </div>
              </div>

              {/* User Manual counter input */}
              <div className="space-y-1.5 bg-white p-3.5 rounded-xl border border-gray-155">
                <label className="text-[10px] uppercase font-black text-gray-400 tracking-wider block font-sans">
                  Efectivo Real en Caja ($)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-mono font-black text-lg text-gray-400">$</span>
                  <input
                    type="number"
                    value={closingCashCount}
                    onChange={(e) => {
                      setClosingCashCount(e.target.value);
                    }}
                    className="w-full pl-7 pr-3 py-2 border-2 border-gray-200 focus:border-[#58cc02] rounded-xl font-black font-mono text-xs text-gray-800 outline-none transition-all"
                    placeholder="Declarar saldo fisico..."
                    min="0"
                    step="any"
                  />
                </div>
                
                {(() => {
                  const counted = parseFloat(closingCashCount) || 0;
                  const diff = counted - activeShift.expectedCash;
                  const isPerfect = Math.abs(diff) < 0.01;
                  const isShort = diff < 0;

                  return (
                    <div className={`mt-2 p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border leading-tight ${
                      isPerfect 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-250' 
                        : isShort 
                          ? 'bg-red-50 text-red-750 border-red-200' 
                          : 'bg-amber-50 text-amber-700 border-amber-250'
                    }`}>
                      <span className="select-none h-4 w-4">⚖️</span>
                      <div>
                        <p className="font-extrabold text-gray-805">
                          Diferencia: {diff >= 0 ? '+' : ''}${diff.toFixed(2)} ({isPerfect ? 'Perfecto' : isShort ? 'Faltante de Caja' : 'Sobrante de Caja'})
                        </p>
                        <p className="text-[9px] font-medium opacity-80 mt-0.5 leading-normal">
                          {isPerfect 
                            ? '¡Perfecto! No hay discrepancia entre el esperado y el saldo físico.' 
                            : isShort 
                              ? 'El saldo físico reportado es menor al estimado por el sistema.' 
                              : 'El saldo reportado físico es mayor que los movimientos registrados.'}
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Observaciones */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-black text-gray-400 block tracking-wider">
                  Observaciones o Comentarios del Arqueo
                </label>
                <textarea
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  placeholder="Ej. Se retiraron centavos de cambio, redondeos o comentarios extra..."
                  className="w-full p-3 border-2 border-gray-200 focus:border-red-500 rounded-xl font-bold text-xs text-gray-700 outline-none transition-colors h-14 resize-none"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const actualVal = parseFloat(closingCashCount) || 0;
                const expectedVal = activeShift.expectedCash;
                const diffVal = actualVal - expectedVal;

                onCloseShift(actualVal, expectedVal, diffVal, closingNotes);
                
                // Save the closed shift details locally to display the final Ticket Audit view
                const summaryRep: CashShift = {
                  ...activeShift,
                  closingTime: new Date().toISOString(),
                  actualCash: actualVal,
                  difference: diffVal,
                  status: 'closed',
                  expectedCash: expectedVal
                };
                setLastClosedShiftReport(summaryRep);

                if (Math.abs(diffVal) < 0.1) {
                  playSound('levelup');
                } else {
                  playSound('error');
                }
                
                setIsClosingShiftOpen(false);
                setClosingCashCount('');
                setClosingNotes('');
              }}
              className="w-full bg-red-500 text-white border-b-4 border-red-700 hover:bg-red-400 active:translate-y-[2px] active:border-b-2 py-4 rounded-2xl font-black text-xs uppercase tracking-wider text-center cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-xs"
            >
              <span>Realizar Cierre de Caja 🔒</span>
            </button>

          </div>
        </div>
      )}

      {/* 6. INGRESO O RETIRO DE EFECTIVO AUXILIAR MODAL */}
      {isMovementOpen && activeShift && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn text-gray-800">
          <div className="bg-white border-2 border-gray-200 border-b-8 rounded-3xl max-w-sm w-full p-5 sm:p-6 space-y-6 relative shadow-2xl">
            
            <button
              type="button"
              onClick={() => { setIsMovementOpen(false); playSound('click'); }}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-650 rounded-full hover:bg-gray-100 p-1 bg-gray-50 border cursor-pointer font-black text-xs h-7 w-7 flex items-center justify-center select-none"
            >
              ✕
            </button>

            <div className="text-center space-y-1">
              <span className="text-4xl block leading-none select-none">💸</span>
              <h3 className="text-xl font-black text-gray-850 flex items-center justify-center gap-1.5 uppercase mt-2 leading-tight">
                Movimiento de Efectivo
              </h3>
              <p className="text-[10px] text-[#949494] font-black uppercase tracking-wider">
                Inyectar cambio o retirar efectivo para pagos auxiliares
              </p>
            </div>

            <div className="space-y-4 bg-gray-50 border p-4 rounded-xl text-xs">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-black text-gray-400 block tracking-wider">
                  Tipo de Flujo de Caja
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setMovementType('in'); playSound('click'); }}
                    className={`py-2 rounded-xl text-xs font-black border-2 text-center cursor-pointer select-none transition-all ${
                      movementType === 'in'
                        ? 'bg-green-500 border-green-500 text-white shadow-xs'
                        : 'bg-white border-gray-200 text-gray-600'
                    }`}
                  >
                    📈 Entrada (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMovementType('out'); playSound('click'); }}
                    className={`py-2 rounded-xl text-xs font-black border-2 text-center cursor-pointer select-none transition-all ${
                      movementType === 'out'
                        ? 'bg-red-500 border-red-500 text-white shadow-xs'
                        : 'bg-white border-gray-200 text-gray-600'
                    }`}
                  >
                    📉 Salida (-)
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                <label className="text-[10px] uppercase font-black text-gray-400 block tracking-wider font-sans">
                  Monto del Movimiento ($)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 font-bold text-gray-405 text-sm leading-none">$</span>
                  <input
                    type="number"
                    value={movementAmount}
                    onChange={(e) => setMovementAmount(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 border-2 border-gray-200 focus:border-[#58cc02] rounded-xl font-black font-mono text-xs text-gray-700 outline-none transition-colors"
                    placeholder="0.00"
                    min="0"
                    step="any"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-black text-gray-400 block tracking-wider">
                  Motivo o Concepto
                </label>
                <input
                  type="text"
                  value={movementReason}
                  onChange={(e) => setMovementReason(e.target.value)}
                  className="w-full px-3.5 py-2 border-2 border-gray-200 focus:border-[#58cc02] rounded-xl font-bold text-xs text-gray-700 outline-none transition-colors"
                  placeholder="Ej: Sencillo para dar cambio, Pago de refrescos..."
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const amt = parseFloat(movementAmount) || 0;
                if (amt <= 0) {
                  playSound('error');
                  alert('⛔ Ingresa un monto mayor a cero.');
                  return;
                }
                if (movementType === 'out' && amt > activeShift.expectedCash) {
                  playSound('error');
                  alert(`⛔ Fondos insuficientes. No puedes retirar más del efectivo disponible ($${activeShift.expectedCash.toFixed(2)})`);
                  return;
                }
                onAddShiftMovement(movementType, amt, movementReason);
                playSound('success');
                setIsMovementOpen(false);
                setMovementAmount('');
                setMovementReason('');
              }}
              className="w-full bg-[#58cc02] text-white border-b-4 border-[#3c9e01] hover:bg-[#61e002] active:translate-y-[2px] active:border-b-2 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider text-center cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-xs"
            >
              <span>Registrar Movimiento ⚡</span>
            </button>

          </div>
        </div>
      )}

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

      {/* Dynamic F&B Hospitality Overlay Modals */}
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

      {/* 4. ADVANCED POS EXTRA MODAL: FREE WORKSTATION SALE */}
      {isFreeSaleModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#141414]/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white border-2 border-[#e5e5e5] border-b-[8px] rounded-3xl p-6 space-y-4 shadow-xl animate-scaleUp text-left">
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
                <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Nombre por Concepto o Descripción</label>
                <input
                  type="text"
                  placeholder="Ej. Envase Especial, Producto sin código, Servicio"
                  value={freeSaleName}
                  onChange={(e) => setFreeSaleName(e.target.value)}
                  className="w-full pl-3 pr-3 py-2 bg-white border-2 border-[#e5e5e5] rounded-xl font-bold text-sm text-gray-800 outline-none focus:border-[#58cc02]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Precio Unitario ($)</label>
                  <input
                    type="text"
                    placeholder="0.00"
                    value={freeSalePrice}
                    onChange={(e) => setFreeSalePrice(e.target.value.replace(/[^0-9.]/g, ''))}
                    className="w-full pl-3 pr-3 py-2 bg-white border-2 border-[#e5e5e5] rounded-xl font-mono font-bold text-sm text-gray-800 outline-none focus:border-[#58cc02]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Cantidad de Items</label>
                  <input
                    type="text"
                    placeholder="1"
                    value={freeSaleQty}
                    onChange={(e) => setFreeSaleQty(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full pl-3 pr-3 py-2 bg-white border-2 border-[#e5e5e5] rounded-xl font-mono font-bold text-sm text-gray-800 outline-none focus:border-[#58cc02]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Categoría Sectorial (Para Impuestos)</label>
                <select
                  value={freeSaleCategory}
                  onChange={(e) => setFreeSaleCategory(e.target.value)}
                  className="w-full pl-3 pr-3 py-2 bg-white border-2 border-[#e5e5e5] rounded-xl font-bold text-sm text-gray-800 outline-none focus:border-[#58cc02]"
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
                    alert("⚠️ Ingresa un precio válido mayor a 0.");
                    return;
                  }
                  const customProd = {
                    id: `FREE-${Date.now()}`,
                    name,
                    price,
                    cost: price * 0.65, 
                    stock: 9999, 
                    category: freeSaleCategory,
                    emoji: '🏷️',
                    description: 'Venta rápida libre de mostrador'
                  };
                  setCart(prev => [...prev, { product: customProd, quantity: qty }]);
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

      {/* 5. ADVANCED POS EXTRA MODAL: EDIT CART ITEM DETAIL */}
      {editingCartItem && (
        <div className="fixed inset-0 z-50 bg-[#141414]/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white border-2 border-[#e5e5e5] border-b-[8px] rounded-3xl p-6 space-y-4 shadow-xl animate-scaleUp text-left">
            <div className="flex justify-between items-center border-b border-gray-150 pb-2">
              <span className="font-extrabold text-gray-800 text-sm uppercase flex items-center gap-1.5">
                ⚙️ Editar Artículo del Carrito: {editingCartItem.product.emoji} {editingCartItem.product.name}
              </span>
              <button
                onClick={() => setEditingCartItem(null)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5">
              {/* Unit Price Overwrite */}
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Precio Unitario Overwrite ($)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-400 font-extrabold">$</span>
                  <input
                    type="text"
                    value={editCartItemPrice}
                    onChange={(e) => setEditCartItemPrice(e.target.value.replace(/[^0-9.]/g, ''))}
                    className="w-full pl-6 pr-3 py-1.5 bg-white border-2 border-[#e5e5e5] rounded-xl font-mono font-bold text-sm text-gray-800 outline-none focus:border-[#58cc02]"
                  />
                </div>
                <span className="text-[9px] text-gray-400 font-bold mt-1 block">Precio regular del catálogo: ${editingCartItem.product.price.toFixed(2)}</span>
              </div>

              {/* Quantity setting */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Cantidad Exacta (Manual)</label>
                  <input
                    type="text"
                    value={editCartItemQty}
                    onChange={(e) => setEditCartItemQty(e.target.value.replace(/[^0-9.]/g, ''))}
                    className="w-full pl-3 pr-3 py-1.5 bg-white border-2 border-[#e5e5e5] rounded-xl font-mono font-bold text-sm text-gray-800 outline-none focus:border-[#58cc02]"
                  />
                  <span className="text-[9px] text-gray-400 font-bold mt-0.5 block">Stock: {editingCartItem.product.stock}</span>
                </div>

                {/* Item-level discount % */}
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Descuento de Item (%)</label>
                  <input
                    type="text"
                    placeholder="0"
                    min="0"
                    max="100"
                    value={editCartItemDiscount}
                    onChange={(e) => setEditCartItemDiscount(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full pl-3 pr-3 py-1.5 bg-white border-2 border-red-200 text-red-600 rounded-xl font-mono font-bold text-sm outline-none focus:border-red-500"
                  />
                  <span className="text-[9px] text-red-400 font-bold mt-0.5 block">Se resta de esta línea únicamente</span>
                </div>
              </div>

              {/* Specific notes */}
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Notas de Línea / Instrucciones</label>
                <input
                  type="text"
                  placeholder="Ej. Sabor fresa / Caja sin abrir / Empaque dañado"
                  value={editCartItemNotes}
                  onChange={(e) => setEditCartItemNotes(e.target.value)}
                  className="w-full pl-3 pr-3 py-1.5 bg-white border-2 border-[#e5e5e5] rounded-xl font-bold text-xs text-gray-800 outline-none focus:border-[#58cc02]"
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

      {/* 5. MOBILE FLOATING ACTION SUMMARY BAR */}
      {cart.length > 0 && !isMobileCartOpen && !isCheckoutOpen && (
        <div className="lg:hidden fixed bottom-[72px] inset-x-4 z-40 animate-slideUp">
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
                <span className="text-[10px] font-bold">Total: <strong className="font-mono font-black text-sm">${totalAmount.toFixed(2)} USD</strong></span>
                <span className="text-[9px] font-black text-white/90">{totalAmountVES.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.</span>
              </span>
              <span className="text-lg">👉</span>
            </span>
          </button>
        </div>
      )}

      {/* 6. MOBILE SLIDE-UP BOTTOM SHEET DRAWER */}
      {isMobileCartOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
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
            <div className="w-full py-2 flex justify-center items-center cursor-pointer select-none border-b border-gray-100/50"
                 onClick={() => {
                   setIsMobileCartOpen(false);
                   playSound('click');
                 }}>
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
                        const confirmClear = confirm("¿Deseas vaciar por completo el carrito actual?");
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
                      className="text-[10px] font-black text-red-500 hover:text-red-650 uppercase tracking-widest cursor-pointer bg-red-50 px-2 py-1 rounded-xl border border-red-100"
                      title="Vaciar carrito"
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
                  {cart.map(it => (
                    <div key={it.product.id} className="flex justify-between items-center text-xs font-bold text-gray-700 pt-3 first:pt-0">
                      
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-2xl select-none flex-shrink-0">{it.product.emoji}</span>
                        <div className="min-w-0 text-left">
                          <p className="font-extrabold text-[#3c3c3c] truncate text-xs leading-tight mb-0.5">{it.product.name}</p>
                          <div className="flex items-center flex-wrap gap-1">
                            {it.customPrice !== undefined ? (
                              <>
                                <span className="text-[9px] line-through text-gray-300 font-bold">${it.product.price.toFixed(2)}</span>
                                <span className="text-[10px] text-blue-600 font-black">${it.customPrice.toFixed(2)}</span>
                              </>
                            ) : (
                              <span className="text-[10px] text-[#58cc02] font-black">${it.product.price.toFixed(2)}</span>
                            )}
                            <span className="text-[10px] text-gray-400 font-extrabold bg-[#f1fcf0] border border-green-100 px-1 rounded-md" title="Monto equivalente en Bolívares">
                              {((it.customPrice !== undefined ? it.customPrice : it.product.price) * exchangeRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.
                            </span>
                            {it.discountPercent && (
                              <span className="text-[8px] bg-red-100 text-red-700 px-1 py-0.2 rounded font-black border border-red-150">
                                -{it.discountPercent}% OFF
                              </span>
                            )}
                          </div>
                          
                          {/* Modifiers and Notes */}
                          {it.notes && (
                            <p className="text-[9px] text-indigo-650 bg-indigo-50 px-1.5 py-0.5 rounded inline-block font-black mt-1 leading-normal text-left truncate max-w-[130px]">
                              📝 {it.notes}
                            </p>
                          )}
                          {it.addons && it.addons.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1 text-left">
                              {it.addons.map((add, addIdx) => (
                                <span key={addIdx} className="text-[8px] text-[#2c7a02] bg-[#f2ffd4] font-black px-1 py-0.5 rounded border border-[#ccd9ad]">
                                  +{add.name} (+${add.price.toFixed(2)})
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Quantity controls */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <div className="flex items-center border border-gray-200 rounded-lg bg-gray-50 p-0.5 select-none font-black text-xs">
                          <button
                            onClick={() => removeFromCart(it.product.id)}
                            className="p-1 hover:bg-gray-200 rounded text-gray-500"
                          >
                            <Minus size={11} strokeWidth={3} />
                          </button>
                          <span className="px-1.5 font-black text-gray-800 font-mono">
                            {it.quantity}
                          </span>
                          <button
                            disabled={it.quantity >= it.product.stock}
                            onClick={() => addToCart(it.product)}
                            className="p-1 hover:bg-gray-200 rounded text-gray-500 disabled:opacity-40"
                          >
                            <Plus size={11} strokeWidth={3} />
                          </button>
                        </div>

                        {/* Modifiers trigger */}
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

              {/* Loyalty customer linkage (Duolingo Style mobile widget) */}
              {cart.length > 0 && (
                <div className="bg-[#fcfcfc] border-2 border-gray-100 rounded-2xl p-3 space-y-2 select-none">
                  <div className="flex justify-between items-center bg-white border border-gray-150 p-2 rounded-xl">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xl">👥</span>
                      {selectedCustomer ? (
                        <div className="min-w-0 text-left">
                          <p className="text-xs font-black text-gray-800 truncate">
                            {selectedCustomer.name}
                          </p>
                          <p className="text-[9px] text-gray-400 font-extrabold uppercase tracking-wide">
                            Liga {selectedCustomer.league} • <span className="text-[#58cc02]">💎 {selectedCustomer.gems} G</span>
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
                        className="text-red-500 hover:text-red-650 font-extrabold text-[10px] uppercase border border-red-100 px-2 py-1 rounded-lg hover:bg-red-50 cursor-pointer"
                      >
                        Quitar
                      </button>
                    ) : (
                      <select
                        value=""
                        onChange={(e) => {
                          const cust = customers.find(c => c.id === e.target.value);
                          if (cust) {
                            setSelectedCustomer(cust);
                            playSound('success');
                          }
                        }}
                        className="text-[#1cb0f6] border border-sky-150 bg-sky-50 rounded-lg px-2 py-1 text-[10px] font-black uppercase outline-none cursor-pointer max-w-[120px]"
                      >
                        <option value="">+ Asociar Cliente</option>
                        {customers.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name} (💎{c.gems})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {selectedCustomer && selectedCustomer.gems >= 10 && (
                    <div className="bg-white border border-gray-150 rounded-xl p-2">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer font-extrabold text-[10px] uppercase tracking-wider text-gray-650">
                          <input
                            type="checkbox"
                            checked={useGemsDiscount}
                            onChange={(e) => {
                              setUseGemsDiscount(e.target.checked);
                              playSound('click');
                            }}
                            className="rounded border-gray-300 text-[#58cc02]"
                          />
                          <span>Canjear Gemas</span>
                        </label>
                        <span className="text-xs font-black font-mono text-[#58cc02]">💎 {selectedCustomer.gems}</span>
                      </div>
                      {useGemsDiscount && (
                        <p className="text-[9px] text-gray-400 font-bold mt-1.5 pt-1.5 border-t border-dashed text-left">
                          Descuento aplicado: <span className="text-gray-800 font-extrabold">${gemsDiscount.toFixed(2)} USD</span>
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
                    <p className={`text-[10px] font-extrabold text-left ${promoMessage.includes('⛔') ? 'text-red-500' : 'text-[#58cc02]'}`}>
                      {promoMessage}
                    </p>
                  )}
                </div>
              )}

              {/* Math summaries */}
              {cart.length > 0 && (
                <div className="space-y-1.5 text-xs text-gray-500 font-extrabold p-3 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="flex justify-between items-center text-[11px]">
                    <span>Subtotal:</span>
                    <span className="text-gray-700">${subtotal.toFixed(2)} USD • <span className="text-gray-400 font-bold">{subtotalVES.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.</span></span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between items-center text-[11px] text-red-500">
                      <span>Descuento:</span>
                      <span>-${discountAmount.toFixed(2)} USD • <span className="text-red-400 font-bold">-{discountAmountVES.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.</span></span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-[11px]">
                    <span>Impuesto Ventas:</span>
                    <span className="text-gray-700">${taxAmount.toFixed(2)} USD • <span className="text-gray-400 font-bold">{taxAmountVES.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.</span></span>
                  </div>
                  <div className="flex flex-col text-sm font-black text-gray-800 border-t border-dashed border-gray-200 pt-2 text-right">
                    <div className="flex justify-between items-center w-full">
                      <span>Total a pagar USD:</span>
                      <span className="text-base text-[#58cc02] font-black">${totalAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center w-full mt-1 border-t border-dotted border-gray-100 pt-1">
                      <span className="text-[11px] text-indigo-500">Equivalente VES:</span>
                      <span className="text-sm font-black text-indigo-650 tracking-wide animate-pulse">{totalAmountVES.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.</span>
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
                        alert("⚠️ Selecciona una Mesa en el mapa superior primero.");
                        return;
                      }
                      playSound('success');
                      setTables(prev => prev.map(t => {
                        if (t.id === activeTableId) {
                          return {
                            ...t,
                            status: 'occupied',
                            waiterName: activeWaiterName || 'Personal General',
                            cart: cart,
                            customer: selectedCustomer,
                            occupiedSince: t.occupiedSince || new Date().toISOString()
                          };
                        }
                        return t;
                      }));
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
                      const activeTable = tables.find(t => t.id === activeTableId);
                      const tableName = activeTable ? activeTable.name : 'Venta de Mostrador';
                      
                      const newOrder: KitchenOrder = {
                        id: `KITCHEN-${Math.floor(1000 + Math.random() * 9000).toString()}`,
                        tableId: activeTableId || 'walk-in',
                        tableName: tableName,
                        waiterName: activeWaiterName || 'Personal General',
                        sentAt: new Date().toISOString(),
                        items: cart.map(it => ({
                          name: it.product.name,
                          emoji: it.product.emoji,
                          quantity: it.quantity,
                          notes: it.notes,
                          addons: it.addons
                        })),
                        status: 'pending'
                      };
                      
                      setKitchenOrders(prev => [newOrder, ...prev]);
                      if (activeTableId) {
                        setTables(prev => prev.map(t => {
                          if (t.id === activeTableId) {
                            return { ...t, status: 'occupied', cart: cart };
                          }
                          return t;
                        }));
                        setCart([]);
                        setActiveTableId(null);
                        setSelectedCustomer(null);
                        setIsMobileCartOpen(false);
                      }
                      alert("🛎️ ¡Enviado a cocina con éxito!");
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
                    handleOpenCheckout();
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

    </div>
  );
}
