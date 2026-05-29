import React, { useState, useEffect } from 'react';
import { User, Transaction, Customer } from '../../../types';
import { playSound } from '../../../services/sounds';
import { toast } from '../../../components/Modal/FlashNotifications';

interface SagaMapProps {
  user: User;
  onUpdateUser: (updatedUser: User) => void;
  transactions: Transaction[];
  customers: Customer[];
}

export default function SagaMap({ user, onUpdateUser, transactions, customers }: SagaMapProps) {
  const nodesData = [
    {
      id: 'node-1',
      title: 'Inicio del Cajero 🏁',
      description: 'Realiza tu primera venta en DuoPOS.',
      metricName: 'Ventas Realizadas',
      requirement: { metric: 'totalTransactions', target: 1 },
      reward: { xp: 40, gems: 20 },
      x: 300,
      y: 750,
      type: 'milestone',
    },
    {
      id: 'node-2',
      title: 'Cajero de Cobre 🥉',
      description: 'Registra un total de 5 transacciones de venta.',
      metricName: 'Ventas Realizadas',
      requirement: { metric: 'totalTransactions', target: 5 },
      reward: { xp: 60, gems: 30 },
      x: 440,
      y: 680,
      type: 'milestone',
    },
    {
      id: 'node-3',
      title: 'Estrella de Clientes 👥',
      description: 'Registra 2 clientes en el club de fidelidad.',
      metricName: 'Clientes Registrados',
      requirement: { metric: 'customers', target: 2 },
      reward: { xp: 80, gems: 40 },
      x: 360,
      y: 600,
      type: 'milestone',
    },
    {
      id: 'node-4',
      title: 'Cofre Sorpresa Bronce 🎁',
      description: 'Alcanza el nivel 2 y reclama tus premios sorpresa.',
      metricName: 'Nivel Requerido',
      requirement: { metric: 'level', target: 2 },
      reward: { xp: 100, gems: 50 },
      x: 200,
      y: 540,
      type: 'chest',
    },
    {
      id: 'node-5',
      title: 'Dominando la Racha 🔥',
      description: 'Mantén una racha activa de 3 días de ventas.',
      metricName: 'Racha de Días',
      requirement: { metric: 'streak', target: 3 },
      reward: { xp: 120, gems: 60 },
      x: 160,
      y: 460,
      type: 'milestone',
    },
    {
      id: 'node-6',
      title: 'Cajero Profesional 💼',
      description: 'Alcanza las 15 ventas registradas de por vida.',
      metricName: 'Ventas Realizadas',
      requirement: { metric: 'totalTransactions', target: 15 },
      reward: { xp: 150, gems: 70 },
      x: 280,
      y: 390,
      type: 'milestone',
    },
    {
      id: 'node-7',
      title: 'Fidelización Premium ⭐',
      description: 'Registra 5 clientes en el club de lealtad.',
      metricName: 'Clientes Registrados',
      requirement: { metric: 'customers', target: 5 },
      reward: { xp: 180, gems: 80 },
      x: 420,
      y: 330,
      type: 'milestone',
    },
    {
      id: 'node-8',
      title: 'Cofre Reluciente Oro 🎁',
      description: 'Llega al nivel 4 para abrir el cofre dorado.',
      metricName: 'Nivel Requerido',
      requirement: { metric: 'level', target: 4 },
      reward: { xp: 200, gems: 100 },
      x: 360,
      y: 250,
      type: 'chest',
    },
    {
      id: 'node-9',
      title: 'Arqueo Impecable 💎',
      description: 'Cierra una caja con discrepancia de $0.',
      metricName: 'Arqueos Perfectos',
      requirement: { metric: 'perfectShifts', target: 1 },
      reward: { xp: 250, gems: 120 },
      x: 220,
      y: 180,
      type: 'milestone',
    },
    {
      id: 'node-10',
      title: 'JEFE FINAL: Socio de Duo 👑',
      description: 'Alcanza el nivel 6 en la red de cajeros corporativos.',
      metricName: 'Nivel Requerido',
      requirement: { metric: 'level', target: 6 },
      reward: { xp: 500, gems: 250 },
      x: 300,
      y: 90,
      type: 'boss',
    },
  ];

  const totalSalesVal = transactions.length;
  const totalTransactionsVal = transactions.length;
  const streakVal = user.streak || 0;
  const levelVal = user.level || 1;
  const customersVal = customers.length;
  const perfectShiftsVal = parseInt(localStorage.getItem('duo_pos_perfect_shifts') || '1', 10);

  const getMetricValue = (metric: string) => {
    switch (metric) {
      case 'totalSales':
        return totalSalesVal;
      case 'totalTransactions':
        return totalTransactionsVal;
      case 'streak':
        return streakVal;
      case 'level':
        return levelVal;
      case 'customers':
        return customersVal;
      case 'perfectShifts':
        return perfectShiftsVal;
      default:
        return 0;
    }
  };

  const [selectedNodeId, setSelectedNodeId] = useState<string>('node-1');

  useEffect(() => {
    const firstUnclaimed = nodesData.find((node, index) => {
      const isUnlocked = index === 0 || user.progressionClaimed?.includes(nodesData[index - 1].id) || false;
      const isClaimed = user.progressionClaimed?.includes(node.id) || false;
      return isUnlocked && !isClaimed;
    });
    if (firstUnclaimed) {
      setSelectedNodeId(firstUnclaimed.id);
    }
  }, [user.progressionClaimed]);

  const handleClaimNode = (nodeId: string) => {
    const node = nodesData.find((n) => n.id === nodeId);
    if (!node) return;

    playSound('levelup');
    const claimedNodes = [...(user.progressionClaimed || []), nodeId];

    let updatedXp = user.xp + node.reward.xp;
    let currentLevel = user.level;
    let title = user.levelTitle;
    let didLevelUp = false;

    let neededXp = currentLevel * 100;
    while (updatedXp >= neededXp) {
      updatedXp -= neededXp;
      currentLevel += 1;
      neededXp = currentLevel * 100;
      didLevelUp = true;
    }

    if (didLevelUp) {
      const titles = [
        'Monolingüe Comercial 🦉',
        'Cajero de Bronce 🥉',
        'Supervisor de Rachas 🥈',
        'Experto en Finanzas 🥇',
        'Duo Maestro Glorioso 👑',
        'Dios del Escáner de Barras ⚡',
        'Socio Corporativo de Duo 💎',
      ];
      title = titles[Math.min(currentLevel - 1, titles.length - 1)];
      toast.achievement(`¡Subiste al nivel ${currentLevel}! Título: ${title}`, { title: '¡NIVEL ALCANZADO! 🎉' });
    }

    const nextGems = (user.gems ?? 40) + node.reward.gems;
    const nextGemsTotal = (user.gemsEarnedTotal ?? 0) + node.reward.gems;

    let nextUnlockedAccessories = [...(user.unlockedAccessories || [])];
    let nextUnlockedSkins = [...(user.unlockedSkins || [])];

    if (node.id === 'node-4') {
      const accessoryId = 'accessory-glasses';
      if (!nextUnlockedAccessories.includes(accessoryId)) {
        nextUnlockedAccessories.push(accessoryId);
        toast.achievement('¡Del cofre obtuviste Lentes de Sol 😎!', { title: '¡Cofre Reclamado! 🎁' });
      } else {
        toast.success('¡Del cofre obtuviste +20 gemas extra! 💎', { title: '¡Cofre Reclamado! 🎁' });
      }
    } else if (node.id === 'node-8') {
      const skinId = 'skin-retro';
      if (!nextUnlockedSkins.includes(skinId)) {
        nextUnlockedSkins.push(skinId);
        toast.achievement('¡Del cofre obtuviste la Skin Retro 8-Bits 🕹️!', { title: '¡Cofre Reclamado! 🎁' });
      } else {
        toast.success('¡Del cofre obtuviste +40 gemas extra! 💎', { title: '¡Cofre Reclamado! 🎁' });
      }
    } else if (node.id === 'node-10') {
      const accessoryId = 'accessory-corona';
      if (!nextUnlockedAccessories.includes(accessoryId)) {
        nextUnlockedAccessories.push(accessoryId);
        toast.achievement('¡Venciste al jefe final y desbloqueaste la Corona Real 👑!', {
          title: '¡CAMINO COMPLETADO! 🏆',
        });
      }
    }

    const nextUser: User = {
      ...user,
      xp: updatedXp,
      level: currentLevel,
      levelTitle: title,
      gems: nextGems,
      gemsEarnedTotal: nextGemsTotal,
      progressionClaimed: claimedNodes,
      unlockedAccessories: nextUnlockedAccessories,
      unlockedSkins: nextUnlockedSkins,
    };

    onUpdateUser(nextUser);
    toast.success(`¡Hito reclamado! Ganaste +${node.reward.xp} XP y +${node.reward.gems} Gemas 💎`, {
      title: 'Progreso del Camino',
    });
  };

  const points = [
    { x: 300, y: 750 },
    { x: 440, y: 680 },
    { x: 360, y: 600 },
    { x: 200, y: 540 },
    { x: 160, y: 460 },
    { x: 280, y: 390 },
    { x: 420, y: 330 },
    { x: 360, y: 250 },
    { x: 220, y: 180 },
    { x: 300, y: 90 },
  ];

  let furthestUnlockedIndex = 0;
  for (let i = 0; i < nodesData.length; i++) {
    const isUnlocked = i === 0 || user.progressionClaimed?.includes(nodesData[i - 1].id) || false;
    if (isUnlocked) {
      furthestUnlockedIndex = i;
    }
  }

  const activePathD = points
    .slice(0, furthestUnlockedIndex + 1)
    .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x},${p.y}`)
    .join(' ');

  return (
    <div className="space-y-6 text-left">
      <div className="bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-3xl p-5 md:p-6 text-white flex flex-col sm:flex-row items-center justify-between gap-5 border-b-[6px] border-cyan-705 shadow-md">
        <div className="space-y-1 text-center sm:text-left">
          <span className="bg-cyan-800/55 text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
            Progreso del Emprendedor
          </span>
          <h3 className="text-2xl font-black tracking-tight">Camino del Emprendedor DuoPOS</h3>
          <p className="text-xs text-cyan-100 font-semibold max-w-xl">
            Completa hitos operativos reales en el punto de venta para desbloquear cofres de gemas y coronarte como el
            Socio de Duo definitivo en la cima.
          </p>
        </div>
        <div className="bg-white/15 border border-white/20 p-3 px-4.5 rounded-2xl flex flex-col items-center justify-center shrink-0">
          <span className="text-[10px] font-black text-cyan-200 uppercase tracking-widest leading-none">
            HITOS RECLAMADOS
          </span>
          <span className="text-lg font-black font-mono tracking-tight mt-1">
            {user.progressionClaimed?.length || 0} / {nodesData.length}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left: Interactive Isometric SVG Path Map (2/3 width) */}
        <div className="lg:col-span-2 flex flex-col items-center">
          <div className="w-full bg-[#1e293b] border-2 border-slate-700 rounded-3xl p-4 flex justify-center shadow-lg relative overflow-hidden iso-grid-bg min-h-[500px]">
            {/* SVG Isometric Render */}
            <svg width="600" height="800" className="w-full h-auto max-w-[600px] drop-shadow-md select-none">
              <defs>
                <filter id="glow-pulsing" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="5" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Grid decorations */}
              <text x="240" y="720" className="text-2xl opacity-60">
                🌲
              </text>
              <text x="490" y="550" className="text-2xl opacity-60">
                🌳
              </text>
              <text x="120" y="420" className="text-3xl opacity-75 animate-bounce" style={{ animationDuration: '3s' }}>
                🏝️
              </text>
              <text x="480" y="320" className="text-2xl opacity-60">
                🌲
              </text>
              <text x="100" y="210" className="text-3xl opacity-40 animate-pulse" style={{ animationDuration: '6s' }}>
                ☁️
              </text>
              <text x="500" y="140" className="text-3xl opacity-40 animate-pulse" style={{ animationDuration: '8s' }}>
                ☁️
              </text>

              {/* Winding base pipeline (grey) */}
              <path
                d="M 300,750 L 440,680 L 360,600 L 200,540 L 160,460 L 280,390 L 420,330 L 360,250 L 220,180 L 300,90"
                stroke="#475569"
                strokeWidth="10"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />

              {/* Active segment pipeline (glowing/green) */}
              {points.slice(0, furthestUnlockedIndex + 1).length > 1 && (
                <path
                  d={activePathD}
                  stroke="#10b981"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  className="animate-pulse"
                />
              )}

              {/* Render Isometric Pillars and Nodes */}
              {nodesData.map((node, index) => {
                const isClaimed = user.progressionClaimed?.includes(node.id) || false;
                const isUnlocked = index === 0 || user.progressionClaimed?.includes(nodesData[index - 1].id) || false;
                const metricVal = getMetricValue(node.requirement.metric);
                const isCompleted = metricVal >= node.requirement.target;
                const isClaimable = isUnlocked && !isClaimed && isCompleted;
                const isSelected = selectedNodeId === node.id;

                // Pillar metrics
                const cx = node.x;
                const cy = node.y;
                const rx = 40;
                const ry = 20;
                const h = 20;

                // Colors based on status
                let topColor = '#64748b'; // Gray/locked
                let leftColor = '#475569';
                let rightColor = '#334155';

                if (isClaimed) {
                  topColor = '#38bdf8'; // Blue/claimed
                  leftColor = '#0284c7';
                  rightColor = '#0369a1';
                } else if (isClaimable) {
                  topColor = '#fbbf24'; // Yellow/claimable
                  leftColor = '#d97706';
                  rightColor = '#b45309';
                } else if (isUnlocked) {
                  topColor = '#10b981'; // Green/unlocked
                  leftColor = '#059669';
                  rightColor = '#047857';
                }

                if (node.type === 'boss' && !isClaimed) {
                  if (isClaimable) {
                    topColor = '#f59e0b';
                    leftColor = '#d97706';
                    rightColor = '#b45309';
                  } else {
                    topColor = '#ef4444'; // Red for active boss
                    leftColor = '#dc2626';
                    rightColor = '#b91c1c';
                  }
                }

                return (
                  <g
                    key={node.id}
                    className={`cursor-pointer group select-none transition-all duration-300 ${isSelected ? 'scale-105' : 'hover:scale-102'}`}
                    onClick={() => {
                      playSound('click');
                      setSelectedNodeId(node.id);
                    }}
                  >
                    {/* Selected pillar shadow ring */}
                    {isSelected && (
                      <ellipse
                        cx={cx}
                        cy={cy + 30}
                        rx={rx + 8}
                        ry={ry + 4}
                        fill="none"
                        stroke="#60a5fa"
                        strokeWidth="2.5"
                        strokeDasharray="4,4"
                        className="animate-spin-slow"
                      />
                    )}

                    {/* Left Side Face */}
                    <polygon
                      points={`${cx - rx},${cy + ry} ${cx},${cy + 2 * ry} ${cx},${cy + 2 * ry + h} ${cx - rx},${cy + ry + h}`}
                      fill={leftColor}
                    />

                    {/* Right Side Face */}
                    <polygon
                      points={`${cx},${cy + 2 * ry} ${cx + rx},${cy + ry} ${cx + rx},${cy + ry + h} ${cx},${cy + 2 * ry + h}`}
                      fill={rightColor}
                    />

                    {/* Top Diamond Face */}
                    <polygon
                      points={`${cx},${cy} ${cx + rx},${cy + ry} ${cx},${cy + 2 * ry} ${cx - rx},${cy + ry}`}
                      fill={topColor}
                      stroke={isSelected ? '#ffffff' : '#ffffff22'}
                      strokeWidth={isSelected ? '2' : '1'}
                      filter={isClaimable ? 'url(#glow-pulsing)' : ''}
                    />

                    {/* Emoji Label inside Node */}
                    <text
                      x={cx}
                      y={cy + ry + 4}
                      textAnchor="middle"
                      className="font-extrabold text-sm select-none"
                      fill="#ffffff"
                    >
                      {isClaimed
                        ? '✔️'
                        : node.type === 'chest'
                          ? '🎁'
                          : node.type === 'boss'
                            ? '👑'
                            : !isUnlocked
                              ? '🔒'
                              : index + 1}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Scroll indicator */}
            <div className="absolute bottom-3 right-3 bg-slate-800/80 border border-slate-700 text-white font-extrabold text-[9px] uppercase tracking-widest px-2.5 py-1 rounded-lg select-none">
              🧭 Mapa Serpenteante 2.5D
            </div>
          </div>
        </div>

        {/* Right: Selected Node Details */}
        <div className="space-y-4">
          {(() => {
            const node = nodesData.find((n) => n.id === selectedNodeId);
            if (!node) return null;

            const index = nodesData.indexOf(node);
            const isClaimed = user.progressionClaimed?.includes(node.id) || false;
            const isUnlocked = index === 0 || user.progressionClaimed?.includes(nodesData[index - 1].id) || false;
            const metricVal = getMetricValue(node.requirement.metric);
            const isCompleted = metricVal >= node.requirement.target;
            const isClaimable = isUnlocked && !isClaimed && isCompleted;
            const pct = Math.min(Math.round((metricVal / node.requirement.target) * 100), 100);

            let headerBg = 'from-slate-700 to-slate-800';
            let typeLabel = 'HITO OPERATIVO';
            if (node.type === 'chest') {
              headerBg = 'from-amber-500 to-amber-600';
              typeLabel = '🎁 COFRE DE PREMIOS';
            } else if (node.type === 'boss') {
              headerBg = 'from-red-500 to-red-600';
              typeLabel = '👑 JEFE FINAL';
            } else if (isClaimed) {
              headerBg = 'from-cyan-500 to-blue-600';
            } else if (isUnlocked) {
              headerBg = 'from-green-500 to-emerald-600';
            }

            return (
              <div className="bg-white border-2 border-gray-250 border-b-6 rounded-3xl overflow-hidden shadow-sm text-left">
                {/* Header */}
                <div className={`bg-gradient-to-r ${headerBg} p-4.5 text-white space-y-0.5`}>
                  <span className="bg-black/35 text-[7.5px] font-black uppercase px-2 py-0.5 rounded tracking-widest w-fit">
                    {typeLabel} #{index + 1}
                  </span>
                  <h4 className="text-base font-black tracking-tight">{node.title}</h4>
                </div>

                <div className="p-5 space-y-4.5">
                  <p className="text-xs text-gray-500 font-semibold leading-relaxed">{node.description}</p>

                  {/* Requirement Progress */}
                  <div className="space-y-1.5 bg-gray-50 border border-gray-150 p-3 rounded-xl">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">
                      Requisito de Desbloqueo
                    </span>
                    <div className="flex justify-between items-center text-xs font-black text-gray-700 leading-none">
                      <span>{node.metricName}</span>
                      <span className={isCompleted ? 'text-green-600' : 'text-gray-500'}>
                        {metricVal} / {node.requirement.target}
                      </span>
                    </div>

                    <div className="bg-gray-200 h-2 rounded-full overflow-hidden w-full mt-1">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${isCompleted ? 'bg-green-500' : 'bg-amber-400'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Rewards summary */}
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">
                      Recompensa al Reclamar
                    </span>
                    <div className="flex flex-wrap gap-2 pt-0.5">
                      <span className="bg-blue-50 border border-blue-100 text-blue-700 text-[10px] font-black px-2.5 py-1 rounded-lg">
                        +{node.reward.xp} XP
                      </span>
                      <span className="bg-amber-50 border border-amber-100 text-amber-700 text-[10px] font-black px-2.5 py-1 rounded-lg">
                        +{node.reward.gems} Gemas 💎
                      </span>
                    </div>
                    {node.id === 'node-4' && (
                      <span className="text-[10px] text-amber-700 font-bold block pt-1 animate-pulse">
                        🎁 ¡Un accesorio de búho sorpresa!
                      </span>
                    )}
                    {node.id === 'node-8' && (
                      <span className="text-[10px] text-amber-700 font-bold block pt-1 animate-pulse">
                        🎁 ¡Una skin de POS sorpresa!
                      </span>
                    )}
                    {node.id === 'node-10' && (
                      <span className="text-[10px] text-amber-700 font-bold block pt-1 animate-pulse">
                        👑 ¡Corona Real para el Búho!
                      </span>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="pt-2">
                    {isClaimed ? (
                      <button
                        type="button"
                        disabled
                        className="w-full bg-gray-100 border border-gray-200 text-gray-400 font-black text-xs uppercase py-2 px-4 rounded-xl cursor-not-allowed text-center"
                      >
                        Hito Reclamado ✔️
                      </button>
                    ) : isClaimable ? (
                      <button
                        type="button"
                        onClick={() => handleClaimNode(node.id)}
                        className="w-full bg-green-500 hover:bg-green-400 text-white font-black text-xs uppercase tracking-wider py-2 px-4 rounded-xl border-b-4 border-green-700 active:translate-y-0.5 active:border-b-0 cursor-pointer text-center animate-bounce shadow-md"
                      >
                        Reclamar Recompensa 🎉
                      </button>
                    ) : !isUnlocked ? (
                      <div className="text-center p-2 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                        <span className="text-gray-400 font-black text-xs uppercase block">HITO BLOQUEADO 🔒</span>
                        <span className="text-[9.5px] text-gray-400 font-semibold block leading-tight">
                          Completa y reclama los hitos anteriores en el camino.
                        </span>
                      </div>
                    ) : (
                      <div className="text-center p-2 bg-amber-50/50 border border-amber-100 rounded-xl space-y-1">
                        <span className="text-amber-700 font-black text-xs uppercase block">EN PROGRESO ⚡</span>
                        <span className="text-[9.5px] text-amber-650 font-semibold block leading-tight">
                          Alcanza la meta en tu panel de ventas diario para poder reclamar.
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
