-- Fiscal Schema: Folios, Facturas Emitidas y Certificados
CREATE TABLE public.fiscal_invoices (
  id TEXT PRIMARY KEY,
  transaction_id TEXT REFERENCES public.transactions(id),
  uuid TEXT NOT NULL,
  invoice_no TEXT NOT NULL,
  fiscal_name TEXT NOT NULL,
  tax_id TEXT NOT NULL,
  regime TEXT,
  postal_code TEXT,
  certified_at TIMESTAMPTZ DEFAULT NOW(),
  sat_signature TEXT,
  payment_form TEXT,
  use_cfdi TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.fiscal_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fiscal invoices select"
  ON public.fiscal_invoices FOR SELECT
  USING (true);

CREATE POLICY "Fiscal invoices insert"
  ON public.fiscal_invoices FOR INSERT
  WITH CHECK (true);
