/**
 * Onboarding Component
 *
 * A multi-step welcome tour for first-time users of the FrontendDevHelper extension.
 * Shows on first install and guides users through the extension's features.
 */

import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import {
  getOnboardingCatalogTools,
  getOnboardingShortcutRows,
} from '@/utils/tool-catalog';

// ============================================
// Types
// ============================================

/** Onboarding step identifier */
type OnboardingStep = 1 | 2 | 3 | 4;

/** Onboarding component props */
export interface OnboardingProps {
  /** Callback when onboarding is completed or skipped */
  onComplete?: () => void;
  /** Storage key for tracking completion status */
  storageKey?: string;
  /** Whether to force show the onboarding (for demo/testing) */
  forceShow?: boolean;
}

/** Getting started tip */
interface TipInfo {
  icon: string;
  title: string;
  description: string;
}

// ============================================
// Constants
// ============================================

/** Default storage key for onboarding completion */
const DEFAULT_STORAGE_KEY = 'frontendDevHelper_onboardingCompleted';

const ONBOARDING_TOOLS = getOnboardingCatalogTools();
const ONBOARDING_SHORTCUTS = getOnboardingShortcutRows();
const ONBOARDING_TOOL_COUNT = ONBOARDING_TOOLS.length;

/** Getting started tips */
const TIPS: TipInfo[] = [
  {
    icon: '🎯',
    title: 'Quick Toggle',
    description: 'Click any tool card to instantly enable or disable it',
  },
  { icon: '⚙️', title: 'Customize', description: 'Click the gear icon to configure tool settings' },
  {
    icon: '🔄',
    title: 'Reset Anytime',
    description: 'Use the reset button to disable all tools at once',
  },
  {
    icon: '💡',
    title: 'Pro Tips',
    description: 'Check the popup footer for handy keyboard shortcuts',
  },
];

// ============================================
// Component
// ============================================

/**
 * Onboarding component for first-time users
 *
 * Displays a multi-step tour highlighting key features:
 * 1. Welcome screen with logo and tagline
 * 2. Tool overview grid (11 tools)
 * 3. Keyboard shortcuts showcase
 * 4. Getting started tips
 */
