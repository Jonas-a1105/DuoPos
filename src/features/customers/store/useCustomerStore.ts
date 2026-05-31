import { create } from 'zustand';
import { Customer } from '../../../types';

interface CustomerState {
  customers: Customer[];

  // Actions
  setCustomers: (customers: Customer[]) => void;
}

export const useCustomerStore = create<CustomerState>((set) => ({
  customers: [],

  setCustomers: (customers) => set({ customers }),
}));
