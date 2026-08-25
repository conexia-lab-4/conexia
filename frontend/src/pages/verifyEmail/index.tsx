import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { sendEmailVerification } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { Button } from '../../components/button';
import './index.css';

interface LocationState {
  verificationSendFailed?: boolean;
}

async function checkEmailVerified(): Promise<boolean> {
  const user = auth.currentUser;

  if (!user) {
    throw new Error('No hay una sesión activa');
  }

  await user.reload();
  return user.emailVerified;
}

export function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;

  const [isChecking, setIsChecking] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState(
    state?.verificationSendFailed
      ? 'No pudimos enviarte el email de verificación. Probá reenviarlo.'
      : '',
  );

  const handleCheck = async () => {
    if (isChecking) {
      return;
    }

    setFeedback('');
    setError('');
    setIsChecking(true);

    try {
      const isVerified = await checkEmailVerified();

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

  const handleResend = async () => {
    if (isResending || !auth.currentUser) {
      return;
    }

    setError('');
    setFeedback('');
    setIsResending(true);

    try {
      await sendEmailVerification(auth.currentUser);
      setFeedback(
        'Te reenviamos el email de verificación. Revisá tu bandeja de entrada.',
      );
    } catch {
      setError(
        'No pudimos reenviar el email. Intentá de nuevo en unos minutos.',
      );
    } finally {
      setIsResending(false);
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
        <Button
          type="button"
          variant="outlined"
          size="large-wide"
          disabled={isResending}
          onClick={handleResend}
        >
          {isResending ? 'Reenviando...' : 'Reenviar email'}
        </Button>
      </div>
    </div>
  );
}

export default VerifyEmail;
