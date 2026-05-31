import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import type { User, Product, Transaction, CashShift, Customer, LegalBillingSettings, Branch, CashRegister, StockTransfer, Supplier, PurchaseOrder, ExpressEvent } from '../types/index';
import { DUO_CHARACTERS } from '../initialData';
import { LoginScreen, LandingPage } from '../features/auth';
import { supabase, isSupabaseConfigured } from '../config/supabaseClient';
import {
  syncLoad, syncSave, syncInsert, syncDelete, flushPendingQueue, generateUUID,
  syncInsertTransaction, syncSaveShift, syncSavePurchaseOrder, getLocalData,
  setLocalData, syncDailyStats, syncUserPreferences, pruneOldLocalStorage,
} from '../database/supabaseSync';
import { useUserStore } from '../stores/useUserStore';
import { useSalesStore } from '../features/sales/store/useSalesStore';
import { useInventoryStore } from '../features/inventory/store/useInventoryStore';
import { useCustomerStore } from '../features/customers/store/useCustomerStore';
import { DashboardScreen } from '../features/dashboard';
import { SalesScreen } from '../features/sales';
import { InventoryScreen } from '../features/inventory';
import { HistoryScreen } from '../features/history';
import { CustomersScreen } from '../features/customers';
import { SettingsScreen } from '../features/settings';
import { ShiftsScreen } from '../features/shifts';
import { LogisticsScreen } from '../features/logistics';
import { GamificationScreen } from '../features/gamification';
import InstallModal from '../shared/ui/Modals/InstallModal';
import LevelUpCelebrateModal from '../features/gamification/components/LevelUpCelebrateModal';
import RoleLockWarningModal from '../features/auth/components/RoleLockWarningModal';
import PinLockModal from '../features/auth/components/PinLockModal';
import HardwareHubModal from '../features/settings/components/HardwareHubModal';
import LicenseBlockScreen from '../features/settings/components/LicenseBlockScreen';
import { addAuditLog } from '../services/security/auditLogger';
import { FlashNotifications, toast } from '../shared/ui';
import { playSound } from '../services/audio/soundService';
import { HardwareDeviceSettings, DEFAULT_HARDWARE_SETTINGS } from '../services/print/printService';
import { validateLicenseKeyOnline, generateHardwareFingerprint, PLANS, detectClockTampering } from '../services/security/licensingService';
import type { LicenseDetails } from '../services/security/licensingService';
import { useExchangeRates } from '../hooks/useExchangeRates';
import { useInventory } from '../hooks/useInventory';
import { useCustomers } from '../hooks/useCustomers';
import { useShifts } from '../hooks/useShifts';
import { useExpressEvents } from '../hooks/useExpressEvents';
import { useInitialLoad } from '../hooks/useInitialLoad';
import { useSession } from '../hooks/useSession';
import { useAppLifecycle } from '../hooks/useAppLifecycle';
import ClerkSessionSync from './components/ClerkSessionSync';
import MainLayout from '../components/layout/MainLayout';

