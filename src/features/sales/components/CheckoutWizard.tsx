/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { Customer, LegalBillingSettings, User } from '../../../types/index';
import { Character, DUO_CHARACTERS } from '../../../initialData';
import { playSound } from '../../../services/sounds';
import { isVenezuelanTaxContext } from '../../../services/fiscal';

interface CheckoutWizardProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  totalAmount: number;
  totalAmountVES: number;
  paymentMethod: 'cash' | 'card' | 'points' | 'credit';
  setPaymentMethod: (method: 'cash' | 'card' | 'points' | 'credit') => void;
  selectedCustomer: Customer | null;
  cashReceived: string;
  setCashReceived: (val: string) => void;
  cashNum: number;
  changeDue: number;
  changeDueVES: number;
  exchangeRate: number;
  isMixedPayment: boolean;
  setIsMixedPayment: (mixed: boolean) => void;
  mixedCashAmount: string;
  setMixedCashAmount: (amt: string) => void;
  requestLegalInvoice: boolean;
  setRequestLegalInvoice: (req: boolean) => void;
  invoiceFiscalName: string;
  setInvoiceFiscalName: (name: string) => void;
  invoiceTaxId: string;
  setInvoiceTaxId: (id: string) => void;
  invoicePostalCode: string;
  setInvoicePostalCode: (code: string) => void;
  invoiceRegime: string;
  setInvoiceRegime: (reg: string) => void;
  invoiceUseCFDI: string;
  setInvoiceUseCFDI: (cfdi: string) => void;
  submitCheckout: () => void;
  billingSettings: LegalBillingSettings;
  gemsToRedeem: number;
  gemsDiscount: number;
}

