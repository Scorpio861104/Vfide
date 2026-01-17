/**
 * Vault Setup Wizard
 * 
 * 3-step guided wizard replacing 10+ step complex setup
 * Connect → Fund → Secure (with skip options for advanced users)
 */

'use client';

import { useState } from 'react';

type WizardStep = 'connect' | 'fund' | 'secure' | 'complete';

interface VaultWizardProps {
  onComplete?: () => void;
  onSkip?: () => void;
}

export function VaultWizard({ onComplete, onSkip }: VaultWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('connect');
  const [walletConnected, setWalletConnected] = useState(false);
  const [fundingComplete, setFundingComplete] = useState(false);
  const [securitySetup, setSecuritySetup] = useState(false);
  
  const steps = [
    { id: 'connect', label: 'Connect Wallet', number: 1 },
    { id: 'fund', label: 'Fund Vault', number: 2 },
    { id: 'secure', label: 'Secure Account', number: 3 },
  ];
  
  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);
  
  const handleAdvanceStep = () => {
    if (currentStep === 'connect') {
      setWalletConnected(true);
      setCurrentStep('fund');
    } else if (currentStep === 'fund') {
      setFundingComplete(true);
      setCurrentStep('secure');
    } else if (currentStep === 'secure') {
      setSecuritySetup(true);
      setCurrentStep('complete');
      onComplete?.();
    }
  };
  
  const handleSkipToAdvanced = () => {
    onSkip?.();
  };
  
  if (currentStep === 'complete') {
    return <CompletionScreen />;
  }
  
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Welcome to VFIDE!
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Let's get your vault set up in 3 easy steps
        </p>
      </div>
      
      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, idx) => (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                    idx <= currentStepIndex
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                  } transition-colors`}
                >
                  {step.number}
                </div>
                <span className={`text-sm mt-2 ${
                  idx === currentStepIndex
                    ? 'text-purple-600 dark:text-purple-400 font-semibold'
                    : 'text-gray-600 dark:text-gray-400'
                }`}>
                  {step.label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div
                  className={`h-1 flex-1 mx-4 rounded ${
                    idx < currentStepIndex
                      ? 'bg-purple-600'
                      : 'bg-gray-200 dark:bg-gray-700'
                  } transition-colors`}
                />
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Step Content */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-8 border-2 border-gray-200 dark:border-gray-700">
        {currentStep === 'connect' && (
          <ConnectWalletStep onConnect={handleAdvanceStep} />
        )}
        {currentStep === 'fund' && (
          <FundVaultStep onFund={handleAdvanceStep} onSkip={handleAdvanceStep} />
        )}
        {currentStep === 'secure' && (
          <SecureAccountStep onSecure={handleAdvanceStep} onSkip={handleAdvanceStep} />
        )}
      </div>
      
      {/* Skip to Advanced */}
      <div className="text-center mt-6">
        <button
          onClick={handleSkipToAdvanced}
          className="text-sm text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 underline"
        >
          I'm an advanced user, skip wizard
        </button>
      </div>
    </div>
  );
}

function ConnectWalletStep({ onConnect }: { onConnect: () => void }) {
  const [connecting, setConnecting] = useState(false);
  
  const handleConnect = async () => {
    setConnecting(true);
    // TODO: Actual wallet connection
    setTimeout(() => {
      setConnecting(false);
      onConnect();
    }, 1500);
  };
  
  return (
    <div className="text-center">
      <div className="text-6xl mb-6">🔗</div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
        Connect Your Wallet
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
        We support MetaMask, WalletConnect, and other popular wallets.
        Choose your preferred wallet to get started.
      </p>
      
      <div className="space-y-3 max-w-sm mx-auto">
        <button
          onClick={handleConnect}
          disabled={connecting}
          className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-semibold rounded-lg transition-colors"
        >
          {connecting ? (
            <>
              <span className="animate-spin">⏳</span>
              <span>Connecting...</span>
            </>
          ) : (
            <>
              <span>🦊</span>
              <span>Connect MetaMask</span>
            </>
          )}
        </button>
        
        <button
          className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 hover:border-purple-500 dark:hover:border-purple-500 text-gray-900 dark:text-white font-semibold rounded-lg transition-colors"
        >
          <span>🔗</span>
          <span>WalletConnect</span>
        </button>
      </div>
      
      <p className="text-xs text-gray-500 dark:text-gray-500 mt-6">
        Don't have a wallet? <a href="/help/wallets" className="text-purple-600 dark:text-purple-400 hover:underline">Learn how to create one</a>
      </p>
    </div>
  );
}

function FundVaultStep({ onFund, onSkip }: { onFund: () => void; onSkip: () => void }) {
  const [funding, setFunding] = useState(false);
  const [amount, setAmount] = useState('0.1');
  
  const handleFund = async () => {
    setFunding(true);
    // TODO: Actual funding transaction
    setTimeout(() => {
      setFunding(false);
      onFund();
    }, 2000);
  };
  
  return (
    <div className="text-center">
      <div className="text-6xl mb-6">💰</div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
        Fund Your Vault
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
        Add some ETH to your vault to start making transactions.
        We recommend starting with at least 0.1 ETH.
      </p>
      
      <div className="max-w-sm mx-auto space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-left">
            Amount to Fund (ETH)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            step="0.01"
            min="0"
            className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-purple-500 focus:outline-none"
          />
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-2 text-left">
            Recommended: 0.1 ETH (~$200 USD)
          </p>
        </div>
        
        <button
          onClick={handleFund}
          disabled={funding}
          className="w-full px-6 py-4 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-semibold rounded-lg transition-colors"
        >
          {funding ? 'Processing...' : 'Fund Vault'}
        </button>
        
        <button
          onClick={onSkip}
          className="w-full px-6 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:border-purple-500 dark:hover:border-purple-500 transition-colors"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}

function SecureAccountStep({ onSecure, onSkip }: { onSecure: () => void; onSkip: () => void }) {
  const [setting2FA, setSetting2FA] = useState(false);
  
  const handleSetup = async () => {
    setSetting2FA(true);
    // TODO: Actual 2FA setup
    setTimeout(() => {
      setSetting2FA(false);
      onSecure();
    }, 1500);
  };
  
  return (
    <div className="text-center">
      <div className="text-6xl mb-6">🔒</div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
        Secure Your Account
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
        Add an extra layer of security to protect your account.
        These steps are optional but highly recommended.
      </p>
      
      <div className="max-w-sm mx-auto space-y-4">
        <button
          onClick={handleSetup}
          disabled={setting2FA}
          className="w-full flex items-center justify-between px-6 py-4 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-semibold rounded-lg transition-colors"
        >
          <div className="flex items-center gap-3">
            <span>🔐</span>
            <span>Enable 2FA</span>
          </div>
          <span className="text-sm">(Recommended)</span>
        </button>
        
        <button className="w-full flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 hover:border-purple-500 dark:hover:border-purple-500 text-gray-900 dark:text-white font-semibold rounded-lg transition-colors">
          <div className="flex items-center gap-3">
            <span>📧</span>
            <span>Set Recovery Email</span>
          </div>
          <span className="text-sm text-gray-500">(Optional)</span>
        </button>
        
        <button
          onClick={onSkip}
          className="w-full px-6 py-3 text-gray-600 dark:text-gray-400 font-medium hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
        >
          I'll do this later
        </button>
      </div>
    </div>
  );
}

function CompletionScreen() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <div className="text-8xl mb-8 animate-bounce">🎉</div>
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
        You're All Set!
      </h1>
      <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
        Your vault is ready to use. Start exploring the platform!
      </p>
      
      <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
        <a
          href="/vault"
          className="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
        >
          Go to Vault
        </a>
        <a
          href="/dashboard"
          className="px-8 py-4 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 hover:border-purple-500 dark:hover:border-purple-500 text-gray-900 dark:text-white font-semibold rounded-lg transition-colors"
        >
          View Dashboard
        </a>
      </div>
    </div>
  );
}
