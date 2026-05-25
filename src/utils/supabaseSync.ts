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

// ─── UUID Generators & Validators for database compatibility ──────────────────
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function ensureValidUuid(id: string, prefix: 'prod' | 'cust' | 'chhist' | 'shift' | 'move' | 'txn'): string {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(id)) {
    return id;
  }

  // Deterministic mapping for default products
  if (prefix === 'prod') {
    if (id === 'prod-1') return '11111111-1111-4111-a111-111111111111';
    if (id === 'prod-2') return '22222222-2222-4222-a222-222222222222';
    if (id === 'prod-3') return '33333333-3333-4333-a333-333333333333';
    if (id === 'prod-4') return '44444444-4444-4444-a444-444444444444';
    if (id === 'prod-5') return '55555555-5555-4555-a555-555555555555';
    if (id === 'prod-6') return '66666666-6666-4666-a666-666666666666';
    if (id === 'prod-7') return '77777777-7777-4777-a777-777777777777';
    if (id === 'prod-8') return '88888888-8888-4888-a888-888888888888';
  }

  // Deterministic mapping for default customers
  if (prefix === 'cust') {
    if (id === 'cust-1') return 'c1111111-1111-4111-a111-111111111111';
    if (id === 'cust-2') return 'c2222222-2222-4222-a222-222222222222';
    if (id === 'cust-3') return 'c3333333-3333-4333-a333-333333333333';
    if (id === 'cust-4') return 'c4444444-4444-4444-a444-444444444444';
    if (id === 'cust-5') return 'c5555555-5555-4555-a555-555555555555';
  }

  // Fallback: Generate a random UUID
  return generateUUID();
}

// ─── MAPPER FUNCTIONS FOR PRODUCTS & CUSTOMERS ──────────────────────────────
export function mapProductToDb(p: any): any {
  return {
    id: ensureValidUuid(p.id, 'prod'),
    name: p.name,
    price: Number(p.price),
    cost: Number(p.cost),
    stock: Number(p.stock),
    category: p.category,
    emoji: p.emoji || '📦',
    description: p.description || '',
    barcode: p.barcode || null,
    min_stock: p.minStock !== undefined ? Number(p.minStock) : 5
  };
}

export function mapProductFromDb(db: any): any {
  return {
    id: db.id,
    name: db.name,
    price: Number(db.price),
    cost: Number(db.cost),
    stock: Number(db.stock),
    category: db.category,
    emoji: db.emoji || '📦',
    description: db.description || '',
    barcode: db.barcode || undefined,
    minStock: db.min_stock !== undefined ? Number(db.min_stock) : 5
  };
}

export function mapCustomerToDb(c: any): any {
  return {
    id: ensureValidUuid(c.id, 'cust'),
    name: c.name,
    phone: c.phone || null,
    email: c.email || null,
    gems: Number(c.gems || 0),
    purchases_count: Number(c.purchasesCount || 0),
    total_spent: Number(c.totalSpent || 0),
    league: c.league || 'Bronce',
    fiscal_name: c.fiscalName || null,
    tax_id: c.taxId || null,
    regime: c.regime || null,
    postal_code: c.postalCode || null,
    credit_limit: Number(c.creditLimit || 0),
    credit_used: Number(c.creditUsed || 0),
    registered_at: c.registeredAt || new Date().toISOString()
  };
}

export function mapCustomerFromDb(db: any): any {
  return {
    id: db.id,
    name: db.name,
    phone: db.phone || '',
    email: db.email || '',
    gems: Number(db.gems || 0),
    purchasesCount: Number(db.purchases_count || 0),
    totalSpent: Number(db.total_spent || 0),
    league: db.league || 'Bronce',
    fiscalName: db.fiscal_name || undefined,
    taxId: db.tax_id || undefined,
    regime: db.regime || undefined,
    postalCode: db.postal_code || undefined,
    creditLimit: Number(db.credit_limit || 0),
    creditUsed: Number(db.credit_used || 0),
    registeredAt: db.registered_at || new Date().toISOString()
  };
}

