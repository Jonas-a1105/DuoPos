import { globalEventBus } from '../../shared/events/EventBus';

export const LOGISTICS_EVENTS = {
  TRANSFER_CREATED: 'logistics:transfer_created',
  TRANSFER_COMPLETED: 'logistics:transfer_completed',
} as const;

export interface TransferCreatedPayload {
  transferId: string;
  fromBranchId: string;
  fromBranchName: string;
  toBranchId: string;
  toBranchName: string;
  itemsCount: number;
  createdAt: string;
}

export interface TransferCompletedPayload {
  transferId: string;
  fromBranchId: string;
  fromBranchName: string;
  toBranchId: string;
  toBranchName: string;
  completedAt: string;
}

export function emitTransferCreated(payload: TransferCreatedPayload): void {
  globalEventBus.publish<TransferCreatedPayload>(LOGISTICS_EVENTS.TRANSFER_CREATED, payload);
}

export function emitTransferCompleted(payload: TransferCompletedPayload): void {
  globalEventBus.publish<TransferCompletedPayload>(LOGISTICS_EVENTS.TRANSFER_COMPLETED, payload);
}
