import React, { useEffect, useState } from 'react';

export type DuoMood = 'neutral' | 'happy' | 'sad' | 'crying' | 'smart' | 'party' | 'sleepy' | 'sleeping';

interface DuoMascotProps {
  size?: number;
  activeAccessory?: string;
  mood?: DuoMood;
  animate?: boolean;
  showSparkles?: boolean;
  className?: string;
}

const DuoMascot: React.FC<DuoMascotProps> = ({
  size = 64,
  activeAccessory,
  mood = 'neutral',
  animate = true,
  showSparkles = false,
  className = '',
}) => {
  const [isBlinking, setIsBlinking] = useState(false);

  useEffect(() => {
    if (mood !== 'neutral' || !animate) return;
    const interval = setInterval(
      () => {
        setIsBlinking(true);
        setTimeout(() => setIsBlinking(false), 180);
      },
      3500 + Math.random() * 2000,
    );
    return () => clearInterval(interval);
  }, [mood, animate]);

  const vb = '0 0 120 140';

  const renderEyes = () => {
    if (mood === 'happy' || mood === 'party') {
      return (
        <g className="duo-eyes-happy">
          <path d="M32 58 Q40 48 48 58" fill="none" stroke="#1a1a1a" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M72 58 Q80 48 88 58" fill="none" stroke="#1a1a1a" strokeWidth="3.5" strokeLinecap="round" />
        </g>
      );
    }
    if (mood === 'sad' || mood === 'crying') {
      return (
        <g className="duo-eyes-sad">
          <ellipse cx="40" cy="56" rx="9" ry="10" fill="white" stroke="#1a1a1a" strokeWidth="1.5" />
          <ellipse cx="41" cy="58" rx="4.5" ry="5" fill="#1a1a1a" />
          <ellipse cx="42.5" cy="57" rx="1.5" ry="1.5" fill="white" />
          <path d="M30 46 Q36 42 48 47" fill="none" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round" />
          <ellipse cx="80" cy="56" rx="9" ry="10" fill="white" stroke="#1a1a1a" strokeWidth="1.5" />
          <ellipse cx="79" cy="58" rx="4.5" ry="5" fill="#1a1a1a" />
          <ellipse cx="77.5" cy="57" rx="1.5" ry="1.5" fill="white" />
          <path d="M72 47 Q84 42 90 46" fill="none" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      );
    }
    if (mood === 'sleepy' || mood === 'sleeping') {
      return (
        <g className="duo-eyes-sleepy">
          <path d="M31 56 Q40 60 49 56" fill="none" stroke="#1a1a1a" strokeWidth="3" strokeLinecap="round" />
          <path d="M71 56 Q80 60 89 56" fill="none" stroke="#1a1a1a" strokeWidth="3" strokeLinecap="round" />
          <text className="duo-zzz duo-zzz-1" x="95" y="35" fontSize="11" fontWeight="900" fill="#7c3aed" opacity="0.8">Z</text>
          <text className="duo-zzz duo-zzz-2" x="102" y="22" fontSize="9" fontWeight="900" fill="#a78bfa" opacity="0.6">z</text>
          <text className="duo-zzz duo-zzz-3" x="108" y="12" fontSize="7" fontWeight="900" fill="#c4b5fd" opacity="0.4">z</text>
        </g>
      );
    }
    if (isBlinking) {
      return (
        <g className="duo-eyes-blink">
          <path d="M31 56 Q40 59 49 56" fill="none" stroke="#1a1a1a" strokeWidth="3" strokeLinecap="round" />
          <path d="M71 56 Q80 59 89 56" fill="none" stroke="#1a1a1a" strokeWidth="3" strokeLinecap="round" />
        </g>
      );
    }
    return (
      <g className="duo-eyes-neutral">
        <ellipse cx="40" cy="55" rx="10" ry="11" fill="white" stroke="#1a1a1a" strokeWidth="1.5" />
        <ellipse cx="42" cy="56" rx="5" ry="5.5" fill="#1a1a1a" />
        <ellipse cx="44" cy="54" rx="2" ry="2" fill="white" />
        <ellipse cx="80" cy="55" rx="10" ry="11" fill="white" stroke="#1a1a1a" strokeWidth="1.5" />
        <ellipse cx="78" cy="56" rx="5" ry="5.5" fill="#1a1a1a" />
        <ellipse cx="76" cy="54" rx="2" ry="2" fill="white" />
      </g>
    );
  };

  const renderBeak = () => {
    if (mood === 'happy' || mood === 'party') {
      return (
        <g className="duo-beak-happy">
          <path d="M53 68 L60 76 L67 68" fill="#ff9500" stroke="#e07b00" strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M50 74 Q60 82 70 74" fill="none" stroke="#e07b00" strokeWidth="1.5" strokeLinecap="round" />
        </g>
      );
    }
    if (mood === 'sad' || mood === 'crying') {
      return (
        <g className="duo-beak-sad">
          <path d="M53 68 L60 75 L67 68" fill="#ff9500" stroke="#e07b00" strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M52 76 Q60 72 68 76" fill="none" stroke="#e07b00" strokeWidth="1.5" strokeLinecap="round" />
        </g>
      );
    }
    return <path d="M53 67 L60 76 L67 67" fill="#ff9500" stroke="#e07b00" strokeWidth="1.2" strokeLinejoin="round" />;
  };

  const renderAccessory = () => {
    if (!activeAccessory) return null;
    switch (activeAccessory) {
      case 'accessory-hat':
        return (
          <g className="duo-accessory-hat">
            <rect x="33" y="10" width="54" height="5" rx="2" fill="#1a1a1a" />
            <rect x="40" y="-8" width="40" height="20" rx="3" fill="#222" stroke="#1a1a1a" strokeWidth="1.5" />
            <rect x="40" y="7" width="40" height="4" rx="1" fill="#dc2626" />
          </g>
        );
      case 'accessory-glasses':
        return (
          <g className="duo-accessory-glasses">
            <rect x="27" y="48" rx="5" ry="5" width="26" height="16" fill="none" stroke="#1a1a1a" strokeWidth="2.5" />
            <rect x="29" y="50" rx="4" ry="4" width="22" height="12" fill="rgba(30,30,30,0.55)" />
            <rect x="32" y="52" rx="2" ry="2" width="6" height="3" fill="rgba(255,255,255,0.25)" />
            <path d="M53 55 Q60 51 67 55" fill="none" stroke="#1a1a1a" strokeWidth="2.5" />
            <rect x="67" y="48" rx="5" ry="5" width="26" height="16" fill="none" stroke="#1a1a1a" strokeWidth="2.5" />
            <rect x="69" y="50" rx="4" ry="4" width="22" height="12" fill="rgba(30,30,30,0.55)" />
            <rect x="72" y="52" rx="2" ry="2" width="6" height="3" fill="rgba(255,255,255,0.25)" />
            <line x1="27" y1="53" x2="18" y2="52" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="93" y1="53" x2="102" y2="52" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        );
      case 'accessory-corona':
        return (
          <g className="duo-accessory-corona">
            <path d="M30 22 L35 6 L45 16 L55 0 L65 16 L75 6 L80 22 Z" fill="#fbbf24" stroke="#d97706" strokeWidth="1.5" strokeLinejoin="round" />
            <rect x="30" y="20" width="50" height="5" rx="1" fill="#f59e0b" stroke="#d97706" strokeWidth="1" />
            <circle cx="45" cy="14" r="3" fill="#dc2626" stroke="#991b1b" strokeWidth="0.8" />
            <circle cx="55" cy="5" r="3.5" fill="#3b82f6" stroke="#1d4ed8" strokeWidth="0.8" />
            <circle cx="65" cy="14" r="3" fill="#dc2626" stroke="#991b1b" strokeWidth="0.8" />
            <circle cx="40" cy="9" r="1" fill="white" opacity="0.7" />
            <circle cx="70" cy="9" r="1" fill="white" opacity="0.7" />
          </g>
        );
      case 'accessory-traje':
        return (
          <g className="duo-accessory-traje">
            <path d="M46 82 L46 108 Q60 112 74 108 L74 82 Q60 78 46 82" fill="white" stroke="#e5e7eb" strokeWidth="1" />
            <path d="M42 80 L46 82 L48 95 L42 90 Z" fill="#1e293b" stroke="#0f172a" strokeWidth="0.8" />
            <path d="M78 80 L74 82 L72 95 L78 90 Z" fill="#1e293b" stroke="#0f172a" strokeWidth="0.8" />
            <path d="M57 82 L60 84 L63 82 L61 100 L60 102 L59 100 Z" fill="#dc2626" stroke="#991b1b" strokeWidth="0.5" />
            <polygon points="58,82 62,82 61,85 59,85" fill="#b91c1c" />
            <circle cx="60" cy="92" r="1.2" fill="#d1d5db" stroke="#9ca3af" strokeWidth="0.5" />
            <circle cx="60" cy="100" r="1.2" fill="#d1d5db" stroke="#9ca3af" strokeWidth="0.5" />
          </g>
        );
      case 'accessory-capa':
        return (
          <g className="duo-accessory-capa">
            <path className="duo-cape-wave" d="M30 45 Q28 70 22 100 Q20 115 30 125 Q45 135 60 130 Q75 135 90 125 Q100 115 98 100 Q92 70 90 45" fill="url(#capeGradient)" stroke="#991b1b" strokeWidth="1" opacity="0.9" />
          </g>
        );
      default:
        return null;
    }
  };

  const renderSparkles = () => {
    if (!showSparkles) return null;
    return (
      <g className="duo-sparkles">
        <circle className="duo-sparkle duo-sparkle-1" cx="10" cy="20" r="3" fill="#fbbf24" />
        <circle className="duo-sparkle duo-sparkle-2" cx="110" cy="15" r="2.5" fill="#f472b6" />
        <circle className="duo-sparkle duo-sparkle-3" cx="15" cy="130" r="2" fill="#818cf8" />
        <circle className="duo-sparkle duo-sparkle-4" cx="105" cy="125" r="3" fill="#34d399" />
        <polygon className="duo-sparkle duo-sparkle-5" points="100,40 103,37 106,40 103,43" fill="#fbbf24" />
        <polygon className="duo-sparkle duo-sparkle-6" points="18,70 21,67 24,70 21,73" fill="#fb923c" />
      </g>
    );
  };

  const breatheClass = animate ? 'duo-breathe' : '';
  const bounceClass = (mood === 'happy' || mood === 'party') && animate ? 'duo-bounce-happy' : '';
  const wrapperClass = `duo-mascot-wrapper ${breatheClass} ${bounceClass} ${className}`.trim();

  return (
    <div className={wrapperClass} style={{ width: size, height: size * (140 / 120), display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg viewBox={vb} width={size} height={size * (140 / 120)} xmlns="http://www.w3.org/2000/svg" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="capeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#991b1b" />
          </linearGradient>
          <radialGradient id="bodyGradient" cx="50%" cy="40%" r="55%">
            <stop offset="0%" stopColor="#7dd956" />
            <stop offset="100%" stopColor="#58cc02" />
          </radialGradient>
          <radialGradient id="bellyGradient" cx="50%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#fffde7" />
            <stop offset="100%" stopColor="#fef3c7" />
          </radialGradient>
        </defs>
        {activeAccessory === 'accessory-capa' && renderAccessory()}
        <g className="duo-body">
          <ellipse cx="62" cy="132" rx="30" ry="6" fill="rgba(0,0,0,0.08)" />
          <ellipse cx="48" cy="28" rx="6" ry="12" fill="#4db800" transform="rotate(-15 48 28)" />
          <ellipse cx="60" cy="25" rx="5" ry="13" fill="#58cc02" transform="rotate(0 60 25)" />
          <ellipse cx="72" cy="28" rx="6" ry="12" fill="#4db800" transform="rotate(15 72 28)" />
          <ellipse cx="60" cy="75" rx="38" ry="48" fill="url(#bodyGradient)" stroke="#46a302" strokeWidth="1.5" />
          <ellipse cx="60" cy="88" rx="22" ry="28" fill="url(#bellyGradient)" stroke="#e5d9a0" strokeWidth="0.8" />
          <path d="M22 65 Q10 80 18 100 Q22 95 28 88" fill="#4db800" stroke="#3d9400" strokeWidth="1" />
          <path d="M98 65 Q110 80 102 100 Q98 95 92 88" fill="#4db800" stroke="#3d9400" strokeWidth="1" />
          <g className="duo-feet">
            <path d="M42 118 L38 128 L32 130 M38 128 L38 132 M38 128 L44 130" fill="none" stroke="#ff9500" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M78 118 L82 128 L88 130 M82 128 L82 132 M82 128 L76 130" fill="none" stroke="#ff9500" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </g>
        <g className="duo-face">
          <ellipse cx="60" cy="55" rx="28" ry="25" fill="#d4f7c5" opacity="0.35" />
          {renderEyes()}
          {renderBeak()}
        </g>
        {activeAccessory !== 'accessory-capa' && renderAccessory()}
        {renderSparkles()}
      </svg>
    </div>
  );
};

export default DuoMascot;
