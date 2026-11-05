import type { IconProps } from '../../utils/types';

export function IconPhone({ size = 20, color = 'black' }: IconProps) {
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
        <rect x="72" y="24" width="112" height="208" rx="16" />
        <line x1="116" y1="200" x2="140" y2="200" />
      </g>
    </svg>
  );
}
