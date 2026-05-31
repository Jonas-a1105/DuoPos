import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Home,
  ShoppingBag,
  Package,
  History,
  Users,
  Settings,
  Wallet,
  Globe,
  Trophy,
  LogOut,
  Download,
  Cloud,
  Menu,
} from 'lucide-react';
import { useUserStore } from '../../stores/useUserStore';
import { useInventoryStore } from '../../features/inventory/store/useInventoryStore';
import { useSession } from '../../hooks/useSession';
import { DUO_CHARACTERS } from '../../initialData';
import { playSound } from '../../services/audio/soundService';
import { toast } from '../../shared/ui';
import AeroMascot from '../../shared/ui/Mascot/AeroMascot';
import ShieldCrest from '../../shared/ui/Mascot/ShieldCrest';

interface SidebarProps {
  themeClasses: Record<string, string>;
  isMuted: boolean;
  toggleMute: () => void;
  onSync?: (showToast?: boolean) => Promise<void>;
  isSyncing?: boolean;
}

const NAV_ITEMS_DESKTOP = [
  { id: 'dashboard', label: 'Inicio', icon: <Home size={20} strokeWidth={2.5} />, roles: ['admin', 'supervisor', 'cashier'], name: 'Tablero' },
  { id: 'sales', label: 'Vender', icon: <ShoppingBag size={20} strokeWidth={2.5} />, roles: ['admin', 'supervisor', 'cashier'], name: 'Ventas' },
  { id: 'gamification', label: 'Master Club 🏆', icon: <Trophy size={20} strokeWidth={2.5} />, roles: ['admin', 'supervisor', 'cashier'], name: 'Gamificación' },
  { id: 'shifts', label: 'Caja y Turnos', icon: <Wallet size={20} strokeWidth={2.5} />, roles: ['admin', 'supervisor', 'cashier'], name: 'Turnos' },
  { id: 'customers', label: 'Clientes', icon: <Users size={20} strokeWidth={2.5} />, roles: ['admin', 'supervisor', 'cashier'], name: 'Clientes' },
  { id: 'inventory', label: 'Catalogos', icon: <Package size={20} strokeWidth={2.5} />, roles: ['admin', 'supervisor'], name: 'Catálogos' },
  { id: 'logistics', label: 'Sucursales & CEDIS 🌐', icon: <Globe size={20} strokeWidth={2.5} />, roles: ['admin', 'supervisor'], name: 'Logística' },
  { id: 'history', label: 'Historial', icon: <History size={20} strokeWidth={2.5} />, roles: ['admin', 'supervisor', 'cashier'], name: 'Historial' },
  { id: 'settings', label: 'Ajustes', icon: <Settings size={20} strokeWidth={2.5} />, roles: ['admin'], name: 'Configuración' },
];

const PRIMARY_MOBILE_TABS = [
  { id: 'dashboard', label: 'Inicio', icon: <Home size={18} strokeWidth={2.5} />, roles: ['admin', 'supervisor', 'cashier'], name: 'Tablero' },
  { id: 'sales', label: 'Vender', icon: <ShoppingBag size={18} strokeWidth={2.5} />, roles: ['admin', 'supervisor', 'cashier'], name: 'Ventas' },
  { id: 'gamification', label: 'Club Duo', icon: <Trophy size={18} strokeWidth={2.5} />, roles: ['admin', 'supervisor', 'cashier'], name: 'Gamificación' },
  { id: 'shifts', label: 'Caja', icon: <Wallet size={18} strokeWidth={2.5} />, roles: ['admin', 'supervisor', 'cashier'], name: 'Turnos' },
];

