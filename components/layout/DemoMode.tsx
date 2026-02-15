'use client';

import { useState } from 'react';

const demoSteps = [
  {
    id: 'payment',
    title: 'Someone sent you money!',
    actionLabel: 'See Payment',
  },
  {
    id: 'vault',
    title: 'Your vault is secured',
    actionLabel: 'View Vault',
  },
];

export function DemoMode() {
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  if (!active) {
    return (
      <button
        type="button"
        onClick={() => setActive(true)}
        className="inline-flex items-center gap-2 rounded-full bg-zinc-800 px-4 py-2 text-sm font-semibold text-white"
      >
        <span aria-hidden="true">🎮</span>
        Try Demo Mode
      </button>
    );
  }

  const step = demoSteps[stepIndex] ?? demoSteps[0];

  if (!step) {
    return null;
  }

  return (
    <div className="rounded-xl bg-zinc-900 p-4 text-white">
      <p className="text-sm font-semibold">{step.title}</p>
      <button
        type="button"
        onClick={() => setStepIndex((prev) => (prev + 1) % demoSteps.length)}
        className="mt-3 inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold"
      >
        {step.actionLabel}
      </button>
    </div>
  );
}

export default DemoMode;
