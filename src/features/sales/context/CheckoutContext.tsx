import React, { createContext, useContext, useState, useCallback } from 'react';
import { CartItem, Transaction } from '../../../types';

interface CheckoutContextValue {
  checkoutStep: 'idle' | 'payment' | 'processing' | 'success';
  setCheckoutStep: (step: 'idle' | 'payment' | 'processing' | 'success') => void;
  selectedPaymentMethod: string | null;
  setSelectedPaymentMethod: (method: string | null) => void;
  lastTransaction: Transaction | null;
  startCheckout: () => void;
  completeCheckout: (txn: Transaction) => void;
  resetCheckout: () => void;
}

const CheckoutContext = createContext<CheckoutContextValue | null>(null);

export function CheckoutProvider({ children }: { children: React.ReactNode }) {
  const [checkoutStep, setCheckoutStep] = useState<'idle' | 'payment' | 'processing' | 'success'>('idle');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [lastTransaction, setLastTransaction] = useState<Transaction | null>(null);

  const startCheckout = useCallback(() => {
    setCheckoutStep('payment');
    setSelectedPaymentMethod(null);
  }, []);

  const completeCheckout = useCallback((txn: Transaction) => {
    setLastTransaction(txn);
    setCheckoutStep('success');
  }, []);

  const resetCheckout = useCallback(() => {
    setCheckoutStep('idle');
    setSelectedPaymentMethod(null);
    setLastTransaction(null);
  }, []);

  return (
    <CheckoutContext.Provider
      value={{
        checkoutStep,
        setCheckoutStep,
        selectedPaymentMethod,
        setSelectedPaymentMethod,
        lastTransaction,
        startCheckout,
        completeCheckout,
        resetCheckout,
      }}
    >
      {children}
    </CheckoutContext.Provider>
  );
}

export function useCheckoutContext(): CheckoutContextValue {
  const ctx = useContext(CheckoutContext);
  if (!ctx) throw new Error('useCheckoutContext must be used within CheckoutProvider');
  return ctx;
}
