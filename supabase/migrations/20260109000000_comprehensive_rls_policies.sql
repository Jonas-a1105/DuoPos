-- Migration: 20260109000000_comprehensive_rls_policies.sql
-- Description: Enable Row Level Security and establish global permissive ALL policies for all 21 system tables.
-- This ensures uninhibited bidirectional syncing for local-first operations and avoids RLS/401 violations.

-- 1. profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles public read" ON public.profiles;
DROP POLICY IF EXISTS "Profiles public all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_permissive" ON public.profiles;
CREATE POLICY "profiles_permissive" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

-- 2. branches
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Branches all" ON public.branches;
DROP POLICY IF EXISTS "branches_permissive" ON public.branches;
CREATE POLICY "branches_permissive" ON public.branches FOR ALL USING (true) WITH CHECK (true);

-- 3. cash_registers
ALTER TABLE public.cash_registers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Cash registers all" ON public.cash_registers;
DROP POLICY IF EXISTS "cash_registers_permissive" ON public.cash_registers;
CREATE POLICY "cash_registers_permissive" ON public.cash_registers FOR ALL USING (true) WITH CHECK (true);

-- 4. products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Products select" ON public.products;
DROP POLICY IF EXISTS "Products insert" ON public.products;
DROP POLICY IF EXISTS "Products update" ON public.products;
DROP POLICY IF EXISTS "Products all" ON public.products;
DROP POLICY IF EXISTS "products_permissive" ON public.products;
CREATE POLICY "products_permissive" ON public.products FOR ALL USING (true) WITH CHECK (true);

-- 5. product_branch_stock
ALTER TABLE public.product_branch_stock ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Product branch stock all" ON public.product_branch_stock;
DROP POLICY IF EXISTS "product_branch_stock_permissive" ON public.product_branch_stock;
CREATE POLICY "product_branch_stock_permissive" ON public.product_branch_stock FOR ALL USING (true) WITH CHECK (true);

-- 6. customers
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Customers select" ON public.customers;
DROP POLICY IF EXISTS "Customers insert" ON public.customers;
DROP POLICY IF EXISTS "Customers all" ON public.customers;
DROP POLICY IF EXISTS "customers_permissive" ON public.customers;
CREATE POLICY "customers_permissive" ON public.customers FOR ALL USING (true) WITH CHECK (true);

-- 7. customer_credit_history
ALTER TABLE public.customer_credit_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Customer credit history all" ON public.customer_credit_history;
DROP POLICY IF EXISTS "customer_credit_history_permissive" ON public.customer_credit_history;
CREATE POLICY "customer_credit_history_permissive" ON public.customer_credit_history FOR ALL USING (true) WITH CHECK (true);

-- 8. transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Transactions select" ON public.transactions;
DROP POLICY IF EXISTS "Transactions insert" ON public.transactions;
DROP POLICY IF EXISTS "Transactions all" ON public.transactions;
DROP POLICY IF EXISTS "transactions_permissive" ON public.transactions;
CREATE POLICY "transactions_permissive" ON public.transactions FOR ALL USING (true) WITH CHECK (true);

-- 9. transaction_items
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Transaction items all" ON public.transaction_items;
DROP POLICY IF EXISTS "transaction_items_permissive" ON public.transaction_items;
CREATE POLICY "transaction_items_permissive" ON public.transaction_items FOR ALL USING (true) WITH CHECK (true);

-- 10. cash_shifts
ALTER TABLE public.cash_shifts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Cash shifts select" ON public.cash_shifts;
DROP POLICY IF EXISTS "Cash shifts insert" ON public.cash_shifts;
DROP POLICY IF EXISTS "Cash shifts all" ON public.cash_shifts;
DROP POLICY IF EXISTS "cash_shifts_permissive" ON public.cash_shifts;
CREATE POLICY "cash_shifts_permissive" ON public.cash_shifts FOR ALL USING (true) WITH CHECK (true);

-- 11. cash_movements
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Cash movements all" ON public.cash_movements;
DROP POLICY IF EXISTS "cash_movements_permissive" ON public.cash_movements;
CREATE POLICY "cash_movements_permissive" ON public.cash_movements FOR ALL USING (true) WITH CHECK (true);

-- 12. stock_transfers
ALTER TABLE public.stock_transfers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Stock transfers all" ON public.stock_transfers;
DROP POLICY IF EXISTS "stock_transfers_permissive" ON public.stock_transfers;
CREATE POLICY "stock_transfers_permissive" ON public.stock_transfers FOR ALL USING (true) WITH CHECK (true);

-- 13. stock_transfer_items
ALTER TABLE public.stock_transfer_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Stock transfer items all" ON public.stock_transfer_items;
DROP POLICY IF EXISTS "stock_transfer_items_permissive" ON public.stock_transfer_items;
CREATE POLICY "stock_transfer_items_permissive" ON public.stock_transfer_items FOR ALL USING (true) WITH CHECK (true);

-- 14. settings
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Settings all" ON public.settings;
DROP POLICY IF EXISTS "settings_permissive" ON public.settings;
CREATE POLICY "settings_permissive" ON public.settings FOR ALL USING (true) WITH CHECK (true);

-- 15. licenses
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Licenses all" ON public.licenses;
DROP POLICY IF EXISTS "licenses_permissive" ON public.licenses;
CREATE POLICY "licenses_permissive" ON public.licenses FOR ALL USING (true) WITH CHECK (true);

-- 16. suppliers
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Suppliers all" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_permissive" ON public.suppliers;
CREATE POLICY "suppliers_permissive" ON public.suppliers FOR ALL USING (true) WITH CHECK (true);

-- 17. purchase_orders
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Purchase orders all" ON public.purchase_orders;
DROP POLICY IF EXISTS "purchase_orders_permissive" ON public.purchase_orders;
CREATE POLICY "purchase_orders_permissive" ON public.purchase_orders FOR ALL USING (true) WITH CHECK (true);

-- 18. purchase_order_items
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Purchase order items all" ON public.purchase_order_items;
DROP POLICY IF EXISTS "purchase_order_items_permissive" ON public.purchase_order_items;
CREATE POLICY "purchase_order_items_permissive" ON public.purchase_order_items FOR ALL USING (true) WITH CHECK (true);

-- 19. daily_stats
ALTER TABLE public.daily_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read daily_stats" ON public.daily_stats;
DROP POLICY IF EXISTS "Allow public insert/update/delete daily_stats" ON public.daily_stats;
DROP POLICY IF EXISTS "daily_stats_permissive" ON public.daily_stats;
CREATE POLICY "daily_stats_permissive" ON public.daily_stats FOR ALL USING (true) WITH CHECK (true);

-- 20. app_settings
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Allow public insert/update/delete app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "app_settings_permissive" ON public.app_settings;
CREATE POLICY "app_settings_permissive" ON public.app_settings FOR ALL USING (true) WITH CHECK (true);

-- 21. user_preferences
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read user_preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Allow public insert/update/delete user_preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "user_preferences_permissive" ON public.user_preferences;
CREATE POLICY "user_preferences_permissive" ON public.user_preferences FOR ALL USING (true) WITH CHECK (true);
