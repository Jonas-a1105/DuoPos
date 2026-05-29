/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'admin' | 'supervisor' | 'cashier';

export interface User {
  id: string;
  username: string;
  email: string;
  avatar: string; // emoji code or character key: 'duo', 'lily', 'zari', 'eddy', 'junior'
  streak: number; // sales streak in days
  lastSaleDate?: string; // ISO string format YYYY-MM-DD
  xp: number; // Experience points
  level: number;
  dailyGoal: number; // target daily sales amount (default: 150)
  levelTitle: string;
  role?: UserRole;
  gems?: number; // Virtual gems owned by the employee to spend in store
  gemsEarnedTotal?: number; // Total gems earned all-time
  unlockedSkins?: string[]; // Theme skin IDs purchased e.g., ['standard']
  activeSkin?: string; // Currently equipped layout skin theme ID
  unlockedBadges?: string[]; // Milestone badges unlocked
  activeBadge?: string; // Selected badge display
  completedMissionsToday?: string[]; // Mission keys completed today
  completedMissionsTimestamp?: string; // Timestamp day check YYYY-MM-DD
  dailyStreakSavedCount?: number; // Saved Streak Freeze count

  // League System
  employeeLeague?: LeagueTier;
  weeklyXp?: number;
  weeklyXpResetDate?: string; // ISO Monday date

  // Progression Map
  progressionClaimed?: string[]; // Node IDs claimed

  // Owl Accessories
  unlockedAccessories?: string[];
  activeAccessory?: string;

  // Season Pass
  seasonXp?: number;
  seasonRewardsClaimed?: number[]; // Tier numbers claimed
}

// League System
export type LeagueTier = 'bronce' | 'plata' | 'oro' | 'zafiro' | 'rubi' | 'esmeralda' | 'diamante' | 'obsidiana';

export interface LeagueParticipant {
  id: string;
  name: string;
  avatar: string;
  weeklyXp: number;
  league: LeagueTier;
  isCurrentUser?: boolean;
}

export interface WeeklyLeague {
  tier: LeagueTier;
  participants: LeagueParticipant[];
  weekStart: string; // ISO date string (Monday)
  weekEnd: string; // ISO date string (Sunday)
  promotionZone: number; // Top N get promoted
  demotionZone: number; // Bottom N get demoted
}

// Progression Map (Saga Map)
export interface ProgressionNode {
  id: string;
  title: string;
  description: string;
  type: 'milestone' | 'chest' | 'boss' | 'rest';
  requirement: {
    metric: 'totalSales' | 'totalTransactions' | 'streak' | 'level' | 'customers' | 'perfectShifts';
    target: number;
  };
  reward: {
    xp: number;
    gems: number;
    unlockId?: string; // skin/title/accessory to unlock
  };
  position: number; // Order in the path
  isUnlocked: boolean;
  isClaimed: boolean;
}

// Extended Store
export interface OwlAccessory {
  id: string;
  name: string;
  type: 'hat' | 'glasses' | 'outfit' | 'effect';
  emoji: string; // Visual representation
  cost: number;
  rarity: 'comun' | 'raro' | 'epico' | 'legendario';
  levelRequired: number;
}

// Season / Battle Pass
export interface SeasonReward {
  tier: number;
  xpRequired: number;
  reward: {
    type: 'gems' | 'skin' | 'title' | 'accessory' | 'xpBoost';
    value: string | number;
    name: string;
    icon: string;
    rarity: 'comun' | 'raro' | 'epico' | 'legendario';
  };
  isClaimed: boolean;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  cost: number;
  stock: number;
  category: string;
  emoji: string;
  description: string;
  barcode?: string;
  minStock?: number; // Custom critical stock threshold, defaults to 5
  branchesStock?: Record<string, number>; // Maps branchId -> stock count
}

export interface CartItem {
  product: Product;
  quantity: number;
  notes?: string;
  addons?: { name: string; price: number }[];
  discountPercent?: number;
  customPrice?: number;
}

export interface Transaction {
  id: string;
  date: string; // ISO string
  items: {
    productId: string;
    name: string;
    price: number;
    emoji: string;
    quantity: number;
    taxRateApplied?: number; // Advanced Tax details per item
    notes?: string; // F&B Modifier notes e.g. "Cold, Extra spicy"
    addons?: { name: string; price: number }[]; // F&B additions
  }[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'points' | 'credit';
  isMixedPayment?: boolean;
  mixedCashAmount?: number;
  mixedCardAmount?: number;
  employeeName: string;
  status?: 'active' | 'refunded';
  refunded?: boolean;
  refundedAt?: string;
  xpGained: number;
  customerId?: string;
  gemsGained?: number;
  tableId?: string; // F&B Table ID
  tableName?: string; // F&B Table Name (e.g. "Mesa 4")
  waiterName?: string; // Assigned Waiter NAME
  gemsRedeemed?: number;
  isInvoiceRequested?: boolean;
  branchId?: string;
  registerId?: string;
  cardPaymentDetails?: {
    terminalId: string;
    authCode: string;
    brand: string; // VISA, MASTERCARD, AMEX
    last4: string;
    cardholderName: string;
    cardType: 'credit' | 'debit';
    aid?: string;
    arqc?: string;
    signatureBase64?: string; // Touchscreen signature
  };
  invoiceData?: {
    uuid: string; // Legal unique UUID for electronic billing (e.g. Standard CFDI / SAT / SEPA layout)
    invoiceNo: string; // Sequential number like "FAC-2026-0001"
    fiscalName: string; // Business or Client Legal Name
    taxId: string; // RFC / CIF / RUT / Document ID
    regime: string; // Legal Tax Regime Code
    postalCode: string; // Location zip
    certifiedAt: string; // Timestamp of stamp
    satSignature?: string; // Digital mock cryptographic seal
    paymentForm: string; // Form of payment based on catalogs (e.g. "01 - Efectivo")
    useCFDI?: string; // Intended use of certificate (e.g. "G03 - Gastos en general")
  };
}

export type LeagueType = 'Bronce' | 'Plata' | 'Oro' | 'Zafiro' | 'Rubí' | 'Esmeralda' | 'Obsidiana';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  gems: number; // Duolingo loyalty currency
  purchasesCount: number;
  totalSpent: number;
  registeredAt: string;
  league: LeagueType;
  // Legal fiscal details for quick billing autocompletion
  fiscalName?: string;
  taxId?: string;
  regime?: string;
  postalCode?: string;