export default function Sidebar({ themeClasses, isMuted, toggleMute, onSync, isSyncing }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useUserStore((s) => s.user);
  const licenseDetails = useUserStore((s) => s.licenseDetails);
  const setRoleLockWarning = useUserStore((s) => s.setRoleLockWarning);
  const setShowLanding = useUserStore((s) => s.setShowLanding);
  const activeEvent = useInventoryStore((s) => s.activeEvent);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { logoutUser } = useSession();

  const activeTab = location.pathname === '/' ? 'dashboard' : location.pathname.substring(1);
  const currentUserRole = user?.role || 'cashier';
  const activeChar = user ? (DUO_CHARACTERS[user.avatar] || DUO_CHARACTERS.duo) : DUO_CHARACTERS.duo;

  const navigateTo = (tab: string) => {
    navigate(tab === 'dashboard' ? '/' : '/' + tab);
  };

  const handleNavClick = (tab: { id: string; roles: string[]; name: string; icon: React.ReactNode; label: string }) => {
    const hasAccess = tab.roles.includes(currentUserRole);
    if (!hasAccess) {
      playSound('error');
      setRoleLockWarning({ requiredRole: tab.roles.join(' o '), activeRole: currentUserRole, tabName: tab.name });
      return;
    }
    if (tab.id === 'logistics' && licenseDetails.tier === 'free') {
      playSound('error');
      toast.error('La sección de "Sucursales & CEDIS" requiere el Plan Standard o superior. Actualiza tu plan en Ajustes > Planes y Suscripción.', { title: 'Acceso Restringido — Plan Gratuito 🔒', duration: 7000 });
      return;
    }
    navigateTo(tab.id);
    playSound('click');
  };

  const isSelected = (tabId: string) => activeTab === tabId;

  const renderNavItem = (tab: typeof NAV_ITEMS_DESKTOP[0], mobile = false) => {
    const hasAccess = tab.roles.includes(currentUserRole);
    const selected = isSelected(tab.id);
    const baseClass = mobile
      ? 'flex-shrink-0 w-[60px] flex flex-col items-center justify-center text-center cursor-pointer select-none'
      : `w-full text-left py-3 px-4 rounded-2xl font-black text-sm uppercase tracking-wider transition-all border-b-4 flex items-center justify-between gap-1.5 cursor-pointer ${
          selected
            ? themeClasses.sidebarActive
            : !hasAccess
              ? 'border-transparent text-gray-300 hover:text-gray-400 bg-gray-50/50 cursor-not-allowed'
              : 'border-transparent text-gray-500 hover:bg-gray-100/30 hover:text-gray-700 active:translate-y-1'
        }`;

    return (
      <button key={tab.id} onClick={() => handleNavClick(tab)} className={baseClass}>
        {!mobile && (
          <div className="flex items-center gap-3">
            {tab.icon}
            <span>{tab.label}</span>
          </div>
        )}
        {mobile && (
          <>
            <div className={`p-1.5 rounded-xl transition-colors relative ${selected ? 'text-[#1cb0f6] bg-[#1cb0f6]/5 font-black' : 'text-gray-400'}`}>
              {tab.icon}
              {!hasAccess && <span className="absolute -top-1 -right-1 bg-gray-100 text-gray-400 font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center text-[7px] border border-white">🔒</span>}
            </div>
            <span className={`text-[8.5px] font-extrabold uppercase mt-1 tracking-wider truncate w-full ${selected ? 'text-[#1cb0f6]' : 'text-gray-400'}`}>{tab.label}</span>
          </>
        )}
        {!hasAccess && !mobile && <span className="text-gray-400">🔒</span>}
      </button>
    );
  };

  return (
    <>
      {/* Desktop Sidebar Layout */}
      <aside className="hidden md:flex flex-col justify-between w-64 p-4 pr-6 shrink-0 h-[calc(100vh-60px)] sticky top-4">
        <div className="space-y-8">
          <div className="flex items-center gap-2 px-2 cursor-pointer transform hover:scale-102 transition-transform duration-100">
            <div className="relative flex items-center gap-1.5 shrink-0">
              <ShieldCrest level={user?.level ?? 1} size={36} animate={true} />
              <AeroMascot
                size={36}
                activeAccessory={user?.activeAccessory}
                mood="neutral"
                level={user?.level ?? 1}
                showSparkles={false}
              />
            </div>
            <div>
              <h1 className={`text-2xl font-black tracking-wider leading-none ${themeClasses.logoText}`}>Stock<span className={user?.activeSkin === 'standard' ? 'text-[#3c3c3c]' : 'text-inherit opacity-85'}>Master</span></h1>
              <span className="text-[9px] tracking-widest uppercase font-black text-gray-400">Pro - Gamificado</span>
            </div>
          </div>
          <nav className="space-y-2">{NAV_ITEMS_DESKTOP.map((tab) => renderNavItem(tab))}</nav>
        </div>

        <div className="space-y-3">
          <button onClick={() => window.open('https://duopos.app/install', '_blank')} className="w-full bg-[#ff9600] text-white border-b-4 border-[#df7e00] hover:bg-[#ffa726] active:border-b-0 active:translate-y-[4px] font-black text-xs py-3 rounded-2xl tracking-wide flex items-center justify-center gap-1.5 cursor-pointer uppercase">
            <Download size={14} /> Instalar en PC/Teléfono
          </button>
          {onSync && (
            <button
              disabled={isSyncing}
              onClick={() => { playSound('click'); onSync(true); }}
              className="w-full bg-[#1cb0f6] border-[#1890d4] hover:bg-[#42c4ff] active:border-b-0 active:translate-y-[4px] disabled:bg-gray-300 disabled:border-gray-400 text-white border-b-4 font-black text-xs py-2.5 rounded-2xl tracking-wide flex items-center justify-center gap-1.5 cursor-pointer uppercase"
            >
              <Cloud size={14} className={isSyncing ? 'animate-spin' : ''} /> {isSyncing ? 'Sincronizando...' : 'Sincronizar Datos'}
            </button>
          )}
          <button
            onClick={() => { playSound('click'); setShowLanding(true); }}
            className="w-full bg-white text-[#58cc02] border-2 border-green-200 border-b-4 hover:bg-green-50 active:translate-y-[2px] active:border-b-2 font-black text-xs py-2.5 rounded-2xl transition-all flex items-center justify-center gap-1.5 cursor-pointer uppercase flex-shrink-0"
          >
            📖 Guía y Servicios
          </button>
          <button
            onClick={() => { playSound('click'); logoutUser(); }}
            className="w-full bg-white text-gray-500 border-2 border-gray-200 border-b-4 hover:bg-red-50 hover:text-red-500 hover:border-red-200 active:translate-y-[2px] active:border-b-2 font-black text-xs py-2.5 rounded-2xl transition-all flex items-center justify-center gap-1.5 cursor-pointer uppercase"
          >
            <LogOut size={14} /> Cerrar Caja
          </button>
          <div className="text-center font-black text-[9px] text-gray-400">
            DuoPOS {localStorage.getItem('duo_pos_app_version') || 'v1.8-Stable'} • {licenseDetails.tier === 'free' ? 'Plan Gratuito' : 'Licencia Registrada'}
          </div>
        </div>
      </aside>

      {/* Mobile Navigation Bottom Bar (Fixed) */}
      <footer className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t-2 border-gray-200 p-2.5 pb-4 flex items-center justify-around shadow-[0_-4px_16px_rgba(0,0,0,0.065)]">
        {PRIMARY_MOBILE_TABS.map((tab) => renderNavItem(tab, true))}
        
        {/* Toggle Menú Drawer Button */}
        <button
          onClick={() => {
            playSound('click');
            setIsMobileMenuOpen(true);
          }}
          className="flex-shrink-0 w-[60px] flex flex-col items-center justify-center text-center cursor-pointer select-none"
        >
          <div className="p-1.5 rounded-xl text-gray-400 hover:text-gray-650 hover:bg-gray-50 transition-colors">
            <Menu size={18} strokeWidth={2.5} />
          </div>
          <span className="text-[8.5px] font-extrabold uppercase mt-1 tracking-wider text-gray-400">Menú</span>
        </button>
      </footer>

      {/* Mobile Slide-Up Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop overlay with blur */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => { playSound('click'); setIsMobileMenuOpen(false); }}
          />
          
          {/* Drawer sheet */}
          <div className="relative bg-white rounded-t-3xl p-6 shadow-2xl max-h-[85vh] overflow-y-auto flex flex-col gap-6 animate-in slide-in-from-bottom duration-200 z-50 border-t border-gray-100">
            {/* Grab handle */}
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto cursor-pointer" onClick={() => setIsMobileMenuOpen(false)} />
            
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-black text-gray-700 uppercase tracking-wider">Menú del Sistema</h3>
              <button
                onClick={() => { playSound('click'); setIsMobileMenuOpen(false); }}
                className="text-gray-400 hover:text-gray-600 text-sm font-black p-1"
              >
                ✕
              </button>
            </div>
            
            {/* Management Modules Grid */}
            <div className="space-y-3">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Módulos de Gestión</span>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { id: 'customers', label: 'Clientes', icon: <Users size={18} strokeWidth={2.5} />, roles: ['admin', 'supervisor', 'cashier'], name: 'Clientes' },
                  { id: 'inventory', label: 'Almacén', icon: <Package size={18} strokeWidth={2.5} />, roles: ['admin', 'supervisor'], name: 'Catálogos' },
                  { id: 'logistics', label: 'Sucursales', icon: <Globe size={18} strokeWidth={2.5} />, roles: ['admin', 'supervisor'], name: 'Logística' },
                  { id: 'history', label: 'Historial', icon: <History size={18} strokeWidth={2.5} />, roles: ['admin', 'supervisor', 'cashier'], name: 'Historial' },
                  { id: 'settings', label: 'Ajustes', icon: <Settings size={18} strokeWidth={2.5} />, roles: ['admin'], name: 'Configuración' },
                ].map((tab) => {
                  const hasAccess = tab.roles.includes(currentUserRole);
                  const selected = isSelected(tab.id);
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        handleNavClick(tab);
                      }}
                      className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all text-left ${
                        selected
                          ? 'border-[#1cb0f6] bg-[#1cb0f6]/5 text-[#1cb0f6] font-black'
                          : !hasAccess
                            ? 'border-gray-100 text-gray-300 bg-gray-50/50 cursor-not-allowed'
                            : 'border-gray-100 text-gray-650 hover:bg-gray-50 active:translate-y-0.5'
                      }`}
                    >
                      <div className={selected ? 'text-[#1cb0f6]' : 'text-gray-400'}>
                        {tab.icon}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-black uppercase tracking-wide truncate">{tab.label}</span>
                        {!hasAccess && <span className="text-[8px] font-bold text-red-400 uppercase tracking-widest">Restringido 🔒</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            
            {/* Quick Actions List */}
            <div className="space-y-2.5">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Acciones Rápidas</span>
              
              {/* Install Button */}
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  const bannerBtn = document.querySelector('button[onClick*="setIsInstallModalOpen"]');
                  if (bannerBtn) (bannerBtn as HTMLElement).click();
                  else toast.info('El instalador está disponible desde la pantalla principal.', { title: 'Instalador PWA' });
                }}
                className="w-full bg-[#ff9600] text-white hover:bg-[#ffa726] active:translate-y-0.5 font-black text-xs py-3 rounded-2xl tracking-wide flex items-center justify-center gap-2 shadow-sm uppercase"
              >
                <Download size={14} /> Instalar App móvil
              </button>
              
              {/* Sync Button */}
              {onSync && (
                <button
                  disabled={isSyncing}
                  onClick={async () => {
                    setIsMobileMenuOpen(false);
                    await onSync(true);
                  }}
                  className="w-full bg-[#1cb0f6] text-white hover:bg-[#42c4ff] disabled:bg-gray-300 active:translate-y-0.5 font-black text-xs py-3 rounded-2xl tracking-wide flex items-center justify-center gap-2 shadow-sm uppercase"
                >
                  <Cloud size={14} className={isSyncing ? 'animate-spin' : ''} /> {isSyncing ? 'Sincronizando...' : 'Sincronizar Datos'}
                </button>
              )}
              
              {/* Guide Button */}
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setShowLanding(true);
                }}
                className="w-full bg-white text-[#58cc02] border-2 border-green-200 hover:bg-green-50 active:translate-y-0.5 font-black text-xs py-3 rounded-2xl flex items-center justify-center gap-2 uppercase"
              >
                📖 Guía y Soporte
              </button>
            </div>
            
            {/* Danger Zone / LogOut */}
            <div className="pt-2 border-t border-gray-150">
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  playSound('click');
                  logoutUser();
                }}
                className="w-full bg-red-50 text-red-500 border-2 border-red-150 hover:bg-red-100 active:translate-y-0.5 font-black text-xs py-3 rounded-2xl flex items-center justify-center gap-2 uppercase transition-colors animate-pulse"
              >
                <LogOut size={14} /> Cerrar Caja (Salir)
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
