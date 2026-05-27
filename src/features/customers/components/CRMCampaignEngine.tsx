import React, { useState, useMemo } from 'react';
import { Customer } from '../../../types';
import { playSound } from '../../../services/sounds';
import { toast } from '../../../components/Modal/FlashNotifications';
import { Megaphone, Users, Zap, Send } from 'lucide-react';

interface CRMCampaignEngineProps {
  customers: Customer[];
  onUpdateCustomer: (customer: Customer) => void;
  onGrantXp: (amount: number) => void;
}

export default function CRMCampaignEngine({
  customers,
  onUpdateCustomer,
  onGrantXp
}: CRMCampaignEngineProps) {
  const [crmSegment, setCrmSegment] = useState<'all' | 'vip' | 'debtors' | 'inactive' | 'gem_rich'>('all');
  const [crmTemplate, setCrmTemplate] = useState<string>('reminder');
  const [crmMsg, setCrmMsg] = useState<string>(
    '⚠️ Recordatorio Amistoso DuoPOS: Estimado cliente, cuenta con un saldo pendiente de pago. Puede abonarlo en caja con efectivo, tarjeta o canjeando sus DuoPuntos acumulados. ¡Siga con su racha de compras hoy! 🦉'
  );
  const [crmChannel, setCrmChannel] = useState<'whatsapp' | 'sms' | 'email'>('whatsapp');
  const [crmBroadcasting, setCrmBroadcasting] = useState<boolean>(false);
  const [crmBroadcastProgress, setCrmBroadcastProgress] = useState<number>(0);
  const [crmBroadcastHistory, setCrmBroadcastHistory] = useState<{ id: string, date: string, campaign: string, targetCount: number, channel: string, rewardsInjected: number }[]>([
    {
      id: 'crmhist-1',
      date: new Date(Date.now() - 24*3600*1000).toISOString(),
      campaign: 'Incentivo de Racha (+50 Gemas Gratis) 🦉',
      targetCount: 3,
      channel: 'WhatsApp Web Bot',
      rewardsInjected: 150
    },
    {
      id: 'crmhist-2',
      date: new Date(Date.now() - 3*24*3600*1000).toISOString(),
      campaign: 'Aviso de Abono a Línea de Crédito 💸',
      targetCount: 2,
      channel: 'SMS Directo',
      rewardsInjected: 0
    }
  ]);

  // CRM Segmentation computations
  const segmentedCRMCustomers = useMemo(() => {
    return customers.filter(c => {
      if (crmSegment === 'vip') {
        return c.league === 'Obsidiana' || c.league === 'Esmeralda' || c.league === 'Rubí' || c.totalSpent >= 500;
      }
      if (crmSegment === 'debtors') {
        return (c.creditUsed || 0) > 0;
      }
      if (crmSegment === 'inactive') {
        return c.purchasesCount <= 1;
      }
      if (crmSegment === 'gem_rich') {
        return c.gems >= 300;
      }
      return true; // all
    });
  }, [customers, crmSegment]);

  const handleTemplateChange = (tmplKey: string) => {
    setCrmTemplate(tmplKey);
    let messageText = '';
    if (tmplKey === 'reminder') {
      messageText = '⚠️ Recordatorio Amistoso DuoPOS: Estimado cliente, cuenta con un saldo pendiente de pago de $__DEB__. Puede abonarlo en caja con efectivo, tarjeta o canjeando sus DuoPuntos acumulados. ¡Siga con su racha de compras hoy! 🦉';
    } else if (tmplKey === 'vip_perk') {
      messageText = '💎 BENEFICIO EXCLUSIVO VIP: Hemos activado un multiplicador de 2.5x gemas en todas tus compras de esta semana por pertenecer a nuestra Liga de Honor. ¡Pasa hoy por tu punto de venta! ⚡';
    } else if (tmplKey === 'gift_gems') {
      messageText = '🎁 REGALO DUOPOS DE RACHA: ¡Felicidades! Queremos premiar tu constancia obsequiándote +100 GEMAS extra directamente a tu cuenta de cliente para canjear en nuestro catálogo de premios. 🦉🍩';
    } else if (tmplKey === 'reactivation') {
      messageText = '👋 ¡Te extrañamos en el POS! Presenta este mensaje directo en tu próxima compra y obtén un cupón de 10% de descuento automático. ¡Mantener activa tu racha es muy fácil! ⭐';
    }
    setCrmMsg(messageText);
    playSound('click');
  };

  const handleLaunchCampaign = () => {
    if (segmentedCRMCustomers.length === 0) {
      toast.warning('⚠️ No hay clientes en este segmento para destinatarios de la campaña.');
      return;
    }
    
    setCrmBroadcasting(true);
    setCrmBroadcastProgress(0);
    playSound('swoosh');
    
    // Simulate broadcasting process step-by-step
    const interval = setInterval(() => {
      setCrmBroadcastProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          
          // Campaign logic execution on finish
          let rewardsApplied = 0;
          if (crmTemplate === 'gift_gems') {
            // Apply actual gift of 100 Gems to each client in the active segment!
            segmentedCRMCustomers.forEach(cust => {
              const updatedCust: Customer = {
                ...cust,
                gems: cust.gems + 100
              };
              onUpdateCustomer(updatedCust);
            });
            rewardsApplied = segmentedCRMCustomers.length * 100;
          }
          
          // Add record to simulated campaign log history
          const campaignName = 
            crmTemplate === 'reminder' ? 'Recordatorio de Deuda (Amigable)' :
            crmTemplate === 'vip_perk' ? 'Promoción VIP 2.5x Multiplicador' :
            crmTemplate === 'gift_gems' ? 'Inyección Masiva de Gemas (+100 G)' :
            'Campaña de Reactivación de Clientes';
          
          const channelName = 
            crmChannel === 'whatsapp' ? 'WhatsApp Web Bot' :
            crmChannel === 'sms' ? 'SMS Directo' : 'Email de Racha';

          const newLog = {
            id: `crmhist-${Date.now()}`,
            date: new Date().toISOString(),
            campaign: `${campaignName} 🚀`,
            targetCount: segmentedCRMCustomers.length,
            channel: channelName,
            rewardsInjected: rewardsApplied
          };

          setCrmBroadcastHistory(prevHist => [newLog, ...prevHist]);
          setCrmBroadcasting(false);
          
          playSound('levelup');
          onGrantXp(100); // 100 XP gained for large-scale marketing action!
          toast.success(`🎉 ¡Campaña enviada con éxito! Se transmitió a ${segmentedCRMCustomers.length} clientes. Ganaste +100 XP.`);
          return 100;
        }
        return prev + 25; // advance 25% each step
      });
    }, 450);
  };

  return (
    <div className="space-y-6 animate-fadeIn text-left text-gray-855">
      {/* INTRO HERO */}
      <div className="bg-indigo-600 border-2 border-indigo-800 text-white rounded-3xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-1.5 text-[#fffbeb] font-black text-sm uppercase">
            <Megaphone size={16} />
            <span>Motor CRM Avanzado & Inteligencia de Difusión</span>
          </div>
          <p className="text-xs text-indigo-100 leading-relaxed font-bold">
            Segmenta elegantemente a tus clientes basándote en su comportamiento de compra, saldos por cobrar o gemas acumuladas. Lanza campañas promocionales para reactivar ventas.
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-1.5 bg-white text-indigo-950 border-2 border-indigo-200 py-1.5 px-3 rounded-2xl font-black text-xs">
          <Users size={14} className="text-indigo-600" />
          <span>{customers.length} Clientes Activos</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
        {/* DESIGNER & COUPLING CONTROL PANEL (LEFT 2 COLS) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border-2 border-gray-200 border-b-6 rounded-3xl p-5 space-y-4 text-left">
            <div className="flex items-center gap-2 border-b pb-2">
              <span className="text-xl">🛠️</span>
              <div className="text-left">
                <h3 className="text-xs font-black uppercase text-gray-750">Configurador de Campaña de Marketing</h3>
                <p className="text-[9px] text-gray-400 font-bold uppercase">Define el público objetivo, plantilla de mensaje y canal de salida</p>
              </div>
            </div>

            {crmBroadcasting && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 text-center space-y-2 animate-pulse">
                <p className="text-xs font-black text-indigo-800 uppercase flex items-center justify-center gap-1">
                  <Zap size={14} className="animate-bounce" /> Transmitiendo Campaña en Tiempo Real...
                </p>
                <div className="w-full bg-indigo-100 h-4 rounded-full overflow-hidden border">
                  <div className="bg-indigo-600 h-full rounded-full transition-all duration-300" style={{ width: `${crmBroadcastProgress}%` }} />
                </div>
                <span className="text-[10px] text-indigo-500 font-bold block">{crmBroadcastProgress}% Procesado</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
              {/* Segment selection */}
              <div className="space-y-1.5 text-left">
                <label className="text-[10px] uppercase font-black text-gray-400 block tracking-wider font-sans">
                  1. Segmentar Destinatarios
                </label>
                <select
                  value={crmSegment}
                  onChange={(e) => { setCrmSegment(e.target.value as any); playSound('click'); }}
                  className="w-full bg-white border-2 border-gray-200 border-b-4 rounded-xl px-3 py-2 font-bold text-xs select-none outline-none focus:border-[#a435f0] text-gray-700 cursor-pointer"
                >
                  <option value="all">Filtro: Todos los Clientes ({customers.length})</option>
                  <option value="vip">Filtro: Liga Honor (Rubí, Esmeralda, Obsidiana) ({customers.filter(c => c.league === 'Rubí' || c.league === 'Esmeralda' || c.league === 'Obsidiana' || c.totalSpent >= 500).length})</option>
                  <option value="debtors">Filtro: Clientes con Deuda Activa ("Fiados") ({customers.filter(c => (c.creditUsed || 0) > 0).length})</option>
                  <option value="inactive">Filtro: Inactivos / Pasivos (≤ 1 compra) ({customers.filter(c => c.purchasesCount <= 1).length})</option>
                  <option value="gem_rich">Filtro: Rancheros de Gemas (≥ 300 G) ({customers.filter(c => c.gems >= 300).length})</option>
                </select>
              </div>

              {/* Channel selection */}
              <div className="space-y-1.5 text-left">
                <label className="text-[10px] uppercase font-black text-gray-400 block tracking-wider">
                  2. Canal de Comunicación Directo
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: 'whatsapp', label: 'WhatsApp', icon: '💬' },
                    { key: 'sms', label: 'SMS Directo', icon: '📱' },
                    { key: 'email', label: 'Email Racha', icon: '✉️' }
                  ].map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => { setCrmChannel(item.key as any); playSound('click'); }}
                      className={`py-2 px-1.5 border-2 border-b-4 rounded-xl font-bold text-[9px] uppercase tracking-wide cursor-pointer transition-all ${
                        crmChannel === item.key
                          ? 'bg-indigo-650 border-indigo-800 text-white'
                          : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <span className="block text-sm">{item.icon}</span>
                      <span className="mt-0.5 block font-black">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Templates Selector */}
            <div className="space-y-1.5 pt-1 text-left">
              <label className="text-[10px] uppercase font-black text-gray-400 block tracking-wider">
                3. Plantillas de Mensajes de Racha Duo
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[
                  { key: 'reminder', label: 'Alerta Deuda 💸' },
                  { key: 'vip_perk', label: 'Impulso VIP 💎' },
                  { key: 'gift_gems', label: 'Regalo Gemas 🎁' },
                  { key: 'reactivation', label: 'Descuento 🏷️' }
                ].map((tmpl) => (
                  <button
                    key={tmpl.key}
                    type="button"
                    onClick={() => handleTemplateChange(tmpl.key)}
                    className={`py-2 px-1 border-2 border-b-4 rounded-xl font-black text-[9px] uppercase cursor-pointer transition-all ${
                      crmTemplate === tmpl.key
                        ? 'bg-[#1cb0f6] border-[#108ec7] text-white'
                        : 'bg-white border-gray-200 text-gray-550 hover:bg-slate-50'
                    }`}
                  >
                    {tmpl.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Message text area */}
            <div className="space-y-1.5 text-left">
              <label className="text-[10px] uppercase font-black text-gray-400 block tracking-wider">
                Vista Previa del Mensaje Personalizado
              </label>
              <textarea
                value={crmMsg}
                onChange={(e) => setCrmMsg(e.target.value)}
                rows={3}
                className="w-full text-xs font-bold p-3 bg-slate-55 border-2 border-gray-200 rounded-2xl focus:border-[#a435f0] outline-none font-sans"
                placeholder="Escribe el mensaje de difusion directo..."
              />
              <div className="flex justify-between items-center text-[9px] text-gray-400 font-extrabold uppercase mt-1">
                <span>Caracteres: {crmMsg.length}</span>
                <span>Código: __DEB__ (Inyección automática de saldo)</span>
              </div>
            </div>

            {/* LAUNCH BTN */}
            <button
              type="button"
              onClick={handleLaunchCampaign}
              disabled={crmBroadcasting || segmentedCRMCustomers.length === 0}
              className={`w-full py-3 border-b-4 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 ${
                crmBroadcasting || segmentedCRMCustomers.length === 0
                  ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed border-b-2'
                  : 'bg-[#a435f0] hover:bg-[#8e26da] text-white border-indigo-900 border-b-6 shadow-sm active:translate-y-[2px] active:border-b-4'
              }`}
            >
              <Send size={15} />
              <span>Transmitir Campaña a {segmentedCRMCustomers.length} clientes (+100 XP)</span>
            </button>
          </div>
        </div>

        {/* SECTOR RIGHT (CRM HISTORICAL LOGS AND SELECTION METRICS) */}
        <div className="lg:col-span-1 space-y-4 text-left">
          {/* TARGET RECIPIENTS CAROUSEL */}
          <div className="bg-white border-2 border-gray-200 border-b-6 rounded-3xl p-5 space-y-3 text-left">
            <h3 className="text-xs font-black uppercase text-gray-400 tracking-wider">
              Destinatarios del Segmento ({segmentedCRMCustomers.length})
            </h3>
            <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 text-left">
              {segmentedCRMCustomers.length === 0 ? (
                <p className="text-[10px] text-gray-400 italic text-center py-4 font-medium leading-normal">
                  Ningún cliente cumple las condiciones de segmentación activa de racha.
                </p>
              ) : (
                segmentedCRMCustomers.map(c => (
                  <div key={c.id} className="flex justify-between items-center text-xs p-1.5 bg-slate-50 border rounded-xl font-bold">
                    <span className="truncate max-w-[120px] text-gray-700 font-extrabold">{c.name}</span>
                    <div className="flex gap-1.5 items-center shrink-0 font-mono text-[10px]">
                      {c.creditUsed && c.creditUsed > 0 ? (
                        <span className="text-red-500 font-black">${c.creditUsed}</span>
                      ) : (
                        <span className="text-[#58cc02] font-black">{c.gems} G</span>
                      )}
                      <span className="text-gray-300">|</span>
                      <span className="text-gray-400">{c.league}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* CRM CAMPAIGN LOGS */}
          <div className="bg-white border-2 border-gray-200 border-b-6 rounded-3xl p-5 space-y-3 text-left">
            <h3 className="text-xs font-black uppercase text-gray-400 tracking-wider">
              Historial de Campañas Transmitidas
            </h3>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1 text-left">
              {crmBroadcastHistory.map((log) => (
                <div key={log.id} className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-2xl text-xs font-bold text-left space-y-1">
                  <div className="flex justify-between text-[8px] text-indigo-900 uppercase font-black">
                    <span>{log.channel}</span>
                    <span>{new Date(log.date).toLocaleDateString()}</span>
                  </div>
                  <h4 className="text-gray-800 font-black text-xs leading-normal">{log.campaign}</h4>
                  <p className="text-[9px] text-gray-400 font-extrabold uppercase mt-0.5">
                    Transmisión directa a: {log.targetCount} Clientes
                  </p>
                  {log.rewardsInjected > 0 && (
                    <p className="text-[9px] text-emerald-600 font-black uppercase flex items-center gap-0.5 mt-1 animate-pulse">
                      <span>🎁</span> Se inyectaron: +{log.rewardsInjected} G extra totales
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