  // Credit Line ("Fiado") details
  creditLimit?: number; // Authorized limit (0 or undefined = no credit allowed)
  creditUsed?: number; // Outstanding debt
  creditHistory?: {
    id: string;
    amount: number;
    type: 'charge' | 'pay'; // charge = items bought on credit, pay = payment towards account
    date: string;
    notes?: string;
    transactionId?: string;
  }[];
}

export interface TaxCategoryOverride {
  category: string;
  rate: number; // e.g., 0 for Exempt food, 16 for standard, etc.
}

export interface LegalBillingSettings {
  taxName: string; // e.g. "IVA", "Sales Tax", "GST", "ISV"
  generalTaxRate: number; // e.g. 16 for IVA, 8 for border, etc.
  categoryOverrides: TaxCategoryOverride[];
  taxIncludedInPrice: boolean; // Switch for Gross (inclusive) vs Net (exclusive) prices

  // Issuing Business Credentials
  companyName: string; // Business Legal Name
  companyTaxId: string; // RFC / RUT / VAT ID
  companyRegime: string; // Régimen Fiscal (e.g. "601 - General de Ley Personas Morales")
  companyPostalCode: string; // Código Postal
  companyAddress: string; // Dirección Fiscal

  // Sequence configurations
  invoicePrefix: string; // Prefijo (e.g. "FAC-")
  nextInvoiceNumber: number; // Siguiente folio secuencial
  automaticMockInvoicing: boolean; // Emitir factura automáticamente al pagar si hay cliente

  certifyingAuthority: string; // e.g. "Servicio de Administración Tributaria (SAT) Ficticio"

  // Extended Application Preferences
  businessProfile?: 'gastronomy' | 'market' | 'retail' | 'general';
  currencySymbol?: string;
  currencyDecimals?: number;
  enableSounds?: boolean;
  ticketWidth?: '80mm' | '58mm';
  customTicketHeader?: string;
  customTicketFooter?: string;
  kdsDelayMinutes?: number;
  pacUsername?: string;
  pacPassword?: string;
}

export interface DailyGoalStatus {
  target: number;
  current: number;
  completed: boolean;
}

export interface CashMovement {
  id: string;
  type: 'in' | 'out'; // 'in' = entry/added cash, 'out' = withdrawn/paid out cash
  amount: number;
  reason: string;
  timestamp: string;
}

export interface CashShift {
  id: string;
  employeeId: string;
  employeeName: string;
  openingTime: string; // ISO string
  closingTime?: string; // ISO string
  initialCash: number;
  expectedCash: number; // initialCash + cashSales + sum(inMovements) - sum(outMovements)
  actualCash?: number; // final counted cash by the cashier
  difference?: number; // actualCash - expectedCash
  status: 'open' | 'closed';
  movements: CashMovement[];
  salesCount: number;
  salesVolume: number;
  branchId?: string;
  registerId?: string;
}

export interface Branch {
  id: string; // 'branch-central', 'branch-centro', 'branch-norte', etc.
  name: string;
  type: 'central' | 'branch'; // central is the CEDIS warehouse
  emoji: string;
  address: string;
  city: string;
}

export interface CashRegister {
  id: string;
  branchId: string;
  name: string;
  emoji: string;
  status: 'active' | 'maintenance';
}

export interface StockTransferItem {
  productId: string;
  name: string;
  emoji: string;
  quantity: number;
}

export interface StockTransfer {
  id: string;
  fromBranchId: string;
  fromBranchName: string;
  toBranchId: string;
  toBranchName: string;
  items: StockTransferItem[];
  status: 'pending' | 'shipped' | 'received' | 'cancelled';
  createdAt: string;
  shippedAt?: string;
  receivedAt?: string;
  notes?: string;
  carrier?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  phone: string;
  email: string;
  category: string;
  address: string;
  deliveryDays: number;
  reliability: number; // 0 - 100
  balance: number; // outstanding liability
  paymentHistory?: { id: string; amount: number; date: string; method: string; notes: string }[];
  dueDate?: string; // Due date for outstanding balance
  paymentTermDays?: number; // Payment term in days (default: 30)
}

export interface PurchaseOrderItem {
  productId: string;
  name: string;
  emoji: string;
  cost: number;
  quantity: number;
}

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseOrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: 'cash' | 'credit'; // Contado (cash drawer) or Crédito (accounts payable)
  status: 'draft' | 'sent' | 'transit' | 'received' | 'cancelled';
  createdAt: string;
  estimatedDelivery: string;
  receivedAt?: string;
  carrier: string;
}

export interface ExpressEvent {
  id: string;
  type: 'happy_hour' | 'scan_challenge' | 'loyalty_challenge';
  title: string;
  description: string;
  durationSeconds: number;
  remainingSeconds: number;
  gemsReward: number;
  targetCount: number;
  currentCount: number;
  expiresAt: number;
}

export type { LicenseDetails } from '../services/licensing';
export type { HardwareDeviceSettings } from '../services/printService';
