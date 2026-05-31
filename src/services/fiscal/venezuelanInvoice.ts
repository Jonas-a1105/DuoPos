/**
 * SENIAT Venezuelan invoice generation.
 */

import type { Transaction, LegalBillingSettings } from '../../types';

export function isVenezuelanTaxContext(settings: LegalBillingSettings): boolean {
  if (!settings) return false;
  const isVenAuthority = settings.certifyingAuthority?.toUpperCase().includes('SENIAT');
  const isVenRif = /^[JVGEjvge]-?\d+/i.test(settings.companyTaxId || '');
  const isVenTax = settings.taxName?.toUpperCase() === 'IVA' && settings.generalTaxRate === 16;
  return !!(isVenAuthority || isVenRif || isVenTax);
}

export function generateSENIATInvoiceText(txn: Transaction, settings: LegalBillingSettings): string {
  const isCashUSD = txn.paymentMethod === 'cash';
  const igtfRate = 0.03;
  const igtfAmount = isCashUSD ? txn.total * igtfRate : 0;
  const grandTotal = txn.total + igtfAmount;

  return `================================================
          S.E.N.I.A.T.
${(settings.companyName || 'DUO ACADEMIA COMERCIAL').toUpperCase()}
RIF: ${settings.companyTaxId || 'J-120525D10'}
Direccion: ${settings.companyAddress || 'Caracas, Distrito Capital'}
================================================
FACTURA FISCAL NRO: ${txn.invoiceData?.invoiceNo || 'FAC-0001530'}
NRO CONTROL: ${txn.invoiceData?.uuid ? txn.invoiceData.uuid.substring(9, 21) : '00-0001530'}
FECHA: ${txn.date.replace('T', ' ').substring(0, 19)}
================================================
CLIENTE: ${(txn.invoiceData?.fiscalName || 'PÚBLICO EN GENERAL').toUpperCase()}
RIF/C.I: ${txn.invoiceData?.taxId || 'V-00000000'}
DIRECCION: CP ${txn.invoiceData?.postalCode || '1010'}
================================================
CANT  DESCRIPCION             PRECIO      TOTAL
------------------------------------------------
${txn.items
  .map((it) => {
    const nameTrunc = it.name.substring(0, 20).padEnd(20, ' ');
    const cantStr = it.quantity.toFixed(1).padStart(4, ' ');
    const priceStr = it.price.toFixed(2).padStart(8, ' ');
    const lineTotal = (it.price * it.quantity).toFixed(2).padStart(9, ' ');
    return `${cantStr}  ${nameTrunc} ${priceStr} ${lineTotal}`;
  })
  .join('\n')}
------------------------------------------------
SUBTOTAL: ${txn.subtotal.toFixed(2).padStart(30, ' ')}
DESCUENTO: ${txn.discount.toFixed(2).padStart(29, ' ')}
IVA GENERAL (16%): ${txn.tax.toFixed(2).padStart(22, ' ')}
${isCashUSD ? `IGTF (3% EFECTIVO USD): ${igtfAmount.toFixed(2).padStart(18, ' ')}` : ''}
------------------------------------------------
TOTAL FACTURA: ${grandTotal.toFixed(2).padStart(25, ' ')}
================================================
METODO DE PAGO: ${txn.paymentMethod === 'cash' ? 'EFECTIVO (USD)' : txn.paymentMethod === 'card' ? 'TRANSFERENCIA / DEBITO' : 'OTROS'}
NRO REGISTRO FISCAL: SENIAT-IMPFISCAL-DPG120525D10
FIRMA FISCAL: ${txn.invoiceData?.satSignature || 'MOCK-HASH-SENIAT-8f8d9b1a'}
================================================
   ¡Gracias por su compra en la Racha de Duo!
`;
}
