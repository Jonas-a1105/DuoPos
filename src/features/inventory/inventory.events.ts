import { globalEventBus } from '../../shared/events/EventBus';

export const INVENTORY_EVENTS = {
  STOCK_CHANGED: 'inventory:stock_changed',
  PRODUCT_CREATED: 'inventory:product_created',
  PRODUCT_UPDATED: 'inventory:product_updated',
  PRODUCT_DELETED: 'inventory:product_deleted',
} as const;

export interface StockChangedPayload {
  productId: string;
  productName: string;
  previousStock: number;
  newStock: number;
  quantity: number;
}

export interface ProductCreatedPayload {
  productId: string;
  productName: string;
  category: string;
}

export interface ProductUpdatedPayload {
  productId: string;
  productName: string;
  changes: Partial<{ name: string; price: number; stock: number; category: string }>;
}

export interface ProductDeletedPayload {
  productId: string;
  productName: string;
}

export function emitStockChanged(payload: StockChangedPayload): void {
  globalEventBus.publish<StockChangedPayload>(INVENTORY_EVENTS.STOCK_CHANGED, payload);
}

export function emitProductCreated(payload: ProductCreatedPayload): void {
  globalEventBus.publish<ProductCreatedPayload>(INVENTORY_EVENTS.PRODUCT_CREATED, payload);
}

export function emitProductUpdated(payload: ProductUpdatedPayload): void {
  globalEventBus.publish<ProductUpdatedPayload>(INVENTORY_EVENTS.PRODUCT_UPDATED, payload);
}

export function emitProductDeleted(payload: ProductDeletedPayload): void {
  globalEventBus.publish<ProductDeletedPayload>(INVENTORY_EVENTS.PRODUCT_DELETED, payload);
}
