/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Product, User } from '../types';
import { CATEGORIES } from '../initialData';
import { playSound } from '../utils/sounds';
import { 
  Edit, Trash, Plus, Search, Archive, AlertTriangle, X, Check, 
  ShoppingBag, Truck, FileText, Clipboard, TrendingUp, Clock, 
  DollarSign, Send, ArrowRight, ShieldCheck, RefreshCw, Layers, 
  HelpCircle, UserCheck, Star, Sparkles, CheckCircle2, PlusCircle
} from 'lucide-react';

interface Supplier {
  id: string;
  name: string;
  contact: string;
  phone: string;
  email: string;
  category: string;
  address: string;
  deliveryDays: number;
  reliability: number; // 0 - 100
  balance: number; // outstanding liability
}

interface PurchaseOrderItem {
  productId: string;
  name: string;
  emoji: string;
  cost: number;
  quantity: number;
}

interface PurchaseOrder {
  id: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseOrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: 'cash' | 'credit'; // Contado (cash drawer) or Crédito (accounts payable)
  status: 'draft' | 'sent' | 'transit' | 'received' | 'cancelled';
  createdAt: string;
  estimatedDelivery: string;
  receivedAt?: string;
  carrier: string;
}

interface InventoryScreenProps {
  products: Product[];
  onAddProduct: (prod: Omit<Product, 'id'>) => void;
  onUpdateProduct: (prod: Product) => void;
  onDeleteProduct: (id: string) => void;
  onGrantXp?: (xp: number) => void;
  activeShift?: any;
  onAddShiftMovement?: (type: 'in' | 'out', amount: number, reason: string) => void;
  currentUser: User;
}

const QUICK_EMOJIS = ['☕', '🍵', '🥤', '🍩', '🍰', '🍪', '🍎', '🍇', '🍫', '🍬', '🧪', '🩹', '🦉', '🧢', '👕', '🧸', '🎒', '🎟️', '⚡', '📦'];

