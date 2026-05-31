import { generateUUID, ensureValidUuid, setLocalData, getLocalData, isOnline, addToPendingQueue } from '../../../shared/services/DataSync';
import { supabase } from '../../../config/supabaseClient';

export async function syncInsertTransaction(
  txn: any,
  allTransactions: any[],
): Promise<{ success: boolean; error?: string }> {
  await setLocalData('duo_pos_transactions', allTransactions);

  try {
    const allItems = (await getLocalData('duo_pos_transaction_items')) || [];

    const dbTxnId = ensureValidUuid(txn.id, 'txn');
    const mappedItems = txn.items.map((item: any) => ({
      id: generateUUID(),
      transaction_id: dbTxnId,
      product_id: item.productId ? ensureValidUuid(item.productId, 'prod') : null,
      name: item.name,
      price: Number(item.price),
      emoji: item.emoji || '📦',
      quantity: Number(item.quantity),
      tax_rate_applied: item.taxRateApplied !== undefined ? Number(item.taxRateApplied) : 16.0,
      notes: item.notes || null,
      addons: item.addons || null,
    }));

    allItems.push(...mappedItems);
    await setLocalData('duo_pos_transaction_items', allItems);

    const dbTxn = {
      id: dbTxnId,
      date: txn.date || new Date().toISOString(),
      subtotal: Number(txn.subtotal),
      tax: Number(txn.tax),
      discount: Number(txn.discount),
      total: Number(txn.total),
      payment_method: txn.paymentMethod,
      is_mixed_payment: txn.isMixedPayment || false,
      mixed_cash_amount: txn.mixedCashAmount !== undefined ? Number(txn.mixedCashAmount) : 0.0,
      mixed_card_amount: txn.mixedCardAmount !== undefined ? Number(txn.mixedCardAmount) : 0.0,
      employee_id: null,
      employee_name: txn.employeeName || 'Cajero',
      xp_gained: Number(txn.xpGained || 0),
      customer_id: txn.customerId ? ensureValidUuid(txn.customerId, 'cust') : null,
      gems_gained: Number(txn.gemsGained || 0),
      table_id: txn.tableId || null,
      table_name: txn.tableName || null,
      waiter_name: txn.waiterName || null,
      gems_redeemed: Number(txn.gemsRedeemed || 0),
      is_invoice_requested: txn.isInvoiceRequested || false,
      branch_id: txn.branchId || null,
      register_id: txn.registerId || null,
      card_payment_details: txn.cardPaymentDetails || null,
      invoice_data: txn.invoiceData || null,
    };

    if (isOnline()) {
      try {
        const { error: txnError } = await supabase.from('transactions').insert(dbTxn);
        if (txnError) throw txnError;

        if (mappedItems.length > 0) {
          const { error: itemsError } = await supabase.from('transaction_items').insert(mappedItems);
          if (itemsError) throw itemsError;
        }
        return { success: true };
      } catch (err: any) {
        console.warn('⚠️ syncInsertTransaction: Supabase falló, encolando.', err.message);
        addToPendingQueue({ table: 'transactions', action: 'insert', data: dbTxn });
        mappedItems.forEach((i: any) => {
          addToPendingQueue({ table: 'transaction_items', action: 'insert', data: i });
        });
        return { success: true, error: 'Guardado localmente. Pendiente de sincronización.' };
      }
    } else {
      addToPendingQueue({ table: 'transactions', action: 'insert', data: dbTxn });
      mappedItems.forEach((i: any) => {
        addToPendingQueue({ table: 'transaction_items', action: 'insert', data: i });
      });
      return { success: true, error: 'Sin conexión. Guardado localmente.' };
    }
  } catch (e: any) {
    console.error('Error procesando transacción', e);
    return { success: false, error: e.message };
  }
}
