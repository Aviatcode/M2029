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
      <img
        src="./am-logo.png"
        onError={(e) => {
          const target = e.currentTarget;
          if (!target.src.endsWith('/am-logo.png')) {
            target.src = '/am-logo.png';
          }
        }}
        alt="AM Logo"
        width={size}
        height={size}
        className="relative z-10 w-full h-full object-contain rounded-lg drop-shadow-md transition-transform duration-300 group-hover:scale-105"
        loading="eager"
        decoding="async"
      />
    </div>
  );
};
