import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useUserStore } from '../stores/useUserStore';
import { useSalesStore } from '../features/sales/store/useSalesStore';
import { useInventoryStore } from '../features/inventory/store/useInventoryStore';
import { useCustomerStore } from '../features/customers/store/useCustomerStore';
import { supabase, isSupabaseConfigured } from '../config/supabaseClient';
import {
  syncLoad,
  loadUserPreferences,
  pruneOldLocalStorage,
} from '../database/supabaseSync';
import { detectClockTampering, PLANS } from '../services/security/licensingService';
import type { Product, Transaction } from '../types';

export function useAppLifecycle() {
  const user = useUserStore((s) => s.user);
  const saveUser = useUserStore((s) => s.updateUser);
  const setLicenseDetails = useUserStore((s) => s.setLicenseDetails);
  const setIsLicenseExpired = useUserStore((s) => s.setIsLicenseExpired);
  const setIsClockTampered = useUserStore((s) => s.setIsClockTampered);
  const licenseDetails = useUserStore((s) => s.licenseDetails);
  const setDuoMood = useUserStore((s) => s.setDuoMood);
  const duoMood = useUserStore((s) => s.duoMood);

  const activeBranchId = useSalesStore((s) => s.activeBranchId);
  const setTransactions = useSalesStore((s) => s.setTransactions);
  const transactions = useSalesStore((s) => s.transactions);

  const setProducts = useInventoryStore((s) => s.setProducts);
  const setCustomers = useCustomerStore((s) => s.setCustomers);
  const setActiveShift = useSalesStore((s) => s.setActiveShift);
  const setShiftHistory = useSalesStore((s) => s.setShiftHistory);
  const activeRegisterId = useSalesStore((s) => s.activeRegisterId);

  const location = useLocation();
  const activeTab = location.pathname === '/' ? 'dashboard' : location.pathname.substring(1);

  useEffect(() => {
    let inactivityTimer: ReturnType<typeof setTimeout>;
    const resetInactivity = () => {
      const currentMood = duoMood;
      setDuoMood(currentMood === 'happy' ? 'happy' : 'neutral');
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => setDuoMood('sleeping'), 120000);
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

  useEffect(() => {
    try {
      const saved = localStorage.getItem('duo_pos_licensing_details');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.tier === 'trial') parsed.tier = 'free';
        if (parsed.tier === 'unlimited_racha' || parsed.tier === 'enterprise_buhoflota') parsed.tier = 'pro';
        setLicenseDetails(parsed);
      } else {
        setLicenseDetails({
          tier: 'free',
          activated: false,
          activationKey: '',
          expiresAt: 'Nunca',
          clientLimit: PLANS.free.clientLimit,
          salesLimit: PLANS.free.salesLimit,
          currentSalesCount: 0,
          offlineActivationSeed: '',
          companyName: '',
        } as any);
      }
    } catch (e) {
      console.error('Error loading license details:', e);
    }
  }, []);

  useEffect(() => {
    if (licenseDetails && licenseDetails.currentSalesCount !== transactions.length) {
      const updated = { ...licenseDetails, currentSalesCount: transactions.length };
      try { localStorage.setItem('duo_pos_licensing_details', JSON.stringify(updated)); } catch {}
      setLicenseDetails(updated);
    }
  }, [transactions.length]);

  useEffect(() => {
    const checkLicenseValidity = () => {
      const clockTampered = detectClockTampering();
      if (clockTampered) { setIsClockTampered(true); return; }
      setIsClockTampered(false);
      if (licenseDetails.activated && licenseDetails.expiresAt !== 'Nunca') {
        const expiryDate = new Date(licenseDetails.expiresAt);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        expiryDate.setHours(23, 59, 59, 999);
        setIsLicenseExpired(today > expiryDate);
      } else {
        setIsLicenseExpired(false);
      }
    };
    checkLicenseValidity();
    const interval = setInterval(checkLicenseValidity, 20000);
    return () => clearInterval(interval);
  }, [licenseDetails]);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const prefs = await loadUserPreferences(user.id);
        if (prefs && prefs.theme && prefs.theme !== user.activeSkin) {
          saveUser({ ...user, activeSkin: prefs.theme });
        }
      } catch (e) { console.error('Error loading user preferences:', e); }
      pruneOldLocalStorage();
    })();
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    if (user) {
      const currentRole = user.role || 'cashier';
      const tabRolesMap: Record<string, string[]> = {
        inventory: ['admin', 'supervisor'],
        logistics: ['admin', 'supervisor'],
        settings: ['admin'],
      };
      const required = tabRolesMap[activeTab];
      if (required && !required.includes(currentRole)) {
      }
    }
  }, [user?.role, activeTab]);

  useEffect(() => {
    if (!user || !isSupabaseConfigured()) return;

    // 1. Products Realtime Subscription
    const productsChannel = supabase
      .channel('realtime-products-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, async () => {
        try {
          const loaded = await syncLoad<Product>('products', 'duo_pos_products', []);
          setProducts(loaded.map((p) => ({
            ...p,
            branchesStock: p.branchesStock || {
              'branch-centro': p.stock,
              'branch-central': p.stock * 3 + 40,
              'branch-norte': Math.round(p.stock * 0.7) + 5,
            },
          })));
        } catch (e) { console.error('Error reloading products:', e); }
      })
      .subscribe();

    // 2. Transactions Realtime Subscription
    const transactionsChannel = supabase
      .channel('realtime-transactions-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, async () => {
        try {
          const loaded = await syncLoad<Transaction>('transactions', 'duo_pos_transactions', [], { orderBy: 'date', ascending: false, branchId: activeBranchId });
          setTransactions(loaded);
        } catch (e) { console.error('Error reloading transactions:', e); }
      })
      .subscribe();

    // 3. Profiles (User Stats) Realtime Subscription
    const profilesChannel = supabase
      .channel('realtime-profiles-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` }, async (payload) => {
        try {
          const updated = payload.new as any;
          if (updated) {
            const mappedUser = {
              id: updated.id,
              username: updated.username,
              email: updated.email,
              avatar: updated.avatar,
              streak: Number(updated.streak),
              lastSaleDate: updated.last_sale_date,
              xp: Number(updated.xp),
              level: Number(updated.level),
              dailyGoal: Number(updated.daily_goal),
              levelTitle: updated.level_title,
              role: updated.role,
              gems: Number(updated.gems),
              gemsEarnedTotal: Number(updated.gems_earned_total),
              unlockedSkins: updated.unlocked_skins || ['standard'],
              activeSkin: updated.active_skin || 'standard',
              unlockedBadges: updated.unlocked_badges || [],
              completedMissionsToday: updated.completed_missions_today || [],
            };

            const current = useUserStore.getState().user;
            if (
              current &&
              (current.xp !== mappedUser.xp ||
               current.level !== mappedUser.level ||
               current.gems !== mappedUser.gems ||
               current.streak !== mappedUser.streak ||
               current.activeSkin !== mappedUser.activeSkin ||
               current.avatar !== mappedUser.avatar ||
               JSON.stringify(current.unlockedSkins) !== JSON.stringify(mappedUser.unlockedSkins) ||
               JSON.stringify(current.unlockedBadges) !== JSON.stringify(mappedUser.unlockedBadges))
            ) {
              console.log('🔄 [Realtime Profile Sync] Updating stats...', mappedUser);
              useUserStore.getState().setUser(mappedUser);
              localStorage.setItem('duo_pos_active_user', JSON.stringify(mappedUser));
            }
          }
        } catch (e) { console.error('Error reloading profile in realtime:', e); }
      })
      .subscribe();

    // 4. Customers Realtime Subscription
    const customersChannel = supabase
      .channel('realtime-customers-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, async () => {
        try {
          const loaded = await syncLoad('customers', 'duo_pos_customers', []);
          setCustomers(loaded);
        } catch (e) { console.error('Error reloading customers in realtime:', e); }
      })
      .subscribe();

    // 5. Cash Shifts Realtime Subscription
    const shiftsChannel = supabase
      .channel('realtime-shifts-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cash_shifts' }, async () => {
        try {
          const loaded = await syncLoad<any>('cash_shifts', 'duo_pos_shift_history', [], { orderBy: 'opening_time', ascending: false });
          const active = loaded.find((s) => s.status === 'open' && s.branchId === activeBranchId && s.registerId === activeRegisterId);
          if (active) {
            setActiveShift(active);
            localStorage.setItem('duo_pos_active_shift', JSON.stringify(active));
          } else {
            setActiveShift(null);
            localStorage.removeItem('duo_pos_active_shift');
          }
          const history = loaded.filter((s) => s.status === 'closed' && s.branchId === activeBranchId && s.registerId === activeRegisterId);
          setShiftHistory(history);
          localStorage.setItem('duo_pos_shift_history', JSON.stringify(loaded));
        } catch (e) { console.error('Error reloading shifts in realtime:', e); }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(productsChannel);
      supabase.removeChannel(transactionsChannel);
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(customersChannel);
      supabase.removeChannel(shiftsChannel);
    };
  }, [user, activeBranchId, activeRegisterId]);
}
