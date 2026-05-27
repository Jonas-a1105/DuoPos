import { useEffect } from 'react';
import { Product, Customer, Transaction, Branch, CashRegister, StockTransfer, Supplier, PurchaseOrder } from '../types';
import { DEFAULT_PRODUCTS, DEFAULT_CUSTOMERS, DEFAULT_BILLING_SETTINGS } from '../initialData';
import { syncLoad, flushPendingQueue, getLocalData, setLocalData } from '../services/supabaseSync';
import { useUserStore } from '../stores/useUserStore';
import { useSalesStore } from '../stores/useSalesStore';
import { useInventoryStore } from '../stores/useInventoryStore';
import { useCustomerStore } from '../stores/useCustomerStore';

const DEFAULT_BRANCHES: Branch[] = [
  { id: 'branch-central', name: 'Almacén Central (CEDIS) 🏢', type: 'central', emoji: '🏢', city: 'CDMX', address: 'Camino Real de Toluca #400, Coyoacán' },
  { id: 'branch-centro', name: 'Sucursal Duo Centro 🦉', type: 'branch', emoji: '🦉', city: 'CDMX', address: 'Av. Paseo de la Reforma #150, Cuauhtémoc' },
  { id: 'branch-norte', name: 'Sucursal Portal Norte 🦁', type: 'branch', emoji: '🦁', city: 'Monterrey', address: 'Av. Lázaro Cárdenas #2400, San Pedro Garza García' },
];

const DEFAULT_REGISTERS: CashRegister[] = [
  { id: 'reg-centro-1', branchId: 'branch-centro', name: 'Caja Principal 💵', emoji: '💵', status: 'active' },
  { id: 'reg-centro-2', branchId: 'branch-centro', name: 'Caja Rápida ⚡', emoji: '⚡', status: 'active' },
  { id: 'reg-norte-1', branchId: 'branch-norte', name: 'Caja Principal Duo 🦁', emoji: '🦁', status: 'active' },
  { id: 'reg-norte-2', branchId: 'branch-norte', name: 'Kiosco Auto 🤖', emoji: '🤖', status: 'active' },
  { id: 'reg-central-1', branchId: 'branch-central', name: 'Mesa de Despachos 📦', emoji: '📦', status: 'active' },
];

export function useInitialLoad() {
  useEffect(() => {
    const loadData = async () => {
      // 1. Load active user from localStorage
      const activeUserRaw = localStorage.getItem('duo_pos_active_user');
      if (activeUserRaw) {
        try {
          const parsed = JSON.parse(activeUserRaw);
          if (parsed.gems === undefined) parsed.gems = 40;
          if (parsed.gemsEarnedTotal === undefined) parsed.gemsEarnedTotal = 40;
          if (!parsed.unlockedSkins) parsed.unlockedSkins = ['skin-standard'];
          if (!parsed.activeSkin) parsed.activeSkin = 'standard';
          if (!parsed.unlockedBadges) parsed.unlockedBadges = [];
          if (!parsed.completedMissionsToday) parsed.completedMissionsToday = [];
          if (!parsed.unlockedAccessories) parsed.unlockedAccessories = [];
          if (!parsed.activeAccessory) parsed.activeAccessory = '';
          if (!parsed.employeeLeague) parsed.employeeLeague = 'bronce';
          if (parsed.weeklyXp === undefined) parsed.weeklyXp = 0;
          if (parsed.seasonXp === undefined) parsed.seasonXp = 0;
          if (!parsed.seasonRewardsClaimed) parsed.seasonRewardsClaimed = [];
          useUserStore.getState().setUser(parsed);
          useUserStore.getState().setShowLanding(false);
        } catch (e) {
          console.error('Error parsing stored active user', e);
        }
      }

      // Run all non-critical loads in parallel
      await Promise.allSettled([
        loadProducts(),
        loadTransactions(),
        loadCustomers(),
        loadBillingSettings(),
        loadBranches(),
        loadRegisters(),
        loadTransfers(),
        loadSuppliers(),
        loadPurchaseOrders(),
      ]);

      // Restore active branch/register from localStorage
      const savedActiveBranchId = localStorage.getItem('duo_pos_active_branch_id');
      useSalesStore.getState().setActiveBranchId(savedActiveBranchId || 'branch-centro');

      const savedActiveRegisterId = localStorage.getItem('duo_pos_active_register_id');
      useSalesStore.getState().setActiveRegisterId(savedActiveRegisterId || 'reg-centro-1');

      // Install status
      const simInstallRaw = localStorage.getItem('duo_pos_sim_installed');
      // This is UI state - we don't set it here (handled by AppRouter's local state)

      // Flush pending offline operations
      flushPendingQueue();
    };

    loadData();
  }, []);
}

