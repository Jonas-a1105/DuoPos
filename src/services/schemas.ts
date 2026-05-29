import { z } from 'zod';

export const ProductSchema = z.object({
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

export type ProductFormValues = z.infer<typeof ProductSchema>;

export const CustomerSchema = z.object({
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

export type CustomerFormValues = z.infer<typeof CustomerSchema>;

export const SupplierSchema = z.object({
  name: z.string().min(1, 'El nombre del proveedor es obligatorio'),
  contact: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  email: z.string().optional().default(''),
  category: z.string().min(1, 'La categoría del proveedor es obligatoria'),
  address: z.string().optional().default(''),
  deliveryDays: z.preprocess(
    (val) => (val === '' || val === undefined ? 3 : Number(val)),
    z.number().int().min(1, 'Los días de entrega deben ser al menos 1'),
  ),
  reliability: z.preprocess(
    (val) => (val === '' || val === undefined ? 100 : Number(val)),
    z.number().int().min(0).max(100, 'La confiabilidad debe estar entre 0 y 100'),
  ),
});

export type SupplierFormValues = z.infer<typeof SupplierSchema>;
