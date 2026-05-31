/**
 * SAT tax calculation helpers.
 */

import type { LegalBillingSettings } from '../../types';

export interface TaxBreakdown {
  base: number;
  taxRate: number;
  taxAmount: number;
  totalWithTax: number;
}

export function calculateItemTax(
  price: number,
  quantity: number,
  category: string,
  settings: LegalBillingSettings,
): TaxBreakdown {
  const override = settings?.categoryOverrides?.find((o) => o.category.toLowerCase() === category?.toLowerCase());
  const taxRate = override ? override.rate : (settings?.generalTaxRate ?? 16);
  const taxDecimal = taxRate / 100;

  const subtotalLine = price * quantity;

  if (settings?.taxIncludedInPrice) {
    const base = subtotalLine / (1 + taxDecimal);
    const taxAmount = subtotalLine - base;
    return {
      base: parseFloat(base.toFixed(2)),
      taxRate,
      taxAmount: parseFloat(taxAmount.toFixed(2)),
      totalWithTax: parseFloat(subtotalLine.toFixed(2)),
    };
  } else {
    const taxAmount = subtotalLine * taxDecimal;
    return {
      base: parseFloat(subtotalLine.toFixed(2)),
      taxRate,
      taxAmount: parseFloat(taxAmount.toFixed(2)),
      totalWithTax: parseFloat((subtotalLine + taxAmount).toFixed(2)),
    };
  }
}
