import React from 'react';

interface TagingLogoProps {
  variant?: 'full' | 'compact' | 'badge' | 'text';
  theme?: 'light' | 'dark' | 'color';
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const TagingLogo: React.FC<TagingLogoProps> = ({
  variant = 'full',
  theme = 'light',
  className = '',
  size = 'md'
}) => {
  // Dimensions
  const sizes = {
    sm: { height: 28, text: 'text-sm', badge: 'w-7 h-7 text-xs' },
    md: { height: 36, text: 'text-base', badge: 'w-9 h-9 text-sm' },
    lg: { height: 48, text: 'text-xl', badge: 'w-11 h-11 text-base' },
    xl: { height: 64, text: 'text-2xl', badge: 'w-14 h-14 text-lg' }
  };

  const isDark = theme === 'dark';

  if (variant === 'badge') {
    return (
      <div 
        className={`rounded-xl bg-gradient-to-br from-indigo-600 via-blue-600 to-sky-500 flex items-center justify-center font-black text-white shadow-md shadow-indigo-500/20 tracking-tighter shrink-0 select-none ${sizes[size].badge} ${className}`}
        title="Taging Ingeniería"
      >
        <span>TG</span>
      </div>
    );
  }

  // Primary Colors
  const textColor = isDark ? '#ffffff' : '#0f172a';
  const subtitleColor = isDark ? '#94a3b8' : '#2563eb'; // blue-600 or slate-400

  return (
    <div className={`inline-flex items-center space-x-3 select-none ${className}`}>
      {/* Icon: Modern Geometric Right Triangle Emblem */}
      <svg
        height={sizes[size].height}
        viewBox="0 0 160 52"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        <defs>
          <linearGradient id="tagingEmblemGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0284c7" />
            <stop offset="50%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#00d2ff" />
          </linearGradient>
          <linearGradient id="tagingAccentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>
        </defs>

        {/* Scaled Triangle Symbol */}
        <path
          d="M 6 30 L 42 6 L 42 30 Z"
          fill="url(#tagingEmblemGrad)"
        />

        {/* TAGING Main Wordmark */}
        <text
          x="48"
          y="28"
          fill={textColor}
          fontSize="27"
          fontWeight="900"
          fontFamily="system-ui, -apple-system, sans-serif"
          letterSpacing="-0.02em"
        >
          TAGING
        </text>

        {/* Subtitle INGENIERÍA INTELIGENTE */}
        {variant === 'full' && (
          <text
            x="48"
            y="43"
            fill={subtitleColor}
            fontSize="8.5"
            fontWeight="800"
            fontFamily="system-ui, -apple-system, sans-serif"
            letterSpacing="0.16em"
          >
            INGENIERÍA INTELIGENTE
          </text>
        )}
      </svg>
    </div>
  );
};

export default TagingLogo;
