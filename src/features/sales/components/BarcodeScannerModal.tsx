/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Barcode, Camera } from 'lucide-react';
import { Product } from '../../../types/index';
import { playSound } from '../../../services/audio/soundService';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  simulateBarcodeScan: (product: Product) => void;
}

export default function BarcodeScannerModal({
  isOpen,
  onClose,
  products,
  simulateBarcodeScan,
}: BarcodeScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [activeScanStatus, setActiveScanStatus] = useState<string>('Esperando código...');

  const startCamera = async () => {
    try {
      setActiveScanStatus('Iniciando webcam...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setActiveScanStatus('¡Cámara Activa! Alinea el código de barra del producto');
    } catch (err) {
      console.warn('Camera device access failed:', err);
      setActiveScanStatus('Acceso denegado a la cámara. Prueba el escáner manual o simula un escaneo.');
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
  };

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn text-gray-805">
      <div className="bg-white border-2 border-gray-200 border-b-8 rounded-3xl max-w-2xl w-full p-5 sm:p-6 md:p-8 space-y-6 relative shadow-2xl">
        <button
          onClick={() => {
            onClose();
            playSound('click');
          }}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 p-1 bg-gray-50 border cursor-pointer font-black text-xs h-7 w-7 flex items-center justify-center select-none"
        >
          ✕
        </button>

        <div className="text-center space-y-1">
          <span className="text-4xl block animate-pulse">📷</span>
          <h3 className="text-2xl font-black text-gray-800 flex items-center justify-center gap-1.5 uppercase">
            <Barcode className="text-[#1cb0f6]" /> Lector de Código de Barras
          </h3>
          <p className="text-xs text-[#949494] font-black uppercase tracking-wider">
            Compatible con Webcams de Móviles/PC & Pistolas de Escáner USB Externas
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {/* LEFT COLUMN: LIVE WEBCAM VIDEO OR FALLBACK CONTAINER */}
          <div className="flex flex-col justify-between bg-black rounded-2xl p-4 border-2 border-slate-700 relative overflow-hidden min-h-[280px]">
            {/* Simulated/Real Neon Scan line */}
            {cameraStream && (
              <div className="absolute inset-x-0 h-1 bg-green-500 shadow-[0_0_12px_#22c55e] z-10 animate-scanLine" />
            )}

            <div className="w-full flex-1 flex items-center justify-center relative bg-zinc-900 rounded-xl overflow-hidden min-h-[190px]">
              {cameraStream ? (
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
              ) : (
                <div className="text-center p-4 space-y-3">
                  <div className="relative inline-block">
                    <Camera className="text-slate-600 mx-auto animate-pulse" size={48} />
                    <span className="absolute -bottom-1 -right-1 text-xs">⚠️</span>
                  </div>
                  <p className="text-xs text-gray-400 max-w-xs leading-normal">
                    Para escanear usando la cámara del dispositivo, concede permiso de acceso o usa el simulador
                    interactivo de la derecha.
                  </p>
                </div>
              )}

              {/* Scope bracket targets overlay */}
              <div className="absolute inset-4 pointer-events-none border-2 border-white/20 rounded-lg flex items-center justify-center">
                <div className="w-44 h-24 border-2 border-[#58cc02] rounded-md bg-transparent relative">
                  {/* corner indicators */}
                  <span className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-[#58cc02]" />
                  <span className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-[#58cc02]" />
                  <span className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-[#58cc02]" />
                  <span className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-[#58cc02]" />
                </div>
              </div>
            </div>

            {/* Live Status indicator */}
            <div className="mt-3 bg-white/10 text-white rounded-xl px-3 py-2 text-center text-[11px] font-black uppercase tracking-wider">
              📢 {activeScanStatus}
            </div>
          </div>

          {/* RIGHT COLUMN: SIMULATOR BARCODE INTERACTION CATOLOGUE */}
          <div className="flex flex-col justify-between space-y-3">
            <div className="bg-gray-50 border border-gray-150 p-3 rounded-2xl">
              <span className="text-[10px] font-black uppercase text-gray-400 block tracking-widest mb-1">
                Simulación táctil de código
              </span>
              <p className="text-[10px] text-gray-500 font-bold leading-normal mb-2 text-left">
                Si no tienes empaques físicos ni cámara activa, haz clic en cualquiera de los productos de la tienda
                para simular un haz de lectura láser instantánea con DuoPOS:
              </p>

              <div className="space-y-1.5 max-h-[190px] overflow-y-auto pr-1">
                {products.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      simulateBarcodeScan(p);
                      setActiveScanStatus(`✅ Éxito: ¡Escaneado correctamente ${p.name}!`);
                    }}
                    className="w-full text-left bg-white hover:bg-green-50 hover:border-green-300 border border-gray-200 p-2 rounded-xl flex items-center justify-between text-xs font-bold text-gray-700 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{p.emoji}</span>
                      <div className="text-left">
                        <p className="font-extrabold text-gray-800 line-clamp-1 truncate">{p.name}</p>
                        <span className="font-mono text-[9px] text-[#1cb0f6] bg-blue-50/50 py-0.5 px-1.5 rounded-md">
                          EAN-{p.barcode || '7501...'}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-black text-[#58cc02] group-hover:underline">Escanear ⚡</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-amber-50/50 border border-amber-150 p-2 rounded-xl text-[10px] text-amber-800 font-bold leading-normal text-left">
              💡 <strong>Modo Pistola Láser Real:</strong> No necesitas abrir ningún modal para facturar físicamente. Al
              conectar tu lector, puedes escanear directamente desde la pantalla de ventas a gran velocidad.
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            onClose();
            playSound('click');
          }}
          className="w-full bg-[#58cc02] text-white border-b-4 border-[#46a302] hover:bg-[#61e002] active:translate-y-[2px] active:border-b-2 py-3.5 rounded-2xl font-black text-sm uppercase text-center cursor-pointer tracking-wider"
        >
          Cerrar Escáner
        </button>
      </div>
    </div>
  );
}
