import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/button';
import './index.css';

// TODO: reemplazar por la verificación real con Firebase (reload del user + chequeo de emailVerified)
async function checkEmailVerifiedStub(): Promise<boolean> {
  await new Promise((resolve) => setTimeout(resolve, 800));
  return Math.random() < 0.5;
}

export function VerifyEmail() {
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  const handleCheck = async () => {
    if (isChecking) {
      return;
    }

    setFeedback('');
    setError('');
    setIsChecking(true);

    try {
      const isVerified = await checkEmailVerifiedStub();

      if (isVerified) {
        navigate('/questionnaire');
      } else {
        setFeedback(
          'Todavía no verificamos tu email. Revisá tu bandeja de entrada e intentá de nuevo.',
        );
      }
    } catch {
      setError(
        'No pudimos consultar el estado de tu cuenta. Intentá de nuevo.',
      );
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="verify-email app-container">
      <div className="verify-email__intro">
        <h2 className="text-h4">Verifique su email!</h2>
        <p className="text-body-1">
          Ayúdenos a mantener nuestra comunidad de forma segura!
        </p>
      </div>

      <div className="verify-email__card">
        <p className="verify-email__text text-body-1">
          Te enviamos un email con un enlace para validar tu dirección de correo
          electrónico. Revisa tu bandeja de entrada y haz clic en el enlace para
          completar la verificación.
        </p>
        {feedback && (
          <p className="verify-email__feedback text-body-3">{feedback}</p>
        )}
        {error && <p className="verify-email__error text-body-3">{error}</p>}
        <Button
          type="button"
          variant="fulfilled"
          size="large-wide"
          disabled={isChecking}
          onClick={handleCheck}
        >
          {isChecking ? 'Verificando...' : 'Ya validé mi email'}
        </Button>
      </div>
    </div>
  );
}

export default VerifyEmail;
