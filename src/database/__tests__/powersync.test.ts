// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '../../config/supabaseClient';

// Mock `@powersync/web` to bypass browser-specific Web Worker (Worker is not defined) errors in JSDOM
vi.mock('@powersync/web', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@powersync/web')>();
  return {
    ...actual,
    PowerSyncDatabase: class MockPowerSyncDatabase {
      schema: any;
      constructor(options: any) {
        this.schema = options.schema;
      }
      init = vi.fn().mockResolvedValue(undefined);
      connect = vi.fn().mockResolvedValue(undefined);
    },
    WASQLiteOpenFactory: class MockWASQLiteOpenFactory {
      constructor(options: any) {}
    },
  };
});

import { powerSync, connector } from '../powersyncClient';
import { UpdateType } from '@powersync/web';

// Mock Supabase Client
vi.mock('../../config/supabaseClient', () => {
  const mockSupabase = {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            access_token: 'mock-clerk-supabase-jwt-token',
            user: { id: 'user-clerk-123' },
          },
        },
        error: null,
      }),
    },
    from: vi.fn(() => ({
      upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
      delete: vi.fn().mockImplementation(() => ({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
    })),
  };
  return {
    supabase: mockSupabase,
  };
});

describe('PowerSync & Supabase Connector Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. PowerSync Database Client Initialization', () => {
    it('debe instanciarse correctamente con el esquema declarado de DuoPOS', () => {
      expect(powerSync).toBeDefined();
      expect(powerSync.schema).toBeDefined();

      // Verificar que algunas de las tablas clave de DuoPOS estén declaradas en el esquema SQLite
      const tables = powerSync.schema.tables.map((t) => t.name);
      expect(tables).toContain('products');
      expect(tables).toContain('customers');
      expect(tables).toContain('transactions');
      expect(tables).toContain('cash_shifts');
    });
  });

  describe('2. SupabaseConnector - Credentials Fetching', () => {
    it('debe obtener y formatear las credenciales JWT de la sesión activa de Clerk', async () => {
      const creds = await connector.fetchCredentials();

      expect(supabase.auth.getSession).toHaveBeenCalled();
      expect(creds.token).toBe('mock-clerk-supabase-jwt-token');
      expect(creds.userId).toBe('user-clerk-123');
      expect(creds.endpoint).toBeDefined();
    });

    it('debe manejar sesiones nulas de forma segura si el usuario está offline o deslogueado', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: { session: null },
        error: null,
      });

      const creds = await connector.fetchCredentials();
      expect(creds.token).toBeNull();
      expect(creds.userId).toBeUndefined();
    });
  });

  describe('3. SupabaseConnector - Data Upload Pipeline (Writes Queue)', () => {
    it('debe vaciar de forma transaccional las mutaciones PUT (upsert) de SQLite local hacia Supabase', async () => {
      // Mock de una transacción local en la cola de SQLite de PowerSync
      const mockTx = {
        writeCheckpoint: 42,
        crud: [
          {
            id: 'prod-uuid-111',
            table: 'products',
            op: UpdateType.PUT,
            opData: { name: 'Empanada Duo', price: 1.5, stock: 30 },
          },
        ],
      };

      const mockDatabase = {
        getNextCrudTransaction: vi.fn().mockResolvedValue(mockTx),
        updateCrudTransaction: vi.fn().mockResolvedValue(undefined),
      };

      // Mock de Supabase para capturar la llamada de inserción
      const upsertMock = vi.fn().mockResolvedValue({ data: null, error: null });
      vi.spyOn(supabase, 'from').mockReturnValue({
        upsert: upsertMock,
      } as any);

      // Ejecutar subida
      await connector.uploadData(mockDatabase as any);

      expect(mockDatabase.getNextCrudTransaction).toHaveBeenCalled();
      expect(supabase.from).toHaveBeenCalledWith('products');
      expect(upsertMock).toHaveBeenCalledWith({
        id: 'prod-uuid-111',
        name: 'Empanada Duo',
        price: 1.5,
        stock: 30,
      });
      // Verificar confirmación del checkpoint en SQLite
      expect(mockDatabase.updateCrudTransaction).toHaveBeenCalledWith(42);
    });

    it('debe vaciar de forma transaccional las mutaciones de eliminación (DELETE) hacia Supabase', async () => {
      const mockTx = {
        writeCheckpoint: 43,
        crud: [
          {
            id: 'cust-uuid-222',
            table: 'customers',
            op: UpdateType.DELETE,
          },
        ],
      };

      const mockDatabase = {
        getNextCrudTransaction: vi.fn().mockResolvedValue(mockTx),
        updateCrudTransaction: vi.fn().mockResolvedValue(undefined),
      };

      const deleteMock = vi.fn().mockImplementation(() => ({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }));

      vi.spyOn(supabase, 'from').mockReturnValue({
        delete: deleteMock,
      } as any);

      // Ejecutar subida
      await connector.uploadData(mockDatabase as any);

      expect(supabase.from).toHaveBeenCalledWith('customers');
      expect(deleteMock).toHaveBeenCalled();
      expect(mockDatabase.updateCrudTransaction).toHaveBeenCalledWith(43);
    });

    it('debe detener el vaciado y re-lanzar errores si Supabase falla para forzar reintento en cola local', async () => {
      const mockTx = {
        writeCheckpoint: 44,
        crud: [
          {
            id: 'txn-uuid-333',
            table: 'transactions',
            op: UpdateType.PUT,
            opData: { total: 50 },
          },
        ],
      };

      const mockDatabase = {
        getNextCrudTransaction: vi.fn().mockResolvedValue(mockTx),
        updateCrudTransaction: vi.fn(),
      };

      // Simular falla de conexión / error RLS en Supabase
      vi.spyOn(supabase, 'from').mockReturnValue({
        upsert: vi.fn().mockResolvedValue({ data: null, error: { message: 'Database Connection Timeout' } }),
      } as any);

      // Ejecutar y esperar fallo
      await expect(connector.uploadData(mockDatabase as any)).rejects.toThrow();

      // No debe haber llamado a updateCrudTransaction porque falló
      expect(mockDatabase.updateCrudTransaction).not.toHaveBeenCalled();
    });
  });
});
