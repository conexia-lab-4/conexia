import './index.css';

interface CompatibilityRingProps {
  percent: number;
  size?: number;
}

const HIGH_COMPATIBILITY_THRESHOLD = 80;

export function CompatibilityRing({
  percent,
  size = 56,
}: CompatibilityRingProps) {
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedPercent = Math.min(100, Math.max(0, percent));
  const offset = circumference - (clampedPercent / 100) * circumference;
  const color =
    clampedPercent >= HIGH_COMPATIBILITY_THRESHOLD
      ? 'var(--color-success-500)'
      : 'var(--color-primary-500)';

  return (
    <div className="compatibility-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-grey-200)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className="compatibility-ring__label" style={{ color }}>
        {clampedPercent}%
      </span>
    </div>
  );
}

export default CompatibilityRing;