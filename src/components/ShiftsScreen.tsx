/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { User, CashShift, CashMovement, Transaction } from '../types';
import { 
  Wallet, 
  DollarSign, 
  TrendingUp, 
  PlusCircle, 
  MinusCircle, 
  Layers, 
  Printer, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowUpRight, 
  ArrowDownRight, 
  Calculator, 
  FileText, 
  Clock, 
  Calendar, 
  Search,
  Sparkles,
  Award
} from 'lucide-react';
import { playSound } from '../utils/sounds';

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

// Denominations for the standard cash register count (Cash drawer calculator)
interface Denomination {
  value: number;
  label: string;
  type: 'bill' | 'coin';
}

const DENOMINATIONS: Denomination[] = [
  { value: 1000, label: '$1,000 MXN / USD', type: 'bill' },
  { value: 500, label: '$500 MXN / USD', type: 'bill' },
  { value: 200, label: '$200 MXN / USD', type: 'bill' },
  { value: 100, label: '$100 MXN / USD', type: 'bill' },
  { value: 50, label: '$50 MXN / USD', type: 'bill' },
  { value: 20, label: '$20 MXN / USD', type: 'bill' },
  { value: 10, label: '$10 MXN / USD', type: 'coin' },
  { value: 5, label: '$5 MXN / USD', type: 'coin' },
  { value: 2, label: '$2 MXN / USD', type: 'coin' },
  { value: 1, label: '$1 MXN / USD', type: 'coin' },
  { value: 0.5, label: '$0.50 centavos', type: 'coin' },
];

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
  
  // Tab control: 'current' (active shift / opening guide) vs 'history' (past shifts & analytics)
  const [activeSubTab, setActiveSubTab] = useState<'current' | 'history'>('current');

  // Input states for opening a new shift
  const [openFund, setOpenFund] = useState('200');

  // Input states for manual movements (Cash In / Out)
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [moveType, setMoveType] = useState<'in' | 'out'>('in');
  const [moveAmount, setMoveAmount] = useState('');
  const [moveReason, setMoveReason] = useState('');
  const [movementFeedback, setMovementFeedback] = useState('');

  // Shift closing state
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [closeNotes, setCloseNotes] = useState('');
  const [manualCountedCash, setManualCountedCash] = useState('');

  // Interactive Cash Drawer Calculator State
  const [isCalcOpen, setIsCalcOpen] = useState(false);
  const [calcCounts, setCalcCounts] = useState<Record<number, number>>({
    1000: 0, 500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 2: 0, 1: 0, 0.5: 0
  });

  // Selected historic shift report viewer modal
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

  // Denominations sum calculator helper
  const calcTotalAmount = useMemo(() => {
    let total = 0;
    Object.entries(calcCounts).forEach(([val, count]) => {
      total += Number(val) * Number(count);
    });
    return Number(total.toFixed(2));
  }, [calcCounts]);

  // Apply visual count to physical count input
  const applyCalcToPhysicalCount = () => {
    setManualCountedCash(calcTotalAmount.toString());
    setIsCalcOpen(false);
    playSound('success');
  };

  // Preset opening cash click
  const selectOpeningPreset = (val: string) => {
    setOpenFund(val);
    playSound('click');
  };

  // Reset calculator counts
  const resetDenominationCalculator = () => {
    const fresh: Record<number, number> = {
      1000: 0, 500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 2: 0, 1: 0, 0.5: 0
    };
    setCalcCounts(fresh);
    playSound('swoosh');
  };

  // Handle opening register shift
  const handleOpenLocalShift = () => {
    const val = parseFloat(openFund);
    if (isNaN(val) || val < 0) {
      alert('⚠️ Por favor ingresa un fondo inicial válido mayor o igual a 0.');
      return;
    }
    onOpenShift(val);
    playSound('kaching');
    onGrantXp(20); // Award opening experience points!
  };

  // Close shift action
  const handleCloseLocalShift = () => {
    if (!activeShift) return;

    const actual = parseFloat(manualCountedCash);
    if (isNaN(actual) || actual < 0) {
      alert('⚠️ Por favor, ingresa un monto físico contado de caja válido.');
      return;
    }

    const difference = Number((actual - computedExpectedCash).toFixed(2));
    onCloseShift(actual, computedExpectedCash, difference, closeNotes);
    
    // Cleanup states
    setManualCountedCash('');
    setCloseNotes('');
    setIsCloseModalOpen(false);
    playSound('success');
  };

  // Cash movement submit handler (ingress / egress)
  const handleSubmitMovement = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(moveAmount);
    if (isNaN(amt) || amt <= 0) {
      setMovementFeedback('⚠️ Ingresa un monto mayor a 0');
      return;
    }

    if (moveType === 'out' && amt > computedExpectedCash) {
      setMovementFeedback(`⛔ Fondos insuficientes. No puedes extraer más del efectivo real en caja ($${computedExpectedCash.toFixed(2)})`);
      return;
    }

    const reasonClean = moveReason.trim() || (moveType === 'in' ? 'Abastecimiento de Cambio' : 'Retiro Administrativo');
    onAddShiftMovement(moveType, amt, reasonClean);
    playSound('kaching');
    onGrantXp(10); // Reward active operations

    setMoveAmount('');
    setMoveReason('');
    setMovementFeedback('');
    setIsMoveModalOpen(false);
  };

  // Render comparative analytics dashboard
  const shiftStatsAnalysis = useMemo(() => {
    if (shiftHistory.length === 0) return null;

    const totalFonds = shiftHistory.reduce((sum, s) => sum + s.initialCash, 0);
    const totalVolume = shiftHistory.reduce((sum, s) => sum + s.salesVolume, 0);
    const avgSales = totalVolume / shiftHistory.length;
    const discrepanciesSum = shiftHistory.reduce((sum, s) => sum + Math.abs(s.difference || 0), 0);
    const avgDiscrepancy = discrepanciesSum / shiftHistory.length;

    // Filter shifts with exact square audits (perfect matches)
    const balancedShifts = shiftHistory.filter(s => Math.abs(s.difference || 0) < 0.05).length;
    const pctBalanced = Math.round((balancedShifts / shiftHistory.length) * 100);

    return {
      avgSales: Number(avgSales.toFixed(2)),
      avgDiscrepancy: Number(avgDiscrepancy.toFixed(2)),
      pctBalanced,
      totalVolume: Number(totalVolume.toFixed(2))
    };
  }, [shiftHistory]);

  // Simulate ticket printing for open or closed shifts
  const printShiftReceipt = (shift: CashShift, isHist: boolean = false) => {
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('⚠️ Ventana emergente bloqueada. Habilita pop-ups para generar informes impresos.');
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
            <strong>CUENTAS DIRECTAS DETESTADAS:</strong>
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
        <div>
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
          
          {/* A. NOT OPEN CONTROLS */}
          {!activeShift ? (
            <div className="max-w-xl mx-auto bg-white border-2 border-gray-200 border-b-8 rounded-3xl p-6 md:p-8 space-y-6 text-center animate-scaleUp text-gray-850 my-4">
              <div className="space-y-2">
                <span className="text-7xl block select-none drop-shadow-xs leading-none animate-bounce">
                  🔓
                </span>
                <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">
                  Caja Cerrada temporalmente
                </h3>
                <p className="text-xs text-gray-400 font-extrabold max-w-sm mx-auto uppercase">
                  Declara fondos iniciales para habilitar el motor de ventas
                </p>
              </div>

              {/* Suggestions */}
              <div className="space-y-4 bg-gray-50 border-2 border-dashed border-gray-200 p-5 rounded-2xl text-left">
                <span className="text-[10px] uppercase font-black tracking-widest text-[#777] block text-center md:text-left">
                  Monto de Fondo en Efectivo Recomendado
                </span>
                <div className="grid grid-cols-4 gap-2">
                  {['100', '200', '500', '1000'].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => selectOpeningPreset(val)}
                      className={`py-2 rounded-xl text-xs font-black border-2 transition-all cursor-pointer ${
                        openFund === val
                          ? 'bg-[#58cc02] border-[#58cc02] text-white shadow-xs'
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      ${val}
                    </button>
                  ))}
                </div>

                <div className="space-y-1.5 pt-1">
                  <label className="text-[10px] uppercase font-bold text-gray-500 block">
                    Fondo Inicial de Caja Manual ($)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 font-extrabold text-[#58cc02] text-sm leading-none">
                      $
                    </span>
                    <input
                      type="number"
                      value={openFund}
                      onChange={(e) => setOpenFund(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-7 pr-4 py-2 bg-white border-2 border-gray-200 focus:border-[#58cc02] rounded-xl font-bold font-mono text-xs text-gray-700 outline-none transition-colors"
                      min="0"
                    />
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleOpenLocalShift}
                className="w-full bg-[#58cc02] text-white border-b-4 border-[#3c9e01] hover:bg-[#61e002] active:translate-y-0.5 active:border-b-2 py-4 rounded-2xl font-black text-xs uppercase tracking-wider cursor-pointer shadow-xs transition-all flex items-center justify-center gap-1.5"
              >
                Abrir Caja & Iniciar Operación del Día 📁
              </button>
            </div>
          ) : (
            
            // B. ACTIVE SHIFT CODES
            <div className="space-y-6">
              
              {/* Active Operator Banner with indicators */}
              <div className="bg-white border-2 border-gray-200 border-b-[6px] rounded-3xl p-5 md:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
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
                    className="flex-1 md:flex-initial bg-white border-2 border-gray-200 border-b-4 hover:bg-gray-50 active:translate-y-0.5 focus:outline-none py-2.5 px-4 rounded-xl font-black text-[10px] md:text-xs text-gray-600 uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer"
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

              {/* Shift Bento Grid Real-time counters */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                
                {/* 1. Initial fund */}
                <div className="bg-white border-2 border-gray-200 border-b-[6px] rounded-2xl p-4 flex flex-col justify-between h-28">
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-gray-400 block">Fondo de Caja</span>
                  <div>
                    <span className="text-xl md:text-2xl font-black text-gray-800 font-mono">
                      ${activeShift.initialCash.toFixed(2)}
                    </span>
                    <span className="text-[8px] text-[#949494] font-extrabold uppercase block mt-0.5 leading-none">Inyectado inicial</span>
                  </div>
                </div>

                {/* 2. Cash sales (affecting registry) */}
                <div className="bg-white border-2 border-gray-200 border-b-[6px] rounded-2xl p-4 flex flex-col justify-between h-28">
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-gray-400 block">Venta Efectivo</span>
                  <div>
                    <span className="text-xl md:text-2xl font-black text-[#58cc02] font-mono">
                      +${shiftTotals.cashSales.toFixed(2)}
                    </span>
                    <span className="text-[8px] text-gray-450 font-black uppercase block mt-1 leading-none">De {shiftTotals.ticketCount} transacciones</span>
                  </div>
                </div>

                {/* 3. Card sales (electronic drawer) */}
                <div className="bg-white border-2 border-gray-200 border-b-[6px] rounded-2xl p-4 flex flex-col justify-between h-28">
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-gray-400 block">Venta Electrónica</span>
                  <div>
                    <span className="text-xl md:text-2xl font-black text-blue-500 font-mono">
                      ${shiftTotals.cardSales.toFixed(2)}
                    </span>
                    <span className="text-[8px] text-[#949494] font-bold uppercase block mt-1 leading-none">Cargos a Terminal</span>
                  </div>
                </div>

                {/* 4. Movements deposits and withdrawals */}
                {(() => {
                  let netMoveAmt = 0;
                  activeShift.movements.forEach(m => {
                    netMoveAmt += m.type === 'in' ? m.amount : -m.amount;
                  });
                  return (
                    <div className="bg-white border-2 border-gray-200 border-b-[6px] rounded-2xl p-4 flex flex-col justify-between h-28">
                      <span className="text-[10px] uppercase tracking-wider font-extrabold text-gray-400 block">Efectivo Suministro</span>
                      <div>
                        <span className={`text-xl md:text-2xl font-black font-mono ${netMoveAmt >= 0 ? 'text-emerald-500' : 'text-amber-500'}`}>
                          {netMoveAmt >= 0 ? '+' : '-'}${Math.abs(netMoveAmt).toFixed(2)}
                        </span>
                        <span className="text-[8px] text-[#949494] font-bold uppercase block mt-1 leading-none">{activeShift.movements.length} Entradas/Salidas</span>
                      </div>
                    </div>
                  );
                })()}

                {/* 5. Expected Cash in Drawer */}
                <div className="bg-white border-2 border-gray-250 border-b-[6px] rounded-2xl p-4 flex flex-col justify-between h-28 bg-[#fafafa]">
                  <span className="text-[10px] uppercase tracking-wider font-black text-gray-500 block">Esperado en Caja</span>
                  <div>
                    <span className="text-xl md:text-2xl font-black text-indigo-600 font-mono">
                      ${computedExpectedCash.toFixed(2)}
                    </span>
                    <span className="text-[8px] text-gray-400 font-black uppercase block mt-1 leading-none">Efectivo teórico total</span>
                  </div>
                </div>

              </div>

              {/* Sub-panels: Live transactions list of current shift vs Manual movements log */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Visual Shift Operations Audit Registry */}
                <div className="bg-white border-2 border-gray-200 border-b-[6px] rounded-3xl p-5 md:p-6 space-y-4">
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
                <div className="bg-white border-2 border-gray-200 border-b-[6px] rounded-3xl p-5 md:p-6 space-y-4">
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
                        <div key={txn.id} className="bg-gray-50 border border-gray-204 hover:bg-gray-100 p-3 rounded-2xl flex items-center justify-between transition-all">
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
        <div className="space-y-6">
          
          {/* C. COMPARATIVE POS METRICS */}
          {shiftStatsAnalysis && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              
              <div className="bg-white border-2 border-gray-200 border-b-[6px] rounded-3xl p-5 flex flex-col justify-between h-32">
                <span className="text-[10px] uppercase font-black tracking-wider text-gray-400">Total Turnos Auditados</span>
                <div>
                  <span className="text-2xl font-black text-teal-600 font-mono">{shiftHistory.length}</span>
                  <p className="text-[8px] text-gray-400 font-bold uppercase block mt-1 leading-none">Sesiones de caja cerradas</p>
                </div>
              </div>

              <div className="bg-white border-2 border-gray-200 border-b-[6px] rounded-3xl p-5 flex flex-col justify-between h-32">
                <span className="text-[10px] uppercase font-black tracking-wider text-gray-400">Ventas Totales Registradas</span>
                <div>
                  <span className="text-2xl font-black text-[#58cc02] font-mono">${shiftStatsAnalysis.totalVolume.toFixed(2)}</span>
                  <p className="text-[8px] text-gray-400 font-bold uppercase block mt-1 leading-none">Volumen acumulado arqueado</p>
                </div>
              </div>

              <div className="bg-white border-2 border-gray-200 border-b-[6px] rounded-3xl p-5 flex flex-col justify-between h-32">
                <span className="text-[10px] uppercase font-black tracking-wider text-gray-400">Venta Promedio por Turno</span>
                <div>
                  <span className="text-2xl font-black text-[#1cb0f6] font-mono">${shiftStatsAnalysis.avgSales.toFixed(2)}</span>
                  <p className="text-[8px] text-gray-400 font-bold uppercase block mt-1 leading-none">Rendimiento ponderado de caja</p>
                </div>
              </div>

              <div className="bg-white border-2 border-gray-200 border-b-[6px] rounded-3xl p-5 flex flex-col justify-between h-32">
                <span className="text-[10px] uppercase font-black tracking-wider text-gray-400">Exactitud de Arqueos</span>
                <div>
                  <span className="text-2xl font-black text-amber-500 font-mono">
                    {shiftStatsAnalysis.pctBalanced}%
                  </span>
                  <p className="text-[8px] text-gray-400 font-bold uppercase block mt-1 leading-none">
                    Cierres sin descuadre (${shiftStatsAnalysis.avgDiscrepancy} desc. prom)
                  </p>
                </div>
              </div>

            </div>
          )}

          {/* D. PAST SHIFTS LOG */}
          <div className="bg-white border-2 border-gray-200 border-b-[6px] rounded-3xl p-5 md:p-6 space-y-4">
            <div className="border-b pb-3 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-black text-gray-800 uppercase">
                  🏆 Registro Histórico de Turnos y Auditorías
                </h3>
                <p className="text-xs text-gray-450 font-bold mt-0.5">Control vinculante del flujo de efectivo recaudado históricamente</p>
              </div>
              <span className="text-xs bg-gray-150 border border-gray-200 font-black px-2.5 py-1 rounded-full uppercase text-gray-600">
                Resguardo Local
              </span>
            </div>

            {shiftHistory.length === 0 ? (
              <div className="py-16 text-center text-gray-400 space-y-3">
                <span className="text-6xl block leading-none">📊</span>
                <p className="text-sm font-black uppercase text-gray-500">No hay turnos cerrados registrados para auditar</p>
                <p className="text-xs text-gray-400 max-w-sm mx-auto font-medium">
                  Una vez que abras tu primer turno de caja y realices el posterior cierre y arqueo de caja, los informes de auditoría aparecerán protegidos aquí.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-bold text-gray-600">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-400 uppercase text-[9px] font-extrabold pb-2.5">
                      <th className="pb-2.5">Turno ID / Operador</th>
                      <th className="pb-2.5">Apertura / Cierre</th>
                      <th className="pb-2.5 text-center">Ventas</th>
                      <th className="pb-2.5 text-right">Efectivo Sistema</th>
                      <th className="pb-2.5 text-right">Efectivo Contado</th>
                      <th className="pb-2.5 text-right">Diferencia</th>
                      <th className="pb-2.5 text-right">Controles</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {shiftHistory.map((hist) => {
                      const isDescuadre = Math.abs(hist.difference || 0) > 0.05;
                      return (
                        <tr key={hist.id} className="hover:bg-gray-50 transition-colors">
                          <td className="py-3">
                            <div className="flex items-center gap-1">
                              <span className="text-gray-700 font-black leading-none">{hist.employeeName}</span>
                              {isDescuadre ? (
                                <span className="bg-amber-100 text-amber-700 px-1 py-0.5 text-[8px] rounded uppercase font-black border border-amber-200">
                                  Dif.
                                </span>
                              ) : (
                                <span className="bg-[#e2f0d9] text-[#3c9e01] px-1 py-0.5 text-[8px] rounded uppercase font-black border border-[#a1d99b]">
                                  Sustrato OK
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] font-mono text-gray-400 font-bold block mt-1 leading-none">{hist.id}</span>
                          </td>
                          <td className="py-3">
                            <span className="text-gray-700 block text-[10px] font-mono tracking-tight leading-none">
                              {new Date(hist.openingTime).toLocaleDateString()} a las {new Date(hist.openingTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                            {hist.closingTime && (
                              <span className="text-[9px] text-[#9c9c9c] block mt-1 leading-none font-medium">
                                Cerrado: {new Date(hist.closingTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </span>
                            )}
                          </td>
                          <td className="py-3 text-center">
                            <span className="text-gray-800 font-bold font-mono">${hist.salesVolume.toFixed(2)}</span>
                            <span className="text-[9px] text-gray-400 block font-normal leading-none mt-1">{hist.salesCount} tickets</span>
                          </td>
                          <td className="py-3 text-right">
                            <span className="text-gray-700 font-mono font-bold">${hist.expectedCash.toFixed(2)}</span>
                          </td>
                          <td className="py-3 text-right">
                            <span className="text-gray-800 font-mono font-bold">${(hist.actualCash || 0).toFixed(2)}</span>
                          </td>
                          <td className={`py-3 text-right font-mono font-black ${isDescuadre ? 'text-red-500' : 'text-[#3c9e01]'}`}>
                            {(hist.difference || 0) >= 0 ? '+' : ''}{(hist.difference || 0).toFixed(2)}
                          </td>
                          <td className="py-3 text-right">
                            <div className="flex justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => { setSelectedHistReport(hist); playSound('click'); }}
                                className="border border-[#1cb0f6] bg-[#1cb0f6]/5 text-[#1cb0f6] text-[9px] font-black py-1.5 px-2.5 rounded-lg hover:bg-sky-100 transition-colors cursor-pointer uppercase tracking-tight"
                              >
                                Ver Detalle 🧾
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL WINDOW: RECORD EXTRA COIN FLOW / SETTLEMENT MOVEMENT */}
      {isMoveModalOpen && activeShift && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-3xs flex items-center justify-center p-4">
          <div className="bg-white border-2 border-gray-200 border-b-8 rounded-3xl p-6 max-w-sm w-full space-y-4 animate-scaleUp text-gray-850 shadow-xl">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight">
                📥 Registrar Movimiento Caja
              </h3>
              <button 
                onClick={() => setIsMoveModalOpen(false)}
                className="text-[#9c9c9c] hover:text-gray-500 text-lg font-black p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitMovement} className="space-y-4">
              
              {/* Type Switcher */}
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-black text-[#555] block">Dirección del Efectivo</span>
                <div className="grid grid-cols-2 gap-2 bg-gray-50 p-1.5 rounded-2xl border-2 border-gray-200">
                  <button
                    type="button"
                    onClick={() => { setMoveType('in'); playSound('click'); }}
                    className={`py-2 rounded-xl text-xs font-black uppercase transition-all tracking-wider flex items-center justify-center gap-1 ${
                      moveType === 'in' 
                        ? 'bg-green-500 text-white shadow-xs' 
                        : 'text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    📥 Entrada (Sencillo)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMoveType('out'); playSound('click'); }}
                    className={`py-2 rounded-xl text-xs font-black uppercase transition-all tracking-wider flex items-center justify-center gap-1 ${
                      moveType === 'out' 
                        ? 'bg-amber-500 text-white shadow-xs' 
                        : 'text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    📤 Retiro (Gasto)
                  </button>
                </div>
              </div>

              {/* Amount input */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-black text-gray-500 block">
                  Monto a Registrar ($)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 font-extrabold text-[#58cc02] text-sm leading-none">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={moveAmount}
                    onChange={(e) => setMoveAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-7 pr-4 py-2.5 bg-white border-2 border-gray-200 focus:border-[#58cc02] rounded-xl font-bold font-mono text-xs text-gray-700 outline-none transition-colors"
                    min="0.01"
                  />
                </div>
              </div>

              {/* Common reasons preset buttons */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-black text-[#555] block">
                  Conceptos Preestablecidos
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {(moveType === 'in' 
                    ? ['Ingreso de cambio sencillo 💰', 'Ajuste por sustrato extra 📂', 'Fondo adicional']
                    : ['Pago a proveedor menor 📦', 'Retiro de seguridad (Fuerte) 🔒', 'Gasto emergente local 🦉']
                  ).map(label => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => { setMoveReason(label); playSound('click'); }}
                      className={`text-[9px] py-1.5 px-2.5 rounded-lg border font-black transition-all ${
                        moveReason === label
                          ? 'bg-[#1cb0f6] text-white border-[#1cb0f6]'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reason Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-black text-gray-500 block">
                  Observación / Justificación Manual
                </label>
                <textarea
                  value={moveReason}
                  onChange={(e) => setMoveReason(e.target.value)}
                  placeholder="Detalle el motivo del movimiento..."
                  rows={2}
                  className="w-full p-2.5 bg-white border-2 border-gray-200 focus:border-[#58cc02] rounded-xl font-bold text-xs text-gray-700 outline-none transition-colors"
                />
              </div>

              {movementFeedback && (
                <p className="text-[10px] font-black leading-none text-red-500 uppercase mt-2">
                  {movementFeedback}
                </p>
              )}

              <button
                type="submit"
                className="w-full bg-[#1cb0f6] text-white border-b-4 border-sky-700 hover:bg-[#32beff] active:border-b-0 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                Grabar Operación de Arca 📥
              </button>

            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL WINDOW: BALANCE REGISTER & CLOSE SHIFT (Arqueo de billetes y monedas) */}
      {isCloseModalOpen && activeShift && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-3xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border-2 border-gray-250 border-b-8 rounded-3xl p-5 md:p-6 max-w-lg w-full space-y-4 animate-scaleUp my-8 text-gray-850 shadow-2xl relative">
            <div className="flex justify-between items-center border-b pb-2">
              <div>
                <h3 className="text-base font-black text-gray-800 uppercase tracking-tight flex items-center gap-1">
                  🔒 Cierre de Turno y Declaración Contada
                </h3>
                <span className="text-[10px] font-bold text-gray-400 block font-mono">
                  Se espera: ${computedExpectedCash.toFixed(2)} USD / MXN en efectivo.
                </span>
              </div>
              <button 
                onClick={() => setIsCloseModalOpen(false)}
                className="text-[#9c9c9c] hover:text-gray-500 text-lg font-black p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              
              {/* Dynamic Warning of variance */}
              {(() => {
                const counted = parseFloat(manualCountedCash) || 0;
                const difference = Number((counted - computedExpectedCash).toFixed(2));
                const hasVariance = Math.abs(difference) > 0.05;

                return (
                  <div className={`p-3 rounded-2xl border text-xs flex gap-2.5 items-start ${
                    !manualCountedCash 
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : hasVariance 
                        ? 'bg-amber-50 border-amber-250 text-amber-850' 
                        : 'bg-emerald-50 border-emerald-250 text-[#3c9e01]'
                  }`}>
                    <div className="text-xl">
                      {!manualCountedCash ? 'ℹ️' : hasVariance ? '⚠️' : '✅'}
                    </div>
                    <div>
                      {!manualCountedCash ? (
                        <div>
                          <strong className="font-extrabold uppercase text-[10px] block mb-0.5 text-blue-800">Instrucción de Arqueo</strong>
                          Coloque la cantidad de efectivo físico real que tiene actualmente en su cajón. Puede usar la **Calculadora de Billetes** de abajo para mayor comodidad.
                        </div>
                      ) : hasVariance ? (
                        <div>
                          <strong className="font-extrabold uppercase text-[10px] block mb-0.5 text-amber-800">Descuadre Detectado</strong>
                          Se detectó un desfase comercial de <strong className="font-sans font-black underline">${difference.toFixed(2)}</strong>. Recuerde justificarlo en la caja de comentarios inferiores.
                        </div>
                      ) : (
                        <div>
                          <strong className="font-extrabold uppercase text-[10px] block mb-0.5 text-[#3c9e01]">¡Caja Cuadrada Perfectamente!</strong>
                          ¡Excelente! El efectivo reportado coincide exactamente con las proyecciones teóricas del sistema de DuoPOS. Recibirá un bono de XP.
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Counting Box */}
              <div className="bg-gray-100/50 p-4 rounded-2xl border-2 border-gray-200 flex flex-col md:flex-row gap-4 items-end justify-between">
                <div className="space-y-1 flex-1 w-full">
                  <label className="text-[10px] uppercase font-black text-gray-500 block">
                    Sueldo Físico Final Contado ($)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 font-extrabold text-[#58cc02] text-sm leading-none">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      value={manualCountedCash}
                      onChange={(e) => setManualCountedCash(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-7 pr-4 py-2.5 bg-white border-2 border-gray-250 focus:border-[#58cc02] rounded-xl font-bold font-mono text-xs text-gray-750 outline-none outline-none"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => { setIsCalcOpen(!isCalcOpen); playSound('click'); }}
                  className="w-full md:w-auto bg-[#1cb0f6] text-white border-b-4 border-sky-700 hover:bg-sky-400 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer shrink-0"
                >
                  <Calculator size={15} /> Calculadora de Caja {isCalcOpen ? '▲' : '▼'}
                </button>
              </div>

              {/* Dynamic bills & coins calculator inside Close modal */}
              {isCalcOpen && (
                <div className="bg-gray-50 border border-gray-200 p-4 rounded-2xl space-y-3 max-h-[250px] overflow-y-auto animate-fadeIn relative">
                  <div className="flex justify-between items-center pb-2 border-b">
                    <div>
                      <span className="text-[10px] uppercase font-black text-gray-400">Arqueo por Denominaciones</span>
                      <p className="text-[10px] font-black text-indigo-700">Subtotal Contado: ${calcTotalAmount.toFixed(2)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={resetDenominationCalculator}
                      className="text-xs text-red-500 hover:underline hover:text-red-600 font-extrabold tracking-tight"
                    >
                      Borrador 🧹
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {DENOMINATIONS.map((denom) => {
                      const count = calcCounts[denom.value] || 0;
                      return (
                        <div key={denom.value} className="flex items-center justify-between text-xs font-bold text-gray-600 bg-white p-2 rounded-xl border border-gray-200">
                          <span className="font-mono text-gray-700 flex items-center gap-1">
                            <span>{denom.type === 'bill' ? '💵' : '🪙'}</span>
                            <span>{denom.label}</span>
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setCalcCounts(curr => ({ ...curr, [denom.value]: Math.max(0, count - 1) }));
                                playSound('click');
                              }}
                              className="w-5 h-5 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200 border text-gray-600"
                            >
                              -
                            </button>
                            <span className="w-6 text-center font-mono text-gray-800">{count}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setCalcCounts(curr => ({ ...curr, [denom.value]: count + 1 }));
                                playSound('click');
                              }}
                              className="w-5 h-5 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200 border text-gray-600"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={applyCalcToPhysicalCount}
                    className="w-full bg-[#58cc02] text-white border-b-2 border-[#3c9e01] py-2 rounded-xl font-black text-[10px] uppercase tracking-wide hover:bg-[#61e002] transition-colors cursor-pointer mt-2"
                  >
                    Usar Suma del Desglose: ${calcTotalAmount.toFixed(2)} USD / MXN ✅
                  </button>
                </div>
              )}

              {/* Justification Notes */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-black text-gray-500 block">
                  Observaciones Generales de Clausura (Notas del Turno)
                </label>
                <textarea
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  placeholder="Escriba comentarios para contabilidad si hubo diferencias, egresos imprevistos o incidencias..."
                  rows={2}
                  className="w-full p-2.5 bg-white border-2 border-gray-200 focus:border-[#58cc02] rounded-xl font-bold text-xs text-gray-750 outline-none transition-colors"
                />
              </div>

              {/* Submission Button block */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleCloseLocalShift}
                  disabled={!manualCountedCash}
                  className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    manualCountedCash 
                      ? 'bg-[#58cc02] text-white border-b-4 border-[#3c9e01] hover:bg-[#61e002]' 
                      : 'bg-gray-300 text-gray-500 border-none cursor-not-allowed'
                  }`}
                >
                  Confirmar Arqueo & Trabar Caja Registradora 🏁
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* OVERLAY RETROSPECTIVE TICKETS VIEWER */}
      {selectedHistReport && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-3xs flex items-center justify-center p-4">
          <div className="bg-white border-2 border-gray-200 border-b-8 rounded-3xl p-5 md:p-6 max-w-sm w-full space-y-4 animate-scaleUp text-gray-850 shadow-2xl relative">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-base font-black text-gray-800 uppercase flex items-center gap-1 leading-none mt-1">
                🧾 Informe del Turno {selectedHistReport.id.substring(selectedHistReport.id.indexOf('-') + 1)}
              </h3>
              <button 
                onClick={() => setSelectedHistReport(null)}
                className="text-[#9c9c9c] hover:text-gray-500 text-lg font-black p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-gray-600 font-bold leading-normal">
              
              <div className="space-y-2 bg-gray-50 border p-3 rounded-2xl">
                <div className="flex justify-between">
                  <span>Cajero Responsable:</span>
                  <span className="text-gray-800 font-extrabold">{selectedHistReport.employeeName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Apertura General:</span>
                  <span className="font-mono text-[10px] text-gray-700">
                    {new Date(selectedHistReport.openingTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>
                {selectedHistReport.closingTime && (
                  <div className="flex justify-between">
                    <span>Clausura Auditada:</span>
                    <span className="font-mono text-[10px] text-gray-700">
                      {new Date(selectedHistReport.closingTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2 pt-1">
                <span className="text-[10px] font-black uppercase text-gray-400 block tracking-wider">Cuentas Auditadas</span>
                
                <div className="flex justify-between">
                  <span>Fondo Físico Inicial:</span>
                  <span className="font-mono text-gray-800">${selectedHistReport.initialCash.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between font-extrabold text-[#58cc02]">
                  <span>Ventas en Efectivo:</span>
                  <span>+${selectedHistReport.salesVolume.toFixed(2)}</span>
                </div>

                <div className="flex justify-between">
                  <span>Movimientos de Ajuste:</span>
                  {(() => {
                    let moveSum = 0;
                    selectedHistReport.movements.forEach(m => {
                      moveSum += m.type === 'in' ? m.amount : -m.amount;
                    });
                    return (
                      <span className={`font-mono ${moveSum >= 0 ? 'text-[#3c9e01]' : 'text-amber-500'}`}>
                        {moveSum >= 0 ? '+' : '-'}${Math.abs(moveSum).toFixed(2)}
                      </span>
                    );
                  })()}
                </div>

                <div className="border-t border-dashed my-2"></div>

                <div className="flex justify-between font-black text-gray-750">
                  <span>Sueldo Teórico Esperado:</span>
                  <span className="font-mono">${selectedHistReport.expectedCash.toFixed(2)}</span>
                </div>

                <div className="flex justify-between font-black text-indigo-600 bg-indigo-50 p-1.5 rounded border border-indigo-100">
                  <span>Efectivo Real Declarado:</span>
                  <span className="font-mono">${(selectedHistReport.actualCash || 0).toFixed(2)}</span>
                </div>

                <div className="flex justify-between font-black">
                  <span>Descuadre Reportado:</span>
                  <span className={`font-mono underline ${Math.abs(selectedHistReport.difference || 0) > 0.05 ? 'text-red-650 text-red-500' : 'text-emerald-600'}`}>
                    ${selectedHistReport.difference?.toFixed(2)}
                  </span>
                </div>
              </div>

              {selectedHistReport.movements.length > 0 && (
                <div className="space-y-1.5 pt-1.5">
                  <span className="text-[9px] font-black uppercase text-[#9c9c9c] tracking-widest block">Eventos Manuales de Arca ({selectedHistReport.movements.length})</span>
                  <div className="max-h-[105px] overflow-y-auto space-y-1 pr-1">
                    {selectedHistReport.movements.map((m, i) => (
                      <div key={i} className="text-[10px] leading-relaxed bg-gray-50 border p-1.5 rounded-lg flex justify-between">
                        <span className="truncate max-w-[150px]">{m.reason}</span>
                        <span className={`font-mono text-right shrink-0 ${m.type === 'in' ? 'text-[#3c9e01]' : 'text-amber-500'}`}>
                          {m.type === 'in' ? '+' : '-'}${m.amount}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => printShiftReceipt(selectedHistReport, true)}
                className="bg-white border-2 border-gray-200 border-b-4 hover:bg-gray-50 font-black text-[10px] uppercase tracking-wider py-2 rounded-xl cursor-pointer text-gray-600 flex items-center justify-center gap-1.5"
              >
                <Printer size={13} /> Imprimir 🧾
              </button>
              <button
                type="button"
                onClick={() => setSelectedHistReport(null)}
                className="bg-[#1cb0f6] text-white border-b-4 border-sky-700 hover:bg-sky-400 font-black text-[10px] uppercase tracking-wider py-2 rounded-xl cursor-pointer flex items-center justify-center"
              >
                Entendido 🦉
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
