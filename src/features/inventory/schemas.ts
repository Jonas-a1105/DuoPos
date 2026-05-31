import { z } from 'zod';

export const ProductFormSchema = z.object({
  name: z.string().min(1, 'El nombre del producto es obligatorio'),
  price: z.preprocess((val) => Number(val), z.number().min(0.01, 'El precio debe ser mayor a 0')),
  cost: z.preprocess((val) => Number(val), z.number().min(0, 'El costo no puede ser menor a 0')),
  stock: z.preprocess((val) => Number(val), z.number().int().min(0, 'El inventario inicial no puede ser menor a 0')),
  category: z.string().min(1, 'Selecciona una categoría válida'),
  emoji: z.string().min(1, 'Selecciona un emoji para el producto'),
  description: z.string().optional().default(''),
  barcode: z.string().optional().default(''),
  minStock: z.preprocess(
    (val) => (val === '' || val === undefined ? 5 : Number(val)),
    z.number().int().min(0, 'El stock mínimo no puede ser menor a 0'),
  ),
});

export type ProductFormValues = z.infer<typeof ProductFormSchema>;
