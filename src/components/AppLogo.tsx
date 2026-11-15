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
      {/* Subtle Ambient Backlight Glow */}
      {withGlow && (
        <div
          className={`absolute inset-0 rounded-xl bg-gradient-to-tr from-cyan-500/20 via-indigo-500/15 to-zinc-400/15 blur-md pointer-events-none transition-opacity duration-300 ${
            animated ? 'animate-pulse' : 'opacity-70 group-hover:opacity-100'
          }`}
          aria-hidden="true"
        />
      )}

      {/* Official AM Brand Logo */}
      <svg
        viewBox="0 0 120 120"
        width={size}
        height={size}
        className="relative z-10 w-full h-full object-contain rounded-lg drop-shadow-md transition-transform duration-300 group-hover:scale-105"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="AM Logo"
      >
        <rect width="120" height="120" rx="26" fill="#000000" />
        <rect
          x="0.75"
          y="0.75"
          width="118.5"
          height="118.5"
          rx="25.25"
          fill="none"
          stroke="#262626"
          strokeWidth="1.5"
        />
        <g stroke="#FFFFFF" strokeWidth="6.5" strokeLinecap="square">
          {/* Letter A */}
          <path d="M 21 86 L 38 34 L 55 86" strokeLinejoin="miter" strokeMiterlimit="10" />
          <line x1="28" y1="67" x2="48" y2="67" />
          {/* Letter M */}
          <path d="M 67 86 L 67 34 L 85 80 L 103 34 L 103 86" strokeLinejoin="miter" strokeMiterlimit="10" />
        </g>
      </svg>
    </div>
  );
};
