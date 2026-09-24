import { IconCheck } from '../../assets/icons/IconCheck';
import './index.css';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  isComplete?: boolean;
  className?: string;
}

export function ProgressBar({
  currentStep,
  totalSteps,
  isComplete = false,
  className,
}: ProgressBarProps) {
  const percentage = isComplete
    ? 100
    : Math.min(100, Math.max(0, (currentStep / totalSteps) * 100));

  return (
    <div className={['progress-bar', className].filter(Boolean).join(' ')}>
      <div className="progress-bar__track">
        <div
          className="progress-bar__fill"
          style={{ width: `${percentage}%` }}
        />
      </div>
      {isComplete ? (
        <span className="progress-bar__icon">
          <IconCheck size={16} color="var(--color-grey-400)" />
        </span>
      ) : (
        <span className="progress-bar__label">{`${currentStep}/${totalSteps}`}</span>
      )}
    </div>
  );
}

export default ProgressBar;
