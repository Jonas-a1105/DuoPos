import React, { useState } from 'react';
import { LegalBillingSettings, TaxCategoryOverride, User } from '../types';
import { Percent, FileText, Building2, Receipt, ShieldCheck, Save, HelpCircle, Sparkles, Plus, Trash2, Key, Info, CheckCircle2, Sliders, Volume2, ChefHat, ShoppingBag, Briefcase, Trophy, Award, Zap, ShieldAlert, Cpu, Laptop, Check, RefreshCw, Database, Globe } from 'lucide-react';
import { playSound } from '../utils/sounds';
import { toast } from './FlashNotifications';
import { LicenseDetails, PLANS, SubscriptionTier, createLicenseOnline, revokeLicenseOnline, listLicensesOnline } from '../utils/licensing';

interface SettingsScreenProps {
  settings: LegalBillingSettings;
  onSaveSettings: (settings: LegalBillingSettings) => void;
  onGrantXp: (amount: number) => void;
  licenseDetails: LicenseDetails;
  onActivateLicenseKey: (key: string, companyName?: string) => Promise<{ success: boolean; message: string }>;
  onResetLicenseToFree: () => void;
  appVersion: string;
  onUpdateAppVersion: (newVersion: string) => void;
  user: User | null;
}

export default function SettingsScreen({
  settings,
  onSaveSettings,
  onGrantXp,
  licenseDetails,
  onActivateLicenseKey,
  onResetLicenseToFree,
  appVersion,
  onUpdateAppVersion,
  user
}: SettingsScreenProps) {
  const [activeSubTab, setActiveSubTab] = useState<'taxes' | 'company' | 'sequence' | 'app' | 'license' | 'updates'>('license');
  const [compilationWrapper, setCompilationWrapper] = useState<'tauri' | 'electron' | 'capacitor'>('tauri');
  
  // Licensing Admin Panel States
  const [licenses, setLicenses] = useState<any[]>([]);
  const [loadingLicenses, setLoadingLicenses] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [adminTier, setAdminTier] = useState<SubscriptionTier>('standard');
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

  React.useEffect(() => {
    if (activeSubTab === 'license' && user?.role === 'admin') {
      fetchLicenses();
    }
  }, [activeSubTab, user?.role]);
  
  // Local states for inputs
  const [taxName, setTaxName] = useState(settings.taxName);
  const [generalTaxRate, setGeneralTaxRate] = useState(settings.generalTaxRate);
  const [taxIncludedInPrice, setTaxIncludedInPrice] = useState(settings.taxIncludedInPrice);
  const [categoryOverrides, setCategoryOverrides] = useState<TaxCategoryOverride[]>(settings.categoryOverrides);

  const [companyName, setCompanyName] = useState(settings.companyName);
  const [companyTaxId, setCompanyTaxId] = useState(settings.companyTaxId);
  const [companyRegime, setCompanyRegime] = useState(settings.companyRegime);
  const [companyPostalCode, setCompanyPostalCode] = useState(settings.companyPostalCode);
  const [companyAddress, setCompanyAddress] = useState(settings.companyAddress);

  const [invoicePrefix, setInvoicePrefix] = useState(settings.invoicePrefix);
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState(settings.nextInvoiceNumber);
  const [automaticMockInvoicing, setAutomaticMockInvoicing] = useState(settings.automaticMockInvoicing);
  const [certifyingAuthority, setCertifyingAuthority] = useState(settings.certifyingAuthority);

  // Local states for custom application preferences
  const [businessProfile, setBusinessProfile] = useState<'gastronomy' | 'market' | 'retail' | 'general'>(settings.businessProfile || 'gastronomy');
  const [currencySymbol, setCurrencySymbol] = useState(settings.currencySymbol || '$');
  const [currencyDecimals, setCurrencyDecimals] = useState(settings.currencyDecimals !== undefined ? settings.currencyDecimals : 2);
  const [enableSounds, setEnableSounds] = useState(settings.enableSounds !== false); // Default true
  const [ticketWidth, setTicketWidth] = useState<'80mm' | '58mm'>(settings.ticketWidth || '80mm');
  const [customTicketHeader, setCustomTicketHeader] = useState(settings.customTicketHeader || '');
  const [customTicketFooter, setCustomTicketFooter] = useState(settings.customTicketFooter || '¡Gracias por su racha de compra!');
  const [kdsDelayMinutes, setKdsDelayMinutes] = useState(settings.kdsDelayMinutes || 10);

  // States for adding a new override
  const [newCategory, setNewCategory] = useState('');
  const [newRate, setNewRate] = useState('');

  // Sello digital mock state
  const [isCsdLoaded, setIsCsdLoaded] = useState(true);
  const [csdFileName, setCsdFileName] = useState('duo_sello_digital_2026.key');
  const [csdPass, setCsdPass] = useState('*************');

  const [saveSuccess, setSaveSuccess] = useState(false);

  // States for desktop app system updates representation
  const [isCheckingOnline, setIsCheckingOnline] = useState(false);
  const [onlineCheckResult, setOnlineCheckResult] = useState<'none' | 'update_found' | 'up_to_date'>('none');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [currentSpeed, setCurrentSpeed] = useState('');
  const [offlineFileName, setOfflineFileName] = useState('');
  const [isApplyingOffline, setIsApplyingOffline] = useState(false);

  const handleAddOverride = () => {
    if (!newCategory.trim() || newRate === '') return;
    const rateVal = parseFloat(newRate);
    if (isNaN(rateVal)) return;

    // Check if category already has an override
    if (categoryOverrides.some(o => o.category.toLowerCase() === newCategory.trim().toLowerCase())) {
      alert('La categoría ya tiene un impuesto asignado.');
      return;
    }

    const updated = [...categoryOverrides, { category: newCategory.trim(), rate: rateVal }];
    setCategoryOverrides(updated);
    setNewCategory('');
    setNewRate('');
    playSound('success');
  };

  const handleRemoveOverride = (category: string) => {
    const updated = categoryOverrides.filter(o => o.category !== category);
    setCategoryOverrides(updated);
    playSound('error');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const updatedSettings: LegalBillingSettings = {
      taxName,
      generalTaxRate: Number(generalTaxRate),
      taxIncludedInPrice,
      categoryOverrides,
      companyName,
      companyTaxId,
      companyRegime,
      companyPostalCode,
      companyAddress,
      invoicePrefix,
      nextInvoiceNumber: Number(nextInvoiceNumber),
      automaticMockInvoicing,
      certifyingAuthority,
      // Extended Settings
      businessProfile,
      currencySymbol,
      currencyDecimals: Number(currencyDecimals),
      enableSounds,
      ticketWidth,
      customTicketHeader,
      customTicketFooter,
      kdsDelayMinutes: Number(kdsDelayMinutes)
    };

    onSaveSettings(updatedSettings);
    onGrantXp(50); // XP gained for legal alignment!
    playSound('levelup');

    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
    }, 4000);
  };

  return (
    <div className="space-y-6 animate-fadeIn font-sans p-1 md:p-3 pb-12 text-gray-800">
      
      {/* HEADER HERO */}
      <div className="bg-[#58cc02] border-2 border-[#3c9e01] border-b-8 rounded-3xl p-5 md:p-6 text-white relative overflow-hidden shadow-xs">
        <div className="absolute right-4 -bottom-4 opacity-15 text-8xl md:text-9xl select-none font-black translate-x-4">
          ⚖️
        </div>
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2">
            <span className="bg-[#ffd700] text-amber-950 text-[10px] font-black uppercase px-2 py-0.5 tracking-wider rounded-lg border border-white leading-none">
              Módulo Fiscal Avanzado 🏛️
            </span>
            <span className="text-white text-xs font-bold font-mono">
              ★ Cumplimiento de Racha Legal
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight leading-none">
            Impuestos y Facturación Electrónica SAT Mock
          </h2>
          <p className="text-xs md:text-sm text-green-50 leading-relaxed max-w-xl font-bold">
            Configura las tasas impositivas por categoría, el cálculo de precios inclusive/neto y emite timbrados fiscales con firma criptográfica simétrica. ¡Gana <strong>+50 XP</strong> de racha comercial al guardar cambios validos!
          </p>
        </div>
      </div>

      {/* THREE-COLUMN STATS OVERVIEW OF TAX INTEGRATION */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white border-2 border-gray-200 rounded-2xl p-4 flex items-center gap-3 shadow-xs">
          <div className="bg-emerald-50 text-emerald-600 p-2.5 rounded-xl border border-emerald-100 font-bold select-none text-lg">
            %
          </div>
          <div>
            <span className="text-[9px] uppercase font-black text-gray-400 block leading-tight">Impuesto Base</span>
            <span className="text-sm font-black text-gray-800 leading-none">
              {taxName} ({generalTaxRate}%)
            </span>
          </div>
        </div>

        <div className="bg-white border-2 border-gray-200 rounded-2xl p-4 flex items-center gap-3 shadow-xs">
          <div className="bg-blue-50 text-blue-600 p-2.5 rounded-xl border border-blue-100 font-bold select-none text-lg">
            📁
          </div>
          <div>
            <span className="text-[9px] uppercase font-black text-gray-400 block leading-tight">Desgloses Asignados</span>
            <span className="text-sm font-black text-gray-800 leading-none">
              {categoryOverrides.length} Categorías Especiales
            </span>
          </div>
        </div>

        <div className="bg-white border-2 border-gray-200 rounded-2xl p-4 flex items-center gap-3 shadow-xs">
          <div className="bg-purple-50 text-purple-600 p-2.5 rounded-xl border border-purple-100 font-bold select-none text-lg">
            📜
          </div>
          <div>
            <span className="text-[9px] uppercase font-black text-gray-400 block leading-tight">Esquema Fiscal de Empresa</span>
            <span className="text-sm font-black text-gray-800 leading-none truncate max-w-[200px]" title={companyTaxId}>
              {companyTaxId || 'No configurado'}
            </span>
          </div>
        </div>
      </div>

      {/* MAIN LAYOUT: SUB-NAV TABS & SUBMIT DESIGN FORM */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* SIDE BAR BUTTONS */}
        <div className="bg-white border-2 border-gray-200 border-b-6 rounded-2xl p-3 space-y-2 lg:col-span-1">
          {[
            { id: 'license', label: 'Planes y Suscripción 🔑', icon: <ShieldCheck size={15} /> },
            { id: 'updates', label: 'Actualizaciones 📥', icon: <RefreshCw size={15} /> },
            { id: 'app', label: 'Perfil / Ajustes App', icon: <Sliders size={15} /> },
            { id: 'taxes', label: 'Estructura de Tasas', icon: <Percent size={15} /> },
            { id: 'company', label: 'Emisor Corporativo', icon: <Building2 size={15} /> },
            { id: 'sequence', label: 'Folio y Certificados', icon: <Receipt size={15} /> }
          ].map((tab) => {
            const isSelected = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => { setActiveSubTab(tab.id as any); playSound('click'); }}
                className={`w-full text-left p-2.5 rounded-xl font-black text-[11px] uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500 text-white border-amber-600 animate-fadeIn'
                    : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}

          <div className="border-t border-dashed border-gray-150 pt-3 mt-3">
            <div className="bg-sky-50 border border-sky-100 rounded-xl p-2.5 text-[10px] text-sky-800 font-bold leading-relaxed flex gap-1.5 items-start">
              <Info size={14} className="text-sky-500 shrink-0 mt-0.5" />
              <span>
                Los precios de los productos en tu almacén pueden configurarse como <strong>Netos</strong> u <strong>Hospedados (inclusive)</strong>.
              </span>
            </div>
          </div>
        </div>

        {/* COMPONENT SETTINGS INPUTS WRAPPER */}
        <div className="bg-white border-2 border-gray-200 border-b-8 rounded-3xl p-5 md:p-6 lg:col-span-3 space-y-6">
          
          {/* TAB 0: APP PROFILES & GENERAL CONFIGURATIONS */}
          {activeSubTab === 'app' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="border-b pb-3 flex items-center gap-2">
                <span className="text-2xl select-none">🛠️</span>
                <div>
                  <h3 className="text-sm font-black uppercase text-gray-800 tracking-tight">Perfil de Especialización y Preferencias App</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">Personaliza el comportamiento del punto de venta</p>
                </div>
              </div>

              {/* Business Profile Picker with beautiful visual choices */}
              <div className="space-y-3">
                <label className="text-[10px] uppercase font-black text-gray-450 tracking-wider block">
                  Perfil del Negocio (Especialización Vertical)
                </label>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Gastronomía */}
                  <button
                    type="button"
                    onClick={() => { setBusinessProfile('gastronomy'); playSound('click'); }}
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
                      <h4 className="font-extrabold text-xs uppercase leading-none">Gastronomía</h4>
                      <p className="text-[10px] text-gray-400 font-semibold mt-1.5 leading-relaxed">
                        Mesas de restaurante, meseros asignables, modificadores de platillo y cocina (KDS).
                      </p>
                    </div>
                  </button>

                  {/* Abastos / Minimarket */}
                  <button
                    type="button"
                    onClick={() => { setBusinessProfile('market'); playSound('click'); }}
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
                      <h4 className="font-extrabold text-xs uppercase leading-none">Abastos / Kiosco</h4>
                      <p className="text-[10px] text-gray-400 font-semibold mt-1.5 leading-relaxed">
                        Venta directa de catálogo con interfaz limpia sin módulos extra de servicios ni simulación de hardware.
                      </p>
                    </div>
                  </button>

                  {/* Comercio / Retail */}
                  <button
                    type="button"
                    onClick={() => { setBusinessProfile('retail'); playSound('click'); }}
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
                      <h4 className="font-extrabold text-xs uppercase leading-none">Comercio Escáner</h4>
                      <p className="text-[10px] text-gray-400 font-semibold mt-1.5 leading-relaxed">
                        Enfoque en códigos de barra, pistola lectora de mostrador y simulación láser de hardware.
                      </p>
                    </div>
                  </button>

                  {/* Servicios Especializados */}
                  <button
                    type="button"
                    onClick={() => { setBusinessProfile('general'); playSound('click'); }}
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
                      <h4 className="font-extrabold text-xs uppercase leading-none">Servicios / General</h4>
                      <p className="text-[10px] text-gray-400 font-semibold mt-1.5 leading-relaxed">
                        Esquema ágil para consultoría u oficios. Habilita creación de servicios ad-hoc al vuelo al cobrar.
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* App Preferences general parameters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Currency Symbol selection */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black text-gray-400 tracking-wider block">
                    Símbolo de Divisa / Moneda
                  </label>
                  <select
                    value={currencySymbol}
                    onChange={(e) => setCurrencySymbol(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-200 text-xs font-bold rounded-xl outline-none focus:border-[#1cb0f6] focus:bg-white text-gray-750 cursor-pointer"
                  >
                    <option value="$">$ USD / MXN / CLP / COP</option>
                    <option value="€">€ Euros</option>
                    <option value="Bs.">Bs. Bolivianos</option>
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
                        onClick={() => { setCurrencyDecimals(dec); playSound('click'); }}
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
                        onClick={() => { setTicketWidth(width as any); playSound('click'); }}
                        className={`flex-1 py-1.5 font-bold text-xs rounded-xl border-2 transition-all cursor-pointer ${
                          ticketWidth === width
                            ? 'border-indigo-550 border-indigo-500 bg-indigo-50 text-indigo-900'
                            : 'border-gray-200 hover:border-gray-300 bg-white text-gray-500'
                        }`}
                      >
                        📂 {width} {width === '80mm' ? '(Estándar/Mesa)' : '(Digital/Portátil)'}
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
                      onChange={(e) => { setEnableSounds(e.target.checked); playSound('success'); }}
                      className="rounded text-[#58cc02] focus:ring-[#58cc02] h-4 w-4 border-gray-300 cursor-pointer"
                    />
                    <span className="text-[10px] font-black text-slate-705 uppercase select-none">Habilitar Efectos Sonoros</span>
                  </label>
                </div>

                {/* KDS delay minutes trigger threshold */}
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] uppercase font-black text-gray-400 tracking-wider block">
                    Alerta de Demoras en Monitor Cocina (KDS)
                  </label>
                  <div className="flex items-center gap-3 bg-slate-10 bg-[#fafafa] border p-3 rounded-2xl">
                    <div className="font-bold text-xs text-slate-500 max-w-sm">
                      Indica cuántos minutos puede tardar una comanda en preparación antes de marcarse en rojo parpadeante en el KDS.
                    </div>
                    <div className="relative shrink-0 w-32">
                      <input
                        type="number"
                        min="2"
                        max="60"
                        value={kdsDelayMinutes}
                        onChange={(e) => setKdsDelayMinutes(Number(e.target.value))}
                        className="w-full px-3 py-1.5 bg-white border-2 border-gray-250 text-xs font-black rounded-lg outline-none font-mono text-center"
                      />
                      <span className="absolute right-2.5 top-1.5 text-[9px] text-gray-400 font-extrabold pb-0.5">MINS</span>
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
                    className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-200 text-xs font-bold rounded-xl outline-none focus:border-[#1cb0f6] focus:bg-white"
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
                    className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-200 text-xs font-bold rounded-xl outline-none focus:border-[#1cb0f6] focus:bg-white"
                    placeholder="Ej: Recuerda registrar tu racha y ganar gemas en nuestra app"
                  />
                </div>

              </div>
            </div>
          )}

          {/* TAB: SYSTEM UPDATES & OFFLINE PATCHES */}
          {activeSubTab === 'updates' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="border-b pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl select-none font-black text-amber-500">📥</span>
                  <div>
                    <h3 className="text-sm font-black uppercase text-gray-800 tracking-tight">Centro de Actualizaciones DuoPOS (.exe)</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Gestión de versiones online OTA y carga manual para entornos offline</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-gray-100 text-gray-700 text-[10px] font-black uppercase px-2.5 py-1 rounded-xl">
                    Compilación: Windows x64 Native C# Wrapper
                  </span>
                </div>
              </div>

              {/* CURRENT VERSION METADATA BOARD */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border-2 border-gray-200 rounded-2xl p-4 space-y-2">
                  <span className="text-[9px] uppercase font-black tracking-widest text-gray-400 block leading-none">Versión Instalada</span>
                  <div className="text-md font-black text-slate-800 flex items-center gap-1.5 pt-1">
                    <Laptop size={16} className="text-[#1cb0f6]" />
                    <span>{appVersion}</span>
                  </div>
                  <p className="text-[9.5px] font-bold text-gray-400 uppercase leading-none mt-2">Firma Local Validada por Duo Guard</p>
                </div>

                <div className="bg-white border-2 border-gray-200 rounded-2xl p-4 space-y-2">
                  <span className="text-[9px] uppercase font-black tracking-widest text-gray-450 block leading-none">Motor de Datos</span>
                  <div className="text-md font-black text-slate-800 flex items-center gap-1.5 pt-1">
                    <Cpu size={16} className="text-emerald-500" />
                    <span>SQLite Embedded Mode</span>
                  </div>
                  <p className="text-[9.5px] font-bold text-gray-405 uppercase leading-none mt-2">Sincronización del Diálogo Diferida</p>
                </div>

                <div className="bg-white border-2 border-gray-200 rounded-2xl p-4 space-y-2">
                  <span className="text-[9px] uppercase font-black tracking-widest text-gray-450 block leading-none">Canal de Distribución</span>
                  <div className="text-md font-black text-slate-800 flex items-center gap-1.5 pt-1">
                    <RefreshCw size={16} className="text-amber-500" />
                    <span>Producción Estable (LTS)</span>
                  </div>
                  <p className="text-[9.5px] font-bold text-gray-405 uppercase leading-none mt-2">Actualizaciones de Seguridad Críticas</p>
                </div>
              </div>

              {/* TWO PATHS GRID: ONLINE OTA & OFFLINE DISCONNECTED */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                
                {/* COLUMN 1: ONLINE UPDATE CHECKER */}
                <div className="bg-linear-to-b from-gray-50 to-white border-2 border-gray-200 rounded-2xl p-5 space-y-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="p-1 rounded-lg bg-sky-50 text-sky-600 border border-sky-200"><RefreshCw size={15} /></span>
                      <h4 className="text-xs font-black text-gray-800 uppercase tracking-tight">Servicio OTA Online (Over-The-Air)</h4>
                    </div>
                    <p className="text-[10px] text-gray-400 font-extrabold uppercase leading-none">Verificación directa contra los servidores oficiales de DuoPOS</p>
                    <p className="text-xs text-gray-600 leading-relaxed pt-1">
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
                      <p className="text-[10px] text-emerald-750 uppercase leading-normal">
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
                          
                          // Simulating step-by-step installation progress
                          const steps = [
                            { progress: 10, text: 'Consiguiendo manifiesto oficial de descarga...' },
                            { progress: 25, text: 'Descargando paquete binario delta (duopos_v2.5_diff.upd)...' },
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
                        className="w-full py-2 bg-gradient-to-r from-emerald-500 to-emerald-650 bg-emerald-500 text-white border-b-4 border-emerald-700 hover:brightness-105 active:border-b-0 active:translate-y-1 rounded-xl text-center uppercase font-black text-xs cursor-pointer select-none block"
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

                      {/* Cool Progress Bar */}
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

                {/* COLUMN 2: OFFLINE DISCONNECTED UPDATES (VIA USB/PENDREIVE) */}
                <div className="bg-linear-to-b from-gray-50 to-white border-2 border-gray-200 rounded-2xl p-5 space-y-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="p-1 rounded-lg bg-purple-50 text-purple-600 border border-purple-200"><Cpu size={15} /></span>
                      <h4 className="text-xs font-black text-gray-800 uppercase tracking-tight">Actualización Manual por Lápiz USB (.upd)</h4>
                    </div>
                    <p className="text-[10px] text-purple-400 font-extrabold uppercase leading-none">Carga local de parches certificados para terminales desconectadas</p>
                    <p className="text-xs text-gray-600 leading-relaxed pt-1">
                      Excelente función para tiendas físicas remotas o bodegas sin acceso a Internet. Arrastra o selecciona el archivo binario <strong className="text-slate-800 font-bold">.upd</strong> descargado previamente desde tu consola de soporte.
                    </p>
                  </div>

                  {/* Manual Drag and Drop emulation zone */}
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
                            alert(`🤖 ACTUALIZACIÓN MANUAL DETECTADA:\n\nSe ha aplicado corectamente el parche binario local offline "${offlineFileName}". Tu aplicación DuoPOS.exe se ha actualizado a v2.5.0-BúhoGaláctico satisfactoriamente.`);
                          }, 2500);
                        }}
                        className="flex-1 py-2 bg-purple-505 bg-purple-500 hover:bg-purple-400 text-white border-b-4 border-purple-755 border-purple-705 rounded-xl text-center uppercase font-black text-xs cursor-pointer select-none"
                      >
                        {isApplyingOffline ? 'Aplicando Parches...' : 'Aplicar Parche USB'}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          playSound('error');
                          setOfflineFileName('');
                        }}
                        className="px-3 bg-red-50 text-red-500 border-2 border-red-200 hover:bg-red-100 active:bg-gray-200 rounded-xl font-bold text-xs cursor-pointer"
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

                  {/* HELP CORNER AND LOGS FOR MANUAL INSTALLATION */}
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[10px] text-amber-900 font-bold leading-normal flex gap-2">
                    <span className="text-base select-none">💡</span>
                    <div className="space-y-1 uppercase">
                      <p className="font-extrabold text-amber-950">¿Cómo verificar la racha de actualización?</p>
                      <p className="text-gray-500 lowercase leading-relaxed font-semibold">
                        Puedes descargar la clave (.upd) de tu sucursal ingresando a la consola administrativa de DuoPOS en tu navegador. Luego pásalo al pendrive para que la tienda opere 100% desconectada de Internet.
                      </p>
                    </div>
                  </div>
                </div>

              </div>

              {/* DYNAMIC TEMPLATES DEFINITIONS */}
              {(() => {
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
                  <div className="space-y-6 pt-4 border-t-2 border-dashed border-gray-200">
                    
                    {/* SYSTEM PACKAGING CENTER GRID */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      
                      {/* COMPILATION AND WRAPPER COMPILER BOARD */}
                      <div className="bg-white border-2 border-gray-200 border-b-[6px] rounded-3xl p-5 space-y-4">
                        <span className="text-[9px] uppercase font-black tracking-widest text-purple-600 block leading-none">Wrapper & Native Bundler</span>
                        <div className="flex items-center gap-1.5">
                          <Laptop size={18} className="text-purple-600 animate-pulse" />
                          <h4 className="text-sm font-black text-gray-850 uppercase tracking-tight leading-none pt-1">Centro de Compilación (.EXE/.APK)</h4>
                        </div>
                        <p className="text-xs text-gray-500 font-bold uppercase leading-normal">
                          ¿Quieres ejecutar DuoPOS como software local .exe instalable o app Android nativa en lugar de acceder desde el navegador? ¡Usa nuestros envolventes listos para compilar!
                        </p>

                        {/* Wrapper Selector */}
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
                                  : 'bg-white border text-gray-650 hover:bg-gray-100'
                              }`}
                            >
                              {w.label}
                            </button>
                          ))}
                        </div>

                        {compilationWrapper === 'tauri' && (
                          <div className="space-y-3 animate-fadeIn text-slate-800">
                            <div className="bg-purple-50 border border-purple-150 rounded-2xl p-4 text-xs font-bold text-purple-950 space-y-2 uppercase leading-normal">
                              <p className="font-black text-purple-700">🔥 ¿Por qué Tauri para tu .EXE?</p>
                              <p className="font-semibold text-gray-500 lowercase leading-relaxed">Tauri compila tu sitio React a binarios nativos de menos de 10MB que corren ultra-rápido y con bajísimo consumo de memoria RAM (menos de 40MB).</p>
                              <div className="bg-white rounded-xl p-3 border border-purple-100 space-y-1 text-[9.5px]">
                                <p className="text-[#7c3aed] font-black">⚙️ MASA DE OBRA DE COMPILACIÓN:</p>
                                <p className="text-gray-500 font-bold lowercase">1. Instala: <span className="font-mono text-slate-800 bg-gray-100 p-0.5 rounded px-1">npm install @tauri-apps/cli -D</span></p>
                                <p className="text-gray-500 font-bold lowercase">2. Corre: <span className="font-mono text-slate-805 bg-gray-100 p-0.5 rounded px-1">npx tauri init</span> y copia la config en <span className="font-mono text-slate-805 bg-gray-100 p-0.5 rounded px-1">src-tauri/tauri.conf.json</span></p>
                                <p className="text-gray-500 font-bold lowercase">3. Compila con: <span className="font-mono text-slate-805 bg-gray-100 p-0.5 rounded px-1">npx tauri build</span> para obtener tu instalador <span className="font-mono text-[#58cc02] bg-[#e5f6ff] p-0.5 rounded px-1 font-black">.EXE / .MSI / .DMG</span></p>
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
                                  className="text-[9px] bg-slate-100 hover:bg-purple-100 hover:text-purple-700 border font-black px-2 py-1 rounded-md uppercase cursor-pointer"
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
                                <p className="text-gray-400 font-bold lowercase">1. Ejecuta: <span className="font-mono text-slate-800 bg-gray-100 p-0.5 rounded px-1">npm install electron electron-builder -D</span></p>
                                <p className="text-gray-400 font-bold lowercase">2. Genera un archivo <span className="font-mono text-slate-800 bg-gray-105 p-0.5 rounded px-1">main.js</span> en la raíz de tu proyecto e instala la estructura de abajo.</p>
                                <p className="text-gray-400 font-bold lowercase">3. Corre: <span className="font-mono text-slate-805 bg-gray-105 p-0.5 rounded px-1">npx electron-builder build --win</span> para generar el instalador de Windows <span className="font-mono text-[#1cb0f6] bg-blue-50 p-0.5 rounded px-1 font-black">DuoPOS-setup.exe</span></p>
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
                                    alert('📋 ¡Código de Electron copiado al portapapeles!');
                                  }}
                                  className="text-[9px] bg-slate-100 hover:bg-purple-100 hover:text-purple-750 border font-black px-2 py-1 rounded-md uppercase cursor-pointer"
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
                            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-xs font-bold text-emerald-950 space-y-2 uppercase leading-normal">
                              <p className="font-black text-emerald-600">📱 ¿Por qué Capacitor para tu Android .APK?</p>
                              <p className="font-semibold text-gray-550 lowercase">Capacitor de Ionic te permite empaquetar tu código web y transpilarlo instantáneamente a un instalador de Android (.apk) nativo que puedes cargar vía USB en tablets o celulares.</p>
                              <div className="bg-white rounded-xl p-3 border border-emerald-100 space-y-1 text-[9.5px]">
                                <p className="text-emerald-700 font-black">⚙️ PASOS PARA COMPILAR TU .APK NATIVO:</p>
                                <p className="text-gray-450 font-bold lowercase">1. Instala: <span className="font-mono text-slate-850 bg-gray-100 p-0.5 rounded px-1">npm install @capacitor/core @capacitor/cli @capacitor/android -D</span></p>
                                <p className="text-gray-450 font-bold lowercase">2. Corre: <span className="font-mono text-slate-850 bg-gray-100 p-0.5 rounded px-1">npx cap init</span> y luego <span className="font-mono text-slate-850 bg-gray-100 p-0.5 rounded px-1">npx cap add android</span></p>
                                <p className="text-gray-450 font-bold lowercase">3. Transpila montajes con: <span className="font-mono text-slate-850 bg-gray-105 p-0.5 rounded px-1">npm run build && npx cap sync</span> abriendo Android Studio para compilar.</p>
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
                                    alert('📋 ¡Configurador de Capacitor copiado!');
                                  }}
                                  className="text-[9px] bg-slate-100 hover:bg-purple-100 hover:text-purple-750 border font-black px-2 py-1 rounded-md uppercase cursor-pointer"
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
                                
                                // Schema declarations
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
                                
                                // Inserts
                                sqlDump += `-- --- SEMBRANDO PRODUCTOS ACTUALES (${parsedProds.length} REGISTROS) ---\n`;
                                parsedProds.forEach((p: any) => {
                                  sqlDump += `INSERT INTO products (id, name, category, price, cost, stock, emoji) VALUES ('${p.id}', '${p.name?.replace(/'/g, "''")}', '${p.category?.replace(/'/g, "''")}', ${p.price}, ${p.cost}, ${p.stock}, '${p.emoji}');\n`;
                                });
                                sqlDump += `\n`;
                                
                                sqlDump += `-- --- SEMBRANDO VENTAS LOCALES (${parsedTrans.length} REGISTROS) ---\n`;
                                parsedTrans.forEach((t: any) => {
                                  sqlDump += `INSERT INTO transactions (id, date, total, payment_method) VALUES ('${t.id}', '${t.date}', ${t.total}, '${t.paymentMethod || 'Efectivo'}');\n`;
                                });
                                
                                // Trigger file download
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
                                alert('✅ ¡Base de datos SQLite generada con éxito!\n\nSe ha descargado el archivo "duopos_sqlite_seed.sql" con todo tu catálogo actual estructurado en SQLite puro. Has obtenido +100 XP extras por robustecimiento de base de datos PC.');
                              } catch (err) {
                                alert('Error al compilar SQLite Script: ' + err);
                              }
                            }}
                            className="w-full bg-[#58cc02] hover:bg-[#61e002] active:bg-[#46a302] text-white py-3 border-b-4 border-[#3c8c01] hover:translate-y-[-2px] hover:shadow-md transition-all rounded-2xl flex items-center justify-center gap-1.5 font-black text-xs uppercase tracking-wider cursor-pointer select-none"
                          >
                            <Database size={15} /> Generar SQL Dump para SQLite (.SQL)
                          </button>
                          
                          <p className="text-[10px] text-gray-400 font-bold uppercase text-center mt-1">Sincronización instantánea validada por Duo Guard</p>
                        </div>
                      </div>

                    </div>

                    {/* FREE GLOBAL CLOUD HOSTING DESPLOY CENTER SECTION */}
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-orange-200/50 rounded-3xl p-5 md:p-6 space-y-4">
                      <span className="text-[9px] uppercase font-black tracking-widest text-orange-600 block leading-none">Cloud Computing & Deploy</span>
                      <div className="flex items-center gap-1.5">
                        <Globe size={18} className="text-orange-600 font-bold" />
                        <h4 className="text-sm font-black text-gray-850 uppercase tracking-tight leading-none pt-1">Guía para subir la aplicación online gratis en servidores</h4>
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed font-bold uppercase leading-normal">
                        ¿Quieres colocar de verdad esta aplicación en internet para que cualquiera acceda mediante un enlace público o página web sin instalar nada, de forma absolutamente estable y GRATUITA? Sigue este mapa de ruta corporativo:
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                        
                        {/* STEP 1: GITHUB COPIES */}
                        <div className="bg-white border-2 border-gray-150 p-4 rounded-2xl space-y-2 flex flex-col justify-between">
                          <div className="space-y-1.5">
                            <span className="bg-gray-100 text-gray-750 font-black px-1.5 rounded text-[8px] uppercase">PASO 1: Subir código</span>
                            <h5 className="font-extrabold text-xs text-purple-950 uppercase tracking-tight">Vincular a GitHub</h5>
                            <p className="text-[10px] text-gray-400 font-bold tracking-tight lowercase leading-relaxed">Exporta tu código en tu AI Studio usando el menú superior derecho (botón Descargar ZIP) o súbelo usando git directamente desde tu ordenador para tener tu repositorio en la nube.</p>
                          </div>
                        </div>

                        {/* STEP 2: MULTI CLOUD VPS PROVIDERS */}
                        <div className="bg-white border-2 border-gray-150 p-4 rounded-2xl space-y-2 flex flex-col justify-between">
                          <div className="space-y-1.5">
                            <span className="bg-blue-50 text-blue-600 border border-blue-100 font-black px-1.5 rounded text-[8px] uppercase">PASO 2: Proveedor Elástico</span>
                            <h5 className="font-extrabold text-xs text-purple-950 uppercase tracking-tight">Elegir Servidor Gratis</h5>
                            <p className="text-[10px] text-gray-400 font-bold tracking-tight lowercase leading-relaxed">Crea una cuenta gratuita en una de estas tres plataformas gigantes mundiales de hospedaje elástico que tienen tiers gratuitos permanentes:</p>
                            <ul className="text-[9px] text-slate-805 font-black space-y-0.5 uppercase tracking-tight mt-1">
                              <li>◆ VERCEL (Excelente para tu frontend React)</li>
                              <li>◆ RAILWAY (Hospeda Express Server backend de forma gratis)</li>
                              <li>◆ NETLIFY (Excelente alternativa estática)</li>
                            </ul>
                          </div>
                        </div>

                        {/* STEP 3: RECTIFIED AUTOPROVISIONING */}
                        <div className="bg-white border-2 border-gray-150 p-4 rounded-2xl space-y-2 flex flex-col justify-between">
                          <div className="space-y-1.5">
                            <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 font-black px-1.5 rounded text-[8px] uppercase">PASO 3: Lanzar al aire</span>
                            <h5 className="font-extrabold text-xs text-purple-950 uppercase tracking-tight">Enlazar y Sincronizar</h5>
                            <p className="text-[10px] text-gray-400 font-bold tracking-tight lowercase leading-relaxed">Vincula tu cuenta de GitHub con Vercel/Railway. Al seleccionar este repositorio, la nube compilará el código y te dará un enlace único seguro HTTPS para compartir.</p>
                          </div>
                        </div>

                      </div>

                      <div className="bg-orange-100/40 border border-orange-200/50 rounded-2xl p-4 flex gap-3 text-xs text-orange-900 font-bold uppercase text-[9.5px]">
                        <span className="text-xl">🚀🎖️</span>
                        <div className="flex-1 space-y-1 lowercase">
                          <p className="text-orange-950 font-black uppercase tracking-tight leading-none">¡Conexión y DNS Segura HTTPS Gratis Incluida!</p>
                          <p className="text-gray-500 font-bold">Estas plataformas te otorgan certificados SSL/TLS (HTTPS) automáticamente de forma ilimitada para que cargues tus ventas en tu celular o PC de oficina de manera segura y confidencial en internet.</p>
                        </div>
                      </div>
                    </div>

                  </div>
                );
              })()}

              {/* DEMO TOOLBAR TO REVERT BACK TO v1.8 FOR TESTING */}
              {appVersion === 'v2.5.0-BúhoGaláctico' && (
                <div className="bg-slate-100 border-2 border-dashed border-gray-350 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-widest block">🔧 Control de Pruebas Corporativas</span>
                    <p className="text-[10.5px] font-bold text-gray-400 uppercase leading-none">Permitirá restablecer la compilación para observar el ciclo otra vez.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      playSound('error');
                      onUpdateAppVersion('v1.8-Stable');
                      setOnlineCheckResult('none');
                      alert('Se ha degradado el punto de venta a v1.8-Stable para simular nuevamente los procesos de actualización.');
                    }}
                    className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-red-500 rounded-xl font-black text-[10px] uppercase cursor-pointer"
                  >
                    Restablecer a v1.8-Stable
                  </button>
                </div>
              )}

            </div>
          )}

          {/* TAB: PLANS AND OFFLINE LICENSE ACTIVATION */}
          {activeSubTab === 'license' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="border-b pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl select-none font-black text-amber-500">🔑</span>
                  <div>
                    <h3 className="text-sm font-black uppercase text-gray-800 tracking-tight">Gestión de Suscripciones y Licencias Offline (.exe)</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Control de cuotas de almacén y firmas criptográficas del sistema</p>
                  </div>
                </div>
                {licenseDetails.activated ? (
                  <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-black uppercase px-2.5 py-1 rounded-xl flex items-center gap-1">
                    <span className="h-2 w-2 bg-emerald-500 rounded-full animate-ping" />
                    LICENCIA ACTIVA
                  </span>
                ) : (
                  <span className="bg-amber-150 bg-amber-50 text-amber-800 border border-amber-300 text-[10px] font-black uppercase px-2.5 py-1 rounded-xl">
                    MODO DEMO / TRIAL
                  </span>
                )}
              </div>

              {/* CURRENT LICENSE DIAGNOSTIC STATUS BOARD */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* STATUS SUMMARY */}
                <div className="bg-linear-to-br from-slate-900 to-slate-800 border-2 border-slate-950 text-white rounded-2xl p-5 space-y-4 relative overflow-hidden">
                  <div className="absolute right-2 -bottom-2 text-7xl select-none opacity-10">💻</div>
                  <span className="text-[9px] uppercase font-black tracking-widest text-[#58cc02] bg-[#58cc02]/10 border border-[#58cc02]/30 px-2 py-0.5 rounded-lg">
                    Suscripción Actual
                  </span>
                  <div>
                    <div className="flex items-center gap-2 text-2xl font-black">
                      <span className="text-3xl">{PLANS[licenseDetails.tier]?.emoji || '🦉'}</span>
                      <span>{PLANS[licenseDetails.tier]?.name || 'Invitado'}</span>
                    </div>
                    <p className="text-xs text-slate-350 mt-1 leading-relaxed">
                      {PLANS[licenseDetails.tier]?.description}
                    </p>
                  </div>

                  <div className="border-t border-slate-700/60 pt-3 flex items-center justify-between gap-2 text-xs">
                    <div>
                      <span className="text-[9px] uppercase text-slate-400 block font-semibold">Tipo de Entorno</span>
                      <span className="font-extrabold text-[#1cb0f6] flex items-center gap-1">
                        <Laptop size={12} />
                        Aplicación de Escritorio Offline (.exe)
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] uppercase text-slate-400 block font-semibold">Expiración</span>
                      <span className="font-extrabold text-amber-450 text-amber-400">
                        {licenseDetails.expiresAt === 'Nunca' ? 'Racha Permanente ♾️' : licenseDetails.expiresAt}
                      </span>
                    </div>
                  </div>
                </div>

                {/* LIMITS SANDBOX METER */}
                <div className="bg-white border-2 border-gray-250 rounded-2xl p-4 flex flex-col justify-between space-y-3.5">
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
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
                <div className="flex items-start gap-3">
                  <div className="bg-amber-100 text-amber-800 p-2.5 rounded-xl border border-amber-200 shrink-0">
                    <Cpu size={18} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-black text-gray-800 uppercase">Firma Digital e Identificador de Hardware</h4>
                    <p className="text-[10px] text-gray-400 font-extrabold leading-normal uppercase">
                      Seguridad matemática para compilaciones de escritorio sin conexión a Internet
                    </p>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      El instalable <strong className="text-slate-800 font-bold">DuoPOS.exe</strong> está diseñado para operar en zonas de baja cobertura o directamente en terminales independientes de cobro. Las licencias se firman digitalmente usando un algoritmo simétrico basado en tu Fingerprint de Hardware único:
                    </p>
                  </div>
                </div>

                {/* Fingerprint key code card */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white border-2 border-gray-250 p-3.5 rounded-xl">
                  <div className="space-y-1">
                    <span className="text-[9px] uppercase font-black text-gray-400 block leading-none">
                      Huella del Sistema (Hardware Fingerprint Seed)
                    </span>
                    <span className="font-mono text-xs font-black text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border tracking-wider select-all inline-block">
                      {licenseDetails.offlineActivationSeed}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] text-gray-400 font-bold uppercase italic mr-1">
                      (Criptografía offline activa de DuoPOS)
                    </span>
                  </div>
                </div>

                {/* Key activation interactive form inputs */}
                <div className="pt-2 border-t border-dashed">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                    <div className="md:col-span-2 space-y-1">
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
                          className="px-3 bg-red-50 text-red-500 border-2 border-red-200 hover:bg-red-100 active:bg-red-200 rounded-xl font-black text-xs cursor-pointer"
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
                      <div className="flex items-center gap-1.5">
                        <Key size={16} className="text-indigo-600 animate-pulse" />
                        <span className="text-xs font-black text-indigo-950 uppercase tracking-wide">
                          🔑 Control de Licencias SaaS (Solo Admin)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={fetchLicenses}
                        disabled={loadingLicenses}
                        className="flex items-center gap-1 text-[9px] font-black uppercase text-indigo-700 bg-indigo-100 hover:bg-indigo-200 px-2.5 py-1 rounded-lg transition-all cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw size={10} className={loadingLicenses ? 'animate-spin' : ''} />
                        Actualizar
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end bg-white border border-indigo-100 p-3 rounded-xl">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-black text-indigo-800 tracking-wider block">
                          Nivel de Plan
                        </label>
                        <select
                          value={adminTier}
                          onChange={(e) => setAdminTier(e.target.value as SubscriptionTier)}
                          className="w-full text-xs font-bold px-3 py-2 bg-slate-50 border border-gray-300 rounded-lg outline-none focus:border-indigo-500"
                        >
                          <option value="standard">Plan Standard (⚡)</option>
                          <option value="pro">Plan Pro (🏆)</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-black text-indigo-800 tracking-wider block">
                          Cliente / Notas Internas
                        </label>
                        <input
                          type="text"
                          value={adminNotes}
                          onChange={(e) => setAdminNotes(e.target.value)}
                          placeholder="Ej: Inversiones C.A."
                          className="w-full text-xs font-bold px-3 py-2 bg-slate-50 border border-gray-300 rounded-lg outline-none focus:border-indigo-500"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={async () => {
                          const res = await createLicenseOnline(adminTier, adminNotes);
                          if (res.success) {
                            setAdminNotes('');
                            playSound('levelup');
                            fetchLicenses();
                            alert(`Licencia creada con éxito en Supabase:\n\n${res.data?.license_key}`);
                          } else {
                            playSound('error');
                            alert(`Error: ${res.error}`);
                          }
                        }}
                        className="w-full py-2 bg-indigo-600 text-white hover:bg-indigo-500 rounded-lg text-center uppercase font-black text-xs cursor-pointer select-none transition-all"
                      >
                        Generar Licencia
                      </button>
                    </div>

                    <div className="space-y-2">
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
                            <div key={lic.id} className="p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50 transition-all text-[11px]">
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
                                  <div className="text-[9px] text-slate-500 font-bold uppercase leading-none">
                                    Activo en: <span className="font-mono text-gray-700">{lic.activated_by}</span> {lic.company_name ? `(${lic.company_name})` : ''}
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(lic.license_key);
                                    toast.success('Clave copiada al portapapeles.');
                                  }}
                                  className="px-2 py-1 border border-indigo-200 text-indigo-700 hover:bg-indigo-50 rounded-md font-black text-[9px] uppercase cursor-pointer"
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
                                    className="px-2 py-1 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-md font-black text-[9px] uppercase cursor-pointer"
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
              <div className="space-y-3 pt-2">
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
                            <span className="text-2xl">{plan.emoji}</span>
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
                            <div className="w-full py-1.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl font-black text-[9px] uppercase tracking-wider text-center block">
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
                              className="w-full py-1.5 bg-indigo-50 border border-indigo-250 hover:bg-indigo-100 text-indigo-700 rounded-xl font-black text-[9px] uppercase text-center block transition-all cursor-pointer"
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
          )}

          {/* TAB 1: TAX STRUCTURE & OVERRIDES */}
          {activeSubTab === 'taxes' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="border-b pb-3 flex items-center gap-2">
                <span className="text-2xl select-none">📊</span>
                <div>
                  <h3 className="text-sm font-black uppercase text-gray-800 tracking-tight">Tasas de Impuestos y Desglose Mecánico</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">Define cómo se calcula el cobro al cliente</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Tax Name */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black text-gray-400 tracking-wider block">
                    Nombre Legal del Impuesto
                  </label>
                  <input
                    type="text"
                    value={taxName}
                    onChange={(e) => setTaxName(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-200 text-xs font-bold rounded-xl outline-none focus:border-[#1cb0f6] focus:bg-white"
                    placeholder="Ej: IVA, IGV, Sales Tax, GST"
                  />
                </div>

                {/* Base Rate */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black text-gray-400 tracking-wider block">
                    Porcentaje de Tasa General (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={generalTaxRate}
                      onChange={(e) => setGeneralTaxRate(Number(e.target.value))}
                      className="w-full pl-3 pr-7 py-2 bg-gray-50 border-2 border-gray-200 text-xs font-black rounded-xl outline-none focus:border-[#1cb0f6] focus:bg-white font-mono"
                      placeholder="16"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-gray-400 font-black">%</span>
                  </div>
                </div>
              </div>

              {/* Price Calculation Mode: inclusive or exclusive */}
              <div className="bg-[#fafafa] border-2 border-gray-150 p-4 rounded-2xl space-y-3.5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase bg-[#ff9600] text-white px-2 py-0.5 rounded-lg border leading-none select-none">
                      Método de Cálculo 🧮
                    </span>
                    <h4 className="text-xs font-black text-gray-850">Precios de Almacén incluyen impuesto (Suma Interna)</h4>
                    <p className="text-[10px] text-gray-400 font-bold leading-normal">
                      Si está <strong>Activado</strong>, un producto de $116 con 16% de {taxName} tendrá un subtotal de $100 y ${taxName} de $16. Si está <strong>Desactivado</strong>, se le sumará el 16% al cobrar ($116 sub + $18.56 impuesto = $134.56 total).
                    </p>
                  </div>

                  <div className="shrink-0 pt-1">
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={taxIncludedInPrice}
                        onChange={(e) => { setTaxIncludedInPrice(e.target.checked); playSound('click'); }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#58cc02]" />
                    </label>
                  </div>
                </div>
              </div>

              {/* Category Tax Overrides (Impuestos Diferenciados) */}
              <div className="space-y-4 pt-1">
                <div className="bg-sky-50 border border-sky-150 p-3 rounded-2xl flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-black text-sky-950">Impuestos Diferenciados por Categoría</h4>
                    <p className="text-[9px] text-sky-700 font-bold">Asigna tasas del 0% o exenciones a categorías como alimentos, refrescos o servicios especiales.</p>
                  </div>
                  <span className="text-xl select-none">🍯</span>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {categoryOverrides.length === 0 ? (
                    <p className="text-[10px] text-gray-300 font-bold italic text-center py-2">Ningún impuesto diferenciado por categoría asignado. Todas usan la tasa general.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {categoryOverrides.map((over) => (
                        <div key={over.category} className="bg-white border-2 border-gray-150 p-2.5 rounded-xl flex items-center justify-between text-xs">
                          <div>
                            <span className="font-extrabold text-gray-500 text-[10px] block uppercase leading-tight">Categoría</span>
                            <span className="font-black text-gray-800">{over.category}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-black font-mono text-[#58cc02] bg-green-50 px-2 py-1 rounded-lg border border-green-150 text-[11px]">{over.rate}% Tasa</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveOverride(over.category)}
                              className="text-red-400 hover:text-red-650 p-1 hover:bg-red-50 rounded-lg transition-colors border select-none cursor-pointer"
                              title="Eliminar tasa especial"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Form to append new override */}
                <div className="bg-gray-50 border p-3 rounded-2xl space-y-3">
                  <span className="text-[9px] uppercase font-black text-gray-400 block tracking-wider">Añadir Tasa Especial por Categoría</span>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
                    
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-black text-gray-400 block">Categoría de Almacén</label>
                      <input
                        type="text"
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        placeholder="Ej: Alimentos, Cafetería"
                        className="w-full px-3 py-1.5 border rounded-xl text-xs font-bold outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-black text-gray-400 block">Tasa impositiva (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={newRate}
                        onChange={(e) => setNewRate(e.target.value)}
                        placeholder="0 u 8"
                        className="w-full px-3 py-1.5 border rounded-xl text-xs font-bold outline-none font-mono"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleAddOverride}
                      className="py-1.5 bg-[#1cb0f6] text-white border-b-2 border-sky-600 rounded-xl font-black text-[10px] uppercase text-center cursor-pointer hover:bg-sky-400 active:translate-y-px h-8 flex items-center justify-center gap-1 leading-none"
                    >
                      <Plus size={11} strokeWidth={3} />
                      <span>Registrar Tasa</span>
                    </button>

                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: COMPANY ISSUING PARAMETERS */}
          {activeSubTab === 'company' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="border-b pb-3 flex items-center gap-2">
                <span className="text-2xl select-none">🏢</span>
                <div>
                  <h3 className="text-sm font-black uppercase text-gray-800 tracking-tight">Emisor de Facturación Legal</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">Datos fiscales corporativos para validez fiscal</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Fiscal Name */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black text-gray-400 tracking-wider block">
                    Denominación o Razón Social *
                  </label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-200 text-xs font-bold rounded-xl outline-none focus:border-[#1cb0f6] focus:bg-white"
                    placeholder="DUO ACADEMIA EDITORIAL S.A. DE C.V."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Tax Identification Document / RFC */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-black text-gray-400 tracking-wider block">
                      Registro de Identificación Fiscal (RFC / Tax ID) *
                    </label>
                    <input
                      type="text"
                      required
                      value={companyTaxId}
                      onChange={(e) => setCompanyTaxId(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-200 text-xs font-black rounded-xl outline-none focus:border-[#1cb0f6] focus:bg-white font-mono uppercase"
                      placeholder="Ej: DAC120525D10"
                    />
                  </div>

                  {/* Postal Code */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-black text-gray-400 tracking-wider block">
                      Código Postal Fiscal *
                    </label>
                    <input
                      type="text"
                      required
                      value={companyPostalCode}
                      onChange={(e) => setCompanyPostalCode(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-200 text-xs font-bold rounded-xl outline-none focus:border-[#1cb0f6] focus:bg-white font-mono"
                      placeholder="06700"
                    />
                  </div>
                </div>

                {/* Fiscal Regime */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black text-gray-400 tracking-wider block">
                    Régimen Fiscal Legal
                  </label>
                  <select
                    value={companyRegime}
                    onChange={(e) => setCompanyRegime(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-200 text-xs font-bold rounded-xl outline-none focus:border-[#1cb0f6] focus:bg-white cursor-pointer select-none text-gray-700"
                  >
                    <option value="601 - Regimen General de Ley Personas Morales">601 - Regimen General de Ley Personas Morales</option>
                    <option value="603 - Personas Morales con Fines no Lucrativos">603 - Personas Morales con Fines no Lucrativos</option>
                    <option value="626 - Regimen Simplificado de Confianza (RESICO)">626 - Regimen Simplificado de Confianza (RESICO)</option>
                    <option value="612 - Personas Físicas con Actividades Empresariales">612 - Personas Físicas con Actividades Empresariales</option>
                    <option value="Regimen de Incorporación Fiscal (RIF)">Regimen de Incorporación Fiscal (RIF)</option>
                  </select>
                </div>

                {/* Fiscal address */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black text-gray-400 tracking-wider block">
                    Domicilio Fiscal Legal Completo
                  </label>
                  <input
                    type="text"
                    value={companyAddress}
                    onChange={(e) => setCompanyAddress(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-200 text-xs font-bold rounded-xl outline-none focus:border-[#1cb0f6] focus:bg-white"
                    placeholder="Calle, Número, Colonia, Alcaldía, Estado"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: INVOICE SEQUENCE & TIMBRADO CONFIG */}
          {activeSubTab === 'sequence' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="border-b pb-3 flex items-center gap-2">
                <span className="text-2xl select-none">🧾</span>
                <div>
                  <h3 className="text-sm font-black uppercase text-gray-800 tracking-tight">Folios, Autoridades Certificadoras y Sellos</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">Automatización secuencial y firmas criptográficas</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Prefix */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black text-gray-400 tracking-wider block">
                    Prefijo de Serie de Factura
                  </label>
                  <input
                    type="text"
                    value={invoicePrefix}
                    onChange={(e) => setInvoicePrefix(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-200 text-xs font-bold rounded-xl outline-none focus:border-[#1cb0f6] focus:bg-white font-mono uppercase"
                    placeholder="FAC-DUO-"
                  />
                </div>

                {/* Next Number */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black text-gray-400 tracking-wider block">
                    Siguiente Folio Consecutivo
                  </label>
                  <input
                    type="number"
                    value={nextInvoiceNumber}
                    onChange={(e) => setNextInvoiceNumber(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-200 text-xs font-black rounded-xl outline-none focus:border-[#1cb0f6] focus:bg-white font-mono"
                    placeholder="1001"
                  />
                </div>
              </div>

              {/* Automatic invoicing toggle */}
              <div className="bg-[#fafafa] border-2 border-gray-150 p-4 rounded-2xl space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="text-xs font-black text-gray-850">Timbrar Facturas Legal Electrónicas Automáticas</h4>
                    <p className="text-[10px] text-gray-400 font-bold leading-normal">
                      Si se asocia un cliente con datos RFC completados, el sistema emitirá el XML fiscal mock timbrado al instante de pagar.
                    </p>
                  </div>

                  <div className="shrink-0 pt-0.5">
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={automaticMockInvoicing}
                        onChange={(e) => { setAutomaticMockInvoicing(e.target.checked); playSound('click'); }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#58cc02]" />
                    </label>
                  </div>
                </div>
              </div>

              {/* Advanced cryptographic Mock Sello Digital Section */}
              <div className="space-y-3 pt-1">
                <span className="text-[10px] uppercase font-black text-gray-450 tracking-wider block">Firma de Certificado de Sello Digital (SAT Mock CSD)</span>
                
                <div className="border border-dashed border-gray-250 p-4 rounded-2xl bg-gray-50/50 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Key size={16} className="text-amber-500" />
                      <span className="text-xs font-black text-gray-750">Estatus del Sello Privado del Emisor</span>
                    </div>
                    <span className="bg-[#58cc02] text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-md leading-none select-none flex items-center gap-1">
                      <span className="h-1.5 w-1.5 bg-white rounded-full animate-ping" />
                      AUTORIZADO Y FIRMADO
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-black text-gray-400 block">Archivo CSD Llave (.key)</label>
                      <input
                        type="text"
                        disabled
                        value={csdFileName}
                        className="w-full px-3 py-1.5 bg-gray-150 border rounded-xl font-mono text-gray-550 text-[11px] font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-black text-gray-400 block">Contraseña del Certificado Llave</label>
                      <input
                        type="password"
                        disabled
                        value={csdPass}
                        className="w-full px-3 py-1.5 bg-gray-150 border rounded-xl font-mono text-gray-550 text-[11px] font-bold"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold bg-white px-3 py-2 rounded-xl border">
                    <span>Certificadora Ficticia Oficial:</span>
                    <span className="font-extrabold text-gray-700">{certifyingAuthority}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SAVE CONTROLS AREA */}
          <div className="border-t border-gray-150 pt-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="flex items-center gap-2 select-none">
              <span className="text-2xl animate-bounce">⚡</span>
              <div>
                <p className="text-xs font-black text-gray-800 leading-none">Guardar Configuración Fiscal</p>
                <p className="text-[10px] text-gray-400 font-extrabold uppercase">Otorga +50 XP a tu cuenta</p>
              </div>
            </div>

            <div className="flex w-full sm:w-auto items-center gap-3 justify-end">
              {saveSuccess && (
                <span className="text-xs font-black text-[#58cc02] animate-pulse flex items-center gap-1">
                  <CheckCircle2 size={14} strokeWidth={3} />
                  ¡Ajustes Fiscales del SAT Sincronizados con Racha!
                </span>
              )}
              
              <button
                type="submit"
                className="w-full sm:w-auto py-3 px-6 bg-[#58cc02] text-white border-b-6 border-[#3c9e01] hover:bg-[#61e002] active:translate-y-[2px] active:border-b-2 font-black text-xs uppercase tracking-wider rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Save size={14} strokeWidth={2.5} />
                <span>Aplicar y Guardar Cambios</span>
              </button>
            </div>
          </div>

        </div>

      </form>

    </div>
  );
}
