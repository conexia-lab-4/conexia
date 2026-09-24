import type { ButtonHTMLAttributes, ReactNode } from 'react';
import './index.css';

export type ButtonVariant = 'fulfilled' | 'outlined';
export type ButtonSize = 'small' | 'medium' | 'large' | 'large-wide';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  rightIcon?: ReactNode;
  children: ReactNode;
}

const textClassBySize: Record<ButtonSize, string> = {
  small: 'text-body-3',
  medium: 'text-body-2',
  large: 'text-body-1-bold',
  'large-wide': 'text-body-2',
};

function getTextClassName(size: ButtonSize, variant: ButtonVariant): string {
  if (size === 'large-wide' && variant === 'outlined') {
    return 'text-body-2-bold';
  }
  return textClassBySize[size];
}

export function Button({
  variant = 'fulfilled',
  size = 'medium',
  rightIcon,
  children,
  className,
  ...rest
}: ButtonProps) {
  const textClassName = getTextClassName(size, variant);
  const buttonClassName = [
    'button',
    `button--${variant}`,
    `button--${size}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={buttonClassName} {...rest}>
      {rightIcon && <span className="button__icon">{rightIcon}</span>}
      <span className={textClassName}>{children}</span>
    </button>
  );
}

export default Button;
