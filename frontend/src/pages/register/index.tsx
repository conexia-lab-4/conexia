import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { TextField } from '../../components/textfield';
import { Button } from '../../components/button';
import './index.css';
import { IconEyeOff } from '../../assets/icons/IconEyeOff.tsx';
import { IconEye } from '../../assets/icons/IconEye.tsx';
import { IconBack } from '../../assets/icons/IconBack.tsx';
import {
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
} from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { getAuthErrorMessage } from '../../lib/authErrors';

const INSTITUTIONAL_DOMAIN = '@mail.austral.edu.ar';

interface RegisterFormErrors {
  nombre?: string;
  apellido?: string;
  email?: string;
  password?: string;
}

export function Register() {
  const navigate = useNavigate();
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<RegisterFormErrors>({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): boolean => {
    const nextErrors: RegisterFormErrors = {};

    if (!nombre.trim()) {
      nextErrors.nombre = 'El nombre es obligatorio';
    }

    if (!apellido.trim()) {
      nextErrors.apellido = 'El apellido es obligatorio';
    }

    if (!email.trim()) {
      nextErrors.email = 'El email es obligatorio';
    } else if (!/^\S+@\S+\.\S+$/.test(email)) {
      nextErrors.email = 'Ingresá un email válido';
    } else if (!email.toLowerCase().endsWith(INSTITUTIONAL_DOMAIN)) {
      nextErrors.email = `El email debe pertenecer al dominio ${INSTITUTIONAL_DOMAIN}`;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/;

    if (!password) {
      nextErrors.password = 'La contraseña es obligatoria';
    } else if (!passwordRegex.test(password)) {
      nextErrors.password =
        'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un carácter especial';
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
      const credential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      await updateProfile(credential.user, {
        displayName: `${nombre} ${apellido}`,
      });
      try {
        await sendEmailVerification(credential.user);
        navigate('/verify-email');
      } catch {
        navigate('/verify-email', { state: { verificationSendFailed: true } });
      }
    } catch (err) {
      setSubmitError(getAuthErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="register app-container">
      <div className="register__topbar">
        <button
          type="button"
          className="register__back"
          onClick={() => navigate(-1)}
          aria-label="Volver"
        >
          <IconBack size={20} color="black" />
        </button>
        <button
          type="button"
          className="register__link"
          onClick={() => navigate('/login')}
        >
          Iniciar Sesión
        </button>
      </div>

      <div className="register__intro">
        <h2 className="text-h4">Bienvenido!</h2>
        <p className="text-body-1">Conecta con tu comunidad.</p>
      </div>

      <div className="register__card">
        <form className="register__form" onSubmit={handleSubmit} noValidate>
          <TextField
            label="Nombre"
            type="text"
            name="nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            variant={errors.nombre ? 'error' : 'default'}
            helperText={errors.nombre}
            placeholder="Tu nombre"
          />
          <TextField
            label="Apellido"
            type="text"
            name="apellido"
            value={apellido}
            onChange={(e) => setApellido(e.target.value)}
            variant={errors.apellido ? 'error' : 'default'}
            helperText={errors.apellido}
            placeholder="Tu apellido"
          />
          <TextField
            label="Email institucional"
            type="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            variant={errors.email ? 'error' : 'default'}
            helperText={errors.email}
            placeholder="example@mail.austral.edu.ar"
          />
          <TextField
            label="Contraseña"
            type={showPassword ? 'text' : 'password'}
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            variant={errors.password ? 'error' : 'default'}
            helperText={errors.password}
            placeholder="Creá tu contraseña"
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
            <p className="register__error text-body-3">{submitError}</p>
          )}
          <Button
            type="submit"
            variant="fulfilled"
            size="large-wide"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Registrando...' : 'Registrarse'}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default Register;
