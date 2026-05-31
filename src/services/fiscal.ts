/**
 * Fiscal barrel — re-exports all fiscal/ sub-modules.
 *
 * Mantenido para backward compatibility.
 * Los consumidores nuevos deben importar directamente de:
 *   services/fiscal/satCatalogs
 *   services/fiscal/taxCalculator
 *   services/fiscal/xmlGenerator
 *   services/fiscal/constanciaParser
 *   services/fiscal/venezuelanInvoice
 *   services/fiscal (este barrel)
 */

export {
  SAT_PRODUCTS_MAP,
  SAT_UNITS_MAP,
  getClaveProdServ,
  calculateItemTax,
  generateCFDI40XML,
  getCadenaOriginal,
  getSATQrUrl,
  parseMockConstancia,
  isVenezuelanTaxContext,
  generateSENIATInvoiceText,
} from './fiscal/index';

export type { TaxBreakdown, ConstanciaPayload } from './fiscal/index';
