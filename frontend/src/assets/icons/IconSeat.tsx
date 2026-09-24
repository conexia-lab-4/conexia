import type { IconProps } from '../../utils/types';

export function IconSeat({ size = 16, color = 'black' }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 256 256"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M64,144V56a16,16,0,0,1,16-16H176a16,16,0,0,1,16,16v88"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="16"
      />
      <path
        d="M48,144H208a16,16,0,0,1,16,16v24a16,16,0,0,1-16,16H48a16,16,0,0,1-16-16V160A16,16,0,0,1,48,144Z"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="16"
      />
      <line
        x1="56"
        y1="200"
        x2="56"
        y2="224"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="16"
      />
      <line
        x1="200"
        y1="200"
        x2="200"
        y2="224"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="16"
      />
    </svg>
  );
}
