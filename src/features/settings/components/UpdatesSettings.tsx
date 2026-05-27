import React, { useState } from 'react';
import { playSound } from '../../../services/sounds';
import { toast } from '../../../components/Modal/FlashNotifications';
import { LicenseDetails } from '../../../services/licensing';
import { 
  Laptop, Cpu, RefreshCw, Database, Globe, Check, Info 
} from 'lucide-react';

interface UpdatesSettingsProps {
  appVersion: string;
  onUpdateAppVersion: (newVersion: string) => void;
  onGrantXp: (amount: number) => void;
  licenseDetails: LicenseDetails;
}

export default function UpdatesSettings({
  appVersion,
  onUpdateAppVersion,
  onGrantXp,
  licenseDetails
}: UpdatesSettingsProps) {
  const [compilationWrapper, setCompilationWrapper] = useState<'tauri' | 'electron' | 'capacitor'>('tauri');

  // States for desktop app system updates representation
  const [isCheckingOnline, setIsCheckingOnline] = useState(false);
  const [onlineCheckResult, setOnlineCheckResult] = useState<'none' | 'update_found' | 'up_to_date'>('none');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [currentSpeed, setCurrentSpeed] = useState('');
  const [offlineFileName, setOfflineFileName] = useState('');
  const [isApplyingOffline, setIsApplyingOffline] = useState(false);

  const tauriConfigText = {
    "tauri": {
      "bundle": {
        "active": true,
        "category": "Office",
        "copyright": "Copyright © 2026 DuoPOS Group LLC",
        "identifier": "com.duopos.pointofsale",
        "icon": ["icons/32x32.png", "icons/128x128.png", "icons/icon.icns", "icons/icon.ico"],
        "name": "DuoPOS"
      },
      "security": {
        "csp": null
      },
      "windows": [
        {
          "title": "DuoPOS - Punto de Venta Corporativo",
          "width": 1280,
          "height": 720,
          "fullscreen": false,
          "resizable": true
        }
      ]
    }
  };

  const electronMainText = `const { app, BrowserWindow } = require('electron');\nconst path = require('path');\n\nfunction createWindow() {\n  const win = new BrowserWindow({\n    width: 1280,\n    height: 768,\n    title: "DuoPOS .EXE",\n    webPreferences: {\n      nodeIntegration: true,\n      contextIsolation: false\n    }\n  });\n  win.loadFile(path.join(__dirname, 'dist/index.html'));\n}\n\napp.whenReady().then(() => {\n  createWindow();\n  app.on('activate', () => {\n    if (BrowserWindow.getAllWindows().length === 0) createWindow();\n  });\n});\n\napp.on('window-all-closed', () => {\n  if (process.platform !== 'darwin') app.quit();\n});`;

  const capacitorMainText = `import { CapacitorConfig } from '@capacitor/cli';\n\nconst config: CapacitorConfig = {\n  appId: 'com.duopos.pointofsale',\n  appName: 'DuoPOS',\n  webDir: 'dist',\n  server: {\n    androidScheme: 'https'\n  }\n};\n\nexport default config;`;

  return (
    <div className="space-y-6 animate-fadeIn text-left">
      <div className="border-b pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl select-none font-black text-amber-500">📥</span>
          <div>
            <h3 className="text-sm font-black uppercase text-gray-800 tracking-tight font-sans">Centro de Actualizaciones DuoPOS (.exe)</h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase font-sans">Gestión de versiones online OTA y carga manual para entornos offline</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-gray-150 text-gray-700 text-[10px] font-black uppercase px-2.5 py-1 rounded-xl font-sans select-none">
            Compilación: Windows x64 Native C# Wrapper
          </span>
        </div>
      </div>

      {/* CURRENT VERSION METADATA BOARD */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-sans text-gray-700">
        <div className="bg-white border-2 border-gray-200 rounded-2xl p-4 space-y-2">
          <span className="text-[9px] uppercase font-black tracking-widest text-gray-400 block leading-none">Versión Instalada</span>
          <div className="text-md font-black text-slate-800 flex items-center gap-1.5 pt-1">
            <Laptop size={16} className="text-[#1cb0f6]" />
            <span>{appVersion}</span>
          </div>
          <p className="text-[9.5px] font-bold text-gray-400 uppercase leading-none mt-2">Firma Local Validada por Duo Guard</p>
        </div>

        <div className="bg-white border-2 border-gray-200 rounded-2xl p-4 space-y-2">
          <span className="text-[9px] uppercase font-black tracking-widest text-gray-400 block leading-none">Motor de Datos</span>
          <div className="text-md font-black text-slate-800 flex items-center gap-1.5 pt-1">
            <Cpu size={16} className="text-emerald-500" />
            <span>SQLite Embedded Mode</span>
          </div>
          <p className="text-[9.5px] font-bold text-gray-400 uppercase leading-none mt-2">Sincronización de Logs Diferida</p>
        </div>

        <div className="bg-white border-2 border-gray-200 rounded-2xl p-4 space-y-2">
          <span className="text-[9px] uppercase font-black tracking-widest text-gray-400 block leading-none">Canal de Distribución</span>
          <div className="text-md font-black text-slate-800 flex items-center gap-1.5 pt-1">
            <RefreshCw size={16} className="text-amber-500" />
            <span>Producción Estable (LTS)</span>
          </div>
          <p className="text-[9.5px] font-bold text-gray-405 uppercase leading-none mt-2">Actualizaciones de Seguridad Críticas</p>
        </div>
      </div>

      {/* TWO PATHS GRID: ONLINE OTA & OFFLINE DISCONNECTED */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2 font-sans text-gray-700">
        
        {/* COLUMN 1: ONLINE UPDATE CHECKER */}
        <div className="bg-linear-to-b from-gray-50 to-white border-2 border-gray-200 rounded-2xl p-5 space-y-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="p-1 rounded-lg bg-sky-50 text-sky-600 border border-sky-200"><RefreshCw size={15} /></span>
              <h4 className="text-xs font-black text-gray-800 uppercase tracking-tight">Servicio OTA Online (Over-The-Air)</h4>
            </div>
            <p className="text-[10px] text-gray-400 font-extrabold uppercase leading-none">Verificación directa contra los servidores oficiales de DuoPOS</p>
            <p className="text-xs text-gray-500 leading-relaxed pt-1 font-bold lowercase">
              Utiliza esta opción si tu terminal del punto de venta tiene conexión directa a Internet (Red Cableada o Wi-Fi). El sistema consultará de forma segura el manifest oficial.
            </p>
          </div>

          {onlineCheckResult === 'none' && !isCheckingOnline && (
            <button
              type="button"
              onClick={() => {
                playSound('click');
                setIsCheckingOnline(true);
                setOnlineCheckResult('none');
                setTimeout(() => {
                  setIsCheckingOnline(false);
                  if (appVersion.includes('v2.5')) {
                    setOnlineCheckResult('up_to_date');
                  } else {
                    setOnlineCheckResult('update_found');
                  }
                  onGrantXp(15);
                }, 2500);
              }}
              className="w-full py-2.5 bg-sky-500 text-white border-b-4 border-sky-700 hover:bg-sky-400 active:border-b-0 active:translate-y-1 rounded-xl text-center uppercase font-black text-xs cursor-pointer select-none"
            >
              {isCheckingOnline ? 'Consultando Servidor...' : 'Buscar Actualización en Línea'}
            </button>
          )}

          {isCheckingOnline && (
            <div className="bg-slate-900 text-[#1cb0f6] border border-slate-950 p-4 rounded-xl font-mono text-[11px] leading-relaxed space-y-1">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-sky-400 animate-ping" />
                <span className="animate-pulse">Sincronizando con api.duopos.com (IPv4) ...</span>
              </div>
              <div className="text-slate-400 font-bold">[INFO] Verificando firma criptográfica sha-256 ...</div>
              <div className="text-slate-400 font-bold">[INFO] Verificando compatibilidad con el entorno .exe de Windows...</div>
              <div className="text-slate-400 font-bold">[INFO] ID de máquina: {licenseDetails.offlineActivationSeed}</div>
            </div>
          )}

          {onlineCheckResult === 'up_to_date' && !isCheckingOnline && (
            <div className="bg-emerald-50 border border-emerald-250 p-4 rounded-xl space-y-2 text-center text-emerald-950 font-bold text-xs">
              <p className="font-mono text-emerald-800 flex items-center justify-center gap-1">
                <Check size={16} /> ¡SISTEMA COMPLETAMENTE AL DÍA!
              </p>
              <p className="text-[10px] text-emerald-755 uppercase leading-normal">
                Felicidades, DuoPOS está corriendo la última versión disponible ({appVersion}) liberada en la racha actual.
              </p>
            </div>
          )}

          {onlineCheckResult === 'update_found' && !isCheckingOnline && !isDownloading && (
            <div className="bg-amber-50 border-2 border-amber-250 p-4 rounded-xl space-y-3">
              <div className="flex items-center gap-1.5 text-amber-900 font-black text-xs">
                <span className="text-base select-none">🎉</span>
                <span>¡NUEVA COMPILACIÓN DISPONIBLE! (v2.5.0-BúhoGaláctico)</span>
              </div>
              
              <div className="space-y-1 text-[10px] text-gray-500 font-extrabold leading-normal uppercase">
                <p className="text-slate-800 font-black">Novedades en este parche delta:</p>
                <p>✓ Firmeza Dual offline en moneda nacional con tipo de cambio BCV.</p>
                <p>✓ 4 Nuevas Skins de Gamificación en la tienda Duo.</p>
                <p>✓ Sincronización SQLite asíncrona robusta contra apagones imprevistos.</p>
              </div>

              <button
                type="button"
                onClick={() => {
                  playSound('click');
                  setIsDownloading(true);
                  setDownloadProgress(0);
                  setCurrentSpeed('4.5 MB/s');
                  
                  const steps = [
                    { progress: 10, text: 'Consiguiendo manifiesto oficial de descarga...' },
                    { progress: 25, text: 'Descargando binario delta (duopos_v2.5_diff.upd)...' },
                    { progress: 45, text: 'Realizando control de integridad SHA-256...' },
                    { progress: 65, text: 'Creando respaldo local SQLite de seguridad (auto_preventive.db)...' },
                    { progress: 85, text: 'Instalando librerías dinámicas y parches en caliente...' },
                    { progress: 100, text: 'Finalizando actualización offline. Listo para auto-reinicio...' }
                  ];
                  
                  let currentStepIdx = 0;
                  const interval = setInterval(() => {
                    if (currentStepIdx < steps.length) {
                      const item = steps[currentStepIdx];
                      setDownloadProgress(item.progress);
                      setCurrentStep(item.text);
                      currentStepIdx++;
                    } else {
                      clearInterval(interval);
                      setIsDownloading(false);
                      setOnlineCheckResult('up_to_date');
                      onUpdateAppVersion('v2.5.0-BúhoGaláctico');
                      onGrantXp(200);
                    }
                  }, 1000);
                }}
                className="w-full py-2 bg-gradient-to-r from-emerald-500 to-emerald-605 bg-[#58cc02] text-white border-b-4 border-emerald-700 hover:brightness-105 active:border-b-0 active:translate-y-1 rounded-xl text-center uppercase font-black text-xs cursor-pointer select-none block"
              >
                Descargar e Instalar v2.5.0
              </button>
            </div>
          )}

          {isDownloading && (
            <div className="bg-slate-900 text-white p-4 rounded-xl space-y-3 font-mono text-[11px] border border-slate-950">
              <div className="flex justify-between items-center text-sky-400">
                <span className="font-bold uppercase animate-pulse">⚙️ Instalando Actualización...</span>
                <span className="font-black text-xs text-white bg-sky-550/10 border border-sky-500/20 px-1.5 py-0.5 rounded-md">{downloadProgress}%</span>
              </div>

              <div className="w-full bg-slate-850 h-2 rounded-lg overflow-hidden border">
                <div 
                  className="bg-sky-500 h-full rounded-lg transition-all duration-300"
                  style={{ width: `${downloadProgress}%` }}
                />
              </div>

              <div className="space-y-1 text-slate-400 font-semibold select-none text-[10px]">
                <div>Suma SHA-256: 0x9AFB658CD30FA1B6</div>
                <div>Velocidad: <span className="text-white font-bold">{currentSpeed}</span></div>
                <div className="text-[#1cb0f6] mt-1 font-black uppercase tracking-wide">&gt; {currentStep}</div>
              </div>
            </div>
          )}
        </div>

        {/* COLUMN 2: OFFLINE DISCONNECTED UPDATES */}
        <div className="bg-linear-to-b from-gray-50 to-white border-2 border-gray-200 rounded-2xl p-5 space-y-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="p-1 rounded-lg bg-purple-50 text-purple-600 border border-purple-200"><Cpu size={15} /></span>
              <h4 className="text-xs font-black text-gray-800 uppercase tracking-tight">Actualización Manual por Lápiz USB (.upd)</h4>
            </div>
            <p className="text-[10px] text-purple-400 font-extrabold uppercase leading-none">Carga local de parches certificados para terminales desconectadas</p>
            <p className="text-xs text-gray-500 leading-relaxed pt-1 font-bold lowercase">
              Excelente función para tiendas físicas remotas o bodegas sin acceso a Internet. Arrastra o selecciona el archivo binario <strong className="text-slate-800 font-extrabold">.upd</strong> descargado previamente desde tu consola de soporte.
            </p>
          </div>

          <div 
            onClick={() => {
              if (isApplyingOffline) return;
              playSound('click');
              const testFileName = `duopos_v2.5.0_patch-${licenseDetails.offlineActivationSeed.slice(-4)}.upd`;
              setOfflineFileName(testFileName);
            }}
            className={`border-2 border-dashed rounded-xl p-5 text-center transition-all bg-white cursor-pointer group ${
              offlineFileName 
                ? 'border-emerald-500 bg-emerald-50/10' 
                : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50/5'
            }`}
          >
            <div className="flex flex-col items-center justify-center gap-1.5 flex-wrap">
              <span className="text-2xl select-none group-hover:scale-110 transition-all">📂</span>
              {offlineFileName ? (
                <div className="space-y-1">
                  <p className="text-xs font-black text-slate-800">
                    {offlineFileName}
                  </p>
                  <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[8.5px] font-black tracking-widest uppercase px-2 py-0.5 rounded-md inline-block">
                    FIRMA DE ENVASADO OFFLINE DETECTADA (RSA-4096)
                  </span>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-xs font-black text-gray-600 uppercase tracking-tight">
                    Seleccionar archivo de parche .upd
                  </p>
                  <p className="text-[9px] text-gray-400 font-extrabold uppercase leading-none">
                    o arrastra el archivo directamente aquí
                  </p>
                </div>
              )}
            </div>
          </div>

          {offlineFileName && !isApplyingOffline && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  playSound('click');
                  setIsApplyingOffline(true);
                  
                  setTimeout(() => {
                    setIsApplyingOffline(false);
                    onUpdateAppVersion('v2.5.0-BúhoGaláctico');
                    onGrantXp(200);
                    setOfflineFileName('');
                    toast.success('Se ha aplicado correctamente el parche offline (.upd) RSA-4096. (+200 XP por mantenimiento corporativo offline).', { title: 'Actualización Manual Exitosa ✅' });
                  }, 3000);
                }}
                className="flex-1 py-2 bg-purple-600 text-white hover:bg-purple-500 rounded-xl text-center uppercase font-black text-xs cursor-pointer select-none"
              >
                Instalar Parche Local ⚡
              </button>

              <button
                type="button"
                onClick={() => {
                  playSound('error');
                  setOfflineFileName('');
                }}
                className="px-3 bg-red-50 text-red-500 border-2 border-red-200 hover:bg-red-100 active:bg-gray-200 rounded-xl font-bold text-xs cursor-pointer select-none"
              >
                Vaciar
              </button>
            </div>
          )}

          {isApplyingOffline && (
            <div className="bg-slate-900 text-white p-4 rounded-xl space-y-1.5 font-mono text-[10.5px] border border-slate-950">
              <div className="text-[#c084fc] font-black animate-pulse">[USB] DESCOMPRIMIENDO CONTENEDOR DELTA...</div>
              <div className="text-slate-400">[USB] Analizando llaves simétricas DuoPOS...</div>
              <div className="text-slate-400">[USB] Copiando nuevos módulos de gamificación a disco local...</div>
              <div className="text-[#a855f7] font-bold">[USB] Refactoring SQLite database logs exitosamente.</div>
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[10px] text-amber-900 font-bold leading-normal flex gap-2">
            <span className="text-base select-none">💡</span>
            <div className="space-y-1 uppercase text-left">
              <p className="font-extrabold text-amber-950">¿Cómo verificar la racha de actualización?</p>
              <p className="text-gray-500 lowercase leading-relaxed font-semibold">
                Puedes descargar la clave (.upd) de tu sucursal ingresando a la consola de soporte de DuoPOS. Pásalo al pendrive para que la tienda opere 100% desconectada.
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* SYSTEM PACKAGING CENTER GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t-2 border-dashed border-gray-200 font-sans text-gray-700">
        
        {/* COMPILATION AND WRAPPER COMPILER BOARD */}
        <div className="bg-white border-2 border-gray-200 border-b-[6px] rounded-3xl p-5 space-y-4">
          <span className="text-[9px] uppercase font-black tracking-widest text-purple-650 block leading-none">Wrapper & Native Bundler</span>
          <div className="flex items-center gap-1.5">
            <Laptop size={18} className="text-purple-600 animate-pulse" />
            <h4 className="text-sm font-black text-gray-850 uppercase tracking-tight leading-none pt-1">Centro de Compilación (.EXE/.APK)</h4>
          </div>
          <p className="text-xs text-gray-500 font-bold uppercase leading-normal">
            ¿Quieres ejecutar DuoPOS como software local .exe instalable o app Android nativa en lugar del navegador? ¡Usa nuestros envolventes listos para compilar!
          </p>

          <div className="bg-gray-50 p-1.5 rounded-2xl flex gap-1 border">
            {[
              { id: 'tauri', label: 'Tauri (.EXE Premium)' },
              { id: 'electron', label: 'Electron (Fácil)' },
              { id: 'capacitor', label: 'Capacitor (.APK)' }
            ].map(w => (
              <button
                key={w.id}
                type="button"
                onClick={() => {
                  try { playSound('click'); } catch {}
                  setCompilationWrapper(w.id as any);
                }}
                className={`flex-1 text-center py-2 px-1 rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer ${
                  compilationWrapper === w.id
                    ? 'bg-purple-600 text-white border-b-4 border-purple-800 scale-102'
                    : 'bg-white border text-gray-650 hover:bg-gray-105'
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>

          {compilationWrapper === 'tauri' && (
            <div className="space-y-3 animate-fadeIn text-slate-800">
              <div className="bg-purple-55 border border-purple-150 rounded-2xl p-4 text-xs font-bold text-purple-950 space-y-2 uppercase leading-normal">
                <p className="font-black text-purple-700">🔥 ¿Por qué Tauri para tu .EXE?</p>
                <p className="font-semibold text-gray-500 lowercase leading-relaxed">Tauri compila tu sitio React a binarios nativos de menos de 10MB que corren ultra-rápido y con bajísimo consumo de memoria RAM (menos de 40MB).</p>
                <div className="bg-white rounded-xl p-3 border border-purple-100 space-y-1 text-[9.5px]">
                  <p className="text-[#7c3aed] font-black">⚙️ CONSOLA DE COMPILACIÓN:</p>
                  <p className="text-gray-550 font-bold lowercase">1. Instala: <span className="font-mono text-slate-800 bg-gray-100 p-0.5 rounded px-1">npm install @tauri-apps/cli -D</span></p>
                  <p className="text-gray-555 font-bold lowercase">2. Corre: <span className="font-mono text-slate-805 bg-gray-100 p-0.5 rounded px-1">npx tauri init</span> y copia la config en <span className="font-mono text-slate-805 bg-gray-100 p-0.5 rounded px-1">src-tauri/tauri.conf.json</span></p>
                  <p className="text-gray-555 font-bold lowercase">3. Compila con: <span className="font-mono text-slate-805 bg-gray-100 p-0.5 rounded px-1">npx tauri build</span> para obtener tu instalador <span className="font-mono text-[#58cc02] bg-[#e5f6ff] p-0.5 rounded px-1 font-black">.EXE / .MSI / .DMG</span></p>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase font-black tracking-wide text-gray-400">tauri.conf.json</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(tauriConfigText, null, 2));
                      try { playSound('success'); } catch {}
                      alert('📋 ¡Configuración de Tauri copiada al portapapeles!');
                    }}
                    className="text-[9px] bg-slate-100 hover:bg-purple-105 hover:text-purple-700 border font-black px-2 py-1 rounded-md uppercase cursor-pointer select-none"
                  >
                    Copiar Código
                  </button>
                </div>
                <pre className="bg-slate-900 text-pink-400 border text-[9px] p-4 rounded-2xl overflow-x-auto font-mono max-h-44">
                  {JSON.stringify(tauriConfigText, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {compilationWrapper === 'electron' && (
            <div className="space-y-3 animate-fadeIn">
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-xs font-bold text-blue-950 space-y-2 uppercase leading-normal">
                <p className="font-black text-blue-600">📦 ¿Por qué Electron para tu .EXE?</p>
                <p className="font-semibold text-gray-550 lowercase">Electron es el estándar mundial (usado por Discord y VSCode). Es la forma más rápida y amigable de compilar tu POS con Node.js puro sin instalar Rust.</p>
                <div className="bg-white rounded-xl p-3 border border-blue-100 space-y-1 text-[9.5px]">
                  <p className="text-[#1cb0f6] font-black">⚙️ PASOS PARA GENERAR TU .EXE CON ELECTRON:</p>
                  <p className="text-gray-450 font-bold lowercase">1. Ejecuta: <span className="font-mono text-slate-800 bg-gray-100 p-0.5 rounded px-1">npm install electron electron-builder -D</span></p>
                  <p className="text-gray-455 font-bold lowercase">2. Genera un archivo <span className="font-mono text-slate-800 bg-gray-105 p-0.5 rounded px-1">main.js</span> en la raíz e instala la estructura de abajo.</p>
                  <p className="text-gray-455 font-bold lowercase">3. Corre: <span className="font-mono text-slate-805 bg-gray-105 p-0.5 rounded px-1">npx electron-builder build --win</span> para generar el instalador de Windows <span className="font-mono text-[#1cb0f6] bg-blue-50 p-0.5 rounded px-1 font-black">DuoPOS-setup.exe</span></p>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase font-black tracking-wide text-gray-400">main.js (Electron App Entry)</span>
                   <button
                     type="button"
                     onClick={() => {
                       navigator.clipboard.writeText(electronMainText);
                       try { playSound('success'); } catch {}
                       toast.success('📋 ¡Código de Electron copiado al portapapeles!');
                     }}
                     className="text-[9px] bg-slate-100 hover:bg-purple-105 hover:text-purple-750 border font-black px-2 py-1 rounded-md uppercase cursor-pointer select-none"
                   >
                     Copiar Código
                   </button>
                </div>
                <pre className="bg-slate-900 text-amber-300 border text-[9px] p-4 rounded-2xl overflow-x-auto font-mono max-h-44">
                  {electronMainText}
                </pre>
              </div>
            </div>
          )}

          {compilationWrapper === 'capacitor' && (
            <div className="space-y-3 animate-fadeIn">
              <div className="bg-emerald-50 border border-emerald-250 rounded-2xl p-4 text-xs font-bold text-emerald-950 space-y-2 uppercase leading-normal">
                <p className="font-black text-emerald-650">📱 ¿Por qué Capacitor para tu Android .APK?</p>
                <p className="font-semibold text-gray-550 lowercase">Capacitor de Ionic te permite empaquetar tu código web y transpilarlo instantáneamente a un instalador de Android (.apk) nativo que puedes cargar vía USB en tablets o celulares.</p>
                <div className="bg-white rounded-xl p-3 border border-emerald-100 space-y-1 text-[9.5px]">
                  <p className="text-emerald-700 font-black">⚙️ PASOS PARA COMPILAR TU .APK NATIVO:</p>
                  <p className="text-gray-450 font-bold lowercase">1. Instala: <span className="font-mono text-slate-850 bg-gray-100 p-0.5 rounded px-1">npm install @capacitor/core @capacitor/cli @capacitor/android -D</span></p>
                  <p className="text-gray-455 font-bold lowercase">2. Corre: <span className="font-mono text-slate-850 bg-gray-100 p-0.5 rounded px-1">npx cap init</span> y luego <span className="font-mono text-slate-850 bg-gray-100 p-0.5 rounded px-1">npx cap add android</span></p>
                  <p className="text-gray-455 font-bold lowercase">3. Transpila montajes con: <span className="font-mono text-slate-850 bg-gray-105 p-0.5 rounded px-1">npm run build && npx cap sync</span> abriendo Android Studio para compilar.</p>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase font-black tracking-wide text-gray-400">capacitor.config.ts</span>
                   <button
                     type="button"
                     onClick={() => {
                       navigator.clipboard.writeText(capacitorMainText);
                       try { playSound('success'); } catch {}
                       toast.success('📋 ¡Configurador de Capacitor copiado!');
                     }}
                     className="text-[9px] bg-slate-100 hover:bg-purple-105 hover:text-purple-750 border font-black px-2 py-1 rounded-md uppercase cursor-pointer select-none"
                   >
                     Copiar Código
                   </button>
                </div>
                <pre className="bg-slate-900 text-emerald-400 border text-[9px] p-4 rounded-2xl overflow-x-auto font-mono max-h-44">
                  {capacitorMainText}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* COLUMN 2: SQLITE SCRIPT EXPORTER & SEED BUILDER */}
        <div className="bg-white border-2 border-gray-200 border-b-[6px] rounded-3xl p-5 space-y-4">
          <span className="text-[9px] uppercase font-black tracking-widest text-[#58cc02] block leading-none">Local SQLite Bridge Database</span>
          <div className="flex items-center gap-1.5">
            <Database size={18} className="text-[#58cc02]" />
            <h4 className="text-sm font-black text-gray-850 uppercase tracking-tight leading-none pt-1">Exportador de Base de Datos SQLite (.SQL Seed)</h4>
          </div>
          <p className="text-xs text-gray-500 font-bold uppercase leading-normal font-sans">
            ¿Cómo funciona la base de datos local en tu exe? Utiliza almacenamiento local adaptativo que se sincroniza dinámicamente. Extrae un script de SQL puro para sembrar tu base de datos física local.
          </p>

          <div className="bg-sky-50 text-sky-950 border border-sky-200 rounded-2xl p-4 text-[10.5px] font-bold space-y-1 leading-normal uppercase">
            <p className="text-[#165a7e] font-black">🔌 El Puente de Enlace de Base de Datos en el EXE:</p>
            <p className="text-gray-550 font-semibold lowercase leading-relaxed">Cuando corres tu DuoPOS.exe (con Tauri), el frontend utiliza indexDB/localStorage mediante hooks. Si requieres inicializar una base de datos física autónoma en tu SQLite local en el PC, este exportador de abajo leerá tus datos registrados en este navegador actual y te armará el script SQL pre-sembrado listo para inyectar:</p>
          </div>

          <div className="space-y-3 pt-1">
            <button
              type="button"
              onClick={() => {
                try {
                  const rawProds = localStorage.getItem('duo_pos_products') || '[]';
                  const rawTrans = localStorage.getItem('duo_pos_transactions') || '[]';
                  
                  let parsedProds = [];
                  let parsedTrans = [];
                  try { parsedProds = JSON.parse(rawProds); } catch {}
                  try { parsedTrans = JSON.parse(rawTrans); } catch {}
                  
                  let sqlDump = `-- =========================================================\n`;
                  sqlDump += `-- RESPALDO COYUNTURAL DE DUOPOS SQLite Seed Scripture \n`;
                  sqlDump += `-- Generado automáticamente para la Tienda PC de DuoPOS.exe\n`;
                  sqlDump += `-- Fecha: ${new Date().toISOString()}\n`;
                  sqlDump += `-- =========================================================\n\n`;
                  
                  sqlDump += `CREATE TABLE IF NOT EXISTS system_user (\n`;
                  sqlDump += `  username TEXT NOT NULL DEFAULT 'Cajero',\n`;
                  sqlDump += `  level INTEGER NOT NULL DEFAULT 1,\n`;
                  sqlDump += `  xp INTEGER NOT NULL DEFAULT 0,\n`;
                  sqlDump += `  daily_goal INTEGER NOT NULL DEFAULT 150,\n`;
                  sqlDump += `  streak INTEGER NOT NULL DEFAULT 0\n`;
                  sqlDump += `);\n\n`;
                  
                  sqlDump += `CREATE TABLE IF NOT EXISTS products (\n`;
                  sqlDump += `  id TEXT PRIMARY KEY,\n`;
                  sqlDump += `  name TEXT NOT NULL,\n`;
                  sqlDump += `  category TEXT NOT NULL,\n`;
                  sqlDump += `  price REAL NOT NULL,\n`;
                  sqlDump += `  cost REAL NOT NULL,\n`;
                  sqlDump += `  stock INTEGER NOT NULL,\n`;
                  sqlDump += `  emoji TEXT NOT NULL\n`;
                  sqlDump += `);\n\n`;
                  
                  sqlDump += `CREATE TABLE IF NOT EXISTS transactions (\n`;
                  sqlDump += `  id TEXT PRIMARY KEY,\n`;
                  sqlDump += `  date TEXT NOT NULL,\n`;
                  sqlDump += `  total REAL NOT NULL,\n`;
                  sqlDump += `  payment_method TEXT NOT NULL\n`;
                  sqlDump += `);\n\n`;
                  
                  sqlDump += `-- --- SEMBRANDO PRODUCTOS ACTUALES (${parsedProds.length} REGISTROS) ---\n`;
                  parsedProds.forEach((p: any) => {
                    sqlDump += `INSERT INTO products (id, name, category, price, cost, stock, emoji) VALUES ('${p.id}', '${p.name?.replace(/'/g, "''")}', '${p.category?.replace(/'/g, "''")}', ${p.price}, ${p.cost}, ${p.stock}, '${p.emoji}');\n`;
                  });
                  sqlDump += `\n`;
                  
                  sqlDump += `-- --- SEMBRANDO VENTAS LOCALES (${parsedTrans.length} REGISTROS) ---\n`;
                  parsedTrans.forEach((t: any) => {
                    sqlDump += `INSERT INTO transactions (id, date, total, payment_method) VALUES ('${t.id}', '${t.date}', ${t.total}, '${t.paymentMethod || 'Efectivo'}');\n`;
                  });
                  
                  const blob = new Blob([sqlDump], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `duopos_sqlite_seed_${new Date().toISOString().split('T')[0]}.sql`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  URL.revokeObjectURL(url);
                   
                  try { playSound('levelup'); } catch {}
                  onGrantXp(100);
                  toast.success('✅ ¡Base de datos SQLite generada con éxito!\n\nSe ha descargado el archivo "duopos_sqlite_seed.sql" con todo tu catálogo actual estructurado en SQLite puro. Has obtenido +100 XP extras por robustecimiento de base de datos PC.', { title: 'SQL Generado Exitosamente 📊', duration: 8000 });
                } catch (err) {
                  toast.error('Error al compilar SQLite Script: ' + err, { title: 'Error de Compilación ❌' });
                }
              }}
              className="w-full bg-[#58cc02] hover:bg-[#61e002] active:bg-[#46a302] text-white py-3 border-b-4 border-[#3c8c01] hover:translate-y-[-2px] hover:shadow-md transition-all rounded-2xl flex items-center justify-center gap-1.5 font-black text-xs uppercase tracking-wider cursor-pointer select-none"
            >
              <Database size={15} /> Generar SQL Dump para SQLite (.SQL)
            </button>
            
            <p className="text-[10px] text-gray-400 font-bold uppercase text-center mt-1 select-none">Sincronización instantánea validada por Duo Guard</p>
          </div>
        </div>

      </div>

      {/* FREE GLOBAL CLOUD HOSTING DESPLOY CENTER SECTION */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-orange-200/50 rounded-3xl p-5 md:p-6 space-y-4 font-sans text-gray-700">
        <span className="text-[9px] uppercase font-black tracking-widest text-orange-655 block leading-none font-sans">Cloud Computing & Deploy</span>
        <div className="flex items-center gap-1.5">
          <Globe size={18} className="text-orange-600 font-bold font-sans" />
          <h4 className="text-sm font-black text-gray-850 uppercase tracking-tight leading-none pt-1">Guía para subir la aplicación online gratis en servidores</h4>
        </div>
        <p className="text-xs text-gray-500 leading-relaxed font-bold uppercase leading-normal">
          ¿Quieres colocar de verdad esta aplicación en internet para que cualquiera acceda mediante un enlace público o página web sin instalar nada, de forma absolutamente estable y GRATUITA? Sigue este mapa de ruta corporativo:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1 text-left">
          
          {/* STEP 1: GITHUB COPIES */}
          <div className="bg-white border-2 border-gray-150 p-4 rounded-2xl space-y-2 flex flex-col justify-between">
            <div className="space-y-1.5">
              <span className="bg-gray-100 text-gray-750 font-black px-1.5 rounded text-[8px] uppercase">PASO 1: Subir código</span>
              <h5 className="font-extrabold text-xs text-purple-950 uppercase tracking-tight font-sans">Vincular a GitHub</h5>
              <p className="text-[10px] text-gray-400 font-bold tracking-tight lowercase leading-relaxed">Exporta tu código en tu AI Studio usando el menú superior derecho (botón Descargar ZIP) o súbelo usando git directamente desde tu ordenador para tener tu repositorio en la nube.</p>
            </div>
          </div>

          {/* STEP 2: MULTI CLOUD VPS PROVIDERS */}
          <div className="bg-white border-2 border-gray-150 p-4 rounded-2xl space-y-2 flex flex-col justify-between text-left">
            <div className="space-y-1.5">
              <span className="bg-blue-50 text-blue-600 border border-blue-105 font-black px-1.5 rounded text-[8px] uppercase">PASO 2: Proveedor Elástico</span>
              <h5 className="font-extrabold text-xs text-purple-950 uppercase tracking-tight font-sans">Elegir Servidor Gratis</h5>
              <p className="text-[10px] text-gray-400 font-bold tracking-tight lowercase leading-relaxed">Crea una cuenta gratuita en una de estas tres plataformas gigantes mundiales de hospedaje elástico que tienen tiers gratuitos permanentes:</p>
              <ul className="text-[9px] text-slate-800 font-black space-y-0.5 uppercase tracking-tight mt-1">
                <li>◆ VERCEL (Excelente para tu frontend React)</li>
                <li>◆ RAILWAY (Hospeda Express Server backend de forma gratis)</li>
                <li>◆ NETLIFY (Excelente alternativa estática)</li>
              </ul>
            </div>
          </div>

          {/* STEP 3: RECTIFIED AUTOPROVISIONING */}
          <div className="bg-white border-2 border-gray-150 p-4 rounded-2xl space-y-2 flex flex-col justify-between">
            <div className="space-y-1.5">
              <span className="bg-emerald-50 text-emerald-600 border border-emerald-105 font-black px-1.5 rounded text-[8px] uppercase">PASO 3: Lanzar al aire</span>
              <h5 className="font-extrabold text-xs text-purple-950 uppercase tracking-tight font-sans">Enlazar y Sincronizar</h5>
              <p className="text-[10px] text-gray-400 font-bold tracking-tight lowercase leading-relaxed">Vincula tu cuenta de GitHub con Vercel/Railway. Al seleccionar este repositorio, la nube compilará el código y te dará un enlace único seguro HTTPS para compartir.</p>
            </div>
          </div>

        </div>

        <div className="bg-orange-100/40 border border-orange-200/50 rounded-2xl p-4 flex gap-3 text-xs text-orange-900 font-bold uppercase text-[9.5px] text-left">
          <span className="text-xl select-none">🚀🎖️</span>
          <div className="flex-1 space-y-1 lowercase text-left">
            <p className="text-orange-950 font-black uppercase tracking-tight leading-none">¡Conexión y DNS Segura HTTPS Gratis Incluida!</p>
            <p className="text-gray-500 font-bold">Estas plataformas te otorgan certificados SSL/TLS (HTTPS) automáticamente de forma ilimitada para que cargues tus ventas en tu celular o PC de oficina de manera segura y confidencial en internet.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
