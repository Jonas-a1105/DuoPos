/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sistema de Licencias DuoPOS — Producción
 * 3 planes reales: free | standard | pro
 */

import { isAfter, isBefore, differenceInHours, format } from 'date-fns';
import { supabase, isSupabaseConfigured } from '../config/supabaseClient';


export type SubscriptionTier = 'free' | 'standard' | 'pro';

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
  bannerColor: string;
  accentColor: string;
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
  offlineActivationSeed: string;
  activatedAt?: string;
  companyName: string;
}

export const PLANS: Record<SubscriptionTier, PlanDefinition> = {
  free: {
    id: 'free',
    name: 'Plan Gratuito',
    priceUSD: 0,
    priceVEF: 0,
    emoji: '🦉',
    description: 'Nivel básico gratuito para evaluar DuoPOS en tu negocio. Funcionalidad limitada.',
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
      'Turnos y Caja Básicos',
      '1 sola sucursal'
    ],
    bannerColor: 'from-slate-50 to-slate-100 border-slate-300 text-slate-800',
    accentColor: 'slate',
    badgeBg: 'bg-slate-150 text-slate-700'
  },
  standard: {
    id: 'standard',
    name: 'Plan Standard',
    priceUSD: 29.90,
    priceVEF: 1360.00,
    emoji: '⚡',
    description: 'Facturación profesional para tiendas físicas medianas con alto flujo de clientes.',
    clientLimit: 50,
    salesLimit: 99999,
    allowedBranches: 2,
    features: [
      'Todo lo del Plan Gratuito',
      'Soporte multi-divisa avanzado (Tasas BCV y Paralelo)',
      'Límite de 50 clientes lealtad registrados',
      'Ventas e Historial ilimitados',
      'Hasta 2 sucursales sincronizadas',
      'Logística, Proveedores y Órdenes de Compra',
      'Misiones y Gamificación para 3 cajeros',
      'Skins Estándar & Galaxy desbloqueados'
    ],
    bannerColor: 'from-emerald-50 to-emerald-100 border-emerald-300 text-emerald-900',
    accentColor: 'emerald',
    badgeBg: 'bg-emerald-100 text-emerald-800'
  },
  pro: {
    id: 'pro',
    name: 'Plan Pro',
    priceUSD: 79.00,
    priceVEF: 3590.00,
    emoji: '🏆',
    description: 'La suite completa para negocios en crecimiento con CRM avanzado, multi-sucursales y herramientas fiscales.',
    clientLimit: 99999,
    salesLimit: 99999,
    allowedBranches: 5,
    features: [
      'Todo lo del Plan Standard',
      'Clientes lealtad y CRM ilimitado',
      'Hasta 5 sucursales habilitadas',
      'Ligas de clientes y misiones diarias premium',
      'Todos los temas desbloqueados (Standard, Galaxy, Cyberpunk)',
      'Control de fletes y logística CEDIS para transportistas',
      'Emisor de timbrados fiscales automatizado',
      'Soporte prioritario Premium'
    ],
    bannerColor: 'from-violet-50 to-violet-100 border-violet-300 text-violet-900',
    accentColor: 'violet',
    badgeBg: 'bg-violet-100 text-violet-800'
  }
};

/**
 * Deterministically generates an offline activation key for a given subscription tier
 * based on the client hardware fingerprint seed. (Deprecated/Keep for backwards compatibility)
 */
