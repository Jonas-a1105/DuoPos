import { z } from 'zod';

export const CustomerFormSchema = z.object({
  name: z.string().min(1, 'El nombre del cliente es obligatorio'),
  phone: z.string().optional().default(''),
  email: z.string().optional().default(''),
  fiscalName: z.string().optional().default(''),
  taxId: z.string().optional().default(''),
  regime: z.string().optional().default(''),
  postalCode: z.string().optional().default(''),
  creditLimit: z.preprocess(
    (val) => (val === '' || val === undefined ? 0 : Number(val)),
    z.number().min(0, 'El límite de crédito no puede ser menor a 0'),
  ),
});

export type CustomerFormValues = z.infer<typeof CustomerFormSchema>;
