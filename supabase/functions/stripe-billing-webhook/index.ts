import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts'
import { handleError } from '../_shared/errorHandler.ts'

serve(async (req) => {
  try {
    const event = await req.json()
    
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        // Handle subscription lifecycle
        break
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return handleError(error, 'stripe-billing-webhook')
  }
})
