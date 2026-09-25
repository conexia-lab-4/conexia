import './index.css';

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}

export function ToggleSwitch({ checked, onChange, label }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`toggle-switch${checked ? ' toggle-switch--on' : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span className="toggle-switch__thumb" />
    </button>
  );
}

export default ToggleSwitch;
