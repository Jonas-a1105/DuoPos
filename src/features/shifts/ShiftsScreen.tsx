/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { User, CashShift, Transaction } from '../../types/index';
import { 
  Printer, 
  Clock, 
  Layers,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { playSound } from '../../services/sounds';
import { toast } from '../../components/Modal/FlashNotifications';

// Subcomponents imports
import ShiftOpeningCard from './components/ShiftOpeningCard';
import ShiftStatsGrid from './components/ShiftStatsGrid';
import ShiftMovementModal from './components/ShiftMovementModal';
import ShiftCloseModal from './components/ShiftCloseModal';
import ShiftReportDetailModal from './components/ShiftReportDetailModal';
import ShiftHistoryTab from './components/ShiftHistoryTab';

interface ShiftsScreenProps {
  user: User;
  transactions: Transaction[];
  activeShift: CashShift | null;
  shiftHistory: CashShift[];
  onOpenShift: (amount: number) => void;
  onCloseShift: (actualCash: number, expectedCash: number, difference: number, notes: string) => void;
  onAddShiftMovement: (type: 'in' | 'out', amount: number, reason: string) => void;
  onGrantXp: (amount: number) => void;
}

export default function ShiftsScreen({ 
  user, 
  transactions, 
  activeShift, 
  shiftHistory,
  onOpenShift,
  onCloseShift,
  onAddShiftMovement,
  onGrantXp
}: ShiftsScreenProps) {
  
  // Tab control: 'current' (active shift) vs 'history' (past shifts)
  const [activeSubTab, setActiveSubTab] = useState<'current' | 'history'>('current');

  // Modal Triggers
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [selectedHistReport, setSelectedHistReport] = useState<CashShift | null>(null);

  // Filter Transactions for Active Shift to produce precise real-time statistics
  const currentShiftSales = useMemo(() => {
    if (!activeShift) return [];
    return transactions.filter(t => 
      t.date >= activeShift.openingTime &&
      t.branchId === activeShift.branchId &&
      t.registerId === activeShift.registerId
    );
  }, [transactions, activeShift]);

  // Derived shift analytics
  const shiftTotals = useMemo(() => {
    if (!activeShift) return { cashSales: 0, cardSales: 0, pointsSales: 0, totalSales: 0, ticketCount: 0 };
    
    let cashSales = 0;
    let cardSales = 0;
    let pointsSales = 0;

    currentShiftSales.forEach(t => {
      if (t.isMixedPayment) {
        cashSales += (t.mixedCashAmount || 0);
        cardSales += (t.mixedCardAmount || 0);
      } else {
        if (t.paymentMethod === 'cash') cashSales += t.total;
        else if (t.paymentMethod === 'card') cardSales += t.total;
        else if (t.paymentMethod === 'points') pointsSales += t.total;
      }
    });

    return {
      cashSales: Number(cashSales.toFixed(2)),
      cardSales: Number(cardSales.toFixed(2)),
      pointsSales: Number(pointsSales.toFixed(2)),
      totalSales: Number((cashSales + cardSales + pointsSales).toFixed(2)),
      ticketCount: currentShiftSales.length
    };
  }, [currentShiftSales, activeShift]);

  // Expected Cash calculation formula: InitialCash + CashSales + Sum(InMovements) - Sum(OutMovements)
  const computedExpectedCash = useMemo(() => {
    if (!activeShift) return 0;
    let inFlowFromMovements = 0;
    let outFlowFromMovements = 0;

    activeShift.movements.forEach(m => {
      if (m.type === 'in') inFlowFromMovements += m.amount;
      else if (m.type === 'out') outFlowFromMovements += m.amount;
    });

    return Number((activeShift.initialCash + shiftTotals.cashSales + inFlowFromMovements - outFlowFromMovements).toFixed(2));
  }, [activeShift, shiftTotals.cashSales]);

  // Simulate ticket printing for open or closed shifts
  const printShiftReceipt = (shift: CashShift) => {
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error('⚠️ Ventana emergente bloqueada. Habilita pop-ups para generar informes impresos.');
        return;
      }

      // Calculate movements
      let shiftInFlow = 0;
      let shiftOutFlow = 0;
      const movementsRows = shift.movements.map((m, i) => {
        if (m.type === 'in') shiftInFlow += m.amount;
        else shiftOutFlow += m.amount;
        return `
          <tr>
            <td style="padding: 2px 0;">${new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • ${m.reason}</td>
            <td align="right" style="color: ${m.type === 'in' ? '#58cc02' : '#ff9600'}; font-family: monospace;">
              ${m.type === 'in' ? '+' : '-'}$${m.amount.toFixed(2)}
            </td>
          </tr>
        `;
      }).join('');

      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=110x110&color=000&data=${encodeURIComponent(`https://duopos.mock/caja?id=${shift.id}&expected=${shift.expectedCash}`)}`;

      printWindow.document.write(`
        <html>
          <head>
            <title>Arqueo Caja DuoPOS - ${shift.id}</title>
            <style>
              body {
                font-family: 'Courier New', Courier, monospace;
                padding: 12px;
                max-width: 290px;
                margin: 0 auto;
                font-size: 11px;
                color: #111;
                line-height: 1.3;
              }
              .text-center { text-align: center; }
              .header { font-size: 13px; font-weight: bold; color: #58cc02; }
              .separator { border-top: 1px dashed #444; margin: 8px 0; }
              table { width: 100%; font-size: 11px; }
              .important { font-weight: bold; background-color: #eee; padding: 3px; }
              .deficit { color: #f94144; font-weight: bold; }
              .perfect { color: #58cc02; font-weight: bold; }
              .title { font-size: 11px; text-transform: uppercase; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="text-center header">🦉 REPORTES CASEROS DUO 🦉</div>
            <div class="text-center" style="font-size: 9px;">Duo Academia Gastronómica-Comercial</div>
            <div class="separator"></div>

            <div class="text-center" style="font-weight: bold; margin-bottom: 6px;">
              ARQUEO CONSOLIDADO DE CAJA REGISTRADORA
            </div>
            <div><strong>TURNO ID:</strong> ${shift.id}</div>
            <div><strong>ESTADO:</strong> ${shift.status.toUpperCase()}</div>
            <div><strong>OPERADOR:</strong> ${shift.employeeName.toUpperCase()}</div>
            <div><strong>APERTURA:</strong> ${new Date(shift.openingTime).toLocaleString()}</div>
            ${shift.closingTime ? `<div><strong>CIERRE:</strong> ${new Date(shift.closingTime).toLocaleString()}</div>` : ''}
            
            <div class="separator"></div>
            <strong>CUENTAS DIRECTAS DETECTADAS:</strong>
            <table style="margin-top: 4px;">
              <tr>
                <td>Fondo Inicial de Caja:</td>
                <td align="right" style="font-family: monospace;">$${shift.initialCash.toFixed(2)}</td>
              </tr>
              <tr>
                <td>(+) Ventas en Efectivo:</td>
                <td align="right" style="font-family: monospace;">$${shift.salesVolume.toFixed(2)}</td>
              </tr>
              <tr>
                <td>(+) Entradas de Efectivo:</td>
                <td align="right" style="font-family: monospace; color: #58cc02;">+$${shiftInFlow.toFixed(2)}</td>
              </tr>
              <tr>
                <td>(-) Salidas de Caja:</td>
                <td align="right" style="font-family: monospace; color: #ff9600;">-$${shiftOutFlow.toFixed(2)}</td>
              </tr>
              <tr style="border-top: 1px solid #333; font-weight: bold;">
                <td style="padding-top: 4px;">EFECTIVO ESTIMADO EN SISTEMA:</td>
                <td align="right" style="padding-top: 4px; font-family: monospace;">$${shift.expectedCash.toFixed(2)}</td>
              </tr>
              ${shift.status === 'closed' ? `
              <tr style="font-weight: bold; background-color: #f1f1f1;">
                <td>EFECTIVO FÍSICO ARQUEADO:</td>
                <td align="right" style="font-family: monospace;">$${shift.actualCash?.toFixed(2)}</td>
              </tr>
              <tr style="font-weight: bold; color: ${(shift.difference || 0) < 0 ? '#ff0000' : '#46a302'}">
                <td>DIFERENCIA O DESCUADRE:</td>
                <td align="right" style="font-family: monospace;">
                  ${(shift.difference || 0) >= 0 ? '+' : ''}${shift.difference?.toFixed(2)}
                </td>
              </tr>
              ` : ''}
            </table>

            ${shift.movements.length > 0 ? `
              <div class="separator"></div>
              <strong>HISTORIAL DE ENTRADAS/SALIDAS:</strong>
              <table style="margin-top: 4px; border-collapse: collapse; width: 100%;">
                ${movementsRows}
              </table>
            ` : ''}

            <div class="separator"></div>
            <div class="text-center" style="margin: 8px 0;">
              <img src="${qrUrl}" alt="QR" style="width: 75px; height: 75px;" />
              <div style="font-size: 8px; color: #555; margin-top: 4px;">
                Validación de auditoría institucional DuoPOS
              </div>
            </div>

            <div class="separator"></div>
            <div style="font-size: 8px; text-align: center; color: #444;">
              Este arqueo es vinculante y cuenta como declaración fiscal de caja. Consérvese para cotejos semanales de egresos.
            </div>
            <script>
              window.onload = function() {
                window.print();
                setTimeout(() => { window.close(); }, 1000);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch(e) {
      console.log('Printing error:', e);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn font-sans p-1 md:p-3 pb-12">
      
      {/* 1. SECTION TITLES */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b-2 border-gray-100 pb-4">
        <div className="text-left">
          <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight flex items-center gap-2">
            📂 Módulo de Turnos y Caja
          </h2>
          <p className="text-xs text-[#949494] font-bold">
            Administración del fondo de caja, depósitos manuales, retiros de seguridad y arqueos auditados.
          </p>
        </div>

        {/* Sub-tabs header */}
        <div className="flex bg-[#e5e5e5]/40 p-1 rounded-2xl border-2 border-gray-200 shadow-3xs self-stretch md:self-auto">
          <button
            type="button"
            onClick={() => { setActiveSubTab('current'); playSound('click'); }}
            className={`flex-1 md:flex-initial py-2 px-4 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer transition-all ${
              activeSubTab === 'current'
                ? 'bg-[#1cb0f6] text-white shadow-xs'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Turno Activo 🔑
          </button>
          <button
            type="button"
            onClick={() => { setActiveSubTab('history'); playSound('click'); }}
            className={`flex-1 md:flex-initial py-2 px-4 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer transition-all ${
              activeSubTab === 'history'
                ? 'bg-[#1cb0f6] text-white shadow-xs'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Historial de Arqueos 📊
          </button>
        </div>
      </div>

      {activeSubTab === 'current' && (
        <div className="space-y-6">
          
          {!activeShift ? (
            <ShiftOpeningCard
              onOpenShift={onOpenShift}
              onGrantXp={onGrantXp}
            />
          ) : (
            
            <div className="space-y-6">
              
              {/* Active Operator Banner */}
              <div className="bg-white border-2 border-gray-200 border-b-[6px] rounded-3xl p-5 md:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-left">
                <div className="flex items-center gap-4">
                  <div className="bg-[#e2f0d9] border-[#a1d99b] border p-3 rounded-2xl text-2xl select-none shadow-3xs">
                    🟢
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="bg-[#e5f6ff] text-[#1cb0f6] text-[9px] font-black uppercase py-0.5 px-1.5 rounded-md border border-[#1cb0f6]/10">
                        Caja Abierta
                      </span>
                      <span className="text-xs text-gray-400 font-extrabold font-mono">
                        ID: {activeShift.id}
                      </span>
                    </div>
                    <h3 className="text-lg font-black text-gray-800 mt-1 uppercase">
                      Cajero: {activeShift.employeeName}
                    </h3>
                    <p className="text-xs text-gray-405 font-bold flex items-center gap-1 mt-0.5">
                      <Clock size={12} className="text-gray-400" />
                      Iniciado el {new Date(activeShift.openingTime).toLocaleDateString()} a las {new Date(activeShift.openingTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                  <button
                    type="button"
                    onClick={() => { setIsMoveModalOpen(true); playSound('click'); }}
                    className="flex-1 md:flex-initial bg-amber-500 text-white border-b-4 border-amber-700 hover:bg-amber-400 active:translate-y-0.5 active:border-b-0 py-2.5 px-4 rounded-xl font-black text-[10px] md:text-xs uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Layers size={14} /> Registrar Movimiento
                  </button>

                  <button
                    type="button"
                    onClick={() => printShiftReceipt(activeShift)}
                    className="flex-1 md:flex-initial bg-white border-2 border-gray-200 border-b-4 hover:bg-gray-55 active:translate-y-0.5 focus:outline-none py-2.5 px-4 rounded-xl font-black text-[10px] md:text-xs text-gray-600 uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Printer size={14} /> Imprimir Pre-Arqueo
                  </button>

                  <button
                    type="button"
                    onClick={() => { setIsCloseModalOpen(true); playSound('click'); }}
                    className="w-full md:w-auto bg-red-500 text-white border-b-4 border-red-700 hover:bg-red-400 active:translate-y-0.5 active:border-b-0 py-2.5 px-5 rounded-xl font-black text-[10px] md:text-xs uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer"
                  >
                    🔒 Cerrar & Balancear Caja
                  </button>
                </div>
              </div>

              {/* Stats Grid */}
              <ShiftStatsGrid
                activeShift={activeShift}
                shiftTotals={shiftTotals}
                computedExpectedCash={computedExpectedCash}
              />

              {/* Operations Logs List */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Cash Movements log */}
                <div className="bg-white border-2 border-gray-200 border-b-[6px] rounded-3xl p-5 md:p-6 space-y-4 text-left">
                  <div className="flex justify-between items-center border-b pb-3">
                    <div>
                      <h4 className="text-base font-black text-gray-800 uppercase flex items-center gap-1">
                        📦 Movimientos de Efectivo
                      </h4>
                      <p className="text-[10px] text-gray-400 font-black uppercase mt-0.5">Entradas manuales y retiros de seguridad</p>
                    </div>
                    <span className="text-[10px] font-black bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md border border-amber-250 uppercase leading-none">
                      {activeShift.movements.length} registros
                    </span>
                  </div>

                  {activeShift.movements.length === 0 ? (
                    <div className="py-12 text-center text-gray-450 text-xs font-bold space-y-2">
                      <p className="text-gray-400 text-2xl">💸</p>
                      <p>No se han registrado entradas o salidas extraordinarias de efectivo en este turno.</p>
                      <p className="text-[10px] text-[#9c9c9c]">Utiliza el botón "Registrar Movimiento" para agregar cambio o reportar pago de gastos menores.</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                      {activeShift.movements.map((move, i) => (
                        <div key={move.id || i} className="bg-gray-50 hover:bg-gray-100 border border-gray-200 p-3 rounded-2xl flex items-center justify-between transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl border ${
                              move.type === 'in' 
                                ? 'bg-green-50 border-green-200 text-[#58cc02]' 
                                : 'bg-amber-50 border-amber-200 text-amber-500'
                            }`}>
                              {move.type === 'in' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                            </div>
                            <div>
                              <span className="text-xs font-black text-gray-800 flex items-center gap-2">
                                <span>{move.reason}</span>
                                <span className={`text-[8px] font-black uppercase px-1 py-0.5 rounded ${
                                  move.type === 'in' ? 'bg-green-150 text-[#3c9e01]' : 'bg-amber-150 text-amber-800'
                                }`}>
                                  {move.type === 'in' ? 'Entrada' : 'Salida'}
                                </span>
                              </span>
                              <p className="text-[9px] text-[#9c9c9c] font-medium leading-none mt-1">
                                Hora: {new Date(move.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </p>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <span className={`text-sm font-black font-mono ${move.type === 'in' ? 'text-[#3c9e01]' : 'text-amber-600'}`}>
                              {move.type === 'in' ? '+' : '-'}${move.amount.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                </div>

                {/* Shift sales list */}
                <div className="bg-white border-2 border-gray-200 border-b-[6px] rounded-3xl p-5 md:p-6 space-y-4 text-left">
                  <div className="flex justify-between items-center border-b pb-3">
                    <div>
                      <h4 className="text-base font-black text-gray-800 uppercase">
                        🧾 Ventas del Turno Actual
                      </h4>
                      <p className="text-[10px] text-gray-400 font-black uppercase mt-0.5">Auditoría en tiempo real de transacciones</p>
                    </div>
                    <span className="text-[10px] font-black bg-[#e5f6ff] text-[#1cb0f6] px-2 py-0.5 rounded-md border border-[#1cb0f6]/20 uppercase">
                      {currentShiftSales.length} cobrados
                    </span>
                  </div>

                  {currentShiftSales.length === 0 ? (
                    <div className="py-12 text-center text-gray-450 text-xs font-bold space-y-2">
                      <p className="text-gray-400 text-2xl">🛒</p>
                      <p>Aún no se registran cobros en este turno.</p>
                      <p className="text-[10px] text-[#9c9c9c]">Las ventas ingresadas en la pantalla "Vender" se vincularán automáticamente aquí.</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                      {currentShiftSales.map((txn) => (
                        <div key={txn.id} className="bg-gray-50 border border-gray-200 hover:bg-gray-100 p-3 rounded-2xl flex items-center justify-between transition-all">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-black text-gray-800 uppercase block">FL: {txn.id.substring(txn.id.indexOf('-') + 1)}</span>
                              <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md border text-white ${
                                txn.isMixedPayment
                                  ? 'bg-purple-500 border-purple-600'
                                  : txn.paymentMethod === 'cash' 
                                    ? 'bg-[#58cc02] border-[#3c9e01]' 
                                    : txn.paymentMethod === 'card'
                                      ? 'bg-[#1cb0f6] border-[#1899d6]'
                                      : 'bg-yellow-500 border-yellow-600'
                              }`}>
                                {txn.isMixedPayment ? 'Mixto 💰💳' : txn.paymentMethod === 'cash' ? 'Efectivo 💵' : txn.paymentMethod === 'card' ? 'Electrónico' : 'Puntos 💎'}
                              </span>
                            </div>
                            <p className="text-[9px] text-gray-450 font-bold mt-1.5">
                              {new Date(txn.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • {txn.items.length} artículos cobrados
                              {txn.isMixedPayment && ` (Efe: $${(txn.mixedCashAmount || 0).toFixed(2)} | Tar: $${(txn.mixedCardAmount || 0).toFixed(2)})`}
                            </p>
                          </div>

                          <div className="text-right">
                            <span className="text-xs font-black font-mono block text-gray-850">${txn.total.toFixed(2)}</span>
                            <span className="text-[8px] text-gray-400 font-extrabold uppercase leading-none block mt-0.5">+{txn.xpGained} XP</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                </div>

              </div>

            </div>
          )}

        </div>
      )}

      {activeSubTab === 'history' && (
        <ShiftHistoryTab
          shiftHistory={shiftHistory}
          onOpenReport={(hist) => setSelectedHistReport(hist)}
        />
      )}

      {/* MODAL WINDOWS OVERLAYS */}
      <ShiftMovementModal
        isOpen={isMoveModalOpen}
        onClose={() => setIsMoveModalOpen(false)}
        computedExpectedCash={computedExpectedCash}
        onAddShiftMovement={onAddShiftMovement}
        onGrantXp={onGrantXp}
      />

      <ShiftCloseModal
        isOpen={isCloseModalOpen}
        onClose={() => setIsCloseModalOpen(false)}
        computedExpectedCash={computedExpectedCash}
        onCloseShift={onCloseShift}
        user={user}
      />

      <ShiftReportDetailModal
        shift={selectedHistReport}
        onClose={() => setSelectedHistReport(null)}
        onPrint={printShiftReceipt}
      />

    </div>
  );
}
