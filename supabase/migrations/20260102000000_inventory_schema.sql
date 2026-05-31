-- Inventory Schema: Productos, Lotes, Almacenes e Impuestos
CREATE TABLE public.products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price DECIMAL(12,2) NOT NULL DEFAULT 0,
  cost DECIMAL(12,2) NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  category TEXT DEFAULT 'general',
  emoji TEXT DEFAULT '📦',
  description TEXT DEFAULT '',
  barcode TEXT,
  min_stock INTEGER DEFAULT 5,
  branches_stock JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Products select"
  ON public.products FOR SELECT
  USING (true);

CREATE POLICY "Products insert"
  ON public.products FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Products update"
  ON public.products FOR UPDATE
  USING (true);
