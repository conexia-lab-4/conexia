import type { IconProps } from '../../utils/types';

export function IconArmchair({ size = 20, color = 'black' }: IconProps) {
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
        <path d="M72 128V96a56 56 0 0 1 112 0v32" />
        <rect x="32" y="128" width="192" height="64" rx="24" />
        <line x1="64" y1="192" x2="64" y2="216" />
        <line x1="192" y1="192" x2="192" y2="216" />
      </g>
    </svg>
  );
}
