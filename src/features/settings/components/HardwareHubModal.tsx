/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  RefreshCcw,
  Weight,
  Wifi,
  Printer,
  Barcode,
  ChevronRight,
  Disc,
  Eye,
  Settings,
  ShieldCheck,
  Download,
  Upload,
  Terminal,
  HelpCircle,
  Monitor,
  Check,
  Sparkles,
  Play,
  Pocket,
} from 'lucide-react';
import {
  HardwareDeviceSettings,
  DEFAULT_HARDWARE_SETTINGS,
  generateScaleProtocolBytes,
} from '../../../services/print/printService';
import { playSound } from '../../../services/audio/soundService';
import { toast } from '../../../shared/ui';

function CashDrawerIcon({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect width="20" height="12" x="2" y="3" rx="2" />
      <path d="M2 15h20" />
      <path d="M6 15v4c0 1-1 2-2 2" />
      <path d="M18 15v4c0 1 1 2 2 2" />
      <path d="M10 9h4" />
    </svg>
  );
}

interface HardwareHubModalProps {
  settings: HardwareDeviceSettings;
  onSaveSettings: (settings: HardwareDeviceSettings) => void;
  onClose: () => void;
}

export default function HardwareHubModal({ settings, onSaveSettings, onClose }: HardwareHubModalProps) {
  const [activeDriverTab, setActiveDriverTab] = useState<'scale' | 'printer' | 'scanner' | 'drawer'>('scale');

  // Local clones
  const [localSettings, setLocalSettings] = useState<HardwareDeviceSettings>({ ...settings });

  // Real or simulated ports
  const [isScaleConnected, setIsScaleConnected] = useState(false);
  const [isPrinterConnected, setIsPrinterConnected] = useState(false);
  const [isScannerConnected, setIsScannerConnected] = useState(false);

  // Simulation live feeds
  const [scaleSerialFeed, setScaleSerialFeed] = useState<string[]>([]);
  const [scaleLiveWeight, setScaleLiveWeight] = useState(0.0);
  const [isWeightStable, setIsWeightStable] = useState(true);

  // Print simulation ledger
  const [printedReceiptsSim, setPrintedReceiptsSim] = useState<string[]>([]);
  const [cashDrawerOpenState, setCashDrawerOpenState] = useState(false);
  const [isPrintingJob, setIsPrintingJob] = useState(false);

  // Scanner simulator text
  const [testBarcodeBuffer, setTestBarcodeBuffer] = useState('');
  const [scannerHitsLog, setScannerHitsLog] = useState<string[]>([]);

  // Web Serial availability
  const isWebSerialAvailable = typeof navigator !== 'undefined' && 'serial' in navigator;
  const isWebUsbAvailable = typeof navigator !== 'undefined' && 'usb' in navigator;

  useEffect(() => {
    // Generate scale live stream when connected
    let scaleInterval: NodeJS.Timeout;
    if (isScaleConnected) {
      scaleInterval = setInterval(() => {
        // Add tiny noise to simulate unstable scale before settling
        const noise = (Math.random() - 0.5) * 0.004;
        const currentOverride = localSettings.weighingScale.mockWeightOverride;
        const finalWeight = Math.max(0, currentOverride + (isWeightStable ? 0 : noise));

        // Protocol string
        const dataStr = generateScaleProtocolBytes(
          finalWeight,
          localSettings.weighingScale.unit,
          localSettings.weighingScale.model,
          isWeightStable,
        );

        setScaleLiveWeight(parseFloat(finalWeight.toFixed(3)));
        setScaleSerialFeed((prev) => [
          `[${new Date().toLocaleTimeString()}] Ser-RX: ${dataStr.replace('\r', '\\r').replace('\n', '\\n')}`,
          ...prev.slice(0, 15),
        ]);
      }, 500);
    }
    return () => clearInterval(scaleInterval);
  }, [
    isScaleConnected,
    isWeightStable,
    localSettings.weighingScale.mockWeightOverride,
    localSettings.weighingScale.model,
    localSettings.weighingScale.unit,
  ]);

  const toggleScaleConnection = () => {
    if (isScaleConnected) {
      setIsScaleConnected(false);
      setScaleSerialFeed((prev) => [`[INFO] Puerto serie ${localSettings.weighingScale.serialPort} CERRADO.`, ...prev]);
      playSound('error');
    } else {
      setIsScaleConnected(true);
      setScaleSerialFeed([
        `[INFO] Abriendo puerto serie ${localSettings.weighingScale.serialPort} a ${localSettings.weighingScale.baudRate} baudios...`,
        `[INFO] Conectado con éxito a Báscula ${localSettings.weighingScale.model.toUpperCase()}.`,
      ]);
      playSound('levelup');
    }
  };

  const handleApplySettings = () => {
    onSaveSettings(localSettings);
    playSound('success');
    // Notification
    toast.success('🔧 Configuración del hardware comercial aplicada correctamente en el bus local.');
  };

  // Test Print job execution inside driver simulation
  const triggerTestPrint = () => {
    setIsPrintingJob(true);
    playSound('swoosh');

    setTimeout(() => {
      const width = localSettings.thermalPrinter.paperWidth === '80mm' ? 42 : 32;
      const tId = Math.floor(1000 + Math.random() * 9000);

      const lines = [
        '='.repeat(width),
        '*** AUTODIAGNOSTICO DE IMPSERORA ***',
        '='.repeat(width),
        `Controlador: ESC/POS Driver v4.1`,
        `Puerto: USB VIRTUAL BRIDGE COMM`,
        `Papel: ${localSettings.thermalPrinter.paperWidth}`,
        `Cortador: ${localSettings.thermalPrinter.cutEnabled ? 'SOPORTADO (\x1bV\x42)' : 'NO CONFIGURADO'}`,
        `Cajon: ${localSettings.thermalPrinter.cashDrawerEnabled ? 'PULSO RJ11 PIN 2 (\x1bp\x00)' : 'DESACTIVADO'}`,
        `Codepage: ${localSettings.thermalPrinter.printerCodePage}`,
        `Densidad: ${localSettings.thermalPrinter.dpiDensity} DPI`,
        '-'.repeat(width),
        'ESTATUS PRODUCTIVO: OPERANDO OK',
        '-'.repeat(width),
        `Prueba EAN-13: ||||||||||||||||`,
        `DuoPOS - Racha Comercial Imparable`,
        '='.repeat(width),
        '\n\n\n',
      ];
      if (localSettings.thermalPrinter.cutEnabled) {
        lines.push('[CORTAR PAPEL - GS V 66]');
      }

      setPrintedReceiptsSim(lines);
      setIsPrintingJob(false);
      playSound('success');

      if (localSettings.thermalPrinter.cashDrawerEnabled) {
        triggerPulseDrawer();
      }
    }, 1500);
  };

  const triggerPulseDrawer = () => {
    setCashDrawerOpenState(true);
    playSound('kaching');
    setTimeout(() => {
      setCashDrawerOpenState(false);
    }, 3000);
  };

  // Simulate USB core scanner gun interception manually
  const simulateManualScannerTrigger = (code: string) => {
    if (!code) return;
    playSound('levelup');

    setScannerHitsLog((prev) => [`[SCANNER] Código detectado: "${code}" (Prefijo: none, Sufijo: LF/CR)`, ...prev]);

    // Broadcast a keydown event sequence so our global listener processes it!
    const chars = code.split('');
    let index = 0;

    const interval = setInterval(() => {
      if (index < chars.length) {
        const keyEvent = new KeyboardEvent('keydown', {
          key: chars[index],
          bubbles: true,
        });
        window.dispatchEvent(keyEvent);
        index++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          const enterEvent = new KeyboardEvent('keydown', {
            key: 'Enter',
            bubbles: true,
          });
          window.dispatchEvent(enterEvent);
        }, 30);
      }
    }, 15);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#141414]/80 backdrop-blur-xs flex items-center justify-center p-4 font-sans animate-fadeIn">
      <div className="bg-white border-2 border-gray-200 border-b-[8px] rounded-3xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl">
        {/* UPPER BANNER */}
        <div className="bg-[#1e293b] p-4 text-white flex justify-between items-center shrink-0 border-b-2 border-slate-700">
          <div className="flex items-center gap-3">
            <span className="text-3xl select-none animate-pulse">🔌</span>
            <div>
              <h3 className="text-lg font-black tracking-tight uppercase flex items-center gap-2">
                DuoPOS Retail IoT Hardware Bus
                <span className="bg-emerald-500 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-lg font-mono">
                  Active Drivers
                </span>
              </h3>
              <p className="text-[10px] text-gray-300 font-bold uppercase tracking-wider font-mono">
                Básculas de Peso • Impresoras ESC/POS • Escáneres Seriales • WebSerial API v1.2
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-750 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer border border-slate-650"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>

        {/* WORKSPACE SECTIONS: COLUMN BAR SUBTABS */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* LEFT HARDWARE NAVIGATION GUIDE */}
          <div className="w-full md:w-56 bg-slate-50 border-r border-gray-150 p-3 space-y-1.5 shrink-0 overflow-y-auto flex md:flex-col gap-1 md:gap-0">
            <span className="hidden md:block text-[9px] font-black text-gray-400 uppercase tracking-widest px-2.5 pb-2">
              Controladores Disponibles
            </span>

            {[
              {
                id: 'scale',
                label: 'Báscula RS-232',
                desc: 'Pesaje de granos y panes',
                icon: <Weight size={16} />,
                status: isScaleConnected ? 'CONECTADA' : 'DESCONECTADA',
                statusColor: isScaleConnected ? 'text-emerald-500' : 'text-gray-400',
              },
              {
                id: 'printer',
                label: 'Impresora ESC/POS',
                desc: 'Códigos térmicos y corte',
                icon: <Printer size={16} />,
                status: localSettings.thermalPrinter.enabled ? 'SOPORTANTE' : 'APAGADA',
                statusColor: 'text-indigo-500',
              },
              {
                id: 'scanner',
                label: 'Escáner Láser EAN',
                desc: 'Lector de barra USB / HID',
                icon: <Barcode size={16} />,
                status: 'CORRIENDO',
                statusColor: 'text-emerald-500',
              },
              {
                id: 'drawer',
                label: 'Cajón Monedero',
                desc: 'RJ11 Impulso Eléctrico',
                icon: <CashDrawerIcon size={16} />,
                status: cashDrawerOpenState ? '¡ABIERTO!' : 'CERRADO',
                statusColor: cashDrawerOpenState ? 'text-rose-500 font-black animate-bounce' : 'text-gray-400',
              },
            ].map((tab) => {
              const belongs = activeDriverTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveDriverTab(tab.id as any);
                    playSound('click');
                  }}
                  className={`w-full text-left p-2.5 rounded-2xl border-b-2 font-black text-xs uppercase transition-all flex items-center gap-3 cursor-pointer ${
                    belongs
                      ? 'bg-[#1cb0f6] text-white border-sky-700 shadow-sm'
                      : 'bg-white hover:bg-gray-100/70 border-gray-200 text-gray-600'
                  }`}
                >
                  <div
                    className={`p-1.5 rounded-xl ${belongs ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}
                  >
                    {tab.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="block leading-snug">{tab.label}</span>
                    <span
                      className={`block text-[8px] font-black tracking-widest leading-none mt-0.5 uppercase ${belongs ? 'text-amber-200' : tab.statusColor}`}
                    >
                      {tab.status}
                    </span>
                  </div>
                </button>
              );
            })}

            <div className="hidden md:block border-t border-dashed border-gray-200 pt-4 mt-6">
              <div className="bg-slate-100 border p-3 rounded-2xl space-y-1 text-slate-600">
                <span className="text-[9px] font-black uppercase text-slate-500 flex items-center gap-1">
                  <ShieldCheck size={10} /> BUS STATUS: STABLE
                </span>
                <p className="text-[9.5px] font-semibold leading-normal">
                  DuoPOS detecta el hardware emulado en tiempo real integrando APIs del navegador.
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT VIEW DETAILS */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/20 space-y-6">
            {/* CONTAINER 1: WEIGHING SCALE DRIVER INTERACTIVE */}
            {activeDriverTab === 'scale' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-4 gap-2">
                  <div>
                    <h4 className="text-sm font-black uppercase text-slate-800 tracking-tight flex items-center gap-1.5">
                      <Weight className="text-amber-500" size={18} />
                      Báscula de Pesaje Comercial (RS-232 / WebSerial)
                    </h4>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                      Control de venta de café en grano, postres y productos vendidos por gramaje
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={toggleScaleConnection}
                    className={`py-2 px-4 rounded-xl border-b-4 font-black text-xs uppercase transition-all tracking-wider flex items-center gap-2 cursor-pointer ${
                      isScaleConnected
                        ? 'bg-rose-500 text-white border-rose-700 hover:bg-rose-400'
                        : 'bg-[#58cc02] text-white border-[#3e9301] hover:bg-[#61e002]'
                    }`}
                  >
                    <Wifi size={13} className={isScaleConnected ? 'animate-pulse' : ''} />
                    <span>{isScaleConnected ? 'Cerrar Puerto COM' : 'Abrir Puerto de Fábrica'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                  {/* Left params column */}
                  <div className="lg:col-span-5 bg-white border-2 border-gray-200 rounded-3xl p-4 space-y-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#1cb0f6] block border-b pb-2">
                      Parámetros de Interfaz
                    </span>

                    <div className="space-y-3.5">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-black text-gray-400 tracking-wider block">
                          Modelo / Protocolo Báscula
                        </label>
                        <select
                          value={localSettings.weighingScale.model}
                          onChange={(e) => {
                            setLocalSettings({
                              ...localSettings,
                              weighingScale: { ...localSettings.weighingScale, model: e.target.value as any },
                            });
                          }}
                          className="w-full bg-gray-50 border-2 border-gray-200 p-2 text-xs font-bold rounded-xl outline-none"
                        >
                          <option value="torrey">Torrey Báscula L-EQ Series Protocol</option>
                          <option value="bizerba">Bizerba industrial ST standard</option>
                          <option value="cas">CAS ER-Plus / PD-II Protocol (ST/GS)</option>
                          <option value="mettler">Mettler Toledo SICS Standard Command</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[9px] uppercase font-black text-gray-400 tracking-wider block">
                            Puerto Serie COM
                          </label>
                          <input
                            type="text"
                            value={localSettings.weighingScale.serialPort}
                            onChange={(e) => {
                              setLocalSettings({
                                ...localSettings,
                                weighingScale: { ...localSettings.weighingScale, serialPort: e.target.value },
                              });
                            }}
                            className="w-full bg-gray-50 border-2 border-gray-200 p-2 text-xs font-bold rounded-xl font-mono text-center"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] uppercase font-black text-gray-400 tracking-wider block">
                            Baudios / Baud Rate
                          </label>
                          <select
                            value={localSettings.weighingScale.baudRate}
                            onChange={(e) => {
                              setLocalSettings({
                                ...localSettings,
                                weighingScale: { ...localSettings.weighingScale, baudRate: Number(e.target.value) },
                              });
                            }}
                            className="w-full bg-gray-50 border-2 border-gray-200 p-2 text-xs font-bold rounded-xl font-mono text-center"
                          >
                            <option value="4800">4800 bps</option>
                            <option value="9600">9600 bps</option>
                            <option value="19200">19200 bps</option>
                            <option value="115200">115200 bps</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[9px] uppercase font-black text-gray-400 tracking-wider block">
                            Unidad de Medida
                          </label>
                          <div className="flex gap-1.5 pt-0.5">
                            {['kg', 'lb'].map((unit) => (
                              <button
                                key={unit}
                                onClick={() => {
                                  setLocalSettings({
                                    ...localSettings,
                                    weighingScale: { ...localSettings.weighingScale, unit: unit as any },
                                  });
                                  playSound('click');
                                }}
                                className={`flex-1 py-1.5 rounded-lg text-xs font-extrabold uppercase border transition-all cursor-pointer ${
                                  localSettings.weighingScale.unit === unit
                                    ? 'bg-amber-500 text-white border-amber-600 font-black'
                                    : 'bg-white hover:bg-gray-50 text-gray-600'
                                }`}
                              >
                                {unit}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] uppercase font-black text-gray-400 tracking-wider block">
                            Filtro Estabilización
                          </label>
                          <select
                            value={localSettings.weighingScale.stabilizationDelayMs}
                            onChange={(e) => {
                              setLocalSettings({
                                ...localSettings,
                                weighingScale: {
                                  ...localSettings.weighingScale,
                                  stabilizationDelayMs: Number(e.target.value)
                                }
                              });
                            }}
                            className="w-full bg-gray-50 border-2 border-gray-200 p-1.5 text-xs font-bold rounded-xl text-center"
                          >
                            <option value="150">Inmediato (150ms)</option>
                            <option value="400">Medio Estándar (400ms)</option>
                            <option value="1000">Retardo Alto (1000ms)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right interactive Scale simulation panel */}
                  <div className="lg:col-span-7 space-y-4">
                    {/* PHYSICAL EMULATOR DIAL */}
                    <div className="bg-[#0f172a] rounded-3xl p-5 border-2 border-slate-800 text-white flex flex-col justify-between relative overflow-hidden min-h-[200px] shadow-lg">
                      {/* Grid background visual */}
                      <div className="absolute inset-0 select-none opacity-10 font-mono pointer-events-none text-[8px] bg-grid" />

                      <div className="relative flex justify-between z-10 items-start">
                        <span className="text-[9px] font-black uppercase text-amber-400 tracking-widest font-mono">
                          LCD WEIGH DIAL TERMINAL
                        </span>
                        <div className="flex gap-1">
                          <span
                            className={`w-2.5 h-2.5 rounded-full block ${isScaleConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}
                            title="Baud Active"
                          />
                          <span
                            className={`w-2.5 h-2.5 rounded-full block ${isWeightStable ? 'bg-sky-500 text-[6px]' : 'bg-amber-400 animate-bounce'}`}
                            title="Stabilizer Trigger"
                          />
                        </div>
                      </div>

                      {/* Display LED numerical weight */}
                      <div className="my-3 text-center relative z-10">
                        {isScaleConnected ? (
                          <div className="inline-block bg-[#1e293b] border-2 border-slate-700 rounded-2xl px-6 py-4.5 select-all shadow-inner">
                            <span className="text-5xl font-black font-mono text-emerald-400 tracking-wider">
                              {scaleLiveWeight.toFixed(3)}
                            </span>
                            <span className="text-xl font-black text-emerald-500 font-mono pl-2 block sm:inline-block">
                              {localSettings.weighingScale.unit.toUpperCase()}
                            </span>

                            <div className="flex justify-center gap-4 mt-2 text-[8px] font-black uppercase tracking-widest text-[#94a3b8] border-t border-slate-700/50 pt-1.5">
                              <span className={isWeightStable ? 'text-sky-400' : ''}>● STABLE</span>
                              <span>● NET: {scaleLiveWeight > 0 ? 'YES' : 'ZERO'}</span>
                              <span>● TARE: 0.000</span>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-[#1e293b] border border-slate-750 p-6 rounded-2xl text-slate-400 font-black font-mono text-sm uppercase">
                            Báscula Fuera de Línea • LCD APAGADO 🔌
                          </div>
                        )}
                      </div>

                      {/* Weight Controller slider Simulation */}
                      {isScaleConnected && (
                        <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700 space-y-2 relative z-10">
                          <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400">
                            <span>Mesa de pesaje (Simular Carga de Producto):</span>
                            <div className="flex gap-1">
                              <button
                                onClick={() => {
                                  setLocalSettings({
                                    ...localSettings,
                                    weighingScale: { ...localSettings.weighingScale, mockWeightOverride: 0.0 },
                                  });
                                  playSound('click');
                                }}
                                className="bg-slate-700 hover:bg-slate-650 px-2 py-0.5 rounded text-[8px]"
                              >
                                Limpiar báscula
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <input
                              type="range"
                              min="0"
                              max="5"
                              step="0.005"
                              value={localSettings.weighingScale.mockWeightOverride}
                              onChange={(e) => {
                                setLocalSettings({
                                  ...localSettings,
                                  weighingScale: {
                                    ...localSettings.weighingScale,
                                    mockWeightOverride: parseFloat(e.target.value),
                                  },
                                });
                                setIsWeightStable(false);
                                setTimeout(
                                  () => setIsWeightStable(true),
                                  localSettings.weighingScale.stabilizationDelayMs,
                                );
                              }}
                              className="flex-1 accent-amber-500 cursor-pointer h-1.5"
                            />
                            <span className="font-mono text-xs font-black text-amber-400 w-16 text-right">
                              {localSettings.weighingScale.mockWeightOverride.toFixed(3)}{' '}
                              {localSettings.weighingScale.unit}
                            </span>
                          </div>

                          <div className="flex justify-between items-center text-[8px] text-gray-400 font-bold uppercase mt-1">
                            <span>0.00 kg (Vacía)</span>
                            <span className="text-amber-500">
                              ¿Inestable? Mueve el slider para simular colocación activa
                            </span>
                            <span>5.00 kg (Capacidad Máx)</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* SERIAL DATA MONITOR */}
                    <div className="bg-slate-900 rounded-2xl p-3 border border-slate-850 space-y-1.5">
                      <span className="text-[9px] font-black font-mono text-emerald-500 uppercase tracking-widest block">
                        Console RX Port COM Stream
                      </span>
                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 h-28 overflow-y-auto font-mono text-[9px] text-[#4ade80] space-y-1">
                        {scaleSerialFeed.length === 0 ? (
                          <p className="text-slate-500 font-bold italic">Esperando apertura de puerto COM...</p>
                        ) : (
                          scaleSerialFeed.map((feed, i) => (
                            <p key={i} className="leading-tight">
                              {feed}
                            </p>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* CONTAINER 2: THERMAL RECEIPT PRINTER */}
            {activeDriverTab === 'printer' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex justify-between items-center border-b pb-4">
                  <div>
                    <h4 className="text-sm font-black uppercase text-slate-800 tracking-tight flex items-center gap-1.5">
                      <Printer className="text-indigo-500" size={18} />
                      Controlador de Impresión de Tickets ESC/POS
                    </h4>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                      Imprime comandas de cocina y recibos fiscales directamente por USB/Bluetooth
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                  {/* Left columns */}
                  <div className="lg:col-span-5 bg-white border-2 border-gray-200 rounded-3xl p-4 space-y-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 block border-b pb-2">
                      Parámetros del Driver
                    </span>

                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-black text-gray-400 tracking-wider block">
                          Método de Conexión Física
                        </label>
                        <select
                          value={localSettings.thermalPrinter.connectionType}
                          onChange={(e) => {
                            setLocalSettings({
                              ...localSettings,
                              thermalPrinter: {
                                ...localSettings.thermalPrinter,
                                connectionType: e.target.value as any,
                              },
                            });
                          }}
                          className="w-full bg-gray-50 border-2 border-gray-200 p-2 text-xs font-bold rounded-xl outline-none"
                        >
                          <option value="system">Impresora del Sistema / Driver OS Integrado</option>
                          <option value="webusb">Direct RAW USB (WebUSB API Protocol)</option>
                          <option value="bluetooth">Direct Raw Bluetooth (WebBluetooth BLE)</option>
                          <option value="serial">Serie Virtual COM / WiFi LPT Bridge</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[9px] uppercase font-black text-gray-400 tracking-wider block">
                            Ancho de Papel
                          </label>
                          <div className="flex gap-1.5 pt-0.5">
                            {['80mm', '58mm'].map((sz) => (
                              <button
                                key={sz}
                                type="button"
                                onClick={() => {
                                  setLocalSettings({
                                    ...localSettings,
                                    thermalPrinter: { ...localSettings.thermalPrinter, paperWidth: sz as any },
                                  });
                                  playSound('click');
                                }}
                                className={`flex-1 py-1.5 rounded-lg text-xs font-extrabold uppercase border cursor-pointer transition-all ${
                                  localSettings.thermalPrinter.paperWidth === sz
                                    ? 'bg-indigo-600 text-white border-indigo-700 font-blue-900 font-black'
                                    : 'bg-white hover:bg-gray-50 text-gray-600'
                                }`}
                              >
                                {sz}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] uppercase font-black text-gray-400 tracking-wider block">
                            Densidad DPI
                          </label>
                          <select
                            value={localSettings.thermalPrinter.dpiDensity}
                            onChange={(e) => {
                              setLocalSettings({
                                ...localSettings,
                                thermalPrinter: { ...localSettings.thermalPrinter, dpiDensity: Number(e.target.value) },
                              });
                            }}
                            className="w-full bg-gray-50 border-2 border-gray-200 p-1.5 text-xs font-bold rounded-xl outline-none"
                          >
                            <option value="180">180 DPI (Epson TM-T20)</option>
                            <option value="203">203 DPI (Epson TM-T88VI)</option>
                            <option value="300">300 DPI (Industrial Term)</option>
                          </select>
                        </div>
                      </div>

                      <div className="border-t pt-3.5 space-y-2">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block pb-1">
                          Funciones del Hardware
                        </span>

                        <label className="flex items-center gap-2.5 cursor-pointer selection-none">
                          <input
                            type="checkbox"
                            checked={localSettings.thermalPrinter.cutEnabled}
                            onChange={(e) => {
                              setLocalSettings({
                                ...localSettings,
                                thermalPrinter: { ...localSettings.thermalPrinter, cutEnabled: e.target.checked },
                              });
                              playSound('click');
                            }}
                            className="accent-indigo-600 w-4.5 h-4.5"
                          />
                          <div>
                            <span className="text-xs font-extrabold text-slate-700 block">
                              Cortador Automático Activado (Auto-Cut)
                            </span>
                            <span className="text-[9px] text-gray-400 font-bold block max-w-xs">
                              Envía el comando GS V 66 al concluir el ticket
                            </span>
                          </div>
                        </label>

                        <label className="flex items-center gap-2.5 cursor-pointer selection-none pt-1">
                          <input
                            type="checkbox"
                            checked={localSettings.thermalPrinter.cashDrawerEnabled}
                            onChange={(e) => {
                              setLocalSettings({
                                ...localSettings,
                                thermalPrinter: {
                                  ...localSettings.thermalPrinter,
                                  cashDrawerEnabled: e.target.checked,
                                },
                              });
                              playSound('click');
                            }}
                            className="accent-indigo-600 w-4.5 h-4.5"
                          />
                          <div>
                            <span className="text-xs font-extrabold text-slate-700 block">
                              Apertura de Cajón al Cobrar (RJ11 Kick)
                            </span>
                            <span className="text-[9px] text-gray-400 font-bold block max-w-xs">
                              Impulso de 24V al puerto DK del cajón por pin 2
                            </span>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Right live printer output panel */}
                    <div className="lg:col-span-7 space-y-4">
                      <div className="bg-[#111] border-2 border-slate-850 rounded-3xl p-4 text-white font-mono space-y-3 shadow-lg relative max-h-[360px] overflow-y-auto">
                        <div className="flex justify-between items-center text-[10px] text-indigo-400 font-bold pb-2 border-b border-slate-800">
                          <span>🖨️ ROLLO DE IMPRESIÓN EMULADO</span>
                          <div className="flex gap-2">
                            <span className="bg-slate-800 text-slate-300 font-black text-[9px] px-2 py-0.5 rounded uppercase">
                              Papel: {localSettings.thermalPrinter.paperWidth}
                            </span>
                          </div>
                        </div>

                        {printedReceiptsSim.length === 0 ? (
                          <div className="text-center py-12 text-slate-500 font-black italic space-y-3">
                            <span className="text-3xl block select-none">📄</span>
                            <p className="text-xs">No se han enviado trabajos de impresión.</p>
                            <p className="text-[9px] uppercase tracking-wider text-slate-600">
                              Presiona "Imprimir Autodiagnóstico" abajo
                            </p>
                          </div>
                        ) : (
                          <div className="bg-white text-slate-800 p-4 border border-gray-300 shadow-inner max-w-sm mx-auto text-xs font-mono scale-95 origin-top select-all leading-normal">
                            {printedReceiptsSim.map((line, idx) => (
                              <p key={idx} className="whitespace-pre min-h-[1em]">
                                {line}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 pt-1 text-center justify-center">
                        <button
                          type="button"
                          onClick={triggerTestPrint}
                          disabled={isPrintingJob}
                          className="flex-1 py-3 bg-indigo-600 border-b-4 border-indigo-800 font-black text-white text-xs uppercase tracking-wider hover:bg-indigo-500 active:translate-y-px active:border-b-0 cursor-pointer rounded-2xl flex items-center justify-center gap-1.5"
                        >
                          <Disc className={`w-4 h-4 ${isPrintingJob ? 'animate-spin' : ''}`} />
                          Imprimir Autodiagnóstico ESC/POS
                        </button>
                        <button
                          type="button"
                          onClick={triggerPulseDrawer}
                          className="py-3 px-4 bg-white hover:bg-gray-50 border-2 border-gray-200 border-b-4 text-slate-700 font-black text-xs uppercase cursor-pointer rounded-2xl"
                        >
                          Pulsar Cajón (RJ11) 🪙
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* CONTAINER 3: USB LASER BARCODE SCANNER INTERCEPTOR */}
            {activeDriverTab === 'scanner' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="border-b pb-4">
                  <h4 className="text-sm font-black uppercase text-slate-800 tracking-tight flex items-center gap-1.5">
                    <Barcode className="text-[#1cb0f6]" size={18} />
                    Lector de Código de Barras (Gun Scanner / USB / HID)
                  </h4>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                    Administración de periféricos tipo emulación de teclado o lectura serial
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                  {/* Left Column Config */}
                  <div className="lg:col-span-5 bg-white border-2 border-gray-200 rounded-3xl p-4 space-y-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-sky-500 block border-b pb-2">
                      Reglas de Acceso
                    </span>

                    <div className="space-y-3.5">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-black text-gray-400 tracking-wider block">
                          Modo lógico del Escáner
                        </label>
                        <select
                          value={localSettings.barcodeScanner.mode}
                          onChange={(e) => {
                            setLocalSettings({
                              ...localSettings,
                              barcodeScanner: { ...localSettings.barcodeScanner, mode: e.target.value as any },
                            });
                          }}
                          className="w-full bg-gray-50 border-2 border-gray-200 p-2 text-xs font-bold rounded-xl outline-none"
                        >
                          <option value="keyboard">Emulación de Teclado (USB Keyboard Wedge)</option>
                          <option value="serial">Serie Virtual COM (WebSerial Listener)</option>
                          <option value="webcam">Webcam Integrada (Simulador OCR)</option>
                        </select>
                      </div>

                      <div className="border-t pt-3.5 space-y-2">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block pb-1">
                          Automatización
                        </span>

                        <label className="flex items-center gap-2.5 cursor-pointer selection-none">
                          <input
                            type="checkbox"
                            checked={localSettings.barcodeScanner.autoAdd}
                            onChange={(e) => {
                              setLocalSettings({
                                ...localSettings,
                                barcodeScanner: { ...localSettings.barcodeScanner, autoAdd: e.target.checked },
                              });
                              playSound('click');
                            }}
                            className="accent-indigo-600 w-4.5 h-4.5"
                          />
                          <div>
                            <span className="text-xs font-extrabold text-slate-700 block">
                              Agregar al Carrito de Inmediato
                            </span>
                            <span className="text-[9px] text-gray-400 font-bold block max-w-xs">
                              Busca el código y lo suma directamente al carrito si hay stock
                            </span>
                          </div>
                        </label>
                      </div>

                      <div className="bg-sky-50 border border-sky-100 p-3 rounded-2xl text-[10px] text-sky-850 font-bold leading-normal flex gap-1.5 pt-2">
                        <Terminal size={18} className="text-sky-500 shrink-0 mt-0.5" />
                        <p>
                          <strong>Intercepción Global:</strong> Al estar en emulación de teclado, cualquier disparo del
                          gatillo del escáner físico se intercepta desde la ventana enfocada automáticamente.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Right Simulated Scanner Device */}
                  <div className="lg:col-span-7 space-y-4">
                    <div className="bg-[#111827] text-white p-5 border-2 border-gray-800 rounded-3xl space-y-4 shadow-lg min-h-[220px]">
                      <div className="flex justify-between items-center text-[9px] font-black text-sky-400 font-mono">
                        <span>📟 DISPARADOR DIRECTO DE ESCÁNER DE PISTOLA</span>
                        <span className="bg-green-500 text-white font-mono px-1.5 py-0.5 rounded text-[8px]">
                          ONLINE
                        </span>
                      </div>

                      <div className="bg-[#1f2937] p-3 border border-gray-700 rounded-2xl space-y-2 text-center">
                        <p className="text-[10px] font-bold text-gray-300">
                          Presiona sobre un producto preestablecido para disparar simulated laser pulses (Simular
                          gatillo físico):
                        </p>

                        <div className="grid grid-cols-2 gap-1.5 pt-1.5">
                          <button
                            type="button"
                            onClick={() => simulateManualScannerTrigger('75010001')}
                            className="p-2.5 bg-[#374151] hover:bg-[#4b5563] text-[10.5px] font-black rounded-xl text-white cursor-pointer uppercase border-b-2 border-slate-900"
                          >
                            ☕ Café Americano (75010001)
                          </button>
                          <button
                            type="button"
                            onClick={() => simulateManualScannerTrigger('75010002')}
                            className="p-2.5 bg-[#374151] hover:bg-[#4b5563] text-[10.5px] font-black rounded-xl text-white cursor-pointer uppercase border-b-2 border-slate-900"
                          >
                            🥯 Donut Clásico (75010002)
                          </button>
                          <button
                            type="button"
                            onClick={() => simulateManualScannerTrigger('75010005')}
                            className="p-2.5 bg-[#374151] hover:bg-[#4b5563] text-[10.5px] font-black rounded-xl text-white cursor-pointer uppercase border-b-2 border-slate-900"
                          >
                            🥤 Café Latte (75010005)
                          </button>
                          <button
                            type="button"
                            onClick={() => simulateManualScannerTrigger('75010007')}
                            className="p-2.5 bg-[#374151] hover:bg-[#4b5563] text-[10.5px] font-black rounded-xl text-white cursor-pointer uppercase border-b-2 border-slate-900"
                          >
                            👕 Sudadera Duo (75010007)
                          </button>
                        </div>
                      </div>

                      {/* Manual text input simulation barcode entry */}
                      <div className="space-y-1 border-t border-slate-800 pt-3 flex gap-2 items-center">
                        <div className="flex-1">
                          <input
                            type="text"
                            placeholder="Especificar código de barra..."
                            value={testBarcodeBuffer}
                            onChange={(e) => setTestBarcodeBuffer(e.target.value.replace(/[^0-9]/g, ''))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                simulateManualScannerTrigger(testBarcodeBuffer);
                                setTestBarcodeBuffer('');
                              }
                            }}
                            className="w-full bg-[#1f2937] border-2 border-gray-700 rounded-xl px-2.5 py-1.5 text-xs font-mono font-black text-[#58cc02]"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            simulateManualScannerTrigger(testBarcodeBuffer);
                            setTestBarcodeBuffer('');
                          }}
                          className="py-1.5 px-3.5 bg-emerald-600 text-white font-extrabold text-xs uppercase rounded-xl border-b-2 border-emerald-800"
                        >
                          Disparar Láser 🔦
                        </button>
                      </div>
                    </div>

                    {/* SCANNER CONSOLE RX LOGS */}
                    <div className="bg-slate-900 rounded-2xl p-3 border border-slate-850 space-y-1">
                      <span className="text-[9px] font-black font-mono text-[#1cb0f6] uppercase tracking-widest block">
                        Lecturas de Recinto Recientemente
                      </span>
                      <div className="bg-slate-950 p-3 h-24 rounded-xl border border-slate-800 font-mono text-[9.5px] text-[#22d3ee] overflow-y-auto space-y-1">
                        {scannerHitsLog.length === 0 ? (
                          <p className="text-slate-500 font-bold italic">Esperando lectura por haz de luz...</p>
                        ) : (
                          scannerHitsLog.map((log, i) => (
                            <p key={i} className="leading-tight">
                              {log}
                            </p>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* CONTAINER 4: CASH DRAWER (CAJÓN DE DINERO) */}
            {activeDriverTab === 'drawer' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="border-b pb-4">
                  <h4 className="text-sm font-black uppercase text-slate-800 tracking-tight flex items-center gap-1.5">
                    <CashDrawerIcon className="text-rose-500" size={18} />
                    Cajón de Dinero Electrónico (RJ11 Kick Driver)
                  </h4>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                    Verificación de resguardos y solidez física de apertura del cajón metálico
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                  {/* Left Column Config */}
                  <div className="lg:col-span-5 bg-white border-2 border-gray-200 rounded-3xl p-4 space-y-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-sky-500 block border-b pb-2">
                      Parámetros del Driver
                    </span>

                    <div className="space-y-3.5">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-black text-gray-400 tracking-wider block">
                          Estado del Cajón
                        </label>
                        <select
                          value={localSettings.cashDrawer.mode}
                          onChange={(e) => {
                            setLocalSettings({
                              ...localSettings,
                              cashDrawer: { ...localSettings.cashDrawer, mode: e.target.value as any },
                            });
                          }}
                          className="w-full bg-gray-50 border-2 border-gray-200 p-2 text-xs font-bold rounded-xl outline-none"
                        >
                          <option value="manual">Operación Manual (Solo Estado Visual)</option>
                          <option value="rj11_kick">Impulso RJ11 (100ms, 12V/24V)</option>
                          <option value="serial_virtual">Serie Virtual COM (WebSerial Protocol)</option>
                        </select>
                      </div>

                      <div className="border-t pt-3.5 space-y-2">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block pb-1">
                          Simulación de Estados
                        </span>

                        <label className="flex items-center gap-2.5 cursor-pointer selection-none">
                          <input
                            type="checkbox"
                            checked={localSettings.cashDrawer.enableFeedback}
                            onChange={(e) => {
                              setLocalSettings({
                                ...localSettings,
                                cashDrawer: { ...localSettings.cashDrawer, enableFeedback: e.target.checked },
                              });
                              playSound('click');
                            }}
                            className="accent-indigo-600 w-4.5 h-4.5"
                          />
                          <div>
                            <span className="text-xs font-extrabold text-slate-700 block">
                              Feedback Auditivo y Tátil
                            </span>
                            <span className="text-[9px] text-gray-400 font-bold block max-w-xs">
                              Reproduce sonido al cambiar estado ( abierto → cerrado )
                            </span>
                          </div>
                        </label>

                        <label className="flex items-center gap-2.5 cursor-pointer selection-none pt-1">
                          <input
                            type="checkbox"
                            checked={localSettings.cashDrawer.enableLedIndicator}
                            onChange={(e) => {
                              setLocalSettings({
                                ...localSettings,
                                cashDrawer: { ...localSettings.cashDrawer, enableLedIndicator: e.target.checked },
                              });
                              playSound('click');
                            }}
                            className="accent-indigo-600 w-4.5 h-4.5"
                          />
                          <div>
                            <span className="text-xs font-extrabold text-slate-700 block">
                              Indicador LED de Estado
                            </span>
                            <span className="text-[9px] text-gray-400 font-bold block max-w-xs">
                              Luz interna cambia color según estado del cajón
                            </span>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Right live cash drawer panel */}
                    <div className="lg:col-span-7 space-y-4">
                      <div className="bg-[#111] border-2 border-slate-850 rounded-3xl p-4 text-white font-mono space-y-3 shadow-lg relative max-h-[280px] overflow-y-auto">
                        <div className="flex justify-between items-center text-[10px] text-indigo-400 font-bold pb-2 border-b border-slate-800">
                          <span>💰 CAJÓN DE DINERO EMULADO</span>
                          <div className="flex gap-2">
                            <span className="bg-slate-800 text-slate-300 font-black text-[9px] px-2 py-0.5 rounded uppercase">
                              Estado: {cashDrawerOpenState ? '¡ABIERTO!' : 'CERRADO'}
                            </span>
                          </div>
                        </div>

                        {cashDrawerOpenState ? (
                          <>
                            <div className="flex items-center gap-4 mt-3">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 bg-emerald-500 rounded-full" />
                                <span className="text-lg font-black">
                                  ¡Cajón Abierto!
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <CashDrawerIcon size={24} className="text-emerald-500" />
                                <span className="text-lg font-black">
                                  Simulando apertura física
                                </span>
                              </div>
                            </div>
                            <div className="bg-emerald-500/20 p-3 rounded-xl">
                              <p className="text-sm font-black">
                                Listo para recibir efectivo • Compartimento interno accesible
                              </p>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-4 mt-3">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 bg-gray-400 rounded-full" />
                                <span className="text-lg font-black">
                                  Cajón Seguro
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <CashDrawerIcon size={24} className="text-gray-400" />
                                <span className="text-lg font-black">
                                  Esperando transacción
                                </span>
                              </div>
                            </div>
                            <div className="bg-gray-400/20 p-3 rounded-xl">
                              <p className="text-sm font-black">
                                Dispositivo listo • Esperando señal de activación
                              </p>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="flex gap-2 pt-1 text-center justify-center">
                        <button
                          type="button"
                          onClick={triggerPulseDrawer}
                          className="py-3 px-4 bg-white hover:bg-gray-50 border-2 border-gray-200 border-b-4 text-slate-700 font-black text-xs uppercase cursor-pointer rounded-2xl"
                        >
                          Pulsar Cajón (RJ11) 🪙
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


















