import { useMemo } from 'react';
import { Transaction } from '../../../types';

interface SalesHistoryResult {
  todaySales: Transaction[];
  weeklySales: Transaction[];
  monthlySales: Transaction[];
  totalToday: number;
  totalWeek: number;
  totalMonth: number;
  countToday: number;
}

export function useSalesHistory(transactions: Transaction[]): SalesHistoryResult {
  return useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const todaySales = transactions.filter((t) => {
      const txnDate = t.date?.split('T')[0];
      return txnDate === todayStr;
    });

    const weeklySales = transactions.filter((t) => {
      const txnDate = new Date(t.date);
      return txnDate >= startOfWeek;
    });

    const monthlySales = transactions.filter((t) => {
      const txnDate = new Date(t.date);
      return txnDate >= startOfMonth;
    });

    return {
      todaySales,
      weeklySales,
      monthlySales,
      totalToday: todaySales.reduce((sum, t) => sum + t.total, 0),
      totalWeek: weeklySales.reduce((sum, t) => sum + t.total, 0),
      totalMonth: monthlySales.reduce((sum, t) => sum + t.total, 0),
      countToday: todaySales.length,
    };
  }, [transactions]);
}
