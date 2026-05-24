import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Box,
  Eye,
  ShieldCheck,
  Scan,
  Pipette,
  ArrowRight,
  ArrowLeft,
  Zap,
  Code2,
  type LucideIcon,
} from 'lucide-react';

const STORAGE_KEY = 'fdh-onboarding-dismissed';

const RECOMMENDED_TOOLS: { name: string; icon: LucideIcon; description: string }[] = [
  { name: 'DOM Outliner', icon: Box, description: 'Visualize DOM structure' },
  { name: 'CSS Inspector', icon: Eye, description: 'Inspect CSS rules and styles' },
  { name: 'Accessibility Audit', icon: ShieldCheck, description: 'WCAG compliance checking' },
  { name: 'Element Inspector', icon: Scan, description: 'Deep element inspection' },
  { name: 'Color Picker', icon: Pipette, description: 'Pick colors from any element' },
];

interface OnboardingStepProps {
  step: number;
  onNext: () => void;
  onPrev: () => void;
  onFinish: () => void;
  isFirst: boolean;
  isLast: boolean;
}

function StepWelcome({ onNext, onFinish, isFirst, isLast }: OnboardingStepProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="text-center">
        <div className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
          Welcome to FDH
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Your all-in-one frontend debugging toolkit
        </p>
      </div>
      <div className="text-xs font-medium text-muted-foreground">Top recommended tools to get started:</div>
      <div className="flex flex-col gap-1.5">
        {RECOMMENDED_TOOLS.map((tool) => {
          const Icon = tool.icon;
          return (
            <div
              key={tool.name}
              className="flex items-center gap-2 rounded-md border px-2 py-1.5"
            >
              <div className="flex size-6 shrink-0 items-center justify-center rounded bg-primary/10">
                <Icon className="size-3 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-medium">{tool.name}</div>
                <div className="text-[10px] text-muted-foreground">{tool.description}</div>
              </div>
              <Badge variant="secondary" className="text-[0.5rem] px-1 py-0">
                Popular
              </Badge>
            </div>
          );
        })}
      </div>
      <StepActions onNext={onNext} onFinish={onFinish} isFirst={isFirst} isLast={isLast} />
    </div>
  );
}

