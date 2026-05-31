-- Sales Schema: Ventas, Pagos, Cajas y Clientes
CREATE TABLE public.transactions (
  id TEXT PRIMARY KEY,
  date TIMESTAMPTZ DEFAULT NOW(),
  items JSONB NOT NULL DEFAULT '[]',
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount DECIMAL(12,2) NOT NULL DEFAULT 0,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  payment_method TEXT DEFAULT 'cash',
  is_mixed_payment BOOLEAN DEFAULT FALSE,
  mixed_cash_amount DECIMAL(12,2) DEFAULT 0,
  mixed_card_amount DECIMAL(12,2) DEFAULT 0,
  employee_name TEXT DEFAULT '',
  status TEXT DEFAULT 'active',
  refunded BOOLEAN DEFAULT FALSE,
  refunded_at TIMESTAMPTZ,
  xp_gained INTEGER DEFAULT 0,
  customer_id TEXT,
  gems_gained INTEGER DEFAULT 0,
  branch_id TEXT,
  register_id TEXT,
  card_payment_details JSONB,
  invoice_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Transactions select"
  ON public.transactions FOR SELECT
  USING (true);

CREATE POLICY "Transactions insert"
  ON public.transactions FOR INSERT
  WITH CHECK (true);

CREATE TABLE public.customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  gems INTEGER DEFAULT 0,
  purchases_count INTEGER DEFAULT 0,
  total_spent DECIMAL(12,2) DEFAULT 0,
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  league TEXT DEFAULT 'Bronce',
  fiscal_name TEXT,
  tax_id TEXT,
  credit_limit DECIMAL(12,2) DEFAULT 0,
  credit_used DECIMAL(12,2) DEFAULT 0,
  credit_history JSONB DEFAULT '[]'
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers select"
  ON public.customers FOR SELECT
  USING (true);

CREATE POLICY "Customers insert"
  ON public.customers FOR INSERT
  WITH CHECK (true);

CREATE TABLE public.cash_shifts (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  employee_name TEXT DEFAULT '',
  opening_time TIMESTAMPTZ DEFAULT NOW(),
  closing_time TIMESTAMPTZ,
  initial_cash DECIMAL(12,2) DEFAULT 0,
  expected_cash DECIMAL(12,2) DEFAULT 0,
  actual_cash DECIMAL(12,2),
  difference DECIMAL(12,2),
  status TEXT DEFAULT 'open',
  movements JSONB DEFAULT '[]',
  sales_count INTEGER DEFAULT 0,
  sales_volume DECIMAL(12,2) DEFAULT 0,
  branch_id TEXT,
  register_id TEXT
);

ALTER TABLE public.cash_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cash shifts select"
  ON public.cash_shifts FOR SELECT
  USING (true);

CREATE POLICY "Cash shifts insert"
  ON public.cash_shifts FOR INSERT
  WITH CHECK (true);
