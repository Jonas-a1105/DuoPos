// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  syncLoad,
  syncSave,
  syncInsert,
  syncDelete,
  syncInsertTransaction,
  syncSaveShift,
  flushPendingQueue,
} from '../supabaseSync';
import { db } from '../db';
import { supabase, isSupabaseConfigured } from '../../config/supabaseClient';

// Mock Sound and Notifications services
vi.mock('../../services/audio/soundService', () => ({
  playSound: vi.fn(),
}));

vi.mock('../../shared/ui/FlashNotifications/FlashNotifications', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

// Mock Supabase Client configuration
vi.mock('../../config/supabaseClient', () => {
  const mockSupabase = {
    auth: {
      setSession: vi.fn(),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockImplementation(() => ({
        range: vi.fn().mockImplementation(() => Promise.resolve({ data: [], error: null })),
        eq: vi.fn().mockImplementation(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
        order: vi.fn().mockImplementation(() => Promise.resolve({ data: [], error: null })),
      })),
      upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      delete: vi.fn().mockImplementation(() => ({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
    })),
  };

  return {
    supabase: mockSupabase,
    isSupabaseConfigured: vi.fn(() => true),
    setSupabaseToken: vi.fn(),
  };
});

// Mock Local Dexie DB generic_store
vi.mock('../db', () => {
  const localStore = new Map<string, any>();
  const mockGenericStore = {
    get: vi.fn((key: string) => Promise.resolve(localStore.get(key) ? { value: localStore.get(key) } : null)),
    put: vi.fn((data: { key: string; value: any }) => {
      localStore.set(data.key, data.value);
      return Promise.resolve();
    }),
    delete: vi.fn((key: string) => {
      localStore.delete(key);
      return Promise.resolve();
    }),
    _store: localStore,
  };
  return {
    db: {
      generic_store: mockGenericStore,
    },
  };
});

const PENDING_QUEUE_KEY = 'duo_pos_sync_pending_queue';

const store: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    store[key] = value.toString();
  }),
  removeItem: vi.fn((key: string) => {
    delete store[key];
  }),
  clear: vi.fn(() => {
    for (const key in store) delete store[key];
  }),
  length: 0,
  key: vi.fn((index: number) => Object.keys(store)[index] || null),
};
vi.stubGlobal('localStorage', localStorageMock);

