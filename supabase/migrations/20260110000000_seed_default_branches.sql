-- Migration: 20260110000000_seed_default_branches.sql
-- Description: Seed default static branches and cash registers to avoid foreign key constraint violations (e.g., cash_shifts_branch_id_fkey).

-- 1. Seed default branches
INSERT INTO public.branches (id, name, type, emoji, city, address)
VALUES 
  ('branch-central', 'Almacén Central (CEDIS) 🏢', 'central', '🏢', 'CDMX', 'Camino Real de Toluca #400, Coyoacán'),
  ('branch-centro', 'Sucursal Duo Centro 🦉', 'branch', '🦉', 'CDMX', 'Av. Paseo de la Reforma #150, Cuauhtémoc'),
  ('branch-norte', 'Sucursal Portal Norte 🦁', 'branch', '🦁', 'Monterrey', 'Av. Lázaro Cárdenas #2400, San Pedro Garza García')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  emoji = EXCLUDED.emoji,
  city = EXCLUDED.city,
  address = EXCLUDED.address;

-- 2. Seed default cash registers
INSERT INTO public.cash_registers (id, branch_id, name, emoji, status)
VALUES
  ('reg-centro-1', 'branch-centro', 'Caja Principal 💵', '💵', 'active'),
  ('reg-centro-2', 'branch-centro', 'Caja Rápida ⚡', '⚡', 'active'),
  ('reg-norte-1', 'branch-norte', 'Caja Principal Duo 🦁', '🦁', 'active'),
  ('reg-norte-2', 'branch-norte', 'Kiosco Auto 🤖', '🤖', 'active'),
  ('reg-central-1', 'branch-central', 'Mesa de Despachos 📦', '📦', 'active')
ON CONFLICT (id) DO UPDATE SET
  branch_id = EXCLUDED.branch_id,
  name = EXCLUDED.name,
  emoji = EXCLUDED.emoji,
  status = EXCLUDED.status;