export const Onboarding: React.FC<OnboardingProps> = ({
  onComplete,
  storageKey = DEFAULT_STORAGE_KEY,
  forceShow = false,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(1);
  const [isAnimating, setIsAnimating] = useState(false);

  // Check if onboarding should be shown
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (forceShow) {
        setIsVisible(true);
        return;
      }

      try {
        // First check chrome.storage (primary)
        const result = await chrome.storage.sync.get(storageKey);
        if (result[storageKey] === true) {
          setIsVisible(false);
          return;
        }

        // Fallback to localStorage
        const localValue = localStorage.getItem(storageKey);
        if (localValue === 'true') {
          setIsVisible(false);
          return;
        }

        setIsVisible(true);
      } catch {
        // If chrome.storage fails, check localStorage
        const localValue = localStorage.getItem(storageKey);
        setIsVisible(localValue !== 'true');
      }
    };

    checkOnboardingStatus();
  }, [storageKey, forceShow]);

  // Mark onboarding as completed
  const markCompleted = useCallback(async () => {
    try {
      // Save to chrome.storage (primary)
      await chrome.storage.sync.set({ [storageKey]: true });
    } catch {
      // Fallback to localStorage
      localStorage.setItem(storageKey, 'true');
    }
  }, [storageKey]);

  // Handle skip tour
  const handleSkip = useCallback(async () => {
    setIsAnimating(true);
    await markCompleted();
    setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, 200);
  }, [markCompleted, onComplete]);

  // Handle get started / finish
  const handleFinish = useCallback(async () => {
    setIsAnimating(true);
    await markCompleted();
    setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, 200);
  }, [markCompleted, onComplete]);

  // Navigate to next step
  const handleNext = useCallback(() => {
    if (currentStep < 4) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep((prev) => (prev + 1) as OnboardingStep);
        setIsAnimating(false);
      }, 150);
    }
  }, [currentStep]);

  // Navigate to previous step
  const handlePrev = useCallback(() => {
    if (currentStep > 1) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep((prev) => (prev - 1) as OnboardingStep);
        setIsAnimating(false);
      }, 150);
    }
  }, [currentStep]);

  // Navigate to specific step
  const handleGoToStep = useCallback(
    (step: OnboardingStep) => {
      if (step !== currentStep) {
        setIsAnimating(true);
        setTimeout(() => {
          setCurrentStep(step);
          setIsAnimating(false);
        }, 150);
      }
    },
    [currentStep]
  );

  if (!isVisible) return null;

  return (
    <div
      className={`
        fixed inset-0 z-50 flex items-center justify-center
        bg-slate-950/90 backdrop-blur-sm
        animate-fade-in
        ${isAnimating ? 'opacity-0' : 'opacity-100'}
        transition-opacity duration-200
      `}
    >
      <div
        className="
          w-[420px] max-w-[90vw]
          bg-extension-bg-dark rounded-2xl shadow-2xl
          border border-slate-700/50
          overflow-hidden
          animate-slide-in
        "
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
      >
        {/* Progress Bar */}
        <div className="h-1 bg-[#111827]">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
            style={{ width: `${(currentStep / 4) * 100}%` }}
          />
        </div>

        {/* Content Area */}
        <div className="p-6 min-h-[380px] flex flex-col">
          {/* Step 1: Welcome */}
          {currentStep === 1 && <WelcomeStep />}

          {/* Step 2: Tools Overview */}
          {currentStep === 2 && <ToolsStep />}

          {/* Step 3: Keyboard Shortcuts */}
          {currentStep === 3 && <ShortcutsStep />}

          {/* Step 4: Getting Started Tips */}
          {currentStep === 4 && <TipsStep />}
        </div>

        {/* Footer: Navigation */}
        <div className="px-6 py-4 bg-[#111827]/50 border-t border-slate-700/50">
          <div className="flex items-center justify-between">
            {/* Step Indicators */}
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4].map((step) => (
                <button
                  type="button"
                  key={step}
                  onClick={() => handleGoToStep(step as OnboardingStep)}
                  className={`
                    w-2.5 h-2.5 rounded-full transition-all duration-200
                    ${
                      step === currentStep
                        ? 'bg-primary- w-6'
                        : step < currentStep
                          ? 'bg-primary-/50 hover:bg-primary-'
                          : 'bg-slate-600 hover:bg-slate-500'
                    }
                  `}
                  aria-label={`Go to step ${step}`}
                  aria-current={step === currentStep ? 'step' : undefined}
                />
              ))}
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center gap-3">
              {/* Skip Button (show on first 3 steps) */}
              {currentStep < 4 && (
                <button
                  type="button"
                  onClick={handleSkip}
                  className="
                    text-xs text-slate-400 hover:text-slate-300
                    transition-colors px-2 py-1
                  "
                >
                  Skip Tour
                </button>
              )}

              {/* Previous Button */}
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={handlePrev}
                  className="
                    btn-secondary text-xs px-4 py-2 rounded-lg
                    border border-slate-600 text-slate-300
                    hover:bg-slate-700 hover:text-white
                    transition-all duration-200
                  "
                >
                  Back
                </button>
              )}

              {/* Next/Finish Button */}
              {currentStep < 4 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="
                    btn-primary text-xs px-4 py-2 rounded-lg
                    bg-primary- text-white
                    hover:bg-primary-
                    transition-all duration-200
                    shadow-lg shadow-indigo-500/25
                  "
                >
                  Next
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFinish}
                  className="
                    btn-primary text-xs px-6 py-2 rounded-lg
                    bg-gradient-to-r from-indigo-600 to-purple-600
                    text-white font-medium
                    hover:from-indigo-500 hover:to-purple-500
                    transition-all duration-200
                    shadow-lg shadow-indigo-500/25
                  "
                >
                  Get Started
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// Step Components
// ============================================

