import React from 'react';
import { useUserStore } from '../../stores/useUserStore';
import { playSound } from '../../utils/sounds';

interface RoleLockWarningModalProps {
  setActiveTab: (tab: 'dashboard' | 'sales' | 'shifts' | 'inventory' | 'history' | 'customers' | 'settings' | 'logistics' | 'gamification') => void;
}

export default function RoleLockWarningModal({ setActiveTab }: RoleLockWarningModalProps) {
  const user = useUserStore(state => state.user);
  const setUser = useUserStore(state => state.setUser);
  const roleLockWarning = useUserStore(state => state.roleLockWarning);
  const setRoleLockWarning = useUserStore(state => state.setRoleLockWarning);

  if (!roleLockWarning || !user) return null;

  const isDev = user && (
    user.username.toLowerCase() === 'jonas' || 
    user.username.toLowerCase() === 'jonas_mendoza' || 
    (user.email && user.email.toLowerCase().includes('jonas')) || 
    user.username.toLowerCase() === 'admin'
  );

  return (
    <div className="fixed inset-0 z-50 bg-[#141414]/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white border-2 border-[#e5e5e5] border-b-[8px] rounded-3xl p-6 text-center space-y-4 animate-scaleUp">
        <div className="text-6xl text-amber-500 select-none">🔒</div>
        <h3 className="text-2xl font-black text-gray-800 tracking-tight">Acceso Restringido</h3>
        <p className="text-sm font-bold text-gray-500">
          Para entrar a la pestaña de <strong className="text-gray-800 font-extrabold">"{roleLockWarning.tabName}"</strong> necesitas rol de <span className="bg-amber-100 text-amber-700 px-2.5 py-1 rounded-lg border border-amber-200 uppercase text-xs font-black">{roleLockWarning.requiredRole}</span>.
        </p>
        <p className="text-xs text-gray-400 font-bold">
          Tu rol actual es: <span className="uppercase text-slate-600 underline font-black">{user.role === 'cashier' ? 'Cajero 💵' : user.role === 'supervisor' ? 'Supervisor ⚡' : 'Administrador 👑'}</span>
        </p>
        
        {isDev ? (
          <>
            <div className="bg-blue-50 border border-blue-100 p-3 rounded-2xl text-left space-y-2 mt-4">
              <span className="text-[11px] font-black text-blue-600 uppercase tracking-widest block">🔧 Modo Demostración (Simulador de Permisos)</span>
              <p className="text-xs text-blue-700 leading-relaxed font-semibold">
                ¿Deseas verificar esta vista? Haz clic abajo para autodesignarte un nivel de acceso superior temporal en este navegador.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => {
                  const updatedUser = { ...user, role: 'admin' as const };
                  setUser(updatedUser);
                  localStorage.setItem('duo_pos_active_user', JSON.stringify(updatedUser));
                  setActiveTab(
                    roleLockWarning.tabName === 'Configuración' ? 'settings' :
                    roleLockWarning.tabName === 'Catálogos' ? 'inventory' :
                    roleLockWarning.tabName === 'Logística' ? 'logistics' : 'dashboard'
                  );
                  setRoleLockWarning(null);
                  playSound('levelup');
                }}
                className="bg-[#58cc02] text-white border-b-4 border-[#3e9301] hover:bg-[#61e002] active:border-b-0 active:translate-y-[4px] font-black text-xs py-2.5 rounded-2xl cursor-pointer uppercase"
              >
                Simular Admin 👑
              </button>
              <button
                onClick={() => setRoleLockWarning(null)}
                className="bg-white text-gray-500 border-2 border-gray-200 border-b-4 hover:bg-gray-50 active:translate-y-[2px] active:border-b-2 font-black text-xs py-2.5 rounded-2xl cursor-pointer uppercase"
              >
                Cerrar
              </button>
            </div>
          </>
        ) : (
          <div className="pt-4 flex justify-end">
            <button
              onClick={() => setRoleLockWarning(null)}
              className="w-full py-2.5 bg-white text-gray-500 border-2 border-gray-200 border-b-4 hover:bg-gray-50 active:translate-y-[2px] active:border-b-2 font-black text-xs rounded-2xl cursor-pointer uppercase"
            >
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
