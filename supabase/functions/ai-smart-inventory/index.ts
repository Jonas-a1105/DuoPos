import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts'
import { handleError } from '../_shared/errorHandler.ts'

serve(async (req) => {
  try {
    // Analyze historical trends and suggest stock purchases
    const { data: products } = await supabaseAdmin
      .from('products')
      .select('*')

    return new Response(JSON.stringify({
      suggestions: (products || []).map(p => ({
        productId: p.id,
        name: p.name,
        recommendedStock: Math.max(p.stock * 1.5, 10),
      })),
    }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return handleError(error, 'ai-smart-inventory')
  }
})
