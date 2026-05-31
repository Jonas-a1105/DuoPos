import { generateUUID, ensureValidUuid, setLocalData, getLocalData, isOnline, addToPendingQueue, mapPurchaseOrderToDb } from '../../../shared/services/DataSync';
import { supabase } from '../../../config/supabaseClient';

export async function syncSavePurchaseOrder(
  po: any,
  allPurchaseOrders: any[],
): Promise<{ success: boolean; error?: string }> {
  await setLocalData('duo_pos_purchase_orders', allPurchaseOrders);

  const dbPoId = po.id;

  try {
    let allItems = (await getLocalData('duo_pos_purchase_order_items')) || [];

    const mappedItems = (po.items || []).map((item: any) => ({
      id: generateUUID(),
      purchase_order_id: dbPoId,
      product_id: item.productId ? ensureValidUuid(item.productId, 'prod') : null,
      name: item.name,
      emoji: item.emoji || '📦',
      cost: Number(item.cost),
      quantity: Number(item.quantity),
    }));

    allItems = allItems.filter((i: any) => i.purchase_order_id !== dbPoId);
    allItems.push(...mappedItems);
    await setLocalData('duo_pos_purchase_order_items', allItems);

    const dbPo = mapPurchaseOrderToDb(po);

    if (isOnline()) {
      try {
        const { error: poError } = await supabase.from('purchase_orders').upsert(dbPo);
        if (poError) throw poError;

        await supabase.from('purchase_order_items').delete().eq('purchase_order_id', dbPoId);

        if (mappedItems.length > 0) {
          const { error: itemsError } = await supabase.from('purchase_order_items').insert(mappedItems);
          if (itemsError) throw itemsError;
        }
        return { success: true };
      } catch (err: any) {
        console.warn('⚠️ syncSavePurchaseOrder: Supabase falló, encolando.', err.message);
        addToPendingQueue({ table: 'purchase_orders', action: 'upsert', data: dbPo });
        mappedItems.forEach((i: any) => {
          addToPendingQueue({ table: 'purchase_order_items', action: 'insert', data: i });
        });
        return { success: true, error: 'Guardado localmente. Pendiente de sincronización.' };
      }
    } else {
      addToPendingQueue({ table: 'purchase_orders', action: 'upsert', data: dbPo });
      mappedItems.forEach((i: any) => {
        addToPendingQueue({ table: 'purchase_order_items', action: 'insert', data: i });
      });
      return { success: true, error: 'Sin conexión. Guardado localmente.' };
    }
  } catch (e: any) {
    console.error('Error procesando orden de compra', e);
    return { success: false, error: e.message };
  }
}
