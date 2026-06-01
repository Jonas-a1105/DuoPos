import React, { useState, useMemo, useEffect } from 'react';
import { playSound } from '../../../services/audio/soundService';
import { toast } from '../../../shared/ui/FlashNotifications/FlashNotifications';
import { Calculator } from 'lucide-react';
import { User } from '../../../types';

interface ShiftCloseModalProps {
  isOpen: boolean;
  onClose: () => void;
  computedExpectedCash: number;
  onCloseShift: (actualCash: number, expectedCash: number, difference: number, notes: string) => void;
  user: User;
}

interface Denomination {
  value: number;
  label: string;
  type: 'bill' | 'coin';
}

const DENOMINATIONS: Denomination[] = [
  { value: 1000, label: '$1,000 USD / VES', type: 'bill' },
  { value: 500, label: '$500 USD / VES', type: 'bill' },
  { value: 200, label: '$200 USD / VES', type: 'bill' },
  { value: 100, label: '$100 USD / VES', type: 'bill' },
  { value: 50, label: '$50 USD / VES', type: 'bill' },
  { value: 20, label: '$20 USD / VES', type: 'bill' },
  { value: 10, label: '$10 USD / VES', type: 'coin' },
  { value: 5, label: '$5 USD / VES', type: 'coin' },
  { value: 2, label: '$2 USD / VES', type: 'coin' },
  { value: 1, label: '$1 USD / VES', type: 'coin' },
  { value: 0.5, label: '$0.50 centavos', type: 'coin' },
];

