import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useUserStore } from '../stores/useUserStore';
import { useSalesStore } from '../features/sales/store/useSalesStore';
import { useInventoryStore } from '../features/inventory/store/useInventoryStore';
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
    const transactionsChannel = supabase
      .channel('realtime-transactions-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, async () => {
        try {
          const loaded = await syncLoad<Transaction>('transactions', 'duo_pos_transactions', [], { orderBy: 'date', ascending: false, branchId: activeBranchId });
          setTransactions(loaded);
        } catch (e) { console.error('Error reloading transactions:', e); }
      })
      .subscribe();
    return () => {
      supabase.removeChannel(productsChannel);
      supabase.removeChannel(transactionsChannel);
    };
  }, [user, activeBranchId]);
}
