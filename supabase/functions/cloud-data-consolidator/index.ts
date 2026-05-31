import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts'
import { handleError } from '../_shared/errorHandler.ts'

serve(async (req) => {
  try {
    // Consolidate nightly reports from all branches
    const { data: transactions } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .gte('date', new Date(new Date().setDate(new Date().getDate() - 1)).toISOString())

    return new Response(JSON.stringify({ consolidated: true, count: transactions?.length || 0 }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return handleError(error, 'cloud-data-consolidator')
  }
})
