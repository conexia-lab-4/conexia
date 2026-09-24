import { useNavigate } from 'react-router-dom';
import { IconUserCheck } from '../../assets/icons/IconUserCheck';
import { IconSparkles } from '../../assets/icons/IconSparkles';
import { IconBack } from '../../assets/icons/IconBack';
import { ProgressBar } from '../progressbar';
import './index.css';

interface ProfilePendingCardProps {
  completedSteps: number;
  totalSteps: number;
}

export function ProfilePendingCard({
  completedSteps,
  totalSteps,
}: ProfilePendingCardProps) {
  const navigate = useNavigate();

  return (
    <div className="profile-pending-card">
      <div className="profile-pending-card__top">
        <div className="profile-pending-card__icon-bubble">
          <IconUserCheck size={20} color="var(--color-info-icon)" />
        </div>
        <div className="profile-pending-card__text">
          <div className="profile-pending-card__title-row">
            <span className="profile-pending-card__title">
              Tu perfil está casi listo!
            </span>
            <IconSparkles size={13} color="var(--color-info-link-icon)" />
          </div>
          <p className="profile-pending-card__subtitle">
            Completá tus datos para encontrar mejores matches.
          </p>
        </div>
      </div>

      <ProgressBar currentStep={completedSteps} totalSteps={totalSteps} />

      <button
        type="button"
        className="profile-pending-card__continue"
        onClick={() => navigate('/questionnaire')}
      >
        Continuar
        <span className="profile-pending-card__continue-icon">
          <IconBack size={16} color="var(--color-info-link-icon)" />
        </span>
      </button>
    </div>
  );
}
