import { z } from 'zod';

export const CheckoutFormSchema = z.object({
  paymentMethod: z.enum(['cash', 'card', 'mixed', 'credit']),
  receivedCash: z.number().min(0, 'El monto recibido no puede ser negativo'),
  receivedCard: z.number().min(0, 'El monto de tarjeta no puede ser negativo'),
  notes: z.string().optional(),
});

export type CheckoutFormValues = z.infer<typeof CheckoutFormSchema>;
