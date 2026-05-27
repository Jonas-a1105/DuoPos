/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Interface defining all configurables for Physical IoT peripherals
export interface HardwareDeviceSettings {
  barcodeScanner: {
    enabled: boolean;
    mode: 'keyboard' | 'serial' | 'webcam';
    baudRate: number;
    serialPort: string;
    autoAdd: boolean;
    prefix: string;
    suffix: string;
  };
  weighingScale: {
    enabled: boolean;
    model: 'torrey' | 'bizerba' | 'cas' | 'mettler';
    serialPort: string;
    baudRate: number;
    unit: 'kg' | 'lb';
    stabilizationDelayMs: number;
    mockWeightOverride: number; // For simulation
    autoTare: boolean;
  };
  thermalPrinter: {
    enabled: boolean;
    connectionType: 'webusb' | 'bluetooth' | 'serial' | 'system';
    paperWidth: '80mm' | '58mm';
    cutEnabled: boolean;
    cashDrawerEnabled: boolean;
    printerCodePage: 'CP850' | 'UTF-8';
    dpiDensity: number;
  };
  paymentTerminal: {
    enabled: boolean;
    connectionType: 'bluetooth' | 'tcp_ip' | 'usb_serial';
    terminalId: string;
    provider: 'clip_mx' | 'adyen_pos' | 'stripe_terminal' | 'smart_pos';
    ipAddress: string;
    port: number;
    requireSignature: boolean;
    mockResponseCode: '00' | '51' | '05' | 'TO'; // 00=Approved, 51=No funds, 05=Declined, TO=Timeout
  };
}

export const DEFAULT_HARDWARE_SETTINGS: HardwareDeviceSettings = {
  barcodeScanner: {
    enabled: true,
    mode: 'keyboard',
    baudRate: 9600,
    serialPort: 'COM3',
    autoAdd: true,
    prefix: '',
    suffix: 'Enter',
  },
  weighingScale: {
    enabled: true,
    model: 'torrey',
    serialPort: 'COM5',
    baudRate: 9600,
    unit: 'kg',
    stabilizationDelayMs: 400,
    mockWeightOverride: 0.350,
    autoTare: false,
  },
  thermalPrinter: {
    enabled: true,
    connectionType: 'system',
    paperWidth: '80mm',
    cutEnabled: true,
    cashDrawerEnabled: true,
    printerCodePage: 'CP850',
    dpiDensity: 203,
  },
  paymentTerminal: {
    enabled: true,
    connectionType: 'tcp_ip',
    terminalId: 'DUO-POS-TERM-8800',
    provider: 'smart_pos',
    ipAddress: '192.168.1.150',
    port: 8080,
    requireSignature: true,
    mockResponseCode: '00',
  },
};

/**
 * Simulates a scale data frame according to the protocol of the selected manufacturer
 */
export function generateScaleProtocolBytes(
  weight: number,
  unit: 'kg' | 'lb',
  model: 'torrey' | 'bizerba' | 'cas' | 'mettler',
  isStable: boolean = true
): string {
  const formattedWeight = weight.toFixed(3); // e.g. "0.350"
  
  switch (model) {
    case 'torrey':
      // Torrey Protocol: "0.350 kg ST\r" or "0.350  kg  ST\r"
      return `${formattedWeight} ${unit} ${isStable ? 'ST' : 'US'}\r`;
    
    case 'bizerba':
      // Bizerba Protocol: "\x02001A0.350\x03\r\n"
      return `0201${formattedWeight}${unit === 'kg' ? 'K' : 'L'}\r\n`;
      
    case 'cas':
      // CAS Protocol: "ST,GS,  0.350,kg\r\n" or "US,GS,  0.350,kg\r\n"
      const paddedCAS = formattedWeight.padStart(7, ' ');
      return `${isStable ? 'ST' : 'US'},GS,${paddedCAS},${unit}\r\n`;
      
    case 'mettler':
      // Mettler Toledo SICS Protocol: "S S      0.350 kg\r\n"
      const paddedMettler = formattedWeight.padStart(9, ' ');
      return `S S ${paddedMettler} ${unit}\r\n`;
      
    default:
      return `${formattedWeight}\r`;
  }
}

/**
 * Helper to build raw binary ESC/POS sequences for thermal printers
 */
