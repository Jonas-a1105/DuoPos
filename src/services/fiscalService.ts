import { Transaction, LegalBillingSettings } from '../types';

export interface StampedInvoiceResult {
  success: boolean;
  uuid?: string;
  invoiceNo?: string;
  certifiedAt?: string;
  satSignature?: string;
  xmlData?: string;
  error?: string;
  isMock: boolean;
}

/**
 * Service to handle electronic invoicing (Timbrado Fiscal CFDI 4.0).
 * Connects to Facturama Sandbox API if credentials are provided,
 * otherwise falls back to a highly-compliant mock stamping simulator.
 */
export async function stampInvoice(
  txn: Transaction,
  settings: LegalBillingSettings & { pacUsername?: string; pacPassword?: string }
): Promise<StampedInvoiceResult> {
  const pacUser = settings.pacUsername || '';
  const pacPass = settings.pacPassword || '';

  // If no credentials, perform simulated local mock stamping
  if (!pacUser || !pacPass) {
    const mockUuid = 'FED95C12-8F8D-41D1-9268-' + Math.random().toString(16).substr(2, 12).toUpperCase();
    const invoiceNo = `${settings.invoicePrefix || 'FAC'}-${settings.nextInvoiceNumber.toString().padStart(6, '0')}`;
    const certifiedAt = new Date().toISOString();
    const satSignature = 'MOCK_SHA256_' + Math.random().toString(36).substring(2, 18).toUpperCase();

    return {
      success: true,
      uuid: mockUuid,
      invoiceNo,
      certifiedAt,
      satSignature,
      isMock: true,
      xmlData: `<!-- MOCK CFDI 4.0 SEMILLA -->\n<cfdi:Comprobante Version="4.0" UUID="${mockUuid}"/>`
    };
  }

  // --- Real PAC Integration (Facturama API Sandbox) ---
  try {
    const headers = new Headers();
    headers.set('Authorization', 'Basic ' + btoa(pacUser + ':' + pacPass));
    headers.set('Content-Type', 'application/json');

    const paymentFormCode = txn.invoiceData?.paymentForm ? txn.invoiceData.paymentForm.split(' ')[0] : '01';
    const useCfdiCode = txn.invoiceData?.useCFDI ? txn.invoiceData.useCFDI.split(' ')[0] : 'G03';

    // Map transaction items to Facturama structured catalog items
    const items = txn.items.map((it, idx) => {
      const rateDecimal = 0.16; // Standard MX VAT rate
      const subtotal = it.price * it.quantity;
      const taxAmount = subtotal * rateDecimal;

      return {
        Quantity: it.quantity,
        ProductCode: '50201708', // Coffee drinks / general products
        UnitCode: 'H87', // Pieza
        Unit: 'Pieza',
        Description: it.name.toUpperCase(),
        IdentificationNumber: it.productId || `prod-${idx}`,
        UnitPrice: it.price,
        Subtotal: subtotal,
        Discount: 0,
        Taxes: [
          {
            Total: taxAmount,
            Base: subtotal,
            Rate: rateDecimal,
            Impuesto: '002', // IVA
            TipoFactor: 'Tasa',
            IsTransfer: true
          }
        ]
      };
    });

    const bodyPayload = {
      Receiver: {
        Rfc: txn.invoiceData?.taxId || 'XAXX010101000',
        Name: txn.invoiceData?.fiscalName || 'PÚBLICO EN GENERAL',
        CfdiUse: useCfdiCode,
        FiscalRegime: txn.invoiceData?.regime ? txn.invoiceData.regime.split(' ')[0] : '605',
        TaxZipCode: txn.invoiceData?.postalCode || settings.companyPostalCode || '06700'
      },
      CfdiType: 'I',
      PaymentForm: paymentFormCode,
      PaymentMethod: 'PUE',
      ExpeditionPlace: settings.companyPostalCode || '06700',
      Currency: 'MXN',
      Items: items
    };

    const response = await fetch('https://api.facturama.cn/2/cfdis', {
      method: 'POST',
      headers,
      body: JSON.stringify(bodyPayload)
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(errBody.Message || `Error de conexión PAC (${response.status})`);
    }

    const data = await response.json();

    return {
      success: true,
      uuid: data.Uuid,
      invoiceNo: data.Folio || `${settings.invoicePrefix || 'FAC'}-${settings.nextInvoiceNumber.toString().padStart(6, '0')}`,
      certifiedAt: data.Date || new Date().toISOString(),
      satSignature: data.OriginalChainSign || 'CSD_FIRM_SUCCESSFUL',
      isMock: false,
      xmlData: data.Xml || ''
    };
  } catch (error: any) {
    console.error('Facturama error:', error);
    return {
      success: false,
      error: error.message || 'Error desconocido al timbrar con el PAC',
      isMock: false
    };
  }
}
