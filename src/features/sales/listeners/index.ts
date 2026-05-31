import { globalEventBus } from '../../../shared/events/EventBus';
import { SALES_EVENTS } from '../sales.events';

export function initSalesListeners(): () => void {
  const unsubSaleCompleted = globalEventBus.subscribe(SALES_EVENTS.SALE_COMPLETED, (payload) => {
    console.log('[SalesListener] Venta completada:', payload.saleId);
  });

  return () => {
    unsubSaleCompleted();
  };
}
