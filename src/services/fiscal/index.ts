/**
 * Fiscal module barrel — re-exports all fiscal/ tax and invoice functionality.
 *
 * Backward compatible: consumers can still `import { ... } from '../services/fiscal/index'`
 * or import directly from the sub-modules.
 */

export { SAT_PRODUCTS_MAP, SAT_UNITS_MAP, getClaveProdServ } from './satCatalogs';
export { calculateItemTax, type TaxBreakdown } from './taxCalculator';
export { generateCFDI40XML, getCadenaOriginal, getSATQrUrl } from './xmlGenerator';
export { parseMockConstancia, type ConstanciaPayload } from './constanciaParser';
export { isVenezuelanTaxContext, generateSENIATInvoiceText } from './venezuelanInvoice';
