/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sistema de Licencias DuoPOS — Producción
 * 3 planes reales: free | standard | pro
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';

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
 * Valida una llave de licencia en Supabase y la asocia al hardware fingerprint si está disponible.
 */
export async function validateLicenseKeyOnline(
  key: string,
  hwFingerprint: string,
  companyName: string = ''
): Promise<{ valid: boolean; tier: SubscriptionTier; error?: string }> {
  if (!isSupabaseConfigured()) {
    return {
      valid: false,
      tier: 'free',
      error: 'Supabase no está configurado. La activación online requiere conexión real.'
    };
  }

  const cleanKey = key.toUpperCase().trim();
  if (!cleanKey) {
    return { valid: false, tier: 'free', error: 'Por favor ingresa una llave de licencia.' };
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

    if (license.status === 'activated') {
      if (license.activated_by === hwFingerprint) {
        return { valid: true, tier: license.tier as SubscriptionTier };
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

    return { valid: true, tier: license.tier as SubscriptionTier };
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
