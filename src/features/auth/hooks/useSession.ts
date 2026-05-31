import { useEffect } from 'react';
import { User } from '../../../types';
import { supabase, isSupabaseConfigured, setSupabaseToken } from '../../../config/supabaseClient';
import { useUserStore } from '../../../stores/useUserStore';

export function useSession() {
  const user = useUserStore((s) => s.user);
  const setUser = useUserStore((s) => s.setUser);
  const setShowLanding = useUserStore((s) => s.setShowLanding);

  // Supabase Auth State Change Listener (fallback when Clerk is not configured)
  useEffect(() => {
    if (!!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY) {
      return; // Clerk handles session via ClerkSessionSync component
    }
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
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
              completed_missions_today: [],
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
              completedMissionsToday: finalProfile.completed_missions_today,
            };
            setUser(mappedUser);
            setShowLanding(false);
            localStorage.setItem('duo_pos_active_user', JSON.stringify(mappedUser));
          }
        } catch (err) {
          console.error('Unexpected error in auth observer:', err);
        }
      } else {
        // If offline, preserve local session
        if (!navigator.onLine) {
          console.log('🌐 [OFFLINE AUTH] Detectado modo offline. Conservando sesión local de Supabase.');
          return;
        }

        if (event === 'SIGNED_OUT' || (event === 'INITIAL_SESSION' && navigator.onLine)) {
          const activeUserRaw = localStorage.getItem('duo_pos_active_user');
          if (activeUserRaw) {
            try {
              const parsed = JSON.parse(activeUserRaw);
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
          // Clear expired Supabase session tokens
          const keysToRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('sb-')) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach((key) => localStorage.removeItem(key));
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loginUser = (u: User) => {
    setUser(u);
    localStorage.setItem('duo_pos_active_user', JSON.stringify(u));
    setShowLanding(false);
  };

  const logoutUser = async () => {
    setUser(null);
    localStorage.removeItem('duo_pos_active_user');

    // Sign out from Clerk if configured and available
    if (!!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY && (window as any).Clerk) {
      try {
        await (window as any).Clerk.signOut();
      } catch (err) {
        console.error('Error signing out of Clerk:', err);
      }
    }

    await supabase.auth.signOut();
    setShowLanding(true);
  };

  const saveUser = async (updatedUser: User) => {
    await useUserStore.getState().updateUser(updatedUser);
  };

  return {
    user,
    loginUser,
    logoutUser,
    saveUser,
  };
}
