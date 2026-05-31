/**
 * Utilidades matemáticas puras para cálculos de ventas
 */

export function calculateChange(total: number, received: number): number {
  return Math.max(0, received - total);
}

export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}
