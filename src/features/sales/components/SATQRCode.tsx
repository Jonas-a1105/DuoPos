import { QRCodeSVG } from 'qrcode.react';
import { Transaction, LegalBillingSettings } from '../../../types';
import { getSATQrUrl } from '../../../services/fiscal/index';

interface SATQRCodeProps {
  transaction: Transaction;
  billingSettings: LegalBillingSettings;
  size?: number;
}

export default function SATQRCode({ transaction, billingSettings, size = 128 }: SATQRCodeProps) {
  if (!transaction.invoiceData) return null;

  const qrUrl = getSATQrUrl(transaction, billingSettings.companyTaxId);
  if (!qrUrl) return null;

  return (
    <div className="flex flex-col items-center gap-2 p-3 bg-white rounded-xl border border-gray-200">
      <QRCodeSVG value={qrUrl} size={size} level="M" />
      <a
        href={qrUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[10px] text-[#1cb0f6] font-bold hover:underline break-all text-center max-w-full"
      >
        {qrUrl}
      </a>
    </div>
  );
}
