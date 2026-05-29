import React, { useState, useEffect, useMemo } from 'react';
import { User } from '../../../types';
import { playSound } from '../../../services/sounds';
import { toast } from '../../../components/Modal/FlashNotifications';

interface LeagueLeaderboardProps {
  user: User;
  onUpdateUser: (updatedUser: User) => void;
}

export default function LeagueLeaderboard({ user, onUpdateUser }: LeagueLeaderboardProps) {
  const [countdownStr, setCountdownStr] = useState('');

  // Helpers
  const capitalize = (str: string) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const getLeagueIcon = (tier: string) => {
    switch (tier) {
      case 'bronce':
        return '🥉';
      case 'plata':
        return '🥈';
      case 'oro':
        return '🥇';
      case 'zafiro':
        return '🔷';
      case 'rubi':
        return '🔺';
      case 'esmeralda':
        return '🟢';
      case 'diamante':
        return '💎';
      case 'obsidiana':
        return '♠️';
      default:
        return '🛡️';
    }
  };

  const getAvatarEmoji = (avatar: string) => {
    switch (avatar) {
      case 'duo':
        return '🦉';
      case 'lily':
        return '👧';
      case 'zari':
        return '💅';
      case 'eddy':
        return '🏃‍♂️';
      case 'junior':
        return '👦';
      default:
        return '🦉';
    }
  };

  const generateLeagueParticipants = (tier: string) => {
    const duolingoNames = [
      { name: 'Zari la Fashionista 💅', avatar: 'lily' },
      { name: 'Lily la Apática ✝️', avatar: 'lily' },
      { name: 'Oscar el Artista 🎨', avatar: 'eddy' },
      { name: 'Vikram el Chef 🍛', avatar: 'junior' },
      { name: 'Eddy el Entrenador 🏃‍♂️', avatar: 'eddy' },
      { name: 'Junior el Curioso 👦', avatar: 'junior' },
      { name: 'Lucy la Enigmática 💁‍♀️', avatar: 'lily' },
      { name: 'Falstaff el Oso 🐻', avatar: 'duo' },
      { name: 'Bea la Entusiasta 🐝', avatar: 'lily' },
      { name: 'Lin la Sabia 👵', avatar: 'lily' },
      { name: 'Ari el Loro 🦜', avatar: 'duo' },
      { name: 'Bari el Panda 🐼', avatar: 'duo' },
      { name: 'Cari el Koala 🐨', avatar: 'duo' },
      { name: 'Duo Ayudante 🦉', avatar: 'duo' },
      { name: 'Pato el Pato 🦆', avatar: 'duo' },
    ];

    const shuffledNames = [...duolingoNames].sort(() => 0.5 - Math.random()).slice(0, 14);

    let baseMultiplier = 1;
    switch (tier) {
      case 'bronce':
        baseMultiplier = 1;
        break;
      case 'plata':
        baseMultiplier = 1.5;
        break;
      case 'oro':
        baseMultiplier = 2;
        break;
      case 'zafiro':
        baseMultiplier = 2.5;
        break;
      case 'rubi':
        baseMultiplier = 3;
        break;
      case 'esmeralda':
        baseMultiplier = 3.5;
        break;
      case 'diamante':
        baseMultiplier = 4;
        break;
      case 'obsidiana':
        baseMultiplier = 5;
        break;
    }

    return shuffledNames.map((item, idx) => {
      const randomXp = Math.floor((Math.random() * 150 + 20) * baseMultiplier);
      return {
        id: `sim-user-${idx}-${tier}`,
        name: item.name,
        avatar: item.avatar,
        weeklyXp: randomXp,
        league: tier as any,
      };
    });
  };

  const [leagueData, setLeagueData] = useState<{
    tier: string;
    participants: Array<{ id: string; name: string; avatar: string; weeklyXp: number; league: string }>;
  }>(() => {
    const currentTier = user.employeeLeague || 'bronce';
    const saved = localStorage.getItem('duo_pos_weekly_league');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.tier === currentTier) {
          return parsed;
        }
      } catch (e) {}
    }

    const newParticipants = generateLeagueParticipants(currentTier);
    const data = {
      tier: currentTier,
      participants: newParticipants,
    };
    localStorage.setItem('duo_pos_weekly_league', JSON.stringify(data));
    return data;
  });

  const sortedLeaderboard = useMemo(() => {
    const userParticipant = {
      id: user.id || 'current-user-cajero',
      name: `${user.username} (Tú) 🦉`,
      avatar: user.avatar || 'duo',
      weeklyXp: user.weeklyXp ?? 0,
      league: user.employeeLeague || 'bronce',
      isCurrentUser: true,
    };

    const filteredSimulated = leagueData.participants
      .filter((p) => p.id !== userParticipant.id)
      .map((p) => ({ ...p, isCurrentUser: false }));
    const combined = [...filteredSimulated, userParticipant];

    return combined.sort((a, b) => b.weeklyXp - a.weeklyXp);
  }, [leagueData, user.weeklyXp, user.employeeLeague, user.username, user.avatar, user.id]);

  useEffect(() => {
    const getNextMondayCountdown = () => {
      const now = new Date();
      const resultDate = new Date();
      resultDate.setDate(now.getDate() + ((7 - now.getDay()) % 7 || 7));
      resultDate.setHours(0, 0, 0, 0);

      const diffMs = resultDate.getTime() - now.getTime();
      if (diffMs <= 0) return 'Quedan 0s';

      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      return `${days}d ${hours}h ${minutes}m`;
    };

    setCountdownStr(getNextMondayCountdown());
    const timer = setInterval(() => {
      setCountdownStr(getNextMondayCountdown());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const handleSimulateWeeklyXp = () => {
    playSound('success');
    const addedXp = 50;
    let nextXp = user.xp + addedXp;
    let nextLevel = user.level;
    let nextTitle = user.levelTitle;
    let didLevelUp = false;

    let neededXp = nextLevel * 100;
    while (nextXp >= neededXp) {
      nextXp -= neededXp;
      nextLevel += 1;
      neededXp = nextLevel * 100;
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
      nextTitle = titles[Math.min(nextLevel - 1, titles.length - 1)];
      toast.achievement(`¡Subiste al nivel ${nextLevel}! Título: ${nextTitle}`, { title: '¡NIVEL ALCANZADO! 🎉' });
    }

    const updatedUser: User = {
      ...user,
      xp: nextXp,
      level: nextLevel,
      levelTitle: nextTitle,
      weeklyXp: (user.weeklyXp ?? 0) + addedXp,
    };
    onUpdateUser(updatedUser);
    toast.success('¡Se simularon +50 XP semanales! Mira tu posición en la tabla.', { title: 'Simulación de XP' });
  };

  const handleSimulateLeagueEnd = () => {
    const userRankIndex = sortedLeaderboard.findIndex((p) => p.isCurrentUser);
    const rank = userRankIndex + 1;

    const currentTier = user.employeeLeague || 'bronce';
    const tierOrder = ['bronce', 'plata', 'oro', 'zafiro', 'rubi', 'esmeralda', 'diamante', 'obsidiana'];
    const currentTierIndex = tierOrder.indexOf(currentTier);

    let nextTier = currentTier as any;
    let message = '';
    let status = 'safe';

    if (rank <= 5) {
      if (currentTierIndex < tierOrder.length - 1) {
        nextTier = tierOrder[currentTierIndex + 1];
        status = 'promo';
        message = `¡Felicidades! Terminaste en el puesto #${rank} (Top 5). ¡Ascendiste a la Liga ${nextTier.toUpperCase()}! 🏆✨`;
        playSound('levelup');
      } else {
        message = `¡Increíble! Terminaste en el puesto #${rank} en la Liga de Obsidiana. ¡Mantienes tu título de Campeón Supremo! 👑`;
        playSound('success');
      }
    } else if (rank >= 11) {
      if (currentTierIndex > 0) {
        nextTier = tierOrder[currentTierIndex - 1];
        status = 'demote';
        message = `Cuidado: Terminaste en el puesto #${rank} (Últimos 5). Descendiste a la Liga ${nextTier.toUpperCase()}. ¡Rachas y ventas te ayudarán a subir! 💔`;
        playSound('error');
      } else {
        message = `Terminaste en el puesto #${rank} en la Liga de Bronce. Mantienes la categoría pero debes esforzarte más. 🦉`;
        playSound('click');
      }
    } else {
      message = `Terminaste en el puesto #${rank} (Zona Segura). ¡Te mantienes en la Liga ${currentTier.toUpperCase()}! Sigue sumando XP. 🛡️`;
      playSound('click');
    }

    const updatedUser: User = {
      ...user,
      employeeLeague: nextTier,
      weeklyXp: 0,
    };

    const newParticipants = generateLeagueParticipants(nextTier);
    const data = {
      tier: nextTier,
      participants: newParticipants,
    };
    localStorage.setItem('duo_pos_weekly_league', JSON.stringify(data));
    setLeagueData(data);

    onUpdateUser(updatedUser);

    if (status === 'promo') {
      toast.achievement(message, { title: '¡ASCENSO CONSEGUIDO! ⚔️' });
    } else if (status === 'demote') {
      toast.error(message, { title: 'Descenso de Liga ⚠️' });
    } else {
      toast.info(message, { title: 'Liga Semanal Finalizada' });
    }
  };

  const activeSkin = user.activeSkin || 'standard';
  const isDark = ['dark-galaxy', 'neon-cyberpunk', 'emerald-palace', 'retro-8bit', 'executive-gold', 'deep-ocean'].includes(activeSkin);

  return (
    <div className="space-y-6 text-left">
      {/* Header Card with current league information */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-650 rounded-3xl p-5 md:p-6 text-white flex flex-col md:flex-row items-center justify-between gap-5 border-b-[6px] border-indigo-750 shadow-md">
        <div className="flex items-center gap-4.5 text-center md:text-left flex-col md:flex-row">
          <div className="bg-white/10 p-4 h-16 w-16 rounded-2xl text-4xl flex items-center justify-center border border-white/20 shadow-inner select-none shrink-0 font-mono animate-pulse">
            {getLeagueIcon(user.employeeLeague || 'bronce')}
          </div>
          <div className="space-y-1">
            <span className="bg-indigo-850/55 text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
              Liga de Cajeros Semanal
            </span>
            <h3 className="text-2xl font-black tracking-tight">Liga {capitalize(user.employeeLeague || 'bronce')}</h3>
            <p className="text-xs text-indigo-100 font-semibold max-w-xl">
              Competencia entre cajeros de la sucursal. Los 5 primeros ascienden de división y los 5 últimos descienden.
              ¡Suma XP con cada venta y cobra tu racha!
            </p>
          </div>
        </div>

        {/* Countdown widget */}
        <div className="bg-white/15 border border-white/20 p-3 px-4.5 rounded-2xl flex flex-col items-center md:items-end justify-center shrink-0">
          <span className="text-[10px] font-black text-indigo-200 uppercase tracking-widest leading-none">
            PRÓXIMO REINICIO
          </span>
          <span className="text-lg font-black font-mono tracking-tight mt-1 flex items-center gap-1.5">
            ⏱️ {countdownStr}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leaderboard Column (2/3 width) */}
        <div className="lg:col-span-2 space-y-4">
          <div className={`border-2 border-b-6 rounded-3xl p-4 md:p-5 space-y-4 shadow-sm transition-colors duration-300 ${
            isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-250'
          }`}>
            <div className={`flex items-center justify-between border-b pb-3 transition-colors duration-300 ${
              isDark ? 'border-zinc-800' : 'border-gray-150'
            }`}>
              <h4 className={`font-extrabold text-sm uppercase tracking-wider transition-colors duration-300 ${
                isDark ? 'text-zinc-200' : 'text-[#3c3c3c]'
              }`}>Tabla de Clasificación</h4>
              <span className={`border text-[10px] px-2 py-0.5 rounded-md font-black transition-colors duration-300 ${
                isDark ? 'bg-indigo-950/40 border-indigo-900 text-indigo-300' : 'bg-indigo-50 border-indigo-100 text-indigo-705'
              }`}>
                Participantes: {sortedLeaderboard.length}
              </span>
            </div>

            <div className={`divide-y max-h-[500px] overflow-y-auto pr-1 transition-colors duration-300 ${
              isDark ? 'divide-zinc-800' : 'divide-gray-100'
            }`}>
              {sortedLeaderboard.map((participant, index) => {
                const rank = index + 1;
                const isUser = participant.isCurrentUser;

                // Zone formatting
                let zoneBg = '';
                let rankBadge = '';
                if (rank <= 5) {
                  zoneBg = isDark ? 'bg-emerald-950/20 hover:bg-emerald-950/30' : 'bg-green-50/45 hover:bg-green-50';
                  rankBadge = 'bg-emerald-600 text-white';
                } else if (rank >= 11) {
                  zoneBg = isDark ? 'bg-rose-950/20 hover:bg-rose-950/30' : 'bg-red-50/45 hover:bg-red-50';
                  rankBadge = 'bg-rose-600 text-white';
                } else {
                  zoneBg = isDark ? 'hover:bg-zinc-800/40' : 'hover:bg-gray-50';
                  rankBadge = isDark 
                    ? 'bg-zinc-800 text-zinc-400 border border-zinc-700' 
                    : 'bg-gray-100 text-gray-500 border border-gray-200';
                }

                return (
                  <div
                    key={participant.id}
                    className={`flex items-center justify-between p-3.5 transition-all duration-300 rounded-xl my-1.5 ${zoneBg} ${
                      isUser
                        ? isDark
                          ? 'ring-2 ring-indigo-500 bg-indigo-950/40 border border-indigo-900 font-extrabold shadow-sm'
                          : 'ring-2 ring-indigo-400 bg-indigo-50/40 border border-indigo-250 font-extrabold shadow-sm'
                        : ''
                    }`}
                  >
                    {/* Rank and Identity */}
                    <div className="flex items-center gap-3">
                      <span
                        className={`h-6.5 w-6.5 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${rankBadge}`}
                      >
                        {rank}
                      </span>

                      <div className={`border p-1.5 h-10 w-10 rounded-xl flex items-center justify-center text-xl shadow-xs select-none transition-colors duration-300 ${
                        isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-gray-200'
                      }`}>
                        {getAvatarEmoji(participant.avatar)}
                      </div>

                      <div className="space-y-0.5 text-left">
                        <span
                          className={`text-xs tracking-tight flex items-center gap-1.5 transition-colors duration-300 ${
                            isUser 
                              ? isDark ? 'font-black text-indigo-300 text-sm' : 'font-black text-indigo-950 text-sm' 
                              : isDark ? 'font-bold text-zinc-200' : 'font-bold text-gray-800'
                          }`}
                        >
                          {participant.name}
                          {isUser && (
                            <span className="bg-indigo-650 text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded">
                              TÚ
                            </span>
                          )}
                        </span>
                        <span className="text-[10px] font-extrabold flex items-center gap-1 leading-none transition-colors duration-300">
                          {rank <= 5 ? (
                            <span className="text-emerald-500">🔺 Zona de Ascenso</span>
                          ) : rank >= 11 ? (
                            <span className="text-rose-500">🔻 Zona de Descenso</span>
                          ) : (
                            <span className={isDark ? 'text-zinc-500' : 'text-gray-400'}>🛡️ Zona Segura</span>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* XP display */}
                    <div className="flex items-center gap-4">
                      <div className="text-right shrink-0">
                        <span className={`text-sm font-black font-mono transition-colors duration-300 ${
                          isDark ? 'text-zinc-200' : 'text-gray-700'
                        }`}>{participant.weeklyXp}</span>
                        <span className={`text-[9px] font-black block leading-none transition-colors duration-300 ${
                          isDark ? 'text-zinc-500' : 'text-gray-400'
                        }`}>XP</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar Column: Rules and Simulator (1/3 width) */}
        <div className="space-y-4 text-left">
          {/* Rules summary Card */}
          <div className={`border-2 border-b-6 rounded-3xl p-5 space-y-3.5 shadow-sm transition-colors duration-300 ${
            isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-250'
          }`}>
            <h4 className={`font-extrabold text-sm uppercase tracking-wide flex items-center gap-1 transition-colors duration-300 ${
              isDark ? 'text-zinc-200' : 'text-gray-800'
            }`}>
              <span>ℹ️ Reglas de División</span>
            </h4>
            <div className={`space-y-3 text-xs font-semibold leading-relaxed transition-colors duration-300 ${
              isDark ? 'text-zinc-400' : 'text-gray-500'
            }`}>
              <div className="flex items-start gap-2.5">
                <span className="text-emerald-500 text-sm mt-0.5">🔺</span>
                <p>
                  <strong>Zona de Ascenso (Top 5)</strong>: Finaliza la semana aquí para subir de liga y conseguir un
                  ascenso de división 🏆✨.
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className={isDark ? 'text-zinc-550' : 'text-gray-400'}>🛡️</span>
                <p>
                  <strong>Zona Segura (Puestos 6-10)</strong>: Mantienes tu división actual. No hay cambios de tier.
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="text-rose-500 text-sm mt-0.5">🔻</span>
                <p>
                  <strong>Zona de Descenso (Bottom 5)</strong>: Si estás por encima de la liga Bronce, bajarás de
                  división al cierre de la semana ⚠️.
                </p>
              </div>
            </div>
          </div>

          {/* Simulation Card */}
          <div className={`border rounded-3xl p-5 space-y-4 transition-colors duration-300 ${
            isDark ? 'bg-indigo-950/25 border-indigo-900/60' : 'bg-indigo-50/50 border-indigo-250'
          }`}>
            <h4 className={`font-black text-xs uppercase tracking-widest flex items-center gap-1 transition-colors duration-300 ${
              isDark ? 'text-indigo-300' : 'text-indigo-900'
            }`}>
              <span>🕹️ Herramientas de Liga</span>
            </h4>
            <p className={`text-xs font-semibold leading-normal transition-colors duration-300 ${
              isDark ? 'text-indigo-200/70' : 'text-indigo-955/70'
            }`}>
              Utiliza los simuladores de liga para probar instantáneamente la animación y progresión de las divisiones
              semanales:
            </p>
            <div className="flex flex-col gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleSimulateWeeklyXp}
                className={`w-full border-2 border-b-4 font-black text-xs py-2 px-3.5 rounded-xl transition-all active:translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer ${
                  isDark 
                    ? 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-200 active:border-b-2' 
                    : 'bg-white hover:bg-gray-50 border-indigo-200 text-[#3c3c3c]'
                }`}
              >
                ⚡ Simular +50 XP Semanal
              </button>
              <button
                type="button"
                onClick={handleSimulateLeagueEnd}
                className="w-full bg-indigo-650 hover:bg-indigo-750 text-white font-black text-xs py-2 px-3.5 rounded-xl border-b-4 border-indigo-900 transition-all active:translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-105"
              >
                🏁 Simular Fin de Semana
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
