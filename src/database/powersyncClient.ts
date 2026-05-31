import {
  PowerSyncDatabase,
  PowerSyncBackendConnector,
  AbstractPowerSyncDatabase,
  UpdateType,
  WASQLiteOpenFactory,
} from '@powersync/web';
import { supabase } from '../config/supabaseClient';
import { AppSchema } from './powersyncSchema';

// ─── Conector de Sincronización para Supabase ─────────────────────────────────
// PowerSync gestiona automáticamente la bajada (Reads) mediante Sync Rules.
// Esta clase gestiona la subida (Writes) de mutaciones locales pendientes hacia Supabase.
class SupabaseConnector implements PowerSyncBackendConnector {
  // Obtiene las credenciales del usuario (el token JWT de Clerk inyectado en Supabase)
  async fetchCredentials() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // URL de la instancia de PowerSync Cloud
    const powersyncUrl = import.meta.env.VITE_POWERSYNC_URL || 'https://adutmgqcavxsvvowvjuf.powersync.app';

    if (!session) {
      return {
        endpoint: powersyncUrl,
        token: null,
      };
    }

    return {
      endpoint: powersyncUrl,
      token: session.access_token,
      userId: session.user.id,
    };
  }

  // Sube las mutaciones de escritura acumuladas localmente en SQLite a la nube
  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    const transaction = await database.getNextCrudTransaction();
    if (!transaction) return;

    let lastOpId = '';
    try {
      // Procesar cada operación de la transacción en el orden exacto en que ocurrieron
      for (const op of transaction.crud) {
        lastOpId = op.id.toString();
        const table = op.table;

        if (op.op === UpdateType.PUT) {
          // Operación de Inserción o Actualización (Upsert)
          const record: any = { id: op.id, ...op.opData };

          // Des-serializar campos JSON especiales si corresponde (como en daily_stats o app_settings)
          if (table === 'daily_stats' && typeof record.stats_json === 'string') {
            try {
              record.stats_json = JSON.parse(record.stats_json);
            } catch (e) {
              void e;
            }
          }
          if (table === 'app_settings' && typeof record.data === 'string') {
            try {
              record.data = JSON.parse(record.data);
            } catch (e) {
              void e;
            }
          }
          if (table === 'transactions') {
            if (typeof record.card_payment_details === 'string') {
              try {
                record.card_payment_details = JSON.parse(record.card_payment_details);
              } catch (e) {
                void e;
              }
            }
            if (typeof record.invoice_data === 'string') {
              try {
                record.invoice_data = JSON.parse(record.invoice_data);
              } catch (e) {
                void e;
              }
            }
          }

          const { error } = await supabase.from(table).upsert(record);
          if (error) throw error;
        } else if (op.op === UpdateType.DELETE) {
          // Operación de Eliminación
          const { error } = await supabase.from(table).delete().eq('id', op.id);
          if (error) throw error;
        }
      }

      // Confirmar a PowerSync que la transacción se subió con éxito para removerla de la cola local
      await (database as any).updateCrudTransaction((transaction as any).writeCheckpoint);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`❌ Error en conector PowerSync al subir cambios (última ID: ${lastOpId}):`, errMsg);
      // Re-lanzar el error le indica a PowerSync que mantenga la transacción en cola para reintentarla más tarde
      throw err;
    }
  }
}

// ─── Inicialización de Base de Datos SQLite WASM ──────────────────────────────
const factory = new WASQLiteOpenFactory({
  dbFilename: 'duopos.db',
});

export const powerSync = new PowerSyncDatabase({
  schema: AppSchema,
  database: factory,
});

export const connector = new SupabaseConnector();

let isInitialized = false;

export async function initPowerSync() {
  if (isInitialized) return;

  console.log('⚡ Inicializando cliente PowerSync (SQLite WASM)...');
  try {
    await powerSync.init();
    await powerSync.connect(connector);
    isInitialized = true;
    console.log('✅ PowerSync conectado y sincronizando.');
  } catch (err) {
    console.error('❌ Error al inicializar PowerSync:', err);
  }
}
