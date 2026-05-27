import { useCallback, useEffect, useRef } from 'react';
import { isAfter, setHours, setMilliseconds, setMinutes, setSeconds } from 'date-fns';
import { detectClockTampering, validateLicenseKeyOnline, PLANS } from '../services/licensing';
import type { LicenseDetails } from '../services/licensing';
import { playSound } from '../services/sounds';

const LICENSE_STORAGE_KEY = 'duo_pos_licensing_details';

export function loadLicenseDetails(): LicenseDetails {
  try {
    const saved = localStorage.getItem(LICENSE_STORAGE_KEY);
    if (saved) {
      const raw = JSON.parse(saved) as Record<string, unknown>;
      const tier = raw.tier as string;
      if (tier === 'trial') {
        raw.tier = 'free' as any;
        raw.clientLimit = PLANS.free.clientLimit;
        raw.salesLimit = PLANS.free.salesLimit;
      }
      if (tier === 'unlimited_racha' || tier === 'enterprise_buhoflota') {
        raw.tier = 'pro' as any;
        raw.clientLimit = PLANS.pro.clientLimit;
        raw.salesLimit = PLANS.pro.salesLimit;
      }
      return raw as unknown as LicenseDetails;
    }
  } catch {}
  return getDefaultLicense();
}

export function getDefaultLicense(): LicenseDetails {
  return {
    tier: 'free',
    activated: false,
    activationKey: '',
    expiresAt: 'Nunca',
    clientLimit: PLANS.free.clientLimit,
    salesLimit: PLANS.free.salesLimit,
    currentSalesCount: 0,
    offlineActivationSeed: '',
    companyName: '',
  };
}

export function saveLicenseDetails(details: LicenseDetails) {
  try {
    localStorage.setItem(LICENSE_STORAGE_KEY, JSON.stringify(details));
  } catch {}
}

export function useLicenseValidation(
  licenseDetails: LicenseDetails,
  options: {
    onSetLicenseExpired: (expired: boolean) => void;
    onSetClockTampered: (tampered: boolean) => void;
    onSetLicenseDetails: (details: LicenseDetails) => void;
  },
) {
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const checkLicenseValidity = useCallback(() => {
    const clockTampered = detectClockTampering();
    if (clockTampered) {
      optionsRef.current.onSetClockTampered(true);
      return;
    }
    optionsRef.current.onSetClockTampered(false);

    if (licenseDetails.activated && licenseDetails.expiresAt !== 'Nunca') {
      const expiryDate = setMilliseconds(setSeconds(setMinutes(setHours(new Date(licenseDetails.expiresAt), 23), 59), 59), 999);
      const today = setMilliseconds(setSeconds(setMinutes(setHours(new Date(), 0), 0), 0), 0);
      optionsRef.current.onSetLicenseExpired(isAfter(today, expiryDate));
    } else {
      optionsRef.current.onSetLicenseExpired(false);
    }
  }, [licenseDetails]);

  useEffect(() => {
    checkLicenseValidity();
    const interval = setInterval(checkLicenseValidity, 20000);
    return () => clearInterval(interval);
  }, [checkLicenseValidity]);
}

export function useLicenseActivation(options: {
  licenseDetails: LicenseDetails;
  onSetLicenseDetails: (details: LicenseDetails) => void;
  onSetLicenseExpired: (expired: boolean) => void;
  onSetClockTampered: (tampered: boolean) => void;
}) {
  const activateLicense = useCallback(
    async (key: string, companyName?: string) => {
      const seed = options.licenseDetails.offlineActivationSeed;
      const res = await validateLicenseKeyOnline(key, seed, companyName);
      if (res.valid) {
        const plan = PLANS[res.tier];
        const updated: LicenseDetails = {
          ...options.licenseDetails,
          tier: res.tier,
          activated: true,
          activationKey: key.toUpperCase().trim(),
          expiresAt: res.expiresAt || 'Nunca',
          clientLimit: plan.clientLimit,
          salesLimit: plan.salesLimit,
          activatedAt: new Date().toISOString(),
          companyName: companyName || '',
        };
        options.onSetLicenseDetails(updated);
        saveLicenseDetails(updated);
        options.onSetLicenseExpired(false);
        options.onSetClockTampered(false);
        playSound('levelup');
        return {
          success: true,
          message: `¡Licencia activada con éxito!\nFelicidades, tu DuoPOS ahora tiene el plan [${plan.name}] activo en este terminal.`,
        };
      }
      return { success: false, message: res.error || 'La llave ingresada es inválida.' };
    },
    [options],
  );

  const resetLicense = useCallback(() => {
    const updated: LicenseDetails = {
      ...options.licenseDetails,
      tier: 'free',
      activated: false,
      activationKey: '',
      expiresAt: 'Nunca',
      clientLimit: PLANS.free.clientLimit,
      salesLimit: PLANS.free.salesLimit,
    };
    options.onSetLicenseDetails(updated);
    saveLicenseDetails(updated);
    playSound('error');
  }, [options]);

  return { activateLicense, resetLicense };
}
