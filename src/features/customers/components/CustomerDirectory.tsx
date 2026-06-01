import React, { useState } from 'react';
import { Customer, LeagueType } from '../../../types';
import {
  Search,
  Phone,
  Mail,
  Download,
  UserPlus,
  Edit2,
  FileText,
  Wallet,
  Trash2,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';
import { playSound } from '../../../services/audio/soundService';
import { exportCustomersToExcel } from '../../../services/files/excelExportService';
import { parseCustomersExcel, downloadCustomersTemplate } from '../../../services/files/csvParserService';
import { LEAGUE_METADATA } from '../CustomersScreen';

interface CustomerDirectoryProps {
  customers: Customer[];
  filteredCustomers: Customer[];
  search: string;
  setSearch: (val: string) => void;
  selectedLeague: string;
  setSelectedLeague: (val: string) => void;
  subTab: 'directory' | 'pending' | 'loyalty' | 'crm';
  onOpenNewForm: () => void;
  onOpenEditForm: (cust: Customer) => void;
  onOpenLedger: (cust: Customer) => void;
  onOpenPayment: (cust: Customer) => void;
  onDeleteCustomer: (id: string) => void;
  onUpdateCustomer: (cust: Customer) => void;
  onAddCustomer: (customer: any) => void;
  onGrantXp?: (amount: number) => void;
}

export default function CustomerDirectory({
  customers,
  filteredCustomers,
  search,
  setSearch,
  selectedLeague,
  setSelectedLeague,
  subTab,
  onOpenNewForm,
  onOpenEditForm,
  onOpenLedger,
  onOpenPayment,
  onDeleteCustomer,
  onUpdateCustomer,
  onAddCustomer,
  onGrantXp,
}: CustomerDirectoryProps) {
  // Manual Gems tuning states
  const [manualGemsAdjustOpen, setManualGemsAdjustOpen] = useState<string | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustType, setAdjustType] = useState<'add' | 'deduct'>('add');

  // Import States
  const [importResult, setImportResult] = useState<any | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    playSound('click');

    try {
      const res = await parseCustomersExcel(file);
      if (res.success && res.imported.length > 0) {
        // Add each imported customer to store
        res.imported.forEach((cust) => {
          onAddCustomer({
            name: cust.name,
            phone: cust.phone,
            email: cust.email,
            gems: cust.gems,
            fiscalName: cust.fiscalName,
            taxId: cust.taxId,
            regime: cust.regime,
            postalCode: cust.postalCode,
            creditLimit: cust.creditLimit,
          });
        });

        // Grant XP
        if (onGrantXp) {
          onGrantXp(Math.min(100, res.imported.length * 5));
        }
        playSound('levelup');
      } else if (res.errors.length > 0) {
        playSound('error');
      }

      setImportResult(res);
      setShowResultModal(true);
    } catch (err) {
      console.error(err);
      playSound('error');
      setImportResult({
        success: false,
        imported: [],
        failedCount: 1,
        errors: ['Ocurrió un error inesperado al procesar la importación: ' + String(err)],
      });
      setShowResultModal(true);
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };

  const handleAdjustGems = (cust: Customer) => {
    const amount = parseInt(adjustAmount) || 0;
    if (amount <= 0) return;

    let updatedGems = cust.gems;
    if (adjustType === 'add') {
      updatedGems += amount;
      playSound('success');
    } else {
      updatedGems = Math.max(0, updatedGems - amount);
      playSound('click');
    }

    const updated: Customer = {
      ...cust,
      gems: updatedGems,
    };
    onUpdateCustomer(updated);
    setManualGemsAdjustOpen(null);
    setAdjustAmount('');
  };

  return (
    <>
      {/* SEARCH AND QUICK REGISTER ACTIONS BAR */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Search bar */}
        <div className="relative w-full md:max-w-md">
          <span className="absolute left-3.5 top-2.5 text-gray-450">
            <Search size={18} strokeWidth={2.5} />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por Nombre, Teléfono o Email..."
            className="w-full pl-10 pr-4 py-2 bg-white border-2 border-gray-200 focus:border-[#1cb0f6] rounded-2xl font-bold text-xs outline-none transition-colors border-b-4"
          />
        </div>

        {/* League Selector filter & Add Button */}
        <div className="flex w-full md:w-auto items-center gap-2 shrink-0">
          <select
            value={selectedLeague}
            onChange={(e) => {
              setSelectedLeague(e.target.value);
              playSound('click');
            }}
            className="bg-white border-2 border-gray-200 border-b-4 rounded-xl px-3.5 py-1.5 font-bold text-xs outline-none focus:border-[#1cb0f6] text-gray-700 max-w-xs cursor-pointer select-none"
          >
            <option value="all">Todas las Categorías 🏆</option>
            <option value="Bronce">🥉 Nivel Bronce</option>
            <option value="Plata">🥈 Nivel Plata</option>
            <option value="Oro">🥇 Nivel Oro</option>
            <option value="Zafiro">🔹 Nivel Zafiro</option>
            <option value="Rubí">❤️ Nivel Rubí</option>
            <option value="Esmeralda">🟢 Nivel Esmeralda</option>
            <option value="Obsidiana">💎 Nivel VIP</option>
          </select>

          <button
            onClick={onOpenNewForm}
            className="flex-1 md:flex-none py-2 px-4 bg-[#58cc02] text-white border-b-4 border-[#3c9e01] hover:bg-[#61e002] active:translate-y-[2px] active:border-b-2 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <UserPlus size={15} strokeWidth={3} />
            <span>Nuevo Cliente 👥</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playSound('click');
              downloadCustomersTemplate();
            }}
            className="py-2 px-3 bg-white text-[#1cb0f6] border-2 border-[#1cb0f6] border-b-4 hover:bg-sky-50 active:translate-y-[2px] active:border-b-2 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1"
            title="Descargar Plantilla Excel Estructurada"
          >
            📄 Plantilla
          </button>
          <label
            htmlFor="customer-import-input"
            className="py-2 px-3 bg-white text-[#58cc02] border-2 border-[#58cc02] border-b-4 hover:bg-green-50 active:translate-y-[2px] active:border-b-2 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1"
          >
            📥 {isImporting ? 'Cargando...' : 'Importar'}
          </label>
          <input
            type="file"
            id="customer-import-input"
            className="hidden"
            accept=".xlsx, .xls, .csv"
            onChange={handleImportFile}
            disabled={isImporting}
          />
          <button
            type="button"
            onClick={() => {
              playSound('click');
              exportCustomersToExcel(filteredCustomers);
            }}
            className="py-2 px-3 bg-[#58cc02] text-white border-b-4 border-[#3c9e01] hover:bg-[#61e002] active:translate-y-[2px] active:border-b-2 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1"
          >
            <Download size={14} />
            <span className="hidden md:inline">Exportar</span>
          </button>
        </div>
      </div>

      {/* DATA CARDS WRAPPER GRID */}
      {filteredCustomers.length === 0 ? (
        <div className="bg-white border-2 border-gray-200 border-b-4 rounded-3xl p-10 text-center space-y-3.5 max-w-md mx-auto">
          <span className="text-6xl block select-none">🔎</span>
          <h3 className="font-extrabold text-sm uppercase text-gray-700 tracking-tight">No se encontraron clientes</h3>
          <p className="text-xs text-gray-400 leading-relaxed font-bold">
            Intenta cambiar el criterio de búsqueda, el filtro de liga o crea un nuevo cliente.
          </p>
          <button
            onClick={onOpenNewForm}
            className="mt-2 py-2 px-4 bg-[#1cb0f6] text-white border-b-4 border-[#128bd0] hover:bg-[#34beff] active:translate-y-[2px] rounded-xl font-black text-xs uppercase"
          >
            Registrar Cliente Frecuente 👥
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map((cust) => {
            const meta = LEAGUE_METADATA[cust.league] || LEAGUE_METADATA.Bronce;

            // Credit limit stats calculation
            const limit = cust.creditLimit || 0;
            const debt = cust.creditUsed || 0;
            const creditAvailable = Math.max(0, limit - debt);

            // Calculate progress of credit used
            const creditUsedPct = limit > 0 ? Math.min(100, Math.round((debt / limit) * 100)) : 0;

            // Color states based on credit percentage used
            let progressBgColor = 'bg-[#58cc02]'; // Safe Green
            let progressBorderColor = 'border-green-100';
            if (creditUsedPct >= 80) {
              progressBgColor = 'bg-[#ff4b4b] animate-pulse'; // Danger Red close to limit
              progressBorderColor = 'border-red-100';
            } else if (creditUsedPct >= 50) {
              progressBgColor = 'bg-amber-400'; // Warning Yellow
              progressBorderColor = 'border-amber-100';
            }

            return (
              <div
                key={cust.id}
                className={`bg-white border-2 border-b-6 rounded-3xl p-5 hover:border-gray-300 transition-all space-y-4 relative flex flex-col justify-between ${
                  debt > 0 ? 'border-red-300 hover:border-red-400' : 'border-gray-200'
                }`}
              >
                {/* Header block details with League Badge */}
                <div className="space-y-2">
                  <div className="flex justify-between items-start gap-1">
                    <h3 className="text-base font-black text-gray-855 truncate max-w-[150px]" title={cust.name}>
                      {cust.name}
                    </h3>

                    {/* Badge */}
                    <div
                      className={`${meta.bg} ${meta.border} ${meta.text} border text-[9px] font-black uppercase px-2 py-0.5 rounded-lg flex items-center gap-1 select-none cursor-pointer`}
                      onClick={() => {
                        setManualGemsAdjustOpen(cust.id);
                        playSound('click');
                      }}
                      title="Ajuste manual de puntos de fidelidad"
                    >
                      <span>{meta.emoji}</span>
                      <span>{meta.name}</span>
                    </div>
                  </div>

                  {/* Contact records */}
                  <div className="space-y-1 text-xs text-gray-500 font-bold font-sans">
                    {cust.phone && (
                      <p className="flex items-center gap-1.5">
                        <Phone size={11} className="text-gray-400" />
                        <span>{cust.phone}</span>
                      </p>
                    )}
                    {cust.email ? (
                      <p className="flex items-center gap-1.5 truncate">
                        <Mail size={11} className="text-gray-400" />
                        <span className="truncate">{cust.email}</span>
                      </p>
                    ) : (
                      <p className="text-[10px] text-gray-300 font-medium italic">Sin correo registrado</p>
                    )}
                  </div>
                </div>

                {/* LINEA DE CREDITO ("FIADO") DETAILS */}
                <div className="bg-gray-50 border p-3 rounded-2xl space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-black">
                    <span className="text-gray-400 uppercase tracking-widest flex items-center gap-0.5">
                      <span>📝</span> Línea de Crédito ("Fiado")
                    </span>
                    {limit > 0 ? (
                      <span className="font-mono text-gray-500 font-bold">Cupo: ${limit.toFixed(0)}</span>
                    ) : (
                      <span className="text-gray-400 uppercase font-black tracking-wide text-[9px]">Sin Autorizar</span>
                    )}
                  </div>

                  {limit > 0 ? (
                    <div className="space-y-1.5">
                      {/* Debt balances */}
                      <div className="flex justify-between text-xs font-black">
                        <div className="flex flex-col text-left">
                          <span className="text-[8px] text-gray-400 uppercase leading-none">Deuda Activa</span>
                          <span className={`text-sm font-mono mt-0.5 ${debt > 0 ? 'text-red-500' : 'text-gray-500'}`}>
                            ${debt.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-[8px] text-gray-400 uppercase leading-none">Cupo Disponible</span>
                          <span className="text-sm font-mono text-[#58cc02] mt-0.5">${creditAvailable.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Debt Progression loading bar */}
                      <div className="w-full h-3.5 bg-gray-200 rounded-full overflow-hidden border p-0.5">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${progressBgColor}`}
                          style={{ width: `${creditUsedPct}%` }}
                        />
                      </div>

                      <div className="flex justify-between items-center text-[8px] text-gray-400 uppercase font-extrabold leading-none">
                        <span>Porcentaje de cupo usado:</span>
                        <span className={debt > 0 ? 'text-red-500 font-black' : 'text-gray-400'}>{creditUsedPct}%</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-1 bg-white border border-[#e5e5e5] rounded-xl">
                      <p className="text-[10px] text-gray-400 font-bold leading-normal">
                        No tiene permitido comprar a crédito.
                      </p>
                      <button
                        onClick={() => onOpenEditForm(cust)}
                        className="text-[9px] text-[#1cb0f6] font-black uppercase mt-0.5 hover:underline cursor-pointer"
                      >
                        Autorizar Crédito ⚡
                      </button>
                    </div>
                  )}
                </div>

                {/* Loyalty accumulation summaries */}
                <div className="flex items-center justify-between border-t border-dashed border-gray-150 pt-3 text-xs">
                  <div className="flex items-center gap-1.5 select-none shrink-0 font-bold">
                    <span className="text-lg">💎</span>
                    <div className="text-left">
                      <span className="text-[8px] uppercase font-black text-gray-400 block leading-tight">
                        Puntos Loyalty
                      </span>
                      <span className="text-xs font-black text-[#58cc02] font-mono leading-none">
                        {cust.gems} <span className="text-[9px] text-gray-400">Pts</span>
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[8px] uppercase font-black text-gray-400 block leading-none">
                      Compras Registradas
                    </span>
                    <span className="text-xs font-black text-gray-500 font-mono inline-block">
                      {cust.purchasesCount} ventas
                    </span>
                  </div>
                </div>

                {/* Operations buttons */}
                <div className="grid grid-cols-4 gap-1 pt-1 border-t border-gray-100 bg-[#fafafa] -mx-5 -mb-5 p-3 rounded-b-3xl">
                  {/* Edit profile info */}
                  <button
                    onClick={() => onOpenEditForm(cust)}
                    className="py-1.5 px-0.5 bg-white border border-gray-200 hover:bg-gray-55 rounded-xl font-bold text-[9px] flex items-center justify-center gap-0.5 text-gray-650 cursor-pointer shadow-2xs border-b-4 hover:border-b-2 active:translate-y-[2px]"
                    title="Editar Cliente"
                  >
                    <Edit2 size={9} />
                    <span>Editar</span>
                  </button>

                  {/* Estado de Cuenta */}
                  <button
                    onClick={() => {
                      onOpenLedger(cust);
                      playSound('click');
                    }}
                    className="py-1.5 px-0.5 bg-white border border-gray-200 hover:bg-gray-55 rounded-xl font-bold text-[9px] flex items-center justify-center gap-0.5 text-[#1cb0f6] cursor-pointer shadow-2xs border-b-4 hover:border-b-2 active:translate-y-[2px]"
                    title="Ver Historial / Estado de Cuenta"
                  >
                    <FileText size={9} />
                    <span>Historial</span>
                  </button>

                  {/* Abono de Deuda */}
                  <button
                    onClick={() => {
                      onOpenPayment(cust);
                      playSound('click');
                    }}
                    disabled={!cust.creditUsed || cust.creditUsed <= 0}
                    className={`py-1.5 px-0.5 rounded-xl font-bold text-[9px] flex items-center justify-center gap-0.5 cursor-pointer shadow-2xs border-b-4 hover:border-b-2 active:translate-y-[2px] transition-all ${
                      cust.creditUsed && cust.creditUsed > 0
                        ? 'bg-[#58cc02] border-[#46a302] hover:bg-[#61e002] text-white'
                        : 'bg-gray-100 border-gray-200 text-gray-300 opacity-50 cursor-not-allowed border-b-2'
                    }`}
                    title="Registrar Abono / Pago"
                  >
                    <Wallet size={9} />
                    <span>Abonar</span>
                  </button>

                  {/* Delete Customer */}
                  <button
                    onClick={() => {
                      if (
                        confirm(
                          `¿Estás seguro de que deseas eliminar a ${cust.name}? El historial cargado persistirá.`,
                        )
                      ) {
                        onDeleteCustomer(cust.id);
                        playSound('error');
                      }
                    }}
                    className="py-1.5 px-0.5 bg-white border border-gray-200 hover:border-red-100 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-xl font-bold text-[9px] flex items-center justify-center gap-0.5 cursor-pointer shadow-2xs border-b-4 hover:border-b-2 active:translate-y-[2px]"
                  >
                    <Trash2 size={9} />
                    <span>Eliminar</span>
                  </button>
                </div>

                {/* Sub Adjustment quick Gems tool */}
                {manualGemsAdjustOpen === cust.id && (
                  <div className="absolute inset-0 z-10 bg-white/95 backdrop-blur-xs rounded-3xl p-4 flex flex-col justify-center space-y-3">
                    <span className="text-[10px] uppercase font-black text-gray-400 block tracking-wider text-center">
                      Ajustar Puntos Manuales - {cust.name}
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setAdjustType('add');
                          playSound('click');
                        }}
                        className={`py-1 rounded-xl text-xs font-black border text-center cursor-pointer ${
                          adjustType === 'add' ? 'bg-[#58cc02] border-[#58cc02] text-white' : 'bg-white text-gray-700'
                        }`}
                      >
                        📈 Sumar (+)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAdjustType('deduct');
                          playSound('click');
                        }}
                        className={`py-1 rounded-xl text-xs font-black border text-center cursor-pointer ${
                          adjustType === 'deduct' ? 'bg-red-50 border-red-500 text-white' : 'bg-white text-gray-700'
                        }`}
                      >
                        📉 Restar (-)
                      </button>
                    </div>

                    <div className="relative">
                      <span className="absolute left-3 top-1.5 font-mono font-black text-[#58cc02] text-xs">Pts</span>
                      <input
                        type="number"
                        value={adjustAmount}
                        onChange={(e) => setAdjustAmount(e.target.value)}
                        placeholder="Cantidad..."
                        className="w-full pl-7 pr-3 py-1 border border-gray-200 rounded-xl font-black font-mono text-xs outline-none focus:border-[#1cb0f6]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleAdjustGems(cust)}
                        className="py-1.5 bg-[#1cb0f6] text-white rounded-xl font-bold text-xs uppercase cursor-pointer"
                      >
                        Aplicar
                      </button>
                      <button
                        onClick={() => {
                          setManualGemsAdjustOpen(null);
                          setAdjustAmount('');
                          playSound('click');
                        }}
                        className="py-1.5 bg-gray-150 rounded-xl font-bold text-xs text-gray-650 cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {/* 📊 IMPORT RESULTS SUMMARY MODAL */}
      {showResultModal && importResult && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn text-gray-800">
          <div className="bg-white border-4 border-gray-205 border-b-[10px] rounded-3xl max-w-lg w-full p-6 space-y-5 relative text-left">
            
            {/* Header / illustration */}
            <div className="flex items-center gap-4">
              <span className="text-5xl select-none animate-bounce">
                {importResult.imported.length > 0 ? '📂' : '❌'}
              </span>
              <div>
                <h3 className="text-xl font-black text-gray-800 uppercase tracking-wide">
                  {importResult.imported.length > 0 ? '¡Importación de Clientes Completada!' : 'Fallo en Importación'}
                </h3>
                <p className="text-xs text-gray-400 font-extrabold uppercase">
                  Auditoría y Bitácora del Archivo Excel
                </p>
              </div>
            </div>

            {/* Stats boxes */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-3 text-center">
                <span className="text-2xl block">🎉</span>
                <span className="text-[10px] font-black uppercase text-green-700 block leading-tight">Procesados con Éxito</span>
                <span className="text-xl font-black text-green-600 font-mono">{importResult.imported.length} un.</span>
              </div>
              <div className={`rounded-2xl p-3 text-center border-2 ${importResult.failedCount > 0 ? 'bg-red-55 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                <span className="text-2xl block">⚠️</span>
                <span className="text-[10px] font-black uppercase text-red-650 block leading-tight">Registros Omitidos</span>
                <span className={`text-xl font-black font-mono ${importResult.failedCount > 0 ? 'text-red-500' : 'text-gray-500'}`}>{importResult.failedCount} filas</span>
              </div>
            </div>

            {/* Error log bitácora */}
            {importResult.errors.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase text-gray-400">Detalles y Advertencias Encontradas ({importResult.errors.length}):</label>
                <div className="bg-red-50/50 border border-red-200 rounded-2xl p-4 max-h-[160px] overflow-y-auto font-mono text-[10px] text-red-700 space-y-1 scrollbar-thin">
                  {importResult.errors.map((err: string, i: number) => (
                    <div key={i} className="flex gap-1">
                      <span>•</span>
                      <span>{err}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Success message / tip */}
            {importResult.imported.length > 0 && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl flex items-start gap-2.5 text-xs text-blue-800 font-semibold leading-relaxed">
                <span>💡</span>
                <p>
                  Los clientes válidos se han incorporado a la base local <strong>IndexedDB</strong>. Si cuentas con sincronización activa, se guardarán en Supabase la próxima vez que se inicie sesión o se sincronice. ¡Sigue así!
                </p>
              </div>
            )}

            {/* Close action button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowResultModal(false);
                  setImportResult(null);
                  playSound('click');
                }}
                className="w-full bg-[#58cc02] text-white hover:bg-[#61e002] py-3 font-black text-sm rounded-2xl border-b-4 border-green-700 uppercase tracking-wide cursor-pointer transition-all active:translate-y-0.5 active:border-b-2 text-center flex items-center justify-center gap-1"
              >
                ¡Entendido! 🚀
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
