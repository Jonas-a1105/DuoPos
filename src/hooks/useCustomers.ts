import { useCallback } from 'react';
import { Customer, LicenseDetails } from '../types';
import { useCustomerStore } from '../stores/useCustomerStore';
import { syncInsert, syncSave, syncDelete, generateUUID, syncDailyStats } from '../services/supabaseSync';
import { addAuditLog } from '../services/auditService';
import { toast } from '../components/Modal/FlashNotifications';
import { playSound } from '../services/sounds';

export function useCustomers() {
  const customers = useCustomerStore((s) => s.customers);
  const setCustomers = useCustomerStore((s) => s.setCustomers);

  const addCustomer = useCallback(
    async (
      newCust: Omit<Customer, 'id' | 'registeredAt' | 'purchasesCount' | 'totalSpent' | 'gems' | 'league'>,
      licenseDetails?: LicenseDetails,
    ) => {
      if (licenseDetails && customers.length >= licenseDetails.clientLimit) {
        playSound('error');
        toast.error(
          `Has completado el límite para el plan actual (${licenseDetails.clientLimit} clientes). Para registrar más clientes leales, actualiza tu licencia en Ajustes > Planes.`,
          { title: 'Plan de Pago Excedido 🔒', duration: 8000 },
        );
        return;
      }

      const formatted: Customer = {
        ...newCust,
        id: generateUUID(),
        registeredAt: new Date().toISOString(),
        purchasesCount: 0,
        totalSpent: 0,
        gems: 0,
        league: 'Bronce',
      };
      const updated = [formatted, ...customers];
      setCustomers(updated);

      await syncInsert<Customer>('customers', 'duo_pos_customers', updated, formatted);
      addAuditLog(
        'clientes',
        'crear',
        `Cliente '${newCust.name}' registrado con límite de crédito $${newCust.creditLimit || 0} USD y teléfono ${newCust.phone || 'S/N'}`
      );

      // Increment daily customer registry counts for gamification
      try {
        const today = new Date().toISOString().split('T')[0];
        const dayStatsRaw = localStorage.getItem(`duo_pos_daily_acts_${today}`);
        const currentStats = dayStatsRaw
          ? JSON.parse(dayStatsRaw)
          : { barcodeScans: 0, invoicesEmitted: 0, customersRegistered: 0 };
        currentStats.customersRegistered = (currentStats.customersRegistered || 0) + 1;
        localStorage.setItem(`duo_pos_daily_acts_${today}`, JSON.stringify(currentStats));
        // Sincronizar estadísticas en Supabase
        syncDailyStats(today, currentStats).catch((err) => console.error('Error syncing daily stats:', err));
      } catch (e) {}

      toast.success(`Cliente "${newCust.name}" registrado correctamente en Duo Loyalty. 🎉`, {
        title: 'Panel de Clientes 👥',
      });
    },
    [customers, setCustomers],
  );

  const updateCustomer = useCallback(
    async (cust: Customer) => {
      const previousCust = customers.find((c) => c.id === cust.id);
      let changedItem: Customer | null = null;
      const updated = customers.map((c) => {
        if (c.id === cust.id) {
          let newLeague = c.league;
          const spent = cust.totalSpent;
          if (spent >= 5000) newLeague = 'Obsidiana';
          else if (spent >= 2500) newLeague = 'Esmeralda';
          else if (spent >= 1200) newLeague = 'Rubí';
          else if (spent >= 600) newLeague = 'Zafiro';
          else if (spent >= 300) newLeague = 'Oro';
          else if (spent >= 150) newLeague = 'Plata';
          else newLeague = 'Bronce';

          if (previousCust && previousCust.league !== newLeague) {
            setTimeout(() => {
              toast.achievement(`¡${cust.name} ha subido de Liga a ${newLeague}! 🏆`, {
                title: 'Liga Duolingo Clientes ⭐️',
              });
            }, 300);
          }

          changedItem = { ...cust, league: newLeague };
          return changedItem;
        }
        return c;
      });
      setCustomers(updated);

      if (changedItem) {
        if (previousCust) {
          const limitBefore = previousCust.creditLimit || 0;
          const limitAfter = (changedItem as Customer).creditLimit || 0;
          const gemsBefore = previousCust.gems || 0;
          const gemsAfter = (changedItem as Customer).gems || 0;
          const debtBefore = previousCust.creditUsed || 0;
          const debtAfter = (changedItem as Customer).creditUsed || 0;

          let auditText = `Cliente '${(changedItem as Customer).name}' actualizado. `;
          if (limitBefore !== limitAfter) {
            auditText += `Línea de crédito: $${limitBefore} -> $${limitAfter}. `;
          }
          if (gemsBefore !== gemsAfter) {
            auditText += `Gemas de fidelidad: ${gemsBefore} G -> ${gemsAfter} G. `;
          }
          if (debtBefore !== debtAfter) {
            auditText += `Deuda (fiado): $${debtBefore} -> $${debtAfter}. `;
          }
          if (limitBefore === limitAfter && gemsBefore === gemsAfter && debtBefore === debtAfter) {
            auditText += `Datos de perfil de contacto modificados.`;
          }
          addAuditLog('clientes', 'modificar', auditText);
        }
        await syncSave<Customer>('customers', 'duo_pos_customers', updated, changedItem);
      }

      toast.success(`Datos de "${cust.name}" actualizados con éxito.`, { title: 'Panel de Clientes 👥' });
    },
    [customers, setCustomers],
  );

  const deleteCustomer = useCallback(
    async (id: string) => {
      const deletedName = customers.find((c) => c.id === id)?.name || '';
      const updated = customers.filter((c) => c.id !== id);
      setCustomers(updated);

      await syncDelete('customers', 'duo_pos_customers', updated, id);
      addAuditLog('clientes', 'eliminar', `Cliente '${deletedName}' eliminado de los registros locales.`);

      toast.warning(`Cliente ${deletedName ? `"${deletedName}"` : ''} eliminado de los registros.`, {
        title: 'Panel de Clientes 👥',
      });
    },
    [customers, setCustomers],
  );

  const processCustomerLoyalty = useCallback(
    async (txn: {
      customerId?: string;
      total: number;
      gemsGained?: number;
      gemsRedeemed?: number;
      paymentMethod?: string;
      id: string;
    }) => {
      if (!txn.customerId) return;

      const updatedCustList = customers.map((c) => {
        if (c.id === txn.customerId) {
          const totalSpent = Number((c.totalSpent + txn.total).toFixed(2));
          const gemsGained = txn.gemsGained || 0;
          const gemsRedeemed = txn.gemsRedeemed || 0;
          const gems = Math.max(0, c.gems + gemsGained - gemsRedeemed);
          const purchasesCount = c.purchasesCount + 1;

          let league = c.league;
          if (totalSpent >= 5000) league = 'Obsidiana';
          else if (totalSpent >= 2500) league = 'Esmeralda';
          else if (totalSpent >= 1200) league = 'Rubí';
          else if (totalSpent >= 600) league = 'Zafiro';
          else if (totalSpent >= 300) league = 'Oro';
          else if (totalSpent >= 150) league = 'Plata';
          else league = 'Bronce';

          let creditUsed = c.creditUsed !== undefined ? c.creditUsed : 0;
          let creditHistory = c.creditHistory !== undefined ? [...c.creditHistory] : [];

          if (txn.paymentMethod === 'credit') {
            creditUsed = Number((creditUsed + txn.total).toFixed(2));
            creditHistory.unshift({
              id: generateUUID(),
              amount: txn.total,
              type: 'charge',
              date: new Date().toISOString(),
              notes: `Compra POS #F-${txn.id}`,
              transactionId: txn.id,
            });
          }

          return {
            ...c,
            totalSpent,
            gems,
            purchasesCount,
            league,
            creditLimit: c.creditLimit !== undefined ? c.creditLimit : 0,
            creditUsed,
            creditHistory,
          };
        }
        return c;
      });

      setCustomers(updatedCustList);

      const changedCust = updatedCustList.find((c) => c.id === txn.customerId);
      if (changedCust) {
        await syncSave<Customer>('customers', 'duo_pos_customers', updatedCustList, changedCust);
      }
    },
    [customers, setCustomers],
  );

  return {
    customers,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    processCustomerLoyalty,
  };
}
