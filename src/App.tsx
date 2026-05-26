/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, Product, Transaction, CashShift, CashMovement, Customer, LegalBillingSettings, Branch, CashRegister, StockTransfer, Supplier, PurchaseOrder } from './types';
import { DEFAULT_PRODUCTS, DUO_CHARACTERS, DEFAULT_CUSTOMERS, DEFAULT_BILLING_SETTINGS } from './initialData';
import LoginScreen from './components/LoginScreen';
import LandingPage from './components/LandingPage';
import { supabase, isSupabaseConfigured } from './utils/supabaseClient';
import { syncLoad, syncSave, syncInsert, syncDelete, flushPendingQueue, generateUUID, syncInsertTransaction, syncSaveShift, syncSaveStockTransfer, syncSavePurchaseOrder } from './utils/supabaseSync';

import DashboardScreen from './components/DashboardScreen';
import SalesScreen from './components/SalesScreen';
import InventoryScreen from './components/InventoryScreen';
import HistoryScreen from './components/HistoryScreen';
import CustomersScreen from './components/CustomersScreen';
import SettingsScreen from './components/SettingsScreen';
import ShiftsScreen from './components/ShiftsScreen';
import LogisticsScreen from './components/LogisticsScreen';
import InstallModal from './components/InstallModal';
import GamificationScreen from './components/GamificationScreen';
import { Home, ShoppingBag, Package, History, LogOut, Download, Flame, Award, Smartphone, Laptop, Sparkles, Volume2, VolumeX, Users, Settings, Wallet, Globe, Cpu, Trophy, RefreshCw, Cloud } from 'lucide-react';
import { playSound } from './utils/sounds';
import { HardwareDeviceSettings, DEFAULT_HARDWARE_SETTINGS } from './utils/hardware';
import HardwareHubModal from './components/HardwareHubModal';
import { FlashNotifications, toast } from './components/FlashNotifications';
import { LicenseDetails, validateLicenseKeyOnline, generateHardwareFingerprint, PLANS } from './utils/licensing';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [showLanding, setShowLanding] = useState<boolean>(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'sales' | 'shifts' | 'inventory' | 'history' | 'customers' | 'settings' | 'logistics' | 'gamification'>('dashboard');
  
  // Real-time Venezuelan Exchange rates state (ve.dolarapi.com)
  const [exchangeRates, setExchangeRates] = useState<{ oficial: number; paralelo: number }>(() => {
    try {
      const saved = localStorage.getItem('duo_pos_exchange_rates');
      return saved ? JSON.parse(saved) : { oficial: 53.05, paralelo: 57.10 };
    } catch {
      return { oficial: 53.05, paralelo: 57.10 };
    }
  });
  
  const [activeRateType, setActiveRateType] = useState<'oficial' | 'paralelo'>(() => {
    return (localStorage.getItem('duo_pos_active_rate_type') as 'oficial' | 'paralelo') || 'oficial';
  });

  const [isRefreshingRates, setIsRefreshingRates] = useState(false);

  const fetchExchangeRates = async () => {
    setIsRefreshingRates(true);
    try {
      const res = await fetch('https://ve.dolarapi.com/v1/dolares');
      if (!res.ok) throw new Error('API response was not ok');
      const data = await res.json();
      if (Array.isArray(data)) {
        const ofi = data.find((d: any) => d.fuente === 'oficial')?.promedio || 53.05;
        const par = data.find((d: any) => d.fuente === 'paralelo')?.promedio || 57.10;
        const newRates = { oficial: ofi, paralelo: par };
        setExchangeRates(newRates);
        localStorage.setItem('duo_pos_exchange_rates', JSON.stringify(newRates));
        toast.success(`Dólar actualizado: BCV ${ofi.toFixed(2)} Bs. | Paralelo ${par.toFixed(2)} Bs.`, { title: 'Tasa Sincronizada 🇻🇪' });
      }
    } catch (err) {
      console.error('Error fetching exchange rates from ve.dolarapi.com:', err);
      toast.error('No se pudo conectar con el monitor de divisas. Usando tasas locales guardadas.', { title: 'Fallo de Red 🌐', duration: 5000 });
    } finally {
      setIsRefreshingRates(false);
    }
  };

  useEffect(() => {
    fetchExchangeRates();
    // Refresh rate every 120 seconds
    const interval = setInterval(fetchExchangeRates, 120000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleRateType = (type: 'oficial' | 'paralelo') => {
    setActiveRateType(type);
    localStorage.setItem('duo_pos_active_rate_type', type);
    playSound('click');
    toast.info(`Precios convertidos usando tazas de tipo: ${type === 'oficial' ? 'BCV Oficial' : 'Paralelo (Monitor)'}`, { title: 'Tasa Alternada 🔄' });
  };
  
  // Hardware status state
  const [hardwareSettings, setHardwareSettings] = useState<HardwareDeviceSettings>(() => {
    try {
      const saved = localStorage.getItem('duo_pos_hardware_settings');
      return saved ? JSON.parse(saved) : DEFAULT_HARDWARE_SETTINGS;
    } catch {
      return DEFAULT_HARDWARE_SETTINGS;
    }
  });
  const [isHardwareHubOpen, setIsHardwareHubOpen] = useState(false);

  const handleSaveHardwareSettings = (settings: HardwareDeviceSettings) => {
    setHardwareSettings(settings);
    localStorage.setItem('duo_pos_hardware_settings', JSON.stringify(settings));
  };
  
  // Multi-Sucursal, Multi-Caja & Almacén Central (CEDIS) State Managers
  const [branches, setBranches] = useState<Branch[]>([]);
  const [activeBranchId, setActiveBranchId] = useState<string>(() => {
    return localStorage.getItem('duo_pos_active_branch_id') || 'branch-centro';
  });
  const [registers, setRegisters] = useState<CashRegister[]>([]);
  const [activeRegisterId, setActiveRegisterId] = useState<string>(() => {
    return localStorage.getItem('duo_pos_active_register_id') || 'reg-centro-1';
  });
  const [stockTransfers, setStockTransfers] = useState<StockTransfer[]>([]);
  const [billingSettings, setBillingSettings] = useState<LegalBillingSettings>({
    taxName: 'IVA',
    generalTaxRate: 16,
    categoryOverrides: [],
    taxIncludedInPrice: true,
    companyName: '',
    companyTaxId: '',
    companyRegime: '',
    companyPostalCode: '',
    companyAddress: '',
    invoicePrefix: 'FAC-',
    nextInvoiceNumber: 1,
    automaticMockInvoicing: false,
    certifyingAuthority: 'SAT Mock'
  });
  
  // Real-time Sound Muted settings state
  const [isMuted, setIsMuted] = useState(() => localStorage.getItem('duo_pos_muted') === 'true');

  // Licensing & Subscription state managers
  const [licenseDetails, setLicenseDetails] = useState<LicenseDetails>(() => {
    try {
      const saved = localStorage.getItem('duo_pos_licensing_details');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Migración automática de tiers antiguos a nuevos
        if (parsed.tier === 'trial') { parsed.tier = 'free'; parsed.clientLimit = PLANS.free.clientLimit; parsed.salesLimit = PLANS.free.salesLimit; }
        if (parsed.tier === 'unlimited_racha' || parsed.tier === 'enterprise_buhoflota') { parsed.tier = 'pro'; parsed.clientLimit = PLANS.pro.clientLimit; parsed.salesLimit = PLANS.pro.salesLimit; }
        localStorage.setItem('duo_pos_licensing_details', JSON.stringify(parsed));
        return parsed;
      }
    } catch (e) {
      console.error('Error loading license details:', e);
    }
    
    // Generate fresh seed if none existed
    let customSeed = localStorage.getItem('duo_pos_offline_seed');
    if (!customSeed) {
      customSeed = generateHardwareFingerprint();
      localStorage.setItem('duo_pos_offline_seed', customSeed);
    }
    
    return {
      tier: 'free',
      activated: false,
      activationKey: '',
      expiresAt: 'Nunca',
      clientLimit: PLANS.free.clientLimit,
      salesLimit: PLANS.free.salesLimit,
      currentSalesCount: 0,
      offlineActivationSeed: customSeed,
      companyName: ''
    };
  });

  // Track sales count matching local storage transactions
  useEffect(() => {
    setLicenseDetails(prev => {
      const updated = { ...prev, currentSalesCount: transactions.length };
      try {
        localStorage.setItem('duo_pos_licensing_details', JSON.stringify(updated));
      } catch (err) {}
      return updated;
    });
  }, [transactions.length]);

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
        expiresAt: 'Nunca',
        clientLimit: plan.clientLimit,
        salesLimit: plan.salesLimit,
        activatedAt: new Date().toISOString(),
        companyName: companyName || ''
      };
      setLicenseDetails(updated);
      try {
        localStorage.setItem('duo_pos_licensing_details', JSON.stringify(updated));
      } catch (err) {}
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
  const [activeShift, setActiveShift] = useState<CashShift | null>(null);
  const [shiftHistory, setShiftHistory] = useState<CashShift[]>([]);

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

  // Supabase Auth State Change Listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        try {
          const { data: userProfile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();

          if (error) {
            console.error('Error fetching profile:', error);
            return;
          }

          let finalProfile = userProfile;

          // Autocorrección/Self-healing: Si el usuario existe en autenticación pero no tiene fila en profiles (por ejemplo, si se registró antes de correr el script SQL)
          if (!finalProfile) {
            console.log('Self-healing: Creando perfil faltante para el usuario autenticado...');
            const defaultProfile = {
              id: session.user.id,
              username: session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'Cajero',
              email: session.user.email || '',
              avatar: 'duo',
              streak: 1,
              xp: 120,
              level: 1,
              daily_goal: 150,
              level_title: 'Cajero Novato 🦉',
              role: session.user.user_metadata?.role || 'cashier',
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
              .single();

            if (insertErr) {
              console.error('Error al autocrear perfil faltante:', insertErr);
            } else {
              finalProfile = newProfile;
            }
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
            setUser(mappedUser);
            setShowLanding(false);
            localStorage.setItem('duo_pos_active_user', JSON.stringify(mappedUser));
          }
        } catch (err) {
          console.error('Unexpected error in auth observer:', err);
        }
      } else {
        // Si estamos offline, no cerrar sesión automáticamente; conservar la sesión local
        if (!navigator.onLine) {
          console.log("🌐 [OFFLINE AUTH] Detectado modo offline. Conservando sesión local de Supabase.");
          return;
        }

        // Si el evento es explícito de salida o si realmente estamos online y la sesión caducó
        if (event === 'SIGNED_OUT' || (event === 'INITIAL_SESSION' && navigator.onLine)) {
          const activeUserRaw = localStorage.getItem('duo_pos_active_user');
          if (activeUserRaw) {
            try {
              const parsed = JSON.parse(activeUserRaw);
              // Conservar usuarios locales (prefix local-) y admin, solo limpiar usuarios de Supabase real
              if (!parsed.id.startsWith('local-') && parsed.id !== 'user-admin') {
                setUser(null);
                setShowLanding(true);
                localStorage.removeItem('duo_pos_active_user');
              }
            } catch {
              setUser(null);
              setShowLanding(true);
              localStorage.removeItem('duo_pos_active_user');
            }
          }
          // Limpiar tokens de sesión Supabase caducados para evitar bucles de evento
          const keysToRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('sb-')) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach(key => localStorage.removeItem(key));
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Level Up celebrate modal state
  const [levelUpAchieved, setLevelUpAchieved] = useState<{ oldLevel: number; newLevel: number; title: string } | null>(null);

  // RBAC Access lock warning modal state
  const [roleLockWarning, setRoleLockWarning] = useState<{ requiredRole: string; activeRole: string; tabName: string } | null>(null);

  // Sync state for multi-device synchronization
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

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
        syncLoad<Product>('products', 'duo_pos_products', []).then(loaded => {
          const augmented = loaded.map(p => {
            if (!p.branchesStock) {
              return { ...p, branchesStock: { 'branch-centro': p.stock, 'branch-central': p.stock * 3 + 40, 'branch-norte': Math.round(p.stock * 0.7) + 5 } };
            }
            return p;
          });
          setProducts(augmented);
          localStorage.setItem('duo_pos_products', JSON.stringify(augmented));
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

  // Local storage initialization
  useEffect(() => {
    // 1. Load active user if logged in
    const activeUserRaw = localStorage.getItem('duo_pos_active_user');
    if (activeUserRaw) {
      try {
        const parsed = JSON.parse(activeUserRaw);
        // Backfill premium gamification attributes
        if (parsed.gems === undefined) parsed.gems = 40;
        if (parsed.gemsEarnedTotal === undefined) parsed.gemsEarnedTotal = 40;
        if (!parsed.unlockedSkins) parsed.unlockedSkins = ['skin-standard'];
        if (!parsed.activeSkin) parsed.activeSkin = 'standard';
        if (!parsed.unlockedBadges) parsed.unlockedBadges = [];
        if (!parsed.completedMissionsToday) parsed.completedMissionsToday = [];
        setUser(parsed);
        setShowLanding(false);
      } catch (e) {
        console.error("Error parsing stored active user", e);
      }
    }

    // 2. Load products (Local-First: Supabase primero, fallback a localStorage)
    const loadProducts = async () => {
      try {
        const loaded = await syncLoad<Product>('products', 'duo_pos_products', DEFAULT_PRODUCTS);
        // Ensure branchesStock is initialized for every loaded product
        const augmented = loaded.map(p => {
          if (!p.branchesStock) {
            return {
              ...p,
              branchesStock: {
                'branch-centro': p.stock,
                'branch-central': p.stock * 3 + 40,
                'branch-norte': Math.round(p.stock * 0.7) + 5
              }
            };
          }
          return p;
        });
        setProducts(augmented);
        localStorage.setItem('duo_pos_products', JSON.stringify(augmented));
      } catch {
        // Fallback seguro
        const savedProductsRaw = localStorage.getItem('duo_pos_products');
        if (savedProductsRaw) {
          setProducts(JSON.parse(savedProductsRaw));
        } else {
          setProducts(DEFAULT_PRODUCTS);
        }
      }
    };
    loadProducts();

    // 3. Load transactions (Local-First)
    const loadTransactions = async () => {
      try {
        const loaded = await syncLoad<Transaction>('transactions', 'duo_pos_transactions', [], { orderBy: 'date', ascending: false });
        setTransactions(loaded);
      } catch {
        const savedTxnsRaw = localStorage.getItem('duo_pos_transactions');
        if (savedTxnsRaw) {
          setTransactions(JSON.parse(savedTxnsRaw));
        }
      }
    };
    loadTransactions();

    // 4. Load install status
    const simInstallRaw = localStorage.getItem('duo_pos_sim_installed');
    if (simInstallRaw === 'true') {
      setIsSimInstalled(true);
      setShowInstallBanner(false);
    }



    // 6. Load customers (Local-First)
    const loadCustomers = async () => {
      try {
        const loaded = await syncLoad<Customer>('customers', 'duo_pos_customers', DEFAULT_CUSTOMERS);
        setCustomers(loaded);
      } catch {
        const savedCustomersRaw = localStorage.getItem('duo_pos_customers');
        if (savedCustomersRaw) {
          setCustomers(JSON.parse(savedCustomersRaw));
        } else {
          setCustomers(DEFAULT_CUSTOMERS);
          localStorage.setItem('duo_pos_customers', JSON.stringify(DEFAULT_CUSTOMERS));
        }
      }
    };
    loadCustomers();

    // 7. Load billing settings (Local-First)
    const loadBillingSettings = async () => {
      try {
        const loaded = await syncLoad<{ id: string; data: any }>('settings', 'duo_pos_settings', [
          { id: 'billing', data: DEFAULT_BILLING_SETTINGS }
        ]);
        const billingRow = loaded.find(s => s.id === 'billing');
        if (billingRow && billingRow.data) {
          setBillingSettings(billingRow.data);
        } else {
          setBillingSettings(DEFAULT_BILLING_SETTINGS);
        }
      } catch {
        const savedBillingRaw = localStorage.getItem('duo_pos_billing_settings');
        if (savedBillingRaw) {
          setBillingSettings(JSON.parse(savedBillingRaw));
        } else {
          setBillingSettings(DEFAULT_BILLING_SETTINGS);
        }
      }
    };
    loadBillingSettings();

    // 8. Load branches (Local-First)
    const DEFAULT_BRANCHES = [
      { id: 'branch-central', name: 'Almacén Central (CEDIS) 🏢', type: 'central' as const, emoji: '🏢', city: 'CDMX', address: 'Camino Real de Toluca #400, Coyoacán' },
      { id: 'branch-centro', name: 'Sucursal Duo Centro 🦉', type: 'branch' as const, emoji: '🦉', city: 'CDMX', address: 'Av. Paseo de la Reforma #150, Cuauhtémoc' },
      { id: 'branch-norte', name: 'Sucursal Portal Norte 🦁', type: 'branch' as const, emoji: '🦁', city: 'Monterrey', address: 'Av. Lázaro Cárdenas #2400, San Pedro Garza García' }
    ];

    const loadBranches = async () => {
      try {
        const loaded = await syncLoad<Branch>('branches', 'duo_pos_branches', DEFAULT_BRANCHES);
        setBranches(loaded);
      } catch {
        const savedBranchesRaw = localStorage.getItem('duo_pos_branches');
        if (savedBranchesRaw) {
          setBranches(JSON.parse(savedBranchesRaw));
        } else {
          setBranches(DEFAULT_BRANCHES);
        }
      }
    };
    loadBranches();

    const savedActiveBranchId = localStorage.getItem('duo_pos_active_branch_id');
    setActiveBranchId(savedActiveBranchId || 'branch-centro');

    // 9. Load registers (Local-First)
    const DEFAULT_REGISTERS = [
      { id: 'reg-centro-1', branchId: 'branch-centro', name: 'Caja Principal 💵', emoji: '💵', status: 'active' as const },
      { id: 'reg-centro-2', branchId: 'branch-centro', name: 'Caja Rápida ⚡', emoji: '⚡', status: 'active' as const },
      { id: 'reg-norte-1', branchId: 'branch-norte', name: 'Caja Principal Duo 🦁', emoji: '🦁', status: 'active' as const },
      { id: 'reg-norte-2', branchId: 'branch-norte', name: 'Kiosco Auto 🤖', emoji: '🤖', status: 'active' as const },
      { id: 'reg-central-1', branchId: 'branch-central', name: 'Mesa de Despachos 📦', emoji: '📦', status: 'active' as const }
    ];

    const loadRegisters = async () => {
      try {
        const loaded = await syncLoad<CashRegister>('cash_registers', 'duo_pos_registers', DEFAULT_REGISTERS);
        setRegisters(loaded);
      } catch {
        const savedRegistersRaw = localStorage.getItem('duo_pos_registers');
        if (savedRegistersRaw) {
          setRegisters(JSON.parse(savedRegistersRaw));
        } else {
          setRegisters(DEFAULT_REGISTERS);
        }
      }
    };
    loadRegisters();

    const savedActiveRegisterId = localStorage.getItem('duo_pos_active_register_id');
    setActiveRegisterId(savedActiveRegisterId || 'reg-centro-1');

    // 10. Load stock transfers (Local-First)
    const loadTransfers = async () => {
      try {
        const loaded = await syncLoad<StockTransfer>('stock_transfers', 'duo_pos_stock_transfers', [], { orderBy: 'created_at', ascending: false });
        setStockTransfers(loaded);
      } catch {
        const savedTransfersRaw = localStorage.getItem('duo_pos_stock_transfers');
        if (savedTransfersRaw) {
          setStockTransfers(JSON.parse(savedTransfersRaw));
        }
      }
    };
    loadTransfers();

    // 11. Load suppliers (Local-First)
    const loadSuppliers = async () => {
      try {
        const loaded = await syncLoad<Supplier>('suppliers', 'duo_pos_suppliers', []);
        setSuppliers(loaded);
      } catch {
        const savedSuppliersRaw = localStorage.getItem('duo_pos_suppliers');
        if (savedSuppliersRaw) {
          setSuppliers(JSON.parse(savedSuppliersRaw));
        }
      }
    };
    loadSuppliers();

    // 12. Load purchase orders (Local-First)
    const loadPurchaseOrders = async () => {
      try {
        const loaded = await syncLoad<PurchaseOrder>('purchase_orders', 'duo_pos_purchase_orders', [], { orderBy: 'created_at', ascending: false });
        setPurchaseOrders(loaded);
      } catch {
        const savedOrdersRaw = localStorage.getItem('duo_pos_purchase_orders');
        if (savedOrdersRaw) {
          setPurchaseOrders(JSON.parse(savedOrdersRaw));
        }
      }
    };
    loadPurchaseOrders();

    // 13. Sincronizar operaciones pendientes offline
    flushPendingQueue();
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

  // Sync user state to localStorage
  const saveUserAndSyncList = async (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('duo_pos_active_user', JSON.stringify(updatedUser));

    // Also update in registered list index
    const savedUsersRaw = localStorage.getItem('duo_pos_users');
    const users: User[] = savedUsersRaw ? JSON.parse(savedUsersRaw) : [];
    const idx = users.findIndex(u => u.id === updatedUser.id);
    if (idx >= 0) {
      users[idx] = updatedUser;
    } else {
      users.push(updatedUser);
    }
    localStorage.setItem('duo_pos_users', JSON.stringify(users));

    // Sync profiles to Supabase (if authenticated user, id is a valid uuid)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(updatedUser.id);
    if (isUuid) {
      try {
        await supabase
          .from('profiles')
          .update({
            avatar: updatedUser.avatar,
            streak: updatedUser.streak,
            last_sale_date: updatedUser.lastSaleDate,
            xp: updatedUser.xp,
            level: updatedUser.level,
            daily_goal: updatedUser.dailyGoal,
            level_title: updatedUser.levelTitle,
            role: updatedUser.role,
            gems: updatedUser.gems,
            gems_earned_total: updatedUser.gemsEarnedTotal,
            unlocked_skins: updatedUser.unlockedSkins,
            active_skin: updatedUser.activeSkin,
            unlocked_badges: updatedUser.unlockedBadges,
            completed_missions_today: updatedUser.completedMissionsToday
          })
          .eq('id', updatedUser.id);
      } catch (err) {
        console.error('Error syncing profile to Supabase:', err);
      }
    }
  };

  // Gamified XP / Level Booster Handler
  const handleGrantXp = (amount: number) => {
    if (!user) return;

    let xpGained = amount;
    let chargesNum = 0;
    try {
      const savedCharges = localStorage.getItem('duo_pos_xp_booster_charges') || '0';
      chargesNum = parseInt(savedCharges, 10);
    } catch {}

    if (chargesNum > 0) {
      xpGained = amount * 2;
      localStorage.setItem('duo_pos_xp_booster_charges', String(chargesNum - 1));
      toast.achievement(`🧪 ¡Poción de Doble XP Activa! Ganaste el doble: +${xpGained} XP`, { title: 'Booster de Fila 🧪' });
    }

    let updatedXp = user.xp + xpGained;
    let currentLevel = user.level;
    let title = user.levelTitle;
    let didLevelUp = false;

    // Check if level transition happens
    // Level boundary defined as: level * 100 XP
    let neededXp = currentLevel * 100;
    while (updatedXp >= neededXp) {
      updatedXp -= neededXp;
      currentLevel += 1;
      neededXp = currentLevel * 100;
      didLevelUp = true;
    }

    if (didLevelUp) {
      // Set new funny character title
      const titles = [
        'Monolingüe Comercial 🦉',
        'Cajero de Bronce 🥉',
        'Supervisor de Rachas 🥈',
        'Experto en Finanzas 🥇',
        'Duo Maestro Glorioso 👑',
        'Dios del Escáner de Barras ⚡',
        'Socio Corporativo de Duo 💎'
      ];
      title = titles[Math.min(currentLevel - 1, titles.length - 1)];

      setLevelUpAchieved({
        oldLevel: user.level,
        newLevel: currentLevel,
        title: title
      });

      // Play victory melody!
      playSound('levelup');
      
      toast.achievement(`¡Subiste al nivel ${currentLevel}! Título: ${title}`, { 
        title: '¡NIVEL ALCANZADO! 🎉', 
        duration: 8000 
      });
    } else {
      toast.info(`¡Ganaste +${amount} XP! Sigue así ⚡`, { 
        title: 'XP Reincorporado', 
        duration: 2500 
      });
    }

    const updatedUser: User = {
      ...user,
      xp: updatedXp,
      level: currentLevel,
      levelTitle: title
    };

    saveUserAndSyncList(updatedUser);
  };

  // Inventory logic handlers
  const handleAddProduct = async (newProd: Omit<Product, 'id'>) => {
    const defaultBStock = {
      'branch-centro': newProd.stock,
      'branch-central': newProd.stock * 3 + 40,
      'branch-norte': Math.round(newProd.stock * 0.7) + 5
    };
    defaultBStock[activeBranchId] = newProd.stock;

    const formatted: Product = {
      ...newProd,
      id: generateUUID(),
      branchesStock: defaultBStock
    };
    const updated = [formatted, ...products];
    setProducts(updated);
    
    await syncInsert<Product>('products', 'duo_pos_products', updated, formatted);
    
    toast.success(`Producto "${newProd.name}" creado con éxito.`, { title: 'Catálogo de Productos 📦' });
    
    // Reward with details creation XP!
    handleGrantXp(15);
  };

  const handleUpdateProduct = async (prod: Product) => {
    let changedItem: Product | null = null;
    const updated = products.map(p => {
      if (p.id === prod.id) {
        const bStock = prod.branchesStock ? { ...prod.branchesStock } : (p.branchesStock ? { ...p.branchesStock } : {});
        // Only override if branchesStock was not explicitly supplied (standard catalog/POS update)
        if (!prod.branchesStock) {
          bStock[activeBranchId] = prod.stock;
        }
        
        const mainStock = activeBranchId === 'branch-centro' ? (bStock['branch-centro'] ?? prod.stock) : (bStock['branch-centro'] ?? p.stock);
        changedItem = {
          ...prod,
          branchesStock: bStock,
          stock: mainStock
        };
        return changedItem;
      }
      return p;
    });
    setProducts(updated);
    
    if (changedItem) {
      await syncSave<Product>('products', 'duo_pos_products', updated, changedItem);
    }
    
    toast.success(`Producto "${prod.name}" fue actualizado correctamente.`, { title: 'Catálogo de Productos 📦' });
  };

  const handleDeleteProduct = async (id: string) => {
    const deletedName = products.find(p => p.id === id)?.name || '';
    const updated = products.filter(p => p.id !== id);
    setProducts(updated);
    
    await syncDelete('products', 'duo_pos_products', updated, id);
    
    toast.warning(`Producto ${deletedName ? `"${deletedName}"` : ''} eliminado del catálogo.`, { title: 'Catálogo de Productos 📦' });
  };

  const handleDecreaseStock = async (productId: string, qty: number) => {
    let changedItem: Product | null = null;
    const updated = products.map(p => {
      if (p.id === productId) {
        const branchStock = p.branchesStock ? { ...p.branchesStock } : {};
        const currentBranchStock = branchStock[activeBranchId] ?? p.stock;
        branchStock[activeBranchId] = Math.max(0, currentBranchStock - qty);
        
        // Also update standard stock attribute if activeBranch is 'branch-centro'
        const mainStock = activeBranchId === 'branch-centro' ? Math.max(0, currentBranchStock - qty) : p.stock;
        changedItem = { 
          ...p, 
          branchesStock: branchStock,
          stock: mainStock
        };
        return changedItem;
      }
      return p;
    });
    setProducts(updated);
    
    if (changedItem) {
      await syncSave<Product>('products', 'duo_pos_products', updated, changedItem);
    }
  };

  // Customer handlers
  const handleAddCustomer = async (newCust: Omit<Customer, 'id' | 'registeredAt' | 'purchasesCount' | 'totalSpent' | 'gems' | 'league'>) => {
    if (customers.length >= licenseDetails.clientLimit) {
      playSound('error');
      toast.error(`Has completado el límite para el plan actual (${licenseDetails.clientLimit} clientes). Para registrar más clientes leales, actualiza tu licencia en Ajustes > Planes.`, {
        title: 'Plan de Pago Excedido 🔒',
        duration: 8000
      });
      return;
    }

    const formatted: Customer = {
      ...newCust,
      id: generateUUID(),
      registeredAt: new Date().toISOString(),
      purchasesCount: 0,
      totalSpent: 0,
      gems: 0,
      league: 'Bronce'
    };
    const updated = [formatted, ...customers];
    setCustomers(updated);
    
    await syncInsert<Customer>('customers', 'duo_pos_customers', updated, formatted);
    
    // Increment daily customer registry counts for gamification
    try {
      const today = new Date().toISOString().split('T')[0];
      const dayStatsRaw = localStorage.getItem(`duo_pos_daily_acts_${today}`);
      const currentStats = dayStatsRaw ? JSON.parse(dayStatsRaw) : { barcodeScans: 0, invoicesEmitted: 0, customersRegistered: 0 };
      currentStats.customersRegistered = (currentStats.customersRegistered || 0) + 1;
      localStorage.setItem(`duo_pos_daily_acts_${today}`, JSON.stringify(currentStats));
    } catch (e) {}

    toast.success(`Cliente "${newCust.name}" registrado correctamente en Duo Loyalty. 🎉`, { title: 'Panel de Clientes 👥' });
  };

  const handleUpdateCustomer = async (cust: Customer) => {
    const previousCust = customers.find(c => c.id === cust.id);
    let changedItem: Customer | null = null;
    const updated = customers.map(c => {
      if (c.id === cust.id) {
        // Dynamic league upgrade based on totalSpent
        let newLeague = c.league;
        const spent = cust.totalSpent;
        if (spent >= 5000) newLeague = 'Obsidiana';
        else if (spent >= 2500) newLeague = 'Esmeralda';
        else if (spent >= 1200) newLeague = 'Rubí';
        else if (spent >= 600) newLeague = 'Zafiro';
        else if (spent >= 300) newLeague = 'Oro';
        else if (spent >= 150) newLeague = 'Plata';
        else newLeague = 'Bronce';

        if (previousCust && previousCust.league !== newLeague) {
          setTimeout(() => {
            toast.achievement(`¡${cust.name} ha subido de Liga a ${newLeague}! 🏆`, { title: 'Liga Duolingo Clientes ⭐️' });
          }, 300);
        }

        changedItem = { ...cust, league: newLeague };
        return changedItem;
      }
      return c;
    });
    setCustomers(updated);
    
    if (changedItem) {
      await syncSave<Customer>('customers', 'duo_pos_customers', updated, changedItem);
    }
    
    toast.success(`Datos de "${cust.name}" actualizados con éxito.`, { title: 'Panel de Clientes 👥' });
  };

  const handleDeleteCustomer = async (id: string) => {
    const deletedName = customers.find(c => c.id === id)?.name || '';
    const updated = customers.filter(c => c.id !== id);
    setCustomers(updated);
    
    await syncDelete('customers', 'duo_pos_customers', updated, id);
    
    toast.warning(`Cliente ${deletedName ? `"${deletedName}"` : ''} eliminado de los registros.`, { title: 'Panel de Clientes 👥' });
  };


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

  // Suppliers and Purchase Orders handlers
  const handleAddSupplier = async (supplierData: Omit<Supplier, 'id' | 'balance'>) => {
    const formatted: Supplier = {
      ...supplierData,
      id: `sup-${Date.now()}`,
      balance: 0
    };
    const updated = [formatted, ...suppliers];
    setSuppliers(updated);
    await syncInsert<Supplier>('suppliers', 'duo_pos_suppliers', updated, formatted);
    toast.success(`Proveedor "${formatted.name}" agregado con éxito.`, { title: 'Gestión de Proveedores 🚚' });
  };

  const handleUpdateSupplier = async (supplier: Supplier) => {
    const updated = suppliers.map(s => s.id === supplier.id ? supplier : s);
    setSuppliers(updated);
    await syncSave<Supplier>('suppliers', 'duo_pos_suppliers', updated, supplier);
    toast.success(`Proveedor "${supplier.name}" actualizado correctamente.`, { title: 'Gestión de Proveedores 🚚' });
  };

  const handleDeleteSupplier = async (id: string) => {
    const deletedName = suppliers.find(s => s.id === id)?.name || '';
    const updated = suppliers.filter(s => s.id !== id);
    setSuppliers(updated);
    await syncDelete('suppliers', 'duo_pos_suppliers', updated, id);
    toast.warning(`Proveedor ${deletedName ? `"${deletedName}"` : ''} eliminado.`, { title: 'Gestión de Proveedores 🚚' });
  };

  const handleSavePurchaseOrder = async (po: PurchaseOrder) => {
    const updated = purchaseOrders.some(p => p.id === po.id)
      ? purchaseOrders.map(p => p.id === po.id ? po : p)
      : [po, ...purchaseOrders];
    setPurchaseOrders(updated);
    await syncSavePurchaseOrder(po, updated);
    toast.success(`Orden de compra "${po.id}" guardada correctamente.`, { title: 'Órdenes de Compra 📦' });
  };

  const handleTransitPurchaseOrder = async (id: string, carrier: string, estimatedDelivery: string) => {
    const order = purchaseOrders.find(p => p.id === id);
    if (!order) return;
    const updatedOrder: PurchaseOrder = {
      ...order,
      status: 'transit',
      carrier,
      estimatedDelivery
    };
    const updated = purchaseOrders.map(p => p.id === id ? updatedOrder : p);
    setPurchaseOrders(updated);
    await syncSavePurchaseOrder(updatedOrder, updated);
    toast.info(`Orden "${id}" enviada en tránsito con transportista: ${carrier}.`, { title: 'Órdenes de Compra 📦' });
  };

  const handleReceivePurchaseOrder = async (id: string) => {
    const order = purchaseOrders.find(p => p.id === id);
    if (!order) return;
    
    // Update order status to received
    const updatedOrder: PurchaseOrder = {
      ...order,
      status: 'received',
      receivedAt: new Date().toISOString()
    };
    const updatedOrders = purchaseOrders.map(p => p.id === id ? updatedOrder : p);
    setPurchaseOrders(updatedOrders);
    await syncSavePurchaseOrder(updatedOrder, updatedOrders);

    // Increase product stock in active sucursal/branch
    let updatedProducts = [...products];
    for (const item of order.items) {
      if (item.productId) {
        let changedProd: Product | null = null;
        updatedProducts = updatedProducts.map(p => {
          if (p.id === item.productId) {
            const bStock = p.branchesStock ? { ...p.branchesStock } : {};
            const curStock = bStock[activeBranchId] ?? p.stock;
            bStock[activeBranchId] = curStock + Number(item.quantity);
            
            const mainStock = activeBranchId === 'branch-centro' ? bStock['branch-centro'] : p.stock;
            changedProd = {
              ...p,
              branchesStock: bStock,
              stock: mainStock
            };
            return changedProd;
          }
          return p;
        });
        if (changedProd) {
          await syncSave<Product>('products', 'duo_pos_products', updatedProducts, changedProd);
        }
      }
    }
    setProducts(updatedProducts);

    // Purchase payment logistics:
    // If paid by credit, increase the supplier's outstanding liability (balance)
    if (order.paymentMethod === 'credit') {
      const supplier = suppliers.find(s => s.id === order.supplierId);
      if (supplier) {
        const updatedSupplier: Supplier = {
          ...supplier,
          balance: Number(supplier.balance) + Number(order.total)
        };
        const updatedSups = suppliers.map(s => s.id === supplier.id ? updatedSupplier : s);
        setSuppliers(updatedSups);
        await syncSave<Supplier>('suppliers', 'duo_pos_suppliers', updatedSups, updatedSupplier);
      }
      toast.success(`Mercancía recibida. Se sumó $${order.total.toFixed(2)} a las Cuentas por Pagar del proveedor.`, { title: 'Órdenes de Compra 📦' });
    } else {
      // If paid by cash, deduct from the current active shift (caja drawer) as an OUT cash movement
      if (activeShift) {
        const movementId = `move-${Date.now()}`;
        const newMovement: CashMovement = {
          id: movementId,
          type: 'out',
          amount: order.total,
          reason: `Pago Compra Contado ${order.id}`,
          timestamp: new Date().toISOString()
        };
        const updatedShift = {
          ...activeShift,
          expectedCash: Number(activeShift.expectedCash) - Number(order.total),
          movements: [...(activeShift.movements || []), newMovement]
        };
        await syncSaveShift(updatedShift, true);
        setActiveShift(updatedShift);
      }
      toast.success(`Mercancía recibida. Se retiraron $${order.total.toFixed(2)} de la caja registradora activa.`, { title: 'Órdenes de Compra 📦' });
    }
  };

  const handleCancelPurchaseOrder = async (id: string) => {
    const order = purchaseOrders.find(p => p.id === id);
    if (!order) return;
    const updatedOrder: PurchaseOrder = {
      ...order,
      status: 'cancelled'
    };
    const updated = purchaseOrders.map(p => p.id === id ? updatedOrder : p);
    setPurchaseOrders(updated);
    await syncSavePurchaseOrder(updatedOrder, updated);
    toast.warning(`Orden de compra "${id}" fue cancelada.`, { title: 'Órdenes de Compra 📦' });
  };

  const handleRegisterSupplierPayout = async (supplierId: string, amount: number, notes: string) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    if (!supplier) return;

    // Deduct payout amount from supplier outstanding liability (balance)
    const updatedSupplier: Supplier = {
      ...supplier,
      balance: Math.max(0, Number(supplier.balance) - amount)
    };
    const updatedSups = suppliers.map(s => s.id === supplierId ? updatedSupplier : s);
    setSuppliers(updatedSups);
    await syncSave<Supplier>('suppliers', 'duo_pos_suppliers', updatedSups, updatedSupplier);

    // Record payout as cash withdrawal (OUT movement) from the active register shift
    if (activeShift) {
      const movementId = `move-${Date.now()}`;
      const newMovement: CashMovement = {
        id: movementId,
        type: 'out',
        amount,
        reason: `Abono Prov: ${supplier.name}. Notas: ${notes}`,
        timestamp: new Date().toISOString()
      };
      const updatedShift = {
        ...activeShift,
        expectedCash: Number(activeShift.expectedCash) - amount,
        movements: [...(activeShift.movements || []), newMovement]
      };
      await syncSaveShift(updatedShift, true);
      setActiveShift(updatedShift);
    }
    toast.success(`Abono de $${amount.toFixed(2)} a ${supplier.name} registrado con éxito.`, { title: 'Cuentas por Pagar 💳' });
  };

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

    // Process Customer Loyalty Points accretion
    if (txn.customerId) {
      const updatedCustList = customers.map(c => {
        if (c.id === txn.customerId) {
          const totalSpent = Number((c.totalSpent + txn.total).toFixed(2));
          const gemsGained = txn.gemsGained || 0;
          const gemsRedeemed = txn.gemsRedeemed || 0;
          const gems = Math.max(0, c.gems + gemsGained - gemsRedeemed);
          const purchasesCount = c.purchasesCount + 1;

          // Dynamic league update
          let league = c.league;
          if (totalSpent >= 5000) league = 'Obsidiana';
          else if (totalSpent >= 2500) league = 'Esmeralda';
          else if (totalSpent >= 1200) league = 'Rubí';
          else if (totalSpent >= 600) league = 'Zafiro';
          else if (totalSpent >= 300) league = 'Oro';
          else if (totalSpent >= 150) league = 'Plata';
          else league = 'Bronce';

          // Credit line calculation updates
          let creditUsed = c.creditUsed !== undefined ? c.creditUsed : 0;
          let creditHistory = c.creditHistory !== undefined ? [...c.creditHistory] : [];
          
          if (txn.paymentMethod === 'credit') {
            creditUsed = Number((creditUsed + txn.total).toFixed(2));
            creditHistory.unshift({
              id: generateUUID(),
              amount: txn.total,
              type: 'charge',
              date: new Date().toISOString(),
              notes: `Compra POS #F-${txn.id}`,
              transactionId: txn.id
            });
          }

          return {
            ...c,
            totalSpent,
            gems,
            purchasesCount,
            league,
            creditLimit: c.creditLimit !== undefined ? c.creditLimit : 0,
            creditUsed,
            creditHistory
          };
        }
        return c;
      });
      setCustomers(updatedCustList);
      
      const changedCust = updatedCustList.find(c => c.id === txn.customerId);
      if (changedCust) {
        await syncSave<Customer>('customers', 'duo_pos_customers', updatedCustList, changedCust);
      }
    }


    // Update active cash shift diagnostics if active
    if (activeShift) {
      const isCash = txn.paymentMethod === 'cash';
      let cashAddition = 0;
      if (txn.isMixedPayment) {
        cashAddition = txn.mixedCashAmount || 0;
      } else if (isCash) {
        cashAddition = txn.total;
      }

      const updatedShift: CashShift = {
        ...activeShift,
        salesCount: activeShift.salesCount + 1,
        salesVolume: Number((activeShift.salesVolume + txn.total).toFixed(2)),
        expectedCash: Number((activeShift.expectedCash + cashAddition).toFixed(2))
      };
      setActiveShift(updatedShift);
      await syncSaveShift(updatedShift, true);
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

      // Handle raw level XP accretion inline
      let xpGained = 15;
      let chargesNum = 0;
      try {
        const savedCharges = localStorage.getItem('duo_pos_xp_booster_charges') || '0';
        chargesNum = parseInt(savedCharges, 10);
      } catch {}

      if (chargesNum > 0) {
        xpGained = 15 * 2;
        localStorage.setItem('duo_pos_xp_booster_charges', String(chargesNum - 1));
        toast.achievement(`🧪 ¡Poción de Doble XP Activa! Ganaste el doble: +${xpGained} XP`, { title: 'Booster de Fila 🧪' });
      }

      let updatedXp = user.xp + xpGained;
      let currentLevel = user.level;
      let title = user.levelTitle;
      let didLevelUp = false;

      let neededXp = currentLevel * 100;
      while (updatedXp >= neededXp) {
        updatedXp -= neededXp;
        currentLevel += 1;
        neededXp = currentLevel * 100;
        didLevelUp = true;
      }

      if (didLevelUp) {
        const titles = [
          'Monolingüe Comercial 🦉',
          'Cajero de Bronce 🥉',
          'Supervisor de Rachas 🥈',
          'Experto en Finanzas 🥇',
          'Duo Maestro Glorioso 👑',
          'Dios del Escáner de Barras ⚡',
          'Socio Corporativo de Duo 💎'
        ];
        title = titles[Math.min(currentLevel - 1, titles.length - 1)];
        playSound('levelup');
        toast.achievement(`¡Subiste al nivel ${currentLevel}! Título: ${title}`, { title: '¡NIVEL ALCANZADO! 🎉', duration: 8000 });
      } else {
        toast.info(`¡Ganaste +${xpGained} XP y +${gainedGems} 💎 por esta venta! 🦉`, { title: 'Operación Registrada', duration: 3000 });
      }

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
        gems: nextGems,
        gemsEarnedTotal: nextGemsTotal,
        xp: updatedXp,
        level: currentLevel,
        levelTitle: title
      };

      saveUserAndSyncList(updatedUser);
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

    // 2b. Adjust active shift sales values if cash
    if (activeShift) {
      const isCash = targetTxn.paymentMethod === 'cash';
      const updatedShift: CashShift = {
        ...activeShift,
        salesCount: Math.max(0, activeShift.salesCount - 1),
        salesVolume: Math.max(0, Number((activeShift.salesVolume - targetTxn.total).toFixed(2))),
        expectedCash: isCash 
          ? Math.max(activeShift.initialCash, Number((activeShift.expectedCash - targetTxn.total).toFixed(2))) 
          : activeShift.expectedCash
      };
      setActiveShift(updatedShift);
      await syncSaveShift(updatedShift, true);
    }

    // 3. Subtract XP (or give warning feedback)
    if (user) {
      const updatedUser: User = {
        ...user,
        xp: Math.max(0, user.xp - 10) // Small deduction for backing out
      };
      saveUserAndSyncList(updatedUser);
    }
    toast.warning(`Transacción #${txnId.slice(0, 8).toUpperCase()} reembolsada con éxito. Stock devuelto a inventario.`, { title: 'Reembolso de Ticket ⚠️' });
  };


  // Shift control operations
  const handleOpenShift = async (initialCash: number) => {
    if (!user) return;
    const newShift: CashShift = {
      id: generateUUID(),
      employeeId: user.id,
      employeeName: user.username,
      openingTime: new Date().toISOString(),
      initialCash: Number(initialCash.toFixed(2)),
      expectedCash: Number(initialCash.toFixed(2)),
      status: 'open',
      movements: [],
      salesCount: 0,
      salesVolume: 0,
      branchId: activeBranchId,
      registerId: activeRegisterId
    };
    setActiveShift(newShift);
    
    await syncSaveShift(newShift, true);
    
    toast.success(`Caja abierta con un monto base de $${initialCash.toFixed(2)} USD. ¡Ganas +20 XP de inicio!`, { title: 'Apertura de Caja 📂' });
    handleGrantXp(20); // Award opening shift reward XP!
  };

  const handleCloseShift = async (actualCash: number, expectedCash: number, difference: number, notes: string) => {
    if (!activeShift) return;
    const closedShift: CashShift = {
      ...activeShift,
      closingTime: new Date().toISOString(),
      actualCash: Number(actualCash.toFixed(2)),
      difference: Number(difference.toFixed(2)),
      status: 'closed',
      expectedCash: Number(expectedCash.toFixed(2))
    };

    const updatedHistory = [closedShift, ...shiftHistory];
    setShiftHistory(updatedHistory);
    
    await syncSaveShift(closedShift, false, updatedHistory);

    setActiveShift(null);

    // Grant closing shift XP (extra bonus if drawer balances perfectly!)
    let xpReward = 30;
    if (Math.abs(difference) < 0.01) {
      xpReward += 20; // Balanced perfectly!
      toast.achievement(`Cierre de caja perfecto. ¡Bono de +20 XP extra aplicado! 🏆`, { title: '¡Arqueo Perfecto! ✅', duration: 6000 });
    } else {
      toast.warning(`Turno cerrado. Descrepancia de caja calculada: $${difference.toFixed(2)} USD.`, { title: 'Cierre de Turno 📂', duration: 5500 });
    }
    handleGrantXp(xpReward);
  };

  const handleAddShiftMovement = async (type: 'in' | 'out', amount: number, reason: string) => {
    if (!activeShift) return;
    const movement: CashMovement = {
      id: generateUUID(),
      type,
      amount: Number(amount.toFixed(2)),
      reason: reason || (type === 'in' ? 'Entrada manual' : 'Salida manual'),
      timestamp: new Date().toISOString()
    };

    const delta = type === 'in' ? amount : -amount;
    const updatedShift: CashShift = {
      ...activeShift,
      movements: [...activeShift.movements, movement],
      expectedCash: Number((activeShift.expectedCash + delta).toFixed(2))
    };
    setActiveShift(updatedShift);
    
    await syncSaveShift(updatedShift, true);
    
    toast.info(`Movimiento de caja registrado: ${type === 'in' ? 'Entrada (+)' : 'Salida (-)'} de $${amount.toFixed(2)} USD para "${movement.reason}"`, { title: 'Efectivo en Caja 💵' });
  };


  // Simulating Install Completion Handlers
  const handleSimulateInstallSuccess = () => {
    setIsSimInstalled(true);
    setShowInstallBanner(false);
    localStorage.setItem('duo_pos_sim_installed', 'true');
  };

  const handleLogout = async () => {
    setUser(null);
    localStorage.removeItem('duo_pos_active_user');
    await supabase.auth.signOut();
    setShowLanding(true);
  };

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
            completedMissionsToday: []
          };
          setUser(adminUser);
          localStorage.setItem('duo_pos_active_user', JSON.stringify(adminUser));
          setShowLanding(false);
          toast.success("¡Ingresaste con la cuenta maestra de Administrador! 🦉🎉", { title: "Duo Club Maestre" });
        }}
      />
    );
  }

  if (!user) {
    return <LoginScreen onLoginSuccess={(u) => {
      setUser(u);
      localStorage.setItem('duo_pos_active_user', JSON.stringify(u));
      setShowLanding(false);
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
    <div className={`min-h-screen font-sans flex flex-col relative antialiased transition-all duration-300 ${themeClasses.outer}`}>

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
            
            {/* Duolingo Character logo header */}
            <div className="flex items-center gap-2 px-2 cursor-pointer transform hover:scale-102 transition-transform duration-100">
              <span className="text-4xl filter drop-shadow-sm select-none">{activeChar.avatar}</span>
              <div>
                <h1 className={`text-2xl font-black tracking-wider leading-none ${themeClasses.logoText}`}>
                  Duo<span className={user?.activeSkin === 'standard' ? 'text-[#3c3c3c]' : 'text-inherit opacity-85'}>POS</span>
                </h1>
                <span className="text-[9px] tracking-widest uppercase font-black text-gray-400">Punto de venta</span>
              </div>
            </div>

            {/* Sidebar nav selections */}
            <nav className="space-y-2">
              {[
                { id: 'dashboard', label: 'Inicio', icon: <Home size={20} strokeWidth={2.5} />, roles: ['admin', 'supervisor', 'cashier'], name: 'Tablero' },
                { id: 'sales', label: 'Vender', icon: <ShoppingBag size={20} strokeWidth={2.5} />, roles: ['admin', 'supervisor', 'cashier'], name: 'Ventas' },
                { id: 'gamification', label: 'Duo Club 🏆', icon: <Trophy size={20} strokeWidth={2.5} />, roles: ['admin', 'supervisor', 'cashier'], name: 'Gamificación' },
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
                  onClick={() => { playSound('click'); fetchExchangeRates(); }}
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
                    <option value="admin">👑 Admin</option>
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

          {/* Active Screen Selection Switcher router */}
          {activeTab === 'dashboard' && (
            <DashboardScreen
              user={user}
              transactions={transactions}
              products={products}
              onSetNewGoal={(val) => {
                const refreshed = { ...user, dailyGoal: val };
                saveUserAndSyncList(refreshed);
              }}
              onNavigateToSell={() => setActiveTab('sales')}
              onGrantXp={handleGrantXp}
            />
          )}

          {activeTab === 'sales' && (
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
            />
          )}

          {activeTab === 'customers' && (
            <CustomersScreen
              customers={customers}
              onAddCustomer={handleAddCustomer}
              onUpdateCustomer={handleUpdateCustomer}
              onDeleteCustomer={handleDeleteCustomer}
              onGrantXp={handleGrantXp}
              activeShift={activeShift}
              onAddShiftMovement={handleAddShiftMovement}
            />
          )}

          {activeTab === 'inventory' && (
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
          )}

          {activeTab === 'history' && (
            <HistoryScreen
              transactions={transactions}
              onRefundTransaction={handleRefundTransaction}
              currentUser={user}
              billingSettings={billingSettings}
            />
          )}

          {activeTab === 'settings' && (
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
          )}

          {activeTab === 'gamification' && (
            <GamificationScreen
              user={user}
              onUpdateUser={saveUserAndSyncList}
              transactions={transactions}
              products={products}
              customers={customers}
            />
          )}

          {activeTab === 'shifts' && (
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
          )}

          {activeTab === 'logistics' && (
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
            />
          )}

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
      {levelUpAchieved && (
        <div className="fixed inset-0 z-50 bg-[#1cb0f6] flex flex-col items-center justify-center p-4 text-white text-center font-sans animate-scaleUp">
          <div className="max-w-md w-full space-y-6">
            <span className="text-9xl block select-none drop-shadow-lg transform animate-bounce duration-500">
              💎
            </span>
            <div className="space-y-2">
              <span className="text-xl font-black tracking-widest text-[#d2f09d] uppercase">
                ¡NUEVO LOGRO DESBLOQUEADO!
              </span>
              <h1 className="text-4xl md:text-5xl font-black leading-tight tracking-tight">
                ¡Subiste al Nivel {levelUpAchieved.newLevel}!
              </h1>
              <p className="text-sky-100 font-extrabold text-sm max-w-xs mx-auto pt-1 leading-normal uppercase">
                Has sido promovido al cargo oficial de:<br />
                <span className="bg-yellow-400 text-amber-950 font-black px-3.5 py-1 rounded-xl text-base inline-block border-2 border-white max-w-full truncate shadow-sm mt-3 animate-pulse">
                  {levelUpAchieved.title}
                </span>
              </p>
            </div>

            <div className="bg-white/10 border border-white/20 rounded-2xl p-4 text-xs font-bold leading-relaxed max-w-sm mx-auto text-white">
              🎉 ¡Felicidades! Has expandido tu vocabulario comercial de DuoPOS. El búho Duo está inmensamente complacido por tu desempeño en racha.
            </div>

            <button
              onClick={() => setLevelUpAchieved(null)}
              className="w-full bg-white text-[#1cb0f6] border-b-[6px] border-[#dddddd] hover:bg-gray-50 active:border-b-0 active:translate-y-[6px] py-4 rounded-3xl font-black text-lg uppercase tracking-wider transition-all cursor-pointer"
            >
              ¡Continuar Trabajando!
            </button>
          </div>
        </div>
      )}

      {/* RBAC Role Restriction Warnings Modal */}
      {roleLockWarning && (
        <div className="fixed inset-0 z-50 bg-[#141414]/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white border-2 border-[#e5e5e5] border-b-[8px] rounded-3xl p-6 text-center space-y-4 animate-scaleUp">
            <div className="text-6xl text-amber-500 select-none">🔒</div>
            <h3 className="text-2xl font-black text-gray-800 tracking-tight">Acceso Restringido</h3>
            <p className="text-sm font-bold text-gray-500">
              Para entrar a la pestaña de <strong className="text-gray-800 font-extrabold">"{roleLockWarning.tabName}"</strong> necesitas rol de <span className="bg-amber-100 text-amber-700 px-2.5 py-1 rounded-lg border border-amber-200 uppercase text-xs font-black">{roleLockWarning.requiredRole}</span>.
            </p>
            <p className="text-xs text-gray-400 font-bold">
              Tu rol actual es: <span className="uppercase text-slate-600 underline font-black">{roleLockWarning.activeRole === 'cashier' ? 'Cajero 💵' : roleLockWarning.activeRole === 'supervisor' ? 'Supervisor ⚡' : 'Administrador 👑'}</span>
            </p>
            
            <div className="bg-blue-50 border border-blue-100 p-3 rounded-2xl text-left space-y-2 mt-4">
              <span className="text-[11px] font-black text-blue-600 uppercase tracking-widest block">🔧 Modo Demostración (Simulador de Permisos)</span>
              <p className="text-xs text-blue-700 leading-relaxed font-semibold">
                ¿Deseas verificar esta vista? Haz clic abajo para autodesignarte un nivel de acceso superior temporal en este navegador.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => {
                  const updatedUser = { ...user, role: 'admin' };
                  setUser(updatedUser);
                  localStorage.setItem('duo_pos_active_user', JSON.stringify(updatedUser));
                  setActiveTab(
                    roleLockWarning.tabName === 'Configuración' ? 'settings' :
                    roleLockWarning.tabName === 'Catálogos' ? 'inventory' :
                    roleLockWarning.tabName === 'Logística' ? 'logistics' : 'dashboard'
                  );
                  setRoleLockWarning(null);
                  playSound('levelup');
                }}
                className="bg-[#58cc02] text-white border-b-4 border-[#3e9301] hover:bg-[#61e002] active:border-b-0 active:translate-y-[4px] font-black text-xs py-2.5 rounded-2xl cursor-pointer uppercase"
              >
                Simular Admin 👑
              </button>
              <button
                onClick={() => setRoleLockWarning(null)}
                className="bg-white text-gray-500 border-2 border-gray-200 border-b-4 hover:bg-gray-50 active:translate-y-[2px] active:border-b-2 font-black text-xs py-2.5 rounded-2xl cursor-pointer uppercase"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

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