describe('DuoPOS Supabase & Offline Sync Integration Tests', () => {
  const localStoreMap = (db.generic_store as any)._store;
  let onlineSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStoreMap.clear();

    // Default to Online
    onlineSpy = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    vi.mocked(isSupabaseConfigured).mockReturnValue(true);
  });

  describe('1. syncLoad - Offline & Local Cache Fallback', () => {
    it('debe leer de los datos por defecto si no hay caché y estamos offline', async () => {
      onlineSpy.mockReturnValue(false); // Simulate offline state
      const defaultProducts = [{ id: 'prod-1', name: 'Manzana', price: 10, cost: 5, stock: 100, category: 'fruta' }];

      const result = await syncLoad('products', 'duo_pos_products', defaultProducts);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Manzana');
      expect(result[0].id).toBe('11111111-1111-4111-a111-111111111111'); // should map prod-1 deterministic uuid
    });

    it('debe devolver los datos en caché de IndexedDB cuando esté offline y exista caché', async () => {
      onlineSpy.mockReturnValue(false);
      const cached = [{ id: '11111111-1111-4111-a111-111111111111', name: 'Cached Product', price: 15 }];
      localStoreMap.set('duo_pos_products', cached);

      const result = await syncLoad('products', 'duo_pos_products', []);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Cached Product');
      expect(result[0].price).toBe(15);
    });
  });

  describe('2. syncLoad - Online Fetch & Conflict Injection', () => {
    it('debe descargar datos de Supabase, guardarlos localmente e inyectar cambios locales pendientes', async () => {
      // Setup Supabase Mock Return Value
      const mockSupabaseData = [
        {
          id: '11111111-1111-4111-a111-111111111111',
          name: 'Supa Prod',
          price: 20,
          cost: 10,
          stock: 50,
          category: 'fruta',
        },
      ];

      const fromSpy = vi.spyOn(supabase, 'from').mockReturnValue({
        select: vi.fn().mockReturnValue({
          range: vi.fn().mockResolvedValue({ data: mockSupabaseData, error: null }),
        }),
      } as any);

      // Add a pending insert that is not synced yet
      const pendingOp = {
        table: 'products',
        action: 'upsert' as const,
        data: { id: '11111111-1111-4111-a111-111111111111', name: 'Supa Prod Modificado Localmente', price: 25 },
      };
      localStorage.setItem(PENDING_QUEUE_KEY, JSON.stringify([{ id: 'op-123', ...pendingOp, timestamp: Date.now() }]));

      const result = await syncLoad('products', 'duo_pos_products', []);

      expect(fromSpy).toHaveBeenCalledWith('products');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Supa Prod Modificado Localmente'); // local pending data overrides remote data
      expect(result[0].price).toBe(25);

      // Cache should be updated
      const cacheVal = localStoreMap.get('duo_pos_products');
      expect(cacheVal).toBeDefined();
      expect(cacheVal[0].name).toBe('Supa Prod Modificado Localmente');
    });
  });

  describe('3. syncSave & syncInsert - Offline Operations Enqueueing', () => {
    it('debe guardar localmente y agregar la operación a la cola pendiente cuando esté offline', async () => {
      onlineSpy.mockReturnValue(false); // Offline
      const allItems = [{ id: 'prod-new', name: 'Nuevo Producto', price: 30 }];
      const newItem = { id: 'prod-new', name: 'Nuevo Producto', price: 30, cost: 15, stock: 20 };

      const res = await syncSave('products', 'duo_pos_products', allItems, newItem);
      expect(res.success).toBe(true);

      // Verify cached correctly
      const cache = localStoreMap.get('duo_pos_products');
      expect(cache).toEqual(allItems);

      // Verify operation enqueued
      const queueRaw = localStorage.getItem(PENDING_QUEUE_KEY);
      expect(queueRaw).toBeDefined();
      const queue = JSON.parse(queueRaw || '[]');
      expect(queue).toHaveLength(1);
      expect(queue[0].table).toBe('products');
      expect(queue[0].action).toBe('upsert');
      expect(queue[0].data.name).toBe('Nuevo Producto');
    });
  });

  describe('4. flushPendingQueue - Online Processing & Conflict Resolution', () => {
    it('debe vaciar la cola de pendientes a Supabase cuando vuelva la conexión', async () => {
      // 1. Queue a pending operation
      const pendingData = { id: '11111111-1111-4111-a111-111111111111', name: 'Pendiente', price: 40 };
      localStorage.setItem(
        PENDING_QUEUE_KEY,
        JSON.stringify([{ id: 'op-1', table: 'products', action: 'upsert', data: pendingData, timestamp: Date.now() }]),
      );

      // 2. Mock Supabase successful upsert
      const upsertMock = vi.fn().mockResolvedValue({ data: null, error: null });
      vi.spyOn(supabase, 'from').mockReturnValue({
        upsert: upsertMock,
      } as any);

      // 3. Flush the queue
      const report = await flushPendingQueue();

      expect(report.synced).toBe(1);
      expect(report.failed).toBe(0);
      expect(upsertMock).toHaveBeenCalledWith(pendingData);

      // Queue should now be empty
      const queue = JSON.parse(localStorage.getItem(PENDING_QUEUE_KEY) || '[]');
      expect(queue).toHaveLength(0);
    });

    it('debe resolver conflictos descartando cambios locales si la versión remota es más nueva', async () => {
      const now = new Date();
      const remoteTime = new Date(now.getTime() + 10000).toISOString(); // Remote is 10s newer
      const localTime = now.toISOString();

      // Setup pending operation
      const pendingData = {
        id: '11111111-1111-4111-a111-111111111111',
        name: 'Cambio Local Viejo',
        updated_at: localTime,
      };
      localStorage.setItem(
        PENDING_QUEUE_KEY,
        JSON.stringify([{ id: 'op-1', table: 'products', action: 'upsert', data: pendingData, timestamp: Date.now() }]),
      );

      // Mock remote check returning newer timestamp
      const maybeSingleMock = vi.fn().mockResolvedValue({ data: { updated_at: remoteTime }, error: null });
      const eqMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
      const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
      const upsertMock = vi.fn().mockResolvedValue({ data: null, error: null });

      vi.spyOn(supabase, 'from').mockReturnValue({
        select: selectMock,
        upsert: upsertMock,
      } as any);

      // Run flush
      const report = await flushPendingQueue();

      // Should skip sync because remote is newer (considered successful resolve/discard)
      expect(report.synced).toBe(1);
      expect(report.failed).toBe(0);
      expect(upsertMock).not.toHaveBeenCalled(); // Upsert was skipped!

      // Queue is cleared of this skipped item
      const queue = JSON.parse(localStorage.getItem(PENDING_QUEUE_KEY) || '[]');
      expect(queue).toHaveLength(0);
    });
  });

  describe('5. syncInsertTransaction - Complex Header & Items Verification', () => {
    it('debe guardar cabecera e items localmente y encolar ambas si está offline', async () => {
      onlineSpy.mockReturnValue(false); // Offline

      const mockTxn = {
        id: 'a0000000-0000-0000-0000-000000000100',
        subtotal: 100,
        tax: 16,
        discount: 0,
        total: 116,
        paymentMethod: 'cash',
        employeeName: 'Juan',
        items: [{ productId: 'prod-1', name: 'Manzana', price: 10, quantity: 5, taxRateApplied: 16 }],
      };

      const res = await syncInsertTransaction(mockTxn, [mockTxn]);
      expect(res.success).toBe(true);

      // Header is stored locally in active list
      const txnsCache = localStoreMap.get('duo_pos_transactions');
      expect(txnsCache).toHaveLength(1);
      expect(txnsCache[0].id).toBe(mockTxn.id);

      // Items are extracted and cached in transactions sub-collection
      const itemsCache = localStoreMap.get('duo_pos_transaction_items');
      expect(itemsCache).toBeDefined();
      expect(itemsCache).toHaveLength(1);
      expect(itemsCache[0].name).toBe('Manzana');
      expect(itemsCache[0].transaction_id).toBe('a0000000-0000-0000-0000-000000000100'); // properly normalized

      // Double operations queued: 1 for header, 1 for detail item
      const queue = JSON.parse(localStorage.getItem(PENDING_QUEUE_KEY) || '[]');
      expect(queue).toHaveLength(2);
      expect(queue[0].table).toBe('transactions');
      expect(queue[1].table).toBe('transaction_items');
    });
  });

  describe('6. syncSaveShift - Shifts and Cash Movements Consistency', () => {
    it('debe encolar movimientos de caja y cabecera de turno en IndexedDB de manera consistente', async () => {
      onlineSpy.mockReturnValue(false); // Offline

      const mockShift = {
        id: 'b0000000-0000-0000-0000-000000000001',
        employeeName: 'Leticia',
        initialCash: 50,
        expectedCash: 120,
        status: 'open',
        movements: [
          {
            id: 'c0000000-0000-0000-0000-000000000001',
            type: 'in',
            amount: 20,
            reason: 'Pago cliente',
            timestamp: new Date().toISOString(),
          },
        ],
      };

      const res = await syncSaveShift(mockShift, true, []);
      expect(res.success).toBe(true);

      // Cache active shift
      const activeShift = localStoreMap.get('duo_pos_active_shift');
      expect(activeShift).toBeDefined();
      expect(activeShift.id).toBe('b0000000-0000-0000-0000-000000000001');

      // Cash movements stored locally
      const movesCache = localStoreMap.get('duo_pos_shift_movements');
      expect(movesCache).toBeDefined();
      expect(movesCache).toHaveLength(1);
      expect(movesCache[0].id).toBe('c0000000-0000-0000-0000-000000000001');
      expect(movesCache[0].shift_id).toBe('b0000000-0000-0000-0000-000000000001');

      // Shift header and movement enqueued
      const queue = JSON.parse(localStorage.getItem(PENDING_QUEUE_KEY) || '[]');
      expect(queue).toHaveLength(2);
      expect(queue[0].table).toBe('cash_shifts');
      expect(queue[1].table).toBe('cash_movements');
    });
  });
});
