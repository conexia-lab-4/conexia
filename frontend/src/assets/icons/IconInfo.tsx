import type { IconProps } from '../../utils/types';

export function IconInfo({ size = 16, color = 'black' }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 256 256"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        cx="128"
        cy="128"
        r="96"
        fill="none"
        stroke={color}
        strokeWidth="16"
      />
      <line
        x1="128"
        y1="120"
        x2="128"
        y2="176"
        stroke={color}
        strokeLinecap="round"
        strokeWidth="16"
      />
      <circle cx="128" cy="84" r="12" fill={color} />
    </svg>
  );
}
