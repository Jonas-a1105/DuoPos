/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type SubscriptionTier = 'trial' | 'standard' | 'unlimited_racha' | 'enterprise_buhoflota';

export interface PlanDefinition {
  id: SubscriptionTier;
  name: string;
  priceUSD: number;
  priceVEF: number;
  emoji: string;
  description: string;
  clientLimit: number;
  salesLimit: number;
  allowedBranches: number;
  features: string[];
  bannerColor: string; // Tailwind css classes
  accentColor: string; // Tailwind color name
  badgeBg: string;
}

export interface LicenseDetails {
  tier: SubscriptionTier;
  activated: boolean;
  activationKey: string;
  expiresAt: string; // Date ISO string or "Nunca"
  clientLimit: number;
  salesLimit: number;
  currentSalesCount: number;
  offlineActivationSeed: string; // Mimics Hardware Signature for .exe desktop environment
  activatedAt?: string;
  companyName: string;
}

export const PLANS: Record<SubscriptionTier, PlanDefinition> = {
  trial: {
    id: 'trial',
    name: 'Plan Búho Gratuito (Trial/Prueba)',
    priceUSD: 0,
    priceVEF: 0,
    emoji: '🦉',
    description: 'Nivel básico auto-activado para evaluar las mecánicas lúdicas de DuoPOS en tu negocio.',
    clientLimit: 5,
    salesLimit: 15,
    allowedBranches: 1,
    features: [
      'Atención rápida de canasta',
      'Lector de barra integrado básico',
      'Conversor en VEF/USD (Tasas BCV)',
      'Límite de 5 clientes lealtad registrados',
      'Límite de 15 ventas guardadas en historial',
      'Skins de Gamificación clásicas solamente',
      'Turnos y Caja Básicos'
    ],
    bannerColor: 'from-slate-50 to-slate-100 border-slate-300 text-slate-800',
    accentColor: 'slate',
    badgeBg: 'bg-slate-150 text-slate-700'
  },
  standard: {
    id: 'standard',
    name: 'Plan Búho Profesional (Standard)',
    priceUSD: 29.90,
    priceVEF: 1360.00,
    emoji: '⚡',
    description: 'Facturación profesional para tiendas físicas medianas con alto flujo de clientes.',
    clientLimit: 50,
    salesLimit: 99999, // Unbounded sales
    allowedBranches: 2,
    features: [
      'Todo lo del Plan Búho Gratuito',
      'Soporte multi-divisa avanzado (Tasas BCV y Paralelo)',
      'Límite extendido de 50 clientes lealtad',
      'Ventas e Historial ilimitados',
      'Doble sucursal sincronizada',
      'Misiones y Gamificación para 3 cajeros',
      'Tienda virtual y Skins (Estándar & Galaxy)'
    ],
    bannerColor: 'from-emerald-50 to-emerald-100 border-emerald-300 text-emerald-900',
    accentColor: 'emerald',
    badgeBg: 'bg-emerald-100 text-emerald-800'
  },
  unlimited_racha: {
    id: 'unlimited_racha',
    name: 'Plan Búho Racha Ilimitada (Premium)',
    priceUSD: 79.00,
    priceVEF: 3590.00,
    emoji: '🏆',
    description: 'Módulo Premium con CRM extendido, ligas de retención de clientes y multi-almacenes.',
    clientLimit: 99999, // Unbounded customers
    salesLimit: 99999,
    allowedBranches: 5,
    features: [
      'Todo lo del Plan Búho Profesional',
      'Historial de clientes y CRM ilimitado',
      'Hasta 5 sucursales habilitadas',
      'Ligas de clientes y misiones diarias premium',
      'Todos los temas desbloqueados (Standard, Galaxy, Cyberpunk)',
      'Control de fletes y logística CEDIS para transportistas',
      'Emisor de timbrados fiscales automatizado'
    ],
    bannerColor: 'from-violet-50 to-violet-100 border-violet-300 text-violet-900',
    accentColor: 'violet',
    badgeBg: 'bg-violet-100 text-violet-800'
  },
  enterprise_buhoflota: {
    id: 'enterprise_buhoflota',
    name: 'Plan Búho Flota Corporativa (Enterprise)',
    priceUSD: 199.00,
    priceVEF: 9040.00,
    emoji: '👑',
    description: 'La suite corporativa total para grandes comercios que requieren resiliencia total 100% offline.',
    clientLimit: 99999,
    salesLimit: 99999,
    allowedBranches: 99,
    features: [
      'Todo lo del Plan Búho Racha Ilimitada',
      'Cajas y terminales ilimitadas',
      'Licencia offline autorizada para .exe desktop',
      'Mantenimiento prioritario Premium 24/7 de Duo',
      'Firma fiscal masiva firmada digitalmente',
      'Integración con balanzas de peso físicas y básculas',
      'Resguardo criptográfico de bases contablesoffline'
    ],
    bannerColor: 'from-amber-50 to-amber-100 border-amber-300 text-amber-950',
    accentColor: 'amber',
    badgeBg: 'bg-amber-100 text-amber-900 font-extrabold'
  }
};

