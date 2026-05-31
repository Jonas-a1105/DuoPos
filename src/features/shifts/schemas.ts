import { z } from 'zod';

export const ShiftOpenSchema = z.object({
  initialCash: z.preprocess(
    (val) => Number(val),
    z.number().min(0, 'El efectivo inicial no puede ser negativo'),
  ),
  notes: z.string().optional().default(''),
});

export type ShiftOpenValues = z.infer<typeof ShiftOpenSchema>;

export const ShiftCloseSchema = z.object({
  actualCash: z.preprocess(
    (val) => Number(val),
    z.number().min(0, 'El efectivo final no puede ser negativo'),
  ),
  notes: z.string().optional().default(''),
});

export type ShiftCloseValues = z.infer<typeof ShiftCloseSchema>;

export const CashMovementSchema = z.object({
  type: z.enum(['in', 'out']),
  amount: z.preprocess(
    (val) => Number(val),
    z.number().min(1, 'El monto debe ser mayor a 0'),
  ),
  reason: z.string().min(1, 'La razón del movimiento es obligatoria'),
});

export type CashMovementValues = z.infer<typeof CashMovementSchema>;
