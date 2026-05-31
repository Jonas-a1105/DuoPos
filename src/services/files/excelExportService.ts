import * as XLSX from 'xlsx';
import { Transaction, Product, Customer } from '../../types';

export function exportTransactionsToExcel(transactions: Transaction[], filename = 'duopos_transacciones.xlsx') {
  const data = transactions.map((t) => ({
    ID: t.id,
    Fecha: t.date,
    Empleado: t.employeeName,
    Subtotal: t.subtotal,
    IVA: t.tax,
    Descuento: t.discount,
    Total: t.total,
    'Método Pago': t.paymentMethod,
    Sucursal: t.branchId || '',
    Caja: t.registerId || '',
    Cliente: t.customerId || '',
    XP: t.xpGained,
    Items: t.items.map((i) => `${i.quantity}x ${i.name}`).join(', '),
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Transacciones');
  XLSX.writeFile(wb, filename);
}

export function exportProductsToExcel(products: Product[], filename = 'duopos_productos.xlsx') {
  const data = products.map((p) => ({
    ID: p.id,
    Nombre: p.name,
    Precio: p.price,
    Costo: p.cost,
    Stock: p.stock,
    Categoría: p.category,
    Emoji: p.emoji,
    'Stock Mínimo': p.minStock || 5,
    Código: p.barcode || '',
    Descripción: p.description,
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Productos');
  XLSX.writeFile(wb, filename);
}

export function exportCustomersToExcel(customers: Customer[], filename = 'duopos_clientes.xlsx') {
  const data = customers.map((c) => ({
    ID: c.id,
    Nombre: c.name,
    Teléfono: c.phone,
    Email: c.email,
    Gemas: c.gems,
    Compras: c.purchasesCount,
    'Total Gastado': c.totalSpent,
    Liga: c.league,
    'Crédito Límite': c.creditLimit || 0,
    'Crédito Usado': c.creditUsed || 0,
    RFC: c.taxId || '',
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
  XLSX.writeFile(wb, filename);
}

export function exportAuditLogsToExcel(logs: any[], filename = 'duopos_auditoria.xlsx') {
  const data = logs.map((l) => ({
    ID: l.id,
    Fecha: new Date(l.timestamp).toLocaleString('es-ES'),
    Usuario: l.username,
    Rol: l.role,
    Módulo: l.module.toUpperCase(),
    Acción: l.action.toUpperCase(),
    Detalles: l.details,
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Bitacora Auditoria');
  XLSX.writeFile(wb, filename);
}
