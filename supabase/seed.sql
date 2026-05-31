-- DuoPOS Seed Data
INSERT INTO public.branches (id, name, type, emoji, address, city) VALUES
  ('branch-central', 'CEDIS Central', 'central', '🏭', 'Av. Principal 123', 'Ciudad Central'),
  ('branch-centro', 'Sucursal Centro', 'branch', '🏪', 'Calle 5 de Mayo 456', 'Ciudad Central'),
  ('branch-norte', 'Sucursal Norte', 'branch', '🏬', 'Blvd. Norte 789', 'Ciudad Central');

INSERT INTO public.cash_registers (id, branch_id, name, emoji, status) VALUES
  ('reg-central-01', 'branch-central', 'Caja 1', '🖥️', 'active'),
  ('reg-centro-01', 'branch-centro', 'Caja Principal', '💻', 'active'),
  ('reg-norte-01', 'branch-norte', 'Caja Norte', '🖥️', 'active');
