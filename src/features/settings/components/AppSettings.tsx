import React from 'react';
import { playSound } from '../../../services/audio/soundService';
import { Sliders, Laptop, Cpu, Info } from 'lucide-react';

interface AppSettingsProps {
  businessProfile: 'gastronomy' | 'market' | 'retail' | 'general';
  setBusinessProfile: (val: 'gastronomy' | 'market' | 'retail' | 'general') => void;
  currencySymbol: string;
  setCurrencySymbol: (val: string) => void;
  currencyDecimals: number;
  setCurrencyDecimals: (val: number) => void;
  enableSounds: boolean;
  setEnableSounds: (val: boolean) => void;
  ticketWidth: '80mm' | '58mm';
  setTicketWidth: (val: '80mm' | '58mm') => void;
  customTicketHeader: string;
  setCustomTicketHeader: (val: string) => void;
  customTicketFooter: string;
  setCustomTicketFooter: (val: string) => void;
  kdsDelayMinutes: number;
  setKdsDelayMinutes: (val: number) => void;
}

export default function AppSettings({
  businessProfile,
  setBusinessProfile,
  currencySymbol,
  setCurrencySymbol,
  currencyDecimals,
  setCurrencyDecimals,
  enableSounds,
  setEnableSounds,
  ticketWidth,
  setTicketWidth,
  customTicketHeader,
  setCustomTicketHeader,
  customTicketFooter,
  setCustomTicketFooter,
  kdsDelayMinutes,
  setKdsDelayMinutes,
}: AppSettingsProps) {
  const [pinSupervisor, setPinSupervisor] = React.useState(() => localStorage.getItem('duo_pos_pin_supervisor') || '1234');
  const [pinAdmin, setPinAdmin] = React.useState(() => localStorage.getItem('duo_pos_pin_admin') || '1919');

  const handleSavePin = (role: 'supervisor' | 'admin', val: string) => {
    const sanitized = val.replace(/[^0-9]/g, '').slice(0, 4);
    if (role === 'supervisor') {
      setPinSupervisor(sanitized);
      localStorage.setItem('duo_pos_pin_supervisor', sanitized);
    } else {
      setPinAdmin(sanitized);
      localStorage.setItem('duo_pos_pin_admin', sanitized);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn text-left">
      <div className="border-b pb-3 flex items-center gap-2">
        <span className="text-2xl select-none">🛠️</span>
        <div>
          <h3 className="text-sm font-black uppercase text-gray-800 tracking-tight font-sans">
            Perfil de Especialización y Preferencias App
          </h3>
          <p className="text-[10px] text-gray-400 font-bold uppercase">
            Personaliza el comportamiento del punto de venta
          </p>
        </div>
      </div>

      {/* Business Profile Picker with beautiful visual choices */}
      <div className="space-y-3">
        <label className="text-[10px] uppercase font-black text-gray-450 tracking-wider block">
          Perfil del Negocio (Especialización Vertical)
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Gastronomy */}
          <button
            type="button"
            onClick={() => {
              setBusinessProfile('gastronomy');
              playSound('click');
            }}
            className={`p-4 rounded-2xl border-2 text-left flex flex-col justify-between transition-all relative cursor-pointer ${
              businessProfile === 'gastronomy'
                ? 'border-[#1cb0f6] bg-blue-50/50 text-[#155375]'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <div className="flex justify-between items-start w-full">
              <span className="text-3xl select-none">🍔</span>
              {businessProfile === 'gastronomy' && (
                <span className="bg-[#1cb0f6] text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-md leading-none select-none">
                  ACTIVO
                </span>
              )}
            </div>
            <div className="mt-4">
              <h4 className="font-extrabold text-xs uppercase leading-none font-sans">Gastronomía</h4>
              <p className="text-[10px] text-gray-400 font-bold mt-1.5 leading-relaxed">
                Mesas de restaurante, meseros asignables, modificadores de platillo y cocina (KDS).
              </p>
            </div>
          </button>

          {/* Abastos / Minimarket */}
          <button
            type="button"
            onClick={() => {
              setBusinessProfile('market');
              playSound('click');
            }}
            className={`p-4 rounded-2xl border-2 text-left flex flex-col justify-between transition-all relative cursor-pointer ${
              businessProfile === 'market'
                ? 'border-indigo-500 bg-indigo-50/20 text-indigo-950'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <div className="flex justify-between items-start w-full">
              <span className="text-3xl select-none">🛒</span>
              {businessProfile === 'market' && (
                <span className="bg-indigo-500 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-md leading-none select-none">
                  ACTIVO
                </span>
              )}
            </div>
            <div className="mt-4">
              <h4 className="font-extrabold text-xs uppercase leading-none font-sans">Abastos / Kiosco</h4>
              <p className="text-[10px] text-gray-400 font-bold mt-1.5 leading-relaxed">
                Venta directa de catálogo con interfaz limpia sin módulos extra de servicios ni simulación de hardware.
              </p>
            </div>
          </button>

          {/* Comercio / Retail */}
          <button
            type="button"
            onClick={() => {
              setBusinessProfile('retail');
              playSound('click');
            }}
            className={`p-4 rounded-2xl border-2 text-left flex flex-col justify-between transition-all relative cursor-pointer ${
              businessProfile === 'retail'
                ? 'border-[#ff9600] bg-orange-50/20 text-[#713f12]'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <div className="flex justify-between items-start w-full">
              <span className="text-3xl select-none">🛍️</span>
              {businessProfile === 'retail' && (
                <span className="bg-[#ff9600] text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-md leading-none select-none">
                  ACTIVO
                </span>
              )}
            </div>
            <div className="mt-4">
              <h4 className="font-extrabold text-xs uppercase leading-none font-sans">Comercio Escáner</h4>
              <p className="text-[10px] text-gray-400 font-bold mt-1.5 leading-relaxed">
                Enfoque en códigos de barra, pistola lectora de mostrador y simulación láser de hardware.
              </p>
            </div>
          </button>

          {/* Servicios Especializados */}
          <button
            type="button"
            onClick={() => {
              setBusinessProfile('general');
              playSound('click');
            }}
            className={`p-4 rounded-2xl border-2 text-left flex flex-col justify-between transition-all relative cursor-pointer ${
              businessProfile === 'general'
                ? 'border-emerald-500 bg-emerald-50/20 text-emerald-950'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <div className="flex justify-between items-start w-full">
              <span className="text-3xl select-none">💼</span>
              {businessProfile === 'general' && (
                <span className="bg-emerald-500 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-md leading-none select-none">
                  ACTIVO
                </span>
              )}
            </div>
            <div className="mt-4">
              <h4 className="font-extrabold text-xs uppercase leading-none font-sans">Servicios / General</h4>
              <p className="text-[10px] text-gray-400 font-bold mt-1.5 leading-relaxed">
                Esquema ágil para consultoría u oficios. Habilita creación de servicios ad-hoc al vuelo al cobrar.
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* App Preferences general parameters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans text-gray-700">
        {/* Currency Symbol selection */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-black text-gray-400 tracking-wider block">
            Símbolo de Divisa / Moneda
          </label>
          <select
            value={currencySymbol}
            onChange={(e) => setCurrencySymbol(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-200 text-xs font-bold rounded-xl outline-none focus:border-amber-500 focus:bg-white text-gray-750 cursor-pointer"
          >
            <option value="$">$ USD / MXN / CLP / COP</option>
            <option value="€">€ Euros</option>
            <option value="Bs.">Bs. VEF (Bolívares)</option>
            <option value="S/">S/ Sol Peruano</option>
            <option value="Q">Q Quetzal</option>
            <option value="RD$">RD$ Peso Dominicano</option>
            <option value="₡">₡ Colón</option>
            <option value="£">£ Libras</option>
          </select>
        </div>

        {/* Decimal Places */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-black text-gray-400 tracking-wider block">
            Dígitos Decimales en Divisa
          </label>
          <div className="flex gap-2">
            {[0, 1, 2].map((dec) => (
              <button
                key={dec}
                type="button"
                onClick={() => {
                  setCurrencyDecimals(dec);
                  playSound('click');
                }}
                className={`flex-1 py-2 font-mono text-xs font-black rounded-xl border-2 transition-all cursor-pointer ${
                  currencyDecimals === dec
                    ? 'border-[#58cc02] bg-green-50 text-emerald-800 animate-fadeIn'
                    : 'border-gray-200 hover:border-gray-300 bg-white text-gray-500'
                }`}
              >
                {dec} {dec === 0 ? ' (Ej: $100)' : dec === 2 ? ' (Ej: $1.50)' : ' (Ej: $1.5)'}
              </button>
            ))}
          </div>
        </div>

        {/* Sound settings and Thermal ticket width */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-black text-gray-400 tracking-wider block">
            Ancho del Ticket Físico
          </label>
          <div className="flex gap-2">
            {['80mm', '58mm'].map((width) => (
              <button
                key={width}
                type="button"
                onClick={() => {
                  setTicketWidth(width as any);
                  playSound('click');
                }}
                className={`flex-1 py-1.5 font-bold text-xs rounded-xl border-2 transition-all cursor-pointer ${
                  ticketWidth === width
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-900'
                    : 'border-gray-200 hover:border-gray-300 bg-white text-gray-500'
                }`}
              >
                📂 {width} {width === '80mm' ? '(Estándar)' : '(Portátil)'}
              </button>
            ))}
          </div>
        </div>

        {/* Enable Sounds globally */}
        <div className="space-y-1 flex flex-col justify-end">
          <label className="text-[10px] uppercase font-black text-gray-400 tracking-wider block mb-1">
            Sonido y Memes del Sistema
          </label>
          <label className="flex items-center gap-2 bg-slate-50 border-2 border-slate-200 p-2 text-sm rounded-xl cursor-pointer">
            <input
              type="checkbox"
              checked={enableSounds}
              onChange={(e) => {
                setEnableSounds(e.target.checked);
                playSound('success');
              }}
              className="rounded text-[#58cc02] focus:ring-[#58cc02] h-4 w-4 border-gray-300 cursor-pointer"
            />
            <span className="text-[10px] font-black text-slate-700 uppercase select-none">
              Habilitar Efectos Sonoros
            </span>
          </label>
        </div>

        {/* KDS delay minutes trigger threshold */}
        <div className="space-y-1 md:col-span-2">
          <label className="text-[10px] uppercase font-black text-gray-400 tracking-wider block">
            Alerta de Demoras en Monitor Cocina (KDS)
          </label>
          <div className="flex items-center gap-3 bg-[#fafafa] border p-3 rounded-2xl">
            <div className="font-bold text-xs text-gray-500 max-w-sm">
              Indica cuántos minutos puede tardar una comanda en preparación antes de marcarse en rojo parpadeante en el
              KDS.
            </div>
            <div className="relative shrink-0 w-32">
              <input
                type="number"
                min="2"
                max="60"
                value={kdsDelayMinutes}
                onChange={(e) => setKdsDelayMinutes(Number(e.target.value))}
                className="w-full px-3 py-1.5 bg-white border-2 border-gray-250 text-xs font-black rounded-lg outline-none font-mono text-center text-gray-800"
              />
              <span className="absolute right-2.5 top-1.5 text-[9px] text-gray-400 font-extrabold pb-0.5 select-none">
                MINS
              </span>
            </div>
          </div>
        </div>

        {/* Receipt layout fields */}
        <div className="space-y-1 md:col-span-2">
          <label className="text-[10px] uppercase font-black text-gray-400 tracking-wider block">
            Texto Adicional en Encabezado de Ticket
          </label>
          <input
            type="text"
            value={customTicketHeader}
            onChange={(e) => setCustomTicketHeader(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-200 text-xs font-bold rounded-xl outline-none focus:border-amber-500 focus:bg-white"
            placeholder="Ej: Sabor casero con amor, Sucursal Plaza Central"
          />
        </div>

        <div className="space-y-1 md:col-span-2">
          <label className="text-[10px] uppercase font-black text-gray-400 tracking-wider block">
            Mensaje de Agradecimiento en Pie de Ticket
          </label>
          <input
            type="text"
            value={customTicketFooter}
            onChange={(e) => setCustomTicketFooter(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-200 text-xs font-bold rounded-xl outline-none focus:border-amber-500 focus:bg-white"
            placeholder="Ej: ¡Gracias por tu compra! Vuelve pronto"
          />
        </div>

        {/* Security & Access PIN Configuration (Fase 2) */}
        <div className="md:col-span-2 border-t pt-5 mt-3 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xl select-none">🛡️</span>
            <div>
              <h4 className="text-xs font-black uppercase text-gray-800 tracking-tight font-sans">
                Seguridad y PINs de Acceso para Cambio de Roles
              </h4>
              <p className="text-[9px] text-gray-400 font-bold uppercase">
                Define las claves numéricas requeridas para la escalada de privilegios en caliente
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-black text-gray-400 tracking-wider block">
                PIN de Supervisor ⚡ (Por defecto: 1234)
              </label>
              <input
                type="text"
                pattern="[0-9]*"
                maxLength={4}
                value={pinSupervisor}
                onChange={(e) => handleSavePin('supervisor', e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-200 text-xs font-mono font-black rounded-xl outline-none focus:border-amber-500 focus:bg-white tracking-widest text-center"
                placeholder="1234"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-black text-gray-400 tracking-wider block">
                PIN de Administrador 👑 (Por defecto: 1919)
              </label>
              <input
                type="text"
                pattern="[0-9]*"
                maxLength={4}
                value={pinAdmin}
                onChange={(e) => handleSavePin('admin', e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-200 text-xs font-mono font-black rounded-xl outline-none focus:border-amber-500 focus:bg-white tracking-widest text-center"
                placeholder="1919"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
