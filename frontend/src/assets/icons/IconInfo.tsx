import type { IconProps } from '../../utils/types';

export function IconInfo({ size = 20, color = 'black' }: IconProps) {
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
        <circle cx="128" cy="128" r="96" />
        <line x1="128" y1="120" x2="128" y2="176" />
      </g>
      <circle cx="128" cy="84" r="10" fill={color} />
    </svg>
  );
}
