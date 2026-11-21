import React from 'react';

export interface ZnodeLogoProps {
  className?: string;
  size?: number;
}

/**
 * Authentic Znode Music Logo (ZN)
 * Sleek circular red gradient with outer luminous ring, connected Z-node monogram, and audio frequency pulses
 */
export const ZnodeLogo: React.FC<ZnodeLogoProps> = ({ className = '', size = 32 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 432 432"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 drop-shadow-md ${className}`}
    >
      {/* Background Circle with Signature Red Gradient */}
      <circle cx="216" cy="216" r="216" fill="url(#znode-logo-grad)" />

      {/* Outer Luminous Ring */}
      <circle
        cx="216"
        cy="216"
        r="133.5"
        stroke="white"
        strokeWidth="13"
        strokeOpacity="0.92"
      />

      {/* Znode Monogram / Audio Node Network */}
      <line
        x1="154"
        y1="156"
        x2="278"
        y2="156"
        stroke="white"
        strokeWidth="20"
        strokeLinecap="round"
      />
      <line
        x1="278"
        y1="156"
        x2="154"
        y2="276"
        stroke="white"
        strokeWidth="22"
        strokeLinecap="round"
      />
      <line
        x1="154"
        y1="276"
        x2="278"
        y2="276"
        stroke="white"
        strokeWidth="20"
        strokeLinecap="round"
      />

      {/* Network Audio Nodes */}
      <circle cx="154" cy="156" r="16" fill="white" />
      <circle cx="278" cy="156" r="16" fill="white" />
      <circle cx="216" cy="216" r="13" fill="white" />
      <circle cx="154" cy="276" r="16" fill="white" />
      <circle cx="278" cy="276" r="16" fill="white" />

      {/* Acoustic frequency pulses flanking center node */}
      <line
        x1="184"
        y1="202"
        x2="184"
        y2="230"
        stroke="white"
        strokeWidth="8"
        strokeLinecap="round"
        strokeOpacity="0.85"
      />
      <line
        x1="248"
        y1="202"
        x2="248"
        y2="230"
        stroke="white"
        strokeWidth="8"
        strokeLinecap="round"
        strokeOpacity="0.85"
      />

      <defs>
        <linearGradient
          id="znode-logo-grad"
          x1="50"
          y1="50"
          x2="382"
          y2="382"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#FF2A4B" />
          <stop offset="1" stopColor="#D90429" />
        </linearGradient>
      </defs>
    </svg>
  );
};

// Backwards-compatible export
export const YouTubeMusicLogo = ZnodeLogo;