/** Step 1: Welcome Screen */
const WelcomeStep: React.FC = () => (
  <div className="flex-1 flex flex-col items-center justify-center text-center animate-fade-in">
    {/* Logo */}
    <div className="relative mb-6">
      <div
        className="
        w-24 h-24 rounded-2xl
        bg-gradient-to-br from-indigo-500 to-purple-600
        flex items-center justify-center
        shadow-xl shadow-indigo-500/30
        animate-bounce-soft
      "
      >
        <svg
          aria-hidden="true"
          className="w-12 h-12 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
          />
        </svg>
      </div>
      {/* Sparkle decorations */}
      <span className="absolute -top-2 -right-2 text-2xl animate-pulse">✨</span>
      <span
        className="absolute -bottom-1 -left-3 text-xl animate-pulse"
        style={{ animationDelay: '0.5s' }}
      >
        ⚡
      </span>
    </div>

    {/* Title */}
    <h2
      id="onboarding-title"
      className="
        text-2xl font-bold mb-2
        bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400
        bg-clip-text text-transparent
      "
    >
      Welcome to FrontendDevHelper
    </h2>

    {/* Tagline */}
    <p className="text-slate-400 text-sm mb-6 max-w-[280px]">
      Your all-in-one toolkit for frontend development. Inspect, debug, and perfect your web pages
      with ease.
    </p>

    {/* Feature highlights */}
    <div className="flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1">
        <span className="text-emerald-400">●</span> {ONBOARDING_TOOL_COUNT} tools
      </span>
      <span className="flex items-center gap-1">
        <span className="text-blue-400">●</span> Keyboard Shortcuts
      </span>
      <span className="flex items-center gap-1">
        <span className="text-purple-400">●</span> Free Forever
      </span>
    </div>
  </div>
);

