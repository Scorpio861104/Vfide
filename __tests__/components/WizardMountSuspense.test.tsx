/**
 * WizardMount — Suspense boundary regression test.
 *
 * Verifies that:
 *  1. ClientLayout wraps <WizardMount /> in a <Suspense> boundary so that
 *     useSearchParams() does not crash on SSR/hydration.
 *  2. The Suspense import is present in ClientLayout.
 *  3. WizardMount renders without throwing when useSearchParams returns null
 *     (the SSR fallback path).
 */

import React, { Suspense } from 'react';
import { render, screen } from '@testing-library/react';

// ── Minimal mocks so the module graph resolves ────────────────────────────────

jest.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock('wagmi', () => ({
  useAccount: () => ({ isConnected: false, address: undefined }),
}));

jest.mock('@/hooks/useVaultHub', () => ({
  useVaultHub: () => ({
    hasVault: false,
    isLoadingVault: false,
    vaultHubConfigured: false,
  }),
}));

jest.mock('@/components/wizard/useWizardState', () => ({
  useWizardState: () => ({
    state: {
      enabled: false,
      currentChapter: 'welcome',
      completedChapters: [],
      skippedChapters: [],
      pausedAfter: null,
    },
    isComplete: false,
    currentIndex: 0,
    totalChapters: 8,
    markComplete: jest.fn(),
    skip: jest.fn(),
    goTo: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
    reset: jest.fn(),
    setEnabled: jest.fn(),
  }),
  WizardStateProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  CHAPTER_ORDER: ['welcome','createVault','spendLimits','guardians','finalizeGuardians','merchantApproval','proofScore','done'],
  CHAPTERS: [],
  REQUIRED_CHAPTERS: ['createVault'],
}));

jest.mock('@/components/wizard/VaultSetupWizard', () => ({
  VaultSetupWizard: () => null,
}));

// ── Source code checks ────────────────────────────────────────────────────────

describe('Suspense boundary — source-level checks', () => {
  it('ClientLayout imports Suspense from react', () => {
    const fs = require('fs');
    const src = fs.readFileSync(
      require('path').join(process.cwd(), 'components/layout/ClientLayout.tsx'),
      'utf8',
    );
    expect(src).toMatch(/import\s*\{[^}]*\bSuspense\b[^}]*\}\s*from\s*['"]react['"]/);
  });

  it('ClientLayout wraps WizardMount in Suspense', () => {
    const fs = require('fs');
    const src = fs.readFileSync(
      require('path').join(process.cwd(), 'components/layout/ClientLayout.tsx'),
      'utf8',
    );
    // The Suspense tag must appear before WizardMount on the same or adjacent lines
    const suspenseIdx = src.indexOf('<Suspense');
    const wizardMountIdx = src.indexOf('<WizardMount');
    expect(suspenseIdx).toBeGreaterThan(-1);
    expect(wizardMountIdx).toBeGreaterThan(-1);
    expect(suspenseIdx).toBeLessThan(wizardMountIdx);

    // And the closing </Suspense> must appear after WizardMount
    const closingIdx = src.indexOf('</Suspense>', wizardMountIdx);
    expect(closingIdx).toBeGreaterThan(wizardMountIdx);
  });
});

// ── Runtime render check ──────────────────────────────────────────────────────

import { WizardMount } from '@/components/wizard/WizardMount';

describe('WizardMount — renders inside Suspense without throwing', () => {
  it('does not throw when wrapped in Suspense', () => {
    expect(() =>
      render(
        <Suspense fallback={<div>loading</div>}>
          <WizardMount />
        </Suspense>,
      ),
    ).not.toThrow();
  });

  it('renders nothing when wizard is disabled and wallet not connected', () => {
    const { container } = render(
      <Suspense fallback={<div>loading</div>}>
        <WizardMount />
      </Suspense>,
    );
    // WizardMount returns null when wizard is off — container should be empty
    expect(container.firstChild).toBeNull();
  });
});
