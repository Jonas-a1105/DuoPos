import React, { useEffect, useState } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { supabase, setSupabaseToken } from '../../config/supabaseClient';
import type { User } from '../../types/index';

interface ClerkSessionSyncProps {
  onSyncUser: (user: User | null) => void;
}

function ClerkSessionSync({ onSyncUser }: ClerkSessionSyncProps) {
  const { userId, getToken, isLoaded: isAuthLoaded } = useAuth();
  const { user: clerkUser, isLoaded: isUserLoaded } = useUser();
  const [isTokenSynced, setIsTokenSynced] = useState(false);

  useEffect(() => {
    if (!isAuthLoaded) return;

    const syncToken = async () => {
      if (userId) {
        try {
          const token = await getToken({ template: 'supabase' });
          setSupabaseToken(token);
          setIsTokenSynced(true);
        } catch (err) {
          console.error('Error getting Supabase token from Clerk:', err);
          setIsTokenSynced(false);
        }
      } else {
        setSupabaseToken(null);
        setIsTokenSynced(false);
      }
    };
    syncToken();
  }, [userId, getToken, isAuthLoaded]);

  useEffect(() => {
    if (!isUserLoaded || !isTokenSynced) return;

    const loadClerkUserProfile = async () => {
      if (clerkUser) {
        try {
          let { data: userProfile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', clerkUser.id)
            .maybeSingle();

          // Self-healing: If JWT verification fails (401), the Clerk-Supabase template integration is misconfigured or expired.
          // Reset the client token to fallback to Supabase Anon Key.
          if (error && ((error as any).status === 401 || error.message?.includes('JWT') || error.message?.includes('token') || error.message?.includes('401'))) {
            console.warn('⚠️ Clerk-Supabase JWT Verification failed (401). Falling back to Supabase Anon Key for local-first sync...', error);
            setSupabaseToken(null);
            setIsTokenSynced(false);

            const retry = await supabase
              .from('profiles')
              .select('*')
              .eq('id', clerkUser.id)
              .maybeSingle();

            userProfile = retry.data;
            error = retry.error;
          }

          let finalProfile = userProfile;

          if (error) {
            console.error('Error checking profile, attempting self-healing...', error);
          }

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
              completed_missions_today: [],
            };

            let { data: newProfile, error: insertErr } = await supabase
              .from('profiles')
              .insert(defaultProfile)
              .select()
              .maybeSingle();

            // Self-healing insert
            if (insertErr && ((insertErr as any).status === 401 || insertErr.message?.includes('JWT') || insertErr.message?.includes('401'))) {
              console.warn('⚠️ Clerk-Supabase JWT Verification failed on insert. Retrying insert with Supabase Anon Key...', insertErr);
              setSupabaseToken(null);
              const retryInsert = await supabase
                .from('profiles')
                .insert(defaultProfile)
                .select()
                .maybeSingle();

              newProfile = retryInsert.data;
              insertErr = retryInsert.error;
            }

            if (insertErr) {
              console.error('Error al autocrear perfil en Supabase:', insertErr);
            }
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
              completedMissionsToday: finalProfile.completed_missions_today,
            };
            onSyncUser(mappedUser);
            localStorage.setItem('duo_pos_active_user', JSON.stringify(mappedUser));
          }
        } catch (err) {
          console.error('Error loading Clerk profile in sync:', err);
        }
      } else {
        onSyncUser(null);
      }
    };
    loadClerkUserProfile();
  }, [clerkUser, isUserLoaded, isTokenSynced]);

  return null;
}

export default ClerkSessionSync;
