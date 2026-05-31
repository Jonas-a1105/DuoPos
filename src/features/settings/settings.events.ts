import { globalEventBus } from '../../shared/events/EventBus';

export const SETTINGS_EVENTS = {
  SETTINGS_CHANGED: 'settings:settings_changed',
  TAX_RATE_CHANGED: 'settings:tax_rate_changed',
  LICENSE_ACTIVATED: 'settings:license_activated',
} as const;

export interface SettingsChangedPayload {
  changedKeys: string[];
}

export interface TaxRateChangedPayload {
  previousRate: number;
  newRate: number;
  taxName: string;
}

export interface LicenseActivatedPayload {
  licenseKey: string;
  activatedAt: string;
}

export function emitSettingsChanged(payload: SettingsChangedPayload): void {
  globalEventBus.publish<SettingsChangedPayload>(SETTINGS_EVENTS.SETTINGS_CHANGED, payload);
}

export function emitTaxRateChanged(payload: TaxRateChangedPayload): void {
  globalEventBus.publish<TaxRateChangedPayload>(SETTINGS_EVENTS.TAX_RATE_CHANGED, payload);
}

export function emitLicenseActivated(payload: LicenseActivatedPayload): void {
  globalEventBus.publish<LicenseActivatedPayload>(SETTINGS_EVENTS.LICENSE_ACTIVATED, payload);
}