export default function AppRouter() {
  useAppLifecycle();

  const user = useUserStore((s) => s.user);
  const setUser = useUserStore((s) => s.setUser);
  const users = useUserStore((s) => s.users);
  const setUsers = useUserStore((s) => s.setUsers);
  const showLanding = useUserStore((s) => s.showLanding);
  const setShowLanding = useUserStore((s) => s.setShowLanding);
  const licenseDetails = useUserStore((s) => s.licenseDetails);
  const setLicenseDetails = useUserStore((s) => s.setLicenseDetails);
  const isLicenseExpired = useUserStore((s) => s.isLicenseExpired);
  const setIsLicenseExpired = useUserStore((s) => s.setIsLicenseExpired);
  const isClockTampered = useUserStore((s) => s.isClockTampered);
  const setIsClockTampered = useUserStore((s) => s.setIsClockTampered);
  const duoMood = useUserStore((s) => s.duoMood);
  const setDuoMood = useUserStore((s) => s.setDuoMood);
  const setDuoSparkles = useUserStore((s) => s.setDuoSparkles);
  const duoSparkles = useUserStore((s) => s.duoSparkles);
  const levelUpAchieved = useUserStore((s) => s.levelUpAchieved);
  const setLevelUpAchieved = useUserStore((s) => s.setLevelUpAchieved);
  const roleLockWarning = useUserStore((s) => s.roleLockWarning);
  const setRoleLockWarning = useUserStore((s) => s.setRoleLockWarning);
  const lastSyncTime = useUserStore((s) => s.lastSyncTime);
  const setLastSyncTime = useUserStore((s) => s.setLastSyncTime);

  const activeBranchId = useSalesStore((s) => s.activeBranchId);
  const setActiveBranchId = useSalesStore((s) => s.setActiveBranchId);
  const activeRegisterId = useSalesStore((s) => s.activeRegisterId);
  const setActiveRegisterId = useSalesStore((s) => s.setActiveRegisterId);
  const branches = useSalesStore((s) => s.branches);
  const setBranches = useSalesStore((s) => s.setBranches);
  const registers = useSalesStore((s) => s.registers);
  const setRegisters = useSalesStore((s) => s.setRegisters);
  const activeShift = useSalesStore((s) => s.activeShift);
  const setActiveShift = useSalesStore((s) => s.setActiveShift);
  const shiftHistory = useSalesStore((s) => s.shiftHistory);
  const setShiftHistory = useSalesStore((s) => s.setShiftHistory);
  const transactions = useSalesStore((s) => s.transactions);
  const setTransactions = useSalesStore((s) => s.setTransactions);
  const exchangeRates = useSalesStore((s) => s.exchangeRates);
  const setExchangeRates = useSalesStore((s) => s.setExchangeRates);
  const activeRateType = useSalesStore((s) => s.activeRateType);
  const setActiveRateType = useSalesStore((s) => s.setActiveRateType);
  const hardwareSettings = useSalesStore((s) => s.hardwareSettings);
  const setHardwareSettings = useSalesStore((s) => s.setHardwareSettings);
  const billingSettings = useSalesStore((s) => s.billingSettings);
  const setBillingSettings = useSalesStore((s) => s.setBillingSettings);

  const products = useInventoryStore((s) => s.products);
  const setProducts = useInventoryStore((s) => s.setProducts);
  const suppliers = useInventoryStore((s) => s.suppliers);
  const setSuppliers = useInventoryStore((s) => s.setSuppliers);
  const purchaseOrders = useInventoryStore((s) => s.purchaseOrders);
  const setPurchaseOrders = useInventoryStore((s) => s.setPurchaseOrders);
  const stockTransfers = useInventoryStore((s) => s.stockTransfers);
  const setStockTransfers = useInventoryStore((s) => s.setStockTransfers);
  const activeEvent = useInventoryStore((s) => s.activeEvent);
  const setActiveEvent = useInventoryStore((s) => s.setActiveEvent);

  const customers = useCustomerStore((s) => s.customers);
  const setCustomers = useCustomerStore((s) => s.setCustomers);

  const { loginUser, logoutUser, saveUser } = useSession();

  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = location.pathname === '/' ? 'dashboard' : (location.pathname.substring(1) as any);

  const setActiveTab = (tab: string) => navigate(tab === 'dashboard' ? '/' : '/' + tab);

  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pendingRole, setPendingRole] = useState<'cashier' | 'supervisor' | 'admin' | null>(null);
  const [isMuted, setIsMuted] = useState(() => localStorage.getItem('duo_pos_muted') === 'true');
  const [isHardwareHubOpen, setIsHardwareHubOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSimInstalled, setIsSimInstalled] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [appVersion, setAppVersion] = useState(() => localStorage.getItem('duo_pos_app_version') || 'v1.8-Stable');

  const isDev = user && (user.username.toLowerCase() === 'jonas' || user.username.toLowerCase() === 'jonas_mendoza' || (user.email && user.email.toLowerCase().includes('jonas')) || user.username.toLowerCase() === 'admin');

  const triggerDuoHappy = () => {
    setDuoMood('happy');
    setDuoSparkles(true);
    setTimeout(() => { setDuoMood('neutral'); setDuoSparkles(false); }, 5000);
  };

  const { data: exchangeRatesQuery, isFetching: isRefreshingRates, refetch: refetchRates } = useExchangeRates();

  useEffect(() => {
    if (exchangeRatesQuery) {
      setExchangeRates(exchangeRatesQuery);
      try { localStorage.setItem('duo_pos_exchange_rates', JSON.stringify(exchangeRatesQuery)); } catch {}
    }
  }, [exchangeRatesQuery]);

  const {
    addProduct: inventoryAddProduct, updateProduct: inventoryUpdateProduct,
    deleteProduct: inventoryDeleteProduct, decreaseStock: inventoryDecreaseStock,
    addSupplier: inventoryAddSupplier, updateSupplier: inventoryUpdateSupplier,
    deleteSupplier: inventoryDeleteSupplier, savePurchaseOrder: inventorySavePurchaseOrder,
    transitPurchaseOrder: inventoryTransitPurchaseOrder, receivePurchaseOrder: inventoryReceivePurchaseOrder,
    cancelPurchaseOrder: inventoryCancelPurchaseOrder, registerSupplierPayout: inventoryRegisterSupplierPayout,
  } = useInventory();

  const { addCustomer, updateCustomer, deleteCustomer, processCustomerLoyalty } = useCustomers();
  const { openShift, closeShift, addShiftMovement, updateShiftAfterSale, updateShiftAfterRefund } = useShifts();
  const { triggerEventProgress, triggerExpressEvent } = useExpressEvents();

  useInitialLoad();

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  useEffect(() => {
    const simInstallRaw = localStorage.getItem('duo_pos_sim_installed');
    if (simInstallRaw === 'true') { setIsSimInstalled(true); setShowInstallBanner(false); }
  }, []);

  useEffect(() => {
    if (licenseDetails.tier === 'free' && activeRateType === 'paralelo') {
      setActiveRateType('oficial');
      localStorage.setItem('duo_pos_active_rate_type', 'oficial');
    }
  }, [licenseDetails.tier, activeRateType]);

  useEffect(() => {
    (async () => {
      try {
        const loaded = await syncLoad<CashShift>('cash_shifts', 'duo_pos_shift_history', [], { orderBy: 'opening_time', ascending: false });
        const active = loaded.find((s) => s.status === 'open' && s.branchId === activeBranchId && s.registerId === activeRegisterId);
        if (active) setActiveShift(active);
        else {
          const raw = localStorage.getItem('duo_pos_active_shift');
          if (raw) {
            const parsed = JSON.parse(raw);
            setActiveShift(parsed.branchId === activeBranchId && parsed.registerId === activeRegisterId ? parsed : null);
          } else setActiveShift(null);
        }
        setShiftHistory(loaded.filter((s) => s.status === 'closed' && s.branchId === activeBranchId && s.registerId === activeRegisterId));
      } catch {
        const raw = localStorage.getItem('duo_pos_active_shift');
        if (raw) {
          const parsed = JSON.parse(raw);
          setActiveShift(parsed.branchId === activeBranchId && parsed.registerId === activeRegisterId ? parsed : null);
        } else setActiveShift(null);
        const histRaw = localStorage.getItem('duo_pos_shift_history');
        if (histRaw) {
          setShiftHistory(JSON.parse(histRaw).filter((s: any) => s.branchId === activeBranchId && s.registerId === activeRegisterId));
        }
      }
    })();
  }, [activeBranchId, activeRegisterId]);

  useEffect(() => {
    if (user) {
      const currentRole = user.role || 'cashier';
      const tabRolesMap: Record<string, string[]> = { inventory: ['admin', 'supervisor'], logistics: ['admin', 'supervisor'], settings: ['admin'] };
      const required = tabRolesMap[activeTab];
      if (required && !required.includes(currentRole)) setActiveTab('dashboard');
    }
  }, [user?.role, activeTab]);

  const handleSaveHardwareSettings = (settings: HardwareDeviceSettings) => {
    setHardwareSettings(settings);
    localStorage.setItem('duo_pos_hardware_settings', JSON.stringify(settings));
  };

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    localStorage.setItem('duo_pos_muted', String(next));
    if (!next) playSound('click');
  };

  const syncStateFromSupabase = async (showToasts = true) => {
    if (!user || !isSupabaseConfigured() || !navigator.onLine) {
      if (showToasts) toast.info('No hay conexión a Internet o Supabase no está configurado.', { title: 'Sincronización no disponible' });
      return;
    }
    setIsSyncing(true);
    try {
      await flushPendingQueue();
      const results = await Promise.allSettled([
        syncLoad<Product>('products', 'duo_pos_products', []).then(async (loaded) => {
          const augmented = loaded.map((p) => ({ ...p, branchesStock: p.branchesStock || { 'branch-centro': p.stock, 'branch-central': p.stock * 3 + 40, 'branch-norte': Math.round(p.stock * 0.7) + 5 } }));
          setProducts(augmented);
          await setLocalData('duo_pos_products', augmented);
        }),
        syncLoad<Transaction>('transactions', 'duo_pos_transactions', [], { orderBy: 'date', ascending: false, branchId: activeBranchId }).then(setTransactions),
        syncLoad<Customer>('customers', 'duo_pos_customers', []).then(setCustomers),
        syncLoad<CashShift>('cash_shifts', 'duo_pos_shift_history', [], { orderBy: 'opening_time', ascending: false, branchId: activeBranchId }).then((loaded) => {
          const active = loaded.find((s) => s.status === 'open' && s.branchId === activeBranchId && s.registerId === activeRegisterId);
          if (active) setActiveShift(active); else setActiveShift(null);
          setShiftHistory(loaded.filter((s) => s.status === 'closed' && s.branchId === activeBranchId && s.registerId === activeRegisterId));
        }),
        syncLoad<Branch>('branches', 'duo_pos_branches', []).then(setBranches),
        syncLoad<CashRegister>('cash_registers', 'duo_pos_registers', []).then(setRegisters),
        syncLoad<StockTransfer>('stock_transfers', 'duo_pos_stock_transfers', [], { orderBy: 'created_at', ascending: false }).then(setStockTransfers),
        syncLoad<Supplier>('suppliers', 'duo_pos_suppliers', []).then(setSuppliers),
        syncLoad<PurchaseOrder>('purchase_orders', 'duo_pos_purchase_orders', [], { orderBy: 'created_at', ascending: false }).then(setPurchaseOrders),
      ]);
      const synced = results.filter((r) => r.status === 'fulfilled').length;
      const now = new Date().toLocaleTimeString();
      setLastSyncTime(now);
      if (showToasts) toast.success(`Datos sincronizados (${synced} tablas).`, { title: `Sincronizado ✅ ${now}` });
    } catch (err) {
      console.error('Error en syncStateFromSupabase:', err);
      if (showToasts) toast.error('Error al sincronizar. Revisa tu conexión.', { title: 'Error de sincronización' });
    } finally { setIsSyncing(false); }
  };

  useEffect(() => {
    if (!user || !isSupabaseConfigured()) return;
    const interval = setInterval(() => { if (navigator.onLine) syncStateFromSupabase(false); }, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const handleGrantXp = (amount: number) => {
    if (!user) return;
    const isHappyHourActive = activeEvent?.type === 'happy_hour';
    useUserStore.getState().grantXp(amount, isHappyHourActive);
  };

  const handleAddProduct = (newProd: Omit<Product, 'id'>) => inventoryAddProduct(newProd, activeBranchId, handleGrantXp);
  const handleUpdateProduct = (prod: Product) => inventoryUpdateProduct(prod, activeBranchId);
  const handleDeleteProduct = (id: string) => inventoryDeleteProduct(id);
  const handleDecreaseStock = (productId: string, qty: number) => inventoryDecreaseStock(productId, qty, activeBranchId);
  const handleAddCustomer = (newCust: any) => addCustomer(newCust, licenseDetails);
  const handleUpdateCustomer = (cust: Customer) => updateCustomer(cust);
  const handleDeleteCustomer = (id: string) => deleteCustomer(id);

  const handleSaveBillingSettings = async (updated: LegalBillingSettings) => {
    setBillingSettings(updated);
    localStorage.setItem('duo_pos_billing_settings', JSON.stringify(updated));
    if (updated.enableSounds !== undefined) {
      setIsMuted(!updated.enableSounds);
      localStorage.setItem('duo_pos_muted', String(!updated.enableSounds));
    }
    const loadedSettingsRaw = localStorage.getItem('duo_pos_settings');
    let allSettings: { id: string; data: any }[] = [];
    try { allSettings = loadedSettingsRaw ? JSON.parse(loadedSettingsRaw) : []; } catch {}
    allSettings = allSettings.filter((s) => s.id !== 'billing');
    allSettings.push({ id: 'billing', data: updated } as { id: string; data: any });
    await syncSave<{ id: string; data: any }>('app_settings', 'duo_pos_settings', allSettings, allSettings[allSettings.length - 1]);
    if (user?.id) {
      syncUserPreferences(user.id, user.activeSkin || 'standard', updated.enableSounds !== false).catch(() => {});
    }
  };

  const handleAddSupplier = (supplierData: Omit<Supplier, 'id' | 'balance'>) => inventoryAddSupplier(supplierData);
  const handleUpdateSupplier = (supplier: Supplier) => inventoryUpdateSupplier(supplier);
  const handleDeleteSupplier = (id: string) => inventoryDeleteSupplier(id);
  const handleSavePurchaseOrder = (po: PurchaseOrder) => inventorySavePurchaseOrder(po);
  const handleTransitPurchaseOrder = (id: string, carrier: string, estimatedDelivery: string) => inventoryTransitPurchaseOrder(id, carrier, estimatedDelivery);
  const handleReceivePurchaseOrder = async (id: string) => { await inventoryReceivePurchaseOrder(id); };
  const handleCancelPurchaseOrder = (id: string) => inventoryCancelPurchaseOrder(id);
  const handleRegisterSupplierPayout = (supplierId: string, amount: number, notes: string) => inventoryRegisterSupplierPayout(supplierId, amount, notes);

  const handleAddTransaction = async (txn: Transaction) => {
    if (transactions.length >= licenseDetails.salesLimit) {
      playSound('error');
      toast.error(`Has completado el límite para el plan actual (${licenseDetails.salesLimit} ventas). Para seguir procesando transacciones, actualiza tu licencia en Ajustes > Planes.`, { title: 'Límite de Ventas Excedido 🔒', duration: 10000 });
      return;
    }
    const txnWithBranch: Transaction = { ...txn, branchId: txn.branchId || activeBranchId, registerId: txn.registerId || activeRegisterId };
    const updatedTxns = [txnWithBranch, ...transactions];
    setTransactions(updatedTxns);
    await syncInsertTransaction(txnWithBranch, updatedTxns);
    if (txn.invoiceData && billingSettings) {
      const updatedBilling = { ...billingSettings, nextInvoiceNumber: billingSettings.nextInvoiceNumber + 1 };
      setBillingSettings(updatedBilling);
      localStorage.setItem('duo_pos_billing_settings', JSON.stringify(updatedBilling));
      const loadedSettingsRaw = localStorage.getItem('duo_pos_settings');
      let allSettings: { id: string; data: any }[] = [];
      try { allSettings = loadedSettingsRaw ? JSON.parse(loadedSettingsRaw) : []; } catch {}
      allSettings = allSettings.filter((s) => s.id !== 'billing');
      allSettings.push({ id: 'billing', data: updatedBilling });
      await syncSave<{ id: string; data: any }>('settings', 'duo_pos_settings', allSettings, allSettings[allSettings.length - 1]);
      try {
        const today = new Date().toISOString().split('T')[0];
        const dayStatsRaw = localStorage.getItem(`duo_pos_daily_acts_${today}`);
        const currentStats = dayStatsRaw ? JSON.parse(dayStatsRaw) : { barcodeScans: 0, invoicesEmitted: 0, customersRegistered: 0 };
        currentStats.invoicesEmitted = (currentStats.invoicesEmitted || 0) + 1;
        localStorage.setItem(`duo_pos_daily_acts_${today}`, JSON.stringify(currentStats));
        syncDailyStats(today, currentStats).catch(() => {});
      } catch {}
    }
    if (txn.customerId) processCustomerLoyalty(txn);
    if (activeShift) {
      const isCash = txn.paymentMethod === 'cash';
      const cashAddition = txn.isMixedPayment ? txn.mixedCashAmount || 0 : isCash ? txn.total : 0;
      updateShiftAfterSale(txn.total, cashAddition, txn.paymentMethod || '', !!txn.isMixedPayment);
    }
    if (user) {
      const today = new Date().toISOString().split('T')[0];
      let streak = user.streak;
      if (user.lastSaleDate !== today) streak = user.streak + 1;
      handleGrantXp(15);
      triggerDuoHappy();
      try {
        const dayStatsRaw = localStorage.getItem(`duo_pos_daily_acts_${today}`);
        const currentStats = dayStatsRaw ? JSON.parse(dayStatsRaw) : { barcodeScans: 0, invoicesEmitted: 0, customersRegistered: 0 };
        localStorage.setItem(`duo_pos_daily_acts_${today}`, JSON.stringify(currentStats));
      } catch {}
      const updatedUser: User = { ...user, streak, lastSaleDate: today, gems: (user.gems ?? 40) + 5, gemsEarnedTotal: (user.gemsEarnedTotal ?? 40) + 5 };
      saveUser(updatedUser);
    }
  };

  const handleRefundTransaction = async (txnId: string) => {
    const targetTxn = transactions.find((t) => t.id === txnId);
    if (!targetTxn) return;
    const changedProducts: Product[] = [];
    const updatedProducts = products.map((p) => {
      const soldItem = targetTxn.items.find((item) => item.productId === p.id);
      if (soldItem) {
        const updatedBranchesStock = p.branchesStock ? { ...p.branchesStock } : undefined;
        if (updatedBranchesStock && activeBranchId) updatedBranchesStock[activeBranchId] = (updatedBranchesStock[activeBranchId] ?? 0) + soldItem.quantity;
        const changed = { ...p, stock: p.stock + soldItem.quantity, branchesStock: updatedBranchesStock };
        changedProducts.push(changed);
        return changed;
      }
      return p;
    });
    setProducts(updatedProducts);
    for (const cp of changedProducts) await syncSave<Product>('products', 'duo_pos_products', updatedProducts, cp);
    const refundedTxn = { ...targetTxn, status: 'refunded', refunded: true, refundedAt: new Date().toISOString() };
    const updatedTxns = transactions.map((t) => (t.id === txnId ? refundedTxn : t));
    setTransactions(updatedTxns as any);
    await syncSave<Transaction>('transactions', 'duo_pos_transactions', updatedTxns as any, refundedTxn as any);
    if (activeShift) {
      updateShiftAfterRefund(targetTxn.total, targetTxn.paymentMethod === 'cash');
      if (targetTxn.paymentMethod === 'cash') handleAddShiftMovement('out', targetTxn.total, `Reembolso Ticket #${txnId.slice(0, 8).toUpperCase()}`);
    }
    if (user) {
      saveUser({ ...user, xp: Math.max(0, user.xp - 10), weeklyXp: Math.max(0, (user.weeklyXp ?? 0) - 10) });
    }
    toast.warning(`Transacción #${txnId.slice(0, 8).toUpperCase()} reembolsada con éxito. Stock devuelto a inventario.`, { title: 'Reembolso de Ticket ⚠️' });
  };

  const handleOpenShift = (initialCash: number) => { if (!user) return; openShift(initialCash, user.id, user.username, handleGrantXp); };
  const handleCloseShift = (actualCash: number, expectedCash: number, difference: number, notes: string) => closeShift(actualCash, expectedCash, difference, notes, handleGrantXp);
  const handleAddShiftMovement = (type: 'in' | 'out', amount: number, reason: string) => addShiftMovement(type, amount, reason);

  const handleTriggerEventProgress = (type: 'scan' | 'loyalty' | 'sale') => triggerEventProgress(type, saveUser, user);
  const handleTriggerExpressEvent = (type: 'happy_hour' | 'scan_challenge' | 'loyalty_challenge') => triggerExpressEvent(type);

  const handleActivateLicenseKey = async (key: string, companyName?: string) => {
    const seed = licenseDetails.offlineActivationSeed;
    const res = await validateLicenseKeyOnline(key, seed, companyName);
    if (res.valid) {
      const plan = PLANS[res.tier];
      const updated: LicenseDetails = { ...licenseDetails, tier: res.tier, activated: true, activationKey: key.toUpperCase().trim(), expiresAt: res.expiresAt || 'Nunca', clientLimit: plan.clientLimit, salesLimit: plan.salesLimit, activatedAt: new Date().toISOString(), companyName: companyName || '' };
      setLicenseDetails(updated);
      try { localStorage.setItem('duo_pos_licensing_details', JSON.stringify(updated)); } catch {}
      setIsLicenseExpired(false);
      setIsClockTampered(false);
      playSound('levelup');
      return { success: true, message: `¡Licencia activada con éxito!\nFelicidades, tu DuoPOS ahora tiene el plan [${plan.name}] activo en este terminal.` };
    } else return { success: false, message: res.error || 'La llave ingresada es inválida.' };
  };

  const handleResetLicenseToFree = () => {
    const updated: LicenseDetails = { ...licenseDetails, tier: 'free', activated: false, activationKey: '', expiresAt: 'Nunca', clientLimit: PLANS.free.clientLimit, salesLimit: PLANS.free.salesLimit };
    setLicenseDetails(updated);
    try { localStorage.setItem('duo_pos_licensing_details', JSON.stringify(updated)); } catch {}
    playSound('error');
  };

  const handleUpdateAppVersion = (newVersion: string) => {
    setAppVersion(newVersion);
    localStorage.setItem('duo_pos_app_version', newVersion);
    playSound('levelup');
  };

  const handleSimulateInstallSuccess = () => {
    setIsSimInstalled(true);
    setShowInstallBanner(false);
    localStorage.setItem('duo_pos_sim_installed', 'true');
  };

  const handleLogout = () => logoutUser();

  if (showLanding && !user) {
    return (<><ClerkSessionSync onSyncUser={setUser} /><LandingPage onEnterApp={() => setShowLanding(false)} onEnterAsAdmin={() => { const adminUser: User = { id: 'user-admin', username: 'Administrador StockMaster', email: 'admin@stockmasterpro.com', avatar: 'duo', streak: 5, lastSaleDate: new Date().toISOString().split('T')[0], xp: 380, level: 3, dailyGoal: 150, levelTitle: 'Supervisor de Rachas 🥈', role: 'admin', gems: 400, gemsEarnedTotal: 400, unlockedSkins: ['skin-standard', 'skin-dark-galaxy', 'skin-neon-cyberpunk'], activeSkin: 'standard', unlockedBadges: [], completedMissionsToday: [], seasonXp: 0, seasonRewardsClaimed: [], }; loginUser(adminUser); toast.success('¡Ingresaste con la cuenta maestra de Administrador! ⚡🎉', { title: 'StockMaster Club' }); }} /></>);
  }

  if (isClockTampered || isLicenseExpired) return <LicenseBlockScreen />;

  if (!user) {
    return (<><ClerkSessionSync onSyncUser={setUser} /><LoginScreen onLoginSuccess={(u) => loginUser(u)} /></>);
  }

  return (
    <MainLayout isMuted={isMuted} toggleMute={toggleMute} onOpenHardwareHub={() => setIsHardwareHubOpen(true)} onSync={syncStateFromSupabase} isSyncing={isSyncing} lastSyncTime={lastSyncTime}>
      {/* Install Banner (Mobile only, hidden on desktop since the sidebar has a prominent install button) */}
      {showInstallBanner && !isSimInstalled && (
        <div className="md:hidden bg-[#58cc02] text-white py-2.5 px-4 text-xs md:text-sm font-black text-center relative z-40 flex items-center justify-center gap-2 border-b-4 border-[#46a302] shadow-md animate-slideDown">
          <span className="animate-bounce">📲</span>
          <span>¡Accede más rápido! Instala <strong>DuoPOS</strong> en tu PC o móvil para ver el layout nativo flotante.</span>
          <button onClick={() => setIsInstallModalOpen(true)} className="bg-white text-[#58cc02] font-black text-[10px] md:text-xs py-1 px-3.5 rounded-xl border border-[#dddddd] border-b-2 hover:bg-gray-50 active:translate-y-0.5 max-w-xs mx-1 cursor-pointer">Instalar (+55 XP)</button>
          <button onClick={() => setShowInstallBanner(false)} className="absolute right-3 top-2.5 font-bold opacity-75 hover:opacity-100" title="Cerrar banner publicitario">✕</button>
        </div>
      )}

      {/* Express Event Alert Banner */}
      {activeEvent && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 border-b-8 rounded-3xl p-4.5 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm animate-bounce" style={{ animationDuration: '4s' }}>
          <div className="flex items-center gap-4.5 w-full sm:w-auto">
            <div className="bg-amber-100 p-3 h-14 w-14 rounded-2xl flex items-center justify-center text-3xl shadow-sm animate-pulse flex-shrink-0">
              {activeEvent.type === 'happy_hour' ? '⚡' : activeEvent.type === 'scan_challenge' ? '🔍' : '🤝'}
            </div>
            <div className="text-left space-y-1">
              <span className="bg-amber-200 text-amber-950 text-[10px] uppercase font-black px-2 py-0.5 rounded-lg border-b border-amber-300">Reto Express Activo ⏰</span>
              <h4 className="text-lg font-black tracking-tight text-gray-800">{activeEvent.title}</h4>
              <p className="text-xs text-gray-500 font-extrabold leading-relaxed max-w-lg">{activeEvent.description}</p>
              {activeEvent.targetCount > 0 && (
                <div className="flex items-center gap-2 pt-1 w-full">
                  <div className="w-40 bg-gray-200 h-2.5 rounded-full overflow-hidden border border-gray-300">
                    <div className="bg-amber-500 h-full transition-all duration-300" style={{ width: `${(activeEvent.currentCount / activeEvent.targetCount) * 100}%` }} />
                  </div>
                  <span className="text-[10px] font-black text-amber-700">Progreso: {activeEvent.currentCount} / {activeEvent.targetCount}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4.5 w-full sm:w-auto justify-end">
            <div className="bg-amber-100 border-2 border-amber-200 rounded-2xl p-2 px-3.5 flex items-center gap-2 shadow-xs">
              <span className="text-xl font-black text-amber-600 font-mono tracking-tight animate-pulse">{Math.floor(activeEvent.remainingSeconds / 60)}:{(activeEvent.remainingSeconds % 60).toString().padStart(2, '0')}</span>
            </div>
            <button type="button" onClick={() => { playSound('click'); setActiveEvent(null); }} className="p-1 px-2 border-2 border-amber-200 text-amber-600 bg-white hover:bg-amber-50 font-black text-xs uppercase py-1.5 rounded-xl transition-all cursor-pointer">Omitir</button>
          </div>
        </div>
      )}

      <Routes>
        <Route path="/" element={<DashboardScreen user={user} transactions={transactions} products={products} onSetNewGoal={(val) => saveUser({ ...user, dailyGoal: val })} onNavigateToSell={() => setActiveTab('sales')} onGrantXp={handleGrantXp} onUpdateUser={saveUser} />} />
        <Route path="/sales" element={<SalesScreen products={products.map((p) => ({ ...p, stock: p.branchesStock?.[activeBranchId] ?? p.stock }))} user={user} onGrantXp={handleGrantXp} onAddTransaction={handleAddTransaction} onDecreaseStock={handleDecreaseStock} activeShift={activeShift} shiftHistory={shiftHistory} onOpenShift={handleOpenShift} onCloseShift={handleCloseShift} onAddShiftMovement={handleAddShiftMovement} customers={customers} billingSettings={billingSettings} hardwareSettings={hardwareSettings} onOpenHardwareSettings={() => setIsHardwareHubOpen(true)} onUpdateCustomer={handleUpdateCustomer} exchangeRate={exchangeRates[activeRateType]} activeRateType={activeRateType} exchangeRates={exchangeRates} activeEvent={activeEvent as any} onTriggerEventProgress={handleTriggerEventProgress} licenseDetails={licenseDetails} />} />
        <Route path="/customers" element={<CustomersScreen customers={customers} onAddCustomer={handleAddCustomer} onUpdateCustomer={handleUpdateCustomer} onDeleteCustomer={handleDeleteCustomer} onGrantXp={handleGrantXp} activeShift={activeShift} onAddShiftMovement={handleAddShiftMovement} />} />
        <Route path="/inventory" element={<InventoryScreen products={products.map((p) => ({ ...p, stock: p.branchesStock?.[activeBranchId] ?? p.stock }))} onAddProduct={handleAddProduct} onUpdateProduct={handleUpdateProduct} onDeleteProduct={handleDeleteProduct} onGrantXp={handleGrantXp} activeShift={activeShift} onAddShiftMovement={handleAddShiftMovement} currentUser={user} suppliers={suppliers} purchaseOrders={purchaseOrders} onAddSupplier={handleAddSupplier} onUpdateSupplier={handleUpdateSupplier} onDeleteSupplier={handleDeleteSupplier} onSavePurchaseOrder={handleSavePurchaseOrder} onTransitPurchaseOrder={handleTransitPurchaseOrder} onReceivePurchaseOrder={handleReceivePurchaseOrder} onCancelPurchaseOrder={handleCancelPurchaseOrder} onRegisterSupplierPayout={handleRegisterSupplierPayout} exchangeRate={exchangeRates[activeRateType]} activeRateType={activeRateType} />} />
        <Route path="/history" element={<HistoryScreen transactions={transactions} onRefundTransaction={handleRefundTransaction} currentUser={user} billingSettings={billingSettings} />} />
        <Route path="/settings" element={<SettingsScreen settings={billingSettings} onSaveSettings={handleSaveBillingSettings} onGrantXp={handleGrantXp} licenseDetails={licenseDetails} onActivateLicenseKey={handleActivateLicenseKey} onResetLicenseToFree={handleResetLicenseToFree} appVersion={appVersion} onUpdateAppVersion={handleUpdateAppVersion} user={user} products={products} transactions={transactions} />} />
        <Route path="/gamification" element={<GamificationScreen user={user} onUpdateUser={saveUser} transactions={transactions} products={products} customers={customers} licenseDetails={licenseDetails} activeEvent={activeEvent as any} onTriggerExpressEvent={handleTriggerExpressEvent} />} />
        <Route path="/shifts" element={<ShiftsScreen user={user} transactions={transactions} activeShift={activeShift} shiftHistory={shiftHistory} onOpenShift={handleOpenShift} onCloseShift={handleCloseShift} onAddShiftMovement={handleAddShiftMovement} onGrantXp={handleGrantXp} />} />
        <Route path="/logistics" element={<LogisticsScreen products={products} onUpdateProduct={handleUpdateProduct} transactions={transactions} activeShift={activeShift} shiftHistory={shiftHistory} onGrantXp={handleGrantXp} branches={branches} setBranches={setBranches} activeBranchId={activeBranchId} setActiveBranchId={setActiveBranchId} registers={registers} setRegisters={setRegisters} activeRegisterId={activeRegisterId} setActiveRegisterId={setActiveRegisterId} stockTransfers={stockTransfers} setStockTransfers={setStockTransfers} currentUser={user} licenseDetails={licenseDetails} />} />
      </Routes>

      {/* Modals */}
      {isInstallModalOpen && <InstallModal onClose={() => setIsInstallModalOpen(false)} onGrantXp={handleGrantXp} isSimulatedInstalled={isSimInstalled} onSimulateInstallSuccess={handleSimulateInstallSuccess} deferredPrompt={deferredPrompt} setDeferredPrompt={setDeferredPrompt} />}
      <LevelUpCelebrateModal />
      <RoleLockWarningModal setActiveTab={setActiveTab} />
      {isPinModalOpen && pendingRole && (
        <PinLockModal isOpen={isPinModalOpen} requiredRole={pendingRole === 'admin' ? 'admin' : 'supervisor'} onClose={() => { setIsPinModalOpen(false); setPendingRole(null); }}
          onSuccess={() => {
            setIsPinModalOpen(false);
            if (pendingRole) {
              const updatedUser = { ...user, role: pendingRole };
              setUser(updatedUser);
              localStorage.setItem('duo_pos_active_user', JSON.stringify(updatedUser));
              const savedUsersRaw = localStorage.getItem('duo_pos_users');
              if (savedUsersRaw) {
                try { const users = JSON.parse(savedUsersRaw); const idx = users.findIndex((u: any) => u.username.toLowerCase() === user.username.toLowerCase()); if (idx !== -1) { users[idx].role = pendingRole; localStorage.setItem('duo_pos_users', JSON.stringify(users)); } } catch {}
              }
              playSound('levelup');
              addAuditLog('roles', 'escalar', `Usuario ${user?.username || 'Cajero'} escaló privilegios al rol de ${pendingRole} tras validar PIN con éxito`);
            }
            setPendingRole(null);
          }} />
      )}
      {isHardwareHubOpen && <HardwareHubModal settings={hardwareSettings} onSaveSettings={handleSaveHardwareSettings} onClose={() => setIsHardwareHubOpen(false)} />}
      <FlashNotifications />
    </MainLayout>
  );
}
