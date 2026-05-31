import { globalEventBus } from '../../shared/events/EventBus';

export const SALES_EVENTS = {
  SALE_COMPLETED: 'sales:sale_completed',
};

export interface SaleCompletedItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface SaleCompletedPayload {
  saleId: string;
  date: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: string;
  items: SaleCompletedItem[];
  employeeId?: string;
  employeeName?: string;
  customerId?: string;
}

/**
 * Propaga de forma no bloqueante que una venta ha sido completada
 * para que otros módulos (inventario, fiscal, gamificación) actúen en consecuencia.
 */
export function emitSaleCompleted(payload: SaleCompletedPayload): void {
  globalEventBus.publish<SaleCompletedPayload>(SALES_EVENTS.SALE_COMPLETED, payload);
}
