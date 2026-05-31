import { globalEventBus } from '../../shared/events/EventBus';

export const SHIFTS_EVENTS = {
  SHIFT_OPENED: 'shifts:shift_opened',
  SHIFT_CLOSED: 'shifts:shift_closed',
  SHIFT_MOVEMENT_ADDED: 'shifts:shift_movement_added',
} as const;

export interface ShiftOpenedPayload {
  shiftId: string;
  employeeId: string;
  employeeName: string;
  initialCash: number;
  openingTime: string;
}

export interface ShiftClosedPayload {
  shiftId: string;
  employeeId: string;
  employeeName: string;
  expectedCash: number;
  actualCash: number;
  difference: number;
  closingTime: string;
  salesCount: number;
  salesVolume: number;
}

export interface ShiftMovementAddedPayload {
  shiftId: string;
  movementId: string;
  type: 'in' | 'out';
  amount: number;
  reason: string;
}

export function emitShiftOpened(payload: ShiftOpenedPayload): void {
  globalEventBus.publish<ShiftOpenedPayload>(SHIFTS_EVENTS.SHIFT_OPENED, payload);
}

export function emitShiftClosed(payload: ShiftClosedPayload): void {
  globalEventBus.publish<ShiftClosedPayload>(SHIFTS_EVENTS.SHIFT_CLOSED, payload);
}

export function emitShiftMovementAdded(payload: ShiftMovementAddedPayload): void {
  globalEventBus.publish<ShiftMovementAddedPayload>(SHIFTS_EVENTS.SHIFT_MOVEMENT_ADDED, payload);
}
