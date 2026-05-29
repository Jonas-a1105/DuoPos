import React from 'react';
import { playSound } from '../../../services/sounds';
import { FileText, Key, Info, ShieldAlert } from 'lucide-react';

interface SequenceSettingsProps {
  invoicePrefix: string;
  setInvoicePrefix: (val: string) => void;
  nextInvoiceNumber: number;
  setNextInvoiceNumber: (val: number) => void;
  automaticMockInvoicing: boolean;
  setAutomaticMockInvoicing: (val: boolean) => void;
  certifyingAuthority: string;
  setCertifyingAuthority: (val: string) => void;
  isCsdLoaded: boolean;
  setIsCsdLoaded: (val: boolean) => void;
  csdFileName: string;
  setCsdFileName: (val: string) => void;
  csdPass: string;
  setCsdPass: (val: string) => void;
  pacUsername?: string;
  setPacUsername?: (val: string) => void;
  pacPassword?: string;
  setPacPassword?: (val: string) => void;
}

export default function SequenceSettings({
  invoicePrefix,
  setInvoicePrefix,
  nextInvoiceNumber,
  setNextInvoiceNumber,
  automaticMockInvoicing,
  setAutomaticMockInvoicing,
  certifyingAuthority,
  setCertifyingAuthority,
  isCsdLoaded,
  setIsCsdLoaded,
  csdFileName,
  setCsdFileName,
  csdPass,
  setCsdPass,
  pacUsername = '',
  setPacUsername,
  pacPassword = '',
  setPacPassword,
}: SequenceSettingsProps) {
  return (
    <div className="space-y-6 animate-fadeIn text-left">
      <div className="border-b pb-3 flex items-center gap-2">
        <span className="text-2xl select-none">🧾</span>
        <div>
          <h3 className="text-sm font-black uppercase text-gray-800 tracking-tight font-sans">
            Folios y Certificados Digitales (CSD)
          </h3>
          <p className="text-[10px] text-gray-400 font-bold uppercase">
            Administra la serie numérica de tus comprobantes y firmas fiscales
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans text-gray-700">
        {/* Serie / Prefijo de Folio */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-black text-gray-450 tracking-wider block">
            Serie / Prefijo del Ticket
          </label>
          <input
            type="text"
            required
            value={invoicePrefix}
            onChange={(e) => setInvoicePrefix(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-200 text-xs font-black rounded-xl outline-none focus:border-amber-500 focus:bg-white uppercase font-mono"
            placeholder="Ej: A, VEN, FACT..."
          />
        </div>

        {/* Siguiente Folio */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-black text-gray-455 tracking-wider block">
            Siguiente Número de Folio
          </label>
          <input
            type="number"
            required
            value={nextInvoiceNumber}
            onChange={(e) => setNextInvoiceNumber(Number(e.target.value))}
            className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-200 text-xs font-black rounded-xl outline-none focus:border-amber-500 focus:bg-white font-mono"
            placeholder="1"
          />
        </div>

        {/* PAC Certificador */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-black text-gray-455 tracking-wider block">
            Proveedor Autorizado de Certificación (PAC)
          </label>
          <select
            value={certifyingAuthority}
            onChange={(e) => setCertifyingAuthority(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-200 text-xs font-bold rounded-xl outline-none focus:border-amber-500 focus:bg-white cursor-pointer"
          >
            <option value="DuoPac Internacional S.A.">Simulador Integrado (Mock SAT)</option>
            <option value="Facturama Sandbox API">Facturama Sandbox API (PAC Real)</option>
            <option value="Finkok Mock Premium">Finkok Premium (Simulado)</option>
          </select>
        </div>

        {/* Timbrado Automático */}
        <div className="space-y-1 flex flex-col justify-end">
          <label className="text-[10px] uppercase font-black text-gray-400 block mb-1">
            Automatización del Timbrado
          </label>
          <label className="flex items-center gap-2 bg-slate-50 border-2 border-slate-200 p-2.5 rounded-xl cursor-pointer">
            <input
              type="checkbox"
              checked={automaticMockInvoicing}
              onChange={(e) => {
                setAutomaticMockInvoicing(e.target.checked);
                playSound('click');
              }}
              className="rounded text-amber-500 focus:ring-amber-500 h-4 w-4 border-gray-300 cursor-pointer"
            />
            <span className="text-[10px] font-black text-slate-705 uppercase select-none">
              Timbrado CFDI Automático al Cobrar
            </span>
          </label>
        </div>
      </div>

      {/* FACTURAMA CREDENTIALS CONTAINER */}
      {certifyingAuthority.includes('Facturama') && (
        <div className="bg-amber-50/50 border-2 border-amber-200 rounded-3xl p-5 space-y-4 animate-fadeIn">
          <div className="flex items-start gap-3">
            <div className="bg-amber-100 border border-amber-200 p-2.5 rounded-xl text-amber-800">
              <ShieldAlert size={18} />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-black text-slate-800 uppercase">
                Credenciales Facturama Sandbox
              </h4>
              <p className="text-[9.5px] text-gray-400 font-extrabold uppercase leading-none">
                Conexión real CFDI 4.0 al entorno de pruebas del PAC
              </p>
              <p className="text-xs text-gray-550 leading-relaxed font-bold lowercase">
                Si no tienes credenciales o decides operar sin contratarlas, la aplicación simulará de forma 100% autónoma el proceso con disclaimers informativos.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1 text-xs">
              <label className="text-[9px] uppercase font-black text-gray-400">Usuario Facturama API</label>
              <input
                type="text"
                value={pacUsername}
                onChange={(e) => setPacUsername?.(e.target.value)}
                placeholder="Ingresa tu usuario del PAC"
                className="w-full bg-white border p-2.5 rounded-xl outline-none focus:border-amber-500 font-mono text-[10.5px] font-bold text-gray-700"
              />
            </div>

            <div className="space-y-1 text-xs">
              <label className="text-[9px] uppercase font-black text-gray-400">Contraseña Facturama API</label>
              <input
                type="password"
                value={pacPassword}
                onChange={(e) => setPacPassword?.(e.target.value)}
                placeholder="Ingresa tu contraseña de API"
                className="w-full bg-white border p-2.5 rounded-xl outline-none focus:border-amber-500 font-mono text-[10.5px] font-bold text-gray-750"
              />
            </div>
          </div>
        </div>
      )}

      {/* CSD CERTIFICATES CONTAINER */}
      <div className="bg-slate-50 border-2 border-slate-200 rounded-3xl p-5 space-y-4 pt-4">
        <div className="flex items-start gap-3">
          <div className="bg-indigo-50 border border-indigo-150 p-2.5 rounded-xl text-indigo-700">
            <FileText size={18} />
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-black text-slate-800 uppercase">
              Certificados de Sello Digital (CSD / FIEL SAT Mock)
            </h4>
            <p className="text-[9.5px] text-gray-400 font-extrabold uppercase leading-none">
              Necesario para firmar criptográficamente los tickets del POS
            </p>
            <p className="text-xs text-gray-550 leading-relaxed font-bold lowercase">
              Para simular facturas y timbrados fiscales del SAT CFDI 4.0 reales, DuoPOS requiere un mockup de llave
              privada (.key) y certificado (.cer) con tu contraseña de racha digital.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div className="space-y-1 text-xs">
            <label className="text-[9px] uppercase font-black text-gray-400">Archivo Certificado (.cer / .key)</label>
            <div className="flex items-center gap-2 bg-white border border-gray-300 p-2 rounded-xl">
              <span className="text-sm select-none">🔑</span>
              <span className="font-mono text-[10.5px] font-black text-slate-700 select-all truncate">
                {csdFileName}
              </span>
            </div>
          </div>

          <div className="space-y-1 text-xs">
            <label className="text-[9px] uppercase font-black text-gray-400">Contraseña de Racha Digital</label>
            <input
              type="password"
              value={csdPass}
              onChange={(e) => setCsdPass(e.target.value)}
              className="w-full bg-white border p-2 rounded-xl outline-none focus:border-amber-500 font-mono text-[10.5px] font-bold"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              playSound('click');
              const status = !isCsdLoaded;
              setIsCsdLoaded(status);
              if (status) {
                setCsdFileName('duo_sello_digital_2026.key');
                setCsdPass('*************');
                alert('🔓 CSD Mock cargado correctamente en memoria.');
              } else {
                setCsdFileName('ninguno_cargado.key');
                setCsdPass('');
                alert('🔒 Se removieron los certificados mock locales.');
              }
            }}
            className={`py-2 px-3 rounded-xl font-black text-xs uppercase border-b-4 transition-all cursor-pointer select-none flex items-center justify-center gap-1 ${
              isCsdLoaded
                ? 'bg-emerald-500 text-white border-emerald-700 hover:bg-emerald-450 active:border-b-0'
                : 'bg-indigo-600 text-white border-indigo-850 hover:bg-indigo-500 active:border-b-0'
            }`}
          >
            {isCsdLoaded ? '✓ Sello Conectado' : '🔌 Cargar Certificado'}
          </button>
        </div>

        <div className="bg-sky-50 border border-sky-150 rounded-2xl p-3 flex gap-2 text-[10px] font-bold text-sky-850">
          <Info size={14} className="text-sky-500 shrink-0 mt-0.5" />
          <p className="lowercase">
            Si desactivas el sello, el POS generará tickets de venta corporativos informales (no timbrados ante el SAT).
          </p>
        </div>
      </div>
    </div>
  );
}
