import type { IconProps } from '../../utils/types';

export function IconArrowsLeftRight({ size = 20, color = 'black' }: IconProps) {
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
        <line x1="48" y1="84" x2="208" y2="84" />
        <polyline points="176 52 208 84 176 116" />
        <line x1="208" y1="172" x2="48" y2="172" />
        <polyline points="80 140 48 172 80 204" />
      </g>
    </svg>
  );
}
