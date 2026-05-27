import { create } from 'zustand';
import { User, LicenseDetails } from '../types';
import { playSound } from '../services/sounds';
import { toast } from '../components/Modal/FlashNotifications';
import { supabase } from '../config/supabaseClient';


interface UserState {
  user: User | null;
  users: User[];
  showLanding: boolean;
  isLicenseExpired: boolean;
  isClockTampered: boolean;
  licenseDetails: LicenseDetails;
  xpBoosterCharges: number;
  duoMood: 'neutral' | 'happy' | 'crying' | 'smart' | 'party' | 'sleeping';
  duoSparkles: boolean;
  levelUpAchieved: { oldLevel: number; newLevel: number; title: string } | null;
  roleLockWarning: { requiredRole: string; activeRole: string; tabName: string } | null;
  lastSyncTime: string | null;

  // Actions
  setUser: (user: User | null) => void;
  setUsers: (users: User[]) => void;
  setShowLanding: (show: boolean) => void;
  setIsLicenseExpired: (expired: boolean) => void;
  setIsClockTampered: (tampered: boolean) => void;
  setLicenseDetails: (details: LicenseDetails) => void;
  setDuoMood: (mood: 'neutral' | 'happy' | 'crying' | 'smart' | 'party' | 'sleeping') => void;
  setDuoSparkles: (sparkles: boolean) => void;
  setLevelUpAchieved: (achievement: { oldLevel: number; newLevel: number; title: string } | null) => void;
  setRoleLockWarning: (warning: { requiredRole: string; activeRole: string; tabName: string } | null) => void;
  setLastSyncTime: (time: string | null) => void;
  setXpBoosterCharges: (charges: number) => void;

  updateUser: (updatedUser: User) => Promise<void>;
  grantXp: (amount: number, isHappyHourActive?: boolean) => Promise<void>;
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
  companyName: 'DuoPOS Trial Client'
};


export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  users: [],
  showLanding: true,
  isLicenseExpired: false,
  isClockTampered: false,
  licenseDetails: DEFAULT_LICENSE_DETAILS,
  xpBoosterCharges: 0,
  duoMood: 'neutral',
  duoSparkles: false,
  levelUpAchieved: null,
  roleLockWarning: null,
  lastSyncTime: null,

  setUser: (user) => set({ user }),
  setUsers: (users) => set({ users }),
  setShowLanding: (showLanding) => set({ showLanding }),
  setIsLicenseExpired: (isLicenseExpired) => set({ isLicenseExpired }),
  setIsClockTampered: (isClockTampered) => set({ isClockTampered }),
  setLicenseDetails: (licenseDetails) => set({ licenseDetails }),
  setDuoMood: (duoMood) => set({ duoMood }),
  setDuoSparkles: (duoSparkles) => set({ duoSparkles }),
  setLevelUpAchieved: (levelUpAchieved) => set({ levelUpAchieved }),
  setRoleLockWarning: (roleLockWarning) => set({ roleLockWarning }),
  setLastSyncTime: (lastSyncTime) => set({ lastSyncTime }),
  setXpBoosterCharges: (xpBoosterCharges) => set({ xpBoosterCharges }),

  updateUser: async (updatedUser) => {
    set({ user: updatedUser });
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
    set({ users });
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
  },

  grantXp: async (amount, isHappyHourActive = false) => {
    const { user } = get();
    if (!user) return;

    let xpGained = amount;
    let chargesNum = 0;
    try {
      const savedCharges = localStorage.getItem('duo_pos_xp_booster_charges') || '0';
      chargesNum = parseInt(savedCharges, 10);
    } catch {}

    if (chargesNum > 0) {
      xpGained = amount * 2;
      chargesNum = chargesNum - 1;
      set({ xpBoosterCharges: chargesNum });
      localStorage.setItem('duo_pos_xp_booster_charges', String(chargesNum));
      toast.achievement(`🧪 ¡Poción de Doble XP Activa! Ganaste el doble: +${xpGained} XP`, { title: 'Booster de Fila 🧪' });
    }

    if (isHappyHourActive) {
      xpGained = xpGained * 2;
      toast.achievement(`⚡ ¡Hora Feliz Activa! XP duplicado: +${xpGained} XP`, { title: 'Hora Feliz de Ventas ⚡' });
    }

    let updatedXp = user.xp + xpGained;
    let currentLevel = user.level;
    let title = user.levelTitle;
    let didLevelUp = false;

    // Check if level transition happens
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

      set({
        levelUpAchieved: {
          oldLevel: user.level,
          newLevel: currentLevel,
          title: title
        }
      });

      playSound('levelup');
      
      toast.achievement(`¡Subiste al nivel ${currentLevel}! Título: ${title}`, { 
        title: '¡NIVEL ALCANZADO! 🎉', 
        duration: 8000 
      });
    } else {
      toast.info(`¡Ganaste +${xpGained} XP! Sigue así ⚡`, { 
        title: 'XP Reincorporado', 
        duration: 2500 
      });
    }

    const updatedUser: User = {
      ...user,
      xp: updatedXp,
      level: currentLevel,
      levelTitle: title,
      weeklyXp: (user.weeklyXp ?? 0) + xpGained,
      seasonXp: (user.seasonXp ?? 0) + xpGained
    };

    await get().updateUser(updatedUser);
  }
}));
