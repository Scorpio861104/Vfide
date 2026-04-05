'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, DollarSign, QrCode, ShoppingBag, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useTranslation } from '@/lib/locale/useTranslation';

interface TrainingModule {
  id: string;
  title: string;
  minutes: number;
  level: 'starter' | 'growth' | 'advanced';
  points: string[];
}

interface QuickStartStep {
  id: string;
  titleKey: string;
  description: string;
  icon: typeof Sparkles;
}

interface MerchantTrainingProps {
  onComplete?: () => void;
  onSkip?: () => void;
}

const MODULES: TrainingModule[] = [
  {
    id: 'setup',
    title: 'Storefront setup basics',
    minutes: 8,
    level: 'starter',
    points: ['Complete merchant profile', 'Add payment options', 'Share your first QR checkout link'],
  },
  {
    id: 'sales',
    title: 'Increase repeat sales',
    minutes: 10,
    level: 'growth',
    points: ['Use loyalty and coupons', 'Launch gift cards', 'Track returns and top customers'],
  },
  {
    id: 'ops',
    title: 'Run operations cleanly',
    minutes: 12,
    level: 'advanced',
    points: ['Monitor expenses', 'Review supplier orders', 'Use installments and branch tracking'],
  },
];

const QUICKSTART_STEPS: QuickStartStep[] = [
  {
    id: 'welcome',
    titleKey: 'training.welcome',
    description: 'Start with the shortest path to your first live sale.',
    icon: Sparkles,
  },
  {
    id: 'add_product',
    titleKey: 'training.step_add_product',
    description: 'List one product or service so buyers can check out immediately.',
    icon: ShoppingBag,
  },
  {
    id: 'set_price',
    titleKey: 'training.step_set_price',
    description: 'Set a clean price and confirm the payment token you want to accept.',
    icon: DollarSign,
  },
  {
    id: 'generate_qr',
    titleKey: 'training.step_generate_qr',
    description: 'Create a QR link so the first customer can pay without friction.',
    icon: QrCode,
  },
];

export default function MerchantTraining({ onComplete, onSkip }: MerchantTrainingProps = {}) {
  const { t } = useTranslation();
  const [completed, setCompleted] = useState<string[]>([]);
  const [quickStep, setQuickStep] = useState(0);
  const progress = useMemo(() => (completed.length / MODULES.length) * 100, [completed]);
  const quickProgress = useMemo(() => ((quickStep + 1) / QUICKSTART_STEPS.length) * 100, [quickStep]);

  const toggleComplete = (id: string) => {
    setCompleted((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const handleNext = () => {
    if (quickStep === QUICKSTART_STEPS.length - 1) {
      onComplete?.();
      return;
    }
    setQuickStep((current) => Math.min(current + 1, QUICKSTART_STEPS.length - 1));
  };

  const handleBack = () => {
    setQuickStep((current) => Math.max(current - 1, 0));
  };

  const step = QUICKSTART_STEPS[Math.min(quickStep, QUICKSTART_STEPS.length - 1)]!;
  const StepIcon = step.icon;

  return (
    <div className="space-y-4">
      <Card className="border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 to-blue-500/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Sparkles className="h-5 w-5 text-cyan-300" />
            Guided quick launch
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={quickProgress} className="h-2" />
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <div className="mb-3 flex items-center gap-3">
              <div className="rounded-xl bg-cyan-500/10 p-2 text-cyan-300">
                <StepIcon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-white">{t(step.titleKey, step.description)}</div>
                <div className="text-xs text-gray-400">Step {quickStep + 1} of {QUICKSTART_STEPS.length}</div>
              </div>
            </div>
            <p className="text-sm text-gray-300">{step.description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={handleBack} disabled={quickStep === 0} className="gap-2">
              <ChevronLeft className="h-4 w-4" />
              {t('common.back', 'Back')}
            </Button>
            <Button onClick={handleNext} className="gap-2">
              {quickStep === QUICKSTART_STEPS.length - 1 ? t('common.done', 'Done') : t('common.next', 'Next')}
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" onClick={() => onSkip?.()} className="text-muted-foreground">
              {t('training.skip', 'Skip tutorial')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('merchantTraining.title', 'Merchant training')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {t('merchantTraining.subtitle', 'Short lessons to help merchants launch faster and operate with confidence.')}
          </p>
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {completed.length} / {MODULES.length} {t('merchantTraining.completed', 'modules completed')}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {MODULES.map((module) => {
          const done = completed.includes(module.id);
          return (
            <Card key={module.id} className={done ? 'border-emerald-500/60' : ''}>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">{module.title}</CardTitle>
                  <span className="rounded-full bg-muted px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                    {module.level}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="text-muted-foreground">{module.minutes} min</p>
                <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                  {module.points.map((point) => <li key={point}>{point}</li>)}
                </ul>
                <Button variant={done ? 'secondary' : 'default'} onClick={() => toggleComplete(module.id)}>
                  {done ? t('common.review', 'Review again') : t('common.markComplete', 'Mark complete')}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
