/**
 * Mock parser for SAT Constancia de Situación Fiscal documents.
 */

export interface ConstanciaPayload {
  fiscalName: string;
  taxId: string;
  regime: string;
  postalCode: string;
}

export function parseMockConstancia(text: string): ConstanciaPayload | null {
  const normalized = text.toUpperCase();

  const rfcMatch = normalized.match(/[A-Z&Ñ]{3,4}\d{6}[A-Z\d]{3}/);
  const rfc = rfcMatch ? rfcMatch[0] : '';

  const cpMatch =
    normalized.match(/CÓDIGO POSTAL:?\s*(\d{5})/) ||
    normalized.match(/CP:?\s*(\d{5})/) ||
    normalized.match(/\b\d{5}\b/);
  const cp = cpMatch ? cpMatch[1] || cpMatch[0] : '';

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

  let fiscalName = '';
  const nameMatch =
    normalized.match(/DENOMINACIÓN O RAZÓN SOCIAL:\s*([A-Z\s,]+)\n/i) ||
    normalized.match(/NOMBRE\(S\):\s*([A-Z\s]+)\n/i) ||
    normalized.match(/DENOMINACIÓN:\s*([A-Z\s,]+)/);
  if (nameMatch) {
    fiscalName = nameMatch[1].trim();
  } else {
    if (rfc) {
      fiscalName =
        rfc.startsWith('XAXX') || rfc.startsWith('XEXX') ? 'PÚBLICO EN GENERAL' : 'CLIENTE FACTURADO S.A. DE C.V.';
    }
  }

  if (!rfc && !fiscalName) {
    return null;
  }

  return {
    fiscalName: fiscalName || 'JUAN PÉREZ LÓPEZ',
    taxId: rfc || 'XAXX010101000',
    regime,
    postalCode: cp || '06700',
  };
}
