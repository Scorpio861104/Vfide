import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

const mockWizardState = jest.fn();
const mockUseAccount = jest.fn();
const mockUseOnboarding = jest.fn();

jest.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get: () => ({ children, ...props }: any) => <div {...props}>{children}</div>,
    }
  ),
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return new Proxy({}, { get: () => Icon });
});

jest.mock('wagmi', () => ({
  useAccount: () => mockUseAccount(),
}));

jest.mock('@/components/onboarding', () => ({
  useOnboarding: () => mockUseOnboarding(),
}));

jest.mock('@/components/wizard/useWizardState', () => ({
  CHAPTERS: [
    { id: 'welcome', title: 'Welcome', shortLabel: 'Welcome' },
    { id: 'createVault', title: 'Create vault', shortLabel: 'Vault' },
    { id: 'done', title: 'Done', shortLabel: 'Done' },
  ],
  CHAPTER_ORDER: ['welcome', 'createVault', 'done'],
  useWizardState: () => mockWizardState(),
}));

jest.mock('@/components/crypto/VfideConnectButton', () => ({
  VfideConnectButton: () => <button>Connect Wallet</button>,
}));

jest.mock('@/components/wizard/chapters/WelcomeChapter', () => ({
  WelcomeChapter: ({ onContinue }: { onContinue: () => void }) => (
    <div>
      <p>Welcome Chapter</p>
      <button onClick={onContinue}>Continue Welcome</button>
    </div>
  ),
}));

jest.mock('@/components/wizard/chapters/CreateVaultChapter', () => ({
  CreateVaultChapter: ({ onComplete }: { onComplete: () => void }) => (
    <div>
      <p>Create Vault Chapter</p>
      <button onClick={onComplete}>Complete Create Vault</button>
    </div>
  ),
}));

jest.mock('@/components/wizard/chapters/SpendLimitsChapter', () => ({
  SpendLimitsChapter: ({ onComplete }: { onComplete: () => void }) => (
    <button onClick={onComplete}>Complete Spend Limits</button>
  ),
}));

jest.mock('@/components/wizard/chapters/GuardiansChapter', () => ({
  GuardiansChapter: ({ onComplete }: { onComplete: () => void }) => (
    <button onClick={onComplete}>Complete Guardians</button>
  ),
}));

jest.mock('@/components/wizard/chapters/FinalizeGuardiansChapter', () => ({
  FinalizeGuardiansChapter: ({ onComplete }: { onComplete: () => void }) => (
    <button onClick={onComplete}>Complete Finalize Guardians</button>
  ),
}));

jest.mock('@/components/wizard/chapters/MerchantApprovalChapter', () => ({
  MerchantApprovalChapter: ({ onComplete }: { onComplete: () => void }) => (
    <button onClick={onComplete}>Complete Merchant Approval</button>
  ),
}));

jest.mock('@/components/wizard/chapters/ProofScoreChapter', () => ({
  ProofScoreChapter: ({ onComplete }: { onComplete: () => void }) => (
    <button onClick={onComplete}>Complete ProofScore</button>
  ),
}));

jest.mock('@/components/wizard/chapters/DoneChapter', () => ({
  DoneChapter: ({ onClose }: { onClose: () => void }) => (
    <button onClick={onClose}>Close Wizard</button>
  ),
}));

const renderWizard = (props?: { forceOpen?: boolean; onClose?: () => void }) => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('../../components/wizard/VaultSetupWizard');
  const VaultSetupWizard = mod.VaultSetupWizard as React.ComponentType<any>;
  return render(<VaultSetupWizard {...props} />);
};

describe('VaultSetupWizard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAccount.mockReturnValue({ isConnected: true });
    mockUseOnboarding.mockReturnValue({ completeStep: jest.fn() });
    mockWizardState.mockReturnValue({
      state: {
        enabled: true,
        currentChapter: 'welcome',
        completedChapters: [],
        skippedChapters: [],
        pausedAfter: null,
      },
      isComplete: false,
      currentIndex: 0,
      totalChapters: 3,
      markComplete: jest.fn(),
      skip: jest.fn(),
      goTo: jest.fn(),
      pause: jest.fn(),
      resume: jest.fn(),
      reset: jest.fn(),
      setEnabled: jest.fn(),
    });
  });

  it('does not render when wizard disabled and not force opened', () => {
    mockWizardState.mockReturnValue({
      ...mockWizardState(),
      state: {
        enabled: false,
        currentChapter: 'welcome',
        completedChapters: [],
        skippedChapters: [],
        pausedAfter: null,
      },
      isComplete: false,
    });

    const { container } = renderWizard();
    expect(container).toBeEmptyDOMElement();
  });

  it('renders when forceOpen is true even if disabled', () => {
    mockWizardState.mockReturnValue({
      ...mockWizardState(),
      state: {
        enabled: false,
        currentChapter: 'welcome',
        completedChapters: [],
        skippedChapters: [],
        pausedAfter: null,
      },
      isComplete: false,
      currentIndex: 0,
      totalChapters: 3,
      markComplete: jest.fn(),
      skip: jest.fn(),
      goTo: jest.fn(),
      pause: jest.fn(),
      resume: jest.fn(),
      reset: jest.fn(),
      setEnabled: jest.fn(),
    });

    renderWizard({ forceOpen: true });
    expect(screen.getByText(/Welcome Chapter/i)).toBeTruthy();
  });

  it('calls markComplete on welcome continue', () => {
    const markComplete = jest.fn();
    mockWizardState.mockReturnValue({
      ...mockWizardState(),
      state: {
        enabled: true,
        currentChapter: 'welcome',
        completedChapters: [],
        skippedChapters: [],
        pausedAfter: null,
      },
      isComplete: false,
      currentIndex: 0,
      totalChapters: 3,
      markComplete,
      skip: jest.fn(),
      goTo: jest.fn(),
      pause: jest.fn(),
      resume: jest.fn(),
      reset: jest.fn(),
      setEnabled: jest.fn(),
    });

    renderWizard();
    fireEvent.click(screen.getByRole('button', { name: /Continue Welcome/i }));
    expect(markComplete).toHaveBeenCalledWith('welcome');
  });
});
