/**
 * supabaseSync.ts — Barrel de exportación (backward compatible)
 *
 * Re-exporta toda la funcionalidad desde los módulos fragmentados:
 * - DataSync.ts → infraestructura compartida (syncLoad, syncSave, etc.)
 * - Repositorios por feature → lógica de negocio específica
 *
 * Este archivo se mantiene para no romper imports existentes.
 * Los consumidores nuevos deben importar directamente de:
 *   src/shared/services/DataSync
 *   src/features/<module>/repositories/<Name>Repository
 */

export {
  // ─── Storage ──────────────────────────────────────────────────────────
  getLocalData,
  setLocalData,

  // ─── UUID ──────────────────────────────────────────────────────────────
  generateUUID,
  ensureValidUuid,

  // ─── Mapeo DB ↔ App ────────────────────────────────────────────────────
  mapProductToDb,
  mapProductFromDb,
  mapCustomerToDb,
  mapCustomerFromDb,
  mapSupplierToDb,
  mapSupplierFromDb,
  mapPurchaseOrderToDb,
  mapPurchaseOrderFromDb,
  mapShiftToDb,
  mapShiftFromDb,
  mapMovementToDb,
  mapMovementFromDb,
  mapBranchToDb,
  mapRegisterToDb,
  mapRegisterFromDb,
  mapToDbRecord,

  // ─── Conectividad ───────────────────────────────────────────────────────
  isOnline,

  // ─── CRUD Genérico ─────────────────────────────────────────────────────
  syncLoad,
  syncSave,
  syncInsert,
  syncDelete,

  // ─── Cola de sincronización ────────────────────────────────────────────
  flushPendingQueue,

  // ─── Utilidades ─────────────────────────────────────────────────────────
  pruneOldLocalStorage,
} from '../shared/services/DataSync';

export {
  syncInsertTransaction,
} from '../features/sales/repositories/TransactionRepository';

export {
  syncSaveShift,
} from '../features/shifts/repositories/ShiftRepository';

export {
  syncSavePurchaseOrder,
} from '../features/inventory/repositories/PurchaseOrderRepository';

export {
  syncSaveStockTransfer,
} from '../features/logistics/repositories/StockTransferRepository';

export {
  syncDailyStats,
} from '../features/dashboard/repositories/DailyStatsRepository';

export {
  syncUserPreferences,
  loadUserPreferences,
} from '../features/settings/repositories/UserPreferencesRepository';

// ─── Escuchar reconexión a internet para auto-sincronizar ───────────────────────
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('🌐 Conexión detectada. Sincronizando pendientes...');
    // Lazy import to avoid circular deps
    import('../shared/services/DataSync').then(({ flushPendingQueue }) => {
      flushPendingQueue();
    });
  });
}
