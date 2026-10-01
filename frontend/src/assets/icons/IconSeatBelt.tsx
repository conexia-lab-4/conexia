import type { IconProps } from '../../utils/types';

export function IconSeatBelt({ size = 16, color = 'black' }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 256 256"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        cx="128"
        cy="56"
        r="28"
        fill="none"
        stroke={color}
        strokeWidth="16"
      />
      <path
        d="M72,224V152a56,56,0,0,1,112,0v72"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="16"
      />
      <line
        x1="172"
        y1="118"
        x2="96"
        y2="208"
        stroke={color}
        strokeLinecap="round"
        strokeWidth="16"
      />
      <line
        x1="72"
        y1="200"
        x2="184"
        y2="200"
        stroke={color}
        strokeLinecap="round"
        strokeWidth="16"
      />
    </svg>
  );
}
