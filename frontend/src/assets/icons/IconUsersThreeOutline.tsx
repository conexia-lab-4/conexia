import type { IconProps } from '../../utils/types';

export function IconUsersThreeOutline({ size = 16, color = 'black' }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 256 256"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M192,120a59.91,59.91,0,0,1,48,24" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
      <path d="M16,144a59.91,59.91,0,0,1,48-24" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
      <circle cx="128" cy="144" r="40" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
      <path d="M72,216a65,65,0,0,1,112,0" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
      <path d="M161,80a32,32,0,1,1,31,40" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
      <path d="M64,120A32,32,0,1,1,95,80" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
    </svg>
  );
}