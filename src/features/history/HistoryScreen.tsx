/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Transaction, User, LegalBillingSettings } from '../../types';
import {
  Search,
  Calendar,
  User as UserIcon,
  DollarSign,
  RefreshCcw,
  Landmark,
  Receipt,
  Sparkles,
  Filter,
  CreditCard,
  Download,
} from 'lucide-react';
import FiscalInspectorModal from '../sales/components/FiscalInspectorModal';
import { playSound } from '../../services/sounds';
import { exportTransactionsToExcel, exportAuditLogsToExcel } from '../../services/exportService';
import SATQRCode from '../../components/Invoice/SATQRCode';
import { getAuditLogs, type AuditLog } from '../../services/auditService';

const generateMockCFDIXML = (txn: Transaction) => {
  if (!txn.invoiceData) return '';
  const inv = txn.invoiceData;
  return `<?xml version="1.0" encoding="utf-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" Version="4.0" Serie="A" Folio="${inv.invoiceNo}" Fecha="${txn.date}" SubTotal="${txn.subtotal.toFixed(2)}" Descuento="${txn.discount.toFixed(2)}" Total="${txn.total.toFixed(2)}" TipoDeComprobante="I" Exportacion="01" MetodoPago="PUE" FormaPago="${inv.paymentForm ? inv.paymentForm.split(' ')[0] : '01'}">
  <cfdi:Emisor Rfc="DAC120525D10" Nombre="DUO ACADEMIA S.A. DE C.V." RegimenFiscal="601"/>
  <cfdi:Receptor Rfc="${inv.taxId}" Nombre="${inv.fiscalName}" DomicilioFiscalReceptor="${inv.postalCode}" RegimenFiscalReceptor="${inv.regime ? inv.regime.split(' ')[0] : '601'}" UsoCFDI="${inv.useCFDI ? inv.useCFDI.split(' ')[0] : 'G03'}"/>
  <cfdi:Conceptos>
\${txn.items.map(it => \`    <cfdi:Concepto ClaveProdServ="43231500" Cantidad="\${it.quantity}" ClaveUnidad="H87" Descripcion="\${it.name}" ValorUnitario="\${it.price.toFixed(2)}" Importe="\${(it.price * it.quantity).toFixed(2)}">
      <cfdi:Impuestos>
        <cfdi:Traslados>
          <cfdi:Traslado Base="\${(it.price * it.quantity).toFixed(2)}" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="\${((it.price * it.quantity) * 0.16).toFixed(2)}"/>
        </cfdi:Traslados>
      </cfdi:Impuestos>
    </cfdi:Concepto>\`).join('\\n')}
  </cfdi:Conceptos>
  <cfdi:Impuestos TotalImpuestosTrasladados="${txn.tax.toFixed(2)}">
    <cfdi:Traslados>
      <cfdi:Traslado Base="${(txn.subtotal - txn.discount).toFixed(2)}" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="${txn.tax.toFixed(2)}"/>
    </cfdi:Traslados>
  </cfdi:Impuestos>
  <cfdi:Complemento>
    <tfd:TimbreFiscalDigital xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital" Version="1.1" UUID="${inv.uuid}" FechaTimbrado="${inv.certifiedAt}" SelloCFD="${inv.satSignature}" NoCertificadoSAT="00001000000504465028"/>
  </cfdi:Complemento>
</cfdi:Comprobante>`;
};

interface HistoryScreenProps {
  transactions: Transaction[];
  onRefundTransaction: (id: string) => void;
  currentUser: User;
  billingSettings: LegalBillingSettings;
}

