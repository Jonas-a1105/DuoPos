import React, { useState } from 'react';
import { useUserStore } from '../../stores/useUserStore';
import { validateLicenseKeyOnline, PLANS } from '../../utils/licensing';
import { playSound } from '../../utils/sounds';
import { toast } from '../FlashNotifications';

export default function LicenseBlockScreen() {
  const isClockTampered = useUserStore(state => state.isClockTampered);
  const isLicenseExpired = useUserStore(state => state.isLicenseExpired);
  const licenseDetails = useUserStore(state => state.licenseDetails);
  
  const setLicenseDetails = useUserStore(state => state.setLicenseDetails);
  const setIsLicenseExpired = useUserStore(state => state.setIsLicenseExpired);
  const setIsClockTampered = useUserStore(state => state.setIsClockTampered);

  const [blockKey, setBlockKey] = useState<string>('');
  const [blockCompany, setBlockCompany] = useState<string>('');
  const [blockError, setBlockError] = useState<string>('');
  const [blockLoading, setBlockLoading] = useState<boolean>(false);

  const handleBlockActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockKey.trim()) {
      setBlockError('¡Ingresa la clave de activación!');
      return;
    }
    setBlockError('');
    setBlockLoading(true);
    try {
      const seed = licenseDetails.offlineActivationSeed;
      const res = await validateLicenseKeyOnline(blockKey.trim(), seed, blockCompany.trim());
      if (res.valid) {
        const plan = PLANS[res.tier];
        const updated = {
          ...licenseDetails,
          tier: res.tier,
          activated: true,
          activationKey: blockKey.toUpperCase().trim(),
          expiresAt: res.expiresAt || 'Nunca',
          clientLimit: plan.clientLimit,
          salesLimit: plan.salesLimit,
          activatedAt: new Date().toISOString(),
          companyName: blockCompany.trim() || ''
        };
        setLicenseDetails(updated);
        localStorage.setItem('duo_pos_licensing_details', JSON.stringify(updated));
        
        setIsLicenseExpired(false);
        setIsClockTampered(false);
        setBlockKey('');
        setBlockCompany('');
        playSound('levelup');
        toast.success("¡Licencia activada con éxito! DuoPOS desbloqueado.");
      } else {
        setBlockError(res.error || 'La clave ingresada es inválida o expirada.');
        playSound('error');
      }
    } catch (err: any) {
      setBlockError('Error de red: ' + err.message);
      playSound('error');
    } finally {
      setBlockLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0e17] text-[#f7f9fb] flex flex-col items-center justify-center p-4 relative overflow-y-auto font-sans bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1f1a3a] via-[#0a0e17] to-[#0a0e17]">
      {/* Floating background decorative grids */}
      <div className="absolute top-10 left-10 text-6xl opacity-10 animate-pulse pointer-events-none">🦉</div>
      <div className="absolute bottom-10 right-10 text-6xl opacity-10 animate-bounce pointer-events-none">🔒</div>

      <div className="max-w-md w-full flex flex-col items-center space-y-6 relative z-10">
        
        {/* Logo Header */}
        <div className="flex items-center gap-3 transform hover:scale-102 transition-transform duration-200 cursor-pointer">
          <div className="bg-[#58cc02] p-4 rounded-3xl border-b-6 border-[#46a302] shadow-md flex items-center justify-center">
            <span className="text-4xl">🦉</span>
          </div>
          <div>
            <h1 className="text-3xl font-black text-[#58cc02] tracking-wider flex items-center gap-1">
              Duo<span className="text-white">POS</span>
            </h1>
            <p className="text-[10px] font-black tracking-widest text-[#afafaf] uppercase">Bloqueo de Seguridad</p>
          </div>
        </div>

        {/* Warning Card */}
        <div className="bg-[#121a2f]/80 border-2 border-slate-800 rounded-3xl p-6 md:p-8 w-full shadow-2xl backdrop-blur-md">
          
          {isClockTampered ? (
            // CLOCK TAMPERING CARD
            <div className="space-y-6 text-center">
              <div className="text-6xl animate-bounce">⚠️</div>
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-rose-500 tracking-tight uppercase">¡Reloj Alterado!</h2>
                <span className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[10px] font-black uppercase px-3 py-1 rounded-xl inline-block tracking-widest">
                  ALERTA DE SEGURIDAD
                </span>
              </div>
              
              <p className="text-slate-300 text-sm leading-relaxed font-semibold">
                DuoPOS ha detectado que la fecha de tu equipo es anterior al último registro del sistema. Por seguridad, el sistema se ha bloqueado preventivamente para evitar fraudes en la vigencia de tu licencia.
              </p>

              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-xs font-bold text-slate-400 text-left space-y-2 leading-relaxed">
                <p className="text-white font-black uppercase">¿Cómo solucionar esto?</p>
                <p>1. Ajusta la fecha y hora de tu sistema operativo a la hora oficial de hoy.</p>
                <p>2. Asegúrate de activar la sincronización automática de hora por Internet.</p>
                <p>3. Recarga o reinicia la aplicación DuoPOS.</p>
              </div>
              
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white font-black text-xs py-3 rounded-2xl border-b-4 border-slate-950 transition-all uppercase tracking-wider cursor-pointer"
              >
                Recargar Aplicación 🔄
              </button>
            </div>
          ) : (
            // EXPIRED LICENSE CARD
            <div className="space-y-5">
              <div className="text-center space-y-3">
                <div className="text-6xl filter drop-shadow-md select-none transform hover:rotate-12 duration-150">🦉🔒</div>
                <div className="space-y-1">
                  <h2 className="text-2xl font-black text-amber-500 uppercase tracking-tight leading-none">¡Licencia Vencida!</h2>
                  <span className="bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-lg inline-block tracking-wider">
                    Racha Comercial Pausada
                  </span>
                </div>
                <p className="text-xs text-slate-350 font-bold leading-relaxed max-w-xs mx-auto">
                  Tu licencia expiró el día <strong className="text-white">{licenseDetails.expiresAt}</strong>. Para continuar usándolo y salvar tus registros de venta, activa una nueva clave.
                </p>
              </div>

              {blockError && (
                <div className="bg-rose-500/10 border-2 border-rose-500/30 rounded-2xl p-3 text-rose-400 font-bold text-xs text-center animate-shake">
                  ⚠️ {blockError}
                </div>
              )}

              <form onSubmit={handleBlockActivate} className="space-y-4 pt-2 border-t border-slate-800/80">
                <div className="space-y-1">
                  <label className="text-[10px] font-black tracking-wide text-slate-400 uppercase">
                    Nombre de la Empresa / Cliente
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Abastos La Racha C.A."
                    value={blockCompany}
                    onChange={(e) => setBlockCompany(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-900/60 border-2 border-slate-800 rounded-2xl font-bold text-white outline-none focus:border-amber-500 transition-all text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black tracking-wide text-slate-400 uppercase">
                    Clave de Licencia Comercial
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="DUO-OFF-... o DUO-STD-..."
                    value={blockKey}
                    onChange={(e) => setBlockKey(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-900/60 border-2 border-slate-800 rounded-2xl font-mono font-bold text-amber-400 outline-none focus:border-amber-500 transition-all text-xs text-center tracking-wider text-upper"
                  />
                </div>

                <button
                  type="submit"
                  disabled={blockLoading}
                  className="w-full bg-[#58cc02] text-white border-b-[6px] border-[#46a302] hover:bg-[#61e002] active:border-b-0 active:translate-y-[6px] font-black text-sm py-3.5 rounded-2xl transition-all duration-100 uppercase tracking-wider cursor-pointer shadow-md mt-4 flex items-center justify-center gap-1.5"
                >
                  {blockLoading ? 'Validando Licencia...' : 'Reactivar DuoPOS 🔑'}
                </button>
              </form>

              <div className="bg-slate-900/40 border border-slate-800 p-3 rounded-2xl text-[10px] text-slate-400 font-bold leading-normal space-y-1">
                <p className="text-slate-300 font-black uppercase text-[9px] tracking-wider leading-none mb-1">Información de Soporte</p>
                <div>Seed de hardware para activación offline:</div>
                <div className="font-mono text-white text-[11px] select-all bg-slate-950/80 px-2 py-1 rounded border border-slate-800 text-center tracking-wider mt-1">
                  {licenseDetails.offlineActivationSeed}
                </div>
              </div>
            </div>
          )}
        </div>
        
        <p className="text-center text-[10px] text-slate-500 font-semibold leading-normal">
          DuoPOS y las licencias están protegidos por firmas criptográficas. Pide soporte a tu desarrollador principal si no tienes tu código.
        </p>
      </div>
    </div>
  );
}