export function mapToDbRecord(table: string, item: any): any {
  if (table === 'products') return mapProductToDb(item);
  if (table === 'customers') return mapCustomerToDb(item);
  return item;
}

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
    id: generateUUID(),
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
  const prefix = table === 'products' ? 'prod' : table === 'customers' ? 'cust' : 'txn';

  const sanitizeAndMap = (rawItem: any): T => {
    const cleanId = ensureValidUuid(rawItem.id, prefix as any);
    let item = { ...rawItem, id: cleanId };

    if (table === 'products') {
      const mapped = 'price' in item ? mapProductFromDb(item) : item;
      return mapped as unknown as T;
    }

    if (table === 'customers') {
      const mapped = 'purchases_count' in item || 'total_spent' in item ? mapCustomerFromDb(item) : item;
      
      // Cargar historial de crédito offline si aplica
      if (mapped.id) {
        try {
          const allCreditsRaw = localStorage.getItem('duo_pos_customer_credits');
          if (allCreditsRaw) {
            const allCredits = JSON.parse(allCreditsRaw);
            const filteredCredits = allCredits.filter((h: any) => h.customer_id === mapped.id || h.customerId === mapped.id);
            mapped.creditHistory = filteredCredits.map((h: any) => ({
              id: ensureValidUuid(h.id, 'chhist'),
              amount: Number(h.amount),
              type: h.type,
              date: h.date || h.timestamp || new Date().toISOString(),
              notes: h.notes || '',
              transactionId: h.transaction_id || h.transactionId || null
            }));
          } else {
            mapped.creditHistory = mapped.creditHistory || [];
          }
        } catch {
          mapped.creditHistory = mapped.creditHistory || [];
        }
      }
      return mapped as unknown as T;
    }

    if (table === 'transactions') {
      const mapped = {
        id: item.id,
        date: item.date || item.created_at,
        subtotal: Number(item.subtotal),
        tax: Number(item.tax),
        discount: Number(item.discount),
        total: Number(item.total),
        paymentMethod: item.payment_method || 'cash',
        isMixedPayment: item.is_mixed_payment || false,
        mixedCashAmount: Number(item.mixed_cash_amount || 0),
        mixedCardAmount: Number(item.mixed_card_amount || 0),
        employeeName: item.employee_name || 'Cajero',
        xpGained: Number(item.xp_gained || 0),
        customerId: item.customer_id || undefined,
        gemsGained: Number(item.gems_gained || 0),
        tableId: item.table_id || undefined,
        tableName: item.table_name || undefined,
        waiterName: item.waiter_name || undefined,
        gemsRedeemed: Number(item.gems_redeemed || 0),
        isInvoiceRequested: item.is_invoice_requested || false,
        branchId: item.branch_id || undefined,
        registerId: item.register_id || undefined,
        cardPaymentDetails: item.card_payment_details || undefined,
        invoiceData: item.invoice_data || undefined,
        items: [] // Se llena al sincronizar online/offline
      };
      
      // Cargar items offline si aplica
      if (mapped.id) {
        try {
          const allItemsRaw = localStorage.getItem('duo_pos_transaction_items');
          if (allItemsRaw) {
            const allItems = JSON.parse(allItemsRaw);
            const parentItems = allItems.filter((i: any) => i.transaction_id === mapped.id || i.transactionId === mapped.id);
            mapped.items = parentItems.map((i: any) => ({
              productId: i.product_id || i.productId || '',
              name: i.name,
              price: Number(i.price),
              emoji: i.emoji || '📦',
              quantity: Number(i.quantity),
              taxRateApplied: Number(i.tax_rate_applied || i.taxRateApplied || 16.0),
              notes: i.notes || undefined,
              addons: i.addons || undefined
            }));
          }
        } catch {
          mapped.items = [];
        }
      }
      return mapped as unknown as T;
    }

    return item as T;
  };

  // 1. Intentar cargar de Supabase si está disponible
  if (isOnline()) {
    try {
      const selectStr = options?.select || '*';
      let query = supabase.from(table).select(selectStr);

      if (options?.orderBy) {
        query = query.order(options.orderBy, { ascending: options.ascending ?? true });
      }

      const { data, error } = await query;

      if (!error && data) {
        const mappedData = data.map(sanitizeAndMap);
        
        // Si estamos cargando clientes, intentar también precargar creditHistory de Supabase
        if (table === 'customers') {
          try {
            const { data: creditsData, error: creditsError } = await supabase
              .from('customer_credit_history')
              .select('*');
            
            if (!creditsError && creditsData) {
              localStorage.setItem('duo_pos_customer_credits', JSON.stringify(creditsData));
              mappedData.forEach((cust: any) => {
                const customerCredits = creditsData.filter((c: any) => c.customer_id === cust.id);
                cust.creditHistory = customerCredits.map((h: any) => ({
                  id: h.id,
                  amount: Number(h.amount),
                  type: h.type,
                  date: h.date,
                  notes: h.notes || '',
                  transactionId: h.transaction_id || null
                }));
              });
            }
          } catch (e) {
            console.warn('⚠️ Error al cargar historial de créditos de Supabase.', e);
          }
        }

        // Si estamos cargando transacciones, intentar también precargar items de Supabase
        if (table === 'transactions') {
          try {
            const { data: itemsData, error: itemsError } = await supabase
              .from('transaction_items')
              .select('*');
            
            if (!itemsError && itemsData) {
              localStorage.setItem('duo_pos_transaction_items', JSON.stringify(itemsData));
              mappedData.forEach((txn: any) => {
                const parentItems = itemsData.filter((i: any) => i.transaction_id === txn.id);
                txn.items = parentItems.map((i: any) => ({
                  productId: i.product_id || '',
                  name: i.name,
                  price: Number(i.price),
                  emoji: i.emoji || '📦',
                  quantity: Number(i.quantity),
                  taxRateApplied: Number(i.tax_rate_applied || 16.0),
                  notes: i.notes || undefined,
                  addons: i.addons || undefined
                }));
              });
            }
          } catch (e) {
            console.warn('⚠️ Error al cargar items de transacciones de Supabase.', e);
          }
        }

        // Guardar copia local como cache
        localStorage.setItem(localStorageKey, JSON.stringify(mappedData));
        return mappedData;
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
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map(sanitizeAndMap);
      }
    }
  } catch {
    console.warn(`⚠️ syncLoad(${table}): localStorage corrupto, usando datos por defecto.`);
  }

  // 3. Último recurso: datos por defecto
  const sanitizedDefault = defaultData.map(sanitizeAndMap);
  if (sanitizedDefault.length > 0) {
    localStorage.setItem(localStorageKey, JSON.stringify(sanitizedDefault));
  }
  return sanitizedDefault;
}

