/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Transaction, LegalBillingSettings, Product } from '../types';

/**
 * Resolves the official SAT Catalogs for CFDI 4.0 compliance.
 */
export const SAT_PRODUCTS_MAP: Record<string, string> = {
  'cafetería': '50201708', // Bebidas de café
  'postres': '50181900',   // Pan dulce, pasteles
  'snack': '50192100',     // Aperitivos
  'oficina': '44122000',   // Útiles de oficina
  'servicios': '80141628', // Servicios de distribución o academia
  'cursos': '86101700',    // Educación o adiestramiento
};

export const SAT_UNITS_MAP: Record<string, { code: string; label: string }> = {
  'H87': { code: 'H87', label: 'Pieza' },
  'E48': { code: 'E48', label: 'Unidad de servicio' },
  'XBX': { code: 'XBX', label: 'Caja' },
  'LTR': { code: 'LTR', label: 'Litro' },
  'KGM': { code: 'KGM', label: 'Kilogramo' },
};

/**
 * Extract SAT key from name/category
 */
export function getClaveProdServ(category: string, productName: string): string {
  const normalizedCat = category.toLowerCase().trim();
  const normalizedName = productName.toLowerCase().trim();

  if (SAT_PRODUCTS_MAP[normalizedCat]) {
    return SAT_PRODUCTS_MAP[normalizedCat];
  }
  
  if (normalizedName.includes('café') || normalizedName.includes('bebida') || normalizedName.includes('latte')) {
    return '50201708';
  }
  if (normalizedName.includes('curso') || normalizedName.includes('taller') || normalizedName.includes('clase')) {
    return '86101700';
  }
  if (normalizedName.includes('servicio') || normalizedName.includes('consultoría')) {
    return '80141628';
  }
  return '43231500'; // Software de aplicación por defecto (DuoPOS)
}

