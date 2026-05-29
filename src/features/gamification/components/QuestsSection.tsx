import React from 'react';
import { Zap, CheckCircle2, Trophy, Sparkles, Flame, Gift, HelpCircle, RefreshCw } from 'lucide-react';
import AeroGuideModal from './AeroGuideModal';
import { playSound } from '../../../services/sounds';

interface Quest {
  id: string;
  title: string;
  description: string;
  target: number;
  current: number;
  xpReward: number;
  gemReward: number;
  icon: string;
  type: 'sale' | 'barcode' | 'customer' | 'invoice';
}

interface DailyQuest {
  id: string;
  title: string;
  description: string;
  target: number;
  current: number;
  xpReward: number;
  gemReward: number;
  icon: string;
  type: 'sale' | 'barcode' | 'customer' | 'invoice';
}

interface QuestsSectionProps {
  activeQuest: Quest | null;
  dailyQuests: DailyQuest[];
  onClaimQuestReward: (questId: string) => void;
  onTriggerExpressEvent: (type: 'happy_hour' | 'scan_challenge' | 'loyalty_challenge') => void;
  onSwitchTab?: (tab: 'quests' | 'leagues' | 'map' | 'season' | 'trophies' | 'store') => void;
}

const QuestsSection: React.FC<QuestsSectionProps> = ({
  activeQuest,
  dailyQuests,
  onClaimQuestReward,
  onTriggerExpressEvent,
  onSwitchTab,
}) => {
  const [isGuideOpen, setIsGuideOpen] = React.useState(false);

  const mapQuestTypeToEvent = (
    type: 'sale' | 'barcode' | 'customer' | 'invoice',
  ): 'happy_hour' | 'scan_challenge' | 'loyalty_challenge' => {
    if (type === 'sale') return 'happy_hour';
    if (type === 'barcode') return 'scan_challenge';
    return 'loyalty_challenge';
  };

  const getQuestProgressClass = (current: number, target: number) => {
    const progress = Math.min((current / target) * 100, 100);
    if (progress >= 100) return 'bg-[#58cc02]';
    if (progress >= 50) return 'bg-[#fbbf24]';
    return 'bg-gray-200';
  };

  const formatNumber = (num: number) => (num >= 1000 ? `${(num / 1000).toFixed(1)}k` : num.toString());

  return (
    <div className="space-y-6">
      {/* Active Quest Section */}
      {activeQuest && (
        <div className="bg-white border border-[#e5e5e5] rounded-xl p-5">
          <div className="flex items-start space-x-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[#58cc02] to-[#46a302] rounded-xl flex items-center justify-center text-white font-bold text-xs">
              {activeQuest.icon}
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex justify-between items-start">
                <h3 className="font-black">{activeQuest.title}</h3>
                <span className="text-sm text-[#58cc02] bg-[#58cc02]/20 px-2 py-0.5 rounded">
                  +{activeQuest.xpReward} XP
                </span>
              </div>
              <p className="text-gray-600">{activeQuest.description}</p>

              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-500">Progreso</span>
                  <span className="font-mono">
                    {formatNumber(activeQuest.current)} / {formatNumber(activeQuest.target)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${getQuestProgressClass(activeQuest.current, activeQuest.target)}`}
                    style={{ width: `${Math.min((activeQuest.current / activeQuest.target) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>

              {activeQuest.current >= activeQuest.target ? (
                <button
                  onClick={() => onClaimQuestReward(activeQuest.id)}
                  className="w-full mt-3 bg-[#58cc02] text-white py-2 rounded-lg font-black hover:bg-[#46a302] transition-colors"
                  disabled={false}
                >
                  Reclamar Recompensa
                </button>
              ) : (
                <button
                  onClick={() => onTriggerExpressEvent(activeQuest.type === 'sale' ? 'happy_hour' : 'scan_challenge')}
                  className="w-full mt-3 border border-[#58cc02] text-[#58cc02] py-2 rounded-lg font-black hover:bg-[#58cc02]/10 transition-colors"
                >
                  Activar Impulso
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Daily Quests Section */}
      <div className="bg-white border border-[#e5e5e5] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-lg">Misiones Diarias</h3>
          <button
            onClick={() => {
              playSound('click');
              if (onSwitchTab) {
                onSwitchTab('trophies');
              } else {
                onTriggerExpressEvent('loyalty_challenge');
              }
            }}
            className="text-sm text-[#58cc02] hover:text-[#46a302] cursor-pointer"
          >
            Ver todas
          </button>
        </div>

        <div className="space-y-3">
          {dailyQuests.map((quest) => (
            <div key={quest.id} className="flex items-start space-x-3 p-3 border border-[#f0f0f0] rounded-lg">
              <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center">{quest.icon}</div>
              <div className="flex-1 space-y-1">
                <div className="flex justify-between items-start">
                  <h4 className="font-black">{quest.title}</h4>
                  <span className="text-xs text-[#58cc02] bg-[#58cc02]/20 px-1.5 py-0 rounded">
                    +{quest.xpReward} XP
                  </span>
                </div>
                <p className="text-gray-600 text-sm">{quest.description}</p>

                <div className="mt-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">Progreso</span>
                    <span className="font-mono">
                      {formatNumber(quest.current)} / {formatNumber(quest.target)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${getQuestProgressClass(quest.current, quest.target)}`}
                      style={{ width: `${Math.min((quest.current / quest.target) * 100, 100)}%` }}
                    ></div>
                  </div>

                  {quest.current >= quest.target ? (
                    <button
                      onClick={() => onClaimQuestReward(quest.id)}
                      className="mt-1 w-full bg-[#58cc02] text-white text-xs py-1 rounded hover:bg-[#46a302] transition-colors"
                    >
                      Reclamar
                    </button>
                  ) : (
                    <button
                      onClick={() => onTriggerExpressEvent(mapQuestTypeToEvent(quest.type))}
                      className="mt-1 w-full border border-[#58cc02] text-[#58cc02] text-xs py-1 rounded hover:bg-[#58cc02]/10 transition-colors"
                    >
                      Impulsar
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {dailyQuests.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <RefreshCw size={24} className="mx-auto mb-3" />
              <p>Vuelve mañana para nuevas misiones diarias</p>
            </div>
          )}
        </div>
      </div>

      {/* Quest Info */}
      <div className="bg-white border border-[#e5e5e5] rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-black text-lg">Sobre las Misiones</h3>
          <button
            onClick={() => {
              playSound('click');
              setIsGuideOpen(true);
            }}
            className="text-sm text-[#58cc02] hover:text-[#46a302] cursor-pointer"
          >
            Aprender más
          </button>
        </div>

        <div className="space-y-4 text-sm">
          <div className="flex items-start space-x-3">
            <Zap size={20} className="mt-1 text-[#58cc02]" />
            <div>
              <p className="font-black">Misiones Activas</p>
              <p className="text-gray-600">Completa objetivos específicos para ganar XP y gems adicionales</p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <CheckCircle2 size={20} className="mt-1 text-[#58cc02]" />
            <div>
              <p className="font-black">Recompensas Inmediatas</p>
              <p className="text-gray-600">Reclama tus premios al completar misiones y continúa progresando</p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Trophy size={20} className="mt-1 text-[#58cc02]" />
            <div>
              <p className="font-black">Progreso Acumulado</p>
              <p className="text-gray-600">Cada misión completada te acerca a nuevos niveles y recompensas mayores</p>
            </div>
          </div>
        </div>
      </div>

      {/* 🦉 AERO DIDACTICAL GUIDE OVERLAY */}
      <AeroGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
    </div>
  );
};

export default QuestsSection;
