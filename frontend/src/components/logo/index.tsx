import logoBig from '../../assets/logo/logo-big.png';
import logoSmall from '../../assets/logo/logo-small.png';
import './index.css';

export type LogoSize = 'big' | 'small';

interface LogoProps {
  size?: LogoSize;
  className?: string;
}

export function Logo({ size = 'small', className }: LogoProps) {
  const src = size === 'big' ? logoBig : logoSmall;

  return (
    <img
      src={src}
      alt="Conexia"
      className={['logo', `logo--${size}`, className].filter(Boolean).join(' ')}
    />
  );
}

export default Logo;