export default function CheckoutWizard({
  isOpen,
  onClose,
  user,
  totalAmount,
  totalAmountVES,
  paymentMethod,
  setPaymentMethod,
  selectedCustomer,
  cashReceived,
  setCashReceived,
  cashNum,
  changeDue,
  changeDueVES,
  exchangeRate,
  isMixedPayment,
  setIsMixedPayment,
  mixedCashAmount,
  setMixedCashAmount,
  requestLegalInvoice,
  setRequestLegalInvoice,
  invoiceFiscalName,
  setInvoiceFiscalName,
  invoiceTaxId,
  setInvoiceTaxId,
  invoicePostalCode,
  setInvoicePostalCode,
  invoiceRegime,
  setInvoiceRegime,
  invoiceUseCFDI,
  setInvoiceUseCFDI,
  submitCheckout,
  billingSettings,
  gemsToRedeem,
  gemsDiscount,
}: CheckoutWizardProps) {
  useEffect(() => {
    if (isOpen) {
      playSound('click');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const activeChar: Character = DUO_CHARACTERS[user.avatar] || DUO_CHARACTERS.duo;
  const isVen = isVenezuelanTaxContext(billingSettings);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn text-gray-805 font-sans">
      <div className="bg-white border-2 border-gray-200 border-b-8 rounded-3xl max-w-md w-full p-6 space-y-5 relative shadow-2xl">
        
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-450 hover:text-gray-600 rounded-full hover:bg-gray-100 p-1 bg-gray-50 border cursor-pointer font-bold select-none h-6 w-6 flex items-center justify-center"
        >
          ✕
        </button>

        <div className="text-center space-y-1.5">
          <span className="text-4xl select-none">💰</span>
          <h3 className="text-2xl font-black text-gray-800">Registrar Pago</h3>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">
            Total USD: <span className="text-gray-800 font-black font-mono">${totalAmount.toFixed(2)} USD</span>
          </p>
          <div className="mt-1">
            <span className="text-sm text-indigo-750 font-black uppercase tracking-wider bg-indigo-50 py-1.5 px-3 rounded-2xl border border-indigo-100 inline-block animate-pulse">
              Total Bs: {totalAmountVES.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.
            </span>
          </div>
        </div>

        {/* Select Method Tabs */}
        <div className="space-y-1.5 text-left">
          <label className="text-xs font-black uppercase text-gray-500 block">Forma de Pago</label>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { key: 'cash', label: 'Efectivo', icon: '💸' },
              { key: 'card', label: 'Tarjeta', icon: '💳' },
              { key: 'points', label: 'DuoPuntos', icon: '⭐' },
              { key: 'credit', label: 'Fiado', icon: '📝' }
            ].map(item => (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  if (item.key === 'credit' && !selectedCustomer) {
                    alert('Para cobrar bajo la línea de crédito ("Fiado"), primero debes asociar un cliente en la sección del carrito.');
                    return;
                  }
                  setPaymentMethod(item.key as any);
                }}
                className={`p-2.5 rounded-2xl border-2 transition-all flex flex-col items-center justify-center border-b-4 cursor-pointer ${
                  paymentMethod === item.key
                    ? 'bg-green-50 border-[#58cc02] scale-102 font-black'
                    : (item.key === 'credit' && !selectedCustomer)
                      ? 'bg-gray-50 border-gray-150 opacity-40 cursor-not-allowed'
                      : 'bg-white border-gray-200 hover:bg-gray-50 active:translate-y-[2px]'
                }`}
              >
                <span className="text-xl block select-none">{item.icon}</span>
                <span className="text-[9px] font-black mt-1 uppercase text-gray-755">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Mixed Payment Toggle */}
        <div className="bg-[#fafafa] border border-gray-150 p-3 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer select-none text-left" onClick={() => { setIsMixedPayment(!isMixedPayment); playSound('click'); }}>
            <span className="text-xl">🔀</span>
            <div className="text-left">
              <span className="text-[11px] font-black text-gray-800 leading-none block">Registrar como Pago Mixto</span>
              <span className="text-[9px] font-extrabold text-[#1cb0f6] uppercase tracking-wider block">Combinar Efectivo + Tarjeta</span>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isMixedPayment}
              onChange={(e) => { setIsMixedPayment(e.target.checked); playSound('click'); }}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#58cc02]" />
          </label>
        </div>

        {/* Calculations depending on payment methods */}
        {isMixedPayment ? (
          <div className="space-y-3.5 p-4 bg-indigo-50/50 rounded-2xl border-2 border-indigo-150 text-left">
            <div className="flex items-center gap-2 text-indigo-800 font-black text-xs uppercase border-b border-indigo-100 pb-1.5">
              <span>🔀</span>
              <span>Distribución de Pago Mixto</span>
            </div>
            
            <div className="space-y-3">
              {/* Cash Portion */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px] uppercase font-black text-gray-400">
                  <span>💸 Porción en Efectivo</span>
                  <span className="text-indigo-650 font-mono font-black">Paso 1</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-400 font-extrabold">$</span>
                  <input
                    type="text"
                    value={mixedCashAmount}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9.]/g, '');
                      setMixedCashAmount(val);
                    }}
                    placeholder="0.00"
                    className="w-full pl-7 pr-3 py-2 bg-white border-2 border-[#e5e5e5] rounded-xl font-black text-sm text-gray-805 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Card Portion */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px] uppercase font-black text-gray-400">
                  <span>💳 Porción en Tarjeta</span>
                  <span className="text-indigo-650 font-mono">Auto-calculado</span>
                </div>
                <div className="flex items-center justify-between bg-white border border-gray-150 p-2.5 rounded-xl font-mono text-sm font-black text-gray-700">
                  <span>Restante a Tarjeta:</span>
                  <span className="text-indigo-650 font-extrabold">
                    ${Math.max(0, totalAmount - (Number(mixedCashAmount) || 0)).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Info Note banner */}
            <p className="text-[10px] text-[#2c7a02] bg-[#f2ffd4] font-semibold border border-[#ccd9ad] p-2 rounded-lg leading-normal">
              💡 **Concepto**: Ingresa el monto en efectivo que entrega el cliente. El resto se procesa y reporta como cobro a tarjeta bancaria.
            </p>
          </div>
        ) : paymentMethod === 'cash' ? (
          <div className="space-y-3 p-4 bg-gray-50 rounded-2xl border">
            <div className="space-y-1 text-left">
              <div className="flex justify-between items-center">
                <label className="text-xs font-black uppercase text-gray-550">Efectivo Recibido ($)</label>
                <span className="text-[10px] text-gray-400 font-bold">
                  ~ {(cashNum * exchangeRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.
                </span>
              </div>
              <input
                type="text"
                value={cashReceived}
                onChange={(e) => setCashReceived(e.target.value.replace(/[^0-9.]/g, ''))}
                className="w-full px-4 py-3 bg-white border-2 border-[#e5e5e5] rounded-xl font-black text-lg text-gray-805 outline-none text-center focus:border-[#58cc02]"
                placeholder="0.00"
              />
            </div>

            {/* Bill quick tips */}
            <div className="flex flex-wrap justify-center gap-1.5">
              {[
                { label: 'Exacto', val: Math.ceil(totalAmount) },
                { label: '+$5', val: Math.ceil(totalAmount) + 5 },
                { label: '+$10', val: Math.ceil(totalAmount) + 10 },
                { label: '+$20', val: Math.ceil(totalAmount) + 20 },
                { label: '$20', val: 20 },
                { label: '$50', val: 50 },
                { label: '$100', val: 100 }
              ].map((bill, index) => {
                if (bill.val < totalAmount && bill.label.startsWith('$')) return null;
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setCashReceived(bill.val.toString())}
                    className="py-1 px-2.5 bg-white border border-gray-200 rounded-lg text-xs font-extrabold text-gray-600 hover:bg-gray-100 cursor-pointer"
                  >
                    {bill.label} (${bill.val})
                  </button>
                );
              })}
            </div>

            {/* Change returns display */}
            <div className="flex flex-col bg-white p-3 rounded-xl border border-gray-150 text-left">
              <div className="flex justify-between items-center w-full">
                <span className="text-xs font-black uppercase text-gray-400">Cambio Devuelto USD:</span>
                <span className="font-mono text-lg font-black text-gray-800">
                  ${changeDue.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center w-full border-t border-dashed border-gray-100 pt-1.5 mt-1.5">
                <span className="text-xs font-black uppercase text-gray-400">Cambio en Bs. (VES):</span>
                <span className="font-mono text-sm font-black text-indigo-650">
                  {changeDueVES.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.
                </span>
              </div>
            </div>
          </div>
        ) : paymentMethod === 'credit' ? (
          <div className="p-4 bg-amber-50 bg-opacity-80 rounded-2xl border border-amber-200 text-left space-y-3">
            <div className="flex items-center gap-2 text-amber-800 font-black text-xs uppercase">
              <span>📝</span>
              <span>Cobro Cargado a Línea de Crédito ("Fiado")</span>
            </div>
            {selectedCustomer ? (
              <div className="text-xs space-y-1.5 text-gray-700 font-bold">
                <p className="flex justify-between">
                  <span className="text-gray-400 font-black uppercase text-[10px]">Cliente Deudor:</span>
                  <span className="text-gray-900 font-extrabold">{selectedCustomer.name}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-gray-400 font-black uppercase text-[10px]">Límite Autorizado:</span>
                  <span className="text-gray-900 font-mono">${(selectedCustomer.creditLimit || 0).toFixed(2)}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-gray-400 font-black uppercase text-[10px]">Crédito Utilizado:</span>
                  <span className="text-red-650 font-mono">${(selectedCustomer.creditUsed || 0).toFixed(2)}</span>
                </p>
                
                <div className="pt-2 border-t border-dashed border-amber-200 flex justify-between items-center text-xs text-amber-955 font-black">
                  <span>Disponible para "Fiado":</span>
                  <span className="font-mono bg-amber-100 px-2 py-0.5 rounded-lg border border-amber-150">
                    ${Math.max(0, (selectedCustomer.creditLimit || 0) - (selectedCustomer.creditUsed || 0)).toFixed(2)}
                  </span>
                </div>

                {((selectedCustomer.creditLimit || 0) - (selectedCustomer.creditUsed || 0)) < totalAmount && (
                  <p className="text-[10px] text-red-500 font-black leading-tight uppercase mt-1">
                    ⚠️ ATENCIÓN: El total de la compra (${totalAmount.toFixed(2)}) supera el cupo disponible de este cliente.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-[10px] text-red-500 italic font-black uppercase">⚠️ Error: Sin cliente asociado</p>
            )}
          </div>
        ) : paymentMethod === 'points' ? (
          <div className="p-4 bg-blue-50 bg-opacity-80 rounded-2xl border border-blue-200 text-left space-y-2 text-xs font-bold text-gray-700">
            <p className="text-blue-800 font-black uppercase text-[10px] flex items-center gap-1"><span>⭐</span> Canje por DuoPuntos / Certificados</p>
            <p>Se realiza el descuento de puntos de su racha activa.</p>
            {selectedCustomer && (
              <p className="text-[10px] text-gray-500">Saldo actual de gemas: <strong className="text-green-600">{selectedCustomer.gems} G</strong></p>
            )}
          </div>
        ) : (
          <div className="p-4 bg-gray-50 rounded-2xl border text-center font-bold text-xs text-gray-500 space-y-2">
            <p>💳 Modo de cobro electrónico interactivo activado.</p>
            <p className="text-[10px] text-gray-400 italic font-medium">Desliza la tarjeta o aprueba el cupón NFC en la terminal de pago simlativa.</p>
          </div>
        )}

        {/* Loyalty details inside final confirmation */}
        {selectedCustomer && (
          <div className="bg-sky-50 border border-sky-150 p-3 rounded-2xl flex items-center justify-between text-xs font-bold leading-normal text-sky-900 text-left">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-xl select-none">🎓</span>
              <div className="min-w-0">
                <span className="text-[9px] uppercase font-black text-sky-400 block leading-tight">Cliente Premium de la Racha</span>
                <span className="text-gray-800 font-extrabold truncate text-xs block">{selectedCustomer.name}</span>
              </div>
            </div>

            <div className="text-right shrink-0 font-extrabold">
              {gemsToRedeem > 0 && (
                <p className="text-red-500 font-black font-mono text-[10px]">
                  📉 Canjea: -{gemsToRedeem} Gems
                </p>
              )}
              <p className="text-[#58cc02] font-black font-mono text-[10px]">
                📈 Acumula: +{Math.max(1, Math.floor(totalAmount))} Gems
              </p>
            </div>
          </div>
        )}

        {/* ADVANCED LEGAL BILLING OPTION ACCORDION */}
        <div className="bg-[#fafafa] border-2 border-gray-150 rounded-2xl p-3.5 space-y-2.5 text-left">
          <div className="flex items-center justify-between">
            <div 
              className="flex items-center gap-2 cursor-pointer select-none" 
              onClick={() => { setRequestLegalInvoice(!requestLegalInvoice); playSound('click'); }}
            >
              <span className="text-xl">⚖️</span>
              <div>
                <span className="text-xs font-black text-gray-800 leading-none block">¿Requieres Factura Legal?</span>
                <span className="text-[9px] font-black text-[#58cc02] uppercase tracking-wider block">
                  {isVen ? 'Facturación SENIAT de la Racha' : 'Timbrado Fiscal SAT de la Racha'}
                </span>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                checked={requestLegalInvoice}
                onChange={(e) => { setRequestLegalInvoice(e.target.checked); playSound('click'); }}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#58cc02]" />
            </label>
          </div>

          {requestLegalInvoice && (
            <div className="space-y-3.5 border-t border-dashed border-gray-200 pt-3 animate-fadeIn text-xs">
              {/* Constancia de Situación Fiscal / RIF mock OCR parser */}
              <div className="bg-emerald-50/70 border border-emerald-100 p-2.5 rounded-xl text-[10.5px] text-emerald-800 space-y-1.5 shadow-inner">
                <div className="flex justify-between items-center">
                  <span className="font-black uppercase tracking-wider block">
                    {isVen ? '📄 Registro de Información Fiscal (RIF)' : '📄 Constancia de Situación Fiscal (CSF)'}
                  </span>
                  <span className="text-[9px] bg-emerald-105 text-emerald-800 px-1.5 py-0.5 rounded-md font-black font-mono">SIMULADOR OCR</span>
                </div>
                <p className="text-[9px] text-emerald-700 font-bold leading-tight">
                  {isVen 
                    ? 'Carga de manera simulada el RIF del contribuyente para auto-completar los datos fiscales legalmente.'
                    : 'Carga de manera simulada la constancia del contribuyente para auto-completar los datos fiscales legalmente.'}
                </p>
                <div className="flex gap-1.5 pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (isVen) {
                        setInvoiceFiscalName('DUO COMERCIALIZADORA VENEZUELA C.A.');
                        setInvoiceTaxId('J-41283625-4');
                        setInvoicePostalCode('1010');
                        setInvoiceRegime('Contribuyente Especial');
                        setInvoiceUseCFDI('Gastos generales');
                      } else {
                        setInvoiceFiscalName('ESCUELA DUOLINGO DE MÉXICO S.A. DE C.V.');
                        setInvoiceTaxId('EDM180525H99');
                        setInvoicePostalCode('06700');
                        setInvoiceRegime('601 - General de Ley Personas Morales');
                        setInvoiceUseCFDI('G03 - Gastos en general');
                      }
                      playSound('levelup');
                    }}
                    className="flex-1 bg-white hover:bg-emerald-100/50 border border-emerald-200 text-emerald-800 font-black px-1.5 py-1 rounded-lg text-[8.5px] uppercase cursor-pointer text-center"
                  >
                    {isVen ? '🏢 Persona Jurídica (DuoCorp J-4128)' : '🏢 Persona Moral (DuoMex SA)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (isVen) {
                        setInvoiceFiscalName('JUANA REGINA LOPEZ PEREZ');
                        setInvoiceTaxId('V-18811128-3');
                        setInvoicePostalCode('1050');
                        setInvoiceRegime('Contribuyente Ordinario');
                        setInvoiceUseCFDI('Gastos generales');
                      } else {
                        setInvoiceFiscalName('JUANA REGINA LOPEZ PEREZ');
                        setInvoiceTaxId('LOPJ881112MX8');
                        setInvoicePostalCode('45010');
                        setInvoiceRegime('626 - Régimen Simplificado de Confianza (RESICO)');
                        setInvoiceUseCFDI('G03 - Gastos en general');
                      }
                      playSound('levelup');
                    }}
                    className="flex-1 bg-white hover:bg-emerald-100/50 border border-emerald-200 text-emerald-800 font-black px-1.5 py-1 rounded-lg text-[8.5px] uppercase cursor-pointer text-center"
                  >
                    {isVen ? '👤 Persona Natural (Juana V-1881)' : '👤 Persona Física (Juana Lopez)'}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] uppercase font-black text-gray-400 tracking-wider block">Denominación o Razón Social *</label>
                <input
                  type="text"
                  required
                  value={invoiceFiscalName}
                  onChange={(e) => setInvoiceFiscalName(e.target.value)}
                  placeholder={isVen ? "Ej. DISTRIBUIDORA DUO C.A." : "Ej. OSCAR EL PINTOR S.A."}
                  className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-black uppercase text-gray-800 focus:border-[#58cc02] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-black text-gray-400 tracking-wider block">
                    {isVen ? 'R.I.F. / Identificación Fiscal *' : 'Reg. Fiscal (RFC / Tax ID) *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={invoiceTaxId}
                    onChange={(e) => setInvoiceTaxId(e.target.value)}
                    placeholder={isVen ? "J-12345678-9 o V-12345678-9" : "XAXX010101000"}
                    className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-black uppercase text-gray-800 focus:border-[#58cc02] outline-none font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-black text-gray-400 tracking-wider block">Código Postal Fiscal *</label>
                  <input
                    type="text"
                    required
                    value={invoicePostalCode}
                    onChange={(e) => setInvoicePostalCode(e.target.value)}
                    placeholder={isVen ? "1010" : "06700"}
                    className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-black text-gray-805 focus:border-[#58cc02] outline-none font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] uppercase font-black text-gray-400 block">
                  {isVen ? 'Tipo de Contribuyente' : 'Régimen Fiscal Legal del Receptor'}
                </label>
                {isVen ? (
                  <select
                    value={invoiceRegime}
                    onChange={(e) => setInvoiceRegime(e.target.value)}
                    className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-xl text-[10px] font-black text-gray-700 outline-none cursor-pointer"
                  >
                    <option value="Contribuyente Ordinario">Contribuyente Ordinario</option>
                    <option value="Contribuyente Especial">Contribuyente Especial</option>
                    <option value="Contribuyente Formal">Contribuyente Formal</option>
                    <option value="Persona Natural No Contribuyente">Persona Natural No Contribuyente</option>
                  </select>
                ) : (
                  <select
                    value={invoiceRegime}
                    onChange={(e) => setInvoiceRegime(e.target.value)}
                    className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-xl text-[10px] font-black text-gray-700 outline-none cursor-pointer"
                  >
                    <option value="601 - General de Ley Personas Morales">601 - General de Ley Personas Morales</option>
                    <option value="626 - Régimen Simplificado de Confianza (RESICO)">626 - Simplificado de Confianza (RESICO)</option>
                    <option value="605 - Sueldos y Salarios e Ingresos Asimilados a Salarios">605 - Sueldos y Salarios</option>
                    <option value="612 - Personas Físicas con Actividades Empresariales">612 - Personas Físicas Empresariales</option>
                    <option value="Sin Obligaciones Fiscales">616 - Sin Obligaciones Fiscales</option>
                  </select>
                )}
              </div>

              {!isVen && (
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-black text-gray-400 block">Uso previsto del CFDI / Factura</label>
                  <select
                    value={invoiceUseCFDI}
                    onChange={(e) => setInvoiceUseCFDI(e.target.value)}
                    className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-xl text-[10px] font-black text-gray-700 outline-none cursor-pointer"
                  >
                    <option value="G01 - Adquisición de mercancías">G01 - Adquisición de mercancías</option>
                    <option value="G03 - Gastos en general">G03 - Gastos en general</option>
                    <option value="D01 - Honorarios médicos, dentales y gastos hospitalarios">D01 - Gastos Médicos/Hospitalarios</option>
                    <option value="S01 - Sin efectos fiscales">S01 - Sin efectos fiscales / Justificante</option>
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Checkout click buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="bg-white text-gray-450 border-2 border-gray-200 border-b-4 hover:bg-gray-50 active:translate-y-[2px] active:border-b-2 py-3 rounded-2xl font-black text-sm uppercase text-center cursor-pointer"
          >
            Volver
          </button>
          
          <button
            type="button"
            onClick={() => submitCheckout()}
            className="bg-[#58cc02] text-white border-b-4 border-[#46a302] hover:bg-[#61e002] active:border-b-0 active:translate-y-[4px] py-3 rounded-2xl font-black text-sm uppercase text-center cursor-pointer"
          >
            Registrar Venta
          </button>
        </div>

      </div>
    </div>
  );
}
