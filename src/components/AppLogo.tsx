import React from 'react';

interface AppLogoProps {
  size?: number;
  className?: string;
  withGlow?: boolean;
  animated?: boolean;
}

export const AppLogo: React.FC<AppLogoProps> = ({
  size = 36,
  className = '',
  withGlow = true,
  animated = false,
}) => {
  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Ambient Neural Backlight Glow */}
      {withGlow && (
        <div
          className={`absolute inset-0 rounded-xl bg-gradient-to-tr from-indigo-500/25 via-violet-500/20 to-zinc-400/20 blur-md pointer-events-none transition-opacity duration-300 ${
            animated ? 'animate-pulse' : 'opacity-70 group-hover:opacity-100'
          }`}
          aria-hidden="true"
        />
      )}

      {/* Futuristic Vector Monogram */}
      <svg
        viewBox="0 0 512 512"
        width={size}
        height={size}
        className="relative z-10 w-full h-full drop-shadow-md transition-transform duration-300 group-hover:scale-105"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="m2029Bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#18181b" />
            <stop offset="50%" stopColor="#0f0f12" />
            <stop offset="100%" stopColor="#09090b" />
          </linearGradient>

          <linearGradient id="m2029Border" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e4e4e7" />
            <stop offset="50%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#27272a" />
          </linearGradient>

          <linearGradient id="m2029MGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="60%" stopColor="#f4f4f5" />
            <stop offset="100%" stopColor="#a1a1aa" />
          </linearGradient>

          <linearGradient id="m2029Prism" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>

          <filter id="m2029CoreGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="12" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer Obsidian Shield */}
        <rect
          x="18"
          y="18"
          width="476"
          height="476"
          rx="112"
          fill="url(#m2029Bg)"
          stroke="url(#m2029Border)"
          strokeWidth="12"
        />

        {/* Ambient Core Laser Ray */}
        <circle cx="256" cy="240" r="140" fill="#6366f1" opacity="0.18" filter="url(#m2029CoreGlow)" />

        {/* High-Tech Cyber Grid Accent */}
        <path
          d="M60 256 H452 M256 60 V452"
          stroke="#71717a"
          strokeOpacity="0.12"
          strokeWidth="2"
          strokeDasharray="8 8"
        />

        {/* Geometric 'M' Monogram */}
        <g fill="url(#m2029MGrad)">
          {/* Left Vertical Pillar */}
          <rect x="108" y="112" width="56" height="236" rx="14" />
          {/* Right Vertical Pillar */}
          <rect x="348" y="112" width="56" height="236" rx="14" />
          {/* Left Chevron Diagonal */}
          <polygon points="144,120 256,260 216,282 120,154" />
          {/* Right Chevron Diagonal */}
          <polygon points="368,120 256,260 296,282 392,154" />
          {/* Center Luminous Apex Prismatic Shard */}
          <polygon
            points="256,216 290,264 256,306 222,264"
            fill="url(#m2029Prism)"
            stroke="#a5b4fc"
            strokeWidth="3"
            filter="url(#m2029CoreGlow)"
          />
        </g>

        {/* Holographic 2029 Quantum Badge */}
        <g transform="translate(142, 384)">
          <rect
            x="0"
            y="0"
            width="228"
            height="44"
            rx="22"
            fill="#121215"
            stroke="url(#m2029Border)"
            strokeWidth="4"
          />
          <text
            x="114"
            y="29"
            fill="#ffffff"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontSize="22"
            fontWeight="900"
            letterSpacing="5"
            textAnchor="middle"
          >
            2029
          </text>
        </g>
      </svg>
    </div>
  );
};

