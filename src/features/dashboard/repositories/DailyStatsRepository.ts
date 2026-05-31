import { isOnline, addToPendingQueue } from '../../../shared/services/DataSync';
import { supabase } from '../../../config/supabaseClient';

export async function syncDailyStats(todayStr: string, stats: any): Promise<void> {
  const localKey = `duo_pos_daily_acts_${todayStr}`;
  localStorage.setItem(localKey, JSON.stringify(stats));

  const dbData = {
    day_date: todayStr,
    stats_json: stats,
    updated_at: new Date().toISOString()
  };

  if (isOnline()) {
    try {
      await supabase.from('daily_stats').upsert(dbData, { onConflict: 'day_date' });
    } catch (e) {
      console.warn('⚠️ syncDailyStats: Failed to save to Supabase, offline queue fallback.');
      addToPendingQueue({ table: 'daily_stats', action: 'upsert', data: dbData });
    }
  } else {
    addToPendingQueue({ table: 'daily_stats', action: 'upsert', data: dbData });
  }
}
