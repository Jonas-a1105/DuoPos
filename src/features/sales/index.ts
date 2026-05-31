/**
 * index.ts — La aduana / API pública de Sales
 *
 * Expone únicamente las vistas, interfaces y disparadores autorizados
 * para consumo de otros módulos externos del POS (Domain-Driven Design).
 */

export { default as SalesScreen } from './components/SalesScreen';

export {
  SALES_EVENTS,
  emitSaleCompleted,
  type SaleCompletedItem,
  type SaleCompletedPayload,
} from './sales.events';
