import React, { useState } from 'react';
import { Customer, LeagueType } from '../../../types';
import { playSound } from '../../../services/audio/soundService';
import { toast } from '../../../shared/ui/FlashNotifications/FlashNotifications';
import { LEAGUE_METADATA } from '../CustomersScreen';

interface LoyaltyStoreProps {
  customers: Customer[];
  onUpdateCustomer: (customer: Customer) => void;
  onGrantXp: (amount: number) => void;
}

export default function LoyaltyStore({ customers, onUpdateCustomer, onGrantXp }: LoyaltyStoreProps) {
  const [loyaltySelectedCustId, setLoyaltySelectedCustId] = useState<string>('');
  const [rewardSuccessMsg, setRewardSuccessMsg] = useState<string>('');

  const handleRedeemReward = (reward: { name: string; cost: number; icon: string }) => {
    if (!loyaltySelectedCustId) {
      toast.warning('⚠️ Para canjear, primero debes seleccionar un Cliente Activo de la lista en la Tienda.');
      return;
    }

    const selectedCust = customers.find((c) => c.id === loyaltySelectedCustId);
    if (!selectedCust) {
      toast.warning('⚠️ El cliente seleccionado ya no existe o es inválido.');
      return;
    }

    if (selectedCust.gems < reward.cost) {
      toast.warning(
        `⚠️ Saldo insuficiente. El cliente ${selectedCust.name} tiene ${selectedCust.gems} Gemas, pero el cupón "${reward.name}" requiere ${reward.cost} Gemas.`,
      );
      playSound('error');
      return;
    }

    // Deduct gems and apply update
    const updatedCust: Customer = {
      ...selectedCust,
      gems: selectedCust.gems - reward.cost,
      creditHistory: [
        {
          id: `crmredeem-${Date.now()}`,
          amount: 0,
          type: 'pay' as const, // Treat as informational deduction
          date: new Date().toISOString(),
          notes: `Canjeó Certificado: "${reward.name}" (${reward.icon}) - Deducción: ${reward.cost} G`,
        },
        ...(selectedCust.creditHistory || []),
      ],
    };

    onUpdateCustomer(updatedCust);
    playSound('levelup');
    onGrantXp(30); // 30 XP employee bonus context

    setRewardSuccessMsg(
      `🎉 ¡Felicidades! Se canjeó con éxito "${reward.name}" para el cliente ${selectedCust.name}. Se le han debitado ${reward.cost} Gemas.`,
    );
    setTimeout(() => {
      setRewardSuccessMsg('');
    }, 6000);
  };

  return (
    <div className="space-y-6 animate-fadeIn text-left text-gray-850">
      {/* LOYALTY SUMMARY HEADER */}
      <div className="bg-amber-100 border-2 border-amber-300 rounded-3xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1.5 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-1.5 text-amber-800 font-extrabold text-sm uppercase">
            <span>🏆</span> Multiplicadores por Liga de Honor DuoPOS
          </div>
          <p className="text-xs text-amber-700 leading-relaxed font-bold">
            Los clientes acumulan gemas por cada venta finalizada. A mayor estatus de racha (liga de honor), mayor es su
            multiplicador de velocidad de gemas en el punto de venta.
          </p>
        </div>
      </div>

      {/* BRACKETS LIST */}
      <div className="bg-white border-2 border-gray-200 border-b-6 rounded-3xl p-5 text-left">
        <h3 className="text-xs font-black uppercase text-gray-400 tracking-wider mb-3.5">
          Multiplicadores de Liga Vigentes & Distribución de Clientes
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {Object.keys(LEAGUE_METADATA).map((leagueKey) => {
            const meta = LEAGUE_METADATA[leagueKey as LeagueType];
            const count = customers.filter((c) => c.league === leagueKey).length;
            let mul = '1.0x';
            if (leagueKey === 'Plata') mul = '1.1x';
            if (leagueKey === 'Oro') mul = '1.2x';
            if (leagueKey === 'Zafiro') mul = '1.3x';
            if (leagueKey === 'Rubí') mul = '1.5x';
            if (leagueKey === 'Esmeralda') mul = '1.8x';
            if (leagueKey === 'Obsidiana') mul = '2.5x';

            return (
              <div
                key={leagueKey}
                className={`${meta.bg} ${meta.border} border-2 rounded-2xl p-2.5 text-center flex flex-col justify-between hover:scale-[1.02] transition-transform`}
              >
                <div>
                  <span className="text-2xl mt-1 block">{meta.emoji}</span>
                  <span className={`text-[10px] font-black uppercase block ${meta.text} mt-1`}>{meta.name}</span>
                </div>
                <div className="mt-2.5 pt-2 border-t border-dashed border-gray-200">
                  <span className="text-xs font-black font-mono text-gray-700 block">{mul} Bonus</span>
                  <span className="text-[9px] font-extrabold text-gray-400 block uppercase mt-0.5">
                    {count} Clientes
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* REWARDS STORE SECTOR */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
        {/* REDEEM CONTROL PANEL (LEFT) */}
        <div className="bg-white border-2 border-gray-200 border-b-6 rounded-3xl p-5 lg:col-span-1 space-y-4">
          <div className="flex items-center gap-1.5 border-b pb-2">
            <span className="text-xl">🛍️</span>
            <div className="text-left">
              <h3 className="text-xs font-black uppercase text-gray-700">Canjeador Al Instante</h3>
              <p className="text-[9px] text-gray-400 font-bold uppercase">Procesa cupones físicos o descuentos</p>
            </div>
          </div>

          {rewardSuccessMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-3 text-xs font-bold leading-normal animate-pulse">
              {rewardSuccessMsg}
            </div>
          )}

          {/* SELECT CUSTOMER */}
          <div className="space-y-1.5 text-left">
            <label className="text-[10px] uppercase font-black text-gray-400 block tracking-wider">
              Selecciona el Cliente de la Racha
            </label>
            <select
              value={loyaltySelectedCustId}
              onChange={(e) => {
                setLoyaltySelectedCustId(e.target.value);
                playSound('click');
              }}
              className="w-full bg-white border-2 border-gray-200 border-b-4 rounded-xl px-3 py-2 font-bold text-xs select-none outline-none focus:border-[#e6b100] text-gray-700 cursor-pointer"
            >
              <option value="">-- Buscar & Elegir Cliente --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (💎 {c.gems} Gemas)
                </option>
              ))}
            </select>
            {loyaltySelectedCustId &&
              (() => {
                const sel = customers.find((c) => c.id === loyaltySelectedCustId);
                if (!sel) return null;
                const meta = LEAGUE_METADATA[sel.league] || LEAGUE_METADATA.Bronce;
                return (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2 mt-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-black text-gray-700">Estatus de Lealtad:</span>
                      <span
                        className={`${meta.bg} ${meta.border} ${meta.text} border text-[9px] font-black uppercase px-2 py-0.5 rounded-lg flex items-center gap-1 select-none`}
                      >
                        <span>{meta.emoji}</span> {meta.name}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs font-bold font-mono">
                      <span>Gemas Disponibles:</span>
                      <span className="text-[#58cc02] font-black">{sel.gems} G</span>
                    </div>
                  </div>
                );
              })()}
          </div>
        </div>

        {/* CATALOGUE (RIGHT 2 COLS) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border-2 border-gray-200 border-b-6 rounded-3xl p-5 space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xl">🎁</span>
                <div className="text-left">
                  <h3 className="text-xs font-black uppercase text-gray-750">
                    Catálogo de Cupones y Recompensas Oficiales DuoPOS
                  </h3>
                  <p className="text-[9px] text-gray-400 font-bold uppercase">
                    Haz click en canjear para debitar las gemas del cliente
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                {
                  id: 'item-1',
                  name: 'Canje Refresco / Bebida Helada Gratis',
                  cost: 100,
                  icon: '🥤',
                  desc: 'Bebida de lata a elegir en mostrador. Válido un uso inmediato.',
                },
                {
                  id: 'item-2',
                  name: 'Descuento de $5 USD en venta activa',
                  cost: 200,
                  icon: '🎟️',
                  desc: 'Aplica cupón para descontar directo sobre el total de la compra.',
                },
                {
                  id: 'item-3',
                  name: 'Rebanada de Pizza Familiar de Jamón',
                  cost: 350,
                  icon: '🍕',
                  desc: 'Aplica para comida caliente o lunch del día. ¡Canje de racha!',
                },
                {
                  id: 'item-4',
                  name: 'Mochila Oficial DuoAcademy',
                  cost: 500,
                  icon: '🎒',
                  desc: 'Regalo físico de edición limitada con barra de progreso de la racha.',
                },
                {
                  id: 'item-5',
                  name: 'Peluche Auténtico de Duo (Búho)',
                  cost: 1000,
                  icon: '🦉',
                  desc: 'Premio supremo de coleccionista. Otorgable solo a ligas de Honor.',
                },
              ].map((reward) => {
                const isAffordable = (() => {
                  if (!loyaltySelectedCustId) return false;
                  const sel = customers.find((c) => c.id === loyaltySelectedCustId);
                  return sel ? sel.gems >= reward.cost : false;
                })();

                return (
                  <div
                    key={reward.id}
                    className={`border-2 rounded-2xl p-4.5 flex flex-col justify-between transition-all text-left ${
                      isAffordable
                        ? 'border-yellow-200 bg-yellow-50/50 hover:bg-yellow-50'
                        : 'border-gray-200 bg-white opacity-85'
                    }`}
                  >
                    <div className="space-y-1 text-left">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl">{reward.icon}</span>
                        <span className="bg-amber-400 text-amber-955 text-[10px] font-black uppercase px-2 py-0.5 rounded-lg border border-amber-300 font-mono">
                          {reward.cost} Gemas
                        </span>
                      </div>
                      <h4 className="text-xs font-black text-gray-800 leading-snug mt-1.5">{reward.name}</h4>
                      <p className="text-[10px] text-gray-500 font-medium leading-relaxed mt-0.5">{reward.desc}</p>
                    </div>

                    <button
                      onClick={() => handleRedeemReward(reward)}
                      className={`w-full py-2 border-b-4 font-black text-[10px] uppercase tracking-wide rounded-xl mt-3.5 transition-all text-center cursor-pointer ${
                        isAffordable
                          ? 'bg-amber-400 hover:bg-amber-500 text-amber-955 border-amber-600'
                          : 'bg-gray-100 hover:bg-gray-150 border-gray-300 text-gray-400 cursor-not-allowed border-b-2'
                      }`}
                    >
                      {isAffordable ? 'Canjear Premio ⚡' : 'Saldo Insuficiente'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
