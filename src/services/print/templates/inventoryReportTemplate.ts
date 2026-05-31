import { createEscPosDocument } from '../escPosEncoder';

interface InventoryReportData {
  companyName: string;
  date: string;
  items: { name: string; sku: string; stock: number; price: number }[];
  totalProducts: number;
  totalValue: number;
}

export function generateInventoryReport(data: InventoryReportData): string {
  const doc = createEscPosDocument();

  doc.line('REPORTE DE INVENTARIO', { align: 'center', bold: true, size: 'xlarge' });
  doc.line(data.companyName.toUpperCase(), { align: 'center' });
  doc.line(data.date, { align: 'center' });
  doc.divider('=');

  doc.line('PRODUCTO        SKU      STOCK   TOTAL', { bold: true });
  doc.divider();

  data.items.forEach((item) => {
    const name = item.name.substring(0, 16).padEnd(16);
    const sku = item.sku.substring(0, 8).padEnd(8);
    const stock = item.stock.toString().padStart(5);
    const total = `$${(item.stock * item.price).toFixed(2)}`.padStart(9);
    doc.line(`${name}${sku}${stock}${total}`);
  });

  doc.divider('=');
  doc.line(`TOTAL PRODUCTOS: ${data.totalProducts}`, { align: 'right' });
  doc.line(`VALOR TOTAL: $${data.totalValue.toFixed(2)}`, { align: 'right', bold: true, size: 'large' });
  doc.divider('=');

  doc.line('FIN DEL REPORTE', { align: 'center' });
  doc.cut();

  return doc.build();
}
