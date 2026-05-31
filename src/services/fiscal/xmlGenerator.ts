/**
 * SAT CFDI 4.0 XML invoice generation.
 */

import type { Transaction, LegalBillingSettings } from '../../types';
import { getClaveProdServ } from './satCatalogs';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function generateCFDI40XML(txn: Transaction, settings: LegalBillingSettings): string {
  if (!txn.invoiceData) return '';
  const inv = txn.invoiceData;

  if (!settings.companyTaxId) return '';
  const emisorRfc = settings.companyTaxId;
  const emisorNombre = escapeXml((settings.companyName || '').toUpperCase());
  const emisorRegimeCode = settings.companyRegime ? settings.companyRegime.split(' ')[0] : '601';
  const emisorPostalCode = settings.companyPostalCode || '06700';

  const receptorRfc = escapeXml(inv.taxId.toUpperCase());
  const receptorNombre = escapeXml(inv.fiscalName.toUpperCase());
  const receptorRegimeCode = inv.regime ? inv.regime.split(' ')[0] : '601';
  const receptorPostalCode = inv.postalCode || '06700';
  const usoCfdiCode = inv.useCFDI ? inv.useCFDI.split(' ')[0] : 'G03';
  const formaPagoCode = inv.paymentForm ? inv.paymentForm.split(' ')[0] : '01';

  const conceptosXMLLines = txn.items
    .map((it) => {
      const claveProdServ = getClaveProdServ(it.emoji || '', it.name);

      const ratePercentage = it.taxRateApplied !== undefined ? it.taxRateApplied : (settings.generalTaxRate ?? 16);
      const rateDecimal = (ratePercentage / 100).toFixed(6);

      const totalLine = it.price * it.quantity;
      let base = totalLine;
      let impuesto = 0;

      if (settings.taxIncludedInPrice) {
        base = totalLine / (1 + ratePercentage / 100);
        impuesto = totalLine - base;
      } else {
        impuesto = totalLine * (ratePercentage / 100);
      }

      const valorUnitario = settings.taxIncludedInPrice ? it.price / (1 + ratePercentage / 100) : it.price;

      return `    <cfdi:Concepto ClaveProdServ="${escapeXml(claveProdServ)}" Cantidad="${it.quantity.toFixed(2)}" ClaveUnidad="H87" Unidad="Pieza" Descripcion="${escapeXml(it.name.toUpperCase())}" ValorUnitario="${valorUnitario.toFixed(2)}" Importe="${base.toFixed(2)}" ObjetoImp="02">
      <cfdi:Impuestos>
        <cfdi:Traslados>
          <cfdi:Traslado Base="${base.toFixed(2)}" Impuesto="002" TipoFactor="Tasa" TasaOCuota="${rateDecimal}" Importe="${impuesto.toFixed(2)}"/>
        </cfdi:Traslados>
      </cfdi:Impuestos>
    </cfdi:Concepto>`;
    })
    .join('\n');

  const totalImpuestosTrasladados = txn.tax;
  const subTotalCalc = txn.subtotal;
  const descuentoCalc = txn.discount;
  const totalCalc = txn.total;

  if (!inv.satSignature) return '';
  const rfcProvCertif = 'DIL120525A12';
  const selloSAT = inv.satSignature;

  const cadenaOriginal = `||1.1|${inv.uuid}|${inv.certifiedAt}|${rfcProvCertif}|${inv.satSignature}|00001000000504465028||`;

  return `<?xml version="1.0" encoding="utf-8"?>
<cfdi:Comprobante 
  xmlns:cfdi="http://www.sat.gob.mx/cfd/4" 
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
  xsi:schemaLocation="http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd" 
  Version="4.0" 
  Serie="${settings.invoicePrefix || 'FAC'}" 
  Folio="${inv.invoiceNo.replace(/[^0-9]/g, '') || '1'}" 
  Fecha="${txn.date}" 
  SubTotal="${subTotalCalc.toFixed(2)}" 
  Descuento="${descuentoCalc.toFixed(2)}" 
  Total="${totalCalc.toFixed(2)}" 
  TipoDeComprobante="I" 
  Exportacion="01" 
  MetodoPago="PUE" 
  FormaPago="${formaPagoCode}"
  Moneda="MXN"
  NoCertificado="00001000000512836254"
      Sello="${escapeXml(inv.satSignature)}"
  LugarExpedicion="${emisorPostalCode}">
  <cfdi:Emisor Rfc="${escapeXml(emisorRfc)}" Nombre="${emisorNombre}" RegimenFiscal="${escapeXml(emisorRegimeCode)}"/>
  <cfdi:Receptor Rfc="${escapeXml(receptorRfc)}" Nombre="${receptorNombre}" DomicilioFiscalReceptor="${escapeXml(receptorPostalCode)}" RegimenFiscalReceptor="${escapeXml(receptorRegimeCode)}" UsoCFDI="${escapeXml(usoCfdiCode)}"/>
  <cfdi:Conceptos>
${conceptosXMLLines}
  </cfdi:Conceptos>
  <cfdi:Impuestos TotalImpuestosTrasladados="${totalImpuestosTrasladados.toFixed(2)}">
    <cfdi:Traslados>
      <cfdi:Traslado Base="${(subTotalCalc - descuentoCalc).toFixed(2)}" Impuesto="002" TipoFactor="Tasa" TasaOCuota="${(settings.generalTaxRate / 100).toFixed(6)}" Importe="${totalImpuestosTrasladados.toFixed(2)}"/>
    </cfdi:Traslados>
  </cfdi:Impuestos>
  <cfdi:Complemento>
    <tfd:TimbreFiscalDigital 
      xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital" 
      xsi:schemaLocation="http://www.sat.gob.mx/sitio_internet/cfd/TimbreFiscalDigital/TimbreFiscalDigitalv11.xsd" 
      Version="1.1" 
      UUID="${escapeXml(inv.uuid)}" 
      FechaTimbrado="${escapeXml(inv.certifiedAt)}" 
      RfcProvCertif="${escapeXml(rfcProvCertif)}" 
      SelloCFD="${escapeXml(inv.satSignature)}" 
      NoCertificadoSAT="00001000000504465028"
      SelloSAT="${escapeXml(selloSAT)}"/>
  </cfdi:Complemento>
</cfdi:Comprobante>`;
}

export function getCadenaOriginal(txn: Transaction, settings: LegalBillingSettings): string {
  if (!txn.invoiceData) return 'N/A';
  const inv = txn.invoiceData;
  const rfcProv = 'DIL120525A12';
  return `||1.1|${inv.uuid}|${inv.certifiedAt}|${rfcProv}|${inv.satSignature || 'N/A'}|00001000000504465028||`;
}

export function getSATQrUrl(txn: Transaction, emisorTaxId: string): string {
  if (!txn.invoiceData) return '';
  const inv = txn.invoiceData;
  const re = emisorTaxId || 'DAC120525D10';
  const rr = inv.taxId;
  const tt = txn.total.toFixed(2);
  const id = inv.uuid;
  const fe = inv.satSignature ? inv.satSignature.substring(inv.satSignature.length - 8) : '00000000';

  return `https://verificacfdi.facturaelectronica.sat.gob.mx/default.aspx?id=${id}&re=${re}&rr=${rr}&tt=${tt}&fe=${fe}`;
}
