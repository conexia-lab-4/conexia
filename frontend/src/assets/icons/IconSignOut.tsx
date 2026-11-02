import type { IconProps } from '../../utils/types';

export function IconSignOut({ size = 24, color = 'black' }: IconProps) {
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
        <path d="M112,216H48a8,8,0,0,1-8-8V48a8,8,0,0,1,8-8h64" />
        <polyline points="168 80 216 128 168 176" />
        <line x1="104" y1="128" x2="216" y2="128" />
      </g>
    </svg>
  );
}
