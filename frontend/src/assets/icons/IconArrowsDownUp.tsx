import type { IconProps } from '../../utils/types';

export function IconArrowsDownUp({ size = 20, color = 'black' }: IconProps) {
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
        <line x1="84" y1="48" x2="84" y2="208" />
        <polyline points="52 176 84 208 116 176" />
        <line x1="172" y1="208" x2="172" y2="48" />
        <polyline points="140 80 172 48 204 80" />
      </g>
    </svg>
  );
}
