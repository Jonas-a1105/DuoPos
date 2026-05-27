/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Award, Check, Sparkles, Smartphone, Laptop, Chrome, Share, ArrowUpToLine, ShieldAlert } from 'lucide-react';

interface InstallModalProps {
  onClose: () => void;
  onGrantXp: (amount: number) => void;
  isSimulatedInstalled: boolean;
  onSimulateInstallSuccess: () => void;
  deferredPrompt?: any;
  setDeferredPrompt?: (prompt: any) => void;
}

export default function InstallModal({ 
  onClose, 
  onGrantXp, 
  isSimulatedInstalled, 
  onSimulateInstallSuccess,
  deferredPrompt,
  setDeferredPrompt 
}: InstallModalProps) {
  const [activeTab, setActiveTab] = useState<'pc' | 'android' | 'ios'>('pc');
  const [installSuccess, setInstallSuccess] = useState(false);
  const [installMessage, setInstallMessage] = useState('Has simulado instalar DuoPOS en tu pantalla de inicio. ¡Se ha desbloqueado la vista nativa flotante en este navegador!');

  const triggerSimInstall = () => {
    if (isSimulatedInstalled) return;
    setInstallMessage('Has simulado instalar DuoPOS en tu pantalla de inicio. ¡Se ha desbloqueado la vista nativa flotante en este navegador!');
    setInstallSuccess(true);
    onGrantXp(55);
    onSimulateInstallSuccess();
    setTimeout(() => {
      setInstallSuccess(false);
      onClose();
    }, 2500);
  };

  const triggerRealInstall = async () => {
    if (!deferredPrompt) return;
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setInstallMessage('¡DuoPOS instalado nativamente con éxito en tu dispositivo! Accede desde tu pantalla de inicio.');
        setInstallSuccess(true);
        onGrantXp(120); // Triple experience boost for genuine install!
        onSimulateInstallSuccess();
        setTimeout(() => {
          setInstallSuccess(false);
          onClose();
        }, 3000);
      }
    } catch (err) {
      console.error('Error triggering actual native PWA prompt:', err);
    }
    if (setDeferredPrompt) {
      setDeferredPrompt(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn font-sans">
      <div className="bg-white border-2 border-gray-200 border-b-8 rounded-3xl max-w-xl w-full p-6 space-y-6 relative shadow-2xl my-8">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 font-bold"
        >
          ✕
        </button>

        {installSuccess ? (
          // Install transition celebration card
          <div className="text-center py-8 space-y-4 animate-bounce">
            <span className="text-7xl block select-none">🏆</span>
            <h3 className="text-3xl font-black text-[#58cc02]">¡Instalación Exitosa!</h3>
            <p className="text-gray-500 font-bold max-w-sm mx-auto leading-relaxed">
              {installMessage}
            </p>
            <div className="bg-[#f2ffd9] border border-[#d2f09d] rounded-2xl py-2 px-4 max-w-xs mx-auto text-[#58cc02] font-black text-sm flex items-center justify-center gap-1">
              <Sparkles size={16} /> ¡+55 XP reclamados!
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="text-center space-y-2">
              <span className="text-5xl block animate-pulse">📲</span>
              <h3 className="text-2xl font-black text-gray-800">¡Lleva DuoPOS en tu Escritorio o Celular!</h3>
              <p className="text-sm text-gray-400 font-bold">
                Nuestra aplicación soporta capacidades PWA. Accede sin barras de navegador e inicia instantáneamente.
              </p>
            </div>

            {/* Platform Selector Buttons */}
            <div className="grid grid-cols-3 gap-2 border-b border-gray-100 pb-2">
              {[
                { id: 'pc', label: 'Computadora', icon: <Laptop size={14} /> },
                { id: 'android', label: 'Android / Chrome', icon: <Smartphone size={14} /> },
                { id: 'ios', label: 'Apple iOS / Safari', icon: <Smartphone size={14} /> }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-2 px-1 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-1 border-b-4 cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-[#58cc02] text-white border-[#46a302]'
                      : 'bg-white text-gray-500 border-2 border-gray-150 hover:bg-gray-50 active:translate-y-[2px] active:border-b-2'
                  }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            {/* Instruction Sheets */}
            <div className="bg-gray-50 rounded-2xl p-4 text-sm text-gray-650 leading-relaxed font-bold space-y-3 border min-h-[140px]">
              {activeTab === 'pc' && (
                <div className="space-y-2">
                  <h4 className="text-[#3c3c3c] font-black flex items-center gap-1 text-sm uppercase">
                    <Chrome size={16} className="text-[#1cb0f6]" /> Google Chrome / Edge en PC:
                  </h4>
                  <p className="text-xs text-gray-500">
                    1. Fíjate en el extremo derecho de tu barra de URL del navegador.<br />
                    2. Verás un icono de descarga con forma de monitor con flecha <span className="bg-white border rounded px-1 animate-pulse font-mono">📥</span>.<br />
                    3. Haz clic en él y confirma <span className="text-[#58cc02] font-black">Instalar</span>.<br />
                    4. ¡Listo! Se creará un acceso directo en tu escritorio con el logo de DuoPOS.
                  </p>
                </div>
              )}

              {activeTab === 'android' && (
                <div className="space-y-2">
                  <h4 className="text-[#3c3c3c] font-black flex items-center gap-1 text-sm uppercase">
                    <Chrome size={16} className="text-[#58cc02]" /> Celulares Android:
                  </h4>
                  <p className="text-xs text-gray-500">
                    1. Entra a tu navegador Google Chrome en el móvil.<br />
                    2. Toca los tres puntos de configuración vertical <span className="font-mono">⋮</span> en el menú superior derecho.<br />
                    3. Selecciona la opción <span className="font-extrabold text-[#1cb0f6]">"Añadir a pantalla de inicio"</span> o <span className="font-extrabold text-[#58cc02]">"Instalar aplicación"</span>.<br />
                    4. Confirma el cuadro flotante y la app de DuoPOS se integrará a tu panel telefónico.
                  </p>
                </div>
              )}

              {activeTab === 'ios' && (
                <div className="space-y-2">
                  <h4 className="text-[#3c3c3c] font-black flex items-center gap-1 text-sm uppercase">
                    <Smartphone size={16} className="text-purple-500" /> iPhones / iPads (iOS):
                  </h4>
                  <p className="text-xs text-gray-500">
                    1. Abre este sitio web exclusivamente desde el navegador nativo <span className="text-blue-500">Safari</span>.<br />
                    2. En la barra de menú inferior del navegador, toca el botón de <span className="font-extrabold flex items-center gap-0.5 inline-flex"><Share size={12} fill="currentColor" /> Compartir</span>.<br />
                    3. Desplázate hacia abajo y selecciona la opción <span className="font-extrabold text-[#58cc02] flex items-center gap-0.5 inline-flex"><ArrowUpToLine size={12} /> "Añadir a pantalla de inicio"</span>.<br />
                    4. Toca "Agregar" en la esquina superior derecha y arrastra el búho Duo a tus favoritos.
                  </p>
                </div>
              )}
            </div>

            {/* Native or Simulation button with reward */}
            <div className="pt-3 border-t border-gray-100 flex flex-col items-center space-y-3">
              {deferredPrompt ? (
                <>
                  <span className="text-[10px] text-[#1cb0f6] font-extrabold uppercase tracking-widest text-center block animate-pulse">
                    ⚡ ¡DISPOSITIVO COMPATIBLE DETECTADO! ⚡
                  </span>
                  
                  <button
                    type="button"
                    onClick={triggerRealInstall}
                    className="w-full bg-[#58cc02] text-white border-b-4 border-[#46a302] hover:bg-[#61e002] active:border-b-0 active:translate-y-[4px] font-black py-4.5 rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer uppercase text-base animate-pulse"
                  >
                    <Sparkles size={18} /> Instalación Real Nativa (+120 XP)
                  </button>

                  <p className="text-[10px] text-gray-400 font-bold text-center">
                    Se creará una aplicación independiente en tu menú o escritorio.
                  </p>
                </>
              ) : (
                <>
                  <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest text-center block">
                    ⭐ ¿Deseas simular e integrarla en esta pestaña para pruebas directas? ⭐
                  </span>
                  
                  <button
                    type="button"
                    onClick={triggerSimInstall}
                    disabled={isSimulatedInstalled}
                    className={`w-full font-black py-4.5 rounded-2xl transition-all border-b-4 flex items-center justify-center gap-2 cursor-pointer uppercase ${
                      isSimulatedInstalled
                        ? 'bg-gray-100 text-gray-400 border-gray-200 border-b-0 cursor-not-allowed'
                        : 'bg-[#ff9600] text-white border-[#df7e00] hover:bg-[#ffa726] active:border-b-0 active:translate-y-[4px]'
                    }`}
                  >
                    <Award size={18} /> 
                    {isSimulatedInstalled ? '✓ Modo Install Activo' : 'Simular Alta Movil/PC (+55 XP)'}
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={onClose}
                className="text-xs font-black text-gray-400 hover:text-gray-600 block pt-1 hover:underline"
              >
                Cerrar instructivo por ahora
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
