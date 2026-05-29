/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { User, Product, Transaction, CashShift, Customer, LegalBillingSettings, Branch, CashRegister, StockTransfer, Supplier, PurchaseOrder, ExpressEvent } from '../types/index';
import { DUO_CHARACTERS } from '../initialData';
import LoginScreen from '../features/auth/LoginScreen';
import LandingPage from '../features/auth/LandingPage';
import { supabase, isSupabaseConfigured, setSupabaseToken } from '../config/supabaseClient';
import { useAuth, useUser } from '@clerk/clerk-react';
import { syncLoad, syncSave, syncInsert, syncDelete, flushPendingQueue, generateUUID, syncInsertTransaction, syncSaveShift, syncSavePurchaseOrder, getLocalData, setLocalData } from '../services/supabaseSync';

import { useUserStore } from '../stores/useUserStore';
import { useSalesStore } from '../stores/useSalesStore';
import { useInventoryStore } from '../stores/useInventoryStore';
import { useCustomerStore } from '../stores/useCustomerStore';

import DashboardScreen from '../features/dashboard/DashboardScreen';
import SalesScreen from '../features/sales/SalesScreen';
import InventoryScreen from '../features/inventory/InventoryScreen';
import HistoryScreen from '../features/history/HistoryScreen';
import CustomersScreen from '../features/customers/CustomersScreen';
import SettingsScreen from '../features/settings/SettingsScreen';
import ShiftsScreen from '../features/shifts/ShiftsScreen';
import LogisticsScreen from '../features/logistics/LogisticsScreen';
import InstallModal from '../components/Modal/InstallModal';
import GamificationScreen from '../features/gamification/GamificationScreen';
import AeroMascot from '../components/Mascot/AeroMascot';
import type { AeroMood } from '../components/Mascot/AeroMascot';
import ShieldCrest from '../components/Mascot/ShieldCrest';
import LicenseBlockScreen from '../components/Modal/LicenseBlockScreen';
import LevelUpCelebrateModal from '../components/Modal/LevelUpCelebrateModal';
import RoleLockWarningModal from '../components/Modal/RoleLockWarningModal';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { Home, ShoppingBag, Package, History, LogOut, Download, Flame, Award, Smartphone, Laptop, Sparkles, Volume2, VolumeX, Users, Settings, Wallet, Globe, Cpu, Trophy, RefreshCw, Cloud } from 'lucide-react';
import { playSound } from '../services/sounds';
import { HardwareDeviceSettings, DEFAULT_HARDWARE_SETTINGS } from '../services/printService';
import HardwareHubModal from '../components/Modal/HardwareHubModal';
import { FlashNotifications, toast } from '../components/Modal/FlashNotifications';
import { LicenseDetails, validateLicenseKeyOnline, generateHardwareFingerprint, PLANS, detectClockTampering } from '../services/licensing';
import { useExchangeRates } from '../hooks/useExchangeRates';
import { useInventory } from '../hooks/useInventory';
import { useCustomers } from '../hooks/useCustomers';
import { useShifts } from '../hooks/useShifts';
import { useExpressEvents } from '../hooks/useExpressEvents';
import { useInitialLoad } from '../hooks/useInitialLoad';
import { useSession } from '../hooks/useSession';


