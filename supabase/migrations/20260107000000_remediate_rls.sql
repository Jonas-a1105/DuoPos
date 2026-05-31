-- Migration: Enable Row Level Security and set up permissive policies for local-first operations

-- 1. Suppliers
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Suppliers all" ON public.suppliers;
CREATE POLICY "Suppliers all" ON public.suppliers FOR ALL USING (true) WITH CHECK (true);

-- 2. Purchase Orders
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Purchase orders all" ON public.purchase_orders;
CREATE POLICY "Purchase orders all" ON public.purchase_orders FOR ALL USING (true) WITH CHECK (true);

-- 3. Purchase Order Items
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Purchase order items all" ON public.purchase_order_items;
CREATE POLICY "Purchase order items all" ON public.purchase_order_items FOR ALL USING (true) WITH CHECK (true);

-- 4. Licenses
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Licenses all" ON public.licenses;
CREATE POLICY "Licenses all" ON public.licenses FOR ALL USING (true) WITH CHECK (true);
