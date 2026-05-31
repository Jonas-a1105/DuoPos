import { useCallback } from 'react';
import { CashShift, CashMovement } from '../../../types';
import { useSalesStore } from '../../../features/sales/store/useSalesStore';
import { generateUUID, syncSaveShift } from '../../../database/supabaseSync';
import { toast } from '../../../shared/ui/FlashNotifications/FlashNotifications';
import { emitShiftOpened, emitShiftClosed, emitShiftMovementAdded } from '../shifts.events';

export function useShifts() {
  const activeShift = useSalesStore((s) => s.activeShift);
  const setActiveShift = useSalesStore((s) => s.setActiveShift);
  const shiftHistory = useSalesStore((s) => s.shiftHistory);
  const setShiftHistory = useSalesStore((s) => s.setShiftHistory);
  const activeBranchId = useSalesStore((s) => s.activeBranchId);
  const activeRegisterId = useSalesStore((s) => s.activeRegisterId);

  const openShift = useCallback(
    async (initialCash: number, employeeId: string, employeeName: string, onGrantXp?: (amount: number) => void) => {
      const newShift: CashShift = {
        id: generateUUID(),
        employeeId,
        employeeName,
        openingTime: new Date().toISOString(),
        initialCash: Number(initialCash.toFixed(2)),
        expectedCash: Number(initialCash.toFixed(2)),
        status: 'open',
        movements: [],
        salesCount: 0,
        salesVolume: 0,
        branchId: activeBranchId,
        registerId: activeRegisterId,
      };
      setActiveShift(newShift);

      await syncSaveShift(newShift, true);
      emitShiftOpened({
        shiftId: newShift.id,
        employeeId: newShift.employeeId || '',
        employeeName: newShift.employeeName,
        initialCash: newShift.initialCash,
        openingTime: newShift.openingTime,
      });

      toast.success(`Caja abierta con un monto base de $${initialCash.toFixed(2)} USD. ¡Ganas +20 XP de inicio!`, {
        title: 'Apertura de Caja 📂',
      });
      onGrantXp?.(20);
    },
    [activeBranchId, activeRegisterId, setActiveShift],
  );

  const closeShift = useCallback(
    async (
      actualCash: number,
      expectedCash: number,
      difference: number,
      notes: string,
      onGrantXp?: (amount: number) => void,
    ) => {
      if (!activeShift) return;
      const closedShift: CashShift = {
        ...activeShift,
        closingTime: new Date().toISOString(),
        actualCash: Number(actualCash.toFixed(2)),
        difference: Number(difference.toFixed(2)),
        status: 'closed',
        expectedCash: Number(expectedCash.toFixed(2)),
      };

      const updatedHistory = [closedShift, ...shiftHistory];
      setShiftHistory(updatedHistory);

      await syncSaveShift(closedShift, false, updatedHistory);
      emitShiftClosed({
        shiftId: closedShift.id,
        employeeId: closedShift.employeeId || '',
        employeeName: closedShift.employeeName,
        expectedCash: closedShift.expectedCash,
        actualCash: closedShift.actualCash || 0,
        difference: closedShift.difference || 0,
        closingTime: closedShift.closingTime || new Date().toISOString(),
        salesCount: closedShift.salesCount,
        salesVolume: closedShift.salesVolume,
      });

      setActiveShift(null);

      let xpReward = 30;
      if (Math.abs(difference) < 0.01) {
        xpReward += 20;
        toast.achievement(`Cierre de caja perfecto. ¡Bono de +20 XP extra aplicado! 🏆`, {
          title: '¡Arqueo Perfecto! ✅',
          duration: 6000,
        });
      } else {
        toast.warning(`Turno cerrado. Descrepancia de caja calculada: $${difference.toFixed(2)} USD.`, {
          title: 'Cierre de Turno 📂',
          duration: 5500,
        });
      }
      onGrantXp?.(xpReward);
    },
    [activeShift, shiftHistory, setActiveShift, setShiftHistory],
  );

  const addShiftMovement = useCallback(
    async (type: 'in' | 'out', amount: number, reason: string) => {
      if (!activeShift) return;
      const movement: CashMovement = {
        id: generateUUID(),
        type,
        amount: Number(amount.toFixed(2)),
        reason: reason || (type === 'in' ? 'Entrada manual' : 'Salida manual'),
        timestamp: new Date().toISOString(),
      };

      const delta = type === 'in' ? amount : -amount;
      const updatedShift: CashShift = {
        ...activeShift,
        movements: [...activeShift.movements, movement],
        expectedCash: Number((activeShift.expectedCash + delta).toFixed(2)),
      };
      setActiveShift(updatedShift);

      await syncSaveShift(updatedShift, true);
      emitShiftMovementAdded({
        shiftId: updatedShift.id,
        movementId: movement.id,
        type: movement.type,
        amount: movement.amount,
        reason: movement.reason,
      });

      toast.info(
        `Movimiento de caja registrado: ${type === 'in' ? 'Entrada (+)' : 'Salida (-)'} de $${amount.toFixed(2)} USD para "${movement.reason}"`,
        { title: 'Efectivo en Caja 💵' },
      );
    },
    [activeShift, setActiveShift],
  );

  const updateShiftAfterSale = useCallback(
    async (total: number, cashAddition: number, paymentMethod: string, isMixedPayment: boolean) => {
      if (!activeShift) return;

      const updatedShift: CashShift = {
        ...activeShift,
        salesCount: activeShift.salesCount + 1,
        salesVolume: Number((activeShift.salesVolume + total).toFixed(2)),
        expectedCash: Number((activeShift.expectedCash + cashAddition).toFixed(2)),
      };
      setActiveShift(updatedShift);
      await syncSaveShift(updatedShift, true);
    },
    [activeShift, setActiveShift],
  );

  const updateShiftAfterRefund = useCallback(
    async (txnTotal: number, isCash: boolean) => {
      if (!activeShift) return;
      const updatedShift: CashShift = {
        ...activeShift,
        salesCount: Math.max(0, activeShift.salesCount - 1),
        salesVolume: Math.max(0, Number((activeShift.salesVolume - txnTotal).toFixed(2))),
        expectedCash: isCash
          ? Math.max(activeShift.initialCash, Number((activeShift.expectedCash - txnTotal).toFixed(2)))
          : activeShift.expectedCash,
      };
      setActiveShift(updatedShift);
      await syncSaveShift(updatedShift, true);
    },
    [activeShift, setActiveShift],
  );

  return {
    activeShift,
    shiftHistory,
    openShift,
    closeShift,
    addShiftMovement,
    updateShiftAfterSale,
    updateShiftAfterRefund,
  };
}