// ─── Componente de Sincronización de Sesiones Clerk + Supabase ────────────────
function ClerkSessionSync({ onSyncUser }: { onSyncUser: (user: User | null) => void }) {
  const { userId, getToken, isLoaded: isAuthLoaded } = useAuth();
  const { user: clerkUser, isLoaded: isUserLoaded } = useUser();

  useEffect(() => {
    if (!isAuthLoaded) return; // Wait until Clerk auth state is fully loaded

    const syncToken = async () => {
      if (userId) {
        try {
          const token = await getToken({ template: 'supabase' });
          setSupabaseToken(token);
        } catch (err) {
          console.error('Error getting Supabase token from Clerk:', err);
        }
      } else {
        setSupabaseToken(null);
      }
    };
    syncToken();
  }, [userId, getToken, isAuthLoaded]);

  useEffect(() => {
    if (!isUserLoaded) return; // Wait until Clerk user profile is fully loaded

    const loadClerkUserProfile = async () => {
      if (clerkUser) {
        try {
          const { data: userProfile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', clerkUser.id)
            .maybeSingle();

          let finalProfile = userProfile;

          if (!finalProfile) {
            console.log('Self-healing Clerk: Creando perfil comercial en Supabase...');
            const defaultProfile = {
              id: clerkUser.id,
              username: clerkUser.username || clerkUser.firstName || 'Cajero',
              email: clerkUser.primaryEmailAddress?.emailAddress || '',
              avatar: 'duo',
              streak: 1,
              xp: 120,
              level: 1,
              daily_goal: 150,
              level_title: 'Cajero Novato 🦉',
              role: 'admin',
              gems: 40,
              gems_earned_total: 40,
              unlocked_skins: ['standard'],
              active_skin: 'standard',
              unlocked_badges: [],
              completed_missions_today: []
            };

            const { data: newProfile, error: insertErr } = await supabase
              .from('profiles')
              .insert(defaultProfile)
              .select()
              .maybeSingle();

            finalProfile = newProfile || defaultProfile;
          }

          if (finalProfile) {
            const mappedUser: User = {
              id: finalProfile.id,
              username: finalProfile.username,
              email: finalProfile.email,
              avatar: finalProfile.avatar,
              streak: finalProfile.streak,
              lastSaleDate: finalProfile.last_sale_date,
              xp: finalProfile.xp,
              level: finalProfile.level,
              dailyGoal: Number(finalProfile.daily_goal),
              levelTitle: finalProfile.level_title,
              role: finalProfile.role,
              gems: finalProfile.gems,
              gemsEarnedTotal: finalProfile.gems_earned_total,
              unlockedSkins: finalProfile.unlocked_skins,
              activeSkin: finalProfile.active_skin,
              unlockedBadges: finalProfile.unlocked_badges,
              completedMissionsToday: finalProfile.completed_missions_today
            };
            onSyncUser(mappedUser);
            // Persist locally to avoid loading flicker
            localStorage.setItem('duo_pos_active_user', JSON.stringify(mappedUser));
          }
        } catch (err) {
          console.error('Error loading Clerk profile in sync:', err);
        }
      } else {
        // Clerk is fully loaded and there is no active session -> clear active user
        onSyncUser(null);
      }
    };
    loadClerkUserProfile();
  }, [clerkUser, isUserLoaded]);

  return null;
}

export default function AppRouter() {
  // Zustand Stores Hooks
  const user = useUserStore(state => state.user);
  const setUser = useUserStore(state => state.setUser);
  const users = useUserStore(state => state.users);
  const setUsers = useUserStore(state => state.setUsers);
  const showLanding = useUserStore(state => state.showLanding);
  const setShowLanding = useUserStore(state => state.setShowLanding);
  const licenseDetails = useUserStore(state => state.licenseDetails);
  const setLicenseDetails = useUserStore(state => state.setLicenseDetails);
  const isLicenseExpired = useUserStore(state => state.isLicenseExpired);
  const setIsLicenseExpired = useUserStore(state => state.setIsLicenseExpired);

  const isClockTampered = useUserStore(state => state.isClockTampered);
  const setIsClockTampered = useUserStore(state => state.setIsClockTampered);
  const duoMood = useUserStore(state => state.duoMood);
  const setDuoMood = useUserStore(state => state.setDuoMood);
  const duoSparkles = useUserStore(state => state.duoSparkles);
  const setDuoSparkles = useUserStore(state => state.setDuoSparkles);
  const levelUpAchieved = useUserStore(state => state.levelUpAchieved);
  const setLevelUpAchieved = useUserStore(state => state.setLevelUpAchieved);
  const roleLockWarning = useUserStore(state => state.roleLockWarning);
  const setRoleLockWarning = useUserStore(state => state.setRoleLockWarning);
  const lastSyncTime = useUserStore(state => state.lastSyncTime);
  const setLastSyncTime = useUserStore(state => state.setLastSyncTime);

  const activeBranchId = useSalesStore(state => state.activeBranchId);
  const setActiveBranchId = useSalesStore(state => state.setActiveBranchId);
  const activeRegisterId = useSalesStore(state => state.activeRegisterId);
  const setActiveRegisterId = useSalesStore(state => state.setActiveRegisterId);
  const branches = useSalesStore(state => state.branches);
  const setBranches = useSalesStore(state => state.setBranches);
  const registers = useSalesStore(state => state.registers);
  const setRegisters = useSalesStore(state => state.setRegisters);
  const activeShift = useSalesStore(state => state.activeShift);
  const setActiveShift = useSalesStore(state => state.setActiveShift);
  const shiftHistory = useSalesStore(state => state.shiftHistory);
  const setShiftHistory = useSalesStore(state => state.setShiftHistory);
  const transactions = useSalesStore(state => state.transactions);
  const setTransactions = useSalesStore(state => state.setTransactions);
  const exchangeRates = useSalesStore(state => state.exchangeRates);
  const setExchangeRates = useSalesStore(state => state.setExchangeRates);
  const activeRateType = useSalesStore(state => state.activeRateType);
  const setActiveRateType = useSalesStore(state => state.setActiveRateType);
  const hardwareSettings = useSalesStore(state => state.hardwareSettings);
  const setHardwareSettings = useSalesStore(state => state.setHardwareSettings);
  const billingSettings = useSalesStore(state => state.billingSettings);
  const setBillingSettings = useSalesStore(state => state.setBillingSettings);

  const products = useInventoryStore(state => state.products);
  const setProducts = useInventoryStore(state => state.setProducts);
  const suppliers = useInventoryStore(state => state.suppliers);
  const setSuppliers = useInventoryStore(state => state.setSuppliers);
  const purchaseOrders = useInventoryStore(state => state.purchaseOrders);
  const setPurchaseOrders = useInventoryStore(state => state.setPurchaseOrders);
  const stockTransfers = useInventoryStore(state => state.stockTransfers);
  const setStockTransfers = useInventoryStore(state => state.setStockTransfers);
  const activeEvent = useInventoryStore(state => state.activeEvent);
  const setActiveEvent = useInventoryStore(state => state.setActiveEvent);

  const customers = useCustomerStore(state => state.customers);
  const setCustomers = useCustomerStore(state => state.setCustomers);

  const {
    loginUser,
    logoutUser,
    saveUser,
  } = useSession();

  // Local UI-scoped states
  const isDev = user && (
    user.username.toLowerCase() === 'jonas' || 
    user.username.toLowerCase() === 'jonas_mendoza' || 
    (user.email && user.email.toLowerCase().includes('jonas')) || 
    user.username.toLowerCase() === 'admin'
  );
  const navigate = useNavigate();
  const location = useLocation();

  const activeTab = location.pathname === '/' ? 'dashboard' : (location.pathname.substring(1) as any);

  const setActiveTab = (tab: 'dashboard' | 'sales' | 'shifts' | 'inventory' | 'history' | 'customers' | 'settings' | 'logistics' | 'gamification') => {
    navigate(tab === 'dashboard' ? '/' : '/' + tab);
  };

  // ─── DuoMascot reactive mood state ───

  // Inactivity timer: 2 minutes → sleepy
  useEffect(() => {
    let inactivityTimer: ReturnType<typeof setTimeout>;
    const resetInactivity = () => {
      // Don't override happy mood while it's showing
      const currentMood = duoMood;
      setDuoMood(currentMood === 'happy' ? 'happy' : 'neutral');
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        setDuoMood('sleeping');
      }, 120000); // 2 minutes
    };

    resetInactivity();
    window.addEventListener('mousemove', resetInactivity);
    window.addEventListener('keydown', resetInactivity);
    window.addEventListener('click', resetInactivity);
    window.addEventListener('touchstart', resetInactivity);
    return () => {
      clearTimeout(inactivityTimer);
      window.removeEventListener('mousemove', resetInactivity);
      window.removeEventListener('keydown', resetInactivity);
      window.removeEventListener('click', resetInactivity);
      window.removeEventListener('touchstart', resetInactivity);
    };
  }, [duoMood]);

  // Helper: trigger happy mood for 5 seconds
  const triggerDuoHappy = () => {
    setDuoMood('happy');
    setDuoSparkles(true);
    setTimeout(() => {
      setDuoMood('neutral');
      setDuoSparkles(false);
    }, 5000);
  };
  
  // Real-time Venezuelan Exchange rates state (ve.dolarapi.com)
  // Powered by React Query + ky — auto-refetch cada 120s, retry, caché local

  const {
    data: exchangeRatesQuery,
    isFetching: isRefreshingRates,
    refetch: refetchRates,
  } = useExchangeRates();

  // Sync React Query data to Zustand store + localStorage
  useEffect(() => {
    if (exchangeRatesQuery) {
      setExchangeRates(exchangeRatesQuery);
      try {
        localStorage.setItem('duo_pos_exchange_rates', JSON.stringify(exchangeRatesQuery));
      } catch {}
    }
  }, [exchangeRatesQuery]);

  const handleToggleRateType = (type: 'oficial' | 'paralelo') => {
    if (licenseDetails.tier === 'free' && type === 'paralelo') {
      playSound('error');
      toast.error('El soporte para tasas de dólar paralelo (Monitor) requiere el Plan Standard o Pro. Actualiza tu plan en Ajustes > Planes.', { title: 'Plan Standard o Pro Requerido 🔒' });
      return;
    }
    setActiveRateType(type);
    localStorage.setItem('duo_pos_active_rate_type', type);
    playSound('click');
    toast.info(`Precios convertidos usando tasas de tipo: ${type === 'oficial' ? 'BCV Oficial' : 'Paralelo (Monitor)'}`, { title: 'Tasa Alternada 🔄' });
  };
  
  // Extracted domain hooks
  const {
    addProduct: inventoryAddProduct,
    updateProduct: inventoryUpdateProduct,
    deleteProduct: inventoryDeleteProduct,
    decreaseStock: inventoryDecreaseStock,
    addSupplier: inventoryAddSupplier,
    updateSupplier: inventoryUpdateSupplier,
    deleteSupplier: inventoryDeleteSupplier,
    savePurchaseOrder: inventorySavePurchaseOrder,
    transitPurchaseOrder: inventoryTransitPurchaseOrder,
    receivePurchaseOrder: inventoryReceivePurchaseOrder,
    cancelPurchaseOrder: inventoryCancelPurchaseOrder,
    registerSupplierPayout: inventoryRegisterSupplierPayout,
  } = useInventory();

  const {
    addCustomer,
    updateCustomer,
    deleteCustomer,
    processCustomerLoyalty,
  } = useCustomers();

  const {
    openShift,
    closeShift,
    addShiftMovement,
    updateShiftAfterSale,
    updateShiftAfterRefund,
  } = useShifts();

  const {
    triggerEventProgress,
    triggerExpressEvent,
  } = useExpressEvents();

  // Hardware status state
  const [isHardwareHubOpen, setIsHardwareHubOpen] = useState(false);

  const handleSaveHardwareSettings = (settings: HardwareDeviceSettings) => {
    setHardwareSettings(settings);
    localStorage.setItem('duo_pos_hardware_settings', JSON.stringify(settings));
  };
  
  // Multi-Sucursal, Multi-Caja & Almacén Central (CEDIS) State Managers
  
  // Real-time Sound Muted settings state
  const [isMuted, setIsMuted] = useState(() => localStorage.getItem('duo_pos_muted') === 'true');

  // Licensing & Subscription state managers
  useEffect(() => {
    try {
      const saved = localStorage.getItem('duo_pos_licensing_details');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.tier === 'trial') { parsed.tier = 'free'; parsed.clientLimit = PLANS.free.clientLimit; parsed.salesLimit = PLANS.free.salesLimit; }
        if (parsed.tier === 'unlimited_racha' || parsed.tier === 'enterprise_buhoflota') { parsed.tier = 'pro'; parsed.clientLimit = PLANS.pro.clientLimit; parsed.salesLimit = PLANS.pro.salesLimit; }
        localStorage.setItem('duo_pos_licensing_details', JSON.stringify(parsed));
        setLicenseDetails(parsed);
      } else {
        let customSeed = localStorage.getItem('duo_pos_offline_seed');
        if (!customSeed) {
          customSeed = generateHardwareFingerprint();
          localStorage.setItem('duo_pos_offline_seed', customSeed);
        }
        setLicenseDetails({
          tier: 'free',
          activated: false,
          activationKey: '',
          expiresAt: 'Nunca',
          clientLimit: PLANS.free.clientLimit,
          salesLimit: PLANS.free.salesLimit,
          currentSalesCount: 0,
          offlineActivationSeed: customSeed,
          companyName: ''
        });
      }
    } catch (e) {
      console.error('Error loading license details:', e);
    }
  }, []);

  // Track sales count matching local storage transactions
  useEffect(() => {
    if (licenseDetails && licenseDetails.currentSalesCount !== transactions.length) {
      const updated = { ...licenseDetails, currentSalesCount: transactions.length };
      try {
        localStorage.setItem('duo_pos_licensing_details', JSON.stringify(updated));
      } catch (err) {}
      setLicenseDetails(updated);
    }
  }, [transactions.length]);

  useEffect(() => {
    if (licenseDetails.tier === 'free' && activeRateType === 'paralelo') {
      setActiveRateType('oficial');
      localStorage.setItem('duo_pos_active_rate_type', 'oficial');
    }
  }, [licenseDetails.tier, activeRateType]);

  // Periodic License Validity & Clock Tampering Verification
  useEffect(() => {
    const checkLicenseValidity = () => {
      // 1. Check for clock tampering
      const clockTampered = detectClockTampering();
      if (clockTampered) {
        setIsClockTampered(true);
        return; // Don't check expiration if clock is tampered
      }
      setIsClockTampered(false);

      // 2. Check for license expiration
      if (licenseDetails.activated && licenseDetails.expiresAt !== 'Nunca') {
        const expiryDate = new Date(licenseDetails.expiresAt);
        const today = new Date();
        
        // Strip hours to do pure date comparisons
        today.setHours(0, 0, 0, 0);
        expiryDate.setHours(23, 59, 59, 999); // Active through the end of the day

        if (today > expiryDate) {
          console.warn("⚠️ [LICENSING] Licencia de DuoPOS expirada.");
          setIsLicenseExpired(true);
        } else {
          setIsLicenseExpired(false);
        }
      } else {
        setIsLicenseExpired(false);
      }
    };

    checkLicenseValidity();

    // Check every 20 seconds to prevent client tricks
    const interval = setInterval(checkLicenseValidity, 20000);
    return () => clearInterval(interval);
  }, [licenseDetails]);

  const handleActivateLicenseKey = async (key: string, companyName?: string) => {
    const seed = licenseDetails.offlineActivationSeed;
    const res = await validateLicenseKeyOnline(key, seed, companyName);
    if (res.valid) {
      const plan = PLANS[res.tier];
      const updated: LicenseDetails = {
        ...licenseDetails,
        tier: res.tier,
        activated: true,
        activationKey: key.toUpperCase().trim(),
        expiresAt: res.expiresAt || 'Nunca',
        clientLimit: plan.clientLimit,
        salesLimit: plan.salesLimit,
        activatedAt: new Date().toISOString(),
        companyName: companyName || ''
      };
      setLicenseDetails(updated);
      try {
        localStorage.setItem('duo_pos_licensing_details', JSON.stringify(updated));
      } catch (err) {}
      
      // Update check variables immediately
      setIsLicenseExpired(false);
      setIsClockTampered(false);

      playSound('levelup');
      return { success: true, message: `¡Licencia activada con éxito!\nFelicidades, tu DuoPOS ahora tiene el plan [${plan.name}] activo en este terminal.` };
    } else {
      return { success: false, message: res.error || 'La llave ingresada es inválida.' };
    }
  };

  const handleResetLicenseToFree = () => {
    const updated: LicenseDetails = {
      ...licenseDetails,
      tier: 'free',
      activated: false,
      activationKey: '',
      expiresAt: 'Nunca',
      clientLimit: PLANS.free.clientLimit,
      salesLimit: PLANS.free.salesLimit
    };
    setLicenseDetails(updated);
    try {
      localStorage.setItem('duo_pos_licensing_details', JSON.stringify(updated));
    } catch (err) {}
    playSound('error');
  };

  // Dynamic App Version state representing desktop updates
  const [appVersion, setAppVersion] = useState(() => localStorage.getItem('duo_pos_app_version') || 'v1.8-Stable');

  const handleUpdateAppVersion = (newVersion: string) => {
    setAppVersion(newVersion);
    localStorage.setItem('duo_pos_app_version', newVersion);
    playSound('levelup');
  };

  // Drawer / Shift Control states

  const toggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    localStorage.setItem('duo_pos_muted', String(nextMute));
    if (!nextMute) {
      playSound('click');
    }
  };
  
  // Install states
  const [isSimInstalled, setIsSimInstalled] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(true);
  
  // Real native installation prompt trigger state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      console.log('beforeinstallprompt triggered. PWA ready for native installation!');
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  // Sync state for multi-device synchronization
  const [isSyncing, setIsSyncing] = useState(false);

  // Función para sincronizar todos los datos desde Supabase
  const syncStateFromSupabase = async (showToasts = true) => {
    if (!user || !isSupabaseConfigured() || !navigator.onLine) {
      if (showToasts) {
        toast.info('No hay conexión a Internet o Supabase no está configurado.', { title: 'Sincronización no disponible' });
      }
      return;
    }
    setIsSyncing(true);
    try {
      // Primero enviar cambios pendientes locales a la nube
      await flushPendingQueue();

      const results = await Promise.allSettled([
        syncLoad<Product>('products', 'duo_pos_products', []).then(async loaded => {
          const augmented = loaded.map(p => {
            if (!p.branchesStock) {
              return { ...p, branchesStock: { 'branch-centro': p.stock, 'branch-central': p.stock * 3 + 40, 'branch-norte': Math.round(p.stock * 0.7) + 5 } };
            }
            return p;
          });
          setProducts(augmented);
          await setLocalData('duo_pos_products', augmented);
        }),
        syncLoad<Transaction>('transactions', 'duo_pos_transactions', [], { orderBy: 'date', ascending: false }).then(setTransactions),
        syncLoad<Customer>('customers', 'duo_pos_customers', []).then(setCustomers),
        syncLoad<CashShift>('cash_shifts', 'duo_pos_shift_history', [], { orderBy: 'opening_time', ascending: false }).then(loaded => {
          const active = loaded.find(s => s.status === 'open' && s.branchId === activeBranchId && s.registerId === activeRegisterId);
          if (active) {
            setActiveShift(active);
          } else {
            setActiveShift(null);
          }
          setShiftHistory(loaded.filter(s => s.status === 'closed' && s.branchId === activeBranchId && s.registerId === activeRegisterId));
        }),
        syncLoad<Branch>('branches', 'duo_pos_branches', []).then(setBranches),
        syncLoad<CashRegister>('cash_registers', 'duo_pos_registers', []).then(setRegisters),
        syncLoad<StockTransfer>('stock_transfers', 'duo_pos_stock_transfers', [], { orderBy: 'created_at', ascending: false }).then(setStockTransfers),
        syncLoad<Supplier>('suppliers', 'duo_pos_suppliers', []).then(setSuppliers),
        syncLoad<PurchaseOrder>('purchase_orders', 'duo_pos_purchase_orders', [], { orderBy: 'created_at', ascending: false }).then(setPurchaseOrders),
      ]);

      const synced = results.filter(r => r.status === 'fulfilled').length;
      const now = new Date().toLocaleTimeString();
      setLastSyncTime(now);
      if (showToasts) {
        toast.success(`Datos sincronizados (${synced} tablas).`, { title: `Sincronizado ✅ ${now}` });
      }
    } catch (err) {
      console.error('Error en syncStateFromSupabase:', err);
      if (showToasts) {
        toast.error('Error al sincronizar. Revisa tu conexión.', { title: 'Error de sincronización' });
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // Sincronización automática cada 30 segundos si hay usuario logueado y Supabase configurado
  useEffect(() => {
    if (!user || !isSupabaseConfigured()) return;
    const interval = setInterval(() => {
      if (navigator.onLine) {
        syncStateFromSupabase(false);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Express events handlers (delegated to useExpressEvents hook)
  const handleTriggerEventProgress = (type: 'scan' | 'loyalty' | 'sale') => {
    triggerEventProgress(type, saveUser, user);
  };
  const handleTriggerExpressEvent = (type: 'happy_hour' | 'scan_challenge' | 'loyalty_challenge') => {
    triggerExpressEvent(type);
  };

  // Local storage initialization (delegated to useInitialLoad hook)
  useInitialLoad();

  // Load install status from localStorage
  useEffect(() => {
    const simInstallRaw = localStorage.getItem('duo_pos_sim_installed');
    if (simInstallRaw === 'true') {
      setIsSimInstalled(true);
      setShowInstallBanner(false);
    }
  }, []);

  // Recargar turno activo e historial cuando se cambia de sucursal o de caja registradora
  useEffect(() => {
    const reloadShiftsForCurrentRegister = async () => {
      try {
        const loaded = await syncLoad<CashShift>('cash_shifts', 'duo_pos_shift_history', [], { orderBy: 'opening_time', ascending: false });
        
        const active = loaded.find(s => s.status === 'open' && s.branchId === activeBranchId && s.registerId === activeRegisterId);
        if (active) {
          setActiveShift(active);
        } else {
          const activeShiftRaw = localStorage.getItem('duo_pos_active_shift');
          if (activeShiftRaw) {
            const parsed = JSON.parse(activeShiftRaw);
            if (parsed.branchId === activeBranchId && parsed.registerId === activeRegisterId) {
              setActiveShift(parsed);
            } else {
              setActiveShift(null);
            }
          } else {
            setActiveShift(null);
          }
        }
        
        const closed = loaded.filter(s => s.status === 'closed' && s.branchId === activeBranchId && s.registerId === activeRegisterId);
        setShiftHistory(closed);
      } catch {
        const activeShiftRaw = localStorage.getItem('duo_pos_active_shift');
        if (activeShiftRaw) {
          const parsed = JSON.parse(activeShiftRaw);
          if (parsed.branchId === activeBranchId && parsed.registerId === activeRegisterId) {
            setActiveShift(parsed);
          } else {
            setActiveShift(null);
          }
        } else {
          setActiveShift(null);
        }
        
        const shiftHistoryRaw = localStorage.getItem('duo_pos_shift_history');
        if (shiftHistoryRaw) {
          const parsedHistory: CashShift[] = JSON.parse(shiftHistoryRaw);
          setShiftHistory(parsedHistory.filter(s => s.branchId === activeBranchId && s.registerId === activeRegisterId));
        }
      }
    };
    
    reloadShiftsForCurrentRegister();
  }, [activeBranchId, activeRegisterId]);

  // Guard the active Tab if active user role changes
  useEffect(() => {
    if (user) {
      const currentUserRole = user.role || 'cashier';
      const tabRolesMap: Record<string, string[]> = {
        inventory: ['admin', 'supervisor'],
        logistics: ['admin', 'supervisor'],
        settings: ['admin']
      };
      const required = tabRolesMap[activeTab];
      if (required && !required.includes(currentUserRole)) {
        setActiveTab('dashboard');
      }
    }
  }, [user?.role, activeTab]);

  // Gamified XP / Level Booster Handler (delega a useUserStore.grantXp + maneja levelUp modal)
  const handleGrantXp = (amount: number) => {
    if (!user) return;

    const isHappyHourActive = activeEvent?.type === 'happy_hour';
    useUserStore.getState().grantXp(amount, isHappyHourActive);
  };

  // Inventory logic handlers (delegated to useInventory hook)
  const handleAddProduct = (newProd: Omit<Product, 'id'>) => inventoryAddProduct(newProd, activeBranchId, handleGrantXp);
  const handleUpdateProduct = (prod: Product) => inventoryUpdateProduct(prod, activeBranchId);
  const handleDeleteProduct = (id: string) => inventoryDeleteProduct(id);
  const handleDecreaseStock = (productId: string, qty: number) => inventoryDecreaseStock(productId, qty, activeBranchId);

  // Customer handlers (delegated to useCustomers hook)
  const handleAddCustomer = (newCust: any) => addCustomer(newCust, licenseDetails);
  const handleUpdateCustomer = (cust: Customer) => updateCustomer(cust);
  const handleDeleteCustomer = (id: string) => deleteCustomer(id);

  const handleSaveBillingSettings = async (updated: LegalBillingSettings) => {
    setBillingSettings(updated);
    localStorage.setItem('duo_pos_billing_settings', JSON.stringify(updated));
    if (updated.enableSounds !== undefined) {
      const isMutedNow = !updated.enableSounds;
      setIsMuted(isMutedNow);
      localStorage.setItem('duo_pos_muted', String(isMutedNow));
    }

    // Save to Supabase (Local-First Sync)
    const loadedSettingsRaw = localStorage.getItem('duo_pos_settings');
    let allSettings: { id: string; data: any }[] = [];
    try {
      allSettings = loadedSettingsRaw ? JSON.parse(loadedSettingsRaw) : [];
    } catch {}
    
    allSettings = allSettings.filter(s => s.id !== 'billing');
    const newRow = { id: 'billing', data: updated };
    allSettings.push(newRow);

    await syncSave<{ id: string; data: any }>('settings', 'duo_pos_settings', allSettings, newRow);
  };

  // Suppliers and Purchase Orders handlers (delegated to useInventory hook)
  const handleAddSupplier = (supplierData: Omit<Supplier, 'id' | 'balance'>) => inventoryAddSupplier(supplierData);
  const handleUpdateSupplier = (supplier: Supplier) => inventoryUpdateSupplier(supplier);
  const handleDeleteSupplier = (id: string) => inventoryDeleteSupplier(id);
  const handleSavePurchaseOrder = (po: PurchaseOrder) => inventorySavePurchaseOrder(po);
  const handleTransitPurchaseOrder = (id: string, carrier: string, estimatedDelivery: string) => inventoryTransitPurchaseOrder(id, carrier, estimatedDelivery);
  const handleReceivePurchaseOrder = async (id: string) => {
    await inventoryReceivePurchaseOrder(id);
  };
  const handleCancelPurchaseOrder = (id: string) => inventoryCancelPurchaseOrder(id);
  const handleRegisterSupplierPayout = (supplierId: string, amount: number, notes: string) => inventoryRegisterSupplierPayout(supplierId, amount, notes);

  // Transactions logic handlers
  const handleAddTransaction = async (txn: Transaction) => {
    if (transactions.length >= licenseDetails.salesLimit) {
      playSound('error');
      toast.error(`Has completado el límite para el plan actual (${licenseDetails.salesLimit} ventas). Para seguir procesando transacciones, actualiza tu licencia en Ajustes > Planes.`, {
        title: 'Límite de Ventas Excedido 🔒',
        duration: 10000
      });
      return;
    }

    const txnWithBranch: Transaction = {
      ...txn,
      branchId: txn.branchId || activeBranchId,
      registerId: txn.registerId || activeRegisterId
    };
    const updatedTxns = [txnWithBranch, ...transactions];
    setTransactions(updatedTxns);
    
    await syncInsertTransaction(txnWithBranch, updatedTxns);

    // Increment billingSettings invoice sequence if transaction has invoiceData
    if (txn.invoiceData && billingSettings) {
      const updatedBilling = {
        ...billingSettings,
        nextInvoiceNumber: billingSettings.nextInvoiceNumber + 1
      };
      setBillingSettings(updatedBilling);
      localStorage.setItem('duo_pos_billing_settings', JSON.stringify(updatedBilling));

      // Save to Supabase (Local-First Sync)
      const loadedSettingsRaw = localStorage.getItem('duo_pos_settings');
      let allSettings: { id: string; data: any }[] = [];
      try {
        allSettings = loadedSettingsRaw ? JSON.parse(loadedSettingsRaw) : [];
      } catch {}
      
      allSettings = allSettings.filter(s => s.id !== 'billing');
      const newRow = { id: 'billing', data: updatedBilling };
      allSettings.push(newRow);

      await syncSave<{ id: string; data: any }>('settings', 'duo_pos_settings', allSettings, newRow);

      // Increment invoicesEmitted daily quests metric
      try {
        const today = new Date().toISOString().split('T')[0];
        const dayStatsRaw = localStorage.getItem(`duo_pos_daily_acts_${today}`);
        const currentStats = dayStatsRaw ? JSON.parse(dayStatsRaw) : { barcodeScans: 0, invoicesEmitted: 0, customersRegistered: 0 };
        currentStats.invoicesEmitted = (currentStats.invoicesEmitted || 0) + 1;
        localStorage.setItem(`duo_pos_daily_acts_${today}`, JSON.stringify(currentStats));
      } catch (e) {}
    }

    // Process Customer Loyalty Points accretion (delegated to useCustomers hook)
    if (txn.customerId) {
      processCustomerLoyalty(txn);
    }

    // Update active cash shift diagnostics if active (delegated to useShifts hook)
    if (activeShift) {
      const isCash = txn.paymentMethod === 'cash';
      const cashAddition = txn.isMixedPayment ? (txn.mixedCashAmount || 0) : (isCash ? txn.total : 0);
      updateShiftAfterSale(txn.total, cashAddition, txn.paymentMethod || '', !!txn.isMixedPayment);
    }


    // Handle streak calculation logic!
    if (user) {
      const today = new Date().toISOString().split('T')[0];
      
      let streak = user.streak;
      if (user.lastSaleDate !== today) {
        // If they sold today, check if last registration was yesterday to increment, 
        // or keep racha alive. For arcade POS fun, any new active sales day extends the streak!
        streak = user.streak + 1;
      }

      // Cashier gets rewarded with gems and experience points organically on any successful POS sale!
      const currentGems = user.gems ?? 40;
      const gainedGems = 5;
      const nextGems = currentGems + gainedGems;
      const nextGemsTotal = (user.gemsEarnedTotal ?? 40) + gainedGems;

      // Handle raw level XP accretion (delegado a useUserStore.grantXp via handleGrantXp)
      handleGrantXp(15);

      // Trigger happy owl reaction on sale
      triggerDuoHappy();

      // Automatically register the first sale everyday in daily simulation stats to unlock quests too!
      try {
        const dayStatsRaw = localStorage.getItem(`duo_pos_daily_acts_${today}`);
        const currentStats = dayStatsRaw ? JSON.parse(dayStatsRaw) : { barcodeScans: 0, invoicesEmitted: 0, customersRegistered: 0 };
        // We can save status
        localStorage.setItem(`duo_pos_daily_acts_${today}`, JSON.stringify(currentStats));
      } catch (err) {}

      const updatedUser: User = {
        ...user,
        streak,
        lastSaleDate: today,
        gems: (user.gems ?? 40) + 5,
        gemsEarnedTotal: (user.gemsEarnedTotal ?? 40) + 5,
      };

      saveUser(updatedUser);
    }
  };

  const handleRefundTransaction = async (txnId: string) => {
    const targetTxn = transactions.find(t => t.id === txnId);
    if (!targetTxn) return;

    // 1. Restore product inventory stocks
    const changedProducts: Product[] = [];
    const updatedProducts = products.map(p => {
      const soldItem = targetTxn.items.find(item => item.productId === p.id);
      if (soldItem) {
        const changed = { ...p, stock: p.stock + soldItem.quantity };
        changedProducts.push(changed);
        return changed;
      }
      return p;
    });

    setProducts(updatedProducts);
    
    // Sync inventory restorations to Supabase
    for (const cp of changedProducts) {
      await syncSave<Product>('products', 'duo_pos_products', updatedProducts, cp);
    }

    // 2. Erase transaction from audit log
    const updatedTxns = transactions.filter(t => t.id !== txnId);
    setTransactions(updatedTxns);
    
    await syncDelete('transactions', 'duo_pos_transactions', updatedTxns, txnId);

    // 2b. Adjust active shift sales values if cash (delegated to useShifts hook)
    if (activeShift) {
      updateShiftAfterRefund(targetTxn.total, targetTxn.paymentMethod === 'cash');
    }

    // 3. Subtract XP (or give warning feedback)
    if (user) {
      const updatedUser: User = {
        ...user,
        xp: Math.max(0, user.xp - 10), // Small deduction for backing out
        weeklyXp: Math.max(0, (user.weeklyXp ?? 0) - 10)
      };
      saveUser(updatedUser);
    }
    toast.warning(`Transacción #${txnId.slice(0, 8).toUpperCase()} reembolsada con éxito. Stock devuelto a inventario.`, { title: 'Reembolso de Ticket ⚠️' });
  };


  // Shift control operations (delegated to useShifts hook)
  const handleOpenShift = (initialCash: number) => {
    if (!user) return;
    openShift(initialCash, user.id, user.username, handleGrantXp);
  };

  const handleCloseShift = (actualCash: number, expectedCash: number, difference: number, notes: string) => {
    closeShift(actualCash, expectedCash, difference, notes, handleGrantXp);
  };

  const handleAddShiftMovement = (type: 'in' | 'out', amount: number, reason: string) => {
    addShiftMovement(type, amount, reason);
  };

  // Simulating Install Completion Handlers
  const handleSimulateInstallSuccess = () => {
    setIsSimInstalled(true);
    setShowInstallBanner(false);
    localStorage.setItem('duo_pos_sim_installed', 'true');
  };

  const handleLogout = () => logoutUser();

  if (showLanding) {
    return (
      <LandingPage
        onEnterApp={() => {
          setShowLanding(false);
        }}
        onEnterAsAdmin={() => {
          const adminUser: User = {
            id: 'user-admin',
            username: 'Administrador Duo',
            email: 'admin@duopos.com',
            avatar: 'duo',
            streak: 5,
            lastSaleDate: new Date().toISOString().split('T')[0],
            xp: 380,
            level: 3,
            dailyGoal: 150,
            levelTitle: 'Supervisor de Rachas 🥈',
            role: 'admin',
            gems: 400,
            gemsEarnedTotal: 400,
            unlockedSkins: ['skin-standard', 'skin-dark-galaxy', 'skin-neon-cyberpunk'],
            activeSkin: 'standard',
            unlockedBadges: [],
            completedMissionsToday: [],
            seasonXp: 0,
            seasonRewardsClaimed: []
          };
          loginUser(adminUser);
          toast.success("¡Ingresaste con la cuenta maestra de Administrador! 🦉🎉", { title: "Duo Club Maestre" });
        }}
      />
    );
  }

  if (isClockTampered || isLicenseExpired) {
    return <LicenseBlockScreen />;
  }

  if (!user) {
    return <LoginScreen onLoginSuccess={(u) => {
      loginUser(u);
    }} />;
  }

  const activeChar = DUO_CHARACTERS[user.avatar] || DUO_CHARACTERS.duo;

  const getSkinThemeClasses = () => {
    const activeSkin = user?.activeSkin || 'standard';
    switch (activeSkin) {
      case 'dark-galaxy':
        return {
          outer: "bg-slate-950 text-slate-100 selection:bg-purple-600 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950 via-slate-950 to-slate-950",
          card: "bg-indigo-950/20 border-violet-950/60 shadow-[0_0_15px_rgba(110,68,255,0.06)] backdrop-blur-xs text-slate-100",
          sidebarActive: "bg-indigo-950/40 border-violet-500 border-2 border-b-4 text-violet-400 font-extrabold shadow-[0_0_12px_rgba(139,92,246,0.2)]",
          accentText: "text-violet-450",
          logoText: "text-violet-400"
        };
      case 'neon-cyberpunk':
        return {
          outer: "bg-[#09090b] text-cyan-400 selection:bg-pink-500 font-mono",
          card: "bg-black border-pink-500/30 shadow-[0_0_20px_rgba(244,63,94,0.12)] text-cyan-300",
          sidebarActive: "bg-zinc-900/50 border-cyan-400 border-2 border-b-4 text-cyan-405 uppercase font-black shadow-[0_0_10px_rgba(34,211,238,0.25)]",
          accentText: "text-pink-550",
          logoText: "text-cyan-450 font-black"
        };
      case 'emerald-palace':
        return {
          outer: "bg-[#0b2417] text-amber-100 selection:bg-yellow-500 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-[#072517] via-[#0c311e] to-[#01140a]",
          card: "bg-[#113924] border-yellow-600/40 shadow-[0_0_15px_rgba(234,179,8,0.08)] text-amber-50",
          sidebarActive: "bg-[#0c311e]/80 border-yellow-500 border-2 border-b-4 text-yellow-550 font-bold shadow-[0_0_10px_rgba(234,179,8,0.15)]",
          accentText: "text-yellow-500",
          logoText: "text-yellow-600 font-black"
        };
      case 'bubblegum-cute':
        return {
          outer: "bg-pink-50/50 text-pink-900 selection:bg-pink-300",
          card: "bg-white border-pink-100 shadow-[0_4px_16px_rgba(244,63,145,0.04)] text-pink-900",
          sidebarActive: "bg-pink-50 border-[#ff4b93] border-2 border-b-4 text-[#ff4b93] font-black shadow-[0_2px_8px_rgba(255,75,147,0.15)]",
          accentText: "text-[#ff4b93]",
          logoText: "text-[#ff4b93] font-extrabold"
        };
      case 'retro-8bit':
        return {
          outer: "bg-stone-900 text-stone-200 selection:bg-amber-600 font-mono",
          card: "bg-stone-800 border-stone-700 text-stone-200",
          sidebarActive: "bg-stone-850 border-amber-500 border-2 border-b-4 text-amber-500 font-bold shadow-[0_0_10px_rgba(245,158,11,0.15)]",
          accentText: "text-amber-500",
          logoText: "text-amber-500 font-bold uppercase"
        };
      case 'executive-gold':
        return {
          outer: "bg-[#0a0a0a] text-yellow-500/90 selection:bg-yellow-600 font-sans",
          card: "bg-[#151515] border-yellow-600/30 text-yellow-500",
          sidebarActive: "bg-[#1a1a1a] border-[#ffd700] border-2 border-b-4 text-[#ffd700] font-black shadow-[0_0_15px_rgba(255,215,0,0.15)]",
          accentText: "text-[#ffd700]",
          logoText: "text-[#ffd700] font-black uppercase"
        };
      case 'deep-ocean':
        return {
          outer: "bg-[#072a40] text-sky-150 selection:bg-sky-600",
          card: "bg-[#0f172a] border-sky-950 text-sky-50 shadow-[0_0_15px_rgba(56,189,248,0.06)]",
          sidebarActive: "bg-[#0f172a] border-sky-450 border-2 border-b-4 text-sky-400 font-black shadow-[0_0_12px_rgba(56,189,248,0.2)]",
          accentText: "text-sky-400",
          logoText: "text-sky-400 font-extrabold"
        };
      case 'standard':
      default:
        return {
          outer: "bg-[#f7f7f7] text-[#3c3c3c] selection:bg-[#d2f09d]",
          card: "bg-white border-[#e5e5e5] text-[#3c3c3c]",
          sidebarActive: "bg-[#e5e5e5]/10 border-[#1cb0f6] border-2 border-b-4 text-[#1cb0f6]",
          accentText: "text-[#58cc02]",
          logoText: "text-[#58cc02]"
        };
    }
  };

  const themeClasses = getSkinThemeClasses();

  return (
    <div className={`min-h-screen font-sans flex flex-col relative antialiased transition-all duration-300 theme-${user?.activeSkin || 'standard'} ${themeClasses.outer}`}>

      {/* Clerk Session Syncer (Condicional) */}
      {!!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY && (
        <ClerkSessionSync onSyncUser={setUser} />
      )}

      {/* 1. TOP DISMISSIBLE PWA MARKETING BANNER */}
      {showInstallBanner && !isSimInstalled && (
        <div className="bg-[#58cc02] text-white py-2.5 px-4 text-xs md:text-sm font-black text-center relative z-40 flex items-center justify-center gap-2 border-b-4 border-[#46a302] shadow-md animate-slideDown">
          <span className="animate-bounce">📲</span>
          <span>¡Accede más rápido! Instala <strong>DuoPOS</strong> en tu PC o móvil para ver el layout nativo flotante.</span>
          <button
            onClick={() => setIsInstallModalOpen(true)}
            className="bg-white text-[#58cc02] font-black text-[10px] md:text-xs py-1 px-3.5 rounded-xl border border-[#dddddd] border-b-2 hover:bg-gray-50 active:translate-y-0.5 max-w-xs mx-1 cursor-pointer"
          >
            Instalar (+55 XP)
          </button>
          <button
            onClick={() => setShowInstallBanner(false)}
            className="absolute right-3 top-2.5 font-bold opacity-75 hover:opacity-100"
            title="Cerrar banner publicitario"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main app body: left sidebar + main display */}
      <div className="flex-1 flex flex-col md:flex-row max-w-[1440px] w-full mx-auto md:px-4 lg:px-8 mt-4">
        
        {/* 2. RESPONSIVE SIDEBAR: Shows on larger displays (MD+) */}
        <aside className="hidden md:flex flex-col justify-between w-64 p-4 pr-6 shrink-0 h-[calc(100vh-60px)] sticky top-4">
          
          <div className="space-y-8">
            
            {/* StockMaster Pro logo header */}
            <div className="flex items-center gap-2 px-2 cursor-pointer transform hover:scale-102 transition-transform duration-100">
              <div className="relative flex items-center gap-1.5 shrink-0">
                {user.avatar === 'duo' ? (
                  <>
                    <ShieldCrest level={user.level} size={36} animate={true} />
                    <AeroMascot size={36} activeAccessory={user.activeAccessory} mood={duoMood as any} level={user.level} showSparkles={duoSparkles} />
                  </>
                ) : (
                  <span className="text-4xl filter drop-shadow-sm select-none">{activeChar.avatar}</span>
                )}
              </div>
              <div>
                <h1 className={`text-2xl font-black tracking-wider leading-none ${themeClasses.logoText}`}>
                  Stock<span className={user?.activeSkin === 'standard' ? 'text-[#3c3c3c]' : 'text-inherit opacity-85'}>Master</span>
                </h1>
                <span className="text-[9px] tracking-widest uppercase font-black text-gray-400">Pro - Gamificado</span>
              </div>
            </div>

            {/* Sidebar nav selections */}
            <nav className="space-y-2">
              {[
                { id: 'dashboard', label: 'Inicio', icon: <Home size={20} strokeWidth={2.5} />, roles: ['admin', 'supervisor', 'cashier'], name: 'Tablero' },
                { id: 'sales', label: 'Vender', icon: <ShoppingBag size={20} strokeWidth={2.5} />, roles: ['admin', 'supervisor', 'cashier'], name: 'Ventas' },
                { id: 'gamification', label: 'Master Club 🏆', icon: <Trophy size={20} strokeWidth={2.5} />, roles: ['admin', 'supervisor', 'cashier'], name: 'Gamificación' },
                { id: 'shifts', label: 'Caja y Turnos', icon: <Wallet size={20} strokeWidth={2.5} />, roles: ['admin', 'supervisor', 'cashier'], name: 'Turnos' },
                { id: 'customers', label: 'Clientes', icon: <Users size={20} strokeWidth={2.5} />, roles: ['admin', 'supervisor', 'cashier'], name: 'Clientes' },
                { id: 'inventory', label: 'Catalogos', icon: <Package size={20} strokeWidth={2.5} />, roles: ['admin', 'supervisor'], name: 'Catálogos' },
                { id: 'logistics', label: 'Sucursales & CEDIS 🌐', icon: <Globe size={20} strokeWidth={2.5} />, roles: ['admin', 'supervisor'], name: 'Logística' },
                { id: 'history', label: 'Historial', icon: <History size={20} strokeWidth={2.5} />, roles: ['admin', 'supervisor', 'cashier'], name: 'Historial' },
                { id: 'settings', label: 'Ajustes', icon: <Settings size={20} strokeWidth={2.5} />, roles: ['admin'], name: 'Configuración' }
              ].map(tab => {
                const currentUserRole = user.role || 'cashier';
                const hasAccess = tab.roles.includes(currentUserRole);
                const isSelected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => { 
                      if (hasAccess) {
                        if (tab.id === 'logistics' && licenseDetails.tier === 'free') {
                          playSound('error');
                          toast.error('La sección de "Sucursales & CEDIS" requiere el Plan Standard o superior. Actualiza tu plan en Ajustes > Planes y Suscripción.', { title: 'Acceso Restringido — Plan Gratuito 🔒', duration: 7000 });
                          return;
                        }
                        setActiveTab(tab.id as any); 
                        playSound('click'); 
                      } else {
                        playSound('error');
                        setRoleLockWarning({
                          requiredRole: tab.roles.join(' o '),
                          activeRole: currentUserRole,
                          tabName: tab.name
                        });
                      }
                    }}
                    className={`w-full text-left py-3 px-4 rounded-2xl font-black text-sm uppercase tracking-wider transition-all border-b-4 flex items-center justify-between gap-1.5 cursor-pointer ${
                      isSelected
                        ? themeClasses.sidebarActive
                        : !hasAccess
                          ? 'border-transparent text-gray-300 hover:text-gray-400 bg-gray-50/50 cursor-not-allowed'
                          : 'border-transparent text-gray-500 hover:bg-gray-100/30 hover:text-gray-700 active:translate-y-1'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {tab.icon}
                      <span>{tab.label}</span>
                    </div>
                    {!hasAccess && <span className="text-gray-400">🔒</span>}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Sidebar drawer footer controls */}
          <div className="space-y-3">
            {!isSimInstalled && (
              <button
                onClick={() => setIsInstallModalOpen(true)}
                className="w-full bg-[#ff9600] text-white border-b-4 border-[#df7e00] hover:bg-[#ffa726] active:border-b-0 active:translate-y-[4px] font-black text-xs py-3 rounded-2xl tracking-wide flex items-center justify-center gap-1.5 cursor-pointer uppercase"
              >
                <Download size={14} /> Instalar en PC/Teléfono
              </button>
            )}

            {isSupabaseConfigured() && (
              <button
                onClick={() => { playSound('click'); syncStateFromSupabase(); }}
                disabled={isSyncing}
                className={`w-full text-white border-b-4 font-black text-xs py-2.5 rounded-2xl tracking-wide flex items-center justify-center gap-1.5 cursor-pointer uppercase ${
                  isSyncing
                    ? 'bg-[#1cb0f6]/70 border-[#1cb0f6]/50 cursor-wait'
                    : 'bg-[#1cb0f6] border-[#1890d4] hover:bg-[#42c4ff] active:border-b-0 active:translate-y-[4px]'
                }`}
                title={lastSyncTime ? `Última sincronización: ${lastSyncTime}` : 'Sincronizar datos con la nube'}
              >
                <Cloud size={14} /> {isSyncing ? 'Sincronizando...' : 'Sincronizar Datos'}
              </button>
            )}

            <button
              onClick={() => { playSound('click'); setShowLanding(true); }}
              className="w-full bg-white text-[#58cc02] border-2 border-green-200 border-b-4 hover:bg-green-50 active:translate-y-[2px] active:border-b-2 font-black text-xs py-2.5 rounded-2xl transition-all flex items-center justify-center gap-1.5 cursor-pointer uppercase flex-shrink-0"
            >
              📖 Guía y Servicios
            </button>

            <button
              onClick={handleLogout}
              className="w-full bg-white text-gray-500 border-2 border-gray-200 border-b-4 hover:bg-red-50 hover:text-red-500 hover:border-red-200 active:translate-y-[2px] active:border-b-2 font-black text-xs py-2.5 rounded-2xl transition-all flex items-center justify-center gap-1.5 cursor-pointer uppercase"
            >
              <LogOut size={14} /> Cerrar Caja
            </button>

            <div className="text-center font-black text-[9px] text-gray-400">
              DuoPOS {appVersion} • {licenseDetails.tier === 'free' ? 'Plan Gratuito' : PLANS[licenseDetails.tier]?.name || 'Licencia Registrada'}
            </div>
          </div>

        </aside>

        {/* 3. CORE DISPLAY WORKPLACE PANEL ROUTER */}
        <main className="flex-1 px-4 md:px-0 md:pl-4 overflow-y-auto min-h-screen">
          
          {/* TOP QUICK STAT BAR (For PC and Mobile headers) */}
          <div className="bg-white border-2 border-[#e5e5e5] border-b-4 rounded-2xl p-2.5 sm:p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 md:mb-6 mt-1 md:mt-0 shadow-xs">
            {/* Left side: Stats & Clock */}
            <div className="flex items-center justify-between w-full md:w-auto gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-red-500 fill-red-500 font-extrabold flex items-center gap-1 bg-red-50 border border-red-100 px-2 py-1 rounded-xl text-xs md:text-sm shadow-xs select-none">
                  <Flame size={14} fill="currentColor" className="flex-shrink-0 animate-pulse text-red-500" /> {user.streak} días racha
                </span>
                <span className="text-[#58cc02] font-extrabold flex items-center gap-1 bg-green-50 border border-green-100 px-2 py-1 rounded-xl text-xs md:text-sm shadow-xs select-none">
                  👑 Nivel {user.level}
                </span>
              </div>

              {/* Venezuelan Exchange Rate Monitor */}
              <div className="flex items-center gap-1 bg-amber-50 border border-amber-100/70 p-1 rounded-xl select-none text-[10.5px] sm:text-xs">
                <span className="font-extrabold text-[#df7e00] px-1 pl-1.5 flex items-center gap-0.5" title="Tasas disponibles en tiempo real (ve.dolarapi.com)">
                  🇻🇪 Tasa:
                </span>
                <button
                  type="button"
                  onClick={() => handleToggleRateType('oficial')}
                  className={`p-1 px-1.5 sm:px-2 rounded-lg font-black transition-all ${
                    activeRateType === 'oficial' 
                      ? 'bg-[#ff9600] text-white shadow-xs' 
                      : 'text-[#df7e00] hover:bg-[#ff9600]/10'
                  }`}
                  title="Usar Tasa Oficial BCV"
                >
                  BCV: {exchangeRates.oficial.toFixed(2)}
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleRateType('paralelo')}
                  className={`p-1 px-1.5 sm:px-2 rounded-lg font-black transition-all ${
                    activeRateType === 'paralelo' 
                      ? 'bg-[#1cb0f6] text-white shadow-xs' 
                      : 'text-[#1cb0f6] hover:bg-[#1cb0f6]/10'
                  }`}
                  title="Usar Tasa Paralelo"
                >
                  Para: {exchangeRates.paralelo.toFixed(2)}
                </button>
                <button
                  type="button"
                  onClick={() => { playSound('click'); refetchRates(); }}
                  disabled={isRefreshingRates}
                  className={`p-1 text-gray-400 hover:text-gray-600 rounded transition-all ${isRefreshingRates ? 'animate-spin' : ''}`}
                  title="Actualizar tasas"
                >
                  🔄
                </button>
                {isSupabaseConfigured() && (
                  <button
                    type="button"
                    onClick={() => { playSound('click'); syncStateFromSupabase(); }}
                    disabled={isSyncing}
                    className={`p-1 rounded transition-all ${isSyncing ? 'animate-spin text-[#1cb0f6]' : 'text-gray-400 hover:text-[#1cb0f6]'}`}
                    title={`Sincronizar datos con la nube${lastSyncTime ? ` (última: ${lastSyncTime})` : ''}`}
                  >
                    <Cloud size={14} />
                  </button>
                )}
              </div>

              {/* Simulated Live UTC Clock */}
              <div className="text-[10.5px] sm:text-xs font-mono font-black text-gray-400 bg-slate-50 px-2 py-1 rounded-lg border border-gray-150 md:border-transparent md:bg-transparent md:p-0">
                UTC: {new Date().toISOString().split('T')[1].slice(0, 5)}
              </div>
            </div>

            {/* Right side: Roles selector & Quick Toggles */}
            <div className="flex items-center justify-between md:justify-end w-full md:w-auto gap-2 border-t border-gray-100 pt-2 md:border-t-0 md:pt-0">
              <div className="flex items-center gap-1.5 flex-1 md:flex-none">
                <span className="hidden lg:inline-block text-xs font-black text-gray-750 bg-gray-50 border border-gray-100 p-1.5 rounded-xl select-none max-w-[120px] truncate">
                  👤 {user.username}
                </span>
                <div className="relative flex-1 md:flex-none">
                  <select
                    value={user.role || 'cashier'}
                    onChange={(e) => {
                      const nextRole = e.target.value as any;
                      const updatedUser = { ...user, role: nextRole };
                      setUser(updatedUser);
                      localStorage.setItem('duo_pos_active_user', JSON.stringify(updatedUser));
                      
                      // Update user in users list in localStorage too
                      const savedUsersRaw = localStorage.getItem('duo_pos_users');
                      if (savedUsersRaw) {
                        try {
                          const users = JSON.parse(savedUsersRaw);
                          const idx = users.findIndex((u: any) => u.username.toLowerCase() === user.username.toLowerCase());
                          if (idx !== -1) {
                            users[idx].role = nextRole;
                            localStorage.setItem('duo_pos_users', JSON.stringify(users));
                          }
                        } catch (err) {
                          console.error(err);
                        }
                      }
                      playSound('levelup');
                    }}
                    className="w-full text-xs font-black text-gray-750 bg-gray-50 border-2 border-gray-200 p-1 px-1.5 py-1.5 rounded-xl outline-none focus:border-[#1cb0f6] transition-all cursor-pointer select-none"
                  >
                    {isDev && <option value="admin">👑 Admin</option>}
                    <option value="supervisor">⚡ Supervisor</option>
                    <option value="cashier">💵 Cajero</option>
                  </select>
                </div>
              </div>
              
              <div className="flex items-center gap-1.5 animate-fadeIn">
                <button
                  type="button"
                  onClick={() => { setIsHardwareHubOpen(true); playSound('click'); }}
                  className="p-1 px-2 border border-sky-200 text-[#1cb0f6] bg-sky-50 hover:bg-sky-100 rounded-xl flex items-center justify-center transition-all cursor-pointer gap-1 text-[10px] sm:text-xs font-black uppercase"
                  title="Panel de Control IoT y Drivers de Periféricos"
                >
                  <Cpu size={12} className="animate-pulse text-sky-400" />
                  <span className="text-[10px]">Bus IoT 🔌</span>
                </button>

                <button
                  type="button"
                  onClick={toggleMute}
                  className={`p-1.5 border rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                    isMuted 
                      ? 'border-red-200 text-red-500 bg-red-50 hover:bg-red-100' 
                      : 'border-green-200 text-green-600 bg-green-50 hover:bg-green-100'
                  }`}
                  title={isMuted ? "Sonidos Silenciados - Clic para Activar" : "Sonidos Activados - Clic para Silenciar"}
                >
                  {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                </button>
              </div>
            </div>
          </div>

          {/* DYNAMIC EXPRESS EVENT ALERT BANNER */}
          {activeEvent && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 border-b-8 rounded-3xl p-4.5 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm animate-bounce" style={{ animationDuration: '4s' }}>
              <div className="flex items-center gap-4.5 w-full sm:w-auto">
                <div className="bg-amber-100 dark:bg-amber-950 p-3 h-14 w-14 rounded-2xl flex items-center justify-center text-3xl shadow-sm animate-pulse flex-shrink-0">
                  {activeEvent.type === 'happy_hour' ? '⚡' : activeEvent.type === 'scan_challenge' ? '🔍' : '🤝'}
                </div>
                <div className="text-left space-y-1">
                  <span className="bg-amber-200 text-amber-950 text-[10px] uppercase font-black px-2 py-0.5 rounded-lg border-b border-amber-300">
                    Reto Express Activo ⏰
                  </span>
                  <h4 className="text-lg font-black tracking-tight text-gray-800">
                    {activeEvent.title}
                  </h4>
                  <p className="text-xs text-gray-500 font-extrabold leading-relaxed max-w-lg">
                    {activeEvent.description}
                  </p>
                  
                  {/* Progress Tracker for challenges */}
                  {activeEvent.targetCount > 0 && (
                    <div className="flex items-center gap-2 pt-1 w-full">
                      <div className="w-40 bg-gray-200 h-2.5 rounded-full overflow-hidden border border-gray-300">
                        <div 
                          className="bg-amber-500 h-full transition-all duration-300"
                          style={{ width: `${(activeEvent.currentCount / activeEvent.targetCount) * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-black text-amber-700">
                        Progreso: {activeEvent.currentCount} / {activeEvent.targetCount}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-4.5 w-full sm:w-auto justify-end">
                {/* Timer Clock */}
                <div className="bg-amber-100 border-2 border-amber-200 rounded-2xl p-2 px-3.5 flex items-center gap-2 shadow-xs">
                  <span className="text-xl font-black text-amber-600 font-mono tracking-tight animate-pulse">
                    {Math.floor(activeEvent.remainingSeconds / 60)}:{(activeEvent.remainingSeconds % 60).toString().padStart(2, '0')}
                  </span>
                </div>
                
                {/* Dismiss button */}
                <button
                  type="button"
                  onClick={() => { playSound('click'); setActiveEvent(null); }}
                  className="p-1 px-2 border-2 border-amber-200 text-amber-600 bg-white hover:bg-amber-50 font-black text-xs uppercase py-1.5 rounded-xl transition-all cursor-pointer"
                >
                  Omitir
                </button>
              </div>
            </div>
          )}

          {/* Active Screen Selection Switcher router */}
          <ErrorBoundary>
          <Routes>
            <Route path="/" element={
              <DashboardScreen
                user={user}
                transactions={transactions}
                products={products}
                onSetNewGoal={(val) => {
                  const refreshed = { ...user, dailyGoal: val };
                  saveUser(refreshed);
                }}
                onNavigateToSell={() => setActiveTab('sales')}
                onGrantXp={handleGrantXp}
                onUpdateUser={saveUser}
              />
            } />

            <Route path="/sales" element={
              <SalesScreen
                products={products.map(p => ({ ...p, stock: p.branchesStock?.[activeBranchId] ?? p.stock }))}
                user={user}
                onGrantXp={handleGrantXp}
                onAddTransaction={handleAddTransaction}
                onDecreaseStock={handleDecreaseStock}
                activeShift={activeShift}
                shiftHistory={shiftHistory}
                onOpenShift={handleOpenShift}
                onCloseShift={handleCloseShift}
                onAddShiftMovement={handleAddShiftMovement}
                customers={customers}
                billingSettings={billingSettings}
                hardwareSettings={hardwareSettings}
                onOpenHardwareSettings={() => setIsHardwareHubOpen(true)}
                onUpdateCustomer={handleUpdateCustomer}
                exchangeRate={exchangeRates[activeRateType]}
                activeRateType={activeRateType}
                exchangeRates={exchangeRates}
                activeEvent={activeEvent}
                onTriggerEventProgress={handleTriggerEventProgress}
              />
            } />

            <Route path="/customers" element={
              <CustomersScreen
                customers={customers}
                onAddCustomer={handleAddCustomer}
                onUpdateCustomer={handleUpdateCustomer}
                onDeleteCustomer={handleDeleteCustomer}
                onGrantXp={handleGrantXp}
                activeShift={activeShift}
                onAddShiftMovement={handleAddShiftMovement}
              />
            } />

            <Route path="/inventory" element={
              <InventoryScreen
                products={products.map(p => ({ ...p, stock: p.branchesStock?.[activeBranchId] ?? p.stock }))}
                onAddProduct={handleAddProduct}
                onUpdateProduct={handleUpdateProduct}
                onDeleteProduct={handleDeleteProduct}
                onGrantXp={handleGrantXp}
                activeShift={activeShift}
                onAddShiftMovement={handleAddShiftMovement}
                currentUser={user}
                suppliers={suppliers}
                purchaseOrders={purchaseOrders}
                onAddSupplier={handleAddSupplier}
                onUpdateSupplier={handleUpdateSupplier}
                onDeleteSupplier={handleDeleteSupplier}
                onSavePurchaseOrder={handleSavePurchaseOrder}
                onTransitPurchaseOrder={handleTransitPurchaseOrder}
                onReceivePurchaseOrder={handleReceivePurchaseOrder}
                onCancelPurchaseOrder={handleCancelPurchaseOrder}
                onRegisterSupplierPayout={handleRegisterSupplierPayout}
              />
            } />

            <Route path="/history" element={
              <HistoryScreen
                transactions={transactions}
                onRefundTransaction={handleRefundTransaction}
                currentUser={user}
                billingSettings={billingSettings}
              />
            } />

            <Route path="/settings" element={
              <SettingsScreen
                settings={billingSettings}
                onSaveSettings={handleSaveBillingSettings}
                onGrantXp={handleGrantXp}
                licenseDetails={licenseDetails}
                onActivateLicenseKey={handleActivateLicenseKey}
                onResetLicenseToFree={handleResetLicenseToFree}
                appVersion={appVersion}
                onUpdateAppVersion={handleUpdateAppVersion}
                user={user}
              />
            } />

            <Route path="/gamification" element={
              <GamificationScreen
                user={user}
                onUpdateUser={saveUser}
                transactions={transactions}
                products={products}
                customers={customers}
                licenseDetails={licenseDetails}
                activeEvent={activeEvent}
                onTriggerExpressEvent={handleTriggerExpressEvent}
              />
            } />

            <Route path="/shifts" element={
              <ShiftsScreen
                user={user}
                transactions={transactions}
                activeShift={activeShift}
                shiftHistory={shiftHistory}
                onOpenShift={handleOpenShift}
                onCloseShift={handleCloseShift}
                onAddShiftMovement={handleAddShiftMovement}
                onGrantXp={handleGrantXp}
              />
            } />

            <Route path="/logistics" element={
              <LogisticsScreen
                products={products}
                onUpdateProduct={handleUpdateProduct}
                transactions={transactions}
                activeShift={activeShift}
                shiftHistory={shiftHistory}
                onGrantXp={handleGrantXp}
                branches={branches}
                setBranches={setBranches}
                activeBranchId={activeBranchId}
                setActiveBranchId={setActiveBranchId}
                registers={registers}
                setRegisters={setRegisters}
                activeRegisterId={activeRegisterId}
                setActiveRegisterId={setActiveRegisterId}
                stockTransfers={stockTransfers}
                setStockTransfers={setStockTransfers}
                currentUser={user}
                licenseDetails={licenseDetails}
              />
            } />
          </Routes>
          </ErrorBoundary>

        </main>

      </div>

      {/* 4. PERSISTENT BOTTOM NAVIGATION TAB BAR: ONLY Shows on mobile (under MD) */}
      <footer 
        className="md:hidden sticky bottom-0 z-40 bg-white border-t-2 border-gray-200 p-2 pb-3.5 flex items-center justify-start overflow-x-auto scrollbar-none gap-2 snap-x"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {[
          { id: 'dashboard', label: 'Inicio', icon: <Home size={18} strokeWidth={2.5} />, roles: ['admin', 'supervisor', 'cashier'], name: 'Tablero' },
          { id: 'sales', label: 'Vender', icon: <ShoppingBag size={18} strokeWidth={2.5} />, roles: ['admin', 'supervisor', 'cashier'], name: 'Ventas' },
          { id: 'gamification', label: 'Club Duo', icon: <Trophy size={18} strokeWidth={2.5} />, roles: ['admin', 'supervisor', 'cashier'], name: 'Gamificación' },
          { id: 'shifts', label: 'Caja', icon: <Wallet size={18} strokeWidth={2.5} />, roles: ['admin', 'supervisor', 'cashier'], name: 'Turnos' },
          { id: 'customers', label: 'Clientes', icon: <Users size={18} strokeWidth={2.5} />, roles: ['admin', 'supervisor', 'cashier'], name: 'Clientes' },
          { id: 'inventory', label: 'Almacén', icon: <Package size={18} strokeWidth={2.5} />, roles: ['admin', 'supervisor'], name: 'Catálogos' },
          { id: 'logistics', label: 'Sucursal', icon: <Globe size={18} strokeWidth={2.5} />, roles: ['admin', 'supervisor'], name: 'Logística' },
          { id: 'history', label: 'Historial', icon: <History size={18} strokeWidth={2.5} />, roles: ['admin', 'supervisor', 'cashier'], name: 'Historial' },
          { id: 'settings', label: 'Ajustes', icon: <Settings size={18} strokeWidth={2.5} />, roles: ['admin'], name: 'Configuración' }
        ].map(tab => {
          const currentUserRole = user.role || 'cashier';
          const hasAccess = tab.roles.includes(currentUserRole);
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { 
                if (hasAccess) {
                  if (tab.id === 'logistics' && licenseDetails.tier === 'free') {
                    playSound('error');
                    toast.error('La sección de "Sucursales" requiere el Plan Standard o superior. Actualiza en Ajustes > Planes.', { title: 'Acceso Restringido — Plan Gratuito 🔒', duration: 7000 });
                    return;
                  }
                  setActiveTab(tab.id as any); 
                  playSound('click'); 
                } else {
                  playSound('error');
                  setRoleLockWarning({
                    requiredRole: tab.roles.join(' o '),
                    activeRole: currentUserRole,
                    tabName: tab.name
                  });
                }
              }}
              className="flex-shrink-0 w-[64px] flex flex-col items-center justify-center text-center cursor-pointer select-none snap-center"
            >
              <div className={`p-1.5 rounded-xl transition-colors relative ${
                isSelected ? 'text-[#1cb0f6] bg-[#1cb0f6]/5 font-black scale-102 font-bold' : 'text-gray-400'
              }`}>
                {tab.icon}
                {!hasAccess && (
                  <span className="absolute -top-1 -right-1 bg-gray-100 text-gray-400 font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center text-[7px] border border-white">🔒</span>
                )}
              </div>
              <span className={`text-[8.5px] font-extrabold uppercase mt-1 tracking-wider truncate w-full ${
                isSelected ? 'text-[#1cb0f6]' : 'text-gray-400'
              }`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </footer>

      {/* 5. SIMULATED GENERAL PWA INSTALL INSTRUCTION DRAW OVERLAY */}
      {isInstallModalOpen && (
        <InstallModal
          onClose={() => setIsInstallModalOpen(false)}
          onGrantXp={handleGrantXp}
          isSimulatedInstalled={isSimInstalled}
          onSimulateInstallSuccess={handleSimulateInstallSuccess}
          deferredPrompt={deferredPrompt}
          setDeferredPrompt={setDeferredPrompt}
        />
      )}

      {/* 6. SPECTACULAR GENERAL LEVEL UP CELEBRATE MODAL */}
      <LevelUpCelebrateModal />

      {/* RBAC Role Restriction Warnings Modal */}
      <RoleLockWarningModal setActiveTab={setActiveTab} />

      {isHardwareHubOpen && (
        <HardwareHubModal
          settings={hardwareSettings}
          onSaveSettings={handleSaveHardwareSettings}
          onClose={() => setIsHardwareHubOpen(false)}
        />
      )}

      <FlashNotifications />
    </div>
  );
}
