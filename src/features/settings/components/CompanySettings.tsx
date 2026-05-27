import React from 'react';

interface CompanySettingsProps {
  companyName: string;
  setCompanyName: (val: string) => void;
  companyTaxId: string;
  setCompanyTaxId: (val: string) => void;
  companyRegime: string;
  setCompanyRegime: (val: string) => void;
  companyPostalCode: string;
  setCompanyPostalCode: (val: string) => void;
  companyAddress: string;
  setCompanyAddress: (val: string) => void;
}

export default function CompanySettings({
  companyName,
  setCompanyName,
  companyTaxId,
  setCompanyTaxId,
  companyRegime,
  setCompanyRegime,
  companyPostalCode,
  setCompanyPostalCode,
  companyAddress,
  setCompanyAddress
}: CompanySettingsProps) {
  return (
    <div className="space-y-6 animate-fadeIn text-left">
      <div className="border-b pb-3 flex items-center gap-2">
        <span className="text-2xl select-none">🏢</span>
        <div>
          <h3 className="text-sm font-black uppercase text-gray-800 tracking-tight font-sans">Datos de Empresa Emisor Corporativo</h3>
          <p className="text-[10px] text-gray-400 font-bold uppercase">Define el membrete fiscal y comercial oficial para tus CFDI y Tickets</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans text-gray-700">
        
        {/* Razón Social */}
        <div className="md:col-span-2 space-y-1">
          <label className="text-[10px] uppercase font-black text-gray-450 tracking-wider block">Razón Social / Denominación Comercial</label>
          <input
            type="text"
            required
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-200 text-xs font-bold rounded-xl outline-none focus:border-amber-500 focus:bg-white"
            placeholder="Ej: Búhos Felices S.A. de C.V."
          />
        </div>

        {/* RFC / Identificación Fiscal */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-black text-gray-455 tracking-wider block">RFC / Identificación Fiscal Tributaria</label>
          <input
            type="text"
            required
            value={companyTaxId}
            onChange={(e) => setCompanyTaxId(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-205 text-xs font-black rounded-xl outline-none focus:border-amber-500 focus:bg-white font-mono uppercase"
            placeholder="Ej: BFE160527XX9"
          />
        </div>

        {/* Régimen Fiscal */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-black text-gray-455 tracking-wider block">Régimen Fiscal (Catálogo SAT)</label>
          <select
            value={companyRegime}
            onChange={(e) => setCompanyRegime(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-205 text-xs font-bold rounded-xl outline-none focus:border-amber-500 focus:bg-white cursor-pointer"
          >
            <option value="601">601 - General de Ley Personas Morales</option>
            <option value="603">603 - Personas Morales con Fines no Lucrativos</option>
            <option value="605">605 - Sueldos y Salarios e Ingresos Asimilados a Salarios</option>
            <option value="606">606 - Arrendamiento</option>
            <option value="612">612 - Personas Físicas con Actividades Empresariales y Profesionales</option>
            <option value="621">621 - Incorporación Fiscal</option>
            <option value="626">626 - Régimen Simplificado de Confianza (RESICO)</option>
          </select>
        </div>

        {/* Código Postal */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-black text-gray-450 tracking-wider block">Lugar de Expedición (Código Postal CP)</label>
          <input
            type="text"
            required
            value={companyPostalCode}
            onChange={(e) => setCompanyPostalCode(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-205 text-xs font-black rounded-xl outline-none focus:border-amber-500 focus:bg-white font-mono"
            placeholder="Ej: 06700"
          />
        </div>

        {/* Dirección Física */}
        <div className="md:col-span-2 space-y-1">
          <label className="text-[10px] uppercase font-black text-gray-450 tracking-wider block">Domicilio de Oficina & Bodega Principal</label>
          <input
            type="text"
            required
            value={companyAddress}
            onChange={(e) => setCompanyAddress(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-205 text-xs font-bold rounded-xl outline-none focus:border-amber-500 focus:bg-white"
            placeholder="Ej: Av. de la Racha 404, Col. Bosques del Búho, Ciudad de México"
          />
        </div>

      </div>
    </div>
  );
}
