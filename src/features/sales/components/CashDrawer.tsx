/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { User, CashShift } from '../../../types/index';
import { playSound } from '../../../services/audio/soundService';

interface CashDrawerProps {
  user: User;
  activeShift: CashShift | null;
  shiftHistory: CashShift[];
  onOpenShift: (amount: number) => void;
  onCloseShift: (actualCash: number, expectedCash: number, difference: number, notes: string) => void;
  onAddShiftMovement: (type: 'in' | 'out', amount: number, reason: string) => void;
}

export default function CashDrawer({
  user,
  activeShift,
  shiftHistory,
  onOpenShift,
  onCloseShift,
  onAddShiftMovement,
}: CashDrawerProps) {
  // Shift Control Interactivity States
  const [openingCashInput, setOpeningCashInput] = useState('200');
  const [isClosingShiftOpen, setIsClosingShiftOpen] = useState(false);
  const [closingCashCount, setClosingCashCount] = useState('');
  const [closingNotes, setClosingNotes] = useState('');

  const [isMovementOpen, setIsMovementOpen] = useState(false);
  const [movementType, setMovementType] = useState<'in' | 'out'>('in');
  const [movementAmount, setMovementAmount] = useState('');
  const [movementReason, setMovementReason] = useState('');

  const [lastClosedShiftReport, setLastClosedShiftReport] = useState<CashShift | null>(null);

  // Render function for shift Z-audit tickets
  const renderClosedShiftReportModal = () => {
    if (!lastClosedShiftReport) return null;
    const rep = lastClosedShiftReport;

    const diff = rep.difference || 0;
    const isPerfect = Math.abs(diff) < 0.01;
    const isShort = diff < 0;

    const inSum = rep.movements.filter((m) => m.type === 'in').reduce((acc, m) => acc + m.amount, 0);
    const outSum = rep.movements.filter((m) => m.type === 'out').reduce((acc, m) => acc + m.amount, 0);
    const cashSales = Math.max(0, rep.expectedCash - rep.initialCash - inSum + outSum);

    let characterMsg =
      '¡Impecable! Tu racha de precisión brilla. La caja cuadra perfectamente. Lily te da un choca esos cinco. 🙌';
    let charAvatar = 'lily';
    if (isShort) {
      characterMsg =
        '🦉🔎 *Duo te observa fijamente desconfiado...* Falta dinero en el conteo final. ¡Asegúrate de registrar cada centavo!';
      charAvatar = 'duo';
    } else if (diff > 0) {
      characterMsg =
        '✨ ¡Vaya! Sobró cambio en el cajón. Asegúrate de que no le hayas cobrado de más a Zari por distraerte con su moda.';
      charAvatar = 'lily';
    }

    return (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn text-gray-800">
        <div className="bg-white border-2 border-gray-200 border-b-8 rounded-3xl max-w-sm w-full p-6 relative shadow-2xl">
          <button
            type="button"
            onClick={() => {
              setLastClosedShiftReport(null);
              playSound('click');
            }}
            className="absolute right-4 top-4 text-gray-400 hover:text-gray-650 rounded-full hover:bg-gray-100 p-1 bg-gray-50 border cursor-pointer font-black text-xs h-7 w-7 flex items-center justify-center select-none"
          >
            ✕
          </button>

          <div className="space-y-4 font-mono text-xs text-gray-800 bg-[#fbfdf7] border-2 border-[#e5e5e5] p-4 rounded-2xl relative shadow-inner select-none">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-repeat-x bg-[linear-gradient(135deg,#e5e5e5_25%,transparent_25%),linear-gradient(225deg,#e5e5e5_25%,transparent_25%)] bg-[size:8px_8px] -translate-y-[1.5px]" />

            <div className="text-center space-y-1 mt-1">
              <h4 className="text-sm font-black uppercase tracking-wider text-gray-700">🦜 DUOPOS SYSTEM</h4>
              <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest leading-none">
                Corte de Caja / Z-Report
              </p>
              <p className="text-[9px] text-[#949494] font-medium leading-none">
                Turno: #{rep.id.slice(-6).toUpperCase()}
              </p>
            </div>

            <div className="border-t border-dashed border-gray-300 py-2 space-y-1 text-[10px] font-bold text-gray-650">
              <p>
                OPERADOR: <span className="text-gray-800">{rep.employeeName.toUpperCase()}</span>
              </p>
              <p>
                APERTURA:{' '}
                <span>
                  {new Date(rep.openingTime).toLocaleDateString()}{' '}
                  {new Date(rep.openingTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </p>
              {rep.closingTime && (
                <p>
                  CIERRE :{' '}
                  <span>
                    {new Date(rep.closingTime).toLocaleDateString()}{' '}
                    {new Date(rep.closingTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </p>
              )}
            </div>

            <div className="border-t border-dashed border-gray-300 py-2.5 space-y-1 text-xs">
              <div className="flex justify-between font-bold">
                <span>(+) FONDO FIJO</span>
                <span>${rep.initialCash.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-600">
                <span>(+) VENTAS EFECTIVO</span>
                <span>${cashSales.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-500">
                <span>(+) COMPIN / TARJETA</span>
                <span>${Math.max(0, rep.salesVolume - cashSales).toFixed(2)}</span>
              </div>

              {rep.movements && rep.movements.length > 0 && (
                <div className="pt-1.5 space-y-1 border-t border-slate-150 text-[10px] text-gray-500 font-medium">
                  <p className="uppercase tracking-widest text-[#949494] text-[8px] font-black">
                    Ajustes manuales y retiros:
                  </p>
                  {rep.movements.map((m) => (
                    <div key={m.id} className="flex justify-between pl-1">
                      <span className="truncate max-w-[120px] text-slate-405">
                        {m.type === 'in' ? '📈' : '📉'} {m.reason}
                      </span>
                      <span className={m.type === 'in' ? 'text-green-600' : 'text-red-500'}>
                        {m.type === 'in' ? '+' : '-'}${m.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t-2 border-dashed border-gray-300 py-2 text-xs space-y-1.5">
              <div className="flex justify-between font-black text-gray-850">
                <span>EFECTIVO ESPERADO:</span>
                <span>${rep.expectedCash.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-black text-gray-700 font-mono">
                <span>EFECTIVO CLASIF. :</span>
                <span>${rep.actualCash !== undefined ? rep.actualCash.toFixed(2) : '-'}</span>
              </div>

              <div
                className={`flex justify-between font-black border-t-2 border-double border-gray-300 pt-1.5 text-xs ${
                  isPerfect ? 'text-green-650' : 'text-red-650'
                }`}
              >
                <span>DIFERENCIA (Z):</span>
                <span>
                  {diff >= 0 ? '+' : ''}${diff.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="absolute bottom-0 inset-x-0 h-1.5 bg-repeat-x bg-[linear-gradient(315deg,#e5e5e5_25%,transparent_25%),linear-gradient(45deg,#e5e5e5_25%,transparent_25%)] bg-[size:8px_8px] translate-y-[1.5px]" />
          </div>

          <div className="bg-slate-50 border p-3.5 rounded-2xl flex items-start gap-2.5 mt-4 text-xs">
            <span className="text-3xl mt-0.5 select-none">{charAvatar === 'duo' ? '🦉' : '💅'}</span>
            <div className="space-y-0.5 text-left">
              <span className="text-[10px] font-black text-[#58cc02] uppercase tracking-wider block">
                Auditoría DuoPOS
              </span>
              <p className="text-[11px] font-bold text-gray-650 leading-normal">{characterMsg}</p>
            </div>
          </div>

          <div className="mt-5 space-y-2">
            <button
              onClick={() => {
                window.print();
                playSound('click');
              }}
              className="w-full bg-[#1cb0f6] text-white border-b-4 border-[#128bd0] hover:bg-[#34beff] active:translate-y-[2px] active:border-b-2 py-3 rounded-2xl font-black text-xs uppercase text-center cursor-pointer tracking-wider flex items-center justify-center gap-1.5"
            >
              <span>Imprimir Informe 🖨️</span>
            </button>
            <button
              onClick={() => {
                setLastClosedShiftReport(null);
                playSound('click');
              }}
              className="w-full bg-gray-150 hover:bg-gray-200 py-3 rounded-2xl font-black text-xs text-gray-655 uppercase text-center cursor-pointer"
            >
              Cerrar Reporte
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (!activeShift) {
    const handleAddInitialFondo = () => {
      const fund = parseFloat(openingCashInput) || 0;
      onOpenShift(fund);
      playSound('kaching');
    };

    return (
      <div className="max-w-md mx-auto my-12 bg-white border-2 border-gray-200 border-b-8 rounded-3xl p-6 md:p-8 space-y-6 text-center animate-scaleUp text-gray-850">
        <div className="space-y-2">
          <div className="relative inline-block mt-2">
            <span className="text-8xl block select-none drop-shadow-sm leading-none animate-bounce">🔑</span>
            <span className="absolute -top-1 -right-1 text-2xl select-none">🦉</span>
          </div>
          <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight">Apertura de Turno</h2>
          <p className="text-xs text-[#949494] font-bold leading-relaxed px-4">
            ¡Hola, <strong className="text-gray-700">{user.username}</strong>! Para poder facturar y realizar ventas con
            DuoPOS, debes abrir tu turno declarando tu fondo inicial en efectivo.
          </p>
        </div>

        {/* Suggested presets */}
        <div className="space-y-4 bg-gray-50 border-2 border-dashed border-gray-200 p-4 rounded-2xl text-left">
          <span className="text-[9px] uppercase font-black tracking-widest text-gray-400 block">
            Fondo de Caja Recomendado
          </span>
          <div className="grid grid-cols-4 gap-2">
            {['100', '250', '500', '1000'].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => {
                  setOpeningCashInput(val);
                  playSound('click');
                }}
                className={`py-2 rounded-xl text-xs font-black border-2 transition-all cursor-pointer ${
                  openingCashInput === val
                    ? 'bg-[#1cb0f6] border-[#1cb0f6] text-white shadow-xs'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                ${val}
              </button>
            ))}
          </div>

          <div className="space-y-1.5 pt-1">
            <label className="text-[10px] uppercase font-bold text-gray-500 block">Monto del fondo inicial ($)</label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 font-extrabold text-[#58cc02] text-sm leading-none">$</span>
              <input
                type="number"
                value={openingCashInput}
                onChange={(e) => setOpeningCashInput(e.target.value)}
                placeholder="0.00"
                className="w-full pl-7 pr-4 py-2 bg-white border-2 border-gray-200 focus:border-[#58cc02] rounded-xl font-bold font-mono text-xs text-gray-700 outline-none transition-colors"
                min="0"
              />
            </div>
            <p className="text-[9px] text-[#949494] font-medium leading-normal pt-1.5 leading-relaxed">
              * El fondo de caja inicial es la cantidad en efectivo disponible al abrir para facilitar el cambio
              sencillo a los clientes. En POS reales, esto evita descuadres.
            </p>
          </div>
        </div>

        <button
          onClick={handleAddInitialFondo}
          className="w-full bg-[#58cc02] text-white border-b-4 border-[#3c9e01] hover:bg-[#61e002] active:translate-y-[2px] active:border-b-2 py-4 rounded-2xl font-black text-xs uppercase tracking-wider shadow-sm cursor-pointer transition-all flex items-center justify-center gap-1.5"
        >
          <span>Abrir Caja & Iniciar Turno 📂</span>
        </button>

        {/* History of Closed Shifts */}
        {shiftHistory && shiftHistory.length > 0 && (
          <div className="border-t border-gray-200 pt-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-black tracking-wider text-gray-400">
                Historial de Arqueos de Caja
              </span>
              <span className="text-[9px] bg-sky-50 text-sky-600 font-extrabold py-0.5 px-1.5 rounded-md border border-sky-200 uppercase">
                {shiftHistory.length} Cerrados
              </span>
            </div>
            <div className="max-h-[160px] overflow-y-auto space-y-1.5 pr-1 text-left">
              {shiftHistory.map((hist) => (
                <div
                  key={hist.id}
                  className="bg-gray-50 hover:bg-gray-100 border border-gray-200 p-2.5 rounded-xl flex items-center justify-between text-xs font-bold text-gray-600 transition-colors"
                >
                  <div>
                    <span className="bg-emerald-100 text-[#3c9e01] border border-emerald-250 text-[8px] font-black uppercase tracking-wider py-0.5 px-1.5 rounded-md">
                      Arqueo OK
                    </span>
                    <p className="mt-1 text-[10px] text-gray-700 font-black leading-none">
                      {new Date(hist.openingTime).toLocaleDateString()} a las{' '}
                      {new Date(hist.openingTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-[9px] text-[#949494] font-bold mt-0.5 block font-sans">
                      Fondo: ${hist.initialCash.toFixed(2)} • Ventas: ${hist.salesVolume.toFixed(2)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setLastClosedShiftReport(hist);
                      playSound('click');
                    }}
                    className="text-[#1cb0f6] border border-[#1cb0f6]/20 bg-[#1cb0f6]/5 text-[9px] font-black uppercase tracking-wider py-1.5 px-2.5 rounded-lg hover:bg-sky-100 transition-colors cursor-pointer select-none"
                  >
                    Ver Ticket 🧾
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Overlay Closed Shift Report Modal */}
        {lastClosedShiftReport && renderClosedShiftReportModal()}
      </div>
    );
  }

  return (
    <>
      {/* CASH DRAWER PANEL WIDGET */}
      <div className="bg-[#f7f7f7] border-2 border-gray-200 rounded-3xl p-4 flex flex-col md:flex-row gap-4 justify-between items-center shadow-xs">
        <div className="flex items-center gap-3">
          <div className="bg-[#58cc02] text-white p-2.5 rounded-2xl shadow-xs select-none font-black text-lg">💰</div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-black text-gray-400 tracking-wider">Turno de Caja</span>
              <span className="bg-[#d2f09d] text-[#3c9e01] text-[9px] font-black uppercase px-2 py-0.5 tracking-wider rounded-lg border border-[#a6e246]">
                Activo
              </span>
            </div>
            <h4 className="text-sm font-black text-gray-800 uppercase">Operador: {activeShift.employeeName}</h4>
          </div>
        </div>

        {/* Core Live balance tracking */}
        <div className="grid grid-cols-3 gap-3 w-full md:w-auto text-center">
          <div className="bg-white border rounded-2xl py-1.5 px-3 min-w-[95px]">
            <span className="text-[9px] uppercase font-black text-gray-400 block leading-tight">Fondo Fijo</span>
            <span className="text-xs font-mono font-black text-gray-750">${activeShift.initialCash.toFixed(2)}</span>
          </div>
          <div className="bg-white border rounded-2xl py-1.5 px-3 min-w-[95px]">
            <span className="text-[9px] uppercase font-black text-gray-400 block leading-tight">Efectivo Disp</span>
            <span className="text-xs font-mono font-black text-[#58cc02]">${activeShift.expectedCash.toFixed(2)}</span>
          </div>
          <div className="bg-white border rounded-2xl py-1.5 px-3 min-w-[95px]">
            <span className="text-[9px] uppercase font-black text-gray-400 block leading-tight">Total Ventas</span>
            <span className="text-xs font-mono font-black text-gray-750">${activeShift.salesVolume.toFixed(2)}</span>
          </div>
        </div>

        {/* Fast Action Buttons */}
        <div className="flex gap-2 w-full md:w-auto">
          {/* Movimiento de caja button */}
          <button
            type="button"
            onClick={() => {
              setIsMovementOpen(true);
              playSound('click');
            }}
            className="flex-1 md:flex-none py-2 px-3.5 border-2 border-[#e5e5e5] hover:bg-white text-gray-655 bg-gray-50 text-[10px] font-black uppercase tracking-wider rounded-xl active:translate-y-[2px] transition-all cursor-pointer flex items-center justify-center gap-1"
            title="Ingresar o Retirar efectivo auxiliar para control de caja"
          >
            <span>💸 Movimiento</span>
          </button>

          {/* Cierre de caja button */}
          <button
            type="button"
            onClick={() => {
              setClosingCashCount(activeShift.expectedCash.toFixed(2));
              setIsClosingShiftOpen(true);
              playSound('click');
            }}
            className="flex-1 md:flex-none py-2 px-4 bg-red-500 text-white border-b-4 border-red-700 hover:bg-red-400 active:translate-y-[2px] active:border-b-0 text-[10px] font-black uppercase tracking-wider rounded-xl cursor-pointer flex items-center justify-center gap-1"
            title="Realizar arqueo de caja manual, cuadrar caja y cerrar turno"
          >
            <span>🔒 Cerrar Caja</span>
          </button>
        </div>
      </div>

      {/* ARQUEO DE CAJA / CLOSE REG SHIFT MODAL */}
      {isClosingShiftOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn text-gray-800">
          <div className="bg-white border-2 border-gray-200 border-b-8 rounded-3xl max-w-md w-full p-5 sm:p-6 space-y-6 relative shadow-2xl">
            <button
              type="button"
              onClick={() => {
                setIsClosingShiftOpen(false);
                playSound('click');
              }}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-650 rounded-full hover:bg-gray-100 p-1 bg-gray-50 border cursor-pointer font-black text-xs h-7 w-7 flex items-center justify-center select-none"
            >
              ✕
            </button>

            <div className="text-center space-y-1">
              <span className="text-4xl block leading-none select-none">🔒</span>
              <h3 className="text-xl font-black text-gray-855 flex items-center justify-center gap-1.5 uppercase leading-tight mt-2">
                Arqueo e Informe de Cierre
              </h3>
              <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider">
                Cuadrar caja registradora y dar por terminado el turno actual
              </p>
            </div>

            <div className="space-y-4 bg-gray-50 border p-4 rounded-2xl">
              <div className="grid grid-cols-2 gap-3 text-xs font-bold text-gray-600">
                <div>
                  <p className="text-[9px] text-[#949494] uppercase tracking-wider">Fondo de Apertura</p>
                  <p className="text-sm font-black text-gray-800">${activeShift.initialCash.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-[9px] text-[#949494] uppercase tracking-wider">Ventas Acumuladas</p>
                  <p className="text-sm font-black text-gray-800">${activeShift.salesVolume.toFixed(2)}</p>
                </div>
              </div>

              <hr className="border-gray-200" />

              {/* Dynamic breakdown formula */}
              <div className="space-y-1 bg-white p-3 rounded-xl border border-gray-150 text-xs">
                <span className="text-[9px] font-black text-[#949494] uppercase tracking-widest block mb-1">
                  Cálculo Contable Estimado (Z)
                </span>
                <div className="flex justify-between text-gray-500 font-medium">
                  <span>(+) Fondo inicial</span>
                  <span>+${activeShift.initialCash.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-gray-500 font-medium">
                  <span>(+) Entregas en efectivo (Ventas)</span>
                  <span>
                    +$
                    {Math.max(
                      0,
                      Number(
                        (
                          activeShift.expectedCash -
                          activeShift.initialCash -
                          activeShift.movements.filter((m) => m.type === 'in').reduce((acc, m) => acc + m.amount, 0) +
                          activeShift.movements.filter((m) => m.type === 'out').reduce((acc, m) => acc + m.amount, 0)
                        ).toFixed(2),
                      ),
                    ).toFixed(2)}
                  </span>
                </div>

                {activeShift.movements && activeShift.movements.length > 0 && (
                  <div className="space-y-0.5 border-t pt-2 mt-2 font-medium text-[11px]">
                    {activeShift.movements.map((m) => (
                      <div key={m.id} className="flex justify-between text-slate-400">
                        <span>
                          {m.type === 'in' ? '📈 Inyección:' : '📉 Retiro:'} {m.reason}
                        </span>
                        <span className={m.type === 'in' ? 'text-green-600' : 'text-red-500'}>
                          {m.type === 'in' ? '+' : '-'}${m.amount.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-between font-black border-t-2 border-dashed border-gray-200 pt-2 text-gray-800 mt-2 text-xs">
                  <span>EFECTIVO ESPERADO TOTAL:</span>
                  <span>${activeShift.expectedCash.toFixed(2)}</span>
                </div>
              </div>

              {/* User Manual counter input */}
              <div className="space-y-1.5 bg-white p-3.5 rounded-xl border border-gray-155">
                <label className="text-[10px] uppercase font-black text-gray-400 tracking-wider block font-sans">
                  Efectivo Real en Caja ($)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-mono font-black text-lg text-gray-400">$</span>
                  <input
                    type="number"
                    value={closingCashCount}
                    onChange={(e) => setClosingCashCount(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 border-2 border-gray-200 focus:border-[#58cc02] rounded-xl font-black font-mono text-xs text-gray-800 outline-none transition-all"
                    placeholder="Declarar saldo fisico..."
                    min="0"
                    step="any"
                  />
                </div>

                {(() => {
                  const counted = parseFloat(closingCashCount) || 0;
                  const diff = counted - activeShift.expectedCash;
                  const isPerfect = Math.abs(diff) < 0.01;
                  const isShort = diff < 0;

                  return (
                    <div
                      className={`mt-2 p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border leading-tight ${
                        isPerfect
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-250'
                          : isShort
                            ? 'bg-red-50 text-red-750 border-red-200'
                            : 'bg-amber-50 text-amber-700 border-amber-250'
                      }`}
                    >
                      <span className="select-none h-4 w-4">⚖️</span>
                      <div>
                        <p className="font-extrabold text-gray-805">
                          Diferencia: {diff >= 0 ? '+' : ''}${diff.toFixed(2)} (
                          {isPerfect ? 'Perfecto' : isShort ? 'Faltante de Caja' : 'Sobrante de Caja'})
                        </p>
                        <p className="text-[9px] font-medium opacity-80 mt-0.5 leading-normal">
                          {isPerfect
                            ? '¡Perfecto! No hay discrepancia entre el esperado y el saldo físico.'
                            : isShort
                              ? 'El saldo físico reportado es menor al estimado por el sistema.'
                              : 'El saldo reportado físico es mayor que los movimientos registrados.'}
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Observaciones */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-black text-gray-400 block tracking-wider">
                  Observaciones o Comentarios del Arqueo
                </label>
                <textarea
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  placeholder="Ej. Se retiraron centavos de cambio, redondeos o comentarios extra..."
                  className="w-full p-3 border-2 border-gray-200 focus:border-red-500 rounded-xl font-bold text-xs text-gray-750 outline-none transition-colors h-14 resize-none"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const actualVal = parseFloat(closingCashCount) || 0;
                const expectedVal = activeShift.expectedCash;
                const diffVal = actualVal - expectedVal;

                onCloseShift(actualVal, expectedVal, diffVal, closingNotes);

                // Save the closed shift details locally to display the final Ticket Audit view
                const summaryRep: CashShift = {
                  ...activeShift,
                  closingTime: new Date().toISOString(),
                  actualCash: actualVal,
                  difference: diffVal,
                  status: 'closed',
                  expectedCash: expectedVal,
                };
                setLastClosedShiftReport(summaryRep);

                if (Math.abs(diffVal) < 0.1) {
                  playSound('levelup');
                } else {
                  playSound('error');
                }

                setIsClosingShiftOpen(false);
                setClosingCashCount('');
                setClosingNotes('');
              }}
              className="w-full bg-red-500 text-white border-b-4 border-red-700 hover:bg-red-400 active:translate-y-[2px] active:border-b-2 py-4 rounded-2xl font-black text-xs uppercase tracking-wider text-center cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-xs"
            >
              <span>Realizar Cierre de Caja 🔒</span>
            </button>
          </div>
        </div>
      )}

      {/* INGRESO O RETIRO DE EFECTIVO AUXILIAR MODAL */}
      {isMovementOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn text-gray-800">
          <div className="bg-white border-2 border-gray-200 border-b-8 rounded-3xl max-w-sm w-full p-5 sm:p-6 space-y-6 relative shadow-2xl">
            <button
              type="button"
              onClick={() => {
                setIsMovementOpen(false);
                playSound('click');
              }}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-655 rounded-full hover:bg-gray-100 p-1 bg-gray-50 border cursor-pointer font-black text-xs h-7 w-7 flex items-center justify-center select-none"
            >
              ✕
            </button>

            <div className="text-center space-y-1">
              <span className="text-4xl block leading-none select-none">💸</span>
              <h3 className="text-xl font-black text-gray-855 flex items-center justify-center gap-1.5 uppercase mt-2 leading-tight">
                Movimiento de Efectivo
              </h3>
              <p className="text-[10px] text-[#949494] font-black uppercase tracking-wider">
                Inyectar cambio o retirar efectivo para pagos auxiliares
              </p>
            </div>

            <div className="space-y-4 bg-gray-50 border p-4 rounded-xl text-xs">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-black text-gray-400 block tracking-wider">
                  Tipo de Flujo de Caja
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMovementType('in');
                      playSound('click');
                    }}
                    className={`py-2 rounded-xl text-xs font-black border-2 text-center cursor-pointer select-none transition-all ${
                      movementType === 'in'
                        ? 'bg-green-500 border-green-500 text-white shadow-xs'
                        : 'bg-white border-gray-200 text-gray-600'
                    }`}
                  >
                    📈 Entrada (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMovementType('out');
                      playSound('click');
                    }}
                    className={`py-2 rounded-xl text-xs font-black border-2 text-center cursor-pointer select-none transition-all ${
                      movementType === 'out'
                        ? 'bg-red-500 border-red-500 text-white shadow-xs'
                        : 'bg-white border-gray-200 text-gray-600'
                    }`}
                  >
                    📉 Salida (-)
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                <label className="text-[10px] uppercase font-black text-gray-400 block tracking-wider font-sans">
                  Monto del Movimiento ($)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 font-bold text-gray-405 text-sm leading-none">$</span>
                  <input
                    type="number"
                    value={movementAmount}
                    onChange={(e) => setMovementAmount(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 border-2 border-gray-200 focus:border-[#58cc02] rounded-xl font-black font-mono text-xs text-gray-700 outline-none transition-colors"
                    placeholder="0.00"
                    min="0"
                    step="any"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-black text-gray-400 block tracking-wider">
                  Motivo o Concepto
                </label>
                <input
                  type="text"
                  value={movementReason}
                  onChange={(e) => setMovementReason(e.target.value)}
                  className="w-full px-3.5 py-2 border-2 border-gray-200 focus:border-[#58cc02] rounded-xl font-bold text-xs text-gray-700 outline-none transition-colors"
                  placeholder="Ej: Sencillo para dar cambio, Pago de refrescos..."
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const amt = parseFloat(movementAmount) || 0;
                if (amt <= 0) {
                  playSound('error');
                  alert('Ingresa un monto mayor a cero.');
                  return;
                }
                if (movementType === 'out' && amt > activeShift.expectedCash) {
                  playSound('error');
                  alert(
                    `Fondos insuficientes. No puedes retirar más del efectivo disponible ($${activeShift.expectedCash.toFixed(2)})`,
                  );
                  return;
                }
                onAddShiftMovement(movementType, amt, movementReason);
                playSound('success');
                setIsMovementOpen(false);
                setMovementAmount('');
                setMovementReason('');
              }}
              className="w-full bg-[#58cc02] text-white border-b-4 border-[#3c9e01] hover:bg-[#61e002] active:translate-y-[2px] active:border-b-2 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider text-center cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-xs"
            >
              <span>Registrar Movimiento ⚡</span>
            </button>
          </div>
        </div>
      )}

      {/* Closed Shift Report modal if any closed report is active */}
      {lastClosedShiftReport && renderClosedShiftReportModal()}
    </>
  );
}
