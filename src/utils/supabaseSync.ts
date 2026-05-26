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

// Concurrency lock to prevent duplicate sync executions
let isFlushing = false;

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

// ─── MAPPER FUNCTIONS FOR SUPPLIERS & PURCHASE ORDERS ────────────────────────
export function mapSupplierToDb(s: any): any {
  return {
    id: s.id,
    name: s.name,
    contact: s.contact || '',
    phone: s.phone || '',
    email: s.email || '',
    category: s.category || '',
    address: s.address || '',
    delivery_days: s.deliveryDays !== undefined ? Number(s.deliveryDays) : 2,
    reliability: s.reliability !== undefined ? Number(s.reliability) : 90,
    balance: s.balance !== undefined ? Number(s.balance) : 0
  };
}

export function mapSupplierFromDb(db: any): any {
  return {
    id: db.id,
    name: db.name,
    contact: db.contact || '',
    phone: db.phone || '',
    email: db.email || '',
    category: db.category || '',
    address: db.address || '',
    deliveryDays: db.delivery_days !== undefined ? Number(db.delivery_days) : 2,
    reliability: db.reliability !== undefined ? Number(db.reliability) : 90,
    balance: db.balance !== undefined ? Number(db.balance) : 0
  };
}

export function mapPurchaseOrderToDb(po: any): any {
  return {
    id: po.id,
    supplier_id: po.supplierId || null,
    supplier_name: po.supplierName || '',
    subtotal: Number(po.subtotal),
    tax: Number(po.tax),
    total: Number(po.total),
    payment_method: po.paymentMethod || 'cash',
    status: po.status || 'draft',
    created_at: po.createdAt || new Date().toISOString(),
    estimated_delivery: po.estimatedDelivery || null,
    received_at: po.receivedAt || null,
    carrier: po.carrier || ''
  };
}

export function mapPurchaseOrderFromDb(db: any): any {
  return {
    id: db.id,
    supplierId: db.supplier_id || '',
    supplierName: db.supplier_name || '',
    subtotal: Number(db.subtotal),
    tax: Number(db.tax),
    total: Number(db.total),
    paymentMethod: db.payment_method || 'cash',
    status: db.status || 'draft',
    createdAt: db.created_at || new Date().toISOString(),
    estimatedDelivery: db.estimated_delivery || '',
    receivedAt: db.received_at || undefined,
    carrier: db.carrier || '',
    items: []
  };
}

// ─── MAPPER FUNCTIONS FOR CASH SHIFTS & MOVEMENTS ────────────────────────────
export function mapShiftToDb(s: any): any {
  return {
    id: ensureValidUuid(s.id, 'shift'),
    employee_id: s.employeeId ? s.employeeId : null,
    employee_name: s.employeeName,
    opening_time: s.openingTime || new Date().toISOString(),
    closing_time: s.closingTime || null,
    initial_cash: Number(s.initialCash),
    expected_cash: Number(s.expectedCash),
    actual_cash: s.actualCash !== undefined && s.actualCash !== null ? Number(s.actualCash) : null,
    difference: s.difference !== undefined && s.difference !== null ? Number(s.difference) : null,
    status: s.status,
    sales_count: Number(s.salesCount || 0),
    sales_volume: Number(s.salesVolume || 0),
    branch_id: s.branchId || null,
    register_id: s.registerId || null
  };
}

export function mapShiftFromDb(db: any): any {
  return {
    id: db.id,
    employeeId: db.employee_id,
    employeeName: db.employee_name,
    openingTime: db.opening_time,
    closingTime: db.closing_time || undefined,
    initialCash: Number(db.initial_cash),
    expectedCash: Number(db.expected_cash),
    actualCash: db.actual_cash !== null ? Number(db.actual_cash) : undefined,
    difference: db.difference !== null ? Number(db.difference) : undefined,
    status: db.status,
    salesCount: Number(db.sales_count || 0),
    salesVolume: Number(db.sales_volume || 0),
    branchId: db.branch_id || undefined,
    registerId: db.register_id || undefined,
    movements: [] // Stitch loading maps this
  };
}

export function mapMovementToDb(m: any, shiftId: string): any {
  return {
    id: ensureValidUuid(m.id, 'move'),
    shift_id: ensureValidUuid(shiftId, 'shift'),
    type: m.type,
    amount: Number(m.amount),
    reason: m.reason || '',
    timestamp: m.timestamp || new Date().toISOString()
  };
}

