import React, { useState } from 'react';
import { Download, Upload, Info, Database } from 'lucide-react';
import { playSound } from '../../../services/audio/soundService';
import { toast } from '../../../shared/ui/FlashNotifications/FlashNotifications';
import { setLocalData } from '../../../database/supabaseSync';
import { User, Product, Transaction } from '../../../types';

interface DatabaseSettingsProps {
  user: User | null;
  products: Product[];
  transactions: Transaction[];
}

export default function DatabaseSettings({ user, products, transactions }: DatabaseSettingsProps) {
  const [isRestoring, setIsRestoring] = useState(false);

  // Export Database Backup file
  const handleExportDB = () => {
    playSound('click');
    try {
      const backupData = {
        user,
        products,
        transactions,
        version: 'DuoPOS_v1.8',
        timestamp: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `duopos_respaldo_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Respaldo exportado exitosamente en tu descargas.', {
        title: 'Copia de Seguridad Lista 💾'
      });
    } catch (err) {
      toast.error('Error al exportar los datos: ' + err);
    }
  };

  // Import Database Backup file
  const handleImportDB = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsRestoring(true);
    playSound('click');
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (parsed && typeof parsed === 'object') {
          if (!parsed.user || !parsed.products || !parsed.transactions) {
            toast.error('El archivo cargado no tiene un esquema de DuoPOS válido.', {
              title: 'Archivo Inválido ⛔'
            });
            setIsRestoring(false);
            return;
          }

          localStorage.setItem('duo_pos_active_user', JSON.stringify(parsed.user));
          await setLocalData('duo_pos_products', parsed.products);
          await setLocalData('duo_pos_transactions', parsed.transactions);

          toast.success('¡Base de datos de DuoPOS restaurada exitosamente! Reiniciando POS...', {
            title: 'Restauración Exitosa 🎉'
          });
          
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        }
      } catch (err) {
        toast.error('El archivo no contiene un JSON estructurado válido.', {
          title: 'Error de Parseo ⛔'
        });
        setIsRestoring(false);
      }
    };
    reader.readAsText(file);
  };

  const activeSkin = user?.activeSkin || 'standard';
  const isDark = ['dark-galaxy', 'neon-cyberpunk', 'emerald-palace', 'retro-8bit', 'executive-gold', 'deep-ocean'].includes(activeSkin);

  return (
    <div className="space-y-6 animate-fadeIn text-left">
      <div className="border-b pb-3 flex items-center gap-2">
        <span className="text-2xl select-none">💾</span>
        <div>
          <h3 className="text-sm font-black uppercase text-gray-800 dark:text-zinc-200 tracking-tight font-sans">
            Base de Datos e Integridad del Sistema
          </h3>
          <p className="text-[10px] text-gray-400 font-bold uppercase">
            Administra copias de seguridad offline y portabilidad de datos local-first
          </p>
        </div>
      </div>

      <div className={`border rounded-3xl p-5 md:p-6 space-y-4 shadow-sm transition-colors duration-300 ${
        isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-[#fafafa] border-gray-200 text-gray-800'
      }`}>
        <div className="flex items-center gap-2.5">
          <Database className="text-indigo-500 shrink-0" size={24} />
          <h4 className="font-extrabold text-sm uppercase tracking-wider">
            Copia de Seguridad y Portabilidad de Datos
          </h4>
        </div>
        
        <p className={`text-xs font-semibold leading-relaxed leading-normal ${
          isDark ? 'text-zinc-400' : 'text-gray-500'
        }`}>
          Lleva tu tienda de un dispositivo a otro de verdad y de forma 100% offline. Genera un archivo cifrado estructurado con todo tu inventario, racha de ventas activa, nivel de experiencia XP de cajeros y registros históricos de ventas para restaurarla en cualquier navegador de computadora, tablet o celular.
        </p>

        <div className="bg-sky-50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900 rounded-2xl p-4 text-xs text-sky-850 dark:text-sky-200 font-semibold leading-relaxed flex gap-2 items-start">
          <Info size={16} className="text-sky-500 shrink-0 mt-0.5 animate-pulse" />
          <div>
            <strong>Consejo Local-First:</strong> Al restaurar un respaldo, se sobreescribirá toda la base de datos local en IndexedDB activa. Recuerda exportar tu estado actual si tienes transacciones recientes sin respaldar.
          </div>
        </div>

        <div className="flex flex-wrap gap-3 pt-3 justify-end w-full">
          <label className={`border-2 border-b-4 hover:bg-gray-50 dark:hover:bg-zinc-800 active:translate-y-[2px] active:border-b-2 py-3 px-5 rounded-2xl font-black text-xs uppercase cursor-pointer flex items-center gap-2 tracking-wider transition-all shadow-xs ${
            isDark 
              ? 'bg-zinc-900 border-zinc-700 text-zinc-200 active:border-b-2' 
              : 'bg-white text-gray-600 border-gray-200'
          } ${isRestoring ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}>
            <Upload size={14} /> {isRestoring ? 'Restaurando...' : 'Restaurar Copia (.json)'}
            <input type="file" accept=".json" onChange={handleImportDB} disabled={isRestoring} className="hidden" />
          </label>

          <button
            type="button"
            onClick={handleExportDB}
            disabled={isRestoring}
            className="bg-[#58cc02] hover:bg-[#61e002] text-white border-b-4 border-[#46a302] hover:border-b-6 active:border-b-0 active:translate-y-[4px] py-3 px-5 rounded-2xl font-black text-xs uppercase cursor-pointer flex items-center gap-2 tracking-wider transition-all shadow-md active:translate-y-[4px]"
          >
            <Download size={14} /> Respaldar Todo
          </button>
        </div>
      </div>
    </div>
  );
}
