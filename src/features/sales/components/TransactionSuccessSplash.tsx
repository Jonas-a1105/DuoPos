/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Transaction, User, LegalBillingSettings, HardwareDeviceSettings } from '../../../types/index';
import { Character, DUO_CHARACTERS } from '../../../initialData';
import { playSound } from '../../../services/audio/soundService';
import { toast } from '../../../shared/ui/FlashNotifications/FlashNotifications';
import { generateRawEscPos } from '../../../services/print/printService';

interface TransactionSuccessSplashProps {
  celebrateTxn: Transaction | null;
  setCelebrateTxn: (txn: Transaction | null) => void;
  user: User;
  billingSettings: LegalBillingSettings;
  hardwareSettings: HardwareDeviceSettings;
  setSelectedTxnForActiveInvoice: (txn: Transaction | null) => void;
  onGrantXp: (xp: number) => void;
  exchangeRate?: number;
  setPromoMessage: (msg: string) => void;
}

export default function TransactionSuccessSplash({
  celebrateTxn,
  setCelebrateTxn,
  user,
  billingSettings,
  hardwareSettings,
  setSelectedTxnForActiveInvoice,
  onGrantXp,
  exchangeRate = 53.05,
  setPromoMessage,
}: TransactionSuccessSplashProps) {
  const [copiedNotification, setCopiedNotification] = useState(false);

  if (!celebrateTxn) return null;

  const activeChar: Character = DUO_CHARACTERS[user.avatar] || DUO_CHARACTERS.duo;

  const handlePrintEscPosTicket = (txn: Transaction) => {
    playSound('swoosh');
    setPromoMessage('🖨️ [ESC/POS] Enviando binario raw thermal al bus IoT...');
    toast.info('Generando payload binario ESC/POS para el ticket thermal...', {
      title: 'Imprimiendo... 🖨️',
      duration: 1500,
    });
    setTimeout(() => {
      const receiptData = {
        companyName: billingSettings.companyName || 'DuoPOS S.A. de C.V.',
        taxId: billingSettings.companyTaxId || 'DUO091218ACC',
        items: txn.items.map((it) => ({
          name: it.name,
          qty: it.quantity,
          price: it.price,
          total: it.price * it.quantity,
        })),
        subtotal: txn.subtotal,
        tax: txn.tax,
        discount: txn.discount,
        total: txn.total,
        paymentMethod: txn.paymentMethod,
        date: new Date(txn.date).toLocaleString('es-ES'),
        invoiceNo: txn.invoiceData?.invoiceNo,
        uuid: txn.invoiceData?.uuid,
        cardPaymentDetails: txn.cardPaymentDetails,
      };

      const rawText = generateRawEscPos(receiptData, hardwareSettings.thermalPrinter);
      console.log('ESC/POS payload successfully generated:\n', rawText);

      toast.success('¡Impresión finalizada! Ticket registrado en el Bus IoT.', {
        title: 'Impresión Exitosa 🖨️',
        duration: 5000,
      });
      toast.info(
        `Impresión finalizada. Dispositivo: Térmico (${hardwareSettings.thermalPrinter.paperWidth}), Puerto: ${hardwareSettings.thermalPrinter.connectionType.toUpperCase()}.`,
        { title: 'Impresión ESC/POS 🔌', duration: 5000 }
      );
    }, 800);
  };

  // Real-world dynamic ticket printer
  const handlePrintReceipt = (txn: Transaction) => {
    try {
      const esc = (s: string | number | undefined | null) =>
        String(s ?? '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error(
          '⚠️ Pop-up bloqueado. Por favor, permite ventanas emergentes para poder imprimir recibos de facturación.',
        );
        return;
      }

      const hasInvoice = !!txn.invoiceData;
      const inv = txn.invoiceData;
      const curSymbol = billingSettings?.currencySymbol || '$';
      const curDecimals = billingSettings?.currencyDecimals !== undefined ? billingSettings.currencyDecimals : 2;

      const itemsHtml = txn.items
        .map((it) => {
          const rateLabel = it.taxRateApplied !== undefined ? ` [Tasa ${it.taxRateApplied}%]` : '';
          return `
        <tr>
          <td style="padding: 4px 0;">
            ${esc(it.emoji)} ${esc(it.name)} x${it.quantity}
            <span style="font-size: 8px; color: #666; display: block;">${esc(rateLabel)}</span>
          </td>
          <td align="right" style="padding: 4px 0; font-family: monospace;">${curSymbol}${(it.price * it.quantity).toFixed(curDecimals)}</td>
        </tr>
      `;
        })
        .join('');

      const qrUrl = inv
        ? `https://api.qrserver.com/v1/create-qr-code/?size=100x100&color=000&data=${encodeURIComponent(`https://duopos.mock/verificar?uuid=${inv.uuid}&total=${txn.total}`)}`
        : '';

      printWindow.document.write(`
        <html>
          <head>
            <title>Ticket DuoPOS - ${esc(txn.id)}</title>
            <style>
              body {
                font-family: 'Courier New', Courier, monospace;
                padding: 10px;
                max-width: ${billingSettings?.ticketWidth === '58mm' ? '210px' : '300px'};
                margin: 0 auto;
                font-size: 11px;
                color: #222;
                line-height: 1.3;
              }
              .text-center { text-align: center; }
              .header { font-size: 14px; font-weight: bold; margin-bottom: 2px; color: #58cc02; }
              .separator { border-top: 1px dashed #555; margin: 8px 0; }
              table { width: 100%; font-size: 11px; border-collapse: collapse; }
              .total-row { font-weight: bold; font-size: 12px; border-top: 1px solid #000; }
              .reward { background-color: #f2ffd9; border: 1px dashed #58cc02; padding: 6px; margin-top: 10px; text-align: center; font-family: system-ui, sans-serif; border-radius: 8px; font-weight: bold; color: #46a302; font-size: 11px; }
              .invoice-box { background-color: #fafafa; border: 1px solid #ddd; padding: 8px; border-radius: 6px; font-size: 9px; margin: 10px 0; }
              .seal-text { font-size: 7px; overflow-wrap: break-word; color: #666; font-family: monospace; display: block; margin-top: 3px; }
            </style>
          </head>
          <body>
            <div class="text-center header">🦉 ${esc(billingSettings?.companyName || 'Duo Academia S.A. de C.V.')} 🦉</div>
            ${
              billingSettings?.customTicketHeader
                ? `
            <div class="text-center" style="font-size: 9px; font-weight: bold; margin-bottom: 4px; color: #555; line-height: 1.2;">
              ${esc(billingSettings.customTicketHeader)}
            </div>`
                : ''
            }
            <div class="text-center" style="font-size: 9px; font-weight: bold; color: #555;">
              ${esc(billingSettings?.companyAddress || 'Nido Verde #12, Bosque de Duolingo')}<br/>
              CP: ${esc(billingSettings?.companyPostalCode || '06700')} | RFC: ${esc(billingSettings?.companyTaxId || 'DAC120525D10')}
            </div>
            <div class="separator"></div>
            
            <div><strong>FOLIO TICKET:</strong> ${esc(txn.id)}</div>
            <div><strong>FECHA EMISIÓN:</strong> ${esc(new Date(txn.date).toLocaleString())}</div>
            <div><strong>CAJERO:</strong> ${esc(txn.employeeName.toUpperCase())}</div>
            
            ${
              inv
                ? `
            <div class="invoice-box">
               <div class="text-center" style="font-weight: bold; text-decoration: underline; margin-bottom: 4px;">FACTURA ELECTRÓNICA LEGAL (SIMULADA)</div>
              <strong>FOLIO FISCAL:</strong> ${esc(inv.invoiceNo)}<br/>
              <strong>UUID SAT:</strong> <span style="font-family: monospace; font-size: 8px;">${esc(inv.uuid)}</span><br/>
              <strong>FECHA TIMBRADO:</strong> ${esc(new Date(inv.certifiedAt).toLocaleString())}<br/>
              <strong>RÉGIMEN FISCAL EMISOR:</strong> ${esc(billingSettings?.companyRegime || '601 General')}<br/>
              <div style="border-top: 1px solid #eee; margin: 4px 0;"></div>
              <strong>RECEPTOR:</strong> ${esc(inv.fiscalName)}<br/>
              <strong>RFC RECEPTOR:</strong> ${esc(inv.taxId)}<br/>
              <strong>CP RECEPTOR:</strong> ${esc(inv.postalCode)}<br/>
              <strong>USO CFDI:</strong> ${esc(inv.useCFDI)}<br/>
              <strong>FORMA PAGO:</strong> ${esc(inv.paymentForm)}
            </div>
            `
                : ''
            }
 
            <div class="separator"></div>
            <table>
              <thead>
                <tr>
                  <th align="left" style="border-bottom: 1px solid #333; padding-bottom: 4px;">Detalle</th>
                  <th align="right" style="border-bottom: 1px solid #333; padding-bottom: 4px;">Monto</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
            <div class="separator"></div>
            <table>
              <tr>
                <td>Subtotal (Consumo base):</td>
                <td align="right">${curSymbol}${txn.subtotal.toFixed(curDecimals)}</td>
              </tr>
              ${
                txn.discount > 0
                  ? `
              <tr>
                <td>Descuentos/Club:</td>
                <td align="right">-${curSymbol}${txn.discount.toFixed(curDecimals)}</td>
              </tr>`
                  : ''
              }
              <tr>
                <td>Impuestos desglosados (${billingSettings?.taxName || 'IVA'}):</td>
                <td align="right">${curSymbol}${txn.tax.toFixed(curDecimals)}</td>
              </tr>
              <tr class="total-row">
                <td style="padding-top: 5px;">TOTAL FINAL PAGADO:</td>
                <td align="right" style="padding-top: 5px;">${curSymbol}${txn.total.toFixed(curDecimals)}</td>
              </tr>
            </table>

            <div class="separator"></div>
            <div class="text-center"><strong>MÉTODO DE COBRO:</strong> ${esc(txn.paymentMethod.toUpperCase())}</div>
            
            ${
              txn.cardPaymentDetails
                ? `
            <div class="invoice-box" style="margin-top: 6px; font-size: 8px; line-height: 1.4;">
              <div style="font-weight: bold; text-align: center; border-bottom: 1px solid #ddd; padding-bottom: 2px; margin-bottom: 3px; font-size: 8.5px;">CONEXIÓN INTEGRACIÓN POS</div>
              <strong>SUCURSAL TERMINAL:</strong> ${esc(txn.cardPaymentDetails.terminalId)}<br/>
              <strong>PROVEEDOR RED:</strong> ${esc(txn.cardPaymentDetails.brand)}<br/>
              <strong>TARJETA CLIENTE:</strong> **** **** **** ${esc(txn.cardPaymentDetails.last4)}<br/>
              <strong>TITULAR:</strong> ${esc(txn.cardPaymentDetails.cardholderName.toUpperCase())}<br/>
              <strong>COD. AUTORIZACION:</strong> ${esc(txn.cardPaymentDetails.authCode)}<br/>
              <strong>EMV AID:</strong> ${esc(txn.cardPaymentDetails.aid)}<br/>
              <strong>EMV ARQC:</strong> ${esc(txn.cardPaymentDetails.arqc)}<br/>
              ${
                txn.cardPaymentDetails.signatureBase64
                  ? `
              <div style="text-align: center; margin-top: 6px; text-transform: uppercase;">
                <span style="font-size: 6.5px; display: block; color: #555; font-weight: bold;">Firma Electrónica Autorizada:</span>
                <img src="${txn.cardPaymentDetails.signatureBase64}" style="height: 30px; max-width: 120px; border: 1px solid #999; padding: 1px; border-radius: 4px; background-color: #fff; display: inline-block; margin-top: 2px;" />
              </div>
              `
                  : ''
              }
            </div>
            `
                : ''
            }
            
             ${
               txn.customerId
                 ? `
             <div class="text-center" style="margin-top: 6px; font-weight: bold; font-size: 10px;">
               📈 PUNTOS DE FIDELIDAD:<br />
               ${txn.gemsRedeemed ? `Canjeados: -${txn.gemsRedeemed} Pts` : ''}
               ${txn.gemsRedeemed && txn.gemsGained ? ' | ' : ''}
               ${txn.gemsGained ? `Ganados: +${txn.gemsGained} Pts` : ''}
             </div>`
                 : ''
             }

            ${
              inv
                ? `
            <div class="separator"></div>
            <div class="text-center" style="margin-top: 5px;">
              <img src="${qrUrl}" alt="QR SAT" style="width: 80px; height: 80px; display: inline-block;" />
              <div style="font-size: 7px; color: #666; margin-top: 4px;">
                Este documento es una representación impresa de un CFDI simulado educacional.
              </div>
              <div style="border: 1px solid #eee; padding: 4px; text-align: left; margin-top: 4px; border-radius: 4px;">
                <strong style="font-size: 7px; display: block; text-transform: uppercase;">Sello Digital Sat Mock:</strong>
                <span class="seal-text">${esc(inv.satSignature)}</span>
                <strong style="font-size: 7px; display: block; text-transform: uppercase; margin-top: 3px;">Autoridad Certificadora:</strong>
                <span style="font-size: 7px; color: #444;">${esc(billingSettings?.certifyingAuthority || 'SAT Ficticio')}</span>
              </div>
            </div>
            `
                : ''
            }

            <div class="reward" style="border: 1px solid #ddd; padding: 4.5px; border-radius: 4px; margin-top: 6px; font-size: 8px;">
              ¡GRACIAS POR SU COMPRA!<br />Servicio de Facturación StockMaster Pro
            </div>
            
            <div style="margin-top: 12px; font-size: 9px;" class="text-center">¡Gracias por su preferencia!</div>
            <script>
              window.onload = function() {
                window.print();
                setTimeout(() => { window.close(); }, 1200);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (err) {
      console.error('Error in receipt printing process', err);
    }
  };

  // Real-world native share or clipboard backup
  const handleShareReceipt = async (txn: Transaction) => {
    const shareText =
      `💼 StockMaster Pro Ticket ${txn.id} 💼\n` +
      `---------------------------\n` +
      `Cajero: ${txn.employeeName}\n` +
      `Fecha: ${new Date(txn.date).toLocaleDateString()}\n` +
      `Detalles:\n` +
      txn.items
        .map((it) => `• ${it.emoji} ${it.name} (x${it.quantity}) - $${(it.price * it.quantity).toFixed(2)}`)
        .join('\n') +
      `\n---------------------------\n` +
      `Subtotal: $${txn.subtotal.toFixed(2)}\n` +
      (txn.discount > 0 ? `Descuento: -$${txn.discount.toFixed(2)}\n` : '') +
      `Impuestos: $${txn.tax.toFixed(2)}\n` +
      `TOTAL: $${txn.total.toFixed(2)} USD\n` +
      `---------------------------\n` +
      (txn.customerId
        ? `📈 Puntos de Fidelidad: ${txn.gemsRedeemed ? `Canjeados: -${txn.gemsRedeemed} Pts ` : ''}${txn.gemsGained ? `| Ganados: +${txn.gemsGained} Pts` : ''}\n---------------------------\n`
        : '') +
      `¡Gracias por su preferencia!`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Ticket DuoPOS - ${txn.id}`,
          text: shareText,
        });
      } catch (err) {
        console.log('Dynamic native sharing canceled by user', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
        setCopiedNotification(true);
        setTimeout(() => setCopiedNotification(false), 2000);
      } catch (err) {
        toast.warning('No se pudo copiar el recibo al portapapeles.', { title: 'Portapapeles' });
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col items-center justify-center p-4 font-sans animate-zoomIn text-white text-center">
      <div className="max-w-md w-full space-y-6">
        {/* Success checkmark animates elegantly */}
        <div className="mx-auto w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg border border-emerald-450 animate-bounce">
          <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <div className="space-y-1.5 animate-fadeIn">
          <span className="text-xl font-black tracking-widest text-[#d2f09d] uppercase">¡VENTA COMPLETADA!</span>
          <h2 className="text-3xl md:text-4xl font-black leading-tight tracking-tight">
            Transacción Exitosa
          </h2>
          <p className="text-white/80 font-bold text-xs max-w-xs mx-auto italic">El cobro ha sido procesado e ingresado a caja correctamente.</p>
        </div>

        {/* Dynamic Receipt Metadata */}
        <div className="bg-white/10 backdrop-blur-md rounded-3xl p-5 border border-white/20 space-y-4">
          <div className="flex justify-between items-center border-b border-white/10 pb-3 text-sm">
            <span className="font-extrabold text-white/80 uppercase tracking-wider text-xs">Monto Total Recaudado</span>
            <span className="text-2xl font-black font-mono">${celebrateTxn.total.toFixed(2)}</span>
          </div>

          <div className="flex justify-around items-center text-xs font-semibold py-1">
            <div className="flex flex-col items-center">
              <span className="text-xl">📊</span>
              <span className="text-[10px] uppercase font-black text-white/70 tracking-widest mt-1">REGISTRO</span>
              <span className="text-sm font-black mt-0.5">COMPLETADO</span>
            </div>

            <div className="h-6 w-[1px] bg-white/10" />

            <div className="flex flex-col items-center">
              <span className="text-xl">🔒</span>
              <span className="text-[10px] uppercase font-black text-white/70 tracking-widest mt-1">ESTADO</span>
              <span className="text-sm font-black mt-0.5">AUDITADO</span>
            </div>
          </div>

          {/* Simulated Cash Drawer Alert */}
          {celebrateTxn.paymentMethod === 'cash' && (
            <div className="bg-yellow-400/20 border-2 border-yellow-450 rounded-2xl p-3 text-xs text-yellow-100 flex items-center gap-2.5 shadow-sm animate-pulse text-left">
              <span className="text-2xl">🔓</span>
              <div>
                <span className="font-extrabold text-yellow-300 block uppercase text-[10px] tracking-wider leading-none">
                  Cajón de Dinero Abierto (Click!)
                </span>
                <span className="font-semibold block text-[10px] text-white/95 mt-1 animate-fadeIn">
                  Guarda el efectivo recibido y entrega el cambio correspondiente al cliente.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Real printing and sharing actions */}
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => handlePrintReceipt(celebrateTxn)}
              className="bg-[#1cb0f6] text-white border-b-4 border-[#128bd0] hover:bg-[#34beff] active:translate-y-[2px] active:border-b-2 py-3 px-2 rounded-2xl font-black text-[10.5px] uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer"
            >
              📄 Ticket Estándar PDF
            </button>

            <button
              type="button"
              onClick={() => handlePrintEscPosTicket(celebrateTxn)}
              className="bg-slate-800 text-teal-300 border-b-4 border-slate-950 hover:bg-slate-700 active:translate-y-[2px] active:border-b-2 py-3 px-2 rounded-2xl font-black text-[10.5px] uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer"
            >
              🖨️ Ticket Térmico ESC/POS
            </button>
          </div>

          <button
            type="button"
            onClick={() => handleShareReceipt(celebrateTxn)}
            className="w-full bg-yellow-400 text-amber-955 border-b-4 border-[#caa200] hover:bg-[#fed635] active:translate-y-[2px] active:border-b-2 py-2.5 px-2 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {copiedNotification ? (
              <span className="animate-pulse text-[10px] text-green-900 font-extrabold">¡Copiado en Portapapeles!</span>
            ) : (
              <>Compartir Recibo 📲</>
            )}
          </button>
        </div>

        {celebrateTxn.invoiceData && (
          <button
            type="button"
            onClick={() => {
              setSelectedTxnForActiveInvoice(celebrateTxn);
            }}
            className="w-full bg-[#1e293b] text-white border-b-6 border-[#0f172a] hover:bg-slate-700 active:translate-y-[2px] active:border-b-2 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
          >
            🔍 Inspeccionar Factura XML/PDF (CFDI v4.0) 🏛️
          </button>
        )}

        {/* Action buttons to resume */}
        <button
          onClick={() => setCelebrateTxn(null)}
          className="w-full bg-white text-indigo-950 border-b-[6px] border-[#dddddd] hover:bg-gray-50 active:border-b-0 active:translate-y-[6px] py-4 rounded-3xl font-black text-lg uppercase tracking-wider transition-all cursor-pointer"
        >
          Siguiente Cliente
        </button>

        <span className="text-xs text-white/50 font-black uppercase tracking-widest block">
          StockMaster Pro • Sistema de Gestión de Caja
        </span>
      </div>
    </div>
  );
}
