import React, { useState } from 'react';
import { User, Transaction, Product } from '../../../types';
import AeroMascot from '../../../components/Mascot/AeroMascot';
import { playSound } from '../../../services/sounds';
import { Send, Brain, HelpCircle } from 'lucide-react';

interface DuoCopilotTabProps {
  user: User;
  transactions: Transaction[];
  products: Product[];
  onGrantXp?: (amount: number) => void;
}

export default function DuoCopilotTab({ user, transactions, products, onGrantXp }: DuoCopilotTabProps) {
  const [copilotResponse, setCopilotResponse] = useState<string>('');
  const [copilotLoading, setCopilotLoading] = useState<boolean>(false);
  const [copilotQuery, setCopilotQuery] = useState<string>('¿Cómo puedo duplicar las ventas de mi producto estrella?');

  const handleCallCopilot = async (overridePrompt?: string) => {
    const queryToUse = overridePrompt || copilotQuery;
    if (!queryToUse.trim()) return;

    setCopilotLoading(true);
    setCopilotResponse('');
    try {
      const statsContext = {
        employeeName: user.username,
        level: user.level,
        xp: user.xp,
        dailyGoal: user.dailyGoal,
        streak: user.streak,
        totalSalesVolume: transactions.reduce((acc, curr) => acc + curr.total, 0),
        transactionsCount: transactions.length,
        productsCount: products.length,
        lowStockCount: products.filter((p) => p.stock <= 5).length,
        categories: Array.from(new Set(products.map((p) => p.category))),
        inventoryProducts: products.map((p) => ({ name: p.name, stock: p.stock, price: p.price })),
        recentTransactions: transactions
          .slice(-5)
          .map((t) => ({ total: t.total, date: t.date, items: t.items.map((i) => i.name) })),
      };

      const systemPrompt =
        'Eres Aero Copilot, el asistente IA analítico de negocios de alta tecnología de StockMaster Pro. Tu objetivo es dar recomendaciones estratégicas breves (máximo 4 párrafos cortos), atractivas, lúdicas y extremadamente profesionales. Habla con entusiasmo, usa el tono divertido pero sabio característico del fénix Aero. Estructura tus respuestas usando encabezados markdown elegantes, listas de viñetas, y añade sugerencias numéricas específicas de decisiones de racha y precios para las métricas provistas.';

      const userMessage = `Hola Aero Copilot. Mis datos de hoy/históricos de la tienda son:
- Empleado: ${statsContext.employeeName} (Nivel ${statsContext.level}, Racha: ${statsContext.streak} días)
- Volumen de Ventas: $${statsContext.totalSalesVolume.toFixed(2)} USD (Transacciones: ${statsContext.transactionsCount})
- Catálogo: ${statsContext.productsCount} productos (${statsContext.lowStockCount} con stock bajo de 5 unidades)
- Productos principales: ${JSON.stringify(statsContext.inventoryProducts.slice(0, 4))}

Consulta del usuario: ${queryToUse}

Por favor, analízalo con tu telemetría avanzada y dime insights de calibre mundial.`;

      const response = await fetch('/api/gemini/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemPrompt, userMessage }),
      });
      const data = await response.json();
      setCopilotResponse(data.text || 'No se ha podido recuperar una respuesta de Aero Copilot.');

      if (onGrantXp) {
        onGrantXp(25);
      }
    } catch (err: any) {
      console.error(err);
      setCopilotResponse('⚠️ Error de conexión con Aero Copilot en la nube. Revisa tu racha de conexión.');
    } finally {
      setCopilotLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-4 text-left">
      {/* ASSISTANT CARD HEADER */}
      <div className="bg-gradient-to-r from-purple-500 to-indigo-600 bg-purple-650 text-white rounded-3xl p-6 shadow-sm border-b-[6px] border-purple-800 flex flex-col md:flex-row items-center gap-6 relative overflow-hidden">
        <div className="absolute top-[-50px] right-[-20px] text-white opacity-10 font-bold select-none pointer-events-none text-9xl">
          🛡️
        </div>
        <div className="select-none shrink-0">
          <AeroMascot
            size={96}
            activeAccessory={user.activeAccessory}
            mood={copilotLoading ? 'happy' : 'neutral'}
            level={user.level}
            animate={true}
            showSparkles={copilotLoading}
          />
        </div>
        <div className="space-y-1.5 flex-1 text-center md:text-left">
          <span className="bg-purple-400 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider inline-block">
            Asistente Ejecutivo Premium
          </span>
          <h3 className="text-xl md:text-2xl font-black tracking-tight text-white uppercase">
            Aero Copilot IA Analítico
          </h3>
          <p className="text-xs text-purple-100 font-semibold leading-relaxed max-w-xl">
            Alimentado de forma segura por el motor de inteligencia de{' '}
            <strong className="text-yellow-300">Gemini server-side</strong>. Aero Copilot lee en tiempo real tu volumen
            de ventas, rotación de inventarios y patrones de turnos para entregarte sugerencias de negocio ágiles y
            altamente rentables.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* QUICK PRE-SET CHALLENGES PANEL */}
        <div className="bg-white border-2 border-gray-200 border-b-[6px] rounded-3xl p-5 space-y-4 lg:col-span-1">
          <span className="text-[10px] uppercase font-black tracking-wider text-gray-400 block leading-none">
            Consultas Rápidas
          </span>
          <h4 className="font-extrabold text-sm text-gray-800 uppercase tracking-tight">
            Preguntas de Negocio Frecuentes
          </h4>
          <p className="text-xs text-gray-500 leading-relaxed font-bold uppercase">
            Haz clic en cualquiera de las consultas para analizar las métricas cargadas en este navegador al instante:
          </p>

          <div className="space-y-3 pt-2">
            {[
              {
                id: 'demand',
                title: '🔮 Predecir Demanda',
                text: 'Realiza un análisis predictivo de rotación sobre mis productos y dime cuáles se agotarán próximamente basado en la velocidad de ventas.',
                tag: 'CONSEJO DE STOCK',
              },
              {
                id: 'cross',
                title: '🛒 Venta Cruzada & Combos',
                text: 'Sugiéreme promociones cruzadas o combos dinámicos gamificados entre mis productos estrella y los de menor movimiento para vaciar bodega.',
                tag: 'AUMENTAR TICKET',
              },
              {
                id: 'rota',
                title: '⚡ Optimización de Turno',
                text: 'Analiza mis transacciones y dime cuáles son las horas pico aproximadas y cómo capacitar a mis cajeros para que ganen gemas rápidamente.',
                tag: 'METRICAS DE CAJA',
              },
              {
                id: 'league',
                title: '🏆 Fidelización y Ligas',
                text: 'Recomienda desafíos de racha semanales inspirados en Duolingo para que mis clientes aumenten sus puntos de fidelidad y compren más.',
                tag: 'ESTRATEGIA CLUB',
              },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  playSound('click');
                  setCopilotQuery(item.text);
                  handleCallCopilot(item.text);
                }}
                disabled={copilotLoading}
                className="w-full text-left p-3.5 rounded-2xl border-2 border-gray-150 hover:border-purple-300 hover:bg-purple-100/10 transition-all text-xs space-y-2 group cursor-pointer disabled:opacity-50 block"
              >
                <div className="flex justify-between items-center bg-gray-50 group-hover:bg-purple-100/30 px-2 py-1 rounded-md transition-colors border">
                  <span className="font-extrabold text-[#7c3aed] uppercase tracking-wide text-[9px] block">
                    {item.title}
                  </span>
                  <span className="text-[8px] bg-purple-100 text-[#7c3aed] font-black px-1.5 py-0.5 rounded-sm">
                    {item.tag}
                  </span>
                </div>
                <p className="text-[10.5px] font-bold text-gray-500 line-clamp-2 leading-relaxed uppercase group-hover:text-purple-950">
                  {item.text}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* RESPONSE WORKSPACE & INTERACTIVE CHAT console */}
        <div className="lg:col-span-2 space-y-6">
          {/* INTERACTIVE CHAT INPUT BOX */}
          <div className="bg-white border-2 border-gray-200 border-b-[6px] rounded-3xl p-5 space-y-4">
            <span className="text-[10px] uppercase font-black tracking-wider text-gray-400 block leading-none">
              Consultar libremente
            </span>
            <div className="space-y-3">
              <textarea
                rows={3}
                value={copilotQuery}
                onChange={(e) => setCopilotQuery(e.target.value)}
                placeholder="Escribe tu consulta empresarial personalizada..."
                className="w-full font-bold text-sm bg-gray-50 border-2 border-gray-200 focus:border-purple-500 focus:bg-white focus:outline-none p-4 rounded-2xl placeholder:text-gray-400 text-gray-850 transition-all uppercase"
                disabled={copilotLoading}
              />
              <div className="flex justify-end items-center gap-2">
                <button
                  onClick={() => {
                    playSound('click');
                    handleCallCopilot();
                  }}
                  disabled={copilotLoading || !copilotQuery.trim()}
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-550 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all border-b-4 border-purple-800 active:border-b-0 active:translate-y-[4px] cursor-pointer disabled:opacity-50"
                >
                  <Send size={13} /> Ver Diagnóstico Inteligente
                </button>
              </div>
            </div>
          </div>

          {/* OUTCOME ANALYSIS LOG */}
          {copilotLoading || copilotResponse ? (
            <div className="space-y-4">
              {/* METRIC SENTINEL STATUS BAR */}
              <div className="bg-purple-50 border border-purple-200 rounded-2xl px-4 py-2.5 flex items-center justify-between text-[10px] text-purple-900 font-extrabold uppercase">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#7c3aed] animate-ping" />
                  <span>Telemetría de racha empresarial conectada</span>
                </div>
                <span>REPORTE DEL TURNO DEL CAJERO: {user.username.toUpperCase()}</span>
              </div>

              {copilotLoading && (
                <div className="bg-slate-900 border border-slate-950 rounded-3xl p-8 flex flex-col items-center justify-center text-center space-y-4 min-h-[300px]">
                  <div className="relative">
                    <div className="absolute inset-0 bg-purple-500 rounded-full blur-xl scale-125 opacity-30 animate-pulse" />
                    <Brain
                      size={48}
                      className="text-[#a855f7] animate-pulse relative animate-spin"
                      style={{ animationDuration: '4s' }}
                    />
                  </div>
                  <div className="space-y-1.5 select-none">
                    <h5 className="font-mono text-xs text-white uppercase tracking-widest animate-pulse">
                      Procesando Métricas en Gemini AI...
                    </h5>
                    <p className="font-mono text-[10.5px] text-purple-400 font-bold uppercase leading-relaxed max-w-sm">
                      Sincronizando volumen de racha y estado de inventario...
                    </p>
                  </div>
                  <div className="w-full max-w-xs bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-700/50">
                    <div className="bg-purple-500 h-full rounded-full w-[65%] animate-pulse" />
                  </div>
                </div>
              )}

              {copilotResponse && !copilotLoading && (
                <div className="bg-white border-2 border-purple-200 border-b-[6px] rounded-3xl p-5 md:p-6 space-y-5 animate-fadeIn text-slate-850">
                  {/* RESPONSE TITLE */}
                  <div className="border-b pb-3 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">💡</span>
                      <div>
                        <h4 className="font-black text-sm text-purple-950 uppercase leading-none">
                          Análisis Aero Copilot
                        </h4>
                        <p className="text-[8.5px] text-purple-400 font-extrabold uppercase mt-1 leading-none">
                          Firma Digital Verificada con +25 XP Recibidos
                        </p>
                      </div>
                    </div>
                    <span className="bg-purple-50 border border-purple-200/50 text-[#7c3aed] text-[9.5px] font-black uppercase px-2 py-0.5 rounded-lg select-none font-mono">
                      Consumido: Server API
                    </span>
                  </div>

                  {/* RESPONSIVE RAW TEXT FORMATTER */}
                  <div className="text-xs leading-relaxed space-y-4 whitespace-pre-wrap font-sans text-gray-705 font-bold uppercase text-[10.5px]">
                    {copilotResponse.split('\n').map((line, idx) => {
                      const trim = line.trim();

                      if (trim.startsWith('###')) {
                        return (
                          <h5
                            key={idx}
                            className="text-[11px] font-black text-slate-900 uppercase pt-2 tracking-tight flex items-center gap-1.5"
                          >
                            {trim.replace('###', '')}
                          </h5>
                        );
                      } else if (trim.startsWith('##')) {
                        return (
                          <h4
                            key={idx}
                            className="text-[12px] font-black text-purple-950 uppercase pt-3 pb-1 border-b border-gray-100 tracking-tight flex items-center gap-1.5"
                          >
                            {trim.replace('##', '')}
                          </h4>
                        );
                      } else if (trim.startsWith('1.') || trim.match(/^\d+\./)) {
                        return (
                          <div
                            key={idx}
                            className="bg-slate-50 border-2 border-gray-150 p-4 rounded-xl mt-2 font-bold text-gray-850 uppercase text-[10.5px] tracking-tight"
                          >
                            {line}
                          </div>
                        );
                      } else if (trim.startsWith('-') || trim.startsWith('✓')) {
                        return (
                          <p
                            key={idx}
                            className="pl-4 text-gray-600 font-bold flex items-start gap-1.5 text-[10px] leading-relaxed uppercase"
                          >
                            <span className="text-purple-500">❖</span> {trim.replace(/^[-✓]/, '').trim()}
                          </p>
                        );
                      } else if (trim.length === 0) {
                        return <div key={idx} className="h-1" />;
                      }

                      return (
                        <p key={idx} className="indent-0 text-slate-700">
                          {line}
                        </p>
                      );
                    })}
                  </div>

                  {/* CONGRATULATIONS CONSOLE NOTICE */}
                  <div className="bg-[#e5f6ff] text-[#155375] border border-blue-200 rounded-2xl p-4 flex gap-3 text-xs font-bold items-center">
                    <span className="text-xl">🛡️🔥</span>
                    <div className="flex-1 space-y-0.5">
                      <p className="uppercase text-[10.5px] font-black text-[#155375]">
                        ¡Misión Inteligente Completada!
                      </p>
                      <p className="text-gray-500 uppercase text-[9px] leading-relaxed">
                        Has recibido <span className="text-purple-700 font-black">+25 de XP corporativo</span> de racha
                        empresarial por consultar a Aero Copilot para mejorar tu tienda.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white border-2 border-dashed border-gray-250 rounded-3xl p-8 flex flex-col items-center justify-center text-center space-y-3 min-h-[300px]">
              <HelpCircle size={40} className="text-gray-300" />
              <div className="space-y-1 select-none">
                <h5 className="font-extrabold text-sm text-gray-750 uppercase">Esperando Consulta Empresarial</h5>
                <p className="text-[10px] text-gray-400 font-bold leading-normal uppercase max-w-sm">
                  Elige una consulta rápida en el panel de la izquierda o escribe una pregunta libre en el cuadro
                  superior para recibir insights de calibre mundial.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
