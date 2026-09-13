import type { IconProps } from '../../utils/types';

export function IconDotsThree({ size = 16, color = 'black' }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 256 256"
      fill={color}
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="128" cy="128" r="12" />
      <circle cx="196" cy="128" r="12" />
      <circle cx="60" cy="128" r="12" />
    </svg>
  );
}
