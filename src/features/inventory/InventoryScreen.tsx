/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Product, User, Supplier, PurchaseOrder } from '../../types/index';
import { playSound } from '../../services/audio/soundService';

import ProductCatalog from './components/ProductCatalog';
import CriticalAlerts from './components/CriticalAlerts';
import SupplierManager from './components/SupplierManager';
import PurchaseOrderWizard from './components/PurchaseOrderWizard';
import AccountsPayable from './components/AccountsPayable';

interface InventoryScreenProps {
  products: Product[];
  onAddProduct: (prod: Omit<Product, 'id'>) => void;
  onUpdateProduct: (prod: Product) => void;
  onDeleteProduct: (id: string) => void;
  onGrantXp?: (xp: number) => void;
  activeShift?: any;
  onAddShiftMovement?: (type: 'in' | 'out', amount: number, reason: string) => void;
  currentUser: User;
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  onAddSupplier: (sup: Omit<Supplier, 'id' | 'balance'>) => void;
  onUpdateSupplier: (sup: Supplier) => void;
  onDeleteSupplier: (id: string) => void;
  onSavePurchaseOrder: (po: PurchaseOrder) => void;
  onTransitPurchaseOrder: (id: string, carrier: string, estimatedDelivery: string) => void;
  onReceivePurchaseOrder: (id: string) => void;
  onCancelPurchaseOrder: (id: string) => void;
  onRegisterSupplierPayout: (supplierId: string, amount: number, notes: string) => void;
  exchangeRate?: number;
  activeRateType?: 'oficial' | 'paralelo';
}

export default function InventoryScreen({
  products,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onGrantXp,
  activeShift,
  onAddShiftMovement,
  currentUser,
  suppliers,
  purchaseOrders,
  onAddSupplier,
  onUpdateSupplier,
  onDeleteSupplier,
  onSavePurchaseOrder,
  onTransitPurchaseOrder,
  onReceivePurchaseOrder,
  onCancelPurchaseOrder,
  onRegisterSupplierPayout,
  exchangeRate,
  activeRateType,
}: InventoryScreenProps) {
  // Tabs & Filters state
  const [activeSubTab, setActiveSubTab] = useState<'catalog' | 'alerts' | 'suppliers' | 'orders' | 'accounts'>(
    'catalog',
  );

  // Payout helper state to link Supplier list card click to Accounts Payable abonos
  const [paySupId, setPaySupId] = useState<string>('');

  // Tab badge math calculations
  const criticalProductsCount = useMemo(() => {
    return products.filter((p) => p.stock <= (p.minStock !== undefined ? p.minStock : 5)).length;
  }, [products]);

  const totalAccountsPayable = useMemo(() => {
    return suppliers.reduce((acc, s) => acc + (s.balance || 0), 0);
  }, [suppliers]);

  const pendingOrdersCount = useMemo(() => {
    return purchaseOrders.filter((o) => o.status === 'sent' || o.status === 'transit').length;
  }, [purchaseOrders]);

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
      </div>

      {/* Navigation Tabbing Row */}
      <div className="flex flex-wrap border-b-2 border-gray-200 gap-1 md:gap-4 mb-3 select-none">
        {[
          { key: 'catalog', label: '📦 Catálogo Central', count: products.length },
          { key: 'alerts', label: '🚨 Alertas Críticas', count: criticalProductsCount, alert: true },
          { key: 'suppliers', label: '🤝 Proveedores', count: suppliers.length },
          {
            key: 'orders',
            label: '🚚 Órdenes Compra',
            count: purchaseOrders.length,
            highlight: pendingOrdersCount > 0,
          },
          { key: 'accounts', label: '💸 Cuentas Por Pagar', special: `$${totalAccountsPayable.toFixed(2)}` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveSubTab(tab.key as any);
              playSound('click');
            }}
            className={`pb-3 px-2.5 text-xs md:text-sm font-black uppercase tracking-wider border-b-4 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === tab.key
                ? 'border-[#58cc02] text-[#58cc02]'
                : 'border-transparent text-gray-400 hover:text-gray-650'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (tab.count > 0 || tab.alert) && (
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded-full font-black select-none ${
                  tab.alert ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 text-gray-550'
                }`}
              >
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

      {/* Active Sub-Tab View Rendering */}
      {activeSubTab === 'catalog' && (
        <ProductCatalog
          products={products}
          suppliers={suppliers}
          onAddProduct={onAddProduct}
          onUpdateProduct={onUpdateProduct}
          onDeleteProduct={onDeleteProduct}
          onGrantXp={onGrantXp}
          currentUser={currentUser}
          exchangeRate={exchangeRate}
          activeRateType={activeRateType}
        />
      )}

      {activeSubTab === 'alerts' && (
        <CriticalAlerts products={products} onUpdateProduct={onUpdateProduct} onGrantXp={onGrantXp} />
      )}

      {activeSubTab === 'suppliers' && (
        <SupplierManager
          suppliers={suppliers}
          onAddSupplier={onAddSupplier}
          onUpdateSupplier={onUpdateSupplier}
          onDeleteSupplier={onDeleteSupplier}
          onGrantXp={onGrantXp}
          onSelectTab={setActiveSubTab}
          onSelectSupplierForPayout={setPaySupId}
        />
      )}

      {activeSubTab === 'orders' && (
        <PurchaseOrderWizard
          purchaseOrders={purchaseOrders}
          products={products}
          suppliers={suppliers}
          onSavePurchaseOrder={onSavePurchaseOrder}
          onTransitPurchaseOrder={onTransitPurchaseOrder}
          onReceivePurchaseOrder={onReceivePurchaseOrder}
          onCancelPurchaseOrder={onCancelPurchaseOrder}
          onGrantXp={onGrantXp}
        />
      )}

      {activeSubTab === 'accounts' && (
        <AccountsPayable
          suppliers={suppliers}
          activeShift={activeShift}
          onAddShiftMovement={onAddShiftMovement}
          onRegisterSupplierPayout={onRegisterSupplierPayout}
          onGrantXp={onGrantXp}
          paySupId={paySupId}
          setPaySupId={setPaySupId}
        />
      )}
    </div>
  );
}
