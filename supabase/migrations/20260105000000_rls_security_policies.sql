-- Row Level Security Policies
-- Suppliers
CREATE TABLE IF NOT EXISTS public.suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  category TEXT DEFAULT 'general',
  address TEXT DEFAULT '',
  delivery_days INTEGER DEFAULT 7,
  reliability INTEGER DEFAULT 50,
  balance DECIMAL(12,2) DEFAULT 0,
  payment_history JSONB DEFAULT '[]',
  due_date TEXT,
  payment_term_days INTEGER DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Suppliers all" ON public.suppliers USING (true) WITH CHECK (true);

-- Purchase Orders
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id TEXT PRIMARY KEY,
  supplier_id TEXT REFERENCES public.suppliers(id),
  supplier_name TEXT DEFAULT '',
  items JSONB DEFAULT '[]',
  subtotal DECIMAL(12,2) DEFAULT 0,
  tax DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) DEFAULT 0,
  payment_method TEXT DEFAULT 'cash',
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  estimated_delivery TEXT,
  received_at TIMESTAMPTZ,
  carrier TEXT DEFAULT ''
);

ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Purchase orders all" ON public.purchase_orders USING (true) WITH CHECK (true);

-- Stock Transfers
CREATE TABLE IF NOT EXISTS public.stock_transfers (
  id TEXT PRIMARY KEY,
  from_branch_id TEXT,
  from_branch_name TEXT DEFAULT '',
  to_branch_id TEXT,
  to_branch_name TEXT DEFAULT '',
  items JSONB DEFAULT '[]',
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  shipped_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  notes TEXT,
  carrier TEXT DEFAULT ''
);

ALTER TABLE public.stock_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Stock transfers all" ON public.stock_transfers USING (true) WITH CHECK (true);

-- Branches
CREATE TABLE IF NOT EXISTS public.branches (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'branch',
  emoji TEXT DEFAULT '🏪',
  address TEXT DEFAULT '',
  city TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Branches all" ON public.branches USING (true) WITH CHECK (true);

-- Cash Registers
CREATE TABLE IF NOT EXISTS public.cash_registers (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  name TEXT NOT NULL,
  emoji TEXT DEFAULT '💻',
  status TEXT DEFAULT 'active'
);

ALTER TABLE public.cash_registers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cash registers all" ON public.cash_registers USING (true) WITH CHECK (true);
