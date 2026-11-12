import type { IconProps } from '../../utils/types';

export function IconRoute({ size = 20, color = 'black' }: IconProps) {
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
        <circle cx="64" cy="192" r="24" />
        <circle cx="192" cy="64" r="24" />
        <path d="M88 192h56a32 32 0 0 0 0-64h-32a32 32 0 0 1 0-64h56" />
      </g>
    </svg>
  );
}
