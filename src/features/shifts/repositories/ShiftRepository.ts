import { ensureValidUuid, setLocalData, getLocalData, isOnline, addToPendingQueue, mapShiftToDb, mapMovementToDb } from '../../../shared/services/DataSync';
import { supabase } from '../../../config/supabaseClient';
import { db } from '../../../database/db';

export async function syncSaveShift(
  shift: any,
  isActive: boolean,
  allHistory: any[] = [],
): Promise<{ success: boolean; error?: string }> {
  if (isActive) {
    await setLocalData('duo_pos_active_shift', shift);
  } else {
    try {
      await db.generic_store.delete('duo_pos_active_shift');
    } catch (e) {
      void e;
    }
    try {
      localStorage.removeItem('duo_pos_active_shift');
    } catch (e) {
      void e;
    }
    await setLocalData('duo_pos_shift_history', allHistory);
  }

  const dbShiftId = ensureValidUuid(shift.id, 'shift');

  try {
    let allMoves = (await getLocalData('duo_pos_shift_movements')) || [];

    const mappedMoves = (shift.movements || []).map((m: any) => mapMovementToDb(m, dbShiftId));

    const newMoveIds = mappedMoves.map((m: any) => m.id);
    allMoves = allMoves.filter((m: any) => m.shift_id !== dbShiftId && !newMoveIds.includes(m.id));
    allMoves.push(...mappedMoves);
    await setLocalData('duo_pos_shift_movements', allMoves);

    const dbShift = mapShiftToDb(shift);

    if (isOnline()) {
      try {
        const { error: shiftError } = await supabase.from('cash_shifts').upsert(dbShift);
        if (shiftError) throw shiftError;

        if (mappedMoves.length > 0) {
          const { error: movesError } = await supabase.from('cash_movements').upsert(mappedMoves);
          if (movesError) throw movesError;
        }
        return { success: true };
      } catch (err: any) {
        console.warn('⚠️ syncSaveShift: Supabase falló, encolando.', err.message);
        addToPendingQueue({ table: 'cash_shifts', action: 'upsert', data: dbShift });
        mappedMoves.forEach((m: any) => {
          addToPendingQueue({ table: 'cash_movements', action: 'upsert', data: m });
        });
        return { success: true, error: 'Guardado localmente. Pendiente de sincronización.' };
      }
    } else {
      addToPendingQueue({ table: 'cash_shifts', action: 'upsert', data: dbShift });
      mappedMoves.forEach((m: any) => {
        addToPendingQueue({ table: 'cash_movements', action: 'upsert', data: m });
      });
      return { success: true, error: 'Sin conexión. Guardado localmente.' };
    }
  } catch (e: any) {
    console.error('Error procesando turno de caja', e);
    return { success: false, error: e.message };
  }
}