export default function ShiftCloseModal({
  isOpen,
  onClose,
  computedExpectedCash,
  onCloseShift,
  user,
}: ShiftCloseModalProps) {
  const [closeNotes, setCloseNotes] = useState('');
  const [manualCountedCash, setManualCountedCash] = useState('');
  const [isCalcOpen, setIsCalcOpen] = useState(false);
  const [calcCounts, setCalcCounts] = useState<Record<number, number>>({
    1000: 0,
    500: 0,
    200: 0,
    100: 0,
    50: 0,
    20: 0,
    10: 0,
    5: 0,
    2: 0,
    1: 0,
    0.5: 0,
  });

  useEffect(() => {
    if (isOpen) {
      setCloseNotes('');
      setManualCountedCash('');
      setIsCalcOpen(false);
      setCalcCounts({
        1000: 0,
        500: 0,
        200: 0,
        100: 0,
        50: 0,
        20: 0,
        10: 0,
        5: 0,
        2: 0,
        1: 0,
        0.5: 0,
      });
    }
  }, [isOpen]);

  // Denominations sum calculator helper
  const calcTotalAmount = useMemo(() => {
    let total = 0;
    Object.entries(calcCounts).forEach(([val, count]) => {
      total += Number(val) * Number(count);
    });
    return Number(total.toFixed(2));
  }, [calcCounts]);

  if (!isOpen) return null;

  // Apply visual count to physical count input
  const applyCalcToPhysicalCount = () => {
    setManualCountedCash(calcTotalAmount.toString());
    setIsCalcOpen(false);
    playSound('success');
  };

  const resetDenominationCalculator = () => {
    const fresh: Record<number, number> = {
      1000: 0,
      500: 0,
      200: 0,
      100: 0,
      50: 0,
      20: 0,
      10: 0,
      5: 0,
      2: 0,
      1: 0,
      0.5: 0,
    };
    setCalcCounts(fresh);
    playSound('swoosh');
  };

  // Close shift action
  const handleCloseLocalShift = () => {
    const actual = parseFloat(manualCountedCash);
    if (isNaN(actual) || actual < 0) {
      toast.error('⚠️ Por favor, ingresa un monto físico contado de caja válido.');
      return;
    }

    const difference = Number((actual - computedExpectedCash).toFixed(2));
    onCloseShift(actual, computedExpectedCash, difference, closeNotes);
    onClose();
  };

  const counted = parseFloat(manualCountedCash) || 0;
  const difference = Number((counted - computedExpectedCash).toFixed(2));
  const hasVariance = Math.abs(difference) > 0.05;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-3xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border-2 border-gray-250 border-b-8 rounded-3xl p-5 md:p-6 max-w-lg w-full space-y-4 animate-scaleUp my-8 text-gray-855 shadow-2xl relative">
        <div className="flex justify-between items-center border-b pb-2">
          <div className="text-left">
            <h3 className="text-base font-black text-gray-800 uppercase tracking-tight flex items-center gap-1">
              🔒 Cierre de Turno y Declaración Contada
            </h3>
            <span className="text-[10px] font-bold text-gray-400 block font-mono">
              Se espera: ${computedExpectedCash.toFixed(2)} USD / VES en efectivo.
            </span>
          </div>
          <button
            onClick={() => {
              onClose();
              playSound('click');
            }}
            className="text-[#9c9c9c] hover:text-gray-500 text-lg font-black p-1 cursor-pointer font-sans"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {/* Dynamic Warning of variance */}
          <div
            className={`p-3 rounded-2xl border text-xs flex gap-2.5 items-start text-left ${
              !manualCountedCash
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : hasVariance
                  ? 'bg-amber-50 border-amber-250 text-amber-850'
                  : 'bg-emerald-50 border-emerald-250 text-[#3c9e01]'
            }`}
          >
            <div className="text-xl">{!manualCountedCash ? 'ℹ️' : hasVariance ? '⚠️' : '✅'}</div>
            <div>
              {!manualCountedCash ? (
                <div>
                  <strong className="font-extrabold uppercase text-[10px] block mb-0.5 text-blue-800">
                    Instrucción de Arqueo
                  </strong>
                  Coloque la cantidad de efectivo físico real que tiene actualmente en su cajón. Puede usar la
                  **Calculadora de Billetes** de abajo para mayor comodidad.
                </div>
              ) : hasVariance ? (
                <div>
                  <strong className="font-extrabold uppercase text-[10px] block mb-0.5 text-amber-800">
                    Descuadre Detectado
                  </strong>
                  Se detectó un descuadre comercial de{' '}
                  <strong className="font-sans font-black underline">${difference.toFixed(2)}</strong>. Recuerde
                  justificarlo en la caja de comentarios inferiores.
                </div>
              ) : (
                <div>
                  <strong className="font-extrabold uppercase text-[10px] block mb-0.5 text-[#3c9e01]">
                    ¡Caja Cuadrada Perfectamente!
                  </strong>
                  ¡Excelente! El efectivo reportado coincide exactamente con las proyecciones teóricas del sistema de
                  StockMaster Pro.
                </div>
              )}
            </div>
          </div>

          {/* Counting Box */}
          <div className="bg-gray-100/50 p-4 rounded-2xl border-2 border-gray-205 flex flex-col md:flex-row gap-4 items-end justify-between">
            <div className="space-y-1 flex-1 w-full text-left">
              <label className="text-[10px] uppercase font-black text-gray-500 block">
                Sueldo Físico Final Contado ($)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 font-extrabold text-[#58cc02] text-sm leading-none">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={manualCountedCash}
                  onChange={(e) => setManualCountedCash(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-7 pr-4 py-2.5 bg-white border-2 border-gray-250 focus:border-[#58cc02] rounded-xl font-bold font-mono text-xs text-gray-750 outline-none"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsCalcOpen(!isCalcOpen);
                playSound('click');
              }}
              className="w-full md:w-auto bg-[#1cb0f6] text-white border-b-4 border-sky-700 hover:bg-sky-400 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer shrink-0"
            >
              <Calculator size={15} /> Calculadora de Caja {isCalcOpen ? '▲' : '▼'}
            </button>
          </div>

          {/* Dynamic bills & coins calculator */}
          {isCalcOpen && (
            <div className="bg-gray-50 border border-gray-200 p-4 rounded-2xl space-y-3 max-h-[250px] overflow-y-auto animate-fadeIn relative text-left">
              <div className="flex justify-between items-center pb-2 border-b">
                <div>
                  <span className="text-[10px] uppercase font-black text-gray-405">Arqueo por Denominaciones</span>
                  <p className="text-[10px] font-black text-indigo-700">
                    Subtotal Contado: ${calcTotalAmount.toFixed(2)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={resetDenominationCalculator}
                  className="text-xs text-red-500 hover:underline hover:text-red-650 font-extrabold tracking-tight"
                >
                  Borrador 🧹
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {DENOMINATIONS.map((denom) => {
                  const count = calcCounts[denom.value] || 0;
                  return (
                    <div
                      key={denom.value}
                      className="flex items-center justify-between text-xs font-bold text-gray-650 bg-white p-2 rounded-xl border border-gray-200"
                    >
                      <span className="font-mono text-gray-700 flex items-center gap-1">
                        <span>{denom.type === 'bill' ? '💵' : '🪙'}</span>
                        <span>{denom.label}</span>
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setCalcCounts((curr) => ({ ...curr, [denom.value]: Math.max(0, count - 1) }));
                            playSound('click');
                          }}
                          className="w-5 h-5 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200 border text-gray-600 cursor-pointer"
                        >
                          -
                        </button>
                        <span className="w-6 text-center font-mono text-gray-800">{count}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setCalcCounts((curr) => ({ ...curr, [denom.value]: count + 1 }));
                            playSound('click');
                          }}
                          className="w-5 h-5 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200 border text-gray-600 cursor-pointer"
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
                Usar Suma del Desglose: ${calcTotalAmount.toFixed(2)} USD / VES ✅
              </button>
            </div>
          )}

          {/* Justification Notes */}
          <div className="space-y-1.5 text-left">
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

          {/* Solver suggestions */}
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl flex gap-3 text-xs text-slate-705 text-left items-center">
            <div className="shrink-0 bg-slate-100 p-1.5 rounded-xl text-lg select-none">
              💡
            </div>
            <p className="font-extrabold leading-normal">
              <strong>Consejo de Cuadre:</strong> Recuerda contar billetes y monedas por separado. Un arqueo impecable y ordenado asegura la transparencia contable y facilita las auditorías de administración.
            </p>
          </div>

          {/* Submission Button */}
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
  );
}
