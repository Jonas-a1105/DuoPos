/**
 * AeroMascot.tsx — Fénix Aero SVG Interactivo y Reactivo (StockMaster Pro)
 * Componente SVG modular de alta fidelidad que evoluciona por niveles y expresa emociones.
 */
import React, { useEffect, useState } from 'react';

export type AeroMood = 'neutral' | 'happy' | 'sad' | 'crying' | 'smart' | 'sleepy' | 'sleeping' | 'party';

interface AeroMascotProps {
  size?: number;
  activeAccessory?: string;
  mood?: AeroMood;
  level?: number;
  animate?: boolean;
  showSparkles?: boolean;
  className?: string;
}

const AeroMascot: React.FC<AeroMascotProps> = ({
  size = 64,
  activeAccessory,
  mood = 'neutral',
  level = 1,
  animate = true,
  showSparkles = false,
  className = ''
}) => {
  const [isBlinking, setIsBlinking] = useState(false);

  // Parpadeo periódico en estado neutral
  useEffect(() => {
    if (mood !== 'neutral' || !animate) return;
    const interval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 180);
    }, 4000 + Math.random() * 2000);
    return () => clearInterval(interval);
  }, [mood, animate]);

  // Dimensiones del ViewBox
  const vb = '0 0 120 140';

  // Determinar la etapa de evolución según el nivel del usuario
  let stage: 'baby' | 'teen' | 'adult' | 'celestial' = 'baby';
  if (level >= 5 && level < 10) stage = 'teen';
  else if (level >= 10 && level < 20) stage = 'adult';
  else if (level >= 20) stage = 'celestial';

  // ─── Ojos Reactivos de Aero ───
  const renderEyes = () => {
    if (mood === 'happy' || mood === 'party') {
      return (
        <g className="aero-eyes-happy">
          {/* Ojo izquierdo feliz (arco) */}
          <path d="M36 58 Q42 49 48 58" fill="none" stroke="#2c1401" strokeWidth="3.5" strokeLinecap="round" />
          {/* Ojo derecho feliz (arco) */}
          <path d="M72 58 Q78 49 84 58" fill="none" stroke="#2c1401" strokeWidth="3.5" strokeLinecap="round" />
        </g>
      );
    }

    if (mood === 'sad' || mood === 'crying') {
      return (
        <g className="aero-eyes-sad">
          {/* Ojo izquierdo */}
          <ellipse cx="40" cy="58" rx="8" ry="9" fill="white" stroke="#2c1401" strokeWidth="1.5" />
          <ellipse cx="41" cy="60" rx="4" ry="4.5" fill="#2c1401" />
          <ellipse cx="43" cy="58" rx="1.5" ry="1.5" fill="white" />
          <path d="M32 48 Q38 44 46 48" fill="none" stroke="#2c1401" strokeWidth="2.5" strokeLinecap="round" />
          {/* Ojo derecho */}
          <ellipse cx="80" cy="58" rx="8" ry="9" fill="white" stroke="#2c1401" strokeWidth="1.5" />
          <ellipse cx="79" cy="60" rx="4" ry="4.5" fill="#2c1401" />
          <ellipse cx="77" cy="58" rx="1.5" ry="1.5" fill="white" />
          <path d="M74 48 Q82 44 88 48" fill="none" stroke="#2c1401" strokeWidth="2.5" strokeLinecap="round" />
          {/* Lágrimas en modo crying */}
          {mood === 'crying' && (
            <g className="aero-tears" opacity="0.85">
              <path d="M38 68 C38 74 34 76 34 76 C34 76 32 74 32 68 Z" fill="#00d9ff" />
              <path d="M82 68 C82 74 86 76 86 76 C86 76 88 74 88 68 Z" fill="#00d9ff" />
            </g>
          )}
        </g>
      );
    }

    if (mood === 'sleepy' || mood === 'sleeping') {
      return (
        <g className="aero-eyes-sleepy">
          <path d="M34 58 Q40 62 46 58" fill="none" stroke="#2c1401" strokeWidth="3" strokeLinecap="round" />
          <path d="M74 58 Q80 62 86 58" fill="none" stroke="#2c1401" strokeWidth="3" strokeLinecap="round" />
          {/* Efecto Zzz */}
          <text className="duo-zzz duo-zzz-1" x="98" y="32" fontSize="12" fontWeight="900" fill="#f59e0b" opacity="0.85">Z</text>
          <text className="duo-zzz duo-zzz-2" x="106" y="20" fontSize="9" fontWeight="900" fill="#fbbf24" opacity="0.65">z</text>
        </g>
      );
    }

    if (isBlinking) {
      return (
        <g className="aero-eyes-blink">
          <path d="M34 58 Q40 60 46 58" fill="none" stroke="#2c1401" strokeWidth="3" strokeLinecap="round" />
          <path d="M74 58 Q80 60 86 58" fill="none" stroke="#2c1401" strokeWidth="3" strokeLinecap="round" />
        </g>
      );
    }

    // Ojos inteligentes/analíticos (con lentes digitales o destello)
    if (mood === 'smart') {
      return (
        <g className="aero-eyes-smart">
          <ellipse cx="40" cy="57" rx="9" ry="10" fill="white" stroke="#2c1401" strokeWidth="1.8" />
          <ellipse cx="41" cy="57" rx="4.5" ry="5" fill="#2c1401" />
          <polygon points="40,51 44,55 38,55" fill="white" />
          <path d="M32 46 H48" stroke="#2c1401" strokeWidth="2.5" strokeLinecap="round" />
          
          <ellipse cx="80" cy="57" rx="9" ry="10" fill="white" stroke="#2c1401" strokeWidth="1.8" />
          <ellipse cx="79" cy="57" rx="4.5" ry="5" fill="#2c1401" />
          <polygon points="80,51 84,55 78,55" fill="white" />
          <path d="M72 46 H88" stroke="#2c1401" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      );
    }

    // Por defecto: Ojos neutrales grandes
    return (
      <g className="aero-eyes-neutral">
        <ellipse cx="40" cy="57" rx="9" ry="10" fill="white" stroke="#2c1401" strokeWidth="1.5" />
        <ellipse cx="42" cy="57" rx="5.2" ry="5.7" fill="#2c1401" className="aero-eye-blink" />
        <circle cx="44" cy="54" r="2.2" fill="white" />
        
        <ellipse cx="80" cy="57" rx="9" ry="10" fill="white" stroke="#2c1401" strokeWidth="1.5" />
        <ellipse cx="78" cy="57" rx="5.2" ry="5.7" fill="#2c1401" className="aero-eye-blink" />
        <circle cx="76" cy="54" r="2.2" fill="white" />
      </g>
    );
  };

  // ─── Pico ───
  const renderBeak = () => {
    if (mood === 'happy' || mood === 'party') {
      return (
        <g className="aero-beak-happy">
          <path d="M53 66 L60 76 L67 66" fill="#fb923c" stroke="#ea580c" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M51 72 Q60 80 69 72" fill="none" stroke="#ea580c" strokeWidth="1.8" strokeLinecap="round" />
        </g>
      );
    }
    return (
      <path d="M53 66 L60 77 L67 66" fill="#fb923c" stroke="#ea580c" strokeWidth="1.5" strokeLinejoin="round" />
    );
  };

  // ─── Accesorios en Capas ───
  const renderAccessory = () => {
    if (!activeAccessory) return null;
    switch (activeAccessory) {
      case 'accessory-hat':
        return (
          <g className="aero-accessory-hat">
            <rect x="33" y="10" width="54" height="5" rx="2" fill="#1e293b" />
            <rect x="40" y="-8" width="40" height="20" rx="3" fill="#0f172a" stroke="#1e293b" strokeWidth="1.5" />
            <rect x="40" y="7" width="40" height="4" rx="1" fill="#f43f5e" />
          </g>
        );
      case 'accessory-glasses':
        return (
          <g className="aero-accessory-glasses">
            <rect x="25" y="49" rx="5" ry="5" width="28" height="17" fill="none" stroke="#e11d48" strokeWidth="3" />
            <rect x="27" y="51" rx="4" ry="4" width="24" height="13" fill="rgba(244,63,94,0.3)" />
            <path d="M53 56 Q60 51 67 56" fill="none" stroke="#e11d48" strokeWidth="3" />
            <rect x="67" y="49" rx="5" ry="5" width="28" height="17" fill="none" stroke="#e11d48" strokeWidth="3" />
            <rect x="69" y="51" rx="4" ry="4" width="24" height="13" fill="rgba(244,63,94,0.3)" />
            <line x1="25" y1="54" x2="16" y2="52" stroke="#e11d48" strokeWidth="3" strokeLinecap="round" />
            <line x1="95" y1="54" x2="104" y2="52" stroke="#e11d48" strokeWidth="3" strokeLinecap="round" />
          </g>
        );
      case 'accessory-corona':
        return (
          <g className="aero-accessory-corona">
            <path d="M30 20 L35 4 L45 14 L55 -2 L65 14 L75 4 L80 20 Z" fill="#fbbf24" stroke="#d97706" strokeWidth="1.5" strokeLinejoin="round" />
            <rect x="30" y="18" width="50" height="4" rx="1" fill="#f59e0b" stroke="#d97706" strokeWidth="1" />
            <circle cx="45" cy="12" r="2.5" fill="#ef4444" />
            <circle cx="55" cy="4" r="3" fill="#3b82f6" />
            <circle cx="65" cy="12" r="2.5" fill="#ef4444" />
          </g>
        );
      case 'accessory-traje':
        return (
          <g className="aero-accessory-traje">
            <path d="M46 84 L46 112 Q60 116 74 112 L74 84 Q60 80 46 84" fill="white" stroke="#e2e8f0" strokeWidth="1.2" />
            <path d="M40 82 L46 84 L48 98 L41 93 Z" fill="#0f172a" stroke="#020617" strokeWidth="0.8" />
            <path d="M80 82 L74 84 L72 98 L79 93 Z" fill="#0f172a" stroke="#020617" strokeWidth="0.8" />
            <path d="M57 84 L60 86 L63 84 L61 104 L60 106 L59 104 Z" fill="#ef4444" />
            <circle cx="60" cy="94" r="1.5" fill="#fbbf24" />
            <circle cx="60" cy="102" r="1.5" fill="#fbbf24" />
          </g>
        );
      case 'accessory-capa':
        return (
          <g className="aero-accessory-capa">
            {/* Capa de tela ondulante detrás del fénix */}
            <path
              className="duo-cape-wave"
              d="M32 45 Q26 70 20 102 Q18 118 30 126 Q45 134 60 130 Q75 134 90 126 Q102 118 100 102 Q94 70 88 45"
              fill="url(#fireCapeGrad)"
              stroke="#b91c1c"
              strokeWidth="1.5"
              opacity="0.9"
            />
          </g>
        );
      default:
        return null;
    }
  };

  // Sparkles de alegría
  const renderSparkles = () => {
    if (!showSparkles) return null;
    return (
      <g className="duo-sparkles">
        <circle className="duo-sparkle duo-sparkle-1" cx="12" cy="22" r="3" fill="#fbbf24" />
        <circle className="duo-sparkle duo-sparkle-2" cx="108" cy="16" r="2.5" fill="#ff7c7c" />
        <circle className="duo-sparkle duo-sparkle-3" cx="14" cy="126" r="2" fill="#34d399" />
        <circle className="duo-sparkle duo-sparkle-4" cx="106" cy="122" r="3" fill="#60a5fa" />
      </g>
    );
  };

  // ─── Estilos de Clase para Animaciones ───
  const flyClass = animate ? 'aero-flight' : '';
  const celestialClass = stage === 'celestial' ? 'aero-celestial-aura' : '';
  const wrapperClass = `duo-mascot-wrapper ${flyClass} ${celestialClass} ${className}`.trim();

  return (
    <div
      className={wrapperClass}
      style={{
        width: size,
        height: size * (140 / 120),
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'visible'
      }}
    >
      <svg
        viewBox={vb}
        width={size}
        height={size * (140 / 120)}
        xmlns="http://www.w3.org/2000/svg"
        style={{ overflow: 'visible' }}
      >
        <defs>
          {/* Gradientes y Auras Premium para Aero el Fénix */}
          <linearGradient id="fireCapeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="50%" stopColor="#dc2626" />
            <stop offset="100%" stopColor="#7f1d1d" />
          </linearGradient>

          <radialGradient id="phoenixBodyGrad" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#ff7e40" />
            <stop offset="70%" stopColor="#ea580c" />
            <stop offset="100%" stopColor="#b91c1c" />
          </radialGradient>

          <radialGradient id="phoenixChestGrad" cx="50%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="60%" stopColor="#facc15" />
            <stop offset="100%" stopColor="#f97316" />
          </radialGradient>

          <linearGradient id="goldFeatherGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="100%" stopColor="#ea580c" />
          </linearGradient>

          <linearGradient id="wingFlameGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fca5a5" />
            <stop offset="40%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#ea580c" />
          </linearGradient>
        </defs>

        {/* Capa detrás del cuerpo */}
        {activeAccessory === 'accessory-capa' && renderAccessory()}

        {/* ─── CUERPO Y COMPONENTES DE EVOLUCIÓN ─── */}
        <g className="aero-mascot-body">
          {/* Sombra del cuerpo */}
          <ellipse cx="60" cy="130" rx="28" ry="5.5" fill="rgba(0,0,0,0.12)" />

          {/* 👑 Cresta y plumas de la cabeza según evolución */}
          {stage === 'baby' && (
            <g className="aero-baby-crest">
              <ellipse cx="60" cy="27" rx="3.5" ry="8" fill="#ea580c" />
              <ellipse cx="64" cy="28" rx="2.5" ry="6.5" fill="#f97316" transform="rotate(15 64 28)" />
            </g>
          )}
          {stage === 'teen' && (
            <g className="aero-teen-crest">
              <path d="M57 26 Q60 12 65 16 Q63 24 60 26 Z" fill="url(#goldFeatherGrad)" />
              <path d="M63 26 Q70 14 74 19 Q70 25 63 26 Z" fill="#ef4444" />
            </g>
          )}
          {(stage === 'adult' || stage === 'celestial') && (
            <g className="aero-adult-crest aero-tail-wiggle">
              {/* Tres plumas de fuego majestuosas en la cabeza */}
              <path d="M50 26 Q46 6 56 12 Q56 22 50 26 Z" fill="#ef4444" />
              <path d="M60 24 Q60 4 68 10 Q66 21 60 24 Z" fill="url(#goldFeatherGrad)" />
              <path d="M70 26 Q74 6 80 14 Q76 22 70 26 Z" fill="#f97316" />
            </g>
          )}

          {/* ☄️ Cola / Plumas de Cola Evolutivas */}
          {stage === 'baby' && (
            <g className="aero-baby-tail">
              <ellipse cx="60" cy="115" rx="5" ry="8" fill="#ef4444" />
            </g>
          )}
          {stage === 'teen' && (
            <g className="aero-teen-tail aero-tail-wiggle">
              <path d="M58 112 Q53 126 51 130 Q59 126 58 112" fill="#ef4444" stroke="#b91c1c" strokeWidth="0.8" />
              <path d="M62 112 Q67 126 69 130 Q61 126 62 112" fill="#f97316" stroke="#b91c1c" strokeWidth="0.8" />
            </g>
          )}
          {(stage === 'adult' || stage === 'celestial') && (
            <g className="aero-adult-tail aero-tail-wiggle">
              {/* Plumas de fénix de fuego largas y majestuosas */}
              <path d="M54 110 Q40 134 38 142 C45 138 52 130 54 110 Z" fill="#b91c1c" />
              <path d="M60 110 Q60 140 60 146 C65 140 68 132 60 110 Z" fill="url(#goldFeatherGrad)" />
              <path d="M66 110 Q80 134 82 142 C75 138 68 130 66 110 Z" fill="#ef4444" />
            </g>
          )}

          {/* 🪽 Alas Evolutivas a los lados */}
          {stage === 'baby' && (
            <g>
              <path className="aero-wing-left" d="M25 68 Q15 78 20 92 Q26 88 28 80" fill="#ef4444" />
              <path className="aero-wing-right" d="M95 68 Q105 78 100 92 Q94 88 92 80" fill="#ef4444" />
            </g>
          )}
          {stage === 'teen' && (
            <g>
              <path className="aero-wing-left" d="M23 66 Q8 75 14 96 Q22 90 26 80" fill="url(#wingFlameGrad)" stroke="#b91c1c" strokeWidth="0.8" />
              <path className="aero-wing-right" d="M97 66 Q112 75 106 96 Q98 90 94 80" fill="url(#wingFlameGrad)" stroke="#b91c1c" strokeWidth="0.8" />
            </g>
          )}
          {(stage === 'adult' || stage === 'celestial') && (
            <g>
              {/* Alas de fuego extendidas y con efecto de aleteo */}
              <path
                className="aero-wing-left"
                d="M20 62 C5 68 -2 88 6 104 C15 95 24 88 28 76"
                fill="url(#wingFlameGrad)"
                stroke="#b91c1c"
                strokeWidth="1.2"
              />
              <path
                className="aero-wing-right"
                d="M100 62 C115 68 122 88 114 104 C105 95 96 88 92 76"
                fill="url(#wingFlameGrad)"
                stroke="#b91c1c"
                strokeWidth="1.2"
              />
            </g>
          )}

          {/* 🍗 Cuerpo Base */}
          <ellipse
            cx="60"
            cy="76"
            rx="36"
            ry="44"
            fill="url(#phoenixBodyGrad)"
            stroke="#b91c1c"
            strokeWidth="1.8"
          />

          {/* Vientre / Pecho (Dorado brillante) */}
          <ellipse
            cx="60"
            cy="88"
            rx="20"
            ry="25"
            fill="url(#phoenixChestGrad)"
            stroke="#ea580c"
            strokeWidth="1"
          />

          {/* Patas de fénix doradas */}
          <g className="aero-feet">
            <path d="M43 118 L40 128 L34 130 M40 128 L40 132 M40 128 L46 130" fill="none" stroke="#f59e0b" strokeWidth="3.2" strokeLinecap="round" />
            <path d="M77 118 L80 128 L86 130 M80 128 L80 132 M80 128 L74 130" fill="none" stroke="#f59e0b" strokeWidth="3.2" strokeLinecap="round" />
          </g>
        </g>

        {/* ─── CARA DE AERO ─── */}
        <g className="aero-mascot-face">
          {/* Antifaz protector sutil (opacidad baja) */}
          <ellipse cx="60" cy="56" rx="27" ry="22" fill="#fee2e2" opacity="0.3" />
          {renderEyes()}
          {renderBeak()}
        </g>

        {/* Accesorios que van encima del cuerpo (Sombreros/Lentes/etc.) */}
        {activeAccessory !== 'accessory-capa' && renderAccessory()}

        {/* Destellos mágicos */}
        {renderSparkles()}
      </svg>
    </div>
  );
};

export default AeroMascot;
