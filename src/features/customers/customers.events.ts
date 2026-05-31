import { globalEventBus } from '../../shared/events/EventBus';

export const CUSTOMERS_EVENTS = {
  CUSTOMER_CREATED: 'customers:customer_created',
  CUSTOMER_UPDATED: 'customers:customer_updated',
  CUSTOMER_DELETED: 'customers:customer_deleted',
  LOYALTY_POINTS_CHANGED: 'customers:loyalty_points_changed',
} as const;

export interface CustomerCreatedPayload {
  customerId: string;
  customerName: string;
}

export interface CustomerUpdatedPayload {
  customerId: string;
  customerName: string;
  changes: Partial<{ name: string; email: string; phone: string; creditLimit: number }>;
}

export interface CustomerDeletedPayload {
  customerId: string;
  customerName: string;
}

export interface LoyaltyPointsChangedPayload {
  customerId: string;
  customerName: string;
  previousGems: number;
  newGems: number;
  difference: number;
}

export function emitCustomerCreated(payload: CustomerCreatedPayload): void {
  globalEventBus.publish<CustomerCreatedPayload>(CUSTOMERS_EVENTS.CUSTOMER_CREATED, payload);
}

export function emitCustomerUpdated(payload: CustomerUpdatedPayload): void {
  globalEventBus.publish<CustomerUpdatedPayload>(CUSTOMERS_EVENTS.CUSTOMER_UPDATED, payload);
}

export function emitCustomerDeleted(payload: CustomerDeletedPayload): void {
  globalEventBus.publish<CustomerDeletedPayload>(CUSTOMERS_EVENTS.CUSTOMER_DELETED, payload);
}

export function emitLoyaltyPointsChanged(payload: LoyaltyPointsChangedPayload): void {
  globalEventBus.publish<LoyaltyPointsChangedPayload>(CUSTOMERS_EVENTS.LOYALTY_POINTS_CHANGED, payload);
}
