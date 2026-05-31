import { create } from 'zustand';
import { Branch, CashRegister, CashShift, LegalBillingSettings, HardwareDeviceSettings, Transaction } from '../../../types';
import { DEFAULT_HARDWARE_SETTINGS } from '../../../services/print/printService';

interface SalesState {
  activeBranchId: string;
  activeRegisterId: string;
  branches: Branch[];
  registers: CashRegister[];
  activeShift: CashShift | null;
  shiftHistory: CashShift[];
  transactions: Transaction[];
  exchangeRates: { oficial: number; paralelo: number };
  activeRateType: 'oficial' | 'paralelo';
  hardwareSettings: HardwareDeviceSettings;
  billingSettings: LegalBillingSettings;

  // Actions
  setActiveBranchId: (id: string) => void;
  setActiveRegisterId: (id: string) => void;
  setBranches: (branches: Branch[]) => void;
  setRegisters: (registers: CashRegister[]) => void;
  setActiveShift: (shift: CashShift | null) => void;
  setShiftHistory: (history: CashShift[]) => void;
  setTransactions: (txns: Transaction[]) => void;
  setExchangeRates: (rates: { oficial: number; paralelo: number }) => void;
  setActiveRateType: (type: 'oficial' | 'paralelo') => void;
  setHardwareSettings: (settings: HardwareDeviceSettings) => void;
  setBillingSettings: (settings: LegalBillingSettings) => void;
}

const DEFAULT_BILLING_SETTINGS: LegalBillingSettings = {
  taxName: 'IVA',
  generalTaxRate: 16,
  categoryOverrides: [
    { category: 'Alimentos', rate: 0 },
    { category: 'Bebidas', rate: 16 },
    { category: 'Mercancía', rate: 16 },
    { category: 'Cafetería', rate: 16 },
    { category: 'Accesorios', rate: 16 },
    { category: 'Electrónicos', rate: 16 },
    { category: 'Servicios', rate: 16 },
  ],
  taxIncludedInPrice: true,
  companyName: 'StockMaster Pro Gamified S.A.C.',
  companyTaxId: 'DAC120525D10',
  companyRegime: '601 - Regimen General de Ley Personas Morales',
  companyPostalCode: '06700',
  companyAddress: 'Avenida del Fénix Dorado #77, Sector Finanzas',
  invoicePrefix: 'FACT-A-',
  nextInvoiceNumber: 1001,
  automaticMockInvoicing: false,
  certifyingAuthority: 'Servicio de Administración Ficticia SAT',
};

export const useSalesStore = create<SalesState>((set) => ({
  activeBranchId: (() => {
    try {
      return localStorage.getItem('duo_pos_active_branch_id') || 'branch-centro';
    } catch {
      return 'branch-centro';
    }
  })(),
  activeRegisterId: (() => {
    try {
      return localStorage.getItem('duo_pos_active_register_id') || 'reg-centro-1';
    } catch {
      return 'reg-centro-1';
    }
  })(),
  branches: [],
  registers: [],
  activeShift: null,
  shiftHistory: [],
  transactions: [],
  exchangeRates: (() => {
    try {
      const raw = localStorage.getItem('duo_pos_exchange_rates');
      return raw ? JSON.parse(raw) : { oficial: 36.5, paralelo: 39.9 };
    } catch {
      return { oficial: 36.5, paralelo: 39.9 };
    }
  })(),
  activeRateType: (() => {
    try {
      return (localStorage.getItem('duo_pos_active_rate_type') as any) || 'oficial';
    } catch {
      return 'oficial';
    }
  })(),
  hardwareSettings: (() => {
    try {
      const raw = localStorage.getItem('duo_pos_hardware_settings');
      return raw ? JSON.parse(raw) : DEFAULT_HARDWARE_SETTINGS;
    } catch {
      return DEFAULT_HARDWARE_SETTINGS;
    }
  })(),
  billingSettings: (() => {
    try {
      const raw = localStorage.getItem('duo_pos_billing_settings');
      return raw ? JSON.parse(raw) : DEFAULT_BILLING_SETTINGS;
    } catch {
      return DEFAULT_BILLING_SETTINGS;
    }
  })(),

  setActiveBranchId: (activeBranchId) => {
    set({ activeBranchId });
    localStorage.setItem('duo_pos_active_branch_id', activeBranchId);
  },
  setActiveRegisterId: (activeRegisterId) => {
    set({ activeRegisterId });
    localStorage.setItem('duo_pos_active_register_id', activeRegisterId);
  },
  setBranches: (branches) => set({ branches }),
  setRegisters: (registers) => set({ registers }),
  setActiveShift: (activeShift) => set({ activeShift }),
  setShiftHistory: (shiftHistory) => set({ shiftHistory }),
  setTransactions: (transactions) => set({ transactions }),
  setExchangeRates: (exchangeRates) => {
    set({ exchangeRates });
    localStorage.setItem('duo_pos_exchange_rates', JSON.stringify(exchangeRates));
  },
  setActiveRateType: (activeRateType) => {
    set({ activeRateType });
    localStorage.setItem('duo_pos_active_rate_type', activeRateType);
  },
  setHardwareSettings: (hardwareSettings) => {
    set({ hardwareSettings });
    localStorage.setItem('duo_pos_hardware_settings', JSON.stringify(hardwareSettings));
  },
  setBillingSettings: (billingSettings) => {
    set({ billingSettings });
    localStorage.setItem('duo_pos_billing_settings', JSON.stringify(billingSettings));
  },
}));
