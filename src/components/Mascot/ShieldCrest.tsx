/**
 * ShieldCrest.tsx — Escudo Vivo Evolutivo (StockMaster Pro)
 * Componente SVG modular que evoluciona de aspecto (Bronce -> Plata -> Oro -> Master Pro) según el nivel del usuario.
 */
import React from 'react';

export type ShieldRank = 'bronze' | 'silver' | 'gold' | 'master';

interface ShieldCrestProps {
  level?: number;
  rank?: ShieldRank;
  size?: number;
  animate?: boolean;
  className?: string;
}

const ShieldCrest: React.FC<ShieldCrestProps> = ({ level = 1, rank, size = 80, animate = true, className = '' }) => {
  // Determinar rango automáticamente si no se provee de forma explícita
  let computedRank: ShieldRank = 'bronze';
  if (rank) {
    computedRank = rank;
  } else {
    if (level >= 5 && level < 10) computedRank = 'silver';
    else if (level >= 10 && level < 20) computedRank = 'gold';
    else if (level >= 20) computedRank = 'master';
  }

  // Clases CSS de Animación
  const floatClass = animate ? 'shield-float' : '';
  const pulseClass = computedRank === 'master' && animate ? 'shield-master-pulse' : '';
  const wrapperClass = `shield-crest-wrapper ${floatClass} ${pulseClass} ${className}`.trim();

  // Vista del SVG
  const vb = '0 0 120 140';

  return (
    <div
      className={wrapperClass}
      style={{
        width: size,
        height: size * (140 / 120),
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'visible',
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
          {/* Gradients for Shields */}
          <linearGradient id="bronzeShieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#cd7f32" />
            <stop offset="50%" stopColor="#a0522d" />
            <stop offset="100%" stopColor="#8b4513" />
          </linearGradient>

          <linearGradient id="silverShieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f1f5f9" />
            <stop offset="35%" stopColor="#cbd5e1" />
            <stop offset="70%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>

          <linearGradient id="goldShieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="35%" stopColor="#f59e0b" />
            <stop offset="70%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>

          <linearGradient id="masterShieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="50%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#047857" />
          </linearGradient>

          <linearGradient id="neonCyanPurpleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>

          <linearGradient id="sheenGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>

          <clipPath id="shieldClip">
            <path d="M60 15 Q95 15 100 48 Q100 85 60 120 Q20 85 20 48 Q25 15 60 15 Z" />
          </clipPath>
        </defs>

        {/* ─── ANILLOS ORBITALES (Rango Master Pro únicamente) ─── */}
        {computedRank === 'master' && (
          <g className="shield-rotate-ring" opacity="0.8">
            <circle
              cx="60"
              cy="70"
              r="54"
              fill="none"
              stroke="url(#neonCyanPurpleGrad)"
              strokeWidth="1.5"
              strokeDasharray="10, 8, 4, 8"
            />
            <circle
              cx="60"
              cy="70"
              r="57"
              fill="none"
              stroke="#10b981"
              strokeWidth="0.8"
              strokeDasharray="30, 20"
              opacity="0.5"
            />
            {/* Pequeñas esferas flotantes en el anillo */}
            <circle cx="114" cy="70" r="3" fill="#10b981" />
            <circle cx="6" cy="70" r="3" fill="#8b5cf6" />
          </g>
        )}

        {/* ─── ALAS DE METAL (Rango Plata en adelante) ─── */}
        {computedRank !== 'bronze' && (
          <g opacity="0.9">
            {/* Ala izquierda */}
            <path
              d="M20 40 Q5 32 2 52 Q12 56 22 52"
              fill={computedRank === 'silver' ? '#cbd5e1' : computedRank === 'gold' ? '#fbbf24' : '#10b981'}
              stroke="#1e293b"
              strokeWidth="1"
            />
            <path
              d="M19 50 Q0 45 -2 65 Q10 68 20 62"
              fill={computedRank === 'silver' ? '#94a3b8' : computedRank === 'gold' ? '#f59e0b' : '#059669'}
              stroke="#1e293b"
              strokeWidth="1"
            />
            {/* Ala derecha */}
            <path
              d="M100 40 Q115 32 118 52 Q108 56 98 52"
              fill={computedRank === 'silver' ? '#cbd5e1' : computedRank === 'gold' ? '#fbbf24' : '#10b981'}
              stroke="#1e293b"
              strokeWidth="1"
            />
            <path
              d="M101 50 Q120 45 122 65 Q110 68 100 62"
              fill={computedRank === 'silver' ? '#94a3b8' : computedRank === 'gold' ? '#f59e0b' : '#059669'}
              stroke="#1e293b"
              strokeWidth="1"
            />
          </g>
        )}

        {/* ─── CORONA DEL ESCUDO (Rango Master Pro) ─── */}
        {computedRank === 'master' && (
          <g transform="translate(42, -5)">
            <path
              d="M4 14 L8 2 L18 10 L28 2 L32 14 Z"
              fill="#fbbf24"
              stroke="#d97706"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
            <rect x="3" y="13" width="30" height="3" rx="1" fill="#f59e0b" stroke="#d97706" strokeWidth="0.8" />
            <circle cx="8" cy="2" r="1.5" fill="#ef4444" />
            <circle cx="18" cy="10" r="1.2" fill="#3b82f6" />
            <circle cx="28" cy="2" r="1.5" fill="#ef4444" />
          </g>
        )}

        {/* ─── BASE DEL ESCUDO PRINCIPAL ─── */}
        {/* Sombra proyectada */}
        <path d="M60 21 Q91 21 96 50 Q96 82 60 114 Q24 82 24 50 Q29 21 60 21 Z" fill="rgba(0,0,0,0.15)" />

        {/* Estructura Exterior según Rango */}
        <path
          d="M60 15 Q95 15 100 48 Q100 85 60 120 Q20 85 20 48 Q25 15 60 15 Z"
          fill={
            computedRank === 'bronze'
              ? 'url(#bronzeShieldGrad)'
              : computedRank === 'silver'
                ? 'url(#silverShieldGrad)'
                : computedRank === 'gold'
                  ? 'url(#goldShieldGrad)'
                  : 'url(#masterShieldGrad)'
          }
          stroke={
            computedRank === 'bronze'
              ? '#8b4513'
              : computedRank === 'silver'
                ? '#475569'
                : computedRank === 'gold'
                  ? '#d97706'
                  : '#047857'
          }
          strokeWidth="3.5"
          strokeLinejoin="round"
        />

        {/* Borde Interno Decorativo */}
        <path
          d="M60 21 Q90 21 94 48 Q94 79 60 111 Q26 79 26 48 Q30 21 60 21 Z"
          fill="none"
          stroke={
            computedRank === 'bronze'
              ? '#ffd8a8'
              : computedRank === 'silver'
                ? '#f8fafc'
                : computedRank === 'gold'
                  ? '#fef08a'
                  : '#a7f3d0'
          }
          strokeWidth="1.2"
          opacity="0.65"
        />

        {/* 💎 Gemas incrustadas en el borde (Rango Oro y Master únicamente) */}
        {(computedRank === 'gold' || computedRank === 'master') && (
          <g>
            {/* Gema izquierda */}
            <circle cx="28" cy="48" r="3" fill="#ef4444" stroke="#7f1d1d" strokeWidth="0.8" />
            <circle cx="27" cy="47" r="0.8" fill="white" opacity="0.6" />
            {/* Gema derecha */}
            <circle cx="92" cy="48" r="3" fill="#ef4444" stroke="#7f1d1d" strokeWidth="0.8" />
            <circle cx="91" cy="47" r="0.8" fill="white" opacity="0.6" />
            {/* Gema central inferior */}
            <circle
              cx="60"
              cy="108"
              r="3"
              fill={computedRank === 'gold' ? '#3b82f6' : '#8b5cf6'}
              stroke="#1d4ed8"
              strokeWidth="0.8"
            />
          </g>
        )}

        {/* ─── CONTENIDO INTERNO DEL ESCUDO (Icono de Maestría de Stock) ─── */}
        <g>
          {/* Gráfico de barras ascendente (Stock exitoso) */}
          <rect x="42" y="70" width="8" height="22" rx="1.5" fill="white" opacity="0.75" />
          <rect x="54" y="58" width="8" height="34" rx="1.5" fill="white" opacity="0.85" />
          <rect x="66" y="44" width="8" height="48" rx="1.5" fill="white" opacity="0.95" />
          {/* Flecha de crecimiento diagonal */}
          <path d="M38 78 L56 60 L78 38" fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
          <polygon points="78,38 72,42 76,46" fill="#ef4444" />
          <polygon points="78,38 74,34 70,38" fill="#ef4444" />

          {/* Monograma de Texto del Nivel en la base */}
          <text
            x="60"
            y="101"
            textAnchor="middle"
            fontSize="10"
            fontWeight="900"
            fill="white"
            stroke="#000"
            strokeWidth="0.5"
            letterSpacing="0.5"
          >
            Lvl {level}
          </text>
        </g>

        {/* ─── CAPA DE BRILLO METÁLICO (Dynamic Sheen Clip) ─── */}
        <g clipPath="url(#shieldClip)">
          <rect
            className="shield-sheen-sweep"
            x="-40"
            y="15"
            width="40"
            height="110"
            fill="url(#sheenGrad)"
            transform="skewX(-30)"
            opacity="0.7"
          />
        </g>
      </svg>
    </div>
  );
};

export default ShieldCrest;
