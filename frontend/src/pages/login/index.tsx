import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { TextField } from '../../components/textfield';
import { Button } from '../../components/button';
import './index.css';
import { IconEyeOff } from '../../assets/icons/IconEyeOff.tsx';
import { IconEye } from '../../assets/icons/IconEye.tsx';
import { IconBack } from '../../assets/icons/IconBack.tsx';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { getAuthErrorMessage } from '../../lib/authErrors';

interface LoginFormErrors {
  email?: string;
  password?: string;
}

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<LoginFormErrors>({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): boolean => {
    const nextErrors: LoginFormErrors = {};

    if (!email.trim()) {
      nextErrors.email = 'El email es obligatorio';
    } else if (!/^\S+@\S+\.\S+$/.test(email)) {
      nextErrors.email = 'Ingresá un email válido';
    }

    if (!password) {
      nextErrors.password = 'La contraseña es obligatoria';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitError('');

    if (!validate() || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      const credential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );
      navigate(credential.user.emailVerified ? '/home' : '/verify-email');
    } catch (err) {
      setSubmitError(getAuthErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login app-container">
      <div className="login__topbar">
        <button
          type="button"
          className="login__back"
          onClick={() => navigate(-1)}
          aria-label="Volver"
        >
          <IconBack size={20} color="black" />{' '}
        </button>
        <button
          type="button"
          className="login__link"
          onClick={() => navigate('/register')}
        >
          Registrarse
        </button>
      </div>

      <div className="login__intro">
        <h2 className="text-h4">Bienvenido de nuevo!</h2>
        <p className="text-body-1">Volvé a conectar con tu comunidad.</p>
      </div>

      <div className="login__card">
        <form className="login__form" onSubmit={handleSubmit} noValidate>
          <TextField
            label="Email"
            type="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            variant={errors.email ? 'error' : 'default'}
            helperText={errors.email}
            placeholder="example@mail.edu.ar"
          />
          <TextField
            label="Contraseña"
            type={showPassword ? 'text' : 'password'}
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            variant={errors.password ? 'error' : 'default'}
            helperText={errors.password}
            placeholder="Ingresa tu contraseña"
            rightIcon={
              showPassword ? (
                <IconEyeOff size={20} color="var(--color-primary-400)" />
              ) : (
                <IconEye size={20} color="var(--color-primary-400)" />
              )
            }
            onClickIcon={() => setShowPassword((prev) => !prev)}
          />
          {submitError && (
            <p className="login__error text-body-3">{submitError}</p>
          )}
          <Button
            type="submit"
            variant="fulfilled"
            size="large-wide"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Ingresando...' : 'Iniciar Sesión'}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default Login;
