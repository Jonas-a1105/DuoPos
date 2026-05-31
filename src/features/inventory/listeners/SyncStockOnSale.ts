import { globalEventBus } from '../../../shared/events/EventBus';
import { SALES_EVENTS, type SaleCompletedPayload } from '../../sales';
import { powerSync } from '../../../database/powersyncClient';


/**
 * Inicializa los oyentes de eventos asíncronos del módulo de Inventario.
 * Escucha cuando una venta se completa y descuenta de forma transaccional el stock local en SQLite.
 */
export function initInventoryListeners(): () => void {
  console.log('👂 [INVENTARIO] Inicializando escuchadores de stock locales...');

  const unsubscribe = globalEventBus.subscribe<SaleCompletedPayload>(
    SALES_EVENTS.SALE_COMPLETED,
    async (payload) => {
      console.log(`⚡ [INVENTARIO] Procesando venta completada: ${payload.saleId}`);

      try {
        // Ejecución atómica y transaccional sobre SQLite local vía PowerSync
        await powerSync.writeTransaction(async (tx) => {
          for (const item of payload.items) {
            console.log(`📦 [STOCK] Descontando ${item.quantity} unidades del producto ID: ${item.productId}`);
            
            // Resta el stock en SQLite asegurando que nunca sea menor a 0
            await tx.execute(
              `UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?`,
              [item.quantity, item.productId]
            );
          }
        });
        console.log(`✅ [INVENTARIO] Stock actualizado exitosamente para venta: ${payload.saleId}`);
      } catch (err) {
        console.error('❌ [INVENTARIO] Error al actualizar existencias locales en SQLite:', err);
      }
    }
  );

  return unsubscribe;
}