/** Step 2: Tools Overview Grid */
const ToolsStep: React.FC = () => (
  <div className="flex-1 flex flex-col animate-fade-in">
    <h3 className="text-lg font-semibold text-white mb-1">{ONBOARDING_TOOL_COUNT} tools</h3>
    <p className="text-slate-400 text-xs mb-4">
      Everything you need to debug and inspect frontend code (synced with the extension catalog)
    </p>

    {/* Tools Grid */}
    <div className="grid grid-cols-4 gap-2 overflow-y-auto max-h-[280px] pr-1 custom-scrollbar">
      {ONBOARDING_TOOLS.map((tool, index) => (
        <div
          key={tool.toolId}
          className="
            flex flex-col items-center p-2 rounded-lg
            bg-[#111827]/50 border border-slate-700/30
            hover:bg-[#111827] hover:border-slate-600
            transition-all duration-200
            group
          "
          style={{ animationDelay: `${index * 50}ms` }}
        >
          {/* Icon */}
          <div
            className="
              w-10 h-10 rounded-lg mb-1.5
              flex items-center justify-center text-lg
              bg-slate-700/50 group-hover:bg-slate-700
              transition-colors duration-200
            "
            style={{ color: tool.color }}
          >
            {tool.icon}
          </div>
          {/* Name */}
          <span className="text-[10px] text-slate-300 text-center font-medium leading-tight">
            {tool.name.split(' ')[0]}
          </span>
          {/* Description tooltip-like */}
          <span className="text-[8px] text-slate-500 text-center leading-tight mt-0.5">
            {tool.description}
          </span>
        </div>
      ))}
    </div>

    <p className="text-[10px] text-slate-500 mt-3 text-center">
      Click any tool to enable/disable • Hover for more info
    </p>
  </div>
);

/** Step 3: Keyboard Shortcuts */
const ShortcutsStep: React.FC = () => (
  <div className="flex-1 flex flex-col animate-fade-in">
    <h3 className="text-lg font-semibold text-white mb-1">Keyboard Shortcuts</h3>
    <p className="text-slate-400 text-xs mb-4">Speed up your workflow with these handy shortcuts</p>

    {/* Shortcuts List */}
    <div className="space-y-2 overflow-y-auto max-h-[280px] pr-1 custom-scrollbar">
      {ONBOARDING_SHORTCUTS.map((shortcut, index) => (
        <div
          key={`${shortcut.key}-${shortcut.description}`}
          className="
            flex items-center justify-between
            px-3 py-2 rounded-lg
            bg-[#111827]/50 border border-slate-700/30
            hover:bg-[#111827] hover:border-slate-600
            transition-all duration-200
          "
          style={{ animationDelay: `${index * 75}ms` }}
        >
          <span className="text-sm text-slate-300">{shortcut.description}</span>
          <kbd
            className="
            px-2 py-1 rounded-md
            bg-slate-700 text-slate-200
            text-[10px] font-mono
            border border-slate-600
            shadow-sm
            whitespace-nowrap
          "
          >
            {shortcut.key}
          </kbd>
        </div>
      ))}
    </div>

    <div className="mt-3 p-2 rounded-lg bg-primary-/10 border border-primary-/20">
      <p className="text-[10px] text-primary- text-center">
        💡 Tip: Customize shortcuts in{' '}
        <span className="font-medium">chrome://extensions/shortcuts</span>
      </p>
    </div>
  </div>
);

/** Step 4: Getting Started Tips */
const TipsStep: React.FC = () => (
  <div className="flex-1 flex flex-col animate-fade-in">
    <h3 className="text-lg font-semibold text-white mb-1">Getting Started</h3>
    <p className="text-slate-400 text-xs mb-4">Quick tips to make the most of FrontendDevHelper</p>

    {/* Tips List */}
    <div className="space-y-3 overflow-y-auto max-h-[280px] pr-1 custom-scrollbar">
      {TIPS.map((tip, index) => (
        <div
          key={tip.title}
          className="
            flex items-start gap-3
            p-3 rounded-lg
            bg-[#111827]/50 border border-slate-700/30
            hover:bg-[#111827] hover:border-slate-600
            transition-all duration-200
          "
          style={{ animationDelay: `${index * 100}ms` }}
        >
          {/* Icon */}
          <div
            className="
            w-10 h-10 rounded-lg
            bg-gradient-to-br from-indigo-500/20 to-purple-500/20
            flex items-center justify-center text-lg
            flex-shrink-0
          "
          >
            {tip.icon}
          </div>
          {/* Content */}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-slate-200 mb-0.5">{tip.title}</h4>
            <p className="text-xs text-slate-400 leading-relaxed">{tip.description}</p>
          </div>
        </div>
      ))}
    </div>

    {/* Ready message */}
    <div className="mt-auto pt-4 text-center">
      <p className="text-sm text-slate-300">You're all set! 🚀</p>
      <p className="text-xs text-slate-500 mt-1">
        Click "Get Started" to begin using FrontendDevHelper
      </p>
    </div>
  </div>
);

// ============================================
// Utility Functions
// ============================================

/**
 * Check if onboarding has been completed
 * @param storageKey - The storage key to check
 * @returns Promise<boolean> - Whether onboarding is completed
 */
export async function isOnboardingCompleted(
  storageKey: string = DEFAULT_STORAGE_KEY
): Promise<boolean> {
  try {
    const result = await chrome.storage.sync.get(storageKey);
    if (result[storageKey] === true) {
      return true;
    }
  } catch {
    // Chrome storage failed, fall through to localStorage
  }

  // Fallback to localStorage
  return localStorage.getItem(storageKey) === 'true';
}

/**
 * Reset onboarding status (useful for testing)
 * @param storageKey - The storage key to reset
 */
export async function resetOnboarding(storageKey: string = DEFAULT_STORAGE_KEY): Promise<void> {
  try {
    await chrome.storage.sync.remove(storageKey);
  } catch {
    // Ignore chrome storage errors
  }
  localStorage.removeItem(storageKey);
}

/**
 * Mark onboarding as completed programmatically
 * @param storageKey - The storage key to set
 */
export async function completeOnboarding(storageKey: string = DEFAULT_STORAGE_KEY): Promise<void> {
  try {
    await chrome.storage.sync.set({ [storageKey]: true });
  } catch {
    // Fallback to localStorage
  }
  localStorage.setItem(storageKey, 'true');
}

export default Onboarding;
