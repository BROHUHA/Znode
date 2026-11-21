import React from 'react';

export interface ZnodeLogoProps {
  className?: string;
  size?: number;
}

/**
 * Official Znode Music Monogram Logo (ZN)
 * Sleek interlocking ZN monogram with transparent alpha
 */
export const ZnodeLogo: React.FC<ZnodeLogoProps> = ({ className = '', size = 32 }) => {
  return (
    <div
      style={{ width: size, height: size }}
      className={`relative shrink-0 flex items-center justify-center select-none ${className}`}
    >
      <img
        src="/logo-zn-white.png"
        alt="Znode Music (ZN)"
        className="w-full h-full object-contain filter drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]"
        draggable={false}
      />
    </div>
  );
};

// Backwards-compatible export
export const YouTubeMusicLogo = ZnodeLogo;
