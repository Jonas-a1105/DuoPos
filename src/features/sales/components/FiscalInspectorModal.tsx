/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Transaction, LegalBillingSettings } from '../../../types/index';
import { 
  X, Copy, Download, ShieldCheck, Printer, Send, 
  Check, FileText, Terminal, AlertCircle, Eye, RefreshCcw, Sparkles 
} from 'lucide-react';
import { generateCFDI40XML, getCadenaOriginal, getSATQrUrl, isVenezuelanTaxContext, generateSENIATInvoiceText } from '../../../services/fiscal';
import { playSound } from '../../../services/sounds';
import SATQRCode from '../../../components/Invoice/SATQRCode';


interface FiscalInspectorModalProps {
  transaction: Transaction;
  billingSettings: LegalBillingSettings;
  onClose: () => void;
}

export default function FiscalInspectorModal({
  transaction,
  billingSettings,
  onClose
}: FiscalInspectorModalProps) {
  const [activeTab, setActiveTab] = useState<'xml' | 'pdf' | 'validation'>('pdf');
  const [copied, setCopied] = useState(false);
  const [sentEmail, setSentEmail] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  
  // Validation status
  const [validationState, setValidationState] = useState<'idle' | 'calling' | 'success' | 'error'>('idle');
  const [validationLog, setValidationLog] = useState<string[]>([]);

  const isVen = isVenezuelanTaxContext(billingSettings);
  const xmlContent = isVen 
    ? generateSENIATInvoiceText(transaction, billingSettings)
    : generateCFDI40XML(transaction, billingSettings);
  const cadenaOriginal = getCadenaOriginal(transaction, billingSettings);
  const satUrl = getSATQrUrl(transaction, billingSettings.companyTaxId);
  const inv = transaction.invoiceData;

  useEffect(() => {
    if (inv?.fiscalName) {
      // Pre-fill email simulation
      setEmailInput(transaction.customerId ? 'cliente@duoloyalty.mx' : 'facturacion@duoempresa.com');
    }
  }, [inv]);

  if (!inv) {
    return (
      <div className="fixed inset-0 z-50 bg-[#141414]/75 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl border-2 border-red-200 p-6 max-w-sm w-full text-center space-y-4">
          <AlertCircle size={48} className="text-red-500 mx-auto" />
          <h3 className="text-xl font-black text-gray-800">Sin Datos Fiscales</h3>
          <p className="text-sm font-bold text-gray-500">
            Esta transacción no fue timbrada fiscalmente. Asegúrate de solicitar facturación al registrar la venta.
          </p>
          <button
            onClick={onClose}
            className="w-full bg-gray-150 py-2.5 rounded-xl text-gray-700 font-extrabold text-xs uppercase"
          >
            Cerrar Ventana
          </button>
        </div>
      </div>
    );
  }

  // Trigger download of XML file
  const handleDownloadXML = () => {
    try {
      const blob = new Blob([xmlContent], { type: 'text/xml;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${inv.invoiceNo}_CFDI_40.xml`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      playSound('success');
    } catch (err) {
      console.error(err);
    }
  };

  // Copy to clipboard helper
  const handleCopyXML = () => {
    navigator.clipboard.writeText(xmlContent);
    setCopied(true);
    playSound('click');
    setTimeout(() => setCopied(false), 2000);
  };

  // Run a mock SAT/SENIAT validation call
  const triggerSATValidation = () => {
    setValidationState('calling');
    if (isVen) {
      setValidationLog([
        '[SENIAT] Conectando con servidores del Servicio Nacional Integrado de Administración Aduanera y Tributaria (SENIAT)...',
        '[SENIAT] Verificando RIF del emisor y receptor...',
        '[SENIAT] Validando número de control y firma de impresora fiscal...'
      ]);
      
      setTimeout(() => {
        setValidationLog(prev => [...prev, '[SENIAT] Verificando declaración de IVA e impuesto IGTF 3%...']);
      }, 1000);

      setTimeout(() => {
        setValidationLog(prev => [
          ...prev,
          `[SENIAT] RESPUESTA RECIBIDA CON ÉXITO:`,
          `  - Estatus de Factura Fiscal: REGISTRADA / VIGENTE`,
          `  - Registro Impresora Fiscal: Homologado (Nro DPG120525D10)`,
          `  - Contribuyente Especial: Sí (Sujeto a retención)`,
          `  - Firma Criptográfica SENIAT: ${inv?.satSignature || 'MOCK-HASH-SENIAT-8f8d9b1a'}`
        ]);
        setValidationState('success');
        playSound('levelup');
      }, 2500);
    } else {
      setValidationLog(['[PAC] Iniciando conexión SOAP con PAC Autorizado...', '[PAC] Enviando petición de verificación a SAT WebService...', '[PAC] Validando sello del emisor... OK']);
      
      setTimeout(() => {
        setValidationLog(prev => [...prev, '[PAC] Validando estatus en los servidores centrales del SAT...']);
      }, 1000);

      setTimeout(() => {
        setValidationLog(prev => [
          ...prev,
          `[SAT] RESPUESTA RECIBIDA CON ÉXITO:`,
          `  - Estado del Comprobante: VIGENTE`,
          `  - Código de Estatus: S - Comprobante obtenido satisfactoriamente`,
          `  - Es Cancelable?: Sí (Aceptación de receptor requerida)`,
          `  - Proveedor Certificado PAC: DuoPAC S.A. de C.V. (Reg. #DIL120525A12)`,
          `  - Huella Digital SHA-1: 9c:88:51:ee:f5:bc:25:3c:9d...`
        ]);
        setValidationState('success');
        playSound('levelup');
      }, 2500);
    }
  };

  const handleSimulateEmail = () => {
    setSentEmail(true);
    playSound('success');
    setTimeout(() => setSentEmail(false), 4000);
  };

  // Simple print helper using browser print styles or custom text content 
  const handlePrintPDF = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Factura de Venta ${inv.invoiceNo}</title>
            <style>
              body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px; color: #222; max-width: 800px; margin: 0 auto; line-height: 1.5; font-size: 11px; }
              .header { display: flex; justify-content: space-between; border-bottom: 2px solid #58cc02; padding-bottom: 15px; margin-bottom: 20px; }
              .business-details { flex: 1; }
              .invoice-meta { text-align: right; }
              .invoice-title { font-size: 18px; font-weight: bold; color: #58cc02; text-transform: uppercase; margin-bottom: 5px; }
              .section { margin-bottom: 18px; }
              .section-title { font-weight: bold; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-bottom: 8px; text-transform: uppercase; color: #555; }
              .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
              table { width: 100%; border-collapse: collapse; margin: 15px 0; }
              th, td { padding: 8px; text-align: left; border-bottom: 1px solid #eee; }
              th { background-color: #f9f9f9; font-weight: bold; }
              .totals { margin-left: auto; width: 250px; margin-top: 15px; border-top: 2px solid #333; padding-top: 10px; }
              .totals-row { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px; }
              .totals-row.grand { font-size: 13px; font-weight: bold; border-top: 1px dashed #ddd; padding-top: 4px; display: flex; }
              .legal-block { margin-top: 30px; display: flex; gap: 15px; font-size: 8px; color: #666; border-top: 1px solid #eee; padding-top: 15px; }
              .qr-box { width: 90px; height: 90px; border: 1px solid #ccc; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 8px; padding: 4px; box-sizing: border-box; }
              .legal-text { flex: 1; word-break: break-all; }
              .legal-text strong { text-transform: uppercase; display: block; margin-top: 4px; color: #333; }
              @media print {
                body { padding: 0; }
                button { display: none; }
              }
            </style>
          </head>
          <body>
            <div style="text-align: right; margin-bottom: 10px;">
              <button onclick="window.print()" style="padding: 6px 12px; background: #58cc02; color: white; border: none; font-weight: bold; border-radius: 4px; cursor: pointer;">Imprimir CFDI</button>
            </div>
            <div class="header">
              <div class="business-details">
                <h3 style="margin:0; font-size: 14px; font-weight: bold;">${(billingSettings.companyName || 'DUO ACADEMIA S.A. DE C.V.').toUpperCase()}</h3>
                <p style="margin: 3px 0 0 0;">RFC: ${billingSettings.companyTaxId || 'DAC120525D10'}</p>
                <p style="margin: 2px 0 0 0;">Régimen Fiscal: ${billingSettings.companyRegime || '601 - Regimen General de Ley Personas Morales'}</p>
                <p style="margin: 2px 0 0 0;">Código Postal: ${billingSettings.companyPostalCode || '06700'}</p>
                <p style="margin: 2px 0 0 0;">Dirección: ${billingSettings.companyAddress || 'Nido Verde #12, Bosque de Duolingo'}</p>
              </div>
              <div class="invoice-meta">
                <div class="invoice-title">Factura Electrónica</div>
                <p style="margin: 3px 0 0 0;"><strong>Folio:</strong> ${inv.invoiceNo}</p>
                <p style="margin: 2px 0 0 0;"><strong>Serie:</strong> ${billingSettings.invoicePrefix || 'FAC'}</p>
                <p style="margin: 2px 0 0 0;"><strong>Tipo comprobante:</strong> I - Ingreso</p>
                <p style="margin: 2px 0 0 0;"><strong>Exportación:</strong> 01 - No aplica</p>
                <p style="margin: 2px 0 0 0;"><strong>Fecha Emisión:</strong> ${transaction.date}</p>
              </div>
            </div>

            <div class="section grid-2">
              <div>
                <dt class="section-title">Datos del Receptor</dt>
                <p style="margin: 2px 0;"><strong>Cliente:</strong> ${inv.fiscalName}</p>
                <p style="margin: 2px 0;"><strong>RFC:</strong> ${inv.taxId}</p>
                <p style="margin: 2px 0;"><strong>Domicilio Fiscal CP:</strong> ${inv.postalCode}</p>
                <p style="margin: 2px 0;"><strong>Regimen Fiscal:</strong> ${inv.regime || '605'}</p>
                <p style="margin: 2px 0;"><strong>Uso CFDI:</strong> ${inv.useCFDI || 'G03 '}</p>
              </div>
              <div>
                <dt class="section-title">Método y Condiciones</dt>
                <p style="margin: 2px 0;"><strong>Moneda:</strong> MXN - Peso Mexicano</p>
                <p style="margin: 2px 0;"><strong>Forma de Pago:</strong> ${inv.paymentForm || '01 - Efectivo'}</p>
                <p style="margin: 2px 0;"><strong>Método de Pago:</strong> PUE - Pago en una sola exhibición</p>
                <p style="margin: 2px 0;"><strong>Lugar de Expedición:</strong> CP ${billingSettings.companyPostalCode || '06700'}</p>
              </div>
            </div>

            <div class="section">
              <div class="section-title">Conceptos Facturados</div>
              <table>
                <thead>
                  <tr>
                    <th>ClaveProd</th>
                    <th>Cant</th>
                    <th>ClaveUnidad</th>
                    <th>Descripción</th>
                    <th style="text-align: right;">Precio Unitario</th>
                    <th style="text-align: right;">Importe</th>
                    <th style="text-align: right;">Impuesto (IVA)</th>
                  </tr>
                </thead>
                <tbody>
                  ${transaction.items.map(it => {
                    const ratePerc = it.taxRateApplied !== undefined ? it.taxRateApplied : (billingSettings.generalTaxRate ?? 16);
                    let base = it.price * it.quantity;
                    let taxAm = base * (ratePerc / 100);
                    let unitVal = it.price;
                    if (billingSettings.taxIncludedInPrice) {
                      base = (it.price * it.quantity) / (1 + (ratePerc / 100));
                      taxAm = (it.price * it.quantity) - base;
                      unitVal = it.price / (1 + (ratePerc / 100));
                    }
                    return `
                      <tr>
                        <td>43231500</td>
                        <td>${it.quantity.toFixed(2)}</td>
                        <td>H87</td>
                        <td>${it.name.toUpperCase()}</td>
                        <td style="text-align: right;">$${unitVal.toFixed(2)}</td>
                        <td style="text-align: right;">$${base.toFixed(2)}</td>
                        <td style="text-align: right;">$${taxAm.toFixed(2)} (IVA ${ratePerc}%)</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>

            <div class="totals">
              <div class="totals-row">
                <span>Subtotal:</span>
                <span>$${transaction.subtotal.toFixed(2)}</span>
              </div>
              <div class="totals-row">
                <span>Descuento:</span>
                <span>$${transaction.discount.toFixed(2)}</span>
              </div>
              <div class="totals-row">
                <span>Impuesto Trasladado (IVA):</span>
                <span>$${transaction.tax.toFixed(2)}</span>
              </div>
              <div class="totals-row grand">
                <span>TOTAL:</span>
                <span>$${transaction.total.toFixed(2)}</span>
              </div>
            </div>

            <div class="legal-block">
              <div class="qr-box">
                QR SAT MOCK<br/><br/>
                Para validación oficial
              </div>
              <div class="legal-text">
                <strong>Folio Fiscal (UUID) del SAT:</strong>
                ${inv.uuid}
                
                <strong>Fecha y Hora de Certificación:</strong>
                ${inv.certifiedAt}
                
                <strong>No. de Serie del Certificado SAT:</strong>
                00001000000504465028
                
                <strong>No. de Serie del Certificado del Emisor:</strong>
                00001000000512836254
                
                <strong>Sello Digital del CFDI:</strong>
                ${inv.satSignature || 'N/A'}
                
                <strong>Cadena Original del Complemento de Certificación del SAT:</strong>
                ${cadenaOriginal}
                
                <p style="margin-top: 10px; color: #999; font-style: italic;">Este documento es una representación impresa y legal ficticia de un CFDI 4.0 emitida en entornos de simulación educativa DuoPOS.</p>
              </div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      playSound('success');
    } else {
      alert('⚠️ Pop-up bloqueado. Permite ventanas emergentes para imprimir.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#141414]/75 backdrop-blur-xs flex items-center justify-center p-4 font-sans animate-fadeIn">
      <div className="bg-white border-2 border-gray-200 border-b-[8px] rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        
        {/* HEADER RAIL */}
        <div className="bg-gray-55 border-b border-gray-150 p-4 md:p-5 flex justify-between items-center bg-[#fdfdfd]">
          <div className="flex items-center gap-3">
            <span className="text-3xl select-none">🏛️</span>
            <div>
              <h3 className="text-lg font-black text-gray-800 tracking-tight flex items-center gap-2">
                {isVen ? 'Visor de Impresora Fiscal SENIAT' : 'Visor e Integrador del SAT'}
                <span className="bg-[#e2ffd9] text-[#58cc02] border border-[#a6e601] text-[9px] font-black uppercase px-2 py-0.5 rounded-lg font-mono">
                  {isVen ? 'Impresora Homologada Activa' : 'CFDI 4.0 Activo'}
                </span>
              </h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                {isVen ? `Factura en tiempo real • Control: ` : `Timbrado en tiempo real • Folio: `}
                <span className="font-mono text-gray-600 font-black">{isVen && inv.uuid ? inv.uuid.substring(9, 21) : inv.invoiceNo}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-xl transition-all cursor-pointer border"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>

        {/* TABS SELECTS */}
        <div className="flex border-b border-gray-150 bg-gray-50/50 p-2 gap-1 md:gap-2">
          <button
            onClick={() => { setActiveTab('pdf'); playSound('click'); }}
            className={`flex-1 md:flex-initial flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl font-black text-xs uppercase cursor-pointer transition-all ${
              activeTab === 'pdf' 
                ? 'bg-amber-500 text-white shadow-xs' 
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
            }`}
          >
            <FileText size={14} />
            <span>Representación PDF 📄</span>
          </button>

          <button
            onClick={() => { setActiveTab('xml'); playSound('click'); }}
            className={`flex-1 md:flex-initial flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl font-black text-xs uppercase cursor-pointer transition-all ${
              activeTab === 'xml' 
                ? 'bg-[#1cb0f6] text-white shadow-xs' 
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
            }`}
          >
            <Terminal size={14} />
            <span>{isVen ? 'Ticket Fiscal 📠' : 'XML Estructurado 💾'}</span>
          </button>

          <button
            onClick={() => { setActiveTab('validation'); playSound('click'); }}
            className={`flex-1 md:flex-initial flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl font-black text-xs uppercase cursor-pointer transition-all ${
              activeTab === 'validation' 
                ? 'bg-[#58cc02] text-white shadow-xs' 
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
            }`}
          >
            <ShieldCheck size={14} />
            <span>Validación PAC 🌐</span>
          </button>
        </div>

        {/* INNER SCROLL CONTENT wrapper */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/50">
          
          {/* TAB 1: PDF DESIGN REPRESENTATION */}
          {activeTab === 'pdf' && isVen && (
            <div className="bg-white border-2 border-gray-150 p-5 md:p-8 rounded-2xl shadow-xs space-y-6 max-w-3xl mx-auto text-[11px] leading-relaxed relative">
              
              {/* WATERMARK MOCK LEGAL */}
              <div className="absolute inset-0 flex items-center justify-center select-none pointer-events-none opacity-[0.03]">
                <span className="text-[120px] font-black -rotate-45 uppercase">SENIAT FISCAL</span>
              </div>

              {/* Emisor & Doc info header */}
              <div className="flex flex-col md:flex-row justify-between gap-4 border-b-2 border-dashed pb-6">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-[#58cc02] uppercase tracking-widest block font-mono">EMISOR FISCAL REGISTRADO</span>
                  <h4 className="text-sm font-black text-gray-800 leading-tight uppercase">{(billingSettings.companyName || 'DUO ACADEMIA COMERCIAL')}</h4>
                  <p className="text-gray-500 font-bold">R.I.F.: <span className="font-mono text-gray-800 font-black">{billingSettings.companyTaxId || 'J-120525D10'}</span></p>
                  <p className="text-gray-400 font-semibold">Dirección Fiscal: {billingSettings.companyAddress || 'Caracas, Distrito Capital'}</p>
                  <p className="text-gray-400 font-semibold">Autoridad Tributaria: SENIAT (Servicio Nacional Integrado)</p>
                </div>
                
                <div className="bg-gray-50 p-3 rounded-xl border-2 border-gray-150 text-right md:-mt-2 shrink-0 space-y-1">
                  <span className="text-[9px] font-black text-amber-500 tracking-wider block uppercase">Factura Fiscal</span>
                  <p className="text-xs font-black text-slate-800 font-mono">Factura Nro: {inv.invoiceNo}</p>
                  <p className="text-[10px] text-gray-400 font-bold">Nro Control: {inv.uuid ? inv.uuid.substring(9, 21) : '00-0001530'}</p>
                  <p className="text-[10px] text-gray-400 font-bold">Fecha: {transaction.date.replace('T', ' ').substring(0, 19)}</p>
                  <p className="text-[10px] text-indigo-655 font-black uppercase">Moneda Base: VES / USD</p>
                </div>
              </div>

              {/* Receptor Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b pb-4">
                <div className="space-y-1">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">Receptor Fiscal</span>
                  <h5 className="font-black text-gray-800 uppercase text-xs">{inv.fiscalName}</h5>
                  <p className="text-gray-500 font-bold">R.I.F. / C.I: <span className="font-mono text-gray-800 font-black">{inv.taxId}</span></p>
                  <p className="text-gray-500 font-bold">Dirección: CP {inv.postalCode || '1010'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">Condiciones SENIAT</span>
                  <p className="text-gray-500 font-semibold">Forma de Pago: {transaction.paymentMethod === 'cash' ? '01 - Efectivo USD' : '02 - Transferencia / Débito'}</p>
                  <p className="text-gray-500 font-semibold">Moneda del Pago: {transaction.paymentMethod === 'cash' ? 'Dólares Americanos (USD)' : 'Bolívares Digitales (VES)'}</p>
                  <p className="text-gray-500 font-semibold">Impresora Fiscal Nro: SENIAT-IMPFISCAL-DPG120525D10</p>
                </div>
              </div>

              {/* Line items table with VAT codes */}
              <div className="space-y-2">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">Artículos Facturados</span>
                
                <div className="overflow-x-auto border rounded-xl bg-gray-50/20">
                  <table className="w-full text-left text-[10.5px]">
                    <thead className="bg-gray-100 text-gray-500 font-black uppercase text-[9px] border-b">
                      <tr>
                        <th className="p-2.5">Código</th>
                        <th className="p-2.5 text-center">Cant</th>
                        <th className="p-2.5">Descripción</th>
                        <th className="p-2.5 text-right">P. Unitario</th>
                        <th className="p-2.5 text-right">Importe</th>
                        <th className="p-2.5 text-right">Tasa IVA</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-gray-700 font-medium">
                      {transaction.items.map((it, idx) => {
                        const ratePerc = it.taxRateApplied !== undefined ? it.taxRateApplied : (billingSettings.generalTaxRate ?? 16);
                        let base = it.price * it.quantity;
                        let taxAm = base * (ratePerc / 100);
                        let unitVal = it.price;
                        if (billingSettings.taxIncludedInPrice) {
                          base = (it.price * it.quantity) / (1 + (ratePerc / 100));
                          taxAm = (it.price * it.quantity) - base;
                          unitVal = it.price / (1 + (ratePerc / 100));
                        }
                        return (
                          <tr key={idx} className="hover:bg-gray-50/50">
                            <td className="p-2.5 font-mono text-gray-500 select-all">{it.productId.substring(0, 8).toUpperCase()}</td>
                            <td className="p-2.5 text-center font-bold font-mono">{it.quantity.toFixed(1)}</td>
                            <td className="p-2.5 font-bold uppercase truncate max-w-[200px]" title={it.name}>{it.name}</td>
                            <td className="p-2.5 text-right font-mono">${unitVal.toFixed(2)}</td>
                            <td className="p-2.5 text-right font-mono font-bold text-gray-900">${base.toFixed(2)}</td>
                            <td className="p-2.5 text-right font-mono text-emerald-600 bg-emerald-50/30 font-bold">${taxAm.toFixed(2)} (IVA {it.taxRateApplied ?? ratePerc}%)</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals split */}
              <div className="flex border-t-2 border-double pt-4">
                <div className="flex-1 pr-6 leading-normal text-gray-400 text-[10px] font-bold">
                  * FACTURA FISCAL MOCK. Este comprobante cumple con las especificaciones de facturación de la República Bolivariana de Venezuela para fines formativos de DuoPOS.
                </div>
                
                <div className="w-64 space-y-2 shrink-0">
                  <div className="flex justify-between font-bold text-gray-500 text-xs">
                    <span>Subtotal Neto:</span>
                    <span className="font-mono text-gray-800">${transaction.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-gray-500 text-xs">
                    <span>Descuento:</span>
                    <span className="font-mono text-red-500">-${transaction.discount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-gray-500 text-xs">
                    <span>I.V.A. General (16%):</span>
                    <span className="font-mono text-gray-800">${transaction.tax.toFixed(2)}</span>
                  </div>
                  {transaction.paymentMethod === 'cash' && (
                    <div className="flex justify-between font-bold text-indigo-700 bg-indigo-50 border border-indigo-150 p-1.5 rounded-lg text-[11px] animate-pulse">
                      <span>IGTF (3% Efectivo USD):</span>
                      <span className="font-mono">+${(transaction.total * 0.03).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-black text-gray-800 border-t pt-2 text-sm">
                    <span>Total Factura:</span>
                    <span className="font-mono text-[#58cc02]">
                      ${(transaction.total + (transaction.paymentMethod === 'cash' ? transaction.total * 0.03 : 0)).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Legal Block with real QR Code & stamp signatures */}
              <div className="border-t pt-5 mt-4 flex gap-4 text-[9px] text-gray-400 font-mono">
                <div className="shrink-0 flex items-center justify-center p-2.5 bg-gray-55 rounded-xl border font-sans font-bold text-[9px] text-gray-400 w-24 h-24 border-dashed select-none">
                  🧾<br/>IMPRESORA FISCAL
                </div>

                <div className="flex-1 space-y-2 overflow-hidden leading-tight text-gray-500 select-all">
                  <p className="truncate"><strong>Número de Control Fiscal:</strong> <span className="font-black text-gray-700">{inv.uuid ? inv.uuid.substring(9, 21) : '00-0001530'}</span></p>
                  <p className="truncate"><strong>Registro de Impresora:</strong> SENIAT-IMPFISCAL-DPG120525D10</p>
                  <p className="truncate"><strong>Fecha y Hora de Firma:</strong> {transaction.date.replace('T', ' ')}</p>
                  
                  <div className="space-y-1">
                    <span className="font-black text-gray-600 block text-[8px] uppercase">Firma Fiscal Digital:</span>
                    <p className="truncate bg-gray-50 p-1 border rounded text-[8px] text-gray-400 font-bold">{inv.satSignature || 'MOCK-HASH-SENIAT-8f8d9b1a'}</p>
                  </div>
                </div>
              </div>

            </div>
          )}

          {activeTab === 'pdf' && !isVen && (
            <div className="bg-white border-2 border-gray-150 p-5 md:p-8 rounded-2xl shadow-xs space-y-6 max-w-3xl mx-auto text-[11px] leading-relaxed relative">
              
              {/* WATERMARK MOCK LEGAL */}
              <div className="absolute inset-0 flex items-center justify-center select-none pointer-events-none opacity-[0.03]">
                <span className="text-[120px] font-black -rotate-45 uppercase">SIMULACIÓN</span>
              </div>

              {/* Emisor & Doc info header */}
              <div className="flex flex-col md:flex-row justify-between gap-4 border-b-2 border-dashed pb-6">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-[#58cc02] uppercase tracking-widest block font-mono">EMISOR DEL COMPROBANTE</span>
                  <h4 className="text-sm font-black text-gray-800 leading-tight uppercase">{(billingSettings.companyName || 'DUO ACADEMIA S.A. DE C.V.')}</h4>
                  <p className="text-gray-500 font-bold">RFC: <span className="font-mono text-gray-800 font-black">{billingSettings.companyTaxId || 'DAC120525D10'}</span></p>
                  <p className="text-gray-400 font-semibold">Dirección: {billingSettings.companyAddress || 'Nido Verde #12, Bosque de Duolingo'}</p>
                  <p className="text-gray-400 font-semibold">Lugar de Expedición: CP {billingSettings.companyPostalCode || '06700'} | Régimen: {billingSettings.companyRegime || '601 Personas Morales'}</p>
                </div>
                
                <div className="bg-gray-50 p-3 rounded-xl border-2 border-gray-150 text-right md:-mt-2 shrink-0 space-y-1">
                  <span className="text-[9px] font-black text-amber-500 tracking-wider block uppercase">Factura Digital</span>
                  <p className="text-xs font-black text-slate-800 font-mono">Serie/Folio: {inv.invoiceNo}</p>
                  <p className="text-[10px] text-gray-400 font-bold">Tipo: I - Ingreso</p>
                  <p className="text-[10px] text-gray-400 font-bold">Fecha: {transaction.date.replace('T', ' ')}</p>
                  <p className="text-[10px] text-gray-400 font-bold">Moneda: MXN • Exportación: 01</p>
                </div>
              </div>

              {/* Receptor Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b pb-4">
                <div className="space-y-1">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">Receptor Fiscal</span>
                  <h5 className="font-black text-gray-800 uppercase text-xs">{inv.fiscalName}</h5>
                  <p className="text-gray-500 font-bold">RFC: <span className="font-mono text-gray-800 font-black">{inv.taxId}</span></p>
                  <p className="text-gray-500 font-bold">Domicilio CP: <span className="font-mono text-gray-800">{inv.postalCode}</span></p>
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">Esquema Sat</span>
                  <p className="text-gray-500 font-bold">Uso del CFDI: <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[10px] border border-blue-100 font-black">{inv.useCFDI || 'G03 - Gastos en general'}</span></p>
                  <p className="text-gray-500 font-semibold">Régimen Receptor: {inv.regime || '626 - RESICO'}</p>
                  <p className="text-gray-500 font-semibold">Forma de Pago: {inv.paymentForm || '01 - Efectivo'}</p>
                  <p className="text-gray-500 font-semibold">Método de Pago: PUE - Pago en una sola Exhibición</p>
                </div>
              </div>

              {/* Line items table with SAT codes */}
              <div className="space-y-2">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">Conceptos Declarados</span>
                
                <div className="overflow-x-auto border rounded-xl bg-gray-50/20">
                  <table className="w-full text-left text-[10.5px]">
                    <thead className="bg-gray-100 text-gray-500 font-black uppercase text-[9px] border-b">
                      <tr>
                        <th className="p-2.5">Clave SAT</th>
                        <th className="p-2.5 text-center">Cant</th>
                        <th className="p-2.5">Unidad</th>
                        <th className="p-2.5">Descripción</th>
                        <th className="p-2.5 text-right">P. Unitario</th>
                        <th className="p-2.5 text-right">Importe</th>
                        <th className="p-2.5 text-right">Tasa/IVA</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-gray-700 font-medium">
                      {transaction.items.map((it, idx) => {
                        const ratePerc = it.taxRateApplied !== undefined ? it.taxRateApplied : (billingSettings.generalTaxRate ?? 16);
                        let base = it.price * it.quantity;
                        let taxAm = base * (ratePerc / 100);
                        let unitVal = it.price;
                        if (billingSettings.taxIncludedInPrice) {
                          base = (it.price * it.quantity) / (1 + (ratePerc / 100));
                          taxAm = (it.price * it.quantity) - base;
                          unitVal = it.price / (1 + (ratePerc / 100));
                        }
                        return (
                          <tr key={idx} className="hover:bg-gray-50/50">
                            <td className="p-2.5 font-mono text-gray-500 select-all">43231500</td>
                            <td className="p-2.5 text-center font-bold font-mono">{it.quantity.toFixed(2)}</td>
                            <td className="p-2.5 text-gray-400">H87 - Pieza</td>
                            <td className="p-2.5 font-bold uppercase truncate max-w-[200px]" title={it.name}>{it.name}</td>
                            <td className="p-2.5 text-right font-mono">${unitVal.toFixed(2)}</td>
                            <td className="p-2.5 text-right font-mono font-bold text-gray-900">${base.toFixed(2)}</td>
                            <td className="p-2.5 text-right font-mono text-emerald-600 bg-emerald-50/30 font-bold">${taxAm.toFixed(2)} ({it.taxRateApplied ?? ratePerc}%)</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals split */}
              <div className="flex border-t-2 border-double pt-4">
                <div className="flex-1 pr-6 leading-normal text-gray-400 text-[10px] font-bold">
                  * Este comprobante fiscal se emite de conformidad con las leyes vigentes del SAT de carácter simulado educativo de DuoPOS. PAC autorizador: DIL120525A12.
                </div>
                
                <div className="w-56 space-y-2 shrink-0">
                  <div className="flex justify-between font-bold text-gray-500 text-xs">
                    <span>Subtotal:</span>
                    <span className="font-mono text-gray-800">${transaction.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-gray-500 text-xs">
                    <span>Descuento:</span>
                    <span className="font-mono text-red-500">-${transaction.discount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-gray-500 text-xs">
                    <span>Desglose {billingSettings.taxName} (16%):</span>
                    <span className="font-mono text-gray-800">${transaction.tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-black text-gray-800 border-t pt-2 text-sm">
                    <span>Total CFDI:</span>
                    <span className="font-mono text-[#58cc02]">${transaction.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Legal Block with real QR Code & stamp signatures */}
              <div className="border-t pt-5 mt-4 flex gap-4 text-[9px] text-gray-400 font-mono">
                <div className="shrink-0">
                  <SATQRCode transaction={transaction} billingSettings={billingSettings} size={96} />
                </div>

                <div className="flex-1 space-y-2 overflow-hidden leading-tight text-gray-500 select-all">
                  <p className="truncate"><strong>Folio Fiscal (UUID):</strong> <span className="font-black text-gray-700">{inv.uuid}</span></p>
                  <p className="truncate"><strong>Certificado SAT:</strong> 00001000000504465028</p>
                  <p className="truncate"><strong>Fecha Certificación:</strong> {inv.certifiedAt}</p>
                  
                  <div className="space-y-1">
                    <span className="font-black text-gray-600 block text-[8px] uppercase">Sello Digital CFD:</span>
                    <p className="truncate bg-gray-50 p-1 border rounded text-[8px] text-gray-400 font-bold">{inv.satSignature || 'fO9rR47d7vDqPlKszx8yvN60I9...==='}</p>
                  </div>
                  
                  <div className="space-y-1">
                    <span className="font-black text-gray-600 block text-[8px] uppercase">Cadena Original del SAT:</span>
                    <p className="truncate bg-gray-50 p-1 border rounded text-[8px] text-gray-400 font-bold">{cadenaOriginal}</p>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: RAW SYNTAX XML ENHANCED INSPECTOR */}
          {activeTab === 'xml' && (
            <div className="space-y-4 max-w-4xl mx-auto">
              <div className="bg-sky-50 border border-sky-150 p-3 rounded-2xl flex items-center justify-between text-xs text-sky-800 font-bold">
                <p>
                  {isVen 
                    ? '💡 Puedes copiar esta Firma y Log del Ticket Fiscal emitido por la Impresora Homologada SENIAT para tu reporte diario.'
                    : '💡 Puedes copiar este XML oficial y subirlo directamente al validador web del SAT. Cumple con el esquema estructural CFDI 4.0.'}
                </p>
                <span className="text-xl shrink-0 select-none">🧾</span>
              </div>
              
              {/* Syntax highlighted XML block container */}
              <div className="bg-[#141414] rounded-2xl border-2 border-slate-800 p-4 font-mono text-[11px] text-gray-300 leading-relaxed overflow-x-auto select-all max-h-[500px]">
                <pre>{xmlContent}</pre>
              </div>
            </div>
          )}

          {/* TAB 3: SAT PAC LIVE WEBSERVICE SIMULATOR */}
          {activeTab === 'validation' && (
            <div className="max-w-xl mx-auto space-y-5 animate-fadeIn">
              <div className="bg-white border-2 border-[#e5e5e5] border-b-[8px] rounded-3xl p-5 space-y-4 shadow-xs">
                <div className="text-center space-y-2">
                  <span className="text-5xl select-none animate-pulse block">📡</span>
                  <h4 className="text-lg font-black text-gray-800 uppercase tracking-tight">{isVen ? 'Portal Fiscal SENIAT' : 'PAC Fiscal WebService'}</h4>
                  <p className="text-xs text-gray-400 font-black leading-relaxed max-w-sm mx-auto uppercase">
                    {isVen 
                      ? 'Consulta el estatus de la firma de tu impresora homologada frente al SENIAT' 
                      : 'Consulta el estatus legal en tiempo real de tu racha comercial frente a los servidores tributarios'}
                  </p>
                </div>

                <div className="border border-dashed border-gray-200 p-4 rounded-2xl bg-gray-50 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase text-gray-400 block tracking-wider">{isVen ? 'Nro Control' : 'UUID en consulta'}</span>
                    <span className="font-mono text-xs font-black text-indigo-600 select-all">{isVen && inv.uuid ? inv.uuid.substring(9, 21) : inv.uuid}</span>
                  </div>
                  
                  {validationState === 'success' ? (
                    <span className="bg-[#58cc02] text-white border-2 border-[#3c9e01] text-[10px] font-black px-3 py-1 rounded-full uppercase flex items-center gap-1">
                      ● VIGENTE
                    </span>
                  ) : validationState === 'calling' ? (
                    <span className="bg-amber-400 text-amber-950 text-[10px] font-black px-3 py-1 rounded-full uppercase animate-pulse">
                      🌀 VALIDANDO...
                    </span>
                  ) : (
                    <span className="bg-gray-200 text-gray-600 text-[10px] font-black px-3 py-1 rounded-full uppercase">
                      PENDIENTE
                    </span>
                  )}
                </div>

                {/* Validation logs terminal console */}
                <div className="bg-[#1e1e1e] border-2 border-slate-800 p-3.5 rounded-2xl font-mono text-[10.5px] text-emerald-400 h-44 overflow-y-auto space-y-1.5 shadow-inner">
                  <p className="text-gray-500">DuoPOS PAC Client CLI v2026.05</p>
                  <p className="text-gray-500">--------------------------------------</p>
                  
                  {validationLog.length === 0 ? (
                    <p className="text-gray-400 font-bold italic">La consola está vacía. Inicia la verificación arriba.</p>
                  ) : (
                    validationLog.map((log, i) => (
                      <p key={i} className="leading-tight break-all">{log}</p>
                    ))
                  )}
                </div>

                <div className="pt-2 text-center">
                  {validationState !== 'success' && (
                    <button
                       type="button"
                       disabled={validationState === 'calling'}
                       onClick={triggerSATValidation}
                       className="w-full bg-[#58cc02] text-white border-b-4 border-[#3c9e01] py-3 rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-[#61e002] active:translate-y-px active:border-b-0 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                       <RefreshCcw size={14} className={validationState === 'calling' ? 'animate-spin' : ''} />
                       {isVen ? 'Consultar R.I.F. & Firma en el SENIAT' : 'Consultar RFC & Firma en el SAT'}
                    </button>
                  )}
                  {validationState === 'success' && (
                    <div className="bg-green-50 border border-green-200 p-3 rounded-2xl text-green-800 font-black text-xs flex items-center gap-2 justify-center">
                       <span>{isVen ? '✅ ¡Factura registrada con estatus "Vigente" y validada por el SENIAT!' : '✅ ¡Comprobante timbrado con estatus "Vigente" y validado por el SAT!'}</span>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

        </div>

        {/* BOTTOM ACTION BUTTONS */}
        <div className="bg-gray-50 border-t border-gray-150 p-4 flex flex-wrap gap-2.5 items-center justify-between">
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={handlePrintPDF}
              className="flex-1 sm:flex-initial py-2.5 px-3.5 bg-amber-500 text-white border-b-4 border-amber-700 hover:bg-amber-400 active:translate-y-px active:border-b-0 font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Printer size={13} />
              <span>Imprimir / PDF 📄</span>
            </button>

            <button
              onClick={handleDownloadXML}
              className="flex-1 sm:flex-initial py-2.5 px-3.5 bg-[#1cb0f6] text-white border-b-4 border-sky-700 hover:bg-sky-400 active:translate-y-px active:border-b-0 font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Download size={13} />
              <span>Descargar XML 💾</span>
            </button>

            <button
              onClick={handleCopyXML}
              className="flex-1 sm:flex-initial py-2.5 px-3.5 bg-white text-gray-700 border-2 border-gray-200 border-b-4 hover:bg-gray-50 active:translate-y-px active:border-b-2 font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer flex items-center justify-center gap-1.5"
            >
              {copied ? <Check size={13} className="text-[#58cc02]" /> : <Copy size={13} />}
              <span>{copied ? '¡Copiado!' : 'Copiar XML'}</span>
            </button>
          </div>

          <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0 items-center justify-end">
            {/* Email simulation input */}
            <div className="relative w-44">
              <input
                type="email"
                placeholder="correo@ejemplo.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="w-full pl-2 pr-6 py-1.5 border bg-white rounded-lg text-[10.5px] font-bold outline-none"
              />
              <button
                onClick={handleSimulateEmail}
                className="absolute right-1 top-1.5 text-gray-400 hover:text-indigo-600 transition-colors"
                title="Socio de correo"
              >
                <Send size={12} />
              </button>
            </div>
            
            {sentEmail && (
              <span className="text-[10px] font-black text-green-600 animate-pulse">¡Enviado!</span>
            )}
            
            <button
              onClick={onClose}
              className="py-2.5 px-4 bg-white text-gray-500 border-2 border-gray-200 border-b-4 hover:bg-gray-50 active:translate-y-px active:border-b-2 font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
