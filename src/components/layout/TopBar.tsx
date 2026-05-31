import React from 'react';
import { useUserStore } from '../../stores/useUserStore';
import { useSalesStore } from '../../features/sales/store/useSalesStore';
import { useExchangeRates } from '../../hooks/useExchangeRates';
import { isSupabaseConfigured } from '../../config/supabaseClient';
import { playSound } from '../../services/audio/soundService';
import { addAuditLog } from '../../services/security/auditLogger';
import { toast } from '../../shared/ui';
import { Flame, Volume2, VolumeX, Cloud, Cpu, LogOut } from 'lucide-react';
import { useSession } from '../../hooks/useSession';

interface TopBarProps {
  isMuted: boolean;
  toggleMute: () => void;
  onOpenHardwareHub: () => void;
  onSync: (showToast?: boolean) => Promise<void>;
  isSyncing: boolean;
  lastSyncTime: string | null;
}

export default function TopBar({ isMuted, toggleMute, onOpenHardwareHub, onSync, isSyncing, lastSyncTime }: TopBarProps) {
  const user = useUserStore((s) => s.user);
  const { logoutUser } = useSession();
  const exchangeRates = useSalesStore((s) => s.exchangeRates);
  const activeRateType = useSalesStore((s) => s.activeRateType);
  const setActiveRateType = useSalesStore((s) => s.setActiveRateType);
  const setActiveBranchId = useSalesStore((s) => s.setActiveBranchId);
  const setActiveRegisterId = useSalesStore((s) => s.setActiveRegisterId);
  const licenseDetails = useUserStore((s) => s.licenseDetails);
  const setUser = useUserStore((s) => s.setUser);

  const { data: exchangeRatesQuery, isFetching: isRefreshingRates, refetch: refetchRates } = useExchangeRates();

  const handleToggleRateType = (type: 'oficial' | 'paralelo') => {
    if (licenseDetails.tier === 'free' && type === 'paralelo') {
      playSound('error');
      toast.error('El soporte para tasas de dólar paralelo (Monitor) requiere el Plan Standard o Pro. Actualiza tu plan en Ajustes > Planes.', { title: 'Plan Standard o Pro Requerido 🔒' });
      return;
    }
    setActiveRateType(type);
    localStorage.setItem('duo_pos_active_rate_type', type);
    playSound('click');
    toast.info(`Precios convertidos usando tasas de tipo: ${type === 'oficial' ? 'BCV Oficial' : 'Paralelo (Monitor)'}`, { title: 'Tasa Alternada 🔄' });
    addAuditLog('tasas', 'ajuste', `Tasa cambiaria VES activa de conversión cambiada a: ${type === 'oficial' ? 'BCV Oficial' : 'Paralelo (Monitor)'} (${type === 'oficial' ? exchangeRates.oficial.toFixed(2) : exchangeRates.paralelo.toFixed(2)} Bs.)`);
  };

  if (!user) return null;

  return (
    <div className="bg-white border-2 border-[#e5e5e5] border-b-4 rounded-2xl p-2.5 sm:p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 md:mb-6 mt-1 md:mt-0 shadow-xs">
      <div className="flex items-center justify-between w-full md:w-auto gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-red-500 fill-red-500 font-extrabold flex items-center gap-1 bg-red-50 border border-red-100 px-2 py-1 rounded-xl text-xs md:text-sm shadow-xs select-none">
            <Flame size={14} fill="currentColor" className="flex-shrink-0 animate-pulse text-red-500" /> {user.streak} días racha
          </span>
          <span className="text-[#58cc02] font-extrabold flex items-center gap-1 bg-green-50 border border-green-100 px-2 py-1 rounded-xl text-xs md:text-sm shadow-xs select-none">
            👑 Nivel {user.level}
          </span>
        </div>

        <div className="flex items-center gap-1 bg-amber-50 border border-amber-100/70 p-1 rounded-xl select-none text-[10.5px] sm:text-xs">
          <span className="font-extrabold text-[#df7e00] px-1 pl-1.5 flex items-center gap-0.5">🇻🇪 Tasa:</span>
          <button type="button" onClick={() => handleToggleRateType('oficial')}
            className={`p-1 px-1.5 sm:px-2 rounded-lg font-black transition-all ${activeRateType === 'oficial' ? 'bg-[#ff9600] text-white shadow-xs' : 'text-[#df7e00] hover:bg-[#ff9600]/10'}`}
            title="Usar Tasa Oficial BCV">
            BCV: {exchangeRates.oficial.toFixed(2)}
          </button>
          <button type="button" onClick={() => handleToggleRateType('paralelo')}
            className={`p-1 px-1.5 sm:px-2 rounded-lg font-black transition-all ${activeRateType === 'paralelo' ? 'bg-[#1cb0f6] text-white shadow-xs' : 'text-[#1cb0f6] hover:bg-[#1cb0f6]/10'}`}
            title="Usar Tasa Paralelo">
            Para: {exchangeRates.paralelo.toFixed(2)}
          </button>
          <button type="button" onClick={() => { playSound('click'); refetchRates(); }}
            disabled={isRefreshingRates}
            className={`p-1 text-gray-400 hover:text-gray-600 rounded transition-all ${isRefreshingRates ? 'animate-spin' : ''}`}
            title="Actualizar tasas">🔄</button>
          {isSupabaseConfigured() && (
            <button type="button" onClick={() => { playSound('click'); onSync(); }}
              disabled={isSyncing}
              className={`p-1 rounded transition-all ${isSyncing ? 'animate-spin text-[#1cb0f6]' : 'text-gray-400 hover:text-[#1cb0f6]'}`}
              title={`Sincronizar datos con la nube${lastSyncTime ? ` (última: ${lastSyncTime})` : ''}`}>
              <Cloud size={14} />
            </button>
          )}
        </div>

        <div className="text-[10.5px] sm:text-xs font-mono font-black text-gray-400 bg-slate-50 px-2 py-1 rounded-lg border border-gray-150 md:border-transparent md:bg-transparent md:p-0">
          UTC: {new Date().toISOString().split('T')[1].slice(0, 5)}
        </div>
      </div>

      <div className="flex items-center justify-between md:justify-end w-full md:w-auto gap-2 border-t border-gray-100 pt-2 md:border-t-0 md:pt-0">
        <div className="flex items-center gap-1.5 flex-1 md:flex-none">
          <span className="hidden lg:inline-block text-xs font-black text-gray-750 bg-gray-50 border border-gray-100 p-1.5 rounded-xl select-none max-w-[120px] truncate">👤 {user.username}</span>
          <div className="relative flex-1 md:flex-none">
            <select
              value={user.role || 'cashier'}
              onChange={(e) => {
                const newRole = e.target.value as any;
                const updatedUser = { ...user, role: newRole };
                setUser(updatedUser);
                localStorage.setItem('duo_pos_active_user', JSON.stringify(updatedUser));
                const savedUsersRaw = localStorage.getItem('duo_pos_users');
                if (savedUsersRaw) {
                  try {
                    const users = JSON.parse(savedUsersRaw);
                    const idx = users.findIndex((u: any) => u.username.toLowerCase() === user.username.toLowerCase());
                    if (idx !== -1) { users[idx].role = newRole; localStorage.setItem('duo_pos_users', JSON.stringify(users)); }
                  } catch {}
                }
                playSound('levelup');
              }}
              className="w-full text-xs font-black text-gray-750 bg-gray-50 border-2 border-gray-200 p-1 px-1.5 py-1.5 rounded-xl outline-none focus:border-[#1cb0f6] transition-all cursor-pointer select-none"
            >
              <option value="admin">👑 Admin</option>
              <option value="supervisor">⚡ Supervisor</option>
              <option value="cashier">💵 Cajero</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-1.5 animate-fadeIn">
          <button type="button" onClick={() => { onOpenHardwareHub(); playSound('click'); }}
            className="p-1 px-2 border border-sky-200 text-[#1cb0f6] bg-sky-50 hover:bg-sky-100 rounded-xl flex items-center justify-center transition-all cursor-pointer gap-1 text-[10px] sm:text-xs font-black uppercase"
            title="Panel de Control IoT y Drivers de Periféricos">
            <Cpu size={12} className="animate-pulse text-sky-400" /><span className="text-[10px]">Bus IoT 🔌</span>
          </button>
          <button type="button" onClick={toggleMute}
            className={`p-1.5 border rounded-xl flex items-center justify-center transition-all cursor-pointer ${isMuted ? 'border-red-200 text-red-500 bg-red-50 hover:bg-red-100' : 'border-green-200 text-green-600 bg-green-50 hover:bg-green-100'}`}
            title={isMuted ? 'Sonidos Silenciados - Clic para Activar' : 'Sonidos Activados - Clic para Silenciar'}>
            {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
          <button type="button" onClick={() => { playSound('click'); logoutUser(); }}
            className="p-1 px-2 border border-red-200 text-red-500 bg-red-50 hover:bg-red-100 rounded-xl flex items-center justify-center transition-all cursor-pointer gap-1 text-[10px] sm:text-xs font-black uppercase"
            title="Cerrar Caja / Sesión">
            <LogOut size={12} className="text-red-400" />
            <span className="text-[10px] hidden sm:inline">Cerrar Caja</span>
          </button>
        </div>
      </div>
    </div>
  );
}
