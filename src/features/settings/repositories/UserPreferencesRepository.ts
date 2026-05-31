import { setLocalData, getLocalData, isOnline, addToPendingQueue } from '../../../shared/services/DataSync';
import { supabase } from '../../../config/supabaseClient';

export async function syncUserPreferences(userId: string, theme: string, soundEnabled: boolean): Promise<void> {
  const prefs = {
    user_id: userId,
    theme: theme,
    sound_enabled: soundEnabled,
    updated_at: new Date().toISOString()
  };

  await setLocalData(`duo_pos_prefs_${userId}`, prefs);

  if (isOnline()) {
    try {
      await supabase.from('user_preferences').upsert(prefs, { onConflict: 'user_id' });
    } catch (e) {
      console.warn('⚠️ syncUserPreferences: Failed to save to Supabase, enqueuing.');
      addToPendingQueue({ table: 'user_preferences', action: 'upsert', data: prefs });
    }
  } else {
    addToPendingQueue({ table: 'user_preferences', action: 'upsert', data: prefs });
  }
}

export async function loadUserPreferences(userId: string): Promise<{ theme: string; sound_enabled: boolean } | null> {
  if (isOnline()) {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (!error && data) {
        await setLocalData(`duo_pos_prefs_${userId}`, data);
        return { theme: data.theme, sound_enabled: data.sound_enabled };
      }
    } catch (e) {
      console.warn('⚠️ loadUserPreferences: Error fetching from Supabase, using local fallback.');
    }
  }

  const cached = await getLocalData(`duo_pos_prefs_${userId}`);
  if (cached) {
    return { theme: cached.theme, sound_enabled: cached.sound_enabled };
  }
  return null;
}
