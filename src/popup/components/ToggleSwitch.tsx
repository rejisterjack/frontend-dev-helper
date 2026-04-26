import type React from 'react';

// ============================================
// Toggle Switch Component
// Animated toggle switch with smooth transitions
// ============================================

interface ToggleSwitchProps {
  /** Whether the toggle is currently on */
  checked: boolean;
  /** Callback when toggle state changes */
  onChange: (checked: boolean) => void;
  /** Disabled state */
  disabled?: boolean;
  /** Accessible label for the toggle */
  label?: string;
  /** Additional CSS classes */
  className?: string;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onChange,
  disabled = false,
  label,
  className = '',
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!disabled) {
      onChange(e.target.checked);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!disabled) {
        onChange(!checked);
      }
    }
  };

  return (
    <label
      className={`toggle-switch inline-flex items-center ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
      title={label}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={handleChange}
        disabled={disabled}
        className="sr-only"
        aria-checked={checked}
        aria-label={label}
      />
      <span
        className={`
          toggle-slider
          relative inline-flex h-6 w-11 items-center rounded-full
          transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
          ${checked ? 'bg-primary-500 shadow-[0_0_8px_rgba(79,70,229,0.5)]' : 'bg-slate-700 hover:bg-slate-600'}
          ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
        `}
        role="switch"
        aria-checked={checked}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={handleKeyDown}
      >
        <span
          className={`
            inline-block h-4 w-4 transform rounded-full bg-white shadow-lg
            transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
            ${checked ? 'translate-x-6' : 'translate-x-1'}
          `}
        />
      </span>
      {label && <span className="ml-2 text-sm text-slate-300 sr-only">{label}</span>}
    </label>
  );
};

export default ToggleSwitch;
