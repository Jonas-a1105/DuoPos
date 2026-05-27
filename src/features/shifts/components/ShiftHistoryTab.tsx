import React, { useMemo } from 'react';
import { CashShift } from '../../../types';
import { playSound } from '../../../services/sounds';

interface ShiftHistoryTabProps {
  shiftHistory: CashShift[];
  onOpenReport: (shift: CashShift) => void;
}

export default function ShiftHistoryTab({
  shiftHistory,
  onOpenReport
}: ShiftHistoryTabProps) {
  // Render comparative analytics dashboard
  const shiftStatsAnalysis = useMemo(() => {
    if (shiftHistory.length === 0) return null;

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

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* C. COMPARATIVE POS METRICS */}
      {shiftStatsAnalysis && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-left">
          
          <div className="bg-white border-2 border-gray-200 border-b-[6px] rounded-3xl p-5 flex flex-col justify-between h-32">
            <span className="text-[10px] uppercase font-black tracking-wider text-gray-400">Total Turnos Auditados</span>
            <div>
              <span className="text-2xl font-black text-teal-650 font-mono">{shiftHistory.length}</span>
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
              <span className="text-2xl font-black text-amber-505 font-mono">
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
      <div className="bg-white border-2 border-gray-200 border-b-[6px] rounded-3xl p-5 md:p-6 space-y-4 text-left">
        <div className="border-b pb-3 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-black text-gray-800 uppercase">
              🏆 Registro Histórico de Turnos y Auditorías
            </h3>
            <p className="text-xs text-gray-450 font-bold mt-0.5">Control vinculante del flujo de efectivo recaudado históricamente</p>
          </div>
          <span className="text-xs bg-gray-150 border border-gray-205 font-black px-2.5 py-1 rounded-full uppercase text-gray-600">
            Resguardo Local
          </span>
        </div>

        {shiftHistory.length === 0 ? (
          <div className="py-16 text-center text-gray-400 space-y-3">
            <span className="text-6xl block leading-none">📊</span>
            <p className="text-sm font-black uppercase text-gray-500">No hay turnos cerrados registrados para auditar</p>
            <p className="text-xs text-gray-400 max-w-sm mx-auto font-medium leading-relaxed">
              Una vez que abras tu primer turno de caja y realices el posterior cierre y arqueo de caja, los informes de auditoría aparecerán protegidos aquí.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-bold text-gray-605">
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
              <tbody className="divide-y divide-gray-100 font-sans">
                {shiftHistory.map((hist) => {
                  const isDescuadre = Math.abs(hist.difference || 0) > 0.05;
                  return (
                    <tr key={hist.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3">
                        <div className="flex items-center gap-1">
                          <span className="text-gray-750 font-black leading-none">{hist.employeeName}</span>
                          {isDescuadre ? (
                            <span className="bg-amber-100 text-amber-705 px-1 py-0.5 text-[8px] rounded uppercase font-black border border-amber-200">
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
                            onClick={() => { onOpenReport(hist); playSound('click'); }}
                            className="border border-[#1cb0f6] bg-[#1cb0f6]/5 text-[#1cb0f6] text-[9px] font-black py-1.5 px-2.5 rounded-lg hover:bg-sky-100 transition-colors cursor-pointer uppercase tracking-tight shadow-3xs"
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
  );
}
