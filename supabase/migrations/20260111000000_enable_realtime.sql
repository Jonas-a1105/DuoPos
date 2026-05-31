-- Migration: 20260111000000_enable_realtime.sql
-- Description: Recreate the supabase_realtime publication to enable real-time updates for profiles, products, transactions, cash_shifts, and customers.

-- Recreate publication supabase_realtime
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR TABLE 
  public.profiles, 
  public.products, 
  public.transactions, 
  public.cash_shifts, 
  public.customers;
