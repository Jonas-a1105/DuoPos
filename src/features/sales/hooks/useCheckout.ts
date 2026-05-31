import { useCallback } from 'react';
import { CartItem, Transaction } from '../../../types';
import { globalEventBus } from '../../../shared/events/EventBus';
import { SALES_EVENTS } from '../sales.events';

interface UseCheckoutOptions {
  cart: CartItem[];
  transactions: Transaction[];
  setTransactions: (txns: Transaction[]) => void;
}

export function useCheckout({ cart, transactions, setTransactions }: UseCheckoutOptions) {
  const processCheckout = useCallback(
    async (paymentMethod: string, total: number, tax: number, discount: number) => {
      const saleId = `TXN-${Date.now()}-${Math.floor(Math.random() * 9000)}`;

      const transaction: Transaction = {
        id: saleId,
        date: new Date().toISOString(),
        items: cart.map((item) => ({
          productId: item.product.id,
          name: item.product.name,
          price: item.product.price,
          emoji: item.product.emoji,
          quantity: item.quantity,
          taxRateApplied: 16,
        })),
        subtotal: total - tax + discount,
        tax,
        discount,
        total,
        paymentMethod: paymentMethod as Transaction['paymentMethod'],
        employeeName: 'Cajero',
        xpGained: Math.max(10, Math.round(total / 4)),
      };

      const updatedTxns = [transaction, ...transactions];
      setTransactions(updatedTxns);

      globalEventBus.publish(SALES_EVENTS.SALE_COMPLETED, {
        saleId: transaction.id,
        date: transaction.date,
        subtotal: transaction.subtotal,
        tax: transaction.tax,
        discount: transaction.discount,
        total: transaction.total,
        paymentMethod: transaction.paymentMethod,
        items: transaction.items.map((item) => ({
          productId: item.productId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
      });

      return transaction;
    },
    [cart, transactions, setTransactions],
  );

  return { processCheckout };
}
