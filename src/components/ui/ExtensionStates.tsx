import type React from 'react';

const shell =
  'rounded-xl border p-6 text-center transition-colors';

type Tone = 'dark' | 'light';

const toneClass: Record<Tone, string> = {
  dark: 'border-slate-700/60 bg-slate-800/35 text-slate-200',
  light: 'border-slate-200 bg-white text-slate-900 shadow-sm',
};

/**
 * Shared empty state — same voice across popup, side panel, and dashboard.
 */
export const ExtensionEmptyState: React.FC<{
  icon?: string;
  title: string;
  description: string;
  tone?: Tone;
  className?: string;
  children?: React.ReactNode;
}> = ({ icon = '◻', title, description, tone = 'dark', className = '', children }) => (
  <div className={`${shell} ${toneClass[tone]} ${className}`.trim()} role="status">
    <div className="mb-2 text-3xl opacity-90" aria-hidden>
      {icon}
    </div>
    <h3 className="text-sm font-semibold tracking-tight text-current">{title}</h3>
    <p className="mt-1.5 text-xs leading-relaxed text-current/75">{description}</p>
    {children ? <div className="mt-4 flex flex-col items-center gap-2">{children}</div> : null}
  </div>
);

export const ExtensionErrorState: React.FC<{
  title?: string;
  message: string;
  tone?: Tone;
  onRetry?: () => void;
  className?: string;
}> = ({ title = 'Something went wrong', message, tone = 'dark', onRetry, className = '' }) => {
  const box =
    tone === 'light'
      ? 'border-red-200 bg-red-50 text-red-900'
      : 'border-red-500/40 bg-red-950/30 text-red-100';
  return (
    <div className={`${shell} ${box} ${className}`.trim()} role="alert">
      <div className="mb-2 text-2xl" aria-hidden>
        ⚠
      </div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1.5 text-xs leading-relaxed opacity-90">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-500"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
};

export const ExtensionLoadingState: React.FC<{
  label?: string;
  tone?: Tone;
  className?: string;
}> = ({ label = 'Loading…', tone = 'dark', className = '' }) => (
  <div
    className={`${shell} ${toneClass[tone]} flex flex-col items-center justify-center gap-3 ${className}`.trim()}
    role="status"
    aria-busy="true"
    aria-live="polite"
  >
    <div
      className={`h-6 w-6 animate-spin rounded-full border-2 border-t-indigo-400 ${
        tone === 'light' ? 'border-slate-300' : 'border-slate-600'
      }`}
      aria-hidden
    />
    <p className={`text-xs ${tone === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>{label}</p>
  </div>
);
