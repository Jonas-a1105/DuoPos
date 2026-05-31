import { createEscPosDocument } from '../escPosEncoder';

interface SaleTicketData {
  companyName: string;
  taxId: string;
  date: string;
  items: { name: string; qty: number; price: number; total: number }[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: string;
  invoiceNo?: string;
  uuid?: string;
}

export function generateSalesTicket(data: SaleTicketData): string {
  const doc = createEscPosDocument();

  doc.line(data.companyName.toUpperCase(), { align: 'center', bold: true, size: 'xlarge' });
  doc.line(`RFC: ${data.taxId}`, { align: 'center' });
  doc.line(data.date, { align: 'center' });
  doc.divider('=');

  if (data.invoiceNo) {
    doc.line('COMPROBANTE FISCAL', { align: 'center', bold: true });
    doc.line(`Folio: ${data.invoiceNo}`, { align: 'center' });
    if (data.uuid) doc.line(`UUID: ${data.uuid}`, { align: 'center' });
    doc.divider();
  }

  doc.line('DESCRIPCION       CANT     IMPORTE', { bold: true });
  doc.divider();

  data.items.forEach((item) => {
    const qtyStr = item.qty.toFixed(2).padStart(5);
    const totalStr = `$${item.total.toFixed(2)}`.padStart(10);
    doc.line(`${item.name.substring(0, 18).padEnd(18)}${qtyStr}     ${totalStr}`);
  });

  doc.divider();
  doc.line(`SUBTOTAL:          $${data.subtotal.toFixed(2)}`, { align: 'right' });
  if (data.discount > 0) doc.line(`DESCUENTO:        -$${data.discount.toFixed(2)}`, { align: 'right' });
  doc.line(`IVA:               $${data.tax.toFixed(2)}`, { align: 'right' });
  doc.divider('=');
  doc.line(`TOTAL:             $${data.total.toFixed(2)}`, { align: 'right', bold: true, size: 'large' });
  doc.divider('=');

  doc.line(`PAGO: ${data.paymentMethod.toUpperCase()}`, { align: 'center' });
  doc.line('GRACIAS POR SU COMPRA', { align: 'center', bold: true });
  doc.line('DUOPOS - LA RACHA COMERCIAL', { align: 'center' });

  doc.openDrawer();
  doc.cut();

  return doc.build();
}
