import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import './index.css';

export type TextFieldVariant = 'default' | 'error' | 'desplegable' | 'filled';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  variant?: TextFieldVariant;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  onClickIcon?: () => void;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  (
    {
      label,
      helperText,
      variant = 'default',
      leftIcon,
      rightIcon,
      onClickIcon,
      className,
      id,
      name,
      ...rest
    },
    ref,
  ) => {
    const inputId = id ?? name;

    const iconElement = rightIcon ? (
      onClickIcon ? (
        <button type="button" className="textfield__icon" onClick={onClickIcon}>
          {rightIcon}
        </button>
      ) : (
        <span className="textfield__icon">{rightIcon}</span>
      )
    ) : null;

    return (
      <div
        className={['textfield', `textfield--${variant}`, className]
          .filter(Boolean)
          .join(' ')}
      >
        {label && (
          <label htmlFor={inputId} className="textfield__label text-label">
            {label}
          </label>
        )}
        <div className="textfield__body">
          <div className="textfield__field">
            {leftIcon && <span className="textfield__icon">{leftIcon}</span>}
            <input
              id={inputId}
              name={name}
              ref={ref}
              className="textfield__input text-body-1"
              {...rest}
            />
            {iconElement}
          </div>
          {helperText && (
            <span className="textfield__helper text-body-3">{helperText}</span>
          )}
        </div>
      </div>
    );
  },
);

TextField.displayName = 'TextField';

export default TextField;
