/**
 * supabaseSync.ts — Motor de sincronización Local-First para DuoPOS
 * 
 * Filosofía: localStorage PRIMERO (instantáneo, funciona offline),
 * Supabase DESPUÉS (persistencia en la nube cuando hay internet).
 * 
 * Si Supabase falla o no hay internet, los cambios se acumulan en una 
 * "cola de pendientes" y se sincronizan automáticamente cuando vuelve la conexión.
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';

// ─── Cola de operaciones pendientes ─────────────────────────────────────────────
const PENDING_QUEUE_KEY = 'duo_pos_sync_pending_queue';

interface PendingOperation {
  id: string;
  table: string;
  action: 'upsert' | 'insert' | 'delete';
  data: any;
  timestamp: number;
}

function getPendingQueue(): PendingOperation[] {
  try {
    const raw = localStorage.getItem(PENDING_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePendingQueue(queue: PendingOperation[]): void {
  localStorage.setItem(PENDING_QUEUE_KEY, JSON.stringify(queue));
}

function addToPendingQueue(op: Omit<PendingOperation, 'id' | 'timestamp'>): void {
  const queue = getPendingQueue();
  queue.push({
    ...op,
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    timestamp: Date.now(),
  });
  savePendingQueue(queue);
}

// ─── Verificar conectividad ─────────────────────────────────────────────────────
export function isOnline(): boolean {
  return navigator.onLine && isSupabaseConfigured();
}

// ─── CARGAR datos (Supabase con fallback a localStorage) ────────────────────────
export async function syncLoad<T>(
  table: string,
  localStorageKey: string,
  defaultData: T[],
  options?: {
    orderBy?: string;
    ascending?: boolean;
    select?: string;
  }
): Promise<T[]> {
  // 1. Intentar cargar de Supabase si está disponible
  if (isOnline()) {
    try {
      const selectStr = options?.select || '*';
      let query = supabase.from(table).select(selectStr);

      if (options?.orderBy) {
        query = query.order(options.orderBy, { ascending: options.ascending ?? true });
      }

      const { data, error } = await query;

      if (!error && data && data.length > 0) {
        // Guardar copia local como cache
        localStorage.setItem(localStorageKey, JSON.stringify(data));
        return data as T[];
      }

      if (error) {
        console.warn(`⚠️ syncLoad(${table}): Error de Supabase, usando caché local.`, error.message);
      }
    } catch (err) {
      console.warn(`⚠️ syncLoad(${table}): Sin conexión, usando caché local.`);
    }
  }

  // 2. Fallback: cargar de localStorage
  try {
    const raw = localStorage.getItem(localStorageKey);
    if (raw) {
      return JSON.parse(raw) as T[];
    }
  } catch {
    console.warn(`⚠️ syncLoad(${table}): localStorage corrupto, usando datos por defecto.`);
  }

  // 3. Último recurso: datos por defecto
  if (defaultData.length > 0) {
    localStorage.setItem(localStorageKey, JSON.stringify(defaultData));
  }
  return defaultData;
}

// ─── GUARDAR un registro (localStorage + Supabase) ──────────────────────────────
export async function syncSave<T extends Record<string, any>>(
  table: string,
  localStorageKey: string,
  allItems: T[],
  changedItem: T,
  options?: {
    idField?: string;
    mapToDb?: (item: T) => Record<string, any>;
  }
): Promise<{ success: boolean; error?: string }> {
  const idField = options?.idField || 'id';

  // 1. SIEMPRE guardar en localStorage primero (instantáneo)
  localStorage.setItem(localStorageKey, JSON.stringify(allItems));

  // 2. Intentar sincronizar con Supabase
  if (isOnline()) {
    try {
      const dbRecord = options?.mapToDb ? options.mapToDb(changedItem) : changedItem;

      const { error } = await supabase
        .from(table)
        .upsert(dbRecord, { onConflict: idField })
        .select()
        .maybeSingle();

      if (error) {
        console.warn(`⚠️ syncSave(${table}): Supabase falló, encolando para después.`, error.message);
        addToPendingQueue({ table, action: 'upsert', data: dbRecord });
        return { success: true, error: `Guardado localmente. Se sincronizará cuando vuelva la conexión.` };
      }

      return { success: true };
    } catch (err) {
      console.warn(`⚠️ syncSave(${table}): Sin conexión, encolando.`);
      const dbRecord = options?.mapToDb ? options.mapToDb(changedItem) : changedItem;
      addToPendingQueue({ table, action: 'upsert', data: dbRecord });
      return { success: true, error: `Guardado localmente. Se sincronizará cuando vuelva la conexión.` };
    }
  }

  // Sin Supabase configurado: solo localStorage (perfecto para modo offline)
  return { success: true };
}

// ─── INSERTAR un nuevo registro ─────────────────────────────────────────────────
export async function syncInsert<T extends Record<string, any>>(
  table: string,
  localStorageKey: string,
  allItems: T[],
  newItem: T,
  options?: {
    mapToDb?: (item: T) => Record<string, any>;
  }
): Promise<{ success: boolean; error?: string }> {
  // 1. Guardar en localStorage
  localStorage.setItem(localStorageKey, JSON.stringify(allItems));

  // 2. Intentar subir a Supabase
  if (isOnline()) {
    try {
      const dbRecord = options?.mapToDb ? options.mapToDb(newItem) : newItem;

      const { error } = await supabase
        .from(table)
        .insert(dbRecord)
        .select()
        .maybeSingle();

      if (error) {
        console.warn(`⚠️ syncInsert(${table}): Supabase falló, encolando.`, error.message);
        addToPendingQueue({ table, action: 'insert', data: dbRecord });
        return { success: true, error: 'Guardado localmente. Pendiente de sincronización.' };
      }

      return { success: true };
    } catch {
      const dbRecord = options?.mapToDb ? options.mapToDb(newItem) : newItem;
      addToPendingQueue({ table, action: 'insert', data: dbRecord });
      return { success: true, error: 'Sin conexión. Guardado localmente.' };
    }
  }

  return { success: true };
}

// ─── ELIMINAR un registro ───────────────────────────────────────────────────────
export async function syncDelete(
  table: string,
  localStorageKey: string,
  allItems: any[],
  deleteId: string,
  options?: {
    idField?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const idField = options?.idField || 'id';

  // 1. Guardar lista actualizada en localStorage
  localStorage.setItem(localStorageKey, JSON.stringify(allItems));

  // 2. Intentar eliminar en Supabase
  if (isOnline()) {
    try {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq(idField, deleteId);

      if (error) {
        console.warn(`⚠️ syncDelete(${table}): Supabase falló, encolando.`, error.message);
        addToPendingQueue({ table, action: 'delete', data: { [idField]: deleteId } });
        return { success: true, error: 'Eliminado localmente. Pendiente de sincronización.' };
      }

      return { success: true };
    } catch {
      addToPendingQueue({ table, action: 'delete', data: { [idField]: deleteId } });
      return { success: true, error: 'Sin conexión. Eliminado localmente.' };
    }
  }

  return { success: true };
}

// ─── SINCRONIZAR cola de pendientes (ejecutar cuando vuelva internet) ───────────
export async function flushPendingQueue(): Promise<{ synced: number; failed: number }> {
  if (!isOnline()) return { synced: 0, failed: 0 };

  const queue = getPendingQueue();
  if (queue.length === 0) return { synced: 0, failed: 0 };

  console.log(`🔄 Sincronizando ${queue.length} operaciones pendientes...`);

  let synced = 0;
  let failed = 0;
  const remainingQueue: PendingOperation[] = [];

  for (const op of queue) {
    try {
      let error: any = null;

      if (op.action === 'upsert') {
        const res = await supabase.from(op.table).upsert(op.data);
        error = res.error;
      } else if (op.action === 'insert') {
        const res = await supabase.from(op.table).insert(op.data);
        error = res.error;
      } else if (op.action === 'delete') {
        const idField = Object.keys(op.data)[0];
        const res = await supabase.from(op.table).delete().eq(idField, op.data[idField]);
        error = res.error;
      }

      if (error) {
        console.warn(`⚠️ flush: Falló operación en ${op.table}:`, error.message);
        remainingQueue.push(op);
        failed++;
      } else {
        synced++;
      }
    } catch {
      remainingQueue.push(op);
      failed++;
    }
  }

  savePendingQueue(remainingQueue);
  console.log(`✅ Sincronización completada: ${synced} exitosas, ${failed} pendientes.`);

  return { synced, failed };
}

// ─── Escuchar reconexión a internet para auto-sincronizar ───────────────────────
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('🌐 Conexión detectada. Sincronizando pendientes...');
    flushPendingQueue();
  });
}
