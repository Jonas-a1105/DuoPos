import { useCallback } from 'react';
import { Product, Supplier, PurchaseOrder } from '../types';
import { useInventoryStore } from '../stores/useInventoryStore';
import { useSalesStore } from '../stores/useSalesStore';
import { syncInsert, syncSave, syncDelete, generateUUID, syncSavePurchaseOrder } from '../services/supabaseSync';
import { toast } from '../components/Modal/FlashNotifications';

export function useInventory() {
  const products = useInventoryStore((s) => s.products);
  const setProducts = useInventoryStore((s) => s.setProducts);
  const suppliers = useInventoryStore((s) => s.suppliers);
  const setSuppliers = useInventoryStore((s) => s.setSuppliers);
  const purchaseOrders = useInventoryStore((s) => s.purchaseOrders);
  const setPurchaseOrders = useInventoryStore((s) => s.setPurchaseOrders);
  const stockTransfers = useInventoryStore((s) => s.stockTransfers);
  const setStockTransfers = useInventoryStore((s) => s.setStockTransfers);

  const addProduct = useCallback(
    async (newProd: Omit<Product, 'id'>, activeBranchId: string, onXp?: (amount: number) => void) => {
      const defaultBStock: Record<string, number> = {
        'branch-centro': newProd.stock,
        'branch-central': newProd.stock * 3 + 40,
        'branch-norte': Math.round(newProd.stock * 0.7) + 5,
      };
      defaultBStock[activeBranchId] = newProd.stock;

      const formatted: Product = {
        ...newProd,
        id: generateUUID(),
        branchesStock: defaultBStock,
      };
      const updated = [formatted, ...products];
      setProducts(updated);
      await syncInsert<Product>('products', 'duo_pos_products', updated, formatted);
      toast.success(`Producto "${newProd.name}" creado con éxito.`, { title: 'Catálogo de Productos 📦' });
      onXp?.(15);
    },
    [products, setProducts],
  );

  const updateProduct = useCallback(
    async (prod: Product, activeBranchId: string) => {
      let changedItem: Product | null = null;
      const updated = products.map((p) => {
        if (p.id === prod.id) {
          const bStock = prod.branchesStock ? { ...prod.branchesStock } : p.branchesStock ? { ...p.branchesStock } : {};
          if (!prod.branchesStock) {
            bStock[activeBranchId] = prod.stock;
          }
          const mainStock =
            activeBranchId === 'branch-centro'
              ? (bStock['branch-centro'] ?? prod.stock)
              : (bStock['branch-centro'] ?? p.stock);
          changedItem = { ...prod, branchesStock: bStock, stock: mainStock };
          return changedItem;
        }
        return p;
      });
      setProducts(updated);
      if (changedItem) {
        await syncSave<Product>('products', 'duo_pos_products', updated, changedItem);
      }
      toast.success(`Producto "${prod.name}" fue actualizado correctamente.`, { title: 'Catálogo de Productos 📦' });
    },
    [products, setProducts],
  );

  const deleteProduct = useCallback(
    async (id: string) => {
      const deletedName = products.find((p) => p.id === id)?.name || '';
      const updated = products.filter((p) => p.id !== id);
      setProducts(updated);
      await syncDelete('products', 'duo_pos_products', updated, id);
      toast.warning(`Producto ${deletedName ? `"${deletedName}"` : ''} eliminado del catálogo.`, {
        title: 'Catálogo de Productos 📦',
      });
    },
    [products, setProducts],
  );

  const decreaseStock = useCallback(
    async (productId: string, qty: number, activeBranchId: string) => {
      const updated = products.map((p) => {
        if (p.id === productId) {
          const branchStock = p.branchesStock ? { ...p.branchesStock } : {};
          const currentBranchStock = branchStock[activeBranchId] ?? p.stock;
          branchStock[activeBranchId] = Math.max(0, currentBranchStock - qty);
          const mainStock = activeBranchId === 'branch-centro' ? Math.max(0, currentBranchStock - qty) : p.stock;
          return { ...p, branchesStock: branchStock, stock: mainStock };
        }
        return p;
      });
      setProducts(updated);
      await syncSave<Product>('products', 'duo_pos_products', updated, updated.find((p) => p.id === productId)!);
    },
    [products, setProducts],
  );

  const addSupplier = useCallback(
    async (supplierData: Omit<Supplier, 'id' | 'balance'>) => {
      const formatted: Supplier = {
        ...supplierData,
        id: `sup-${Date.now()}`,
        balance: 0,
      };
      const updated = [formatted, ...suppliers];
      setSuppliers(updated);
      await syncInsert<Supplier>('suppliers', 'duo_pos_suppliers', updated, formatted);
      toast.success(`Proveedor "${formatted.name}" agregado con éxito.`, { title: 'Gestión de Proveedores 🚚' });
    },
    [suppliers, setSuppliers],
  );

  const updateSupplier = useCallback(
    async (supplier: Supplier) => {
      const updated = suppliers.map((s) => (s.id === supplier.id ? supplier : s));
      setSuppliers(updated);
      await syncSave<Supplier>('suppliers', 'duo_pos_suppliers', updated, supplier);
      toast.success(`Proveedor "${supplier.name}" actualizado correctamente.`, { title: 'Gestión de Proveedores 🚚' });
    },
    [suppliers, setSuppliers],
  );

  const deleteSupplier = useCallback(
    async (id: string) => {
      const deletedName = suppliers.find((s) => s.id === id)?.name || '';
      const updated = suppliers.filter((s) => s.id !== id);
      setSuppliers(updated);
      await syncDelete('suppliers', 'duo_pos_suppliers', updated, id);
      toast.warning(`Proveedor ${deletedName ? `"${deletedName}"` : ''} eliminado.`, {
        title: 'Gestión de Proveedores 🚚',
      });
    },
    [suppliers, setSuppliers],
  );

  const savePurchaseOrder = useCallback(
    async (po: PurchaseOrder) => {
      const updated = purchaseOrders.some((p) => p.id === po.id)
        ? purchaseOrders.map((p) => (p.id === po.id ? po : p))
        : [po, ...purchaseOrders];
      setPurchaseOrders(updated);
      await syncSavePurchaseOrder(po, updated);
      toast.success(`Orden de compra "${po.id}" guardada correctamente.`, { title: 'Órdenes de Compra 📦' });
    },
    [purchaseOrders, setPurchaseOrders],
  );

  const transitPurchaseOrder = useCallback(
    async (id: string, carrier: string, estimatedDelivery: string) => {
      const order = purchaseOrders.find((p) => p.id === id);
      if (!order) return;
      const updatedOrder: PurchaseOrder = { ...order, status: 'transit', carrier, estimatedDelivery };
      const updated = purchaseOrders.map((p) => (p.id === id ? updatedOrder : p));
      setPurchaseOrders(updated);
      await syncSavePurchaseOrder(updatedOrder, updated);
      toast.info(`Orden "${id}" enviada en tránsito con transportista: ${carrier}.`, { title: 'Órdenes de Compra 📦' });
    },
    [purchaseOrders, setPurchaseOrders],
  );

  const activeBranchId = useSalesStore((s) => s.activeBranchId);

  const receivePurchaseOrder = useCallback(
    async (id: string) => {
      const order = purchaseOrders.find((p) => p.id === id);
      if (!order) return;

      const updatedOrder: PurchaseOrder = {
        ...order,
        status: 'received',
        receivedAt: new Date().toISOString(),
      };

      // Loop through items in order and update catalog stock
      const updatedProducts = products.map((p) => {
        const orderItem = order.items.find((item) => item.productId === p.id);
        if (orderItem) {
          const bStock = p.branchesStock ? { ...p.branchesStock } : {};
          const currentBStock = bStock[activeBranchId] ?? p.stock;
          bStock[activeBranchId] = currentBStock + orderItem.quantity;

          // If active branch is Centro, also update general stock
          const mainStock = activeBranchId === 'branch-centro' ? currentBStock + orderItem.quantity : p.stock;

          return {
            ...p,
            branchesStock: bStock,
            stock: mainStock,
          };
        }
        return p;
      });

      // Update state
      setProducts(updatedProducts);

      // Save changes to IndexedDB / Supabase for each updated product
      for (const item of order.items) {
        const matchingProd = updatedProducts.find((p) => p.id === item.productId);
        if (matchingProd) {
          await syncSave<Product>('products', 'duo_pos_products', updatedProducts, matchingProd);
        }
      }

      const updated = purchaseOrders.map((p) => (p.id === id ? updatedOrder : p));
      setPurchaseOrders(updated);
      await syncSavePurchaseOrder(updatedOrder, updated);
      toast.success(`Orden "${id}" recibida. El inventario ha sido actualizado.`, { title: 'Órdenes de Compra 📦' });
    },
    [purchaseOrders, setPurchaseOrders, products, setProducts, activeBranchId],
  );

  const cancelPurchaseOrder = useCallback(
    async (id: string) => {
      const updated = purchaseOrders.map((p) => (p.id === id ? { ...p, status: 'cancelled' as const } : p));
      setPurchaseOrders(updated);
      const order = purchaseOrders.find((p) => p.id === id);
      if (order) {
        await syncSavePurchaseOrder({ ...order, status: 'cancelled' }, updated);
      }
      toast.warning(`Orden "${id}" cancelada.`, { title: 'Órdenes de Compra 📦' });
    },
    [purchaseOrders, setPurchaseOrders],
  );

  const registerSupplierPayout = useCallback(
    async (supplierId: string, amount: number, _notes: string) => {
      const updated = suppliers.map((s) =>
        s.id === supplierId ? { ...s, balance: Math.max(0, s.balance - amount) } : s,
      );
      setSuppliers(updated);
      const changed = updated.find((s) => s.id === supplierId);
      if (changed) {
        await syncSave<Supplier>('suppliers', 'duo_pos_suppliers', updated, changed);
      }
      toast.success(`Pago de $${amount.toFixed(2)} registrado a proveedor.`, { title: 'Proveedores 💰' });
    },
    [suppliers, setSuppliers],
  );

  return {
    products,
    suppliers,
    purchaseOrders,
    stockTransfers,
    addProduct,
    updateProduct,
    deleteProduct,
    decreaseStock,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    savePurchaseOrder,
    transitPurchaseOrder,
    receivePurchaseOrder,
    cancelPurchaseOrder,
    registerSupplierPayout,
  };
}
