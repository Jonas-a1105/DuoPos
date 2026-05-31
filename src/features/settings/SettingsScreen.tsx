import React, { useState } from 'react';
import { LegalBillingSettings, TaxCategoryOverride, User } from '../../types';
import { Percent, Building2, Receipt, ShieldCheck, Save, Sliders, Info, CheckCircle2, RefreshCw, Download } from 'lucide-react';
import { playSound } from '../../services/audio/soundService';
import { LicenseDetails } from '../../services/security/licensingService';

import TaxesSettings from './components/TaxesSettings';
import CompanySettings from './components/CompanySettings';
import SequenceSettings from './components/SequenceSettings';
import AppSettings from './components/AppSettings';
import LicenseSettings from './components/LicenseSettings';
import UpdatesSettings from './components/UpdatesSettings';
import DatabaseSettings from './components/DatabaseSettings';

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
  products: any[];
  transactions: any[];
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
  user,
  products,
  transactions,
}: SettingsScreenProps) {
  const [activeSubTab, setActiveSubTab] = useState<'taxes' | 'company' | 'sequence' | 'app' | 'license' | 'updates' | 'database'>(
    'license',
  );

  // Local states for inputs (passed down to subcomponents as bindings)
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

  const [businessProfile, setBusinessProfile] = useState<'gastronomy' | 'market' | 'retail' | 'general'>(
    settings.businessProfile || 'gastronomy',
  );
  const [currencySymbol, setCurrencySymbol] = useState(settings.currencySymbol || '$');
  const [currencyDecimals, setCurrencyDecimals] = useState(
    settings.currencyDecimals !== undefined ? settings.currencyDecimals : 2,
  );
  const [enableSounds, setEnableSounds] = useState(settings.enableSounds !== false);
  const [ticketWidth, setTicketWidth] = useState<'80mm' | '58mm'>(settings.ticketWidth || '80mm');
  const [customTicketHeader, setCustomTicketHeader] = useState(settings.customTicketHeader || '');
  const [customTicketFooter, setCustomTicketFooter] = useState(
    settings.customTicketFooter || '¡Gracias por su racha de compra!',
  );
  const [kdsDelayMinutes, setKdsDelayMinutes] = useState(settings.kdsDelayMinutes || 10);
  const [pacUsername, setPacUsername] = useState(settings.pacUsername || '');
  const [pacPassword, setPacPassword] = useState(settings.pacPassword || '');

  // Sello digital mock state
  const [isCsdLoaded, setIsCsdLoaded] = useState(true);
  const [csdFileName, setCsdFileName] = useState('duo_sello_digital_2026.key');
  const [csdPass, setCsdPass] = useState('*************');

  const [saveSuccess, setSaveSuccess] = useState(false);

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
      businessProfile,
      currencySymbol,
      currencyDecimals: Number(currencyDecimals),
      enableSounds,
      ticketWidth,
      customTicketHeader,
      customTicketFooter,
      kdsDelayMinutes: Number(kdsDelayMinutes),
      pacUsername,
      pacPassword,
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
    <div className="space-y-6 animate-fadeIn font-sans p-1 md:p-3 pb-12 text-gray-800 text-left">
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
            <span className="text-white text-xs font-bold font-mono">★ Cumplimiento de Racha Legal</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight leading-none">
            Impuestos y Facturación Electrónica SAT Mock
          </h2>
          <p className="text-xs md:text-sm text-green-50 leading-relaxed max-w-xl font-bold">
            Configura las tasas impositivas por categoría, el cálculo de precios inclusive/neto y emite timbrados
            fiscales con firma criptográfica simétrica. ¡Gana <strong>+50 XP</strong> de racha comercial al guardar
            cambios validos!
          </p>
        </div>
      </div>

      {/* THREE-COLUMN STATS OVERVIEW OF TAX INTEGRATION */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white border-2 border-gray-200 rounded-2xl p-4 flex items-center gap-3 shadow-xs">
          <div className="bg-emerald-50 text-emerald-600 p-2.5 rounded-xl border border-emerald-100 font-bold select-none text-lg leading-none">
            %
          </div>
          <div>
            <span className="text-[9px] uppercase font-black text-gray-400 block leading-tight">Impuesto Base</span>
            <span className="text-sm font-black text-gray-800 leading-none">
              {taxName} ({generalTaxRate}%)
            </span>
          </div>
        </div>

        <div className="bg-white border-2 border-gray-205 rounded-2xl p-4 flex items-center gap-3 shadow-xs">
          <div className="bg-blue-55 text-blue-600 p-2.5 rounded-xl border border-blue-100 font-bold select-none text-lg leading-none">
            📁
          </div>
          <div>
            <span className="text-[9px] uppercase font-black text-gray-400 block leading-tight">
              Desgloses Asignados
            </span>
            <span className="text-sm font-black text-gray-800 leading-none">
              {categoryOverrides.length} Categorías Especiales
            </span>
          </div>
        </div>

        <div className="bg-white border-2 border-gray-205 rounded-2xl p-4 flex items-center gap-3 shadow-xs">
          <div className="bg-purple-55 text-purple-600 p-2.5 rounded-xl border border-purple-100 font-bold select-none text-lg leading-none font-sans">
            📜
          </div>
          <div>
            <span className="text-[9px] uppercase font-black text-gray-400 block leading-tight">
              Esquema Fiscal de Empresa
            </span>
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
            { id: 'database', label: 'Base de Datos 💾', icon: <Download size={15} /> },
            { id: 'app', label: 'Perfil / Ajustes App', icon: <Sliders size={15} /> },
            { id: 'taxes', label: 'Estructura de Tasas', icon: <Percent size={15} /> },
            { id: 'company', label: 'Emisor Corporativo', icon: <Building2 size={15} /> },
            { id: 'sequence', label: 'Folio y Certificados', icon: <Receipt size={15} /> },
          ].map((tab) => {
            const isSelected = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveSubTab(tab.id as any);
                  playSound('click');
                }}
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
            <div className="bg-sky-50 border border-sky-100 rounded-xl p-2.5 text-[10px] text-sky-850 font-bold leading-relaxed flex gap-1.5 items-start">
              <Info size={14} className="text-sky-500 shrink-0 mt-0.5 animate-pulse" />
              <span>
                Los precios de los productos en tu almacén pueden configurarse como <strong>Netos</strong> u{' '}
                <strong>Hospedados (inclusive)</strong>.
              </span>
            </div>
          </div>
        </div>

        {/* COMPONENT SETTINGS INPUTS WRAPPER */}
        <div className="bg-white border-2 border-gray-200 border-b-8 rounded-3xl p-5 md:p-6 lg:col-span-3 space-y-6">
          {/* TAB 0: TAX STRUCTURE */}
          {activeSubTab === 'taxes' && (
            <TaxesSettings
              taxName={taxName}
              setTaxName={setTaxName}
              generalTaxRate={generalTaxRate}
              setGeneralTaxRate={setGeneralTaxRate}
              taxIncludedInPrice={taxIncludedInPrice}
              setTaxIncludedInPrice={setTaxIncludedInPrice}
              categoryOverrides={categoryOverrides}
              setCategoryOverrides={setCategoryOverrides}
            />
          )}

          {/* TAB 1: COMPANY DATA */}
          {activeSubTab === 'company' && (
            <CompanySettings
              companyName={companyName}
              setCompanyName={setCompanyName}
              companyTaxId={companyTaxId}
              setCompanyTaxId={setCompanyTaxId}
              companyRegime={companyRegime}
              setCompanyRegime={setCompanyRegime}
              companyPostalCode={companyPostalCode}
              setCompanyPostalCode={setCompanyPostalCode}
              companyAddress={companyAddress}
              setCompanyAddress={setCompanyAddress}
            />
          )}

          {/* TAB 2: INVOICING NUMBERS & CSD */}
          {activeSubTab === 'sequence' && (
            <SequenceSettings
              invoicePrefix={invoicePrefix}
              setInvoicePrefix={setInvoicePrefix}
              nextInvoiceNumber={nextInvoiceNumber}
              setNextInvoiceNumber={setNextInvoiceNumber}
              automaticMockInvoicing={automaticMockInvoicing}
              setAutomaticMockInvoicing={setAutomaticMockInvoicing}
              certifyingAuthority={certifyingAuthority}
              setCertifyingAuthority={setCertifyingAuthority}
              isCsdLoaded={isCsdLoaded}
              setIsCsdLoaded={setIsCsdLoaded}
              csdFileName={csdFileName}
              setCsdFileName={setCsdFileName}
              csdPass={csdPass}
              setCsdPass={setCsdPass}
              pacUsername={pacUsername}
              setPacUsername={setPacUsername}
              pacPassword={pacPassword}
              setPacPassword={setPacPassword}
            />
          )}

          {/* TAB 6: DATABASE INTEGRITY & BACKUPS */}
          {activeSubTab === 'database' && (
            <DatabaseSettings
              user={user}
              products={products}
              transactions={transactions}
            />
          )}

          {/* TAB 3: APP PREFERENCES */}
          {activeSubTab === 'app' && (
            <AppSettings
              businessProfile={businessProfile}
              setBusinessProfile={setBusinessProfile}
              currencySymbol={currencySymbol}
              setCurrencySymbol={setCurrencySymbol}
              currencyDecimals={currencyDecimals}
              setCurrencyDecimals={setCurrencyDecimals}
              enableSounds={enableSounds}
              setEnableSounds={setEnableSounds}
              ticketWidth={ticketWidth}
              setTicketWidth={setTicketWidth}
              customTicketHeader={customTicketHeader}
              setCustomTicketHeader={setCustomTicketHeader}
              customTicketFooter={customTicketFooter}
              setCustomTicketFooter={setCustomTicketFooter}
              kdsDelayMinutes={kdsDelayMinutes}
              setKdsDelayMinutes={setKdsDelayMinutes}
            />
          )}

          {/* TAB 4: LICENSING PLANS */}
          {activeSubTab === 'license' && (
            <LicenseSettings
              licenseDetails={licenseDetails}
              onActivateLicenseKey={onActivateLicenseKey}
              onResetLicenseToFree={onResetLicenseToFree}
              onGrantXp={onGrantXp}
              user={user}
              companyName={companyName}
            />
          )}

          {/* TAB 5: SYSTEM UPDATES */}
          {activeSubTab === 'updates' && (
            <UpdatesSettings
              appVersion={appVersion}
              onUpdateAppVersion={onUpdateAppVersion}
              onGrantXp={onGrantXp}
              licenseDetails={licenseDetails}
            />
          )}

          {/* SAVE CONTROLS AREA */}
          <div className="border-t border-gray-150 pt-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="flex items-center gap-2 select-none">
              <span className="text-2xl animate-bounce">⚡</span>
              <div>
                <p className="text-xs font-black text-gray-800 leading-none">Guardar Configuración Fiscal</p>
                <p className="text-[10px] text-gray-400 font-extrabold uppercase mt-1">Otorga +50 XP a tu cuenta</p>
              </div>
            </div>

            <div className="flex w-full sm:w-auto items-center gap-3 justify-end flex-wrap sm:flex-nowrap">
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
