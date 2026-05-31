export interface SyncRule {
  table: string;
  bucket: string;
  filter?: (row: any) => boolean;
  priority: number;
}

const syncRules: SyncRule[] = [
  {
    table: 'products',
    bucket: 'duo_pos_products',
    priority: 1,
  },
  {
    table: 'transactions',
    bucket: 'duo_pos_transactions',
    filter: (row: any) => !!row.branchId,
    priority: 2,
  },
  {
    table: 'customers',
    bucket: 'duo_pos_customers',
    priority: 3,
  },
  {
    table: 'cash_shifts',
    bucket: 'duo_pos_shift_history',
    filter: (row: any) => row.branchId != null,
    priority: 4,
  },
  {
    table: 'branches',
    bucket: 'duo_pos_branches',
    priority: 5,
  },
  {
    table: 'cash_registers',
    bucket: 'duo_pos_registers',
    priority: 6,
  },
  {
    table: 'suppliers',
    bucket: 'duo_pos_suppliers',
    priority: 7,
  },
  {
    table: 'purchase_orders',
    bucket: 'duo_pos_purchase_orders',
    priority: 8,
  },
  {
    table: 'stock_transfers',
    bucket: 'duo_pos_stock_transfers',
    priority: 9,
  },
  {
    table: 'app_settings',
    bucket: 'duo_pos_settings',
    priority: 10,
  },
];

export function getSyncRules(): SyncRule[] {
  return syncRules;
}

export function getSyncRuleForTable(tableName: string): SyncRule | undefined {
  return syncRules.find((r) => r.table === tableName);
}
