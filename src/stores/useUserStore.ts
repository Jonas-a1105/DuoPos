import { create } from 'zustand';
import { User, LicenseDetails } from '../types';
import { playSound } from '../services/audio/soundService';
import { toast } from '../shared/ui/FlashNotifications/FlashNotifications';
import { supabase } from '../config/supabaseClient';
import { syncUserPreferences } from '../database/supabaseSync';


interface UserState {
  user: User | null;
  users: User[];
  showLanding: boolean;
  isLicenseExpired: boolean;
  isClockTampered: boolean;
  licenseDetails: LicenseDetails;
  roleLockWarning: { requiredRole: string; activeRole: string; tabName: string } | null;
  lastSyncTime: string | null;

  // Actions
  setUser: (user: User | null) => void;
  setUsers: (users: User[]) => void;
  setShowLanding: (show: boolean) => void;
  setIsLicenseExpired: (expired: boolean) => void;
  setIsClockTampered: (tampered: boolean) => void;
  setLicenseDetails: (details: LicenseDetails) => void;
  setRoleLockWarning: (warning: { requiredRole: string; activeRole: string; tabName: string } | null) => void;
  setLastSyncTime: (time: string | null) => void;

  updateUser: (updatedUser: User) => Promise<void>;
}

const DEFAULT_LICENSE_DETAILS: LicenseDetails = {
  tier: 'free',
  activated: false,
  activationKey: 'FREE-TIER-TRIAL',
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  clientLimit: 50,
  salesLimit: 100,
  currentSalesCount: 0,
  offlineActivationSeed: 'FREE-SEED',
  activatedAt: new Date().toISOString(),
  companyName: 'StockMaster Pro Trial Client',
};

export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  users: [],
  showLanding: true,
  isLicenseExpired: false,
  isClockTampered: false,
  licenseDetails: DEFAULT_LICENSE_DETAILS,
  roleLockWarning: null,
  lastSyncTime: null,

  setUser: (user) => set({ user }),
  setUsers: (users) => set({ users }),
  setShowLanding: (showLanding) => set({ showLanding }),
  setIsLicenseExpired: (isLicenseExpired) => set({ isLicenseExpired }),
  setIsClockTampered: (isClockTampered) => set({ isClockTampered }),
  setLicenseDetails: (licenseDetails) => set({ licenseDetails }),
  setRoleLockWarning: (roleLockWarning) => set({ roleLockWarning }),
  setLastSyncTime: (lastSyncTime) => set({ lastSyncTime }),

  updateUser: async (updatedUser) => {
    set({ user: updatedUser });
    localStorage.setItem('duo_pos_active_user', JSON.stringify(updatedUser));

    // Sync user UI preferences to Supabase
    if (updatedUser.id) {
      const isMuted = localStorage.getItem('duo_pos_muted') === 'true';
      const soundEnabled = !isMuted;
      const theme = updatedUser.activeSkin || 'standard';
      syncUserPreferences(updatedUser.id, theme, soundEnabled).catch((err) => {
        console.error('Error syncing user preferences:', err);
      });
    }

    // Also update in registered list index
    const savedUsersRaw = localStorage.getItem('duo_pos_users');
    const users: User[] = savedUsersRaw ? JSON.parse(savedUsersRaw) : [];
    const idx = users.findIndex((u) => u.id === updatedUser.id);
    if (idx >= 0) {
      users[idx] = updatedUser;
    } else {
      users.push(updatedUser);
    }
    set({ users });
    localStorage.setItem('duo_pos_users', JSON.stringify(users));

    // Sync profiles to Supabase (if authenticated user: Clerk ID starting with 'user_' or a valid UUID)
    const shouldSync =
      updatedUser.id &&
      (updatedUser.id.startsWith('user_') ||
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(updatedUser.id));
    if (shouldSync) {
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
            completed_missions_today: updatedUser.completedMissionsToday,
          })
          .eq('id', updatedUser.id);
      } catch (err) {
        console.error('Error syncing profile to Supabase:', err);
      }
    }
  },
}));