export default function InventoryScreen({ 
  products, 
  onAddProduct, 
  onUpdateProduct, 
  onDeleteProduct, 
  onGrantXp, 
  activeShift, 
  onAddShiftMovement,
  currentUser
}: InventoryScreenProps) {
  
  // Tabs & Filters
  const [activeSubTab, setActiveSubTab] = useState<'catalog' | 'alerts' | 'suppliers' | 'orders' | 'accounts'>('catalog');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');

  // Suppliers & Orders persistence
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    const saved = localStorage.getItem('duo_pos_suppliers');
    if (saved) return JSON.parse(saved);
    const defaults: Supplier[] = [
      { id: 'sup-1', name: '🦉 Cafes del Nido Supremo', contact: 'Abelardo Verde', phone: '555-0100', email: 'cafe.nido@duomail.com', category: 'Bebidas', address: 'Carretera Cafetal #44, Veracruz', deliveryDays: 1, reliability: 98, balance: 350.00 },
      { id: 'sup-2', name: '🍩 Repostería de Racha Especial', contact: 'Zari Pastelera', phone: '555-0122', email: 'donas.racha@duomail.com', category: 'Postres', address: 'Av. Tristeza #15, CDMX', deliveryDays: 2, reliability: 95, balance: 0.00 },
      { id: 'sup-3', name: '🧪 Pociones & Elixires Falstaff', contact: 'Dr. Falstaff', phone: '555-0144', email: 'pociones.falstaff@duomail.com', category: 'Consumibles', address: 'Cueva del Valle #3, Sierra Madre', deliveryDays: 3, reliability: 88, balance: 640.00 },
      { id: 'sup-4', name: '👕 Merchandising Oficial Duo', contact: 'Eddy Senior', phone: '555-0188', email: 'caps.duo@duomail.com', category: 'Merch', address: 'Pradera del Sol #8, Monterrey', deliveryDays: 2, reliability: 94, balance: 0.00 }
    ];
    localStorage.setItem('duo_pos_suppliers', JSON.stringify(defaults));
    return defaults;
  });

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(() => {
    const saved = localStorage.getItem('duo_pos_purchase_orders');
    if (saved) return JSON.parse(saved);
    const defaults: PurchaseOrder[] = [
      {
        id: 'po-1001',
        supplierId: 'sup-1',
        supplierName: '🦉 Cafes del Nido Supremo',
        items: [
          { productId: 'prod-1', name: 'Café de la Racha (Espresso)', emoji: '☕', cost: 1.20, quantity: 40 }
        ],
        subtotal: 48.00,
        tax: 7.68,
        total: 55.68,
        paymentMethod: 'credit',
        status: 'received',
        createdAt: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
        estimatedDelivery: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
        receivedAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
        carrier: 'DuoExpress Air 🦉'
      },
      {
        id: 'po-1002',
        supplierId: 'sup-3',
        supplierName: '🧪 Pociones & Elixires Falstaff',
        items: [
          { productId: 'prod-2', name: 'Poción de Vida Extra', emoji: '🧪', cost: 1.50, quantity: 30 }
        ],
        subtotal: 45.00,
        tax: 7.20,
        total: 52.20,
        paymentMethod: 'credit',
        status: 'transit',
        createdAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
        estimatedDelivery: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString(),
        carrier: 'Lily-Cargo Express 🛒'
      }
    ];
    localStorage.setItem('duo_pos_purchase_orders', JSON.stringify(defaults));
    return defaults;
  });

  // Core Product Forms States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState(0);
  const [cost, setCost] = useState(0);
  const [stock, setStock] = useState(0);
  const [minStock, setMinStock] = useState(5);
  const [category, setCategory] = useState('Consumibles');
  const [emoji, setEmoji] = useState('🍩');
  const [description, setDescription] = useState('');
  const [productSupplierId, setProductSupplierId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Supply Logs persistence (for quick reorders)
  const [restockLog, setRestockLog] = useState<any[]>(() => {
    return JSON.parse(localStorage.getItem('duo_pos_restock_log') || '[]');
  });
  const [defaultIdealStock, setDefaultIdealStock] = useState(25);

  // Supplier Form States
  const [isSupplierFormOpen, setIsSupplierFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supName, setSupName] = useState('');
  const [supContact, setSupContact] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supEmail, setSupEmail] = useState('');
  const [supCategory, setSupCategory] = useState('Bebidas');
  const [supAddress, setSupAddress] = useState('');
  const [supDeliveryDays, setSupDeliveryDays] = useState(2);
  const [supReliability, setSupReliability] = useState(90);
  const [supError, setSupError] = useState('');

  // PO Compiler Form States
  const [isOrderFormOpen, setIsOrderFormOpen] = useState(false);
  const [orderSupplierId, setOrderSupplierId] = useState('');
  const [orderPaymentMethod, setOrderPaymentMethod] = useState<'cash' | 'credit'>('cash');
  const [orderCarrier, setOrderCarrier] = useState('DuoExpress Air 🦉');
  const [orderNotes, setOrderNotes] = useState('');
  const [orderItems, setOrderItems] = useState<{ productId: string, name: string, emoji: string, cost: number, quantity: number }[]>([]);
  const [orderError, setOrderError] = useState('');
  const [orderFilterStatus, setOrderFilterStatus] = useState<'all' | 'draft' | 'sent' | 'transit' | 'received' | 'cancelled'>('all');

  // Accounts Payable Quick Action
  const [paySupId, setPaySupId] = useState('');
  const [payAmountVal, setPayAmountVal] = useState('');
  const [payMethod, setPayMethod] = useState<'cash' | 'transfer'>('cash');
  const [payoutSuccess, setPayoutSuccess] = useState('');

  // Core Math & Filters
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            p.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = selectedCategory === 'Todos' || p.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [products, searchQuery, selectedCategory]);

  const criticalProducts = useMemo(() => {
    return products.filter(p => p.stock <= (p.minStock !== undefined ? p.minStock : 5));
  }, [products]);

  const totalAccountsPayable = useMemo(() => {
    return suppliers.reduce((acc, s) => acc + (s.balance || 0), 0);
  }, [suppliers]);

  const pendingOrdersCount = useMemo(() => {
    return purchaseOrders.filter(o => o.status === 'sent' || o.status === 'transit').length;
  }, [purchaseOrders]);

  const averageReliability = useMemo(() => {
    if (suppliers.length === 0) return 100;
    const sum = suppliers.reduce((acc, s) => acc + s.reliability, 0);
    return Math.round(sum / suppliers.length);
  }, [suppliers]);

  // Product Form Handlers
  const handleOpenNewForm = () => {
    setEditingProduct(null);
    setName('');
    setPrice(3.00);
    setCost(1.00);
    setStock(10);
    setMinStock(5);
    setCategory('Consumibles');
    setEmoji('🍩');
    setDescription('');
    setProductSupplierId('');
    setErrorMsg('');
    setIsFormOpen(true);
    playSound('click');
  };

  const handleOpenEditForm = (prod: Product) => {
    setEditingProduct(prod);
    setName(prod.name);
    setPrice(prod.price);
    setCost(prod.cost);
    setStock(prod.stock);
    setMinStock(prod.minStock !== undefined ? prod.minStock : 5);
    setCategory(prod.category);
    setEmoji(prod.emoji || '🍩');
    setDescription(prod.description);
    setProductSupplierId((prod as any).supplierId || '');
    setErrorMsg('');
    setIsFormOpen(true);
    playSound('click');
  };

  const handleSubmitProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setErrorMsg('El producto requiere un nombre.'); return; }
    if (price <= 0) { setErrorMsg('La tarifa debe ser mayor a 0.'); return; }
    if (cost < 0) { setErrorMsg('El costo de fábrica no puede ser negativo.'); return; }
    if (stock < 0) { setErrorMsg('El stock no puede ser menor a 0.'); return; }

    setErrorMsg('');
    const details = {
      name: name.trim(),
      price: Number(price),
      cost: Number(cost),
      stock: Number(stock),
      minStock: Number(minStock),
      category,
      emoji,
      description: description.trim(),
      supplierId: productSupplierId || undefined
    };

    if (editingProduct) {
      onUpdateProduct({ id: editingProduct.id, ...details } as any);
      playSound('success');
    } else {
      onAddProduct(details as any);
      if (onGrantXp) onGrantXp(15);
      playSound('levelup');
    }
    setIsFormOpen(false);
  };

  const handleDeleteProduct = (id: string) => {
    if (currentUser?.role !== 'admin') {
      alert('🔒 Acceso Denegado: Solo el Administrador Corporativo puede dar de baja productos del catálogo principal.');
      setDeleteConfirmId(null);
      return;
    }
    onDeleteProduct(id);
    setDeleteConfirmId(null);
    playSound('swoosh');
  };

  // Supplier Form Handlers
  const handleOpenNewSupplier = () => {
    setEditingSupplier(null);
    setSupName('');
    setSupContact('');
    setSupPhone('');
    setSupEmail('');
    setSupCategory('Bebidas');
    setSupAddress('');
    setSupDeliveryDays(2);
    setSupReliability(95);
    setSupError('');
    setIsSupplierFormOpen(true);
    playSound('click');
  };

  const handleOpenEditSupplier = (sup: Supplier) => {
    setEditingSupplier(sup);
    setSupName(sup.name);
    setSupContact(sup.contact);
    setSupPhone(sup.phone);
    setSupEmail(sup.email);
    setSupCategory(sup.category);
    setSupAddress(sup.address);
    setSupDeliveryDays(sup.deliveryDays);
    setSupReliability(sup.reliability || 90);
    setSupError('');
    setIsSupplierFormOpen(true);
    playSound('click');
  };

  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supName.trim()) { setSupError('Nombre requerido.'); return; }

    let updatedList;
    if (editingSupplier) {
      updatedList = suppliers.map(s => s.id === editingSupplier.id ? {
        ...s,
        name: supName.trim(),
        contact: supContact.trim(),
        phone: supPhone.trim(),
        email: supEmail.trim(),
        category: supCategory,
        address: supAddress.trim(),
        deliveryDays: Number(supDeliveryDays),
        reliability: Number(supReliability)
      } : s);
    } else {
      const newS: Supplier = {
        id: `sup-${Date.now()}`,
        name: supName.trim(),
        contact: supContact.trim(),
        phone: supPhone.trim(),
        email: supEmail.trim(),
        category: supCategory,
        address: supAddress.trim(),
        deliveryDays: Number(supDeliveryDays),
        reliability: Number(supReliability),
        balance: 0.00
      };
      updatedList = [...suppliers, newS];
      if (onGrantXp) onGrantXp(25);
    }

    setSuppliers(updatedList);
    localStorage.setItem('duo_pos_suppliers', JSON.stringify(updatedList));
    setIsSupplierFormOpen(false);
    playSound('levelup');
  };

  const handleDeleteSupplier = (id: string) => {
    if (confirm('¿Eliminar este proveedor de la cadena?')) {
      const updated = suppliers.filter(s => s.id !== id);
      setSuppliers(updated);
      localStorage.setItem('duo_pos_suppliers', JSON.stringify(updated));
      playSound('swoosh');
    }
  };

  // Purchase Order Compiler Actions
  const computedSubtotal = useMemo(() => {
    return orderItems.reduce((acc, it) => acc + (it.cost * it.quantity), 0);
  }, [orderItems]);

  const computedTax = useMemo(() => Number((computedSubtotal * 0.16).toFixed(2)), [computedSubtotal]);
  const computedTotal = useMemo(() => Number((computedSubtotal + computedTax).toFixed(2)), [computedSubtotal, computedTax]);

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
    setOrderItems([...orderItems, {
      productId: firstProd.id,
      name: firstProd.name,
      emoji: firstProd.emoji || '📦',
      cost: firstProd.cost,
      quantity: 10
    }]);
    playSound('click');
  };

  const handleUpdateOrderItem = (idx: number, fields: Partial<PurchaseOrderItem>) => {
    const updated = [...orderItems];
    updated[idx] = { ...updated[idx], ...fields } as any;

    if (fields.productId) {
      const match = products.find(p => p.id === fields.productId);
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
    if (!orderSupplierId) { setOrderError('Proveedor requerido.'); return; }
    if (orderItems.length === 0) { setOrderError('Debe agregar mínimo 1 artículo.'); return; }

    for (const it of orderItems) {
      if (it.quantity <= 0) { setOrderError('Cantidad inválida.'); return; }
      if (it.cost < 0) { setOrderError('Costo inválido.'); return; }
    }

    const selectedSup = suppliers.find(s => s.id === orderSupplierId);
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
      carrier: orderCarrier
    };

    const updated = [newPO, ...purchaseOrders];
    setPurchaseOrders(updated);
    localStorage.setItem('duo_pos_purchase_orders', JSON.stringify(updated));
    setIsOrderFormOpen(false);

    if (status === 'sent') {
      if (onGrantXp) onGrantXp(40);
      playSound('success');
    } else {
      playSound('click');
    }
  };

  const handleTransitOrder = (id: string) => {
    const updated = purchaseOrders.map(po => po.id === id ? { ...po, status: 'transit' as const } : po);
    setPurchaseOrders(updated);
    localStorage.setItem('duo_pos_purchase_orders', JSON.stringify(updated));
    playSound('click');
  };

  const handleReceiveOrder = (id: string) => {
    const o = purchaseOrders.find(po => po.id === id);
    if (!o) return;

    // 1. ADD STOCKS
    o.items.forEach(item => {
      const p = products.find(prod => prod.id === item.productId);
      if (p) {
        onUpdateProduct({ ...p, stock: p.stock + item.quantity });
      }
    });

    // 2. CASH / AP
    if (o.paymentMethod === 'cash') {
      if (onAddShiftMovement && activeShift) {
        onAddShiftMovement('out', o.total, `Logística: Pago contado PO-${o.id}`);
      }
    } else {
      const updatedS = suppliers.map(s => s.id === o.supplierId ? { ...s, balance: Number((s.balance + o.total).toFixed(2)) } : s);
      setSuppliers(updatedS);
      localStorage.setItem('duo_pos_suppliers', JSON.stringify(updatedS));
    }

    // 3. Status update
    const updatedPO = purchaseOrders.map(po => po.id === id ? { ...po, status: 'received' as const, receivedAt: new Date().toISOString() } : po);
    setPurchaseOrders(updatedPO);
    localStorage.setItem('duo_pos_purchase_orders', JSON.stringify(updatedPO));

    if (onGrantXp) onGrantXp(85);
    playSound('levelup');
    alert(`🎉 ¡Lote recibido! Insumos de la orden PO-${o.id} agregados a bodega.`);
  };

  const handleCancelOrder = (id: string) => {
    if (confirm('¿Cancelar esta orden?')) {
      const updated = purchaseOrders.map(po => po.id === id ? { ...po, status: 'cancelled' as const } : po);
      setPurchaseOrders(updated);
      localStorage.setItem('duo_pos_purchase_orders', JSON.stringify(updated));
      playSound('error');
    }
  };

  // Accounts Payable Payout Handler
  const handleRegisterPayout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paySupId) { alert('Selecciona el proveedor.'); return; }
    const sup = suppliers.find(s => s.id === paySupId);
    if (!sup) return;

    const val = Number(payAmountVal);
    if (isNaN(val) || val <= 0 || val > sup.balance) {
      alert(`Monto inválido. Rango: $0.01 - $${sup.balance.toFixed(2)}`);
      return;
    }

    const updated = suppliers.map(s => s.id === paySupId ? { ...s, balance: Number((s.balance - val).toFixed(2)) } : s);
    setSuppliers(updated);
    localStorage.setItem('duo_pos_suppliers', JSON.stringify(updated));

    if (payMethod === 'cash' && onAddShiftMovement && activeShift) {
      onAddShiftMovement('out', val, `Logística: Liquidación adeudo prov "${sup.name}"`);
    }

    if (onGrantXp) onGrantXp(40);
    playSound('kaching');
    setPayoutSuccess(`💸 Pago de $${val.toFixed(2)} registrado éxitosamente para ${sup.name}.`);
    setPayAmountVal('');
    setTimeout(() => setPayoutSuccess(''), 5000);
  };

  return (
    <div className="space-y-6 animate-fadeIn font-sans p-1 md:p-3 relative pb-12 w-full text-gray-800 text-left">
      
      {/* Dynamic Title Header Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-800 tracking-tight flex items-center gap-2">
            <span>🛡️</span> Administración de Cadena & Almacén
          </h2>
          <p className="text-gray-400 font-extrabold text-sm">
            Control de bodega integral, gestión de proveedores y órdenes de reabastecimiento DuoExpress.
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button
            id="btn-new-product"
            onClick={handleOpenNewForm}
            className="bg-[#58cc02] text-white border-b-4 border-[#46a302] hover:bg-[#61e002] active:border-b-0 active:translate-y-[4px] font-black py-3 px-5 rounded-2xl transition-all duration-100 flex items-center gap-1.5 tracking-wide uppercase text-xs cursor-pointer select-none"
          >
            <Plus size={16} /> Registrar Producto
          </button>
          
          <button
            id="btn-new-supplier"
            onClick={handleOpenNewSupplier}
            className="bg-indigo-600 text-white border-b-4 border-indigo-800 hover:bg-indigo-550 active:border-b-0 active:translate-y-[4px] font-black py-3 px-5 rounded-2xl transition-all duration-100 flex items-center gap-1.5 tracking-wide uppercase text-xs cursor-pointer select-none"
          >
            <Truck size={16} /> Onboard Proveedor
          </button>
        </div>
      </div>

      {/* Navigation Tabbing Row */}
      <div className="flex flex-wrap border-b-2 border-gray-200 gap-1 md:gap-4 mb-3 select-none">
        {[
          { key: 'catalog', label: '📦 Catálogo Central', count: products.length },
          { key: 'alerts', label: '🚨 Alertas Críticas', count: criticalProducts.length, alert: true },
          { key: 'suppliers', label: '🤝 Proveedores', count: suppliers.length },
          { key: 'orders', label: '🚚 Órdenes Compra', count: purchaseOrders.length, highlight: pendingOrdersCount > 0 },
          { key: 'accounts', label: '💸 Cuentas Por Pagar', special: `$${totalAccountsPayable.toFixed(2)}` }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveSubTab(tab.key as any); playSound('click'); }}
            className={`pb-3 px-2.5 text-xs md:text-sm font-black uppercase tracking-wider border-b-4 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === tab.key
                ? 'border-[#58cc02] text-[#58cc02]'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (tab.count > 0 || tab.alert) && (
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black select-none ${
                tab.alert ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 text-gray-550'
              }`}>
                {tab.count}
              </span>
            )}
            {tab.special && (
              <span className="text-[10px] px-2 py-0.5 bg-amber-100 border border-amber-300 text-amber-800 rounded-lg font-mono">
                {tab.special}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ----------------- SUB-TAB: CATALOG ----------------- */}
      {activeSubTab === 'catalog' && (
        <div className="space-y-4 animate-fadeIn">
          
          {/* Filters Bar */}
          <div className="bg-white border-2 border-gray-200 border-b-[6px] rounded-3xl p-5 space-y-4">
            <div className="relative">
              <span className="absolute left-4 top-3 text-gray-400">
                <Search size={18} />
              </span>
              <input
                type="text"
                placeholder="Filtrar por nombre, categoría o especificaciones..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border-2 border-[#e5e5e5] rounded-2xl font-bold text-gray-700 outline-none focus:border-[#58cc02] focus:bg-white transition-all text-xs md:text-sm"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {['Todos', ...CATEGORIES.filter(c => c !== 'Todos')].map(cat => (
                <button
                  key={cat}
                  onClick={() => { setSelectedCategory(cat); playSound('click'); }}
                  className={`py-1.5 px-3 rounded-xl font-black text-[10px] md:text-xs tracking-wide transition-all border-b-2 uppercase cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-white text-[#58cc02] border-[#58cc02] border'
                      : 'bg-white text-gray-400 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Grid display */}
          {filteredProducts.length === 0 ? (
            <div className="bg-white border-2 border-gray-200 rounded-3xl p-12 text-center max-w-md mx-auto space-y-4">
              <span className="text-5xl block animate-bounce">📦</span>
              <h3 className="text-xl font-black text-gray-600">Catálogo Vacío</h3>
              <p className="text-gray-400 text-xs font-bold leading-relaxed">
                Ningún artículo coincide con tu búsqueda. Registra insumos con el botón superior para darles vida en el POS.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredProducts.map(prod => {
                const limit = prod.minStock !== undefined ? prod.minStock : 5;
                const low = prod.stock <= limit;
                const supplierObj = suppliers.find(s => s.id === (prod as any).supplierId);

                return (
                  <div key={prod.id} className="bg-white border-2 border-gray-200 border-b-[6px] rounded-3xl p-4 flex flex-col justify-between space-y-3 relative hover:scale-[1.01] transition-transform">
                    <div className="flex justify-between items-start">
                      <div className="bg-gray-50 border border-gray-100 w-11 h-11 rounded-2xl flex items-center justify-center text-2xl font-bold p-1 select-none flex-shrink-0">
                        {prod.emoji || '📦'}
                      </div>
                      
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleOpenEditForm(prod)}
                          className="p-1.5 border border-blue-200 text-blue-500 rounded-xl hover:bg-blue-50 transition-colors cursor-pointer"
                        >
                          <Edit size={12} />
                        </button>

                        {deleteConfirmId === prod.id ? (
                          <div className="flex items-center gap-1 animate-fadeIn">
                            <button
                              onClick={() => handleDeleteProduct(prod.id)}
                              className="px-2 py-1 bg-red-500 text-white rounded-lg font-black text-[10px]"
                            >
                              Sí
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-2 py-1 bg-gray-100 text-gray-550 rounded-lg text-[10px]"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmId(prod.id)}
                            className="p-1.5 border border-red-200 text-red-500 rounded-xl hover:bg-red-50 transition-colors cursor-pointer"
                          >
                            <Trash size={12} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-0.5 text-left">
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] bg-slate-100 text-gray-500 border border-slate-200 rounded px-1.5 py-0.5 font-bold uppercase leading-none">
                          {prod.category}
                        </span>
                        {supplierObj && (
                          <span className="text-[9px] bg-indigo-50 border border-indigo-200 text-indigo-750 px-1.5 py-0.5 rounded leading-none font-bold truncate max-w-[80px]">
                            {supplierObj.name.replace(/🦉|🍩|🧪|👕/g, '').trim()}
                          </span>
                        )}
                      </div>
                      <h4 className="text-base font-black text-gray-800 leading-tight pt-1">{prod.name}</h4>
                      <p className="text-[11px] text-gray-400 font-bold line-clamp-2 leading-tight">{prod.description || 'Sin detalles.'}</p>
                    </div>

                    {/* Stock Alert block */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[10px] font-black uppercase text-gray-400">
                        <span>Stock:</span>
                        {prod.stock === 0 ? (
                          <span className="text-red-500 bg-red-50 px-1.5 py-0.5 border border-red-200 rounded font-black text-[9px]">Agotado</span>
                        ) : low ? (
                          <span className="text-orange-500 bg-orange-50 px-1.5 py-0.5 border border-orange-200 rounded font-black text-[9px]">Bajo (&lt;{limit})</span>
                        ) : (
                          <span className="text-[#58cc02] bg-green-50 px-1.5 py-0.5 border border-green-200 rounded text-[9px] font-black">Suficiente</span>
                        )}
                      </div>
                      <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all ${prod.stock === 0 ? 'bg-red-500' : low ? 'bg-orange-500' : 'bg-[#58cc02]'}`}
                          style={{ width: `${Math.min((prod.stock / 50) * 100, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-[10px] font-mono text-gray-500 pt-0.5">
                        <span>Disponible: {prod.stock} un.</span>
                        {prod.barcode && <span className="text-[8px] text-gray-300">#{prod.barcode}</span>}
                      </div>
                    </div>

                    {/* Cost / Price layout */}
                    <div className="pt-2 border-t border-gray-100 flex justify-between items-center text-xs">
                      <div>
                        <span className="text-[9px] text-gray-400 font-extrabold uppercase block leading-none">P. Venta</span>
                        <span className="text-sm font-black text-gray-700">${prod.price.toFixed(2)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] text-gray-400 font-extrabold uppercase block leading-none">Costo Fábrica</span>
                        <span className="text-xs font-black text-gray-500">${prod.cost.toFixed(2)}</span>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ----------------- SUB-TAB: ALERTS & REPLENISH ----------------- */}
      {activeSubTab === 'alerts' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border-2 border-gray-200 border-b-[6px] rounded-3xl p-4 flex items-center gap-3">
              <span className="text-3xl bg-red-100 border border-red-200 p-2 rounded-2xl">🚨</span>
              <div>
                <span className="text-2xl font-black text-red-500 block leading-none">{criticalProducts.length}</span>
                <span className="text-[10px] font-black uppercase text-gray-405 tracking-wide">Insumos Deficitarios</span>
              </div>
            </div>

            <div className="bg-white border-2 border-gray-200 border-b-[6px] rounded-3xl p-4 flex items-center gap-3">
              <span className="text-3xl bg-yellow-100 border border-yellow-200 p-2 rounded-2xl">📦</span>
              <div>
                <span className="text-2xl font-black text-amber-600 block leading-none">
                  {criticalProducts.reduce((sum, p) => sum + Math.max(0, defaultIdealStock - p.stock), 0)} un
                </span>
                <span className="text-[10px] font-black uppercase text-gray-405 tracking-wide">Brecha a Stock Ideal</span>
              </div>
            </div>

            <div className="bg-white border-2 border-gray-200 border-b-[6px] rounded-3xl p-4 flex items-center gap-3">
              <span className="text-3xl bg-blue-100 border border-blue-200 p-2 rounded-2xl">💵</span>
              <div>
                <span className="text-2xl font-black text-blue-500 block leading-none">
                  ${criticalProducts.reduce((sum, p) => sum + (Math.max(0, defaultIdealStock - p.stock) * p.cost), 0).toFixed(2)}
                </span>
                <span className="text-[10px] font-black uppercase text-gray-405 tracking-wide">Inversión Estimada</span>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-5 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="space-y-0.5 text-left flex-1">
              <span className="text-[9px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded font-black uppercase">Fórmula de Reorden Automática</span>
              <h4 className="text-lg font-black text-amber-950">Disparo de Lote Express Duo L1</h4>
              <p className="text-xs text-amber-800 font-bold max-w-lg">
                Reabastece de golpe todas las existencias críticas hasta el tope ideal de <strong className="text-amber-950">{defaultIdealStock} unidades</strong> por producto. Otorga +50 XP.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="flex flex-col items-center bg-white p-2 border border-amber-200 rounded-2xl font-bold">
                <span className="text-[9px] uppercase text-gray-400">Meta Ideal</span>
                <div className="flex items-center gap-1 mt-0.5">
                  <button onClick={() => setDefaultIdealStock(p => Math.max(10, p - 5))} className="w-6 h-6 bg-slate-100 rounded text-center font-black text-xs cursor-pointer">-</button>
                  <span className="text-xs w-6 text-center text-gray-800 font-mono">{defaultIdealStock}</span>
                  <button onClick={() => setDefaultIdealStock(p => Math.min(100, p + 5))} className="w-6 h-6 bg-slate-100 rounded text-center font-black text-xs cursor-pointer">+</button>
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
                  className="bg-[#ff9600] text-white border-b-4 border-[#df7e00] hover:bg-[#ffa726] active:border-b-0 active:translate-y-1 font-black px-4 py-3 rounded-2xl text-xs uppercase"
                >
                  Surtir Todo L1 🚚
                </button>
              ) : (
                <span className="text-xs font-black text-green-600 bg-green-50 border border-green-200 px-4 py-3 rounded-2xl">BODEGA CRÍTICA AL 100% ✅</span>
              )}
            </div>
          </div>

          {/* List of critical items */}
          <div className="bg-white border-2 border-gray-200 border-b-[6px] rounded-3xl p-5 space-y-4">
            <h4 className="text-xs font-black uppercase text-gray-450 border-b pb-2">Artículos Bajo el Mínimo Autorizado ({criticalProducts.length})</h4>
            {criticalProducts.length === 0 ? (
              <p className="text-center py-6 text-xs text-gray-400 font-bold">🎉 Todos los productos cumplen el margen mínimo de reserva.</p>
            ) : (
              <div className="divide-y divide-gray-100 text-xs">
                {criticalProducts.map(p => {
                  const req = Math.max(0, defaultIdealStock - p.stock);
                  return (
                    <div key={p.id} className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 first:pt-0">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{p.emoji || '📦'}</span>
                        <div>
                          <p className="font-extrabold text-gray-850 text-sm">{p.name}</p>
                          <p className="text-gray-400 text-[10px]">Stock actual: <strong className="text-red-500">{p.stock} un</strong> / Ideal: {defaultIdealStock}</p>
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
                          className="bg-white border border-gray-200 text-gray-700 px-3 py-1.5 rounded-xl font-bold hover:bg-gray-50 cursor-pointer"
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
                          className="bg-[#58cc02] text-white px-3 py-1.5 rounded-xl font-black hover:bg-[#61e002] cursor-pointer"
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
      )}

      {/* ----------------- SUB-TAB: SUPPLIERS ----------------- */}
      {activeSubTab === 'suppliers' && (
        <div className="space-y-4 animate-fadeIn">
          
          {/* Supplier Dashboard Insights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-indigo-50 border-2 border-indigo-200 rounded-3xl p-4 flex items-center gap-3">
              <span className="text-3xl">👥</span>
              <div>
                <span className="text-2xl font-black text-indigo-950 block leading-none">{suppliers.length}</span>
                <span className="text-[10px] uppercase font-black text-indigo-500 leading-none">Aliados Frecuentes</span>
              </div>
            </div>

            <div className="bg-emerald-50 border-2 border-emerald-200 rounded-3xl p-4 flex items-center gap-3">
              <span className="text-3xl">🏆</span>
              <div>
                <span className="text-2xl font-black text-emerald-700 block leading-none">{averageReliability}%</span>
                <span className="text-[10px] uppercase font-black text-emerald-600 leading-none">Fiabilidad Media</span>
              </div>
            </div>

            <div className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-4 flex items-center gap-3">
              <span className="text-3xl">💵</span>
              <div>
                <span className="text-2xl font-black text-amber-700 block leading-none">${totalAccountsPayable.toFixed(2)}</span>
                <span className="text-[10px] uppercase font-black text-amber-600 leading-none">Deudas Pendientes AP</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-left">
            {suppliers.map(sup => (
              <div key={sup.id} className="bg-white border-2 border-gray-200 border-b-[6px] rounded-3xl p-4.5 flex flex-col justify-between space-y-3 relative">
                <div className="space-y-2 text-left">
                  <div className="flex justify-between items-start">
                    <span className="text-2xl">🏢</span>
                    <div className="flex gap-1.5">
                      <button onClick={() => name && handleOpenEditSupplier(sup)} className="p-1 border border-indigo-200 text-indigo-500 rounded-lg hover:bg-indigo-50 cursor-pointer">
                        <Edit size={10} />
                      </button>
                      <button onClick={() => handleDeleteSupplier(sup.id)} className="p-1 border border-red-200 text-red-500 rounded-lg hover:bg-red-50 cursor-pointer">
                        <Trash size={10} />
                      </button>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-base font-black text-gray-800 leading-tight">{sup.name}</h4>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Especialidad: {sup.category}</p>
                  </div>

                  <div className="space-y-1 text-xs">
                    <p className="font-semibold text-gray-650 flex items-center gap-1"><span>👤 Contacto:</span> <strong className="text-gray-800 font-extrabold">{sup.contact}</strong></p>
                    <p className="text-gray-500 flex items-center gap-1"><span>📞 Cel:</span> {sup.phone}</p>
                    <p className="text-gray-500 flex items-center gap-1 text-[11px] truncate"><span>✉️ Email:</span> {sup.email}</p>
                    <p className="text-[10px] text-gray-400 italic font-medium leading-tight">{sup.address}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-dashed border-gray-200 space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-black">
                    <span className="text-gray-400">FIABILIDAD COMERCIAL:</span>
                    <span className={sup.reliability >= 95 ? 'text-green-600' : sup.reliability >= 90 ? 'text-indigo-600' : 'text-red-500'}>
                      {sup.reliability}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${sup.reliability >= 95 ? 'bg-green-500' : sup.reliability >= 90 ? 'bg-indigo-500' : 'bg-red-500'}`} style={{ width: `${sup.reliability}%` }} />
                  </div>

                  <div className="flex justify-between items-center bg-gray-50 p-2 rounded-xl text-left border">
                    <div>
                      <span className="text-[9px] text-gray-400 block leading-none font-bold">Acarreo de Saldo</span>
                      <span className="text-xs font-black text-gray-700">${sup.balance.toFixed(2)}</span>
                    </div>
                    {sup.balance > 0 ? (
                      <button 
                        onClick={() => { setActiveSubTab('accounts'); setPaySupId(sup.id); playSound('click'); }} 
                        className="bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300 font-black px-2.5 py-1 rounded-lg text-[9px] uppercase cursor-pointer"
                      >
                        Saldar
                      </button>
                    ) : (
                      <span className="text-[9px] text-green-600 bg-green-50 px-2 py-1 rounded-lg border border-green-250 font-black">Al día</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ----------------- SUB-TAB: PURCHASE ORDERS ----------------- */}
      {activeSubTab === 'orders' && (
        <div className="space-y-4 animate-fadeIn">
          
          <div className="flex flex-wrap justify-between items-center gap-3">
            <div className="flex flex-wrap gap-1 select-none">
              {[
                { status: 'all', label: 'Todas' },
                { status: 'draft', label: 'Borrador 📝' },
                { status: 'sent', label: 'Enviadas 🚀' },
                { status: 'transit', label: 'En Tránsito 🚚' },
                { status: 'received', label: 'Recibidas ✅' }
              ].map(s => (
                <button
                  key={s.status}
                  onClick={() => { setOrderFilterStatus(s.status as any); playSound('click'); }}
                  className={`py-1.5 px-3 rounded-lg text-[10px] font-black uppercase border cursor-pointer ${
                    orderFilterStatus === s.status
                      ? 'bg-blue-600 text-white border-blue-700'
                      : 'bg-white text-gray-500 border-gray-200'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <button
              onClick={handleOpenNewOrder}
              className="bg-blue-500 hover:bg-blue-600 text-white border-b-4 border-blue-700 active:border-b-0 active:translate-y-1 text-xs py-2 px-4 rounded-xl font-black uppercase flex items-center gap-1 cursor-pointer select-none"
            >
              <PlusCircle size={14} /> Elaborar Órden (PO)
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-left">
            {purchaseOrders
              .filter(o => orderFilterStatus === 'all' || o.status === orderFilterStatus)
              .map(order => {
                const isDraft = order.status === 'draft';
                const isSent = order.status === 'sent';
                const isTransit = order.status === 'transit';
                const isReceived = order.status === 'received';

                return (
                  <div key={order.id} className="bg-white border-2 border-gray-200 border-b-[6px] rounded-3xl p-4.5 flex flex-col justify-between space-y-3">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-mono text-xs font-black text-blue-600">PO Ref: {order.id}</span>
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg border ${
                          isReceived ? 'bg-green-50 border-green-200 text-green-700' :
                          isTransit ? 'bg-orange-50 border-orange-200 text-orange-700 animate-pulse' :
                          isSent ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-slate-100 text-gray-500 border-slate-250'
                        }`}>
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
                          <div key={i} className="flex justify-between items-center text-[11px] font-semibold text-gray-750">
                            <span>{it.emoji} {it.name} (x{it.quantity})</span>
                            <span className="font-mono">${(it.cost * it.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 border-t space-y-3">
                      <div className="flex justify-between items-baseline text-xs font-bold font-mono">
                        <span className="text-gray-400">TÉRMINOS: {order.paymentMethod === 'cash' ? '🤝 CONTADO' : '💸 CRÉDITO AP'}</span>
                        <span className="text-gray-800 font-black text-sm">TOTAL: ${order.total.toFixed(2)}</span>
                      </div>

                      <div className="flex gap-1">
                        {isDraft && (
                          <>
                            <button
                              onClick={() => {
                                const updated = purchaseOrders.map(po => po.id === order.id ? { ...po, status: 'sent' as const } : po);
                                setPurchaseOrders(updated);
                                localStorage.setItem('duo_pos_purchase_orders', JSON.stringify(updated));
                                if (onGrantXp) onGrantXp(40);
                                playSound('success');
                              }}
                              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-black py-1.5 rounded-xl text-[10px] uppercase cursor-pointer"
                            >
                              Enviar 🚀
                            </button>
                            <button onClick={() => handleCancelOrder(order.id)} className="px-3 py-1.5 border hover:bg-red-50 text-red-500 font-bold rounded-xl text-[10px] uppercase cursor-pointer">
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
                          <div className="w-full text-center py-1.5 bg-green-50 text-green-700 rounded-xl font-black text-[9px] uppercase border">
                            Cargado el {order.receivedAt ? new Date(order.receivedAt).toLocaleDateString() : 'N/A'} ✅
                          </div>
                        )}

                        {order.status === 'cancelled' && (
                          <div className="w-full text-center py-1.5 bg-red-50 text-red-650 rounded-xl font-black text-[9px] uppercase border">
                            Orden Cancelada ❌
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ----------------- SUB-TAB: ACCOUNTS PAYABLE ----------------- */}
      {activeSubTab === 'accounts' && (
        <div className="space-y-4 animate-fadeIn text-left">
          
          <div className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-5">
            <h4 className="flex items-center gap-1.5 text-amber-900 font-black text-sm">
              <span>💸</span> Portal de Liquidación de Cuentas por Pagar Proveedor
            </h4>
            <p className="text-xs text-amber-800 leading-normal font-bold max-w-xl mt-1">
              Aquí puedes registrar abonos directos para tus proveedores sobre tus pedidos de racha cargados a Crédito. 
              Si seleccionas <strong>Efectivo de Caja</strong>, se descontará automáticamente el efectivo de tu turno de caja registradora activo.
            </p>
          </div>

          {payoutSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-black rounded-2xl p-3 animate-pulse">
              {payoutSuccess}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
            
            {/* Pay form Left */}
            <form onSubmit={handleRegisterPayout} className="bg-white border-2 border-gray-200 border-b-[6px] rounded-3xl p-5 space-y-4">
              <h4 className="text-xs font-black uppercase text-gray-500 border-b pb-2">Registrar Abono</h4>
              
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-300">Seleccionar Proveedor</label>
                <select
                  value={paySupId}
                  onChange={(e) => { setPaySupId(e.target.value); playSound('click'); }}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl p-2 text-xs font-bold outline-none cursor-pointer text-gray-700"
                >
                  <option value="">-- Elige un proveedor --</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} (${s.balance.toFixed(2)})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-300">Canal de Egreso</label>
                <div className="grid grid-cols-2 gap-2 text-xs font-black">
                  <button
                    type="button"
                    onClick={() => { setPayMethod('cash'); playSound('click'); }}
                    className={`py-2 border rounded-xl cursor-pointer ${
                      payMethod === 'cash' ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-slate-50 text-gray-500'
                    }`}
                  >
                    Efectivo de Caja
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPayMethod('transfer'); playSound('click'); }}
                    className={`py-2 border rounded-xl cursor-pointer ${
                      payMethod === 'transfer' ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-slate-50 text-gray-500'
                    }`}
                  >
                    Transferencia / Banco
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-300">Monto del Abono ($)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={payAmountVal}
                  onChange={(e) => setPayAmountVal(e.target.value)}
                  className="w-full bg-slate-50 border rounded-xl p-2 text-xs font-bold outline-none text-gray-800"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-[#58cc02] text-white font-black py-2.5 rounded-xl text-xs uppercase border-b-4 border-green-700 hover:bg-[#61e002] active:border-b-0 cursor-pointer"
              >
                Efectuar Pago ⚡
              </button>
            </form>

            {/* List Right */}
            <div className="lg:col-span-2 bg-white border-2 border-gray-200 border-b-[6px] rounded-3xl p-5 space-y-3">
              <h4 className="text-xs font-black uppercase text-gray-400 tracking-wider">Cuentas Pendientes por Proveedor</h4>
              <div className="divide-y divide-gray-100 text-xs">
                {suppliers.filter(s => s.balance > 0).length === 0 ? (
                  <p className="text-gray-400 italic text-center py-6 font-bold">😊 ¡Eres un socio estrella! No tienes cuentas por pagar activas en tus líneas de crédito.</p>
                ) : (
                  suppliers.filter(s => s.balance > 0).map(s => (
                    <div key={s.id} className="py-2.5 flex justify-between items-center first:pt-0">
                      <div>
                        <p className="font-extrabold text-gray-800">{s.name}</p>
                        <p className="text-[10px] text-gray-400">Contacto: {s.contact} | Cel: {s.phone}</p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-mono font-black text-red-500 text-sm">${s.balance.toFixed(2)}</span>
                        <button
                          onClick={() => {
                            setPaySupId(s.id);
                            setPayAmountVal(s.balance.toString());
                            playSound('click');
                          }}
                          className="bg-indigo-100 hover:bg-indigo-200 border border-indigo-200 text-indigo-700 font-extrabold px-3 py-1 rounded-xl text-[10px]"
                        >
                          Cargar Todo
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ----------------- COMPILER MODAL: NEW PURCHASE ORDER ----------------- */}
      {isOrderFormOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn text-gray-800">
          <div className="bg-white border-2 border-gray-200 border-b-8 rounded-3xl max-w-2xl w-full p-5 space-y-4 relative text-left">
            <button onClick={() => setIsOrderFormOpen(false)} className="absolute right-4 top-4 p-2 text-gray-400 hover:text-gray-600 rounded-full"><X size={20} /></button>

            <div className="space-y-1">
              <h3 className="text-xl font-black text-gray-800 flex items-center gap-1.5">🧁 Preparar Órden de Insumos DuoExpress</h3>
              <p className="text-xs text-gray-400 font-bold">Generará una solicitud de compra oficial dirigida a tu socio de suministro aliado.</p>
            </div>

            {orderError && (
              <div className="p-2.5 bg-red-50 text-red-650 border border-red-200 rounded-xl text-xs font-bold">{orderError}</div>
            )}

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1 text-left">
                <label className="text-[10px] font-black uppercase text-gray-400">1. Seleccionar Proveedor Alianza</label>
                <select
                  value={orderSupplierId}
                  onChange={(e) => setOrderSupplierId(e.target.value)}
                  className="w-full bg-slate-50 border rounded-xl p-2 text-xs font-bold text-gray-700 cursor-pointer"
                >
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.category})</option>)}
                </select>
              </div>

              <div className="space-y-1 text-left">
                <label className="text-[10px] font-black uppercase text-gray-400">2. Método de Liquidación</label>
                <select
                  value={orderPaymentMethod}
                  onChange={(e: any) => setOrderPaymentMethod(e.target.value)}
                  className="w-full bg-slate-50 border rounded-xl p-2 text-xs font-bold text-gray-700 cursor-pointer"
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
                  className="w-full bg-slate-50 border rounded-xl p-2 text-xs font-bold text-gray-700 cursor-pointer"
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
                  className="w-full bg-slate-50 border rounded-xl p-2 text-xs font-bold text-gray-800"
                />
              </div>
            </div>

            {/* Item compilation rows */}
            <div className="space-y-2 border-t pt-3 text-left">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black uppercase text-gray-400">Renglones de Materiales ({orderItems.length})</label>
                <button
                  type="button"
                  onClick={handleAddOrderItem}
                  className="text-xs text-blue-500 hover:underline font-black flex items-center gap-0.5"
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
                      {products.map(p => <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>)}
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
                      className="text-red-500 hover:text-red-700 p-1 font-bold"
                    >
                      ✕
                    </button>
                  </div>
                ))}

                {orderItems.length === 0 && (
                  <p className="text-center text-[11px] text-gray-400 py-4 italic font-bold">Haz click en "+ Agregar Artículo" para construir el pedido.</p>
                )}
              </div>
            </div>

            {/* Calculations summaries */}
            <div className="bg-slate-50 border p-3 rounded-2xl space-y-1 text-xs">
              <div className="flex justify-between font-bold text-gray-600"><span>Subtotal:</span> <span className="font-mono">${computedSubtotal.toFixed(2)}</span></div>
              <div className="flex justify-between font-bold text-gray-600"><span>Impuestos Logísticos (CFDI/16%):</span> <span className="font-mono">${computedTax.toFixed(2)}</span></div>
              <div className="flex justify-between font-black text-gray-800 text-sm"><span>Total de Facturación:</span> <span className="font-mono">${computedTotal.toFixed(2)}</span></div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs pt-2">
              <button
                type="button"
                onClick={() => handleSaveOrder('draft')}
                className="bg-slate-100 hover:bg-slate-205 py-2.5 font-bold rounded-xl border"
              >
                Guardar Borrador 📝
              </button>
              <button
                type="button"
                onClick={() => handleSaveOrder('sent')}
                className="bg-blue-500 text-white hover:bg-blue-600 py-2.5 font-black rounded-xl border-b-4 border-blue-700"
              >
                Transmitir Pedido Oficial 🚀
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ----------------- FORMS MODAL: CREATE / EDIT PRODUCT ----------------- */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn text-gray-800">
          <div className="bg-white border-2 border-gray-200 border-b-8 rounded-3xl max-w-lg w-full p-6 space-y-4 relative text-left">
            <button onClick={() => setIsFormOpen(false)} className="absolute right-4 top-4 p-2 text-gray-400 hover:text-gray-600 rounded-full"><X size={20} /></button>

            <div className="space-y-1">
              <h3 className="text-2xl font-black text-gray-800">{editingProduct ? '📝 Modificar Producto' : '🧁 Nuevo Producto'}</h3>
              <p className="text-xs text-gray-400 font-bold">Configura el costo, margen y vinculación comercial con tus aliados.</p>
            </div>

            {errorMsg && (
              <div className="p-2.5 bg-red-50 text-red-650 rounded-xl text-center font-bold text-xs">⚠️ {errorMsg}</div>
            )}

            <form onSubmit={handleSubmitProduct} className="space-y-3">
              <div className="space-y-1.5 text-left">
                <label className="text-xs font-black uppercase text-gray-400">Identificador Visual (Emoji):</label>
                <div className="flex items-center gap-3">
                  <span className="text-4xl bg-gray-100 border rounded-2xl w-14 h-14 flex items-center justify-center">{emoji}</span>
                  <div className="flex-1 overflow-x-auto whitespace-nowrap scrollbar-none py-1">
                    <div className="flex gap-1">
                      {QUICK_EMOJIS.map(em => (
                        <button
                          key={em}
                          type="button"
                          onClick={() => setEmoji(em)}
                          className={`text-2xl p-1 rounded-lg border hover:scale-105 transition-transform ${emoji === em ? 'bg-green-105 border-green-500' : 'bg-white'}`}
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="col-span-2 space-y-1 text-left">
                  <label className="font-extrabold uppercase text-gray-400">Nombre del Insumo</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Café de la Racha (Espresso)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-50 border p-2 rounded-xl font-bold"
                  />
                </div>

                <div className="space-y-1 text-left">
                  <label className="font-extrabold uppercase text-gray-400">Precio de Venta ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full bg-slate-50 border p-2 rounded-xl font-bold font-mono"
                  />
                </div>

                <div className="space-y-1 text-left">
                  <label className="font-extrabold uppercase text-gray-400">Costo de Fábrica ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={cost}
                    onChange={(e) => setCost(Number(e.target.value))}
                    className="w-full bg-slate-50 border p-2 rounded-xl font-bold font-mono"
                  />
                </div>

                <div className="space-y-1 text-left">
                  <label className="font-extrabold uppercase text-gray-400">Existencias Disponibles</label>
                  <input
                    type="number"
                    required
                    value={stock}
                    onChange={(e) => setStock(Number(e.target.value))}
                    className="w-full bg-slate-50 border p-2 rounded-xl font-bold font-mono"
                  />
                </div>

                <div className="space-y-1 text-left">
                  <label className="font-extrabold uppercase text-gray-400">Límite Alerta Stock Mínimo</label>
                  <input
                    type="number"
                    required
                    value={minStock}
                    onChange={(e) => setMinStock(Number(e.target.value))}
                    className="w-full bg-slate-50 border p-2 rounded-xl font-bold font-mono"
                  />
                </div>

                <div className="space-y-1 text-left">
                  <label className="font-extrabold uppercase text-gray-400">Categoría Oficial</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-50 border p-2 rounded-xl font-bold text-gray-700 cursor-pointer"
                  >
                    {CATEGORIES.filter(c => c !== 'Todos').map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="space-y-1 text-left">
                  <label className="font-extrabold uppercase text-gray-400">Socio Proveedor Enlazado</label>
                  <select
                    value={productSupplierId}
                    onChange={(e) => setProductSupplierId(e.target.value)}
                    className="w-full bg-slate-50 border p-2 rounded-xl font-bold text-gray-700 cursor-pointer"
                  >
                    <option value="">-- Sin proveedor definido --</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-1 text-left">
                <label className="text-xs font-black uppercase text-gray-400">Descripción Comercial</label>
                <textarea
                  rows={2}
                  placeholder="Detalles únicos de este insumo..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-50 border p-2 rounded-xl text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs pt-2">
                <button type="button" onClick={() => setIsFormOpen(false)} className="bg-slate-100 hover:bg-slate-200 py-2.5 font-bold rounded-xl border">Cancelar</button>
                <button type="submit" className="bg-[#58cc02] text-white hover:bg-[#61e002] py-2.5 font-black rounded-xl border-b-4 border-green-700 flex items-center justify-center gap-0.5 cursor-pointer">
                  <Check size={14} /> {editingProduct ? 'Guardar Cambios' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- FORMS MODAL: CREATE / EDIT SUPPLIER ----------------- */}
      {isSupplierFormOpen && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn text-gray-800">
          <div className="bg-white border-2 border-gray-200 border-b-8 rounded-3xl max-w-lg w-full p-6 space-y-4 relative text-left">
            <button onClick={() => setIsSupplierFormOpen(false)} className="absolute right-4 top-4 p-2 text-gray-400 hover:text-gray-600 rounded-full"><X size={20} /></button>

            <div className="space-y-1">
              <h3 className="text-2xl font-black text-gray-800">{editingSupplier ? '📝 Modificar Proveedor' : ' Onboard Proveedor Alianza'}</h3>
              <p className="text-xs text-gray-400 font-bold">Une un nuevo distribuidor oficial a la cadena logística DuoExpress.</p>
            </div>

            {supError && (
              <div className="p-2.5 bg-red-50 text-red-650 rounded-xl text-center font-bold text-xs">⚠️ {supError}</div>
            )}

            <form onSubmit={handleSaveSupplier} className="space-y-3">
              
              <div className="grid grid-cols-2 gap-3 text-xs">
                
                <div className="col-span-2 space-y-1 text-left">
                  <label className="font-extrabold uppercase text-gray-400">Nombre de la Distribuidora</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej.🦉 Cafes del Nido Supremo"
                    value={supName}
                    onChange={(e) => setSupName(e.target.value)}
                    className="w-full bg-slate-50 border p-2 rounded-xl font-bold"
                  />
                </div>

                <div className="space-y-1 text-left">
                  <label className="font-extrabold uppercase text-gray-400">Contacto Directo (Gesta)</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Abelardo Verde"
                    value={supContact}
                    onChange={(e) => setSupContact(e.target.value)}
                    className="w-full bg-slate-50 border p-2 rounded-xl font-bold"
                  />
                </div>

                <div className="space-y-1 text-left">
                  <label className="font-extrabold uppercase text-gray-400">Teléfono Directo</label>
                  <input
                    type="text"
                    required
                    placeholder="555-xxxx"
                    value={supPhone}
                    onChange={(e) => setSupPhone(e.target.value)}
                    className="w-full bg-slate-50 border p-2 rounded-xl font-bold font-mono"
                  />
                </div>

                <div className="space-y-1 text-left">
                  <label className="font-extrabold uppercase text-gray-400">Correo Electrónico</label>
                  <input
                    type="email"
                    required
                    placeholder="canal@duoproducción.com"
                    value={supEmail}
                    onChange={(e) => setSupEmail(e.target.value)}
                    className="w-full bg-slate-50 border p-2 rounded-xl font-bold"
                  />
                </div>

                <div className="space-y-1 text-left">
                  <label className="font-extrabold uppercase text-gray-400">Categoría Insumo Principal</label>
                  <select
                    value={supCategory}
                    onChange={(e) => setSupCategory(e.target.value)}
                    className="w-full bg-slate-50 border p-2 rounded-xl font-bold text-gray-700 cursor-pointer"
                  >
                    {CATEGORIES.filter(c => c !== 'Todos').map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="space-y-1 text-left">
                  <label className="font-extrabold uppercase text-gray-400">Días de Entrega Prometidos</label>
                  <input
                    type="number"
                    required
                    value={supDeliveryDays}
                    onChange={(e) => setSupDeliveryDays(Number(e.target.value))}
                    className="w-full bg-slate-50 border p-2 rounded-xl font-bold font-mono"
                  />
                </div>

                <div className="space-y-1 text-left">
                  <label className="font-extrabold uppercase text-gray-400">Índice Fiabilidad (%)</label>
                  <input
                    type="number"
                    max="100"
                    min="10"
                    required
                    value={supReliability}
                    onChange={(e) => setSupReliability(Number(e.target.value))}
                    className="w-full bg-slate-50 border p-2 rounded-xl font-bold font-mono"
                  />
                </div>

                <div className="col-span-2 space-y-1 text-left">
                  <label className="font-extrabold uppercase text-gray-400">Dirección y Bodega General</label>
                  <input
                    type="text"
                    placeholder="Estilo: Calle #, Col, Ciudad"
                    value={supAddress}
                    onChange={(e) => setSupAddress(e.target.value)}
                    className="w-full bg-slate-50 border p-2 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs pt-2">
                <button type="button" onClick={() => setIsSupplierFormOpen(false)} className="bg-slate-100 hover:bg-slate-200 py-2.5 font-bold rounded-xl border">Cancelar</button>
                <button type="submit" className="bg-indigo-600 text-white hover:bg-indigo-550 py-2.5 font-black rounded-xl border-b-4 border-indigo-900 flex items-center justify-center gap-0.5 cursor-pointer">
                  <Check size={14} /> Registrar Alianza Proveedor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
