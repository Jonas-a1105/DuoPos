import React, { useState, useEffect } from 'react';
import { User } from '../../../types';
import { playSound } from '../../../services/sounds';
import { toast } from '../../../components/Modal/FlashNotifications';
import { 
  LicenseDetails, PLANS, SubscriptionTier, revokeLicenseOnline, listLicensesOnline 
} from '../../../services/licensing';
import { 
  ShieldCheck, Laptop, Cpu, Key, RefreshCw 
} from 'lucide-react';

interface LicenseSettingsProps {
  licenseDetails: LicenseDetails;
  onActivateLicenseKey: (key: string, companyName?: string) => Promise<{ success: boolean; message: string }>;
  onResetLicenseToFree: () => void;
  onGrantXp: (amount: number) => void;
  user: User | null;
  companyName: string;
}

export default function LicenseSettings({
  licenseDetails,
  onActivateLicenseKey,
  onResetLicenseToFree,
  onGrantXp,
  user,
  companyName
}: LicenseSettingsProps) {
  const [licenses, setLicenses] = useState<any[]>([]);
  const [loadingLicenses, setLoadingLicenses] = useState(false);
  const [isValidatingLicense, setIsValidatingLicense] = useState(false);

  const fetchLicenses = async () => {
    if (user?.role !== 'admin') return;
    setLoadingLicenses(true);
    const res = await listLicensesOnline();
    if (res.success && res.data) {
      setLicenses(res.data);
    }
    setLoadingLicenses(false);
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchLicenses();
    }
  }, [user?.role]);

  return (
    <div className="space-y-6 animate-fadeIn text-left">
      <div className="border-b pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl select-none font-black text-amber-500">🔑</span>
          <div>
            <h3 className="text-sm font-black uppercase text-gray-800 tracking-tight font-sans">Gestión de Suscripciones y Licencias Offline (.exe)</h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase">Control de cuotas de almacén y firmas criptográficas del sistema</p>
          </div>
        </div>
        {licenseDetails.activated ? (
          <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-black uppercase px-2.5 py-1 rounded-xl flex items-center gap-1">
            <span className="h-2 w-2 bg-emerald-500 rounded-full animate-ping" />
            LICENCIA ACTIVA
          </span>
        ) : (
          <span className="bg-amber-50 text-amber-800 border border-amber-300 text-[10px] font-black uppercase px-2.5 py-1 rounded-xl">
            MODO DEMO / TRIAL
          </span>
        )}
      </div>

      {/* CURRENT LICENSE DIAGNOSTIC STATUS BOARD */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans text-gray-700">
        {/* STATUS SUMMARY */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-slate-950 text-white rounded-2xl p-5 space-y-4 relative overflow-hidden text-left">
          <div className="absolute right-2 -bottom-2 text-7xl select-none opacity-10 font-mono">💻</div>
          <span className="text-[9px] uppercase font-black tracking-widest text-[#58cc02] bg-[#58cc02]/10 border border-[#58cc02]/30 px-2 py-0.5 rounded-lg">
            Suscripción Actual
          </span>
          <div>
            <div className="flex items-center gap-2 text-2xl font-black text-white">
              <span className="text-3xl">{PLANS[licenseDetails.tier]?.emoji || '🦉'}</span>
              <span>{PLANS[licenseDetails.tier]?.name || 'Invitado'}</span>
            </div>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed font-bold lowercase">
              {PLANS[licenseDetails.tier]?.description}
            </p>
          </div>

          <div className="border-t border-slate-700/60 pt-3 flex items-center justify-between gap-2 text-xs">
            <div>
              <span className="text-[9px] uppercase text-slate-400 block font-semibold">Tipo de Entorno</span>
              <span className="font-extrabold text-[#1cb0f6] flex items-center gap-1 leading-none">
                <Laptop size={12} />
                Aplicación de Escritorio Offline (.exe)
              </span>
            </div>
            <div className="text-right">
              <span className="text-[9px] uppercase text-slate-400 block font-semibold">Expiración</span>
              <span className="font-extrabold text-amber-400">
                {licenseDetails.expiresAt === 'Nunca' ? 'Racha Permanente ♾️' : licenseDetails.expiresAt}
              </span>
            </div>
          </div>
        </div>

        {/* LIMITS SANDBOX METER */}
        <div className="bg-white border-2 border-gray-250 rounded-2xl p-4 flex flex-col justify-between space-y-3.5 text-left">
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block">
            Cuotas y Restricciones del Plan Actual
          </span>

          {/* Customer limit bar */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs font-bold font-mono">
              <span className="text-gray-500">Límite Clientes Lealtad:</span>
              <span className="text-gray-800">
                {licenseDetails.clientLimit === 99999 ? 'Ilimitados ♾️' : `${licenseDetails.clientLimit} máx`}
              </span>
            </div>
            <div className="w-full bg-gray-100 h-2.5 rounded-xl overflow-hidden border">
              <div 
                className="bg-sky-500 h-full rounded-xl transition-all duration-500"
                style={{ 
                  width: `${licenseDetails.clientLimit === 99999 ? 100 : Math.min(100, (5 / licenseDetails.clientLimit) * 100)}%` 
                }}
              />
            </div>
            <span className="text-[9px] text-gray-400 font-extrabold block uppercase leading-none">
              (Simulación: Clientes estables promedio en base del DuoPOS)
            </span>
          </div>

          {/* Sales tracking bar */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs font-bold font-mono">
              <span className="text-gray-500">Volumen Ventas Guardadas:</span>
              <span className="text-gray-800">
                {licenseDetails.salesLimit === 99999 ? 'Ilimitadas ♾️' : `${licenseDetails.currentSalesCount} / ${licenseDetails.salesLimit}`}
              </span>
            </div>
            <div className="w-full bg-gray-100 h-2.5 rounded-xl overflow-hidden border">
              <div 
                className="bg-emerald-500 h-full rounded-xl transition-all duration-500"
                style={{ 
                  width: `${licenseDetails.salesLimit === 99999 ? 100 : Math.min(100, (licenseDetails.currentSalesCount / licenseDetails.salesLimit) * 100)}%` 
                }}
              />
            </div>
            <span className="text-[9px] text-gray-400 font-extrabold block uppercase leading-none">
              (Para desbloquear historial infinito se requiere Plan Profesional)
            </span>
          </div>
        </div>
      </div>

      {/* OFFLINE ACTIVATION FORM (FOR INSTALLABLE EXE ENVIRONMENT) */}
      <div className="bg-slate-50 border-2 border-gray-200 rounded-2xl p-5 space-y-4">
        <div className="flex items-start gap-3 text-left">
          <div className="bg-amber-100 text-amber-800 p-2.5 rounded-xl border border-amber-200 shrink-0">
            <Cpu size={18} />
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-black text-gray-800 uppercase">Firma Digital e Identificador de Hardware</h4>
            <p className="text-[10px] text-gray-400 font-extrabold leading-normal uppercase">
              Seguridad matemática para compilaciones de escritorio sin conexión a Internet
            </p>
            <p className="text-xs text-gray-600 leading-relaxed font-bold lowercase">
              El instalable <strong className="text-slate-800 font-extrabold">DuoPOS.exe</strong> está diseñado para operar en zonas de baja cobertura o directamente en terminales independientes de cobro. Las licencias se firman digitalmente usando un algoritmo simétrico basado en tu Fingerprint de Hardware único:
            </p>
          </div>
        </div>

        {/* Fingerprint key code card */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white border-2 border-gray-250 p-3.5 rounded-xl">
          <div className="space-y-1 text-left">
            <span className="text-[9px] uppercase font-black text-gray-400 block leading-none">
              Huella del Sistema (Hardware Fingerprint Seed)
            </span>
            <span className="font-mono text-xs font-black text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border tracking-wider select-all inline-block mt-1">
              {licenseDetails.offlineActivationSeed}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] text-gray-450 font-bold uppercase italic mr-1">
              (Criptografía offline activa de DuoPOS)
            </span>
          </div>
        </div>

        {/* Key activation interactive form inputs */}
        <div className="pt-2 border-t border-dashed">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div className="md:col-span-2 space-y-1 text-left">
              <label className="text-[10px] uppercase font-black text-slate-500 tracking-wider block">
                Ingresa la Llave de Activación Online (Licencia)
              </label>
              <input
                id="activation-key-input"
                type="text"
                placeholder="DUO-[TIER]-[CODE1]-[CODE2]-[CODE3]"
                className="w-full font-mono text-xs font-black px-4 py-2.5 bg-white border-2 border-gray-300 rounded-xl uppercase outline-none focus:border-amber-500 focus:ring-0 tracking-widest text-[#155375]"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={isValidatingLicense}
                onClick={async () => {
                  const val = (document.getElementById('activation-key-input') as HTMLInputElement)?.value;
                  if (!val) {
                    playSound('error');
                    alert('Por favor ingresa un código.');
                    return;
                  }
                  setIsValidatingLicense(true);
                  try {
                    const res = await onActivateLicenseKey(val, companyName);
                    if (res.success) {
                      onGrantXp(200);
                    } else {
                      playSound('error');
                    }
                    alert(res.message);
                  } catch (err: any) {
                    playSound('error');
                    alert(`Error de activación: ${err.message || err}`);
                  } finally {
                    setIsValidatingLicense(false);
                  }
                }}
                className="flex-1 py-2.5 bg-amber-500 text-white border-b-4 border-amber-700 hover:bg-amber-400 active:border-b-0 active:translate-y-1 rounded-xl text-center uppercase font-black text-xs cursor-pointer select-none disabled:opacity-50"
              >
                {isValidatingLicense ? 'Validando...' : 'Validar y Activar'}
              </button>

              {licenseDetails.activated && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('¿Estás seguro de que deseas desactivar la licencia actual y volver al Plan Gratuito?')) {
                      onResetLicenseToFree();
                      if ((document.getElementById('activation-key-input') as HTMLInputElement)) {
                        (document.getElementById('activation-key-input') as HTMLInputElement).value = '';
                      }
                    }
                  }}
                  title="Restablecer a Plan Gratuito"
                  className="px-3 bg-red-50 text-red-500 border-2 border-red-200 hover:bg-red-100 active:bg-red-200 rounded-xl font-black text-xs cursor-pointer select-none"
                >
                  ❌ Desactivar
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ADMIN LICENSING PANEL (ONLY FOR ADMINS) */}
        {user?.role === 'admin' && (
          <div className="bg-indigo-50/50 border-2 border-indigo-200 rounded-2xl p-4 space-y-4 mt-2">
            <div className="flex items-center justify-between border-b border-indigo-250 pb-2">
              <div className="flex items-center gap-1.5 text-left">
                <Key size={16} className="text-indigo-650 animate-pulse" />
                <span className="text-xs font-black text-indigo-950 uppercase tracking-wide">
                  🔑 Control de Licencias SaaS (Solo Admin)
                </span>
              </div>
              <button
                type="button"
                onClick={fetchLicenses}
                disabled={loadingLicenses}
                className="flex items-center gap-1 text-[9px] font-black uppercase text-indigo-700 bg-indigo-100 hover:bg-indigo-200 px-2.5 py-1 rounded-lg transition-all cursor-pointer disabled:opacity-50 select-none"
              >
                <RefreshCw size={10} className={loadingLicenses ? 'animate-spin' : ''} />
                Actualizar
              </button>
            </div>

            <div className="bg-slate-900 border border-slate-950 p-3.5 rounded-xl text-[10.5px] leading-relaxed text-slate-300 font-bold lowercase text-left">
              <div className="flex items-center gap-1.5 text-indigo-400 font-black mb-1 uppercase tracking-wide">
                <span>🛡️ Aislamiento de Seguridad Activo</span>
              </div>
              Por motivos de seguridad y para evitar la decompilación de algoritmos críticos, la generación de nuevas licencias **está totalmente aislada del software de producción**. Para emitir activaciones (online u offline), debes utilizar la herramienta privada local <strong>DuoPOS Core Generator</strong> en tu equipo de desarrollo.
            </div>

            <div className="space-y-2 text-left">
              <span className="text-[9px] uppercase font-black text-indigo-800 tracking-wider block">
                Llaves en Base de Datos ({licenses.length})
              </span>
              
              {loadingLicenses ? (
                <div className="text-center py-4 text-xs text-indigo-600 font-bold uppercase tracking-wider animate-pulse">
                  Cargando...
                </div>
              ) : licenses.length === 0 ? (
                <div className="text-center py-4 text-xs text-gray-400 font-medium bg-white border border-dashed rounded-xl">
                  No hay llaves registradas.
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto border rounded-xl bg-white divide-y">
                  {licenses.map((lic) => (
                    <div key={lic.id} className="p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50 transition-all text-[11px] text-left">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border select-all">
                            {lic.license_key}
                          </span>
                          <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md ${
                            lic.tier === 'pro' 
                              ? 'bg-violet-100 text-violet-800' 
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {lic.tier}
                          </span>
                          <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md ${
                            lic.status === 'available'
                              ? 'bg-green-100 text-green-800'
                              : lic.status === 'activated'
                              ? 'bg-sky-100 text-sky-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {lic.status === 'available' ? 'disponible' : lic.status === 'activated' ? 'activa' : 'revocada'}
                          </span>
                        </div>
                        {lic.notes && (
                          <div className="text-[10px] text-gray-500 font-semibold">
                            Notas: {lic.notes}
                          </div>
                        )}
                        {lic.status === 'activated' && (
                          <div className="text-[9px] text-slate-500 font-bold uppercase leading-none mt-1">
                            Activo en: <span className="font-mono text-gray-700">{lic.activated_by}</span> {lic.company_name ? `(${lic.company_name})` : ''}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(lic.license_key);
                            toast.success('Clave copiada.');
                          }}
                          className="px-2 py-1 border border-indigo-200 text-indigo-700 hover:bg-indigo-50 rounded-md font-black text-[9px] uppercase cursor-pointer select-none"
                        >
                          Copiar
                        </button>
                        {lic.status !== 'revoked' && (
                          <button
                            type="button"
                            onClick={async () => {
                              if (confirm(`¿Estás seguro de que deseas revocar la licencia ${lic.license_key}?`)) {
                                const res = await revokeLicenseOnline(lic.license_key);
                                if (res.success) {
                                  fetchLicenses();
                                  toast.success('Licencia revocada.');
                                } else {
                                  alert(`Error: ${res.error}`);
                                }
                              }
                            }}
                            className="px-2 py-1 bg-red-50 text-red-650 hover:bg-red-100 border border-red-200 rounded-md font-black text-[9px] uppercase cursor-pointer select-none"
                          >
                            Revocar
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* DETAILED COMPARATIVE PLANS GRID */}
      <div className="space-y-3 pt-2 text-left">
        <span className="text-[10px] uppercase font-black text-gray-500 tracking-wider block">
          Tabla Comparativa de Planes de Pago (SaaS DuoPOS)
        </span>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {(Object.keys(PLANS) as SubscriptionTier[]).map((key) => {
            const plan = PLANS[key];
            const isCurrent = licenseDetails.tier === key;
            return (
              <div 
                key={key} 
                className={`border-2 rounded-2xl flex flex-col justify-between p-4 relative overflow-hidden transition-all bg-linear-to-b ${
                  isCurrent 
                    ? 'border-amber-500 bg-amber-50/10 shadow-xs' 
                    : 'border-gray-250 bg-white hover:border-gray-300'
                }`}
              >
                {isCurrent && (
                  <div className="absolute right-0 top-0 bg-amber-500 text-white text-[8px] font-black uppercase px-2.5 py-0.5 rounded-bl-lg">
                    ACTIVO
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-2xl select-none">{plan.emoji}</span>
                    <span className="text-xs font-black uppercase text-gray-800 leading-tight block">
                      {plan.id === 'free' ? 'Gratuito' : plan.id === 'standard' ? 'Standard' : 'Pro'}
                    </span>
                  </div>

                  <div className="border-b pb-2">
                    <div className="font-mono font-black text-gray-900 text-lg">
                      {plan.priceUSD === 0 ? 'Gratis' : `$${plan.priceUSD.toFixed(2)}`}
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-normal">/mes</span>
                    </div>
                    <div className="text-[10px] font-bold text-gray-400 font-mono">
                      O aprox. {plan.priceVEF > 0 ? `${plan.priceVEF.toLocaleString()} Bs.` : '0 Bs.'}
                    </div>
                  </div>

                  <ul className="space-y-1.5 pt-1 text-[10px] text-gray-500 font-bold">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-1 leading-normal">
                        <span className="text-emerald-500 font-extrabold text-[12px] shrink-0 leading-none">✓</span>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-4 mt-4 border-t border-dashed">
                  {isCurrent ? (
                    <div className="w-full py-1.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl font-black text-[9px] uppercase tracking-wider text-center block select-none">
                      ★ Plan en Uso
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        alert(`Para actualizar tu negocio al plan ${plan.name}, por favor adquiere una llave de licencia válida con tu administrador y regístrala en el formulario de arriba.`);
                        const inputEl = document.getElementById('activation-key-input');
                        if (inputEl) {
                          inputEl.scrollIntoView({ behavior: 'smooth' });
                          inputEl.focus();
                        }
                      }}
                      className="w-full py-1.5 bg-indigo-50 border border-indigo-250 hover:bg-indigo-100 text-indigo-700 rounded-xl font-black text-[9px] uppercase text-center block transition-all cursor-pointer select-none"
                    >
                      Mejorar a este nivel
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
