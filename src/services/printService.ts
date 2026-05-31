/**
 * Print service barrel — re-exports from print/ sub-module.
 *
 * Mantenido para backward compatibility.
 * Los consumidores nuevos deben importar directamente de:
 *   services/print/printService
 *   services/print/escPosEncoder
 *   services/print/templates/...
 */

export type { HardwareDeviceSettings } from './print/printService';

export {
  DEFAULT_HARDWARE_SETTINGS,
  generateScaleProtocolBytes,
  generateRawEscPos,
} from './print/printService';
