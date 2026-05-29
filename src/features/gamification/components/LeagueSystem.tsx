import React from 'react';
import { Trophy, Flame, TrendingUp, Crown, ShieldAlert, HelpCircle, ChevronRight, Coins } from 'lucide-react';

interface LeagueData {
  userTier: string;
  userXp: number;
  userAvatar: string;
  userName: string;
  leagueName: string;
  leagueSize: number;
  leagueIcon: string;
  leagueParticipants: Array<{
    name: string;
    avatar: string;
    xp: number;
    isUser: boolean;
  }>;
  xpToNextTier: number;
  xpNeededForCurrentTier: number;
  leagueProgress: number;
}

interface LeagueSystemProps {
  leagueData: LeagueData;
  onTriggerExpressEvent: (type: 'happy_hour' | 'scan_challenge' | 'loyalty_challenge') => void;
}

const LeagueSystem: React.FC<LeagueSystemProps> = ({ leagueData, onTriggerExpressEvent }) => {
  const {
    userTier,
    userXp,
    userAvatar,
    userName,
    leagueName,
    leagueSize,
    leagueIcon,
    leagueParticipants,
    xpToNextTier,
    xpNeededForCurrentTier,
    leagueProgress,
  } = leagueData;

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

  return (
    <div className="space-y-6">
      {/* League Header */}
      <div className="bg-white border border-[#e5e5e5] rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">{leagueIcon}</div>
            <div>
              <h3 className="font-black text-lg">{leagueName} League</h3>
              <p className="text-sm text-gray-500">{leagueSize} jugadores</p>
            </div>
          </div>
          <button
            onClick={() => onTriggerExpressEvent('happy_hour')}
            className="text-sm text-[#58cc02] hover:text-[#46a302]"
          >
            Activar Hora Feliz
          </button>
        </div>

        {/* User Progress */}
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-[#58cc02]/20 rounded-full flex items-center justify-center text-[#58cc02] font-bold">
              {getAvatarEmoji(userAvatar)}
            </div>
            <div>
              <p className="font-black">{userName}</p>
              <p className="text-sm text-gray-500">Nivel {userTier}</p>
            </div>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-[#58cc02] h-full rounded-full transition-all duration-500"
              style={{ width: `${leagueProgress}%` }}
            ></div>
          </div>

          <div className="text-sm text-gray-600 flex justify-between">
            <span>{userXp} XP</span>
            <span>
              {xpToNextTier} XP para nivel {Number(userTier.replace(/\D/g, '') || '0') + 1}
            </span>
          </div>
        </div>
      </div>

      {/* League Table */}
      <div className="bg-white border border-[#e5e5e5] rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-lg">Clasificación</h3>
          <span className="text-sm text-gray-500">Actualizado hace 2m</span>
        </div>

        <div className="space-y-2">
          {leagueParticipants.map((participant, index) => (
            <div
              key={participant.name}
              className="flex items-center space-x-3 p-2 border-b border-[#f0f0f0] last:border-b-0"
            >
              <div className="flex items-center space-x-2">
                <div
                  className={`w-8 h-8 ${participant.isUser ? 'bg-[#58cc02]/20 rounded-full' : 'bg-gray-100 rounded-full'} flex items-center justify-center`}
                >
                  {participant.isUser ? (
                    <span className="text-[#58cc02] font-bold">{getAvatarEmoji(participant.avatar)}</span>
                  ) : (
                    <span className="text-gray-600">{getAvatarEmoji(participant.avatar)}</span>
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-black">{participant.name}</p>
                  <p className="text-xs text-gray-500">Nivel {participant.isUser ? 'Actual' : '??'}</p>
                </div>
              </div>
              <div className="text-right text-gray-600 font-mono">{participant.xp.toLocaleString()} XP</div>
              {participant.isUser && (
                <div className="flex items-center space-x-2 text-[#58cc02] text-xs">
                  <Coins size={16} />
                  <span>+{Math.floor(participant.xp * 0.1)} gems esta semana</span>
                </div>
              )}
            </div>
          ))}

          {/* Show more participants if league is large */}
          {leagueSize > leagueParticipants.length && (
            <div className="text-center py-3 text-sm text-gray-500">
              y {leagueSize - leagueParticipants.length} más...
            </div>
          )}
        </div>
      </div>

      {/* League Info */}
      <div className="bg-white border border-[#e5e5e5] rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-black text-lg">Cómo funciona</h3>
          <button className="text-sm text-[#58cc02] hover:text-[#46a302]">Ver detalles</button>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex items-start space-x-3">
            <Trophy size={20} className="mt-1 text-[#58cc02]" />
            <div>
              <p className="font-black">Gana XP en cada venta</p>
              <p className="text-gray-600">Cada transacción te otorga XP basado en el monto y productos vendidos</p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Flame size={20} className="mt-1 text-[#58cc02]" />
            <div>
              <p className="font-black">Mantén tu racha</p>
              <p className="text-gray-600">
                Vende algo cada día para aumentar tu racha diaria y obtener bonificaciones
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <ShieldAlert size={20} className="mt-1 text-[#58cc02]" />
            <div>
              <p className="font-black">Desbloquea recompensas</p>
              <p className="text-gray-600">
                Al alcanzar ciertos niveles, desbloqueas skins, poderes y títulos exclusivos
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeagueSystem;