/**
 * Deterministically generates an offline activation key for a given subscription tier
 * based on the client hardware fingerprint seed. This acts as a mathematical cryptographic validation.
 */
export function generateKeyForFingerprint(tier: SubscriptionTier, hwFingerprint: string): string {
  if (tier === 'trial') return 'TRIAL-NO-KEY-REQUIRED';
  
  let hash = 0;
  // Combining salt and data
  const combined = `${tier}:${hwFingerprint.toUpperCase().trim()}:DUOPOS-SECURE-SALT-2026`;
  for (let i = 0; i < combined.length; i++) {
    const chr = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  
  // Create deterministic hex parts from cross hashes
  const hashVal1 = Math.abs((hash ^ 0x12345678) % 65536);
  const hashVal2 = Math.abs((hash ^ 0x87654321) % 65536);
  const hashVal3 = Math.abs((hash ^ 0x61A72F6B) % 65536);

  const part1 = hashVal1.toString(16).toUpperCase().padStart(4, '0');
  const part2 = hashVal2.toString(16).toUpperCase().padStart(4, '0');
  const part3 = hashVal3.toString(16).toUpperCase().padStart(4, '0');
  
  let tierCode = 'PRO';
  if (tier === 'unlimited_racha') tierCode = 'RACH';
  else if (tier === 'enterprise_buhoflota') tierCode = 'FLOT';
  
  return `DUO-${tierCode}-${part1}-${part2}-${part3}`;
}

/**
 * Validates a license key for a given system hardware fingerprint.
 * Perfect implementation representing high trust client side licensing checks used in desktop compilations .exe
 */
export function validateLicenseKey(
  key: string, 
  hwFingerprint: string
): { valid: boolean; tier: SubscriptionTier; error?: string } {
  const cleanKey = key.toUpperCase().trim();
  
  if (!cleanKey) {
    return { valid: false, tier: 'trial', error: 'Por favor ingresa una llave de licencia.' };
  }
  
  const parts = cleanKey.split('-');
  if (parts.length !== 5 || parts[0] !== 'DUO') {
    return { 
      valid: false, 
      tier: 'trial', 
      error: 'Formato de llave inválido. Las claves offline siguen el patrón: DUO-[TIER]-[CODE1]-[CODE2]-[CODE3]' 
    };
  }
  
  const tierCode = parts[1];
  let detectedTier: SubscriptionTier;
  
  if (tierCode === 'PRO') detectedTier = 'standard';
  else if (tierCode === 'RACH') detectedTier = 'unlimited_racha';
  else if (tierCode === 'FLOT') detectedTier = 'enterprise_buhoflota';
  else {
    return { valid: false, tier: 'trial', error: 'Código de plan no identificado en la llave de licencia.' };
  }
  
  const expectedKey = generateKeyForFingerprint(detectedTier, hwFingerprint);
  if (expectedKey === cleanKey) {
    return { valid: true, tier: detectedTier };
  }
  
  return { 
    valid: false, 
    tier: 'trial', 
    error: 'Firma de licencia incorrecta. La llave ingresada no coincide matemáticamente con la firma de este hardware .exe.' 
  };
}

/**
 * Helper to generate a dummy hardware fingerprint if none exists in localStorage
 */
export function generateHardwareFingerprint(): string {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'BUHO-HW-';
  for (let i = 0; i < 8; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  result += `-${Math.floor(1000 + Math.random() * 9000)}`;
  return result;
}