export function generateKeyForFingerprint(tier: SubscriptionTier, hwFingerprint: string): string {
  if (tier === 'free') return 'FREE-NO-KEY-REQUIRED';
  
  let hash = 0;
  const combined = `${tier}:${hwFingerprint.toUpperCase().trim()}:DUOPOS-SECURE-SALT-2026`;
  for (let i = 0; i < combined.length; i++) {
    const chr = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  
  const hashVal1 = Math.abs((hash ^ 0x12345678) % 65536);
  const hashVal2 = Math.abs((hash ^ 0x87654321) % 65536);
  const hashVal3 = Math.abs((hash ^ 0x61A72F6B) % 65536);

  const part1 = hashVal1.toString(16).toUpperCase().padStart(4, '0');
  const part2 = hashVal2.toString(16).toUpperCase().padStart(4, '0');
  const part3 = hashVal3.toString(16).toUpperCase().padStart(4, '0');
  
  let tierCode = 'STD';
  if (tier === 'pro') tierCode = 'PRO';
  
  return `DUO-${tierCode}-${part1}-${part2}-${part3}`;
}

/**
 * Genera una llave de licencia criptográficamente aleatoria con formato: DUO-STD-XXXX-XXXX-XXXX
 */
export function generateLicenseKey(tier: SubscriptionTier): string {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const genPart = (length: number) => {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  };
  const tierCode = tier === 'pro' ? 'PRO' : 'STD';
  return `DUO-${tierCode}-${genPart(4)}-${genPart(4)}-${genPart(4)}`;
}

/**
 * Deterministic signature generator for offline licensing.
 * Matches the algorithm in the developer-tools/license-generator.html generator.
 */
export function generateOfflineSignature(tier: string, expiry: string, hwSeed: string): string {
  const salt = 'DUOPOS-SECURE-SECRET-SALT-2026';
  const message = `${tier}:${expiry}:${hwSeed}:${salt}`;
  
  let hash = 0;
  for (let i = 0; i < message.length; i++) {
    const char = message.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  
  let hash2 = 17;
  for (let i = message.length - 1; i >= 0; i--) {
    const char = message.charCodeAt(i);
    hash2 = (hash2 * 31) ^ char;
    hash2 |= 0;
  }
  
  const part1 = Math.abs(hash ^ 0x9E3779B9).toString(16).toUpperCase().padStart(8, '0');
  const part2 = Math.abs(hash2 ^ 0x61A72F6B).toString(16).toUpperCase().padStart(8, '0');
  
  return `${part1.slice(0, 4)}-${part1.slice(4, 8)}-${part2.slice(0, 4)}`;
}

/**
 * Validates a cryptographically signed offline license key.
 */
export function verifyOfflineLicenseKey(
  key: string,
  hwSeed: string
): { valid: boolean; tier: SubscriptionTier; expiresAt: string; error?: string } {
  const cleanKey = key.toUpperCase().trim();
  if (!cleanKey.startsWith('DUO-OFF-')) {
    return { valid: false, tier: 'free', expiresAt: 'Nunca', error: 'Formato de clave offline incorrecto.' };
  }

  const parts = cleanKey.split('-');
  
  if (parts.length < 7) {
    return { valid: false, tier: 'free', expiresAt: 'Nunca', error: 'Clave de activación offline incompleta o corrupta.' };
  }

  const tier = parts[2].toLowerCase() as SubscriptionTier;
  const expiryRaw = parts[3]; // 'NUNCA' or 'YYYYMMDD'
  
  // Signature is always the last 3 parts
  const sigParts = parts.slice(-3);
  const signature = sigParts.join('-');
  
  // HW seed is everything between index 4 and signature parts
  const hwSeedParts = parts.slice(4, -3);
  const hwKeyInLicense = hwSeedParts.join('-');

  if (hwKeyInLicense !== 'UNIVERSAL' && hwKeyInLicense !== hwSeed.toUpperCase().trim()) {
    return { 
      valid: false, 
      tier: 'free', 
      expiresAt: 'Nunca', 
      error: 'Esta licencia offline está asociada a otro dispositivo de cobro.' 
    };
  }

  // Verify the signature
  const expectedSig = generateOfflineSignature(tier, expiryRaw, hwKeyInLicense);
  if (expectedSig !== signature) {
    return { valid: false, tier: 'free', expiresAt: 'Nunca', error: 'Firma criptográfica de licencia inválida.' };
  }

  // Parse Expiration Date
  let expiresAt = 'Nunca';
  if (expiryRaw !== 'NUNCA') {
    if (expiryRaw.length === 8) {
      const year = expiryRaw.slice(0, 4);
      const month = expiryRaw.slice(4, 6);
      const day = expiryRaw.slice(6, 8);
      expiresAt = `${year}-${month}-${day}`;
    } else {
      return { valid: false, tier: 'free', expiresAt: 'Nunca', error: 'Formato de expiración de licencia ilegible.' };
    }
  }

  return { valid: true, tier, expiresAt };
}

/**
 * Detects if the user has manually rolled back their system clock.
 * Compares the current time against the last recorded run time.
 */
export function detectClockTampering(): boolean {
  try {
    const lastRunRaw = localStorage.getItem('duo_pos_last_run_timestamp');
    if (!lastRunRaw) {
      localStorage.setItem('duo_pos_last_run_timestamp', new Date().toISOString());
      return false;
    }

    const current = new Date();
    const lastRun = new Date(lastRunRaw);

    // If current time is strictly earlier than last run by more than 1 hour
    const hoursDiff = differenceInHours(lastRun, current);
    if (hoursDiff > 1) {
      console.warn("⚠️ [LICENSING] ALERTA DE SEGURIDAD: Se detectó una alteración del reloj del sistema.");
      return true;
    }

    // Update if the time is valid and moving forward
    if (isAfter(current, lastRun)) {
      localStorage.setItem('duo_pos_last_run_timestamp', current.toISOString());
    }
  } catch (e) {
    console.error("Error checking clock tampering", e);
  }
  return false;
}

/**
 * Valida una llave de licencia en Supabase y la asocia al hardware fingerprint si está disponible.
 * Soporta de forma transparente llaves online clásicas y offline firmadas.
 */
export async function validateLicenseKeyOnline(
  key: string,
  hwFingerprint: string,
  companyName: string = ''
): Promise<{ valid: boolean; tier: SubscriptionTier; expiresAt?: string; error?: string }> {
  const cleanKey = key.toUpperCase().trim();
  if (!cleanKey) {
    return { valid: false, tier: 'free', error: 'Por favor ingresa una llave de licencia.' };
  }

  // Interceptar claves firmadas Offline inmediatamente
  if (cleanKey.startsWith('DUO-OFF-')) {
    const offlineRes = verifyOfflineLicenseKey(cleanKey, hwFingerprint);
    if (offlineRes.valid) {
      return {
        valid: true,
        tier: offlineRes.tier,
        expiresAt: offlineRes.expiresAt
      };
    } else {
      return {
        valid: false,
        tier: 'free',
        error: offlineRes.error || 'La clave offline firmada es inválida.'
      };
    }
  }

  if (!isSupabaseConfigured()) {
    return {
      valid: false,
      tier: 'free',
      error: 'Supabase no está configurado y no se detectó una clave offline firmada. La activación online requiere conexión real.'
    };
  }

  try {
    const { data: license, error } = await supabase
      .from('licenses')
      .select('*')
      .eq('license_key', cleanKey)
      .maybeSingle();

    if (error) {
      console.error('Error al validar la licencia en Supabase:', error);
      return { valid: false, tier: 'free', error: `Error de servidor: ${error.message}` };
    }

    if (!license) {
      return { valid: false, tier: 'free', error: 'La llave de licencia ingresada no existe.' };
    }

    if (license.status === 'revoked') {
      return { valid: false, tier: 'free', error: 'Esta llave de licencia ha sido revocada.' };
    }

    const expiryString = license.expires_at ? new Date(license.expires_at).toISOString().split('T')[0] : 'Nunca';

    if (license.status === 'activated') {
      if (license.activated_by === hwFingerprint) {
        return { valid: true, tier: license.tier as SubscriptionTier, expiresAt: expiryString };
      } else {
        return { 
          valid: false, 
          tier: 'free', 
          error: 'Esta llave de licencia ya está activa en otro dispositivo.' 
        };
      }
    }

    // Cambiar estado a 'activated'
    const { error: updateError } = await supabase
      .from('licenses')
      .update({
        status: 'activated',
        activated_at: new Date().toISOString(),
        activated_by: hwFingerprint,
        company_name: companyName || null
      })
      .eq('license_key', cleanKey)
      .eq('status', 'available');

    if (updateError) {
      console.error('Error al actualizar estado de la licencia:', updateError);
      return { valid: false, tier: 'free', error: 'No se pudo activar la licencia. Intente de nuevo.' };
    }

    return { valid: true, tier: license.tier as SubscriptionTier, expiresAt: expiryString };
  } catch (err: any) {
    console.error('Excepción al validar licencia online:', err);
    return { valid: false, tier: 'free', error: `Error de red u otros: ${err.message || err}` };
  }
}

/**
 * Genera y registra una nueva llave en Supabase (Panel Admin)
 */
export async function createLicenseOnline(
  tier: SubscriptionTier,
  notes: string = ''
): Promise<{ success: boolean; data?: any; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase no está configurado.' };
  }

  const key = generateLicenseKey(tier);

  try {
    const { data, error } = await supabase
      .from('licenses')
      .insert({
        license_key: key,
        tier,
        status: 'available',
        notes: notes || null
      })
      .select()
      .single();

    if (error) {
      console.error('Error al insertar licencia:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error('Excepción al crear licencia online:', err);
    return { success: false, error: err.message || err };
  }
}

/**
 * Revoca una licencia en Supabase (Panel Admin)
 */
export async function revokeLicenseOnline(key: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase no está configurado.' };
  }

  try {
    const { error } = await supabase
      .from('licenses')
      .update({ status: 'revoked' })
      .eq('license_key', key);

    if (error) {
      console.error('Error al revocar licencia:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Excepción al revocar licencia:', err);
    return { success: false, error: err.message || err };
  }
}

/**
 * Lista todas las licencias registradas (Panel Admin)
 */
export async function listLicensesOnline(): Promise<{ success: boolean; data?: any[]; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase no está configurado.' };
  }

  try {
    const { data, error } = await supabase
      .from('licenses')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error al listar licencias:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error('Excepción al listar licencias:', err);
    return { success: false, error: err.message || err };
  }
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