export default function HistoryScreen({
  transactions,
  onRefundTransaction,
  currentUser,
  billingSettings,
}: HistoryScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<'All' | 'cash' | 'card' | 'points'>('All');
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);

  // Custom interactive fiscal state hook
  const [isFiscalInspectorOpen, setIsFiscalInspectorOpen] = useState(false);

  // Manager PIN override states for RBAC simulation
  const [showManagerPin, setShowManagerPin] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  // Auditoría states
  const [activeSubTab, setActiveSubTab] = useState<'sales' | 'audit'>('sales');
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditSearchQuery, setAuditSearchQuery] = useState('');
  const [selectedAuditModule, setSelectedAuditModule] = useState<'All' | 'catalogo' | 'clientes' | 'roles' | 'tasas' | 'ajustes'>('All');

  React.useEffect(() => {
    if (activeSubTab === 'audit') {
      getAuditLogs().then(setAuditLogs);
    }
  }, [activeSubTab]);

  // Filter transactions
  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch =
      t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.items.some((item) => item.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesMethod = selectedMethod === 'All' || t.paymentMethod === selectedMethod;

    return matchesSearch && matchesMethod;
  });

  // Filter audit logs
  const filteredAuditLogs = auditLogs.filter((log) => {
    const matchesSearch =
      log.username.toLowerCase().includes(auditSearchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(auditSearchQuery.toLowerCase()) ||
      log.role.toLowerCase().includes(auditSearchQuery.toLowerCase());

    const matchesModule = selectedAuditModule === 'All' || log.module === selectedAuditModule;

    return matchesSearch && matchesModule;
  });

  const activeReceipt = transactions.find((t) => t.id === selectedReceiptId);

  return (
    <div className="space-y-6 animate-fadeIn font-sans p-1 md:p-3 relative pb-12">
      {/* Page Title & Sub-tabs Duolingo style */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h2 className="text-3xl font-black text-gray-800 tracking-tight">
            {activeSubTab === 'sales' ? 'Historial de Ventas' : 'Bitácora de Auditoría 🔎'}
          </h2>
          <p className="text-gray-400 font-bold text-sm">
            {activeSubTab === 'sales'
              ? 'Audita las transacciones pasadas, emite reembolsos automáticos y supervisa cajeros.'
              : 'Historial local de modificaciones de inventario, clientes, roles y tasas cambiarias.'}
          </p>
        </div>

        {/* Tab Selector style Duolingo (3D border buttons) */}
        <div className="flex bg-gray-100 p-1.5 rounded-2xl border-2 border-gray-200 gap-1 shrink-0 self-start md:self-center">
          <button
            onClick={() => {
              playSound('click');
              setActiveSubTab('sales');
            }}
            className={`px-4 py-1.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
              activeSubTab === 'sales'
                ? 'bg-white text-gray-800 shadow-xs border-b-2 border-gray-300'
                : 'text-gray-450 hover:text-gray-600'
            }`}
          >
            🛒 Ventas
          </button>
          <button
            onClick={() => {
              playSound('click');
              setActiveSubTab('audit');
            }}
            className={`px-4 py-1.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
              activeSubTab === 'audit'
                ? 'bg-white text-gray-800 shadow-xs border-b-2 border-gray-300'
                : 'text-gray-455 hover:text-gray-650'
            }`}
          >
            🔎 Auditoría
          </button>
        </div>
      </div>

      {activeSubTab === 'sales' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Side: Audit Log List */}
          <div className="lg:col-span-2 space-y-4">
            {/* Filters Bar card */}
            <div className="bg-white border-2 border-[#e5e5e5] border-b-[6px] rounded-3xl p-4 md:p-5 space-y-3 shadow-none">
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-gray-400">
                  <Search size={18} />
                </span>
                <input
                  type="text"
                  placeholder="Buscar por ID, cajero o producto vendido..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border-2 border-[#e5e5e5] rounded-xl font-bold text-gray-700 outline-none focus:border-[#58cc02] focus:bg-white transition-all text-sm"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-black uppercase text-gray-400 flex items-center gap-1 mr-1">
                  <Filter size={12} /> Pago:
                </span>
                {[
                  { key: 'All', label: 'Todos' },
                  { key: 'cash', label: '💸 Efectivo' },
                  { key: 'card', label: '💳 Tarjeta' },
                  { key: 'points', label: '⭐ Duopuntos' },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setSelectedMethod(opt.key as any)}
                    className={`py-1 px-3 rounded-lg font-black text-xs transition-all uppercase cursor-pointer ${
                      selectedMethod === opt.key
                        ? 'bg-[#1cb0f6] text-white border-b-2 border-[#1899d6]'
                        : 'bg-white text-gray-500 border-2 border-gray-150 hover:bg-gray-50 active:translate-y-0.5'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
                <div className="ml-auto">
                  <button
                    onClick={() => {
                      playSound('click');
                      exportTransactionsToExcel(filteredTransactions);
                    }}
                    className="py-1 px-3 rounded-lg font-black text-xs uppercase cursor-pointer bg-[#58cc02] text-white border-b-2 border-[#46a302] hover:bg-[#61e002] active:translate-y-0.5 flex items-center gap-1"
                  >
                    <Download size={12} /> Excel
                  </button>
                </div>
              </div>
            </div>

            {/* Transactions List */}
            {filteredTransactions.length === 0 ? (
              <div className="bg-white border-2 border-[#e5e5e5] border-b-[6px] rounded-3xl p-12 text-center space-y-3">
                <span className="text-5xl block">📑</span>
                <h3 className="text-xl font-black text-gray-650">No hay ventas registradas</h3>
                <p className="text-gray-400 font-bold text-sm max-w-sm mx-auto">
                  No pudimos localizar ninguna factura que coincida con tus filtros. ¡Comienza a cobrar a tus clientes
                  para poblar esta bitácora!
                </p>
              </div>
            ) : (
              <div className="space-y-3 overflow-y-auto max-h-[500px] pr-1">
                {filteredTransactions.map((t) => {
                  const isSelected = selectedReceiptId === t.id;
                  const formattedDate = new Date(t.date).toLocaleString('es-ES', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  const isRefunded = (t as any).refunded || t.status === 'refunded';
                  return (
                    <div
                      key={t.id}
                      onClick={() => setSelectedReceiptId(t.id)}
                      className={`bg-white border-2 rounded-2xl p-4 transition-all hover:scale-101 cursor-pointer flex flex-col md:flex-row justify-between md:items-center gap-4 ${
                        isSelected ? 'border-[#58cc02] bg-[#f2ffd9] border-b-[6px]' : 'border-[#e5e5e5] border-b-4'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-2xl h-10 w-10 bg-slate-100 border rounded-xl flex items-center justify-center select-none flex-shrink-0">
                          {t.paymentMethod === 'cash' ? '💸' : t.paymentMethod === 'card' ? '💳' : '⭐'}
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex flex-wrap items-baseline gap-1.5">
                            <span className="font-black text-gray-850 text-sm truncate">ID: {t.id}</span>
                            <span className="text-[10px] bg-white border border-gray-200 px-1.5 py-0.2 rounded-md font-bold text-gray-500 uppercase tracking-wider text-[8px] flex items-center gap-0.5">
                              XP: +{t.xpGained} ✨
                            </span>
                            {isRefunded && (
                              <span className="text-[9px] bg-red-105 text-red-705 border border-red-200 px-1.5 py-0.5 rounded font-black uppercase leading-none">
                                Reembolsado
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 font-bold flex items-center gap-1 flex-wrap">
                            <span className="flex items-center gap-0.5 font-extrabold text-[#3c3c3c]">
                              <UserIcon size={12} /> {t.employeeName}
                            </span>
                            • <Calendar size={12} /> {formattedDate}
                          </p>
                          <p className="text-xs text-gray-500 font-extrabold truncate italic mt-1 leading-none">
                            {t.items.map((i) => `${i.emoji}${i.name}x${i.quantity}`).join(', ')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-3 flex-shrink-0 border-t md:border-t-0 pt-2 md:pt-0">
                        <div className="text-left md:text-right">
                          <span className="text-[10px] text-gray-400 font-black uppercase tracking-tight block">
                            Total cobrado
                          </span>
                          <span className={`text-lg font-black ${isRefunded ? 'text-red-500 line-through' : 'text-gray-805'}`}>
                            ${t.total.toFixed(2)}
                          </span>
                        </div>
                        <span className="text-gray-300 md:block hidden">▶</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Side: High-fidelity Duolingo Style Active Receipt */}
          <div>
            {activeReceipt ? (
              <div className="bg-white border-2 border-[#e5e5e5] border-b-[8px] rounded-3xl p-5 md:p-6 space-y-5 shadow-sm sticky top-4 animate-scaleUp">
                <div className="text-center pb-4 border-b-2 border-dashed border-gray-200 space-y-2">
                  <span className="text-4xl block animate-bounce">🦉</span>
                  <h3 className="text-xl font-black text-gray-800">Recibo de Racha</h3>
                  <p className="text-xs text-gray-405 font-extrabold uppercase tracking-wide leading-none">
                    Transacción #{activeReceipt.id}
                  </p>
                </div>

                {/* Receipt Body metadata */}
                <div className="space-y-2 text-xs font-bold text-gray-500 py-1">
                  <div className="flex justify-between items-center">
                    <span>Cajero Responsable:</span>
                    <span className="text-gray-800 font-black flex items-center gap-1 uppercase bg-gray-100 px-2 py-0.5 rounded-md">
                      👤 {activeReceipt.employeeName}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Fecha de cobro:</span>
                    <span className="text-gray-800 font-black">
                      {new Date(activeReceipt.date).toLocaleString('es-ES')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Modo de pago:</span>
                    <span className="text-gray-850 font-black uppercase tracking-wider bg-sky-50 border border-sky-200 text-sky-700 px-2 py-0.5 rounded-lg flex items-center gap-1">
                      {activeReceipt.paymentMethod === 'cash'
                        ? '💸 Efectivo'
                        : activeReceipt.paymentMethod === 'card'
                          ? '💳 Tarjeta'
                          : '⭐ Cupos Duo'}
                    </span>
                  </div>
                </div>

                {/* Cart Purchased Items details */}
                <div className="border-t border-b border-gray-150 py-3 space-y-2.5">
                  <span className="text-[10px] text-gray-400 font-black uppercase tracking-wider block">
                    Artículos Facturados:
                  </span>
                  <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                    {activeReceipt.items.map((it, index) => (
                      <div key={index} className="flex justify-between items-center text-sm font-black text-gray-700">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-xl select-none">{it.emoji}</span>
                          <div className="min-w-0">
                            <p className="text-gray-800 font-extrabold truncate text-xs leading-tight">{it.name}</p>
                            <p className="text-[10px] text-gray-400 font-bold">${it.price.toFixed(2)} c/u</p>
                          </div>
                        </div>
                        <span className="text-gray-805 text-xs flex-shrink-0 pl-1">
                          {it.quantity} unidades •{' '}
                          <span className="font-extrabold text-gray-900">${(it.price * it.quantity).toFixed(2)}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Receipt summary computations */}
                <div className="space-y-1.5 text-xs font-bold text-gray-500">
                  <div className="flex justify-between items-center">
                    <span>Subtotal:</span>
                    <span className="text-gray-800">${activeReceipt.subtotal.toFixed(2)}</span>
                  </div>
                  {activeReceipt.discount > 0 && (
                    <div className="flex justify-between items-center text-red-500">
                      <span>Descuento Aplicado:</span>
                      <span>-${activeReceipt.discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span>Impuesto Ventas (8%):</span>
                    <span className="text-gray-850">${activeReceipt.tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-lg font-black text-gray-850 border-t border-gray-100 pt-2">
                    <span className="flex items-center gap-0.5 font-extrabold">Total Cierre:</span>
                    <span className="text-xl font-black text-[#58cc02]">${activeReceipt.total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Reward Notification Banner */}
                <div className="bg-[#f2ffd9] border border-[#d2f09d] rounded-2xl p-3 flex items-center justify-between text-xs font-bold text-gray-650">
                  <span className="flex items-center gap-1 text-[#58cc02] font-black uppercase">
                    <Sparkles size={14} /> Recompensa:
                  </span>
                  <span className="text-[#58cc02] font-black font-mono">+{activeReceipt.xpGained} XP Ganados</span>
                </div>

                {/* ADVANCED LEGAL INVOICE CFDI VIEWER */}
                {activeReceipt.invoiceData && (
                  <div className="bg-[#fafafa] border-2 border-gray-150 rounded-2xl p-4 space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-lg">⚖️</span>
                        <div>
                          <span className="text-xs font-black text-gray-800 leading-none block">
                            Comprobante Fiscal Digital
                          </span>
                          <span className="text-[9px] font-black text-[#58cc02] uppercase block">
                            Timbrado SAT Activo
                          </span>
                        </div>
                      </div>
                      <span className="text-[9px] font-Mono font-black bg-green-100 text-green-700 px-2 py-0.5 rounded-md">
                        CFDI v4.0
                      </span>
                    </div>

                    <div className="flex gap-3">
                      <div className="flex-1 text-[10px] font-mono space-y-1 text-gray-600 bg-white p-3 border rounded-xl shadow-inner">
                        <p className="truncate">
                          <strong>FOLIO FISCAL:</strong> {activeReceipt.invoiceData.invoiceNo}
                        </p>
                        <p className="truncate">
                          <strong>UUID:</strong> {activeReceipt.invoiceData.uuid}
                        </p>
                        <p className="truncate">
                          <strong>RECEPTOR:</strong> {activeReceipt.invoiceData.fiscalName}
                        </p>
                        <p className="truncate">
                          <strong>RFC:</strong> {activeReceipt.invoiceData.taxId}
                        </p>
                        <p className="truncate">
                          <strong>REGIMEN:</strong> {activeReceipt.invoiceData.regime}
                        </p>
                        <p className="truncate">
                          <strong>USO CFDI:</strong> {activeReceipt.invoiceData.useCFDI}
                        </p>
                        <p className="truncate">
                          <strong>CERTIFICADO:</strong> {activeReceipt.invoiceData.certifiedAt}
                        </p>
                      </div>
                      <div className="shrink-0">
                        <SATQRCode transaction={activeReceipt} billingSettings={billingSettings} size={96} />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsFiscalInspectorOpen(true);
                        playSound('levelup');
                      }}
                      className="w-full bg-[#1e293b] text-white border-b-4 border-[#0f172a] hover:bg-slate-700 active:translate-y-[2px] active:border-b-2 py-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      🏛️ Inspeccionar XML / Imprimir PDF (CFDI v4.0) 🔍
                    </button>
                  </div>
                )}

                {/* Refund / Ticket reversal controls with RBAC restriction */}
                <div>
                  {((activeReceipt as any).refunded || activeReceipt.status === 'refunded') ? (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-center py-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 select-none font-sans">
                      ⚠️ Ticket Reembolsado e Invalidado
                    </div>
                  ) : currentUser.role === 'cashier' ? (
                    <button
                      type="button"
                      onClick={() => {
                        setShowManagerPin(true);
                        setPinInput('');
                        setPinError('');
                      }}
                      className="w-full bg-gray-50 text-gray-400 border-2 border-gray-205 border-b-4 hover:bg-gray-100 hover:text-gray-500 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider text-center flex items-center justify-center gap-1.5 cursor-pointer transition-all animate-fadeIn"
                    >
                      <span>🔒 Reembolsar (Requiere Supervisor)</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          confirm(
                            '¿Seguro que deseas reembolsar e invalidar esta venta? Se restituirá automáticamente el stock de cada artículo.',
                          )
                        ) {
                          onRefundTransaction(activeReceipt.id);
                          setSelectedReceiptId(null);
                        }
                      }}
                      className="w-full bg-white text-red-500 border-2 border-red-200 border-b-4 hover:bg-red-50 active:translate-y-[2px] active:border-b-2 font-black py-2.5 rounded-2xl transition-all text-xs uppercase tracking-wider text-center flex items-center justify-center gap-1.5 cursor-pointer animate-fadeIn"
                    >
                      <RefreshCcw size={14} /> Reembolsar & Restituir Stock
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 border-2 border-dashed border-[#e5e5e5] rounded-3xl p-8 text-center text-gray-400 font-bold text-sm space-y-2 sticky top-4">
                <span className="text-5xl block animate-pulse">🧾</span>
                <p>Selecciona una factura de la lista lateral para auditar el recibo detallado del cliente.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeSubTab === 'audit' && (
        <div className="bg-white border-2 border-[#e5e5e5] border-b-[8px] rounded-3xl p-5 md:p-6 space-y-6 animate-fadeIn text-left">
          {/* Header search & refresh */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1">
              <span className="absolute left-3.5 top-3 text-gray-400">
                <Search size={18} />
              </span>
              <input
                type="text"
                placeholder="Buscar logs por cajero, detalles..."
                value={auditSearchQuery}
                onChange={(e) => setAuditSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border-2 border-[#e5e5e5] rounded-xl font-bold text-gray-705 outline-none focus:border-[#58cc02] focus:bg-white transition-all text-sm"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  playSound('click');
                  getAuditLogs().then(setAuditLogs);
                }}
                className="p-2 border-2 border-gray-200 rounded-xl hover:bg-gray-50 active:translate-y-0.5 cursor-pointer font-extrabold text-xs uppercase tracking-wide flex items-center gap-1 text-gray-500"
                title="Actualizar bitácora"
              >
                <RefreshCcw size={12} /> Recargar
              </button>

              <button
                onClick={() => {
                  playSound('click');
                  exportAuditLogsToExcel(filteredAuditLogs);
                }}
                className="py-2 px-4 rounded-xl font-black text-xs uppercase cursor-pointer bg-[#58cc02] text-white border-b-4 border-[#46a302] hover:bg-[#61e002] active:border-b-0 active:translate-y-1 flex items-center gap-1.5 shadow-none"
              >
                <Download size={14} /> Exportar Excel
              </button>
            </div>
          </div>

          {/* Module Filters Bar */}
          <div className="flex flex-wrap items-center gap-2 border-t pt-4">
            <span className="text-xs font-black uppercase text-gray-400 flex items-center gap-1 mr-1">
              <Filter size={12} /> Módulo:
            </span>
            {[
              { key: 'All', label: 'Todos' },
              { key: 'catalogo', label: '📦 Catálogo' },
              { key: 'clientes', label: '👥 Clientes' },
              { key: 'roles', label: '🛡️ Roles' },
              { key: 'tasas', label: '📈 Tasas' },
              { key: 'ajustes', label: '⚙️ Ajustes' },
            ].map((opt) => (
              <button
                key={opt.key}
                onClick={() => {
                  playSound('click');
                  setSelectedAuditModule(opt.key as any);
                }}
                className={`py-1 px-3 rounded-lg font-black text-xs transition-all uppercase cursor-pointer ${
                  selectedAuditModule === opt.key
                    ? 'bg-[#1cb0f6] text-white border-b-2 border-[#1899d6]'
                    : 'bg-white text-gray-505 text-gray-500 border-2 border-gray-150 hover:bg-gray-50 active:translate-y-0.5'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Logs List Table */}
          <div className="overflow-x-auto border-2 border-gray-150 rounded-2xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                  <th className="p-3.5 font-sans">Fecha y Hora</th>
                  <th className="p-3.5 font-sans">Módulo</th>
                  <th className="p-3.5 font-sans">Usuario</th>
                  <th className="p-3.5 font-sans">Rol</th>
                  <th className="p-3.5 font-sans">Acción</th>
                  <th className="p-3.5 font-sans w-2/5">Detalle del Cambio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150">
                {filteredAuditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-gray-400 font-bold italic">
                      <span className="text-4xl block mb-2 select-none">🔎</span>
                      No se encontraron registros de auditoría que coincidan con los filtros.
                    </td>
                  </tr>
                ) : (
                  filteredAuditLogs.map((log) => {
                    const formattedDate = new Date(log.timestamp).toLocaleString('es-ES', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    });

                    // Module pill colors
                    const moduleColors: Record<string, string> = {
                      catalogo: 'bg-orange-50 text-orange-700 border-orange-200',
                      clientes: 'bg-sky-50 text-sky-700 border-sky-200',
                      roles: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                      tasas: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                      ajustes: 'bg-slate-50 text-slate-700 border-slate-200',
                    };

                    // Action pill colors
                    const actionColors: Record<string, string> = {
                      crear: 'bg-green-50 text-green-700 border-green-200',
                      modificar: 'bg-amber-50 text-amber-700 border-amber-200',
                      eliminar: 'bg-red-50 text-red-700 border-red-200',
                      escalar: 'bg-purple-50 text-purple-750 border-purple-200',
                      ajuste: 'bg-blue-50 text-blue-700 border-blue-200',
                    };

                    return (
                      <tr key={log.id} className="hover:bg-slate-50/50 text-xs text-gray-700 font-sans transition-colors">
                        <td className="p-3.5 font-mono text-[10px] font-black text-gray-400 whitespace-nowrap">
                          {formattedDate}
                        </td>
                        <td className="p-3.5 whitespace-nowrap">
                          <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-lg border leading-none ${moduleColors[log.module] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                            {log.module === 'catalogo' ? '📦 Catálogo' : log.module === 'clientes' ? '👥 Clientes' : log.module === 'roles' ? '🛡️ Roles' : log.module === 'tasas' ? '📈 Tasas' : '⚙️ Ajustes'}
                          </span>
                        </td>
                        <td className="p-3.5 font-extrabold text-gray-800 whitespace-nowrap uppercase">
                          👤 {log.username}
                        </td>
                        <td className="p-3.5 whitespace-nowrap">
                          <span className="px-1.5 py-0.5 text-[9px] font-black uppercase rounded bg-gray-100 text-gray-500">
                            {log.role}
                          </span>
                        </td>
                        <td className="p-3.5 whitespace-nowrap">
                          <span className={`px-2 py-0.5 text-[9px] font-black rounded border leading-none uppercase ${actionColors[log.action] || 'bg-gray-150 text-gray-700 border-gray-250'}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="p-3.5 text-xs text-gray-600 leading-relaxed font-bold break-words min-w-[280px]">
                          {log.details}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Supervisor/Manager PIN authorization modal */}
      {showManagerPin && (
        <div className="fixed inset-0 z-50 bg-[#141414]/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-sm w-full bg-white border-2 border-[#e5e5e5] border-b-[8px] rounded-3xl p-6 space-y-4 shadow-xl animate-scaleUp">
            <div className="text-center space-y-2">
              <span className="text-4xl">🔐</span>
              <h3 className="text-xl font-black text-gray-800">Aprobación de Gerencia</h3>
              <p className="text-xs text-gray-400 font-bold leading-relaxed">
                El rol de Cajero no tiene permisos de reembolso. Introduce la clave de supervisor o administrador para
                continuar.
              </p>
            </div>

            {pinError && (
              <div className="bg-[#ffedf0] border-2 border-[#ff7b7b] rounded-xl p-2 text-[#ff4b4b] font-black text-xs text-center animate-shake">
                {pinError}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-gray-400 block tracking-wider">
                PIN de Desbloqueo (4 números)
              </label>
              <input
                type="password"
                maxLength={4}
                placeholder="••••"
                value={pinInput}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/\D/g, '');
                  setPinInput(cleaned);
                }}
                className="w-full text-center tracking-widest text-2xl py-2 border-2 border-[#e5e5e5] rounded-xl outline-none focus:border-[#1cb0f6] font-mono font-bold text-gray-800"
              />
              <span className="text-[9px] text-gray-400 font-bold block text-center italic mt-1">
                Sugerencia: Introduce el código <strong>1234</strong> o <strong>1919</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (pinInput === '1234' || pinInput === '1919' || pinInput === '2026') {
                    // Success! Proceed with refund
                    if (activeReceipt) {
                      onRefundTransaction(activeReceipt.id);
                      setSelectedReceiptId(null);
                    }
                    setShowManagerPin(false);
                    alert('✅ Autorización de Supervisor correcta. Transacción reembolsada con éxito.');
                  } else {
                    setPinError('❌ Clave incorrecta. Inténtalo de nuevo.');
                  }
                }}
                className="bg-[#58cc02] text-white border-b-4 border-[#46a302] hover:bg-[#61e002] active:border-b-0 active:translate-y-[4px] font-black text-xs py-2.5 rounded-xl uppercase cursor-pointer"
              >
                Autorizar
              </button>
              <button
                type="button"
                onClick={() => setShowManagerPin(false)}
                className="bg-white text-gray-500 border-2 border-gray-200 border-b-4 hover:bg-gray-50 active:translate-y-[2px] active:border-b-2 font-black text-xs py-2.5 rounded-xl uppercase cursor-pointer"
              >
                Cancelar
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setPinInput('1234');
                setPinError('');
              }}
              className="w-full text-[10px] text-indigo-500 hover:underline font-bold text-center block pt-1 cursor-pointer"
            >
              ⚡ Autorellenar PIN Válido (Simulación)
            </button>
          </div>
        </div>
      )}

      {isFiscalInspectorOpen && activeReceipt && (
        <FiscalInspectorModal
          transaction={activeReceipt}
          billingSettings={billingSettings}
          onClose={() => setIsFiscalInspectorOpen(false)}
        />
      )}
    </div>
  );
}
