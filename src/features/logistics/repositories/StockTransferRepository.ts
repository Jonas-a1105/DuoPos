import { generateUUID, ensureValidUuid, setLocalData, getLocalData, isOnline, addToPendingQueue } from '../../../shared/services/DataSync';
import { supabase } from '../../../config/supabaseClient';

export async function syncSaveStockTransfer(
  transfer: any,
  allTransfers: any[],
): Promise<{ success: boolean; error?: string }> {
  await setLocalData('duo_pos_stock_transfers', allTransfers);

  const dbTransferId = ensureValidUuid(transfer.id, 'txn');

  try {
    let allItems = (await getLocalData('duo_pos_stock_transfer_items')) || [];

    const mappedItems = (transfer.items || []).map((item: any) => ({
      id: generateUUID(),
      transfer_id: dbTransferId,
      product_id: item.productId ? ensureValidUuid(item.productId, 'prod') : null,
      name: item.name,
      emoji: item.emoji || '📦',
      quantity: Number(item.quantity),
    }));

    allItems = allItems.filter((i: any) => i.transfer_id !== dbTransferId);
    allItems.push(...mappedItems);
    await setLocalData('duo_pos_stock_transfer_items', allItems);

    const dbTransfer = {
      id: dbTransferId,
      from_branch_id: transfer.fromBranchId,
      to_branch_id: transfer.toBranchId,
      status: transfer.status,
      created_at: transfer.createdAt || new Date().toISOString(),
      shipped_at: transfer.shippedAt || null,
      received_at: transfer.receivedAt || null,
      notes: transfer.notes || '',
      carrier: transfer.carrier || '',
    };

    if (isOnline()) {
      try {
        const { error: trError } = await supabase.from('stock_transfers').upsert(dbTransfer);
        if (trError) throw trError;

        if (mappedItems.length > 0) {
          const { error: itemsError } = await supabase.from('stock_transfer_items').upsert(mappedItems);
          if (itemsError) throw itemsError;
        }
        return { success: true };
      } catch (err: any) {
        console.warn('⚠️ syncSaveStockTransfer: Supabase falló, encolando.', err.message);
        addToPendingQueue({ table: 'stock_transfers', action: 'upsert', data: dbTransfer });
        mappedItems.forEach((i: any) => {
          addToPendingQueue({ table: 'stock_transfer_items', action: 'upsert', data: i });
        });
        return { success: true, error: 'Guardado localmente. Pendiente de sincronización.' };
      }
    } else {
      addToPendingQueue({ table: 'stock_transfers', action: 'upsert', data: dbTransfer });
      mappedItems.forEach((i: any) => {
        addToPendingQueue({ table: 'stock_transfer_items', action: 'upsert', data: i });
      });
      return { success: true, error: 'Sin conexión. Guardado localmente.' };
    }
  } catch (e: any) {
    console.error('Error procesando traspaso', e);
    return { success: false, error: e.message };
  }
}