async function loadProducts() {
  try {
    const loaded = await syncLoad<Product>('products', 'duo_pos_products', DEFAULT_PRODUCTS);
    const augmented = loaded.map((p) => {
      if (!p.branchesStock) {
        return {
          ...p,
          branchesStock: {
            'branch-centro': p.stock,
            'branch-central': p.stock * 3 + 40,
            'branch-norte': Math.round(p.stock * 0.7) + 5,
          },
        };
      }
      return p;
    });
    useInventoryStore.getState().setProducts(augmented);
    await setLocalData('duo_pos_products', augmented);
  } catch {
    const savedProducts = await getLocalData('duo_pos_products');
    if (savedProducts) {
      useInventoryStore.getState().setProducts(savedProducts);
    } else {
      useInventoryStore.getState().setProducts(DEFAULT_PRODUCTS);
    }
  }
}

async function loadTransactions() {
  try {
    const loaded = await syncLoad<Transaction>('transactions', 'duo_pos_transactions', [], {
      orderBy: 'date',
      ascending: false,
    });
    useSalesStore.getState().setTransactions(loaded);
  } catch {
    const savedTxnsRaw = localStorage.getItem('duo_pos_transactions');
    if (savedTxnsRaw) {
      useSalesStore.getState().setTransactions(JSON.parse(savedTxnsRaw));
    }
  }
}

async function loadCustomers() {
  try {
    const loaded = await syncLoad<Customer>('customers', 'duo_pos_customers', DEFAULT_CUSTOMERS);
    useCustomerStore.getState().setCustomers(loaded);
  } catch {
    const savedCustomers = await getLocalData('duo_pos_customers');
    if (savedCustomers) {
      useCustomerStore.getState().setCustomers(savedCustomers);
    } else {
      useCustomerStore.getState().setCustomers(DEFAULT_CUSTOMERS);
      await setLocalData('duo_pos_customers', DEFAULT_CUSTOMERS);
    }
  }
}

async function loadBillingSettings() {
  try {
    const loaded = await syncLoad<{ id: string; data: any }>('settings', 'duo_pos_settings', [
      { id: 'billing', data: DEFAULT_BILLING_SETTINGS },
    ]);
    const billingRow = loaded.find((s) => s.id === 'billing');
    if (billingRow && billingRow.data) {
      useSalesStore.getState().setBillingSettings(billingRow.data);
    } else {
      useSalesStore.getState().setBillingSettings(DEFAULT_BILLING_SETTINGS);
    }
  } catch {
    const savedBillingRaw = localStorage.getItem('duo_pos_billing_settings');
    if (savedBillingRaw) {
      useSalesStore.getState().setBillingSettings(JSON.parse(savedBillingRaw));
    } else {
      useSalesStore.getState().setBillingSettings(DEFAULT_BILLING_SETTINGS);
    }
  }
}

async function loadBranches() {
  try {
    const loaded = await syncLoad<Branch>('branches', 'duo_pos_branches', DEFAULT_BRANCHES);
    useSalesStore.getState().setBranches(loaded);
  } catch {
    const savedBranchesRaw = localStorage.getItem('duo_pos_branches');
    if (savedBranchesRaw) {
      useSalesStore.getState().setBranches(JSON.parse(savedBranchesRaw));
    } else {
      useSalesStore.getState().setBranches(DEFAULT_BRANCHES);
    }
  }
}

async function loadRegisters() {
  try {
    const loaded = await syncLoad<CashRegister>('cash_registers', 'duo_pos_registers', DEFAULT_REGISTERS);
    useSalesStore.getState().setRegisters(loaded);
  } catch {
    const savedRegistersRaw = localStorage.getItem('duo_pos_registers');
    if (savedRegistersRaw) {
      useSalesStore.getState().setRegisters(JSON.parse(savedRegistersRaw));
    } else {
      useSalesStore.getState().setRegisters(DEFAULT_REGISTERS);
    }
  }
}

async function loadTransfers() {
  try {
    const loaded = await syncLoad<StockTransfer>('stock_transfers', 'duo_pos_stock_transfers', [], {
      orderBy: 'created_at',
      ascending: false,
    });
    useInventoryStore.getState().setStockTransfers(loaded);
  } catch {
    const savedTransfersRaw = localStorage.getItem('duo_pos_stock_transfers');
    if (savedTransfersRaw) {
      useInventoryStore.getState().setStockTransfers(JSON.parse(savedTransfersRaw));
    }
  }
}

async function loadSuppliers() {
  try {
    const loaded = await syncLoad<Supplier>('suppliers', 'duo_pos_suppliers', []);
    useInventoryStore.getState().setSuppliers(loaded);
  } catch {
    const savedSuppliersRaw = localStorage.getItem('duo_pos_suppliers');
    if (savedSuppliersRaw) {
      useInventoryStore.getState().setSuppliers(JSON.parse(savedSuppliersRaw));
    }
  }
}

async function loadPurchaseOrders() {
  try {
    const loaded = await syncLoad<PurchaseOrder>('purchase_orders', 'duo_pos_purchase_orders', [], {
      orderBy: 'created_at',
      ascending: false,
    });
    useInventoryStore.getState().setPurchaseOrders(loaded);
  } catch {
    const savedOrdersRaw = localStorage.getItem('duo_pos_purchase_orders');
    if (savedOrdersRaw) {
      useInventoryStore.getState().setPurchaseOrders(JSON.parse(savedOrdersRaw));
    }
  }
}
