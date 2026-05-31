import { create } from 'zustand';
import { Product, Supplier, PurchaseOrder, StockTransfer, ExpressEvent } from '../../../types';

interface InventoryState {
  products: Product[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  stockTransfers: StockTransfer[];
  activeEvent: ExpressEvent | null;
  lowStockCount: number;

  // Actions
  setProducts: (products: Product[]) => void;
  setSuppliers: (suppliers: Supplier[]) => void;
  setPurchaseOrders: (orders: PurchaseOrder[]) => void;
  setStockTransfers: (transfers: StockTransfer[]) => void;
  setActiveEvent: (event: ExpressEvent | null) => void;
}

export const useInventoryStore = create<InventoryState>((set) => ({
  products: [],
  suppliers: [],
  purchaseOrders: [],
  stockTransfers: [],
  activeEvent: null,
  lowStockCount: 0,

  setProducts: (products) => {
    const lowStockCount = products.filter((p) => p.stock <= 5).length;
    set({ products, lowStockCount });
  },
  setSuppliers: (suppliers) => set({ suppliers }),
  setPurchaseOrders: (purchaseOrders) => set({ purchaseOrders }),
  setStockTransfers: (stockTransfers) => set({ stockTransfers }),
  setActiveEvent: (activeEvent) => set({ activeEvent }),
}));
