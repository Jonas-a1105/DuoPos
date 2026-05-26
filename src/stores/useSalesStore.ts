import { create } from 'zustand';
import { Branch, CashRegister, CashShift, LegalBillingSettings, HardwareDeviceSettings, Transaction } from '../types';

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

const DEFAULT_HARDWARE_SETTINGS: HardwareDeviceSettings = {
  printerType: 'thermal_80mm',
  printerConnection: 'usb',
  usbVendorId: '0x04b8',
  usbProductId: '0x0202',
  ipAddress: '192.168.1.200',
  autoPrintReceipts: true,
  openDrawerOnSale: true,
  soundVolume: 80,
  scannerBeep: true,
  poleDisplayPort: 'COM1',
  poleDisplayWelcome: 'BIENVENIDO A DUOPOS'
};

const DEFAULT_BILLING_SETTINGS: LegalBillingSettings = {
  companyName: 'DuoPOS Gamified S.A.C.',
  taxId: 'J-12345678-9',
  address: 'Calle del Búho Sabio #55, Sector Finanzas',
  invoicePrefix: 'FACT-A-',
  nextInvoiceNumber: 1001,
  taxRatePercent: 16.0,
  allowMixedPayments: true,
  allowCreditSales: true,
  requireInvoiceDetails: false,
  fiscalPrinterEnabled: false,
  customFooterMessage: '¡Gracias por facturar con nosotros! Gana XP y racha hoy. 🦉✨'
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
      return raw ? JSON.parse(raw) : { oficial: 36.50, paralelo: 39.90 };
    } catch {
      return { oficial: 36.50, paralelo: 39.90 };
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
  billingSettings: DEFAULT_BILLING_SETTINGS,

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
  setBillingSettings: (billingSettings) => set({ billingSettings })
}));