function StepActions({
  onNext,
  onPrev,
  onFinish,
  isFirst,
  isLast,
}: {
  onNext: () => void;
  onPrev?: () => void;
  onFinish: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  return (
    <div className="flex items-center justify-between pt-1">
      {!isFirst ? (
        <Button variant="ghost" size="sm" onClick={onPrev}>
          <ArrowLeft className="size-3 mr-1" />
          Back
        </Button>
      ) : (
        <div />
      )}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onFinish}>
          Skip
        </Button>
        {isLast ? (
          <Button size="sm" onClick={onFinish}>
            Get Started
          </Button>
        ) : (
          <Button size="sm" onClick={onNext}>
            Next
            <ArrowRight className="size-3 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}

const STEPS = [StepWelcome, StepVSCodeBridge, StepAudit];

function StepVSCodeBridge({ onNext, onPrev, onFinish, isFirst, isLast }: OnboardingStepProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="text-center">
        <Code2 className="size-8 mx-auto text-primary mb-1" />
        <div className="text-lg font-semibold">Click Any Element, Open in VS Code</div>
        <p className="text-xs text-muted-foreground mt-1">
          The bridge between your browser and editor
        </p>
      </div>
      <div className="rounded-md border p-2 text-xs text-muted-foreground space-y-1.5">
        <div className="flex items-start gap-2">
          <span className="shrink-0 size-4 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-bold text-primary">1</span>
          <span>Activate the <span className="font-semibold text-foreground">Element Inspector</span> from the Tools tab</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="shrink-0 size-4 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-bold text-primary">2</span>
          <span>Click any element on the page to see its source info</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="shrink-0 size-4 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-bold text-primary">3</span>
          <span>Hit <span className="font-semibold text-foreground">&quot;Open in VS Code&quot;</span> to jump to exact source line</span>
        </div>
      </div>
      <div className="rounded-md bg-primary/5 border border-primary/20 p-2 text-[10px] text-primary text-center">
        Works with React, Vue, and Svelte source maps
      </div>
      <StepActions onNext={onNext} onPrev={onPrev} onFinish={onFinish} isFirst={isFirst} isLast={isLast} />
    </div>
  );
}

function StepAudit({ onPrev, onFinish, isFirst, isLast }: OnboardingStepProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="text-center">
        <Zap className="size-8 mx-auto text-primary mb-1" />
        <div className="text-lg font-semibold">One-Click Audits, AI-Powered Fixes</div>
        <p className="text-xs text-muted-foreground mt-1">
          Find and fix issues automatically
        </p>
      </div>
      <div className="rounded-md border p-2 text-xs text-muted-foreground space-y-1.5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-3.5 text-primary shrink-0" />
          <span><span className="font-semibold text-foreground">Accessibility Audit</span> — 90+ WCAG rules via axe-core</span>
        </div>
        <div className="flex items-center gap-2">
          <Eye className="size-3.5 text-primary shrink-0" />
          <span><span className="font-semibold text-foreground">Performance Audit</span> — Core Web Vitals scoring</span>
        </div>
        <div className="flex items-center gap-2">
          <Scan className="size-3.5 text-primary shrink-0" />
          <span><span className="font-semibold text-foreground">Full Audit</span> — Everything in one click</span>
        </div>
      </div>
      <div className="rounded-md bg-muted p-2 text-[10px] text-muted-foreground text-center">
        Connect AI in Settings for auto-fix suggestions and VS Code diff previews
      </div>
      <StepActions onNext={() => {}} onPrev={onPrev} onFinish={onFinish} isFirst={isFirst} isLast={isLast} />
    </div>
  );
}

export function OnboardingOverlay() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    checkOnboardingStatus().then((shouldShow) => {
      if (shouldShow) {
        setOpen(true);
      }
    });
  }, []);

  const handleFinish = useCallback(async () => {
    if (dontShowAgain) {
      await chrome.storage.local.set({ [STORAGE_KEY]: true });
    }
    setOpen(false);
  }, [dontShowAgain]);

  const handleNext = useCallback(() => {
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }, []);

  const handlePrev = useCallback(() => {
    setStep((s) => Math.max(s - 1, 0));
  }, []);

  const CurrentStep = STEPS[step];

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleFinish(); }}>
      <DialogContent showCloseButton={false} className="max-w-xs">
        <DialogHeader>
          <DialogTitle className="sr-only">Onboarding</DialogTitle>
          <DialogDescription className="sr-only">
            Welcome to Frontend Dev Helper. Let's get you started.
          </DialogDescription>
        </DialogHeader>
        <CurrentStep
          step={step}
          onNext={handleNext}
          onPrev={handlePrev}
          onFinish={handleFinish}
          isFirst={step === 0}
          isLast={step === STEPS.length - 1}
        />
        <div className="flex items-center justify-between pt-1 border-t mt-1">
          <div className="flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`size-1.5 rounded-full transition-colors ${
                  i === step ? 'bg-primary' : 'bg-muted-foreground/30'
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <Checkbox
              id="dont-show-again"
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(checked === true)}
              className="size-3"
            />
            <Label htmlFor="dont-show-again" className="text-[10px] text-muted-foreground cursor-pointer">
              Don&apos;t show again
            </Label>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

async function checkOnboardingStatus(): Promise<boolean> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return !result[STORAGE_KEY];
}

export function useOnboarding(): { shouldShow: boolean; dismiss: () => Promise<void> } {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    checkOnboardingStatus().then(setShouldShow);
  }, []);

  const dismiss = useCallback(async () => {
    await chrome.storage.local.set({ [STORAGE_KEY]: true });
    setShouldShow(false);
  }, []);

  return { shouldShow, dismiss };
}
