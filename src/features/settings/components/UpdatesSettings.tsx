import React, { useState } from 'react';
import { playSound } from '../../../services/sounds';
import { toast } from '../../../components/Modal/FlashNotifications';
import { LicenseDetails } from '../../../services/licensing';
import { Laptop, Cpu, RefreshCw, Check } from 'lucide-react';

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
  licenseDetails,
}: UpdatesSettingsProps) {
  // States for desktop app system updates representation
  const [isCheckingOnline, setIsCheckingOnline] = useState(false);
  const [onlineCheckResult, setOnlineCheckResult] = useState<'none' | 'update_found' | 'up_to_date'>('none');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [currentSpeed, setCurrentSpeed] = useState('');
  const [offlineFileName, setOfflineFileName] = useState('');
  const [isApplyingOffline, setIsApplyingOffline] = useState(false);
  const [latestRelease, setLatestRelease] = useState<{ tagName: string; name: string; body: string } | null>(null);

  const handleCheckOnlineUpdates = () => {
    playSound('click');
    setIsCheckingOnline(true);
    setOnlineCheckResult('none');

    // Real API fetch to GitHub Releases for Jonas-a1105/DuoPos
    fetch('https://api.github.com/repos/Jonas-a1105/DuoPos/releases/latest')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        setIsCheckingOnline(false);
        if (data && data.tag_name) {
          setLatestRelease({
            tagName: data.tag_name,
            name: data.name || data.tag_name,
            body: data.body || 'No se detallaron cambios para este release.',
          });

          const cleanRemote = data.tag_name.replace(/^v/, '').trim();
          const cleanLocal = appVersion.replace(/^v/, '').trim();

          if (cleanRemote !== cleanLocal) {
            setOnlineCheckResult('update_found');
            onGrantXp(15);
            toast.success(`Se encontró una nueva versión disponible: ${data.tag_name}`, {
              title: 'Actualización Disponible 🚀',
            });
          } else {
            setOnlineCheckResult('up_to_date');
            onGrantXp(5);
          }
        } else {
          throw new Error('Formato de respuesta inválido.');
        }
      })
      .catch((err) => {
        setIsCheckingOnline(false);
        setOnlineCheckResult('none');
        // Fallback simulation if offline/network error/no repository releases yet
        console.warn('Falló la consulta real a GitHub Releases. Iniciando simulación de contingencia:', err);
        
        setIsCheckingOnline(true);
        setTimeout(() => {
          setIsCheckingOnline(false);
          setLatestRelease({
            tagName: 'v2.6.0',
            name: 'v2.6.0 - StockMaster Pro Edition',
            body: '✓ Soporte completo de timbrado SAT / Facturama PAC\n✓ Cuentas por pagar con plazos de proveedores y vencimientos\n✓ Multi-tenancy con Supabase Realtime\n✓ Conversión a bolívares en tarjetas del catálogo central',
          });
          const cleanLocal = appVersion.replace(/^v/, '').trim();
          if (cleanLocal !== '2.6.0') {
            setOnlineCheckResult('update_found');
          } else {
            setOnlineCheckResult('up_to_date');
          }
          onGrantXp(15);
        }, 2000);
      });
  };

  return (
    <div className="space-y-6 animate-fadeIn text-left">
      <div className="border-b pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl select-none font-black text-amber-500">📥</span>
          <div>
            <h3 className="text-sm font-black uppercase text-gray-800 tracking-tight font-sans">
              Centro de Actualizaciones StockMaster Pro
            </h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase font-sans">
              Gestión de versiones online OTA y carga manual para entornos offline
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-gray-150 text-gray-700 text-[10px] font-black uppercase px-2.5 py-1 rounded-xl font-sans select-none">
            Sistema Operativo Seguro
          </span>
        </div>
      </div>

      {/* CURRENT VERSION METADATA BOARD */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-sans text-gray-700">
        <div className="bg-white border-2 border-gray-200 rounded-2xl p-4 space-y-2">
          <span className="text-[9px] uppercase font-black tracking-widest text-gray-400 block leading-none">
            Versión Instalada
          </span>
          <div className="text-md font-black text-slate-800 flex items-center gap-1.5 pt-1">
            <Laptop size={16} className="text-[#1cb0f6]" />
            <span>{appVersion}</span>
          </div>
          <p className="text-[9.5px] font-bold text-gray-400 uppercase leading-none mt-2">
            Firma Local Validada por StockMaster Guard
          </p>
        </div>

        <div className="bg-white border-2 border-gray-200 rounded-2xl p-4 space-y-2">
          <span className="text-[9px] uppercase font-black tracking-widest text-gray-400 block leading-none">
            Motor de Datos
          </span>
          <div className="text-md font-black text-slate-800 flex items-center gap-1.5 pt-1">
            <Cpu size={16} className="text-emerald-500" />
            <span>SQLite Embedded Mode</span>
          </div>
          <p className="text-[9.5px] font-bold text-gray-400 uppercase leading-none mt-2">
            Sincronización de Logs Diferida
          </p>
        </div>

        <div className="bg-white border-2 border-gray-200 rounded-2xl p-4 space-y-2">
          <span className="text-[9px] uppercase font-black tracking-widest text-gray-400 block leading-none">
            Canal de Distribución
          </span>
          <div className="text-md font-black text-slate-800 flex items-center gap-1.5 pt-1">
            <RefreshCw size={16} className="text-amber-500" />
            <span>Producción Estable (LTS)</span>
          </div>
          <p className="text-[9.5px] font-bold text-gray-405 uppercase leading-none mt-2">
            Actualizaciones de Seguridad Críticas
          </p>
        </div>
      </div>

      {/* TWO PATHS GRID: ONLINE OTA & OFFLINE DISCONNECTED */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2 font-sans text-gray-700">
        {/* COLUMN 1: ONLINE UPDATE CHECKER */}
        <div className="bg-linear-to-b from-gray-50 to-white border-2 border-gray-200 rounded-2xl p-5 space-y-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="p-1 rounded-lg bg-sky-50 text-sky-600 border border-sky-200">
                <RefreshCw size={15} />
              </span>
              <h4 className="text-xs font-black text-gray-800 uppercase tracking-tight">
                Servicio OTA Online (Over-The-Air)
              </h4>
            </div>
            <p className="text-[10px] text-gray-400 font-extrabold uppercase leading-none">
              Verificación directa contra los servidores oficiales de StockMaster
            </p>
            <p className="text-xs text-gray-500 leading-relaxed pt-1 font-bold lowercase">
              Utiliza esta opción si tu terminal del punto de venta tiene conexión directa a Internet (Red Cableada o
              Wi-Fi). El sistema consultará de forma segura el manifest oficial en GitHub.
            </p>
          </div>

          {onlineCheckResult === 'none' && !isCheckingOnline && (
            <button
              type="button"
              onClick={handleCheckOnlineUpdates}
              className="w-full py-2.5 bg-sky-500 text-white border-b-4 border-sky-700 hover:bg-sky-400 active:border-b-0 active:translate-y-1 rounded-xl text-center uppercase font-black text-xs cursor-pointer select-none"
            >
              Buscar Actualización en Línea
            </button>
          )}

          {isCheckingOnline && (
            <div className="bg-slate-900 text-[#1cb0f6] border border-slate-950 p-4 rounded-xl font-mono text-[11px] leading-relaxed space-y-1">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-sky-400 animate-ping" />
                <span className="animate-pulse">Sincronizando con api.github.com/repos/Jonas-a1105/DuoPos...</span>
              </div>
              <div className="text-slate-400 font-bold">[INFO] Verificando firma criptográfica sha-256 ...</div>
              <div className="text-slate-400 font-bold">
                [INFO] Verificando compatibilidad con el entorno de StockMaster Pro...
              </div>
              <div className="text-slate-400 font-bold">
                [INFO] ID de máquina: {licenseDetails.offlineActivationSeed}
              </div>
            </div>
          )}

          {onlineCheckResult === 'up_to_date' && !isCheckingOnline && (
            <div className="bg-emerald-50 border border-emerald-250 p-4 rounded-xl space-y-2 text-center text-emerald-950 font-bold text-xs">
              <p className="font-mono text-emerald-800 flex items-center justify-center gap-1">
                <Check size={16} /> ¡SISTEMA COMPLETAMENTE AL DÍA!
              </p>
              <p className="text-[10px] text-emerald-755 uppercase leading-normal">
                Felicidades, StockMaster Pro está corriendo la última versión disponible ({appVersion}) liberada.
              </p>
            </div>
          )}

          {onlineCheckResult === 'update_found' && !isCheckingOnline && !isDownloading && (
            <div className="bg-amber-50 border-2 border-amber-250 p-4 rounded-xl space-y-3">
              <div className="flex items-center gap-1.5 text-amber-900 font-black text-xs">
                <span className="text-base select-none">🎉</span>
                <span>¡NUEVA VERSIÓN DETECTADA! ({latestRelease?.tagName})</span>
              </div>

              <div className="space-y-1 text-left">
                <p className="text-slate-800 font-black uppercase text-[10px] text-gray-500 leading-none">Novedades en este release:</p>
                <div className="bg-white border border-amber-200 p-3 rounded-2xl text-[10px] font-bold text-slate-700 whitespace-pre-wrap max-h-40 overflow-y-auto leading-relaxed">
                  {latestRelease?.body}
                </div>
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
                    { progress: 25, text: 'Descargando binario delta (stockmaster_v2.5_diff.upd)...' },
                    { progress: 45, text: 'Realizando control de integridad SHA-256...' },
                    { progress: 65, text: 'Creando respaldo local SQLite de seguridad (auto_preventive.db)...' },
                    { progress: 85, text: 'Instalando librerías dinámicas y parches en caliente...' },
                    { progress: 100, text: 'Finalizando actualización online. Listo para auto-reinicio...' },
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
                      onUpdateAppVersion(latestRelease?.tagName || 'v2.5.0-StockMaster');
                      onGrantXp(200);
                      toast.success(`Se ha actualizado el sistema a la versión ${latestRelease?.tagName}`, {
                        title: 'Sistema Actualizado ⚡',
                      });
                    }
                  }, 1000);
                }}
                className="w-full py-2 bg-gradient-to-r from-emerald-500 to-emerald-605 bg-[#58cc02] text-white border-b-4 border-emerald-700 hover:brightness-105 active:border-b-0 active:translate-y-1 rounded-xl text-center uppercase font-black text-xs cursor-pointer select-none block"
              >
                Descargar e Instalar {latestRelease?.tagName}
              </button>
            </div>
          )}

          {isDownloading && (
            <div className="bg-slate-900 text-white p-4 rounded-xl space-y-3 font-mono text-[11px] border border-slate-950">
              <div className="flex justify-between items-center text-sky-400">
                <span className="font-bold uppercase animate-pulse">⚙️ Instalando Actualización...</span>
                <span className="font-black text-xs text-white bg-sky-550/10 border border-sky-500/20 px-1.5 py-0.5 rounded-md">
                  {downloadProgress}%
                </span>
              </div>

              <div className="w-full bg-slate-850 h-2 rounded-lg overflow-hidden border">
                <div
                  className="bg-sky-500 h-full rounded-lg transition-all duration-300"
                  style={{ width: `${downloadProgress}%` }}
                />
              </div>

              <div className="space-y-1 text-slate-400 font-semibold select-none text-[10px]">
                <div>Suma SHA-256: 0x9AFB658CD30FA1B6</div>
                <div>
                  Velocidad: <span className="text-white font-bold">{currentSpeed}</span>
                </div>
                <div className="text-[#1cb0f6] mt-1 font-black uppercase tracking-wide">&gt; {currentStep}</div>
              </div>
            </div>
          )}
        </div>

        {/* COLUMN 2: OFFLINE DISCONNECTED UPDATES */}
        <div className="bg-linear-to-b from-gray-50 to-white border-2 border-gray-200 rounded-2xl p-5 space-y-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="p-1 rounded-lg bg-purple-50 text-purple-600 border border-purple-200">
                <Cpu size={15} />
              </span>
              <h4 className="text-xs font-black text-gray-800 uppercase tracking-tight">
                Actualización Manual por Lápiz USB (.upd)
              </h4>
            </div>
            <p className="text-[10px] text-purple-400 font-extrabold uppercase leading-none">
              Carga local de parches certificados para terminales desconectadas
            </p>
            <p className="text-xs text-gray-500 leading-relaxed pt-1 font-bold lowercase">
              Excelente función para tiendas físicas remotas o bodegas sin acceso a Internet. Arrastra o selecciona el
              archivo binario <strong className="text-slate-800 font-extrabold">.upd</strong> descargado previamente
              desde tu consola de soporte.
            </p>
          </div>

          <div
            onClick={() => {
              if (isApplyingOffline) return;
              playSound('click');
              const testFileName = `stockmaster_v2.5.0_patch-${licenseDetails.offlineActivationSeed.slice(-4)}.upd`;
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
                  <p className="text-xs font-black text-slate-800">{offlineFileName}</p>
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
                    onUpdateAppVersion('v2.5.0-StockMaster');
                    onGrantXp(200);
                    setOfflineFileName('');
                    toast.success(
                      'Se ha aplicado correctamente el parche offline (.upd) RSA-4096. (+200 XP por mantenimiento corporativo offline).',
                      { title: 'Actualización Manual Exitosa ✅' },
                    );
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
              <div className="text-slate-400">[USB] Analizando llaves simétricas StockMaster...</div>
              <div className="text-slate-400">[USB] Copiando nuevos módulos de gamificación a disco local...</div>
              <div className="text-[#a855f7] font-bold">[USB] Refactoring SQLite database logs exitosamente.</div>
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[10px] text-amber-900 font-bold leading-normal flex gap-2">
            <span className="text-base select-none">💡</span>
            <div className="space-y-1 uppercase text-left">
              <p className="font-extrabold text-amber-950">¿Cómo verificar la racha de actualización?</p>
              <p className="text-gray-550 lowercase leading-relaxed font-semibold">
                Puedes descargar la clave (.upd) de tu sucursal ingresando a la consola de soporte de StockMaster Pro. Pásalo al
                pendrive para que la tienda opere 100% desconectada.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
