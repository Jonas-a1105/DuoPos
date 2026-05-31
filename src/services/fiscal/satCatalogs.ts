/**
 * SAT CFDI 4.0 product and unit classification catalogs.
 */

export const SAT_PRODUCTS_MAP: Record<string, string> = {
  cafetería: '50201708',
  postres: '50181900',
  snack: '50192100',
  oficina: '44122000',
  servicios: '80141628',
  cursos: '86101700',
};

export const SAT_UNITS_MAP: Record<string, { code: string; label: string }> = {
  H87: { code: 'H87', label: 'Pieza' },
  E48: { code: 'E48', label: 'Unidad de servicio' },
  XBX: { code: 'XBX', label: 'Caja' },
  LTR: { code: 'LTR', label: 'Litro' },
  KGM: { code: 'KGM', label: 'Kilogramo' },
};

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
  return '43231500';
}
