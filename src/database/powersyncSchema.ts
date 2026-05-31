import { Schema, Table, column } from '@powersync/web';

// ─── PowerSync Local SQLite Database Schema ──────────────────────────────────
// Nota: PowerSync genera automáticamente una columna `id` TEXT como llave
// primaria en todas las tablas, por lo que no es necesario declararla explícitamente.
export const AppSchema = new Schema({
  products: new Table({
    name: column.text,
    price: column.real,
    cost: column.real,
    stock: column.real,
    category: column.text,
    emoji: column.text,
    description: column.text,
    barcode: column.text,
    min_stock: column.real,
  }),

  customers: new Table({
    name: column.text,
    phone: column.text,
    email: column.text,
    gems: column.real,
    purchases_count: column.real,
    total_spent: column.real,
    league: column.text,
    fiscal_name: column.text,
    tax_id: column.text,
    regime: column.text,
    postal_code: column.text,
    credit_limit: column.real,
    credit_used: column.real,
    registered_at: column.text,
  }),

  customer_credit_history: new Table({
    customer_id: column.text,
    amount: column.real,
    type: column.text,
    date: column.text,
    notes: column.text,
    transaction_id: column.text,
  }),

  transactions: new Table({
    date: column.text,
    subtotal: column.real,
    tax: column.real,
    discount: column.real,
    total: column.real,
    payment_method: column.text,
    is_mixed_payment: column.integer, // BOOLEAN se representa como INTEGER (0 o 1) en SQLite
    mixed_cash_amount: column.real,
    mixed_card_amount: column.real,
    employee_id: column.text,
    employee_name: column.text,
    xp_gained: column.real,
    customer_id: column.text,
    gems_gained: column.real,
    table_id: column.text,
    table_name: column.text,
    waiter_name: column.text,
    gems_redeemed: column.real,
    is_invoice_requested: column.integer,
    branch_id: column.text,
    register_id: column.text,
    card_payment_details: column.text,
    invoice_data: column.text,
  }),

  transaction_items: new Table({
    transaction_id: column.text,
    product_id: column.text,
    name: column.text,
    price: column.real,
    emoji: column.text,
    quantity: column.real,
    tax_rate_applied: column.real,
    notes: column.text,
    addons: column.text,
  }),

  cash_shifts: new Table({
    employee_id: column.text,
    employee_name: column.text,
    opening_time: column.text,
    closing_time: column.text,
    initial_cash: column.real,
    expected_cash: column.real,
    actual_cash: column.real,
    difference: column.real,
    status: column.text,
    sales_count: column.real,
    sales_volume: column.real,
    branch_id: column.text,
    register_id: column.text,
  }),

  cash_movements: new Table({
    shift_id: column.text,
    type: column.text,
    amount: column.real,
    reason: column.text,
    timestamp: column.text,
  }),

  branches: new Table({
    name: column.text,
    type: column.text,
    emoji: column.text,
    address: column.text,
    city: column.text,
  }),

  cash_registers: new Table({
    branch_id: column.text,
    name: column.text,
    emoji: column.text,
    status: column.text,
  }),

  stock_transfers: new Table({
    from_branch_id: column.text,
    to_branch_id: column.text,
    status: column.text,
    created_at: column.text,
    shipped_at: column.text,
    received_at: column.text,
    notes: column.text,
    carrier: column.text,
  }),

  stock_transfer_items: new Table({
    transfer_id: column.text,
    product_id: column.text,
    name: column.text,
    emoji: column.text,
    quantity: column.real,
  }),

  suppliers: new Table({
    name: column.text,
    contact: column.text,
    phone: column.text,
    email: column.text,
    category: column.text,
    address: column.text,
    delivery_days: column.real,
    reliability: column.real,
    balance: column.real,
  }),

  purchase_orders: new Table({
    supplier_id: column.text,
    supplier_name: column.text,
    subtotal: column.real,
    tax: column.real,
    total: column.real,
    payment_method: column.text,
    status: column.text,
    created_at: column.text,
    estimated_delivery: column.text,
    received_at: column.text,
    carrier: column.text,
  }),

  purchase_order_items: new Table({
    purchase_order_id: column.text,
    product_id: column.text,
    name: column.text,
    emoji: column.text,
    cost: column.real,
    quantity: column.real,
  }),

  daily_stats: new Table({
    stats_json: column.text, // Almacena JSON serializado en TEXT para SQLite
    updated_at: column.text,
  }),

  app_settings: new Table({
    data: column.text,
    updated_at: column.text,
  }),

  user_preferences: new Table({
    theme: column.text,
    sound_enabled: column.integer,
    updated_at: column.text,
  }),
});