export function generateRawEscPos(
  receiptData: {
    companyName: string;
    taxId: string;
    items: { name: string; qty: number; price: number; total: number }[];
    subtotal: number;
    tax: number;
    discount: number;
    total: number;
    paymentMethod: string;
    date: string;
    invoiceNo?: string;
    uuid?: string;
    cardPaymentDetails?: {
      terminalId: string;
      authCode: string;
      brand: string;
      last4: string;
      cardholderName: string;
      cardType: 'credit' | 'debit';
      aid?: string;
      arqc?: string;
      signatureBase64?: string;
    };
  },
  settings: HardwareDeviceSettings['thermalPrinter']
): string {
  const isWidth80 = settings.paperWidth === '80mm';
  const widthChars = isWidth80 ? 42 : 32;

  const esc = '\x1B';
  const gs = '\x1D';

  const init = `${esc}@`; // Reset printer
  const center = `${esc}a\x01`; // Align center
  const left = `${esc}a\x00`; // Align left
  const right = `${esc}a\x02`; // Align right
  
  const boldOn = `${esc}E\x01`;
  const boldOff = `${esc}E\x00`;
  
  const sizeLarge = `${esc}!\x18`; // Double width & height
  const sizeNormal = `${esc}!\x00`; // Normal

  const lineChar = '-';
  const divider = lineChar.repeat(widthChars);
  const doubleDivider = '='.repeat(widthChars);

  let out = '';
  out += init;
  
  // Header
  out += center + boldOn + sizeLarge + `${receiptData.companyName.toUpperCase()}\n` + sizeNormal + boldOff;
  out += `RFC: ${receiptData.taxId}\n`;
  out += `CP: 06700 | Sucursal Principal\n`;
  out += `${receiptData.date}\n`;
  out += divider + '\n';
  
  // If fiscal invoice details exist
  if (receiptData.invoiceNo) {
    out += center + boldOn + `COMPROBANTE FISCAL DIGITAL (CFDI 4.0)\n` + boldOff + left;
    out += `Folio: ${receiptData.invoiceNo}\n`;
    if (receiptData.uuid) {
      out += `UUID: ${receiptData.uuid}\n`;
    }
    out += divider + '\n';
  }

  // If integrated card details exist
  if (receiptData.cardPaymentDetails) {
    out += center + boldOn + `TRANSACCION INTEGRADA POS\n` + boldOff + left;
    out += `Terminal: ${receiptData.cardPaymentDetails.terminalId}\n`;
    out += `Emisor: ${receiptData.cardPaymentDetails.brand}\n`;
    out += `Tarjeta: **** **** **** ${receiptData.cardPaymentDetails.last4}\n`;
    out += `Titular: ${receiptData.cardPaymentDetails.cardholderName.toUpperCase()}\n`;
    out += `Aut: ${receiptData.cardPaymentDetails.authCode}\n`;
    if (receiptData.cardPaymentDetails.aid) {
      out += `AID: ${receiptData.cardPaymentDetails.aid}\n`;
    }
    if (receiptData.cardPaymentDetails.arqc) {
      out += `ARQC: ${receiptData.cardPaymentDetails.arqc}\n`;
    }
    if (receiptData.cardPaymentDetails.signatureBase64) {
      out += center + `[ FIRMA DIGITAL AUTORIZADA ]\n` + left;
    }
    out += divider + '\n';
  }

  // Column header
  if (isWidth80) {
    out += left + boldOn + 'DESCRIPCION       CANT     P.UNIT       TOTAL\n' + boldOff;
  } else {
    out += left + boldOn + 'DESCRIP.   CANT   P.UN     TOTAL\n' + boldOff;
  }
  out += divider + '\n';

  // Items
  receiptData.items.forEach(it => {
    const qtyStr = it.qty.toFixed(2);
    const priceStr = `$${it.price.toFixed(2)}`;
    const lineTotalStr = `$${it.total.toFixed(2)}`;
    
    if (isWidth80) {
      // 42 character spacing:
      // desc (18) + qty (6) + unit (8) + total (10)
      const descName = it.name.toUpperCase().substring(0, 17).padEnd(18, ' ');
      const quantityCol = qtyStr.substring(0, 5).padEnd(6, ' ');
      const unitCol = priceStr.substring(0, 7).padEnd(8, ' ');
      const totCol = lineTotalStr.padStart(10, ' ');
      out += `${descName}${quantityCol}${unitCol}${totCol}\n`;
    } else {
      // 32 character spacing:
      // desc (12) + qty (5) + unit (7) + total (8)
      const descName = it.name.toUpperCase().substring(0, 11).padEnd(12, ' ');
      const quantityCol = qtyStr.substring(0, 4).padEnd(5, ' ');
      const unitCol = priceStr.substring(0, 6).padEnd(7, ' ');
      const totCol = lineTotalStr.padStart(8, ' ');
      out += `${descName}${quantityCol}${unitCol}${totCol}\n`;
    }
  });

  out += divider + '\n';

  // Subtotal & Totals
  const rightAlignCol = (label: string, value: string) => {
    const spaceCount = widthChars - alignTrimmed(label).length - alignTrimmed(value).length;
    return `${label}${' '.repeat(Math.max(1, spaceCount))}${value}\n`;
  };

  out += left;
  out += rightAlignCol('SUBTOTAL:', `$${receiptData.subtotal.toFixed(2)}`);
  out += rightAlignCol('DESCUENTO:', `-$${receiptData.discount.toFixed(2)}`);
  out += rightAlignCol('IVA (16%):', `$${receiptData.tax.toFixed(2)}`);
  out += doubleDivider + '\n';
  out += boldOn + rightAlignCol('TOTAL COBRADO:', `$${receiptData.total.toFixed(2)}`) + boldOff;
  out += doubleDivider + '\n';

  out += center + `FORMA DE PAGO: ${receiptData.paymentMethod.toUpperCase()}\n`;
  out += `¡GRACIAS POR TU COMPRA!\n`;
  out += `DUOPOS - LA RACHA COMERCIAL CONTINUA\n\n\n\n`;

  // Draw Drawer Pulse if checked
  if (settings.cashDrawerEnabled) {
    // Standard open drawer command (ESC p 0 25 250)
    out += `${esc}p\x00\x19\xFA`;
  }

  // Paper cutting command
  if (settings.cutEnabled) {
    // GS V 66 0 (Paper cut command)
    out += `${gs}V\x42\x00`;
  }

  return out;
}

function alignTrimmed(str: string): string {
  return str.replace(/[\u001b\x1b]/g, ''); // strip bytes
}
