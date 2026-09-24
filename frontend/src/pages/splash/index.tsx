import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../../components/logo';
import './index.css';

const SPLASH_DURATION_MS = 2000;
const FADE_DURATION_MS = 400;

export function Splash() {
  const navigate = useNavigate();
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setIsFading(true), SPLASH_DURATION_MS);
    const navigateTimer = setTimeout(
      () => navigate('/landing'),
      SPLASH_DURATION_MS + FADE_DURATION_MS,
    );

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(navigateTimer);
    };
  }, [navigate]);

  return (
    <div className={`splash${isFading ? ' splash--fading' : ''}`}>
      <div className="splash__ellipse splash__ellipse--top" />
      <div className="splash__content">
        <Logo size="big" />
        <p className="splash__tagline">Conectá. Organizá. Compartí.</p>
      </div>
      <div className="splash__ellipse splash__ellipse--bottom" />
    </div>
  );
}

export default Splash;