export function mapMovementFromDb(db: any): any {
  return {
    id: db.id,
    type: db.type,
    amount: Number(db.amount),
    reason: db.reason || '',
    timestamp: db.timestamp || db.created_at || new Date().toISOString()
  };
}

// ─── MAPPER FUNCTIONS FOR BRANCHES & REGISTERS ────────────────────────────────
export function mapBranchToDb(b: any): any {
  return {
    id: b.id,
    name: b.name,
    type: b.type || 'branch',
    emoji: b.emoji || '🏪',
    address: b.address || '',
    city: b.city || ''
  };
}

export function mapRegisterToDb(r: any): any {
  return {
    id: r.id,
    branch_id: r.branchId,
    name: r.name,
    emoji: r.emoji || '📟',
    status: r.status || 'active'
  };
}

export function mapRegisterFromDb(db: any): any {
  return {
    id: db.id,
    branchId: db.branch_id,
    name: db.name,
    emoji: db.emoji || '📟',
    status: db.status || 'active'
  };
}

export function mapToDbRecord(table: string, item: any): any {
  if (table === 'products') return mapProductToDb(item);
  if (table === 'customers') return mapCustomerToDb(item);
  if (table === 'branches') return mapBranchToDb(item);
  if (table === 'cash_registers') return mapRegisterToDb(item);
  if (table === 'suppliers') return mapSupplierToDb(item);
  if (table === 'purchase_orders') return mapPurchaseOrderToDb(item);
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
  const prefix = table === 'products' ? 'prod' : table === 'customers' ? 'cust' : table === 'cash_shifts' ? 'shift' : 'txn';

  const sanitizeAndMap = (rawItem: any): T => {
    // Si la tabla no requiere UUIDs estrictos en Postgres (ej. text IDs para branches/registers/suppliers/purchase_orders), no usar ensureValidUuid
    let cleanId = rawItem.id;
    if (table !== 'branches' && table !== 'cash_registers' && table !== 'settings' && table !== 'suppliers' && table !== 'purchase_orders') {
      cleanId = ensureValidUuid(rawItem.id, prefix as any);
    }
    let item = { ...rawItem, id: cleanId };

    if (table === 'products') {
      const mapped = 'price' in item ? mapProductFromDb(item) : item;
      return mapped as unknown as T;
    }

    if (table === 'customers') {
      const mapped = 'purchases_count' in item || 'total_spent' in item ? mapCustomerFromDb(item) : item;
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
        items: []
      };
      
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

    if (table === 'cash_shifts') {
      const mapped = 'initial_cash' in item ? mapShiftFromDb(item) : item;
      
      if (mapped.id) {
        try {
          const allMovesRaw = localStorage.getItem('duo_pos_shift_movements');
          if (allMovesRaw) {
            const allMoves = JSON.parse(allMovesRaw);
            const parentMoves = allMoves.filter((m: any) => m.shift_id === mapped.id || m.shiftId === mapped.id);
            mapped.movements = parentMoves.map(mapMovementFromDb);
          } else {
            mapped.movements = mapped.movements || [];
          }
        } catch {
          mapped.movements = mapped.movements || [];
        }
      }
      return mapped as unknown as T;
    }

    if (table === 'cash_registers') {
      const mapped = 'branch_id' in item ? mapRegisterFromDb(item) : item;
      return mapped as unknown as T;
    }

    if (table === 'stock_transfers') {
      const mapped = {
        id: item.id,
        fromBranchId: item.from_branch_id,
        fromBranchName: '',
        toBranchId: item.to_branch_id,
        toBranchName: '',
        status: item.status,
        createdAt: item.created_at || item.createdAt,
        shippedAt: item.shipped_at || undefined,
        receivedAt: item.received_at || undefined,
        notes: item.notes || '',
        carrier: item.carrier || '',
        items: []
      };

      if (mapped.id) {
        try {
          const allItemsRaw = localStorage.getItem('duo_pos_stock_transfer_items');
          if (allItemsRaw) {
            const allItems = JSON.parse(allItemsRaw);
            const parentItems = allItems.filter((i: any) => i.transfer_id === mapped.id || i.transferId === mapped.id);
            mapped.items = parentItems.map((i: any) => ({
              productId: i.product_id || i.productId || '',
              name: i.name,
              emoji: i.emoji || '📦',
              quantity: Number(i.quantity)
            }));
          }
        } catch {
          mapped.items = [];
        }
      }
      return mapped as unknown as T;
    }

    if (table === 'suppliers') {
      const mapped = 'delivery_days' in item || 'reliability' in item ? mapSupplierFromDb(item) : item;
      return mapped as unknown as T;
    }

    if (table === 'purchase_orders') {
      const mapped = 'payment_method' in item || 'supplier_name' in item ? mapPurchaseOrderFromDb(item) : item;
      
      if (mapped.id) {
        try {
          const allItemsRaw = localStorage.getItem('duo_pos_purchase_order_items');
          if (allItemsRaw) {
            const allItems = JSON.parse(allItemsRaw);
            const parentItems = allItems.filter((i: any) => i.purchase_order_id === mapped.id || i.purchaseOrderId === mapped.id);
            mapped.items = parentItems.map((i: any) => ({
              productId: i.product_id || i.productId || '',
              name: i.name,
              emoji: i.emoji || '📦',
              cost: Number(i.cost),
              quantity: Number(i.quantity)
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
        let mappedData = data.map(sanitizeAndMap);

        // Fusión inteligente con la cola de operaciones pendientes localmente
        const localPending = getPendingQueue().filter(op => op.table === table);
        if (localPending.length > 0) {
          localPending.forEach(op => {
            if (op.action === 'delete') {
              const deleteId = op.data.id || op.data[Object.keys(op.data)[0]];
              mappedData = mappedData.filter((item: any) => item.id !== deleteId);
            } else {
              const pendingMapped = sanitizeAndMap(op.data) as any;
              const index = mappedData.findIndex((item: any) => item.id === pendingMapped.id);
              if (index >= 0) {
                mappedData[index] = { ...mappedData[index], ...pendingMapped };
              } else {
                mappedData.push(pendingMapped);
              }
            }
          });
        }
        
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

        // Si estamos cargando turnos, intentar también precargar movimientos de Supabase
        if (table === 'cash_shifts') {
          try {
            const { data: movesData, error: movesError } = await supabase
              .from('cash_movements')
              .select('*');
            
            if (!movesError && movesData) {
              localStorage.setItem('duo_pos_shift_movements', JSON.stringify(movesData));
              mappedData.forEach((shift: any) => {
                const parentMoves = movesData.filter((m: any) => m.shift_id === shift.id);
                shift.movements = parentMoves.map(mapMovementFromDb);
              });
            }
          } catch (e) {
            console.warn('⚠️ Error al cargar movimientos de caja de Supabase.', e);
          }
        }

        // Si estamos cargando traspasos de stock, precargar items de Supabase
        if (table === 'stock_transfers') {
          try {
            const { data: stItemsData, error: stItemsError } = await supabase
              .from('stock_transfer_items')
              .select('*');
            
            if (!stItemsError && stItemsData) {
              localStorage.setItem('duo_pos_stock_transfer_items', JSON.stringify(stItemsData));
              mappedData.forEach((tr: any) => {
                const parentItems = stItemsData.filter((i: any) => i.transfer_id === tr.id);
                tr.items = parentItems.map((i: any) => ({
                  productId: i.product_id || '',
                  name: i.name,
                  emoji: i.emoji || '📦',
                  quantity: Number(i.quantity)
                }));
              });
            }
          } catch (e) {
            console.warn('⚠️ Error al cargar items de traspasos de Supabase.', e);
          }
        }

        // Si estamos cargando órdenes de compra, precargar items de Supabase
        if (table === 'purchase_orders') {
          try {
            const { data: poItemsData, error: poItemsError } = await supabase
              .from('purchase_order_items')
              .select('*');
            
            if (!poItemsError && poItemsData) {
              localStorage.setItem('duo_pos_purchase_order_items', JSON.stringify(poItemsData));
              mappedData.forEach((po: any) => {
                const parentItems = poItemsData.filter((i: any) => i.purchase_order_id === po.id);
                po.items = parentItems.map((i: any) => ({
                  productId: i.product_id || '',
                  name: i.name,
                  emoji: i.emoji || '📦',
                  cost: Number(i.cost),
                  quantity: Number(i.quantity)
                }));
              });
            }
          } catch (e) {
            console.warn('⚠️ Error al cargar items de órdenes de compra de Supabase.', e);
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
async function syncCreditHistory(customer: any, isParentSynced: boolean): Promise<void> {
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

    if (isOnline() && isParentSynced) {
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

  localStorage.setItem(localStorageKey, JSON.stringify(allItems));

  let dbRecord: any = null;
  let isParentSynced = false;
  let syncError: string | undefined = undefined;

  if (isOnline()) {
    try {
      dbRecord = options?.mapToDb ? options.mapToDb(changedItem) : mapToDbRecord(table, changedItem);

      const { error } = await supabase
        .from(table)
        .upsert(dbRecord, { onConflict: idField })
        .select()
        .maybeSingle();

      if (error) {
        console.warn(`⚠️ syncSave(${table}): Supabase falló, encolando para después.`, error.message);
        addToPendingQueue({ table, action: 'upsert', data: dbRecord });
        syncError = `Guardado localmente. Se sincronizará cuando vuelva la conexión.`;
      } else {
        isParentSynced = true;
      }
    } catch (err) {
      console.warn(`⚠️ syncSave(${table}): Sin conexión, encolando.`);
      dbRecord = options?.mapToDb ? options.mapToDb(changedItem) : mapToDbRecord(table, changedItem);
      addToPendingQueue({ table, action: 'upsert', data: dbRecord });
      syncError = `Guardado localmente. Se sincronizará cuando vuelva la conexión.`;
    }
  } else {
    dbRecord = options?.mapToDb ? options.mapToDb(changedItem) : mapToDbRecord(table, changedItem);
    addToPendingQueue({ table, action: 'upsert', data: dbRecord });
  }

  // Sincronizar historial de créditos DESPUÉS de haber guardado al cliente para evitar violación de FK
  if (table === 'customers') {
    await syncCreditHistory(changedItem, isParentSynced);
  }

  return { success: true, error: syncError };
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
  localStorage.setItem(localStorageKey, JSON.stringify(allItems));

  let dbRecord: any = null;
  let isParentSynced = false;
  let syncError: string | undefined = undefined;

  if (isOnline()) {
    try {
      dbRecord = options?.mapToDb ? options.mapToDb(newItem) : mapToDbRecord(table, newItem);

      const { error } = await supabase
        .from(table)
        .insert(dbRecord)
        .select()
        .maybeSingle();

      if (error) {
        console.warn(`⚠️ syncInsert(${table}): Supabase falló, encolando.`, error.message);
        addToPendingQueue({ table, action: 'insert', data: dbRecord });
        syncError = 'Guardado localmente. Pendiente de sincronización.';
      } else {
        isParentSynced = true;
      }
    } catch {
      dbRecord = options?.mapToDb ? options.mapToDb(newItem) : mapToDbRecord(table, newItem);
      addToPendingQueue({ table, action: 'insert', data: dbRecord });
      syncError = 'Sin conexión. Guardado localmente.';
    }
  } else {
    dbRecord = options?.mapToDb ? options.mapToDb(newItem) : mapToDbRecord(table, newItem);
    addToPendingQueue({ table, action: 'insert', data: dbRecord });
  }

  // Sincronizar historial de créditos DESPUÉS de haber insertado al cliente para evitar violación de FK
  if (table === 'customers') {
    await syncCreditHistory(newItem, isParentSynced);
  }

  return { success: true, error: syncError };
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

  localStorage.setItem(localStorageKey, JSON.stringify(allItems));

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
  localStorage.setItem('duo_pos_transactions', JSON.stringify(allTransactions));

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

// ─── REGISTRAR TURNO DE CAJA COMPLETO (Cabecera + Movimientos) ─────────────────
export async function syncSaveShift(
  shift: any,
  isActive: boolean,
  allHistory: any[] = []
): Promise<{ success: boolean; error?: string }> {
  if (isActive) {
    localStorage.setItem('duo_pos_active_shift', JSON.stringify(shift));
  } else {
    localStorage.removeItem('duo_pos_active_shift');
    localStorage.setItem('duo_pos_shift_history', JSON.stringify(allHistory));
  }

  const dbShiftId = ensureValidUuid(shift.id, 'shift');

  try {
    const allMovesRaw = localStorage.getItem('duo_pos_shift_movements');
    let allMoves = allMovesRaw ? JSON.parse(allMovesRaw) : [];
    
    const mappedMoves = (shift.movements || []).map((m: any) => mapMovementToDb(m, dbShiftId));

    const newMoveIds = mappedMoves.map((m: any) => m.id);
    allMoves = allMoves.filter((m: any) => m.shift_id !== dbShiftId && !newMoveIds.includes(m.id));
    allMoves.push(...mappedMoves);
    localStorage.setItem('duo_pos_shift_movements', JSON.stringify(allMoves));

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

// ─── REGISTRAR TRASPASO DE MERCANCÍA COMPLETO (Cabecera + Items) ───────────────
export async function syncSaveStockTransfer(
  transfer: any,
  allTransfers: any[]
): Promise<{ success: boolean; error?: string }> {
  localStorage.setItem('duo_pos_stock_transfers', JSON.stringify(allTransfers));

  const dbTransferId = ensureValidUuid(transfer.id, 'txn');

  try {
    const allItemsRaw = localStorage.getItem('duo_pos_stock_transfer_items');
    let allItems = allItemsRaw ? JSON.parse(allItemsRaw) : [];

    const mappedItems = (transfer.items || []).map((item: any) => ({
      id: generateUUID(),
      transfer_id: dbTransferId,
      product_id: item.productId ? ensureValidUuid(item.productId, 'prod') : null,
      name: item.name,
      emoji: item.emoji || '📦',
      quantity: Number(item.quantity)
    }));

    allItems = allItems.filter((i: any) => i.transfer_id !== dbTransferId);
    allItems.push(...mappedItems);
    localStorage.setItem('duo_pos_stock_transfer_items', JSON.stringify(allItems));

    const dbTransfer = {
      id: dbTransferId,
      from_branch_id: transfer.fromBranchId,
      to_branch_id: transfer.toBranchId,
      status: transfer.status,
      created_at: transfer.createdAt || new Date().toISOString(),
      shipped_at: transfer.shippedAt || null,
      received_at: transfer.receivedAt || null,
      notes: transfer.notes || '',
      carrier: transfer.carrier || ''
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

// ─── REGISTRAR ÓRDEN DE COMPRA COMPLETA (Cabecera + Detalles) ─────────────────────
export async function syncSavePurchaseOrder(
  po: any,
  allPurchaseOrders: any[]
): Promise<{ success: boolean; error?: string }> {
  localStorage.setItem('duo_pos_purchase_orders', JSON.stringify(allPurchaseOrders));

  const dbPoId = po.id; // po-1001 o UUID

  try {
    const allItemsRaw = localStorage.getItem('duo_pos_purchase_order_items');
    let allItems = allItemsRaw ? JSON.parse(allItemsRaw) : [];

    const mappedItems = (po.items || []).map((item: any) => ({
      id: generateUUID(),
      purchase_order_id: dbPoId,
      product_id: item.productId ? ensureValidUuid(item.productId, 'prod') : null,
      name: item.name,
      emoji: item.emoji || '📦',
      cost: Number(item.cost),
      quantity: Number(item.quantity)
    }));

    allItems = allItems.filter((i: any) => i.purchase_order_id !== dbPoId);
    allItems.push(...mappedItems);
    localStorage.setItem('duo_pos_purchase_order_items', JSON.stringify(allItems));

    const dbPo = mapPurchaseOrderToDb(po);

    if (isOnline()) {
      try {
        const { error: poError } = await supabase.from('purchase_orders').upsert(dbPo);
        if (poError) throw poError;

        // Delete existing items to handle modifications / draft updates cleanly
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

// ─── SINCRONIZAR cola de pendientes (ejecutar cuando vuelva internet) ───────────
export async function flushPendingQueue(): Promise<{ synced: number; failed: number }> {
  if (isFlushing) {
    console.log('🔄 Sincronización de cola ya en progreso. Ignorando llamada duplicada.');
    return { synced: 0, failed: 0 };
  }
  if (!isOnline()) return { synced: 0, failed: 0 };

  const queue = getPendingQueue();
  if (queue.length === 0) return { synced: 0, failed: 0 };

  console.log(`🔄 Sincronizando ${queue.length} operaciones pendientes...`);
  isFlushing = true;

  let synced = 0;
  let failed = 0;
  const remainingQueue: PendingOperation[] = [];

  try {
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
  } finally {
    isFlushing = false;
  }

  return { synced, failed };
}

// ─── Escuchar reconexión a internet para auto-sincronizar ───────────────────────
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('🌐 Conexión detectada. Sincronizando pendientes...');
    flushPendingQueue();
  });
}
