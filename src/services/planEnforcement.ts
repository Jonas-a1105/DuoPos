import { SubscriptionTier, PLANS } from './licensing';

export interface EnforcementResult {
  allowed: boolean;
  message?: string;
}

/**
 * Validates if the user can register a new client lealtad (loyalty customer)
 * based on their current active subscription plan limits.
 */
export function canAddClient(currentCount: number, tier: SubscriptionTier): EnforcementResult {
  const limit = PLANS[tier]?.clientLimit ?? 5;
  if (currentCount >= limit) {
    return {
      allowed: false,
      message: `Has alcanzado el límite de clientes registrados para tu ${PLANS[tier]?.name || tier} (${limit} clientes).`
    };
  }
  return { allowed: true };
}

/**
 * Validates if the user can process a new transaction/sale
 * based on their monthly active sale limits.
 */
export function canMakeSale(currentCount: number, tier: SubscriptionTier): EnforcementResult {
  const limit = PLANS[tier]?.salesLimit ?? 15;
  if (currentCount >= limit) {
    return {
      allowed: false,
      message: `Has alcanzado el límite de ventas permitidas para tu ${PLANS[tier]?.name || tier} (${limit} ventas).`
    };
  }
  return { allowed: true };
}

/**
 * Validates if the user can add a new branch location
 * based on their active subscription plan limits.
 */
export function canAddBranch(currentCount: number, tier: SubscriptionTier): EnforcementResult {
  const limit = PLANS[tier]?.allowedBranches ?? 1;
  if (currentCount >= limit) {
    return {
      allowed: false,
      message: `Has alcanzado el límite de sucursales autorizadas para tu ${PLANS[tier]?.name || tier} (${limit} sucursal/es).`
    };
  }
  return { allowed: true };
}

/**
 * Generates a high-conversion, professional visual upgrade prompt message
 * tailored to the feature blocked and the user's active tier.
 */
export function getUpgradePrompt(tier: SubscriptionTier, feature: string): string {
  if (tier === 'free') {
    return `Para desbloquear la creación de más ${feature} y expandir tu negocio, por favor actualiza al Plan Standard o Pro en Ajustes > Planes.`;
  }
  return `Para desbloquear la creación de más ${feature} y expandir tu negocio, por favor actualiza al Plan Pro en Ajustes > Planes.`;
}