/**
 * Calculates SAT Tax breakdown for a single item according to CFDI 4.0 parameters.
 */
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
  settings: LegalBillingSettings
): TaxBreakdown {
  // Find applicable tax rate
  const override = settings?.categoryOverrides?.find(
    (o) => o.category.toLowerCase() === category?.toLowerCase()
  );
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

/**
 * Build the SAT CFDI 4.0 XML file structure dynamically.
 */
export function generateCFDI40XML(txn: Transaction, settings: LegalBillingSettings): string {
  if (!txn.invoiceData) return '';
  const inv = txn.invoiceData;
  
  const emisorRfc = settings.companyTaxId || 'DAC120525D10';
  const emisorNombre = (settings.companyName || 'DUO ACADEMIA S.A. DE C.V.').toUpperCase();
  const emisorRegimeCode = settings.companyRegime ? settings.companyRegime.split(' ')[0] : '601';
  const emisorPostalCode = settings.companyPostalCode || '06700';
  
  const receptorRfc = inv.taxId.toUpperCase();
  const receptorNombre = inv.fiscalName.toUpperCase();
  const receptorRegimeCode = inv.regime ? inv.regime.split(' ')[0] : '601';
  const receptorPostalCode = inv.postalCode || '06700';
  const usoCfdiCode = inv.useCFDI ? inv.useCFDI.split(' ')[0] : 'G03';
  const formaPagoCode = inv.paymentForm ? inv.paymentForm.split(' ')[0] : '01';

  // Calculate items XML block
  const conceptosXMLLines = txn.items.map((it) => {
    // Resolve ClaveProdServ dynamically based on some context or hardcoded
    const claveProdServ = getClaveProdServ(it.emoji || '', it.name);
    
    // We assume tax override or standard tax rate applied in transaction details
    const ratePercentage = it.taxRateApplied !== undefined ? it.taxRateApplied : (settings.generalTaxRate ?? 16);
    const rateDecimal = (ratePercentage / 100).toFixed(6);
    
    // Exact SAT Math
    const totalLine = it.price * it.quantity;
    let base = totalLine;
    let impuesto = 0;
    
    if (settings.taxIncludedInPrice) {
      base = totalLine / (1 + (ratePercentage / 100));
      impuesto = totalLine - base;
    } else {
      impuesto = totalLine * (ratePercentage / 100);
    }

    const valorUnitario = settings.taxIncludedInPrice ? (it.price / (1 + (ratePercentage / 100))) : it.price;

    return `    <cfdi:Concepto ClaveProdServ="${claveProdServ}" Cantidad="${it.quantity.toFixed(2)}" ClaveUnidad="H87" Unidad="Pieza" Descripcion="${it.name.toUpperCase()}" ValorUnitario="${valorUnitario.toFixed(2)}" Importe="${base.toFixed(2)}" ObjetoImp="02">
      <cfdi:Impuestos>
        <cfdi:Traslados>
          <cfdi:Traslado Base="${base.toFixed(2)}" Impuesto="002" TipoFactor="Tasa" TasaOCuota="${rateDecimal}" Importe="${impuesto.toFixed(2)}"/>
        </cfdi:Traslados>
      </cfdi:Impuestos>
    </cfdi:Concepto>`;
  }).join('\n');

  // Overall calculations
  const totalImpuestosTrasladados = txn.tax;
  const subTotalCalc = txn.subtotal;
  const descuentoCalc = txn.discount;
  const totalCalc = txn.total;

  const rfcProvCertif = 'DIL120525A12'; // DuoPAC certificadora líder ficticia SAT
  const selloSAT = 'fO9rR47d7vDqPlKszx8yvN60I9aL1n/9Jm7M6vFf2E2h6W5e8t6fO...==';

  // Compliant Cadena Original signature
  const cadenaOriginal = `||1.1|${inv.uuid}|${inv.certifiedAt}|${rfcProvCertif}|${inv.satSignature}|00001000000504465028||`;

  return `<?xml version="1.0" encoding="utf-8"?>
<cfdi:Comprobante 
  xmlns:cfdi="http://www.sat.gob.mx/cfd/4" 
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
  xsi:schemaLocation="http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd" 
  Version="4.0" 
  Serie="${settings.invoicePrefix || 'FAC'}" 
  Folio="${inv.invoiceNo.replace(/[^0-9]/g, '') || '1'}" 
  Fecha="${txn.date}" 
  SubTotal="${subTotalCalc.toFixed(2)}" 
  Descuento="${descuentoCalc.toFixed(2)}" 
  Total="${totalCalc.toFixed(2)}" 
  TipoDeComprobante="I" 
  Exportacion="01" 
  MetodoPago="PUE" 
  FormaPago="${formaPagoCode}"
  Moneda="MXN"
  NoCertificado="00001000000512836254"
  Sello="${inv.satSignature}"
  LugarExpedicion="${emisorPostalCode}">
  <cfdi:Emisor Rfc="${emisorRfc}" Nombre="${emisorNombre}" RegimenFiscal="${emisorRegimeCode}"/>
  <cfdi:Receptor Rfc="${receptorRfc}" Nombre="${receptorNombre}" DomicilioFiscalReceptor="${receptorPostalCode}" RegimenFiscalReceptor="${receptorRegimeCode}" UsoCFDI="${usoCfdiCode}"/>
  <cfdi:Conceptos>
${conceptosXMLLines}
  </cfdi:Conceptos>
  <cfdi:Impuestos TotalImpuestosTrasladados="${totalImpuestosTrasladados.toFixed(2)}">
    <cfdi:Traslados>
      <cfdi:Traslado Base="${(subTotalCalc - descuentoCalc).toFixed(2)}" Impuesto="002" TipoFactor="Tasa" TasaOCuota="${(settings.generalTaxRate / 100).toFixed(6)}" Importe="${totalImpuestosTrasladados.toFixed(2)}"/>
    </cfdi:Traslados>
  </cfdi:Impuestos>
  <cfdi:Complemento>
    <tfd:TimbreFiscalDigital 
      xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital" 
      xsi:schemaLocation="http://www.sat.gob.mx/TimbreFiscalDigital http://www.sat.gob.mx/sitio_internet/cfd/TimbreFiscalDigital/TimbreFiscalDigitalv11.xsd" 
      Version="1.1" 
      UUID="${inv.uuid}" 
      FechaTimbrado="${inv.certifiedAt}" 
      RfcProvCertif="${rfcProvCertif}" 
      SelloCFD="${inv.satSignature}" 
      NoCertificadoSAT="00001000000504465028"
      SelloSAT="${selloSAT}"/>
  </cfdi:Complemento>
</cfdi:Comprobante>`;
}

/**
 * Builds standard signature.
 */
export function getCadenaOriginal(txn: Transaction, settings: LegalBillingSettings): string {
  if (!txn.invoiceData) return 'N/A';
  const inv = txn.invoiceData;
  const rfcProv = 'DIL120525A12';
  return `||1.1|${inv.uuid}|${inv.certifiedAt}|${rfcProv}|${inv.satSignature || 'N/A'}|00001000000504465028||`;
}

/**
 * Generate a valid URL for the SAT official verification portal.
 * This can be rendered inside a QR code dynamically!
 */
export function getSATQrUrl(txn: Transaction, emisorTaxId: string): string {
  if (!txn.invoiceData) return '';
  const inv = txn.invoiceData;
  const re = emisorTaxId || 'DAC120525D10';
  const rr = inv.taxId;
  const tt = txn.total.toFixed(2);
  const id = inv.uuid;
  const fe = inv.satSignature ? inv.satSignature.substring(inv.satSignature.length - 8) : '00000000';
  
  return `https://verificacfdi.facturaelectronica.sat.gob.mx/default.aspx?id=${id}&re=${re}&rr=${rr}&tt=${tt}&fe=${fe}`;
}

/**
 * Simulate Constancia de Situación Fiscal Upload parser.
 * It will extract values based on mock inputs, providing a highly realistic OCR feel!
 */
export interface ConstanciaPayload {
  fiscalName: string;
  taxId: string;
  regime: string;
  postalCode: string;
}

export function parseMockConstancia(text: string): ConstanciaPayload | null {
  const normalized = text.toUpperCase();
  
  // Try to match RFC (MX: 4 letters, 6 digits, 3 homoclave characters)
  const rfcMatch = normalized.match(/[A-Z&Ñ]{3,4}\d{6}[A-Z\d]{3}/);
  const rfc = rfcMatch ? rfcMatch[0] : '';
  
  // Try to match Código Postal (5 digits)
  const cpMatch = normalized.match(/CÓDIGO POSTAL:?\s*(\d{5})/) || normalized.match(/CP:?\s*(\d{5})/) || normalized.match(/\b\d{5}\b/);
  const cp = cpMatch ? cpMatch[1] || cpMatch[0] : '';
  
  // Try to extract regime code or default to RESICO or General
  let regime = '626 - Régimen Simplificado de Confianza (RESICO)';
  if (normalized.includes('GENERAL DE LEY') || normalized.includes('601')) {
    regime = '601 - General de Ley Personas Morales';
  } else if (normalized.includes('ACTIVIDAD EMPRESARIAL') || normalized.includes('612')) {
    regime = '612 - Personas Físicas con Actividades Empresariales y Profesionales';
  } else if (normalized.includes('SUELDOS') || normalized.includes('605')) {
    regime = '605 - Sueldos y Salarios e Ingresos Asimilados a Salarios';
  } else if (normalized.includes('ARRENDAMIENTO') || normalized.includes('606')) {
    regime = '606 - Arrendamiento';
  }
  
  // Try to parse some name. Let's look for "DENOMINACIÓN" or "NOMBRE"
  let fiscalName = '';
  const nameMatch = normalized.match(/DENOMINACIÓN O RAZÓN SOCIAL:\s*([A-Z\s,]+)\n/i) || 
                    normalized.match(/NOMBRE\(S\):\s*([A-Z\s]+)\n/i) ||
                    normalized.match(/DENOMINACIÓN:\s*([A-Z\s,]+)/);
  if (nameMatch) {
    fiscalName = nameMatch[1].trim();
  } else {
    // Split into words, search for common elements
    if (rfc) {
      fiscalName = rfc.startsWith('XAXX') || rfc.startsWith('XEXX') ? 'PÚBLICO EN GENERAL' : 'CLIENTE FACTURADO S.A. DE C.V.';
    }
  }
  
  if (!rfc && !fiscalName) {
    return null;
  }
  
  return {
    fiscalName: fiscalName || 'JUAN PÉREZ LÓPEZ',
    taxId: rfc || 'XAXX010101000',
    regime,
    postalCode: cp || '06700'
  };
}
