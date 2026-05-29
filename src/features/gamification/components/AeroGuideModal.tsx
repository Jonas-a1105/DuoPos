import React, { useState } from 'react';
import { playSound } from '../../../services/sounds';
import { X, ArrowRight, ArrowLeft, Zap, Flame, Trophy, Coins } from 'lucide-react';

interface AeroGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SLIDES = [
  {
    title: '¡Te doy la bienvenida, Cajero! 🦉',
    description: 'Hola, soy Aero, tu mentor financiero en la sucursal. En DuoPOS, cada transacción, arqueo de caja y registro de clientes te otorga puntos de experiencia (XP) para subir de nivel y desbloquear jugosas recompensas contables. ¡Facturar nunca fue tan divertido!',
    icon: '🦉',
    color: 'from-emerald-400 to-emerald-600',
    details: 'Cada venta te otorga +10 XP. Escanear códigos de barra suma +15 XP.'
  },
  {
    title: 'Rachas y Multiplicadores 🔥',
    description: '¿Ves la llama de racha en tu cabecera? Representa los días consecutivos que has mantenido tu caja activa. Cuantos más días de racha, mayor es tu multiplicador. ¡Activa impulsos express como la "Hora Feliz" en tu Pase para obtener doble XP temporal!',
    icon: '🔥',
    color: 'from-orange-400 to-red-500',
    details: 'Usa boosters de pociones de XP ganadas para duplicar tu rendimiento.'
  },
  {
    title: 'Ligas y Leaderboards Semanales ⚔️',
    description: 'Compite sanamente con el resto de los cajeros en la clasificación semanal. Factura rápido y con precisión para asegurar tu puesto en la zona de ascenso a Ligas de prestigio como Oro, Esmeralda o la legendaria Obsidiana. ¡Pero cuidado con la zona de descenso!',
    icon: '🏆',
    color: 'from-purple-500 to-indigo-600',
    details: 'Los 3 primeros puestos de cada liga obtienen bonos especiales de gemas.'
  },
  {
    title: 'Gemas VIP y Tienda del Club 💎',
    description: 'Completa tus Misiones Diarias y objetivos especiales para llenar tu cofre de gemas loyalty. Utilízalas en la tienda para comprar skins exclusivas para Aero (como la skin Retro 8-Bits o Ejecutivo de Oro), boosters de racha, o ítems didácticos.',
    icon: '💎',
    color: 'from-amber-400 to-amber-600',
    details: '¡Canjea gemas por multiplicadores y accesorios para fardar en la liga!'
  }
];

export default function AeroGuideModal({ isOpen, onClose }: AeroGuideModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  if (!isOpen) return null;

  const handleNext = () => {
    playSound('click');
    if (currentSlide < SLIDES.length - 1) {
      setCurrentSlide(prev => prev + 1);
    } else {
      playSound('success');
      onClose();
    }
  };

  const handlePrev = () => {
    playSound('click');
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  };

  const slide = SLIDES[currentSlide];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn text-gray-800">
      <div className="bg-white border-4 border-gray-205 border-b-[10px] rounded-3xl max-w-lg w-full p-6 space-y-6 relative text-left transition-all">
        {/* Close Button */}
        <button
          onClick={() => {
            playSound('click');
            onClose();
          }}
          className="absolute right-4 top-4 p-2 text-gray-400 hover:text-gray-600 rounded-full transition-colors"
        >
          <X size={20} />
        </button>

        {/* Visual Header Mascot display */}
        <div className={`w-full bg-gradient-to-br ${slide.color} h-40 rounded-2xl flex items-center justify-center text-6xl shadow-inner relative overflow-hidden transition-all duration-300`}>
          <div className="absolute inset-0 opacity-10 text-[100px] pointer-events-none select-none font-bold -translate-x-1/4 -translate-y-1/4">
            {slide.icon}
          </div>
          <span className="animate-bounce select-none z-10">{slide.icon}</span>
        </div>

        {/* Content */}
        <div className="space-y-3 min-h-[160px] flex flex-col justify-between">
          <div className="space-y-2">
            <h3 className="text-xl md:text-2xl font-black text-gray-800 tracking-tight leading-snug">
              {slide.title}
            </h3>
            <p className="text-xs md:text-sm text-gray-500 font-bold leading-relaxed">
              {slide.description}
            </p>
          </div>

          {/* Quick Tip info panel */}
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[10px] md:text-xs text-gray-600 font-extrabold flex items-center gap-2 select-none">
            <span>💡 Tip:</span>
            <span>{slide.details}</span>
          </div>
        </div>

        {/* Navigation Indicator / Slides Counter dots */}
        <div className="flex justify-between items-center pt-2">
          <div className="flex gap-1.5">
            {SLIDES.map((_, i) => (
              <span
                key={i}
                className={`h-2.5 rounded-full transition-all ${i === currentSlide ? 'w-6 bg-[#1cb0f6]' : 'w-2.5 bg-gray-200'}`}
              />
            ))}
          </div>

          <div className="flex gap-2 text-xs">
            {currentSlide > 0 && (
              <button
                onClick={handlePrev}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 font-black rounded-xl border border-b-4 border-slate-300 transition-all uppercase tracking-wider text-gray-650 flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft size={14} /> Atrás
              </button>
            )}
            <button
              onClick={handleNext}
              className="py-2.5 px-4 bg-[#58cc02] text-white hover:bg-[#61e002] font-black rounded-xl border-b-4 border-green-700 transition-all uppercase tracking-wider flex items-center gap-1.5 cursor-pointer active:translate-y-0.5 active:border-b-2"
            >
              <span>{currentSlide === SLIDES.length - 1 ? '¡Listo, Duo! ⚡' : 'Siguiente'}</span>
              {currentSlide < SLIDES.length - 1 && <ArrowRight size={14} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
