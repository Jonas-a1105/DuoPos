import React from 'react';
import { useUserStore } from '../../stores/useUserStore';

export default function LevelUpCelebrateModal() {
  const levelUpAchieved = useUserStore((state) => state.levelUpAchieved);
  const setLevelUpAchieved = useUserStore((state) => state.setLevelUpAchieved);

  if (!levelUpAchieved) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#1cb0f6] flex flex-col items-center justify-center p-4 text-white text-center font-sans animate-scaleUp">
      <div className="max-w-md w-full space-y-6">
        <span className="text-9xl block select-none drop-shadow-lg transform animate-bounce duration-500">💎</span>
        <div className="space-y-2">
          <span className="text-xl font-black tracking-widest text-[#d2f09d] uppercase">
            ¡NUEVO LOGRO DESBLOQUEADO!
          </span>
          <h1 className="text-4xl md:text-5xl font-black leading-tight tracking-tight">
            ¡Subiste al Nivel {levelUpAchieved.newLevel}!
          </h1>
          <p className="text-sky-100 font-extrabold text-sm max-w-xs mx-auto pt-1 leading-normal uppercase">
            Has sido promovido al cargo oficial de:
            <br />
            <span className="bg-yellow-400 text-amber-950 font-black px-3.5 py-1 rounded-xl text-base inline-block border-2 border-white max-w-full truncate shadow-sm mt-3 animate-pulse">
              {levelUpAchieved.title}
            </span>
          </p>
        </div>

        <div className="bg-white/10 border border-white/20 rounded-2xl p-4 text-xs font-bold leading-relaxed max-w-sm mx-auto text-white">
          🎉 ¡Felicidades! Has expandido tu vocabulario comercial de DuoPOS. El búho Duo está inmensamente complacido
          por tu desempeño en racha.
        </div>

        <button
          onClick={() => setLevelUpAchieved(null)}
          className="w-full bg-white text-[#1cb0f6] border-b-[6px] border-[#dddddd] hover:bg-gray-50 active:border-b-0 active:translate-y-[6px] py-4 rounded-3xl font-black text-lg uppercase tracking-wider transition-all cursor-pointer"
        >
          ¡Continuar Trabajando!
        </button>
      </div>
    </div>
  );
}
