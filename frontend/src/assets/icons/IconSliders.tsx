import type { IconProps } from '../../utils/types';

export function IconSliders({ size = 20, color = 'black' }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 256 256"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="16"
      >
        <line x1="32" y1="64" x2="76" y2="64" />
        <line x1="116" y1="64" x2="224" y2="64" />
        <circle cx="96" cy="64" r="20" />
        <line x1="32" y1="128" x2="140" y2="128" />
        <line x1="180" y1="128" x2="224" y2="128" />
        <circle cx="160" cy="128" r="20" />
        <line x1="32" y1="192" x2="92" y2="192" />
        <line x1="132" y1="192" x2="224" y2="192" />
        <circle cx="112" cy="192" r="20" />
      </g>
    </svg>
  );
}