// Helper para sincronizar historial de créditos de un cliente
async function syncCreditHistory(customer: any): Promise<void> {
  if (!customer || !Array.isArray(customer.creditHistory)) return;

  const customerId = ensureValidUuid(customer.id, 'cust');

  for (const historyItem of customer.creditHistory) {
    const dbHistory = {
      id: ensureValidUuid(historyItem.id, 'chhist'),
      customer_id: customerId,
      amount: Number(historyItem.amount),
      type: historyItem.type,
      date: historyItem.date || new Date().toISOString(),
      notes: historyItem.notes || '',
      transaction_id: historyItem.transactionId ? ensureValidUuid(historyItem.transactionId, 'txn') : null
    };

    if (isOnline()) {
      try {
        await supabase.from('customer_credit_history').upsert(dbHistory);
      } catch {
        addToPendingQueue({ table: 'customer_credit_history', action: 'upsert', data: dbHistory });
      }
    } else {
      addToPendingQueue({ table: 'customer_credit_history', action: 'upsert', data: dbHistory });
    }
  }

  // Actualizar caché de créditos localmente
  try {
    const allCreditsRaw = localStorage.getItem('duo_pos_customer_credits');
    let allCredits = allCreditsRaw ? JSON.parse(allCreditsRaw) : [];
    
    const newIds = customer.creditHistory.map((h: any) => ensureValidUuid(h.id, 'chhist'));
    allCredits = allCredits.filter((h: any) => !newIds.includes(ensureValidUuid(h.id, 'chhist')));

    const mappedCredits = customer.creditHistory.map((h: any) => ({
      id: ensureValidUuid(h.id, 'chhist'),
      customer_id: customerId,
      amount: Number(h.amount),
      type: h.type,
      date: h.date || new Date().toISOString(),
      notes: h.notes || '',
      transaction_id: h.transactionId ? ensureValidUuid(h.transactionId, 'txn') : null
    }));

    allCredits.push(...mappedCredits);
    localStorage.setItem('duo_pos_customer_credits', JSON.stringify(allCredits));
  } catch (e) {
    console.error('Error guardando créditos locales', e);
  }
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

  // Sincronizar historial de créditos si es cliente
  if (table === 'customers') {
    await syncCreditHistory(changedItem);
  }

  // 2. Intentar sincronizar con Supabase
  if (isOnline()) {
    try {
      const dbRecord = options?.mapToDb ? options.mapToDb(changedItem) : mapToDbRecord(table, changedItem);

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
      const dbRecord = options?.mapToDb ? options.mapToDb(changedItem) : mapToDbRecord(table, changedItem);
      addToPendingQueue({ table, action: 'upsert', data: dbRecord });
      return { success: true, error: `Guardado localmente. Se sincronizará cuando vuelva la conexión.` };
    }
  }

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

  // Sincronizar historial de créditos si es cliente
  if (table === 'customers') {
    await syncCreditHistory(newItem);
  }

  // 2. Intentar subir a Supabase
  if (isOnline()) {
    try {
      const dbRecord = options?.mapToDb ? options.mapToDb(newItem) : mapToDbRecord(table, newItem);

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
      const dbRecord = options?.mapToDb ? options.mapToDb(newItem) : mapToDbRecord(table, newItem);
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
      const dbDeleteId = table === 'products' ? ensureValidUuid(deleteId, 'prod') : table === 'customers' ? ensureValidUuid(deleteId, 'cust') : deleteId;
      
      const { error } = await supabase
        .from(table)
        .delete()
        .eq(idField, dbDeleteId);

      if (error) {
        console.warn(`⚠️ syncDelete(${table}): Supabase falló, encolando.`, error.message);
        addToPendingQueue({ table, action: 'delete', data: { [idField]: dbDeleteId } });
        return { success: true, error: 'Eliminado localmente. Pendiente de sincronización.' };
      }

      return { success: true };
    } catch {
      const dbDeleteId = table === 'products' ? ensureValidUuid(deleteId, 'prod') : table === 'customers' ? ensureValidUuid(deleteId, 'cust') : deleteId;
      addToPendingQueue({ table, action: 'delete', data: { [idField]: dbDeleteId } });
      return { success: true, error: 'Sin conexión. Eliminado localmente.' };
    }
  }

  return { success: true };
}

// ─── REGISTRAR TRANSACCIÓN COMPLETA (Cabecera + Detalles) ────────────────────────
export async function syncInsertTransaction(
  txn: any,
  allTransactions: any[]
): Promise<{ success: boolean; error?: string }> {
  // 1. Guardar primero localmente en cache
  localStorage.setItem('duo_pos_transactions', JSON.stringify(allTransactions));

  // Actualizar también caché local de items
  try {
    const allItemsRaw = localStorage.getItem('duo_pos_transaction_items');
    let allItems = allItemsRaw ? JSON.parse(allItemsRaw) : [];
    
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
      addons: item.addons || null
    }));

    allItems.push(...mappedItems);
    localStorage.setItem('duo_pos_transaction_items', JSON.stringify(allItems));

    // 2. Mapear transacción para base de datos
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
      invoice_data: txn.invoiceData || null
    };

    // 3. Subir a Supabase
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
        const dbData = mapToDbRecord(op.table, op.data);
        const res = await supabase.from(op.table).upsert(dbData);
        error = res.error;
      } else if (op.action === 'insert') {
        const dbData = mapToDbRecord(op.table, op.data);
        const res = await supabase.from(op.table).insert(dbData);
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
