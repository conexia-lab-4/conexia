import { useNavigate } from 'react-router-dom';
import { Logo } from '../../components/logo';
import { Button } from '../../components/button';
import './index.css';

export function Landing() {
  const navigate = useNavigate();

  return (
    <div className="landing">
      <div className="landing__header">
        <Logo size="big" />
        <p className="landing__tagline">Conectá. Organizá. Compartí.</p>
      </div>

      <div className="landing__card">
        <div className="landing__text">
          <h2 className="text-h4">Bienvenido</h2>
          <p className="text-body-1">
            Conexia te ayuda a organizarte, encontrar personas con horarios
            similares y compartir viajes de manera más fácil.
          </p>
        </div>

        <div className="landing__actions">
          <Button
            variant="fulfilled"
            size="large"
            onClick={() => navigate('/register')}
          >
            Registrarse
          </Button>
          <Button
            variant="outlined"
            size="large"
            onClick={() => navigate('/login')}
          >
            Iniciar Sesión
          </Button>
        </div>
      </div>
    </div>
  );
}

export default Landing;
