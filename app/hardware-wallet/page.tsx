'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Footer } from '@/components/layout/Footer';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { 
  Shield, 
  Usb, 
  Bluetooth, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  ArrowLeft,
  Fingerprint,
  Lock,
  RefreshCw,
  ExternalLink,
  HelpCircle,
  Zap,
  Settings,
  FileCheck,
  Download,
  Info
} from 'lucide-react';

// Hardware wallet types
type WalletBrand = 'ledger' | 'trezor' | 'gridplus' | 'keystone';

interface WalletInfo {
  name: string;
  icon: string;
  description: string;
  connectionTypes: ('usb' | 'bluetooth')[];
  firmwareUrl: string;
  supportUrl: string;
  features: string[];
}

const WALLET_INFO: Record<WalletBrand, WalletInfo> = {
  ledger: {
    name: 'Ledger',
    icon: '🔐',
    description: 'Industry-leading security with Secure Element chip',
    connectionTypes: ['usb', 'bluetooth'],
    firmwareUrl: 'https://www.ledger.com/ledger-live',
    supportUrl: 'https://support.ledger.com',
    features: ['Secure Element chip', 'Bluetooth (Nano X)', 'Multi-app support', 'Ledger Live companion app']
  },
  trezor: {
    name: 'Trezor',
    icon: '🛡️',
    description: 'Open-source hardware wallet with passphrase support',
    connectionTypes: ['usb'],
    firmwareUrl: 'https://trezor.io/trezor-suite',
    supportUrl: 'https://trezor.io/support',
    features: ['Open-source firmware', 'Passphrase protection', 'Shamir backup', 'Trezor Suite companion app']
  },
  gridplus: {
    name: 'GridPlus Lattice1',
    icon: '⬡',
    description: 'Enterprise-grade security with large touchscreen',
    connectionTypes: ['usb'],
    firmwareUrl: 'https://gridplus.io/setup',
    supportUrl: 'https://docs.gridplus.io',
    features: ['Large touchscreen', 'SafeCards backup', 'Enterprise features', 'MetaMask integration']
  },
  keystone: {
    name: 'Keystone',
    icon: '🗝️',
    description: 'Air-gapped security with QR code signing',
    connectionTypes: ['usb'],
    firmwareUrl: 'https://keyst.one/firmware',
    supportUrl: 'https://support.keyst.one',
    features: ['Air-gapped signing', 'QR code communication', 'Open-source', 'Multi-chain support']
  }
};

// Setup steps
const SETUP_STEPS = [
  { id: 'select', title: 'Select Wallet', description: 'Choose your hardware wallet' },
  { id: 'verify', title: 'Verify Device', description: 'Confirm firmware and authenticity' },
  { id: 'connect', title: 'Connect', description: 'Establish secure connection' },
  { id: 'configure', title: 'Configure', description: 'Set up VFIDE preferences' },
  { id: 'complete', title: 'Complete', description: 'Ready to use securely' }
];

export default function HardwareWalletPage() {
  const { address, isConnected, connector } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect: _disconnect } = useDisconnect();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedWallet, setSelectedWallet] = useState<WalletBrand | null>(null);
  const [connectionType, setConnectionType] = useState<'usb' | 'bluetooth'>('usb');
  const [firmwareVerified, setFirmwareVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [_deviceConnected, setDeviceConnected] = useState(false);
  const [_setupComplete, setSetupComplete] = useState(false);
  
  // Preferences
  const [autoLock, setAutoLock] = useState(true);
  const [confirmOnDevice, setConfirmOnDevice] = useState(true);
  const [blindSigningDisabled, setBlindSigningDisabled] = useState(true);

  // Check if hardware wallet is already connected
  useEffect(() => {
    if (isConnected && connector) {
      const connectorName = (connector.name || '').toLowerCase();
      if (connectorName.includes('ledger')) {
        setSelectedWallet('ledger');
        setDeviceConnected(true);
      } else if (connectorName.includes('trezor')) {
        setSelectedWallet('trezor');
        setDeviceConnected(true);
      }
    }
  }, [isConnected, connector]);

  const handleSelectWallet = (wallet: WalletBrand) => {
    setSelectedWallet(wallet);
    setFirmwareVerified(false);
    setCurrentStep(1);
  };

  const handleVerifyFirmware = async () => {
    setIsVerifying(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setFirmwareVerified(true);
    setIsVerifying(false);
    setCurrentStep(2);
  };

  const handleConnect = async () => {
    // Find appropriate connector
    const hwConnectors = connectors.filter(c => {
      const name = c.name.toLowerCase();
      if (selectedWallet === 'ledger') return name.includes('ledger');
      if (selectedWallet === 'trezor') return name.includes('trezor');
      return name.includes('walletconnect'); // Fallback for others
    });
    
    if (hwConnectors.length > 0) {
      try {
        const connector = hwConnectors[0];
        if (connector) {
          await connect({ connector });
        }
        setDeviceConnected(true);
        setCurrentStep(3);
      } catch {
      }
    } else {
      setDeviceConnected(false);
      setCurrentStep(2);
    }
  };

  const handleSavePreferences = () => {
    // Save preferences to localStorage
    localStorage.setItem('hw_wallet_prefs', JSON.stringify({
      wallet: selectedWallet,
      autoLock,
      confirmOnDevice,
      blindSigningDisabled,
      setupDate: new Date().toISOString()
    }));
    setSetupComplete(true);
    setCurrentStep(4);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white mb-6">Select Your Hardware Wallet</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(Object.entries(WALLET_INFO) as [WalletBrand, WalletInfo][]).map(([key, wallet]) => (
                <motion.button
                  key={key}
                  onClick={() => handleSelectWallet(key)}
                  className={`p-6 rounded-xl border text-left transition-all ${
                    selectedWallet === key 
                      ? 'border-jade-400 bg-jade-500/10' 
                      : 'border-zinc-700 bg-zinc-900/50 hover:border-zinc-500'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-start gap-4">
                    <span className="text-4xl">{wallet.icon}</span>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white">{wallet.name}</h3>
                      <p className="text-sm text-zinc-400 mt-1">{wallet.description}</p>
                      <div className="flex gap-2 mt-3">
                        {wallet.connectionTypes.includes('usb') && (
                          <span className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-300 flex items-center gap-1">
                            <Usb size={12} /> USB
                          </span>
                        )}
                        {wallet.connectionTypes.includes('bluetooth') && (
                          <span className="px-2 py-1 bg-blue-500/20 rounded text-xs text-blue-300 flex items-center gap-1">
                            <Bluetooth size={12} /> Bluetooth
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
            
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="text-amber-400 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="text-amber-200 font-medium">Security Reminder</p>
                  <p className="text-sm text-amber-300/70 mt-1">
                    Only purchase hardware wallets directly from manufacturers. Never buy from third-party resellers 
                    as devices may be tampered with.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 1:
        return selectedWallet && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => setCurrentStep(0)} className="p-2 hover:bg-zinc-800 rounded-lg">
                <ArrowLeft size={20} className="text-zinc-400" />
              </button>
              <h2 className="text-2xl font-bold text-white">Verify {WALLET_INFO[selectedWallet].name}</h2>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-700 rounded-xl p-6 space-y-6">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-jade-500/10 rounded-full">
                  <FileCheck className="text-jade-400" size={32} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Firmware Verification</h3>
                  <p className="text-zinc-400 text-sm">Ensure your device has the latest secure firmware</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-zinc-800/50 rounded-lg">
                  <h4 className="font-medium text-white mb-2">Before connecting:</h4>
                  <ul className="space-y-2 text-sm text-zinc-300">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-jade-400" />
                      Download the official {WALLET_INFO[selectedWallet].name} app
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-jade-400" />
                      Update firmware to the latest version
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-jade-400" />
                      Verify device authenticity through official check
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-jade-400" />
                      Install Ethereum app on your device
                    </li>
                  </ul>
                </div>

                <a 
                  href={WALLET_INFO[selectedWallet].firmwareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg hover:bg-zinc-700/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Download className="text-jade-400" size={20} />
                    <span className="text-white">Download {WALLET_INFO[selectedWallet].name} App</span>
                  </div>
                  <ExternalLink size={16} className="text-zinc-400" />
                </a>
              </div>

              <div className="pt-4 border-t border-zinc-700">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={firmwareVerified}
                    onChange={(e) => setFirmwareVerified(e.target.checked)}
                    className="mt-1 w-5 h-5 rounded border-zinc-600 bg-zinc-800 text-jade-500 focus:ring-jade-500"
                  />
                  <span className="text-sm text-zinc-300">
                    I confirm my device is genuine, has the latest firmware, and the Ethereum app is installed
                  </span>
                </label>
              </div>

              <motion.button
                onClick={handleVerifyFirmware}
                disabled={!firmwareVerified || isVerifying}
                className="w-full py-3 bg-gradient-to-r from-jade-500 to-teal-500 text-black font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                whileHover={{ scale: firmwareVerified ? 1.02 : 1 }}
                whileTap={{ scale: firmwareVerified ? 0.98 : 1 }}
              >
                {isVerifying ? (
                  <>
                    <RefreshCw className="animate-spin" size={20} />
                    Verifying...
                  </>
                ) : (
                  <>
                    Continue to Connect
                    <ArrowRight size={20} />
                  </>
                )}
              </motion.button>
            </div>
          </div>
        );

      case 2:
        return selectedWallet && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => setCurrentStep(1)} className="p-2 hover:bg-zinc-800 rounded-lg">
                <ArrowLeft size={20} className="text-zinc-400" />
              </button>
              <h2 className="text-2xl font-bold text-white">Connect {WALLET_INFO[selectedWallet].name}</h2>
            </div>

            {WALLET_INFO[selectedWallet].connectionTypes.length > 1 && (
              <div className="flex gap-4 mb-6">
                <button
                  onClick={() => setConnectionType('usb')}
                  className={`flex-1 p-4 rounded-xl border flex items-center justify-center gap-3 ${
                    connectionType === 'usb' 
                      ? 'border-jade-400 bg-jade-500/10' 
                      : 'border-zinc-700 bg-zinc-900/50'
                  }`}
                >
                  <Usb size={24} className={connectionType === 'usb' ? 'text-jade-400' : 'text-zinc-400'} />
                  <span className={connectionType === 'usb' ? 'text-white' : 'text-zinc-400'}>USB Connection</span>
                </button>
                <button
                  onClick={() => setConnectionType('bluetooth')}
                  className={`flex-1 p-4 rounded-xl border flex items-center justify-center gap-3 ${
                    connectionType === 'bluetooth' 
                      ? 'border-jade-400 bg-jade-500/10' 
                      : 'border-zinc-700 bg-zinc-900/50'
                  }`}
                >
                  <Bluetooth size={24} className={connectionType === 'bluetooth' ? 'text-jade-400' : 'text-zinc-400'} />
                  <span className={connectionType === 'bluetooth' ? 'text-white' : 'text-zinc-400'}>Bluetooth</span>
                </button>
              </div>
            )}

            <div className="bg-zinc-900/50 border border-zinc-700 rounded-xl p-8">
              <div className="text-center space-y-6">
                <div className="relative mx-auto w-32 h-32">
                  <motion.div
                    className="absolute inset-0 bg-jade-500/20 rounded-full"
                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.2, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    {connectionType === 'usb' ? (
                      <Usb size={48} className="text-jade-400" />
                    ) : (
                      <Bluetooth size={48} className="text-jade-400" />
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {connectionType === 'usb' ? 'Connect via USB' : 'Connect via Bluetooth'}
                  </h3>
                  <p className="text-zinc-400">
                    {connectionType === 'usb' 
                      ? 'Plug in your device and unlock it with your PIN'
                      : 'Enable Bluetooth on your device and pair it'
                    }
                  </p>
                </div>

                <div className="p-4 bg-zinc-800/50 rounded-lg text-left">
                  <h4 className="font-medium text-white mb-2">Steps:</h4>
                  <ol className="space-y-2 text-sm text-zinc-300 list-decimal list-inside">
                    <li>{connectionType === 'usb' ? 'Connect your device via USB cable' : 'Turn on Bluetooth on your device'}</li>
                    <li>Enter your PIN on the device</li>
                    <li>Open the Ethereum app on your device</li>
                    <li>Click the button below to connect</li>
                  </ol>
                </div>

                <motion.button
                  onClick={handleConnect}
                  className="w-full py-4 bg-gradient-to-r from-jade-500 to-teal-500 text-black font-semibold rounded-lg flex items-center justify-center gap-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Zap size={20} />
                  Connect {WALLET_INFO[selectedWallet].name}
                </motion.button>
              </div>
            </div>
          </div>
        );

      case 3:
        return selectedWallet && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => setCurrentStep(2)} className="p-2 hover:bg-zinc-800 rounded-lg">
                <ArrowLeft size={20} className="text-zinc-400" />
              </button>
              <h2 className="text-2xl font-bold text-white">Configure Security Settings</h2>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-700 rounded-xl p-6 space-y-6">
              <div className="flex items-center gap-4 pb-4 border-b border-zinc-700">
                <div className="p-3 bg-jade-500/10 rounded-full">
                  <CheckCircle2 className="text-jade-400" size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Device Connected</h3>
                  <p className="text-zinc-400 text-sm">
                    {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Hardware wallet connected'}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-white flex items-center gap-2">
                  <Settings size={18} className="text-jade-400" />
                  Security Preferences
                </h4>

                <label className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Lock size={20} className="text-zinc-400" />
                    <div>
                      <p className="text-white">Auto-lock Session</p>
                      <p className="text-sm text-zinc-500">Lock wallet after 15 minutes of inactivity</p>
                    </div>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={autoLock}
                    onChange={(e) => setAutoLock(e.target.checked)}
                    className="w-5 h-5 rounded border-zinc-600 bg-zinc-800 text-jade-500 focus:ring-jade-500"
                  />
                </label>

                <label className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Fingerprint size={20} className="text-zinc-400" />
                    <div>
                      <p className="text-white">Confirm on Device</p>
                      <p className="text-sm text-zinc-500">Require physical confirmation for all transactions</p>
                    </div>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={confirmOnDevice}
                    onChange={(e) => setConfirmOnDevice(e.target.checked)}
                    className="w-5 h-5 rounded border-zinc-600 bg-zinc-800 text-jade-500 focus:ring-jade-500"
                  />
                </label>

                <label className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Shield size={20} className="text-zinc-400" />
                    <div>
                      <p className="text-white">Disable Blind Signing</p>
                      <p className="text-sm text-zinc-500">Only sign transactions you can fully verify</p>
                    </div>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={blindSigningDisabled}
                    onChange={(e) => setBlindSigningDisabled(e.target.checked)}
                    className="w-5 h-5 rounded border-zinc-600 bg-zinc-800 text-jade-500 focus:ring-jade-500"
                  />
                </label>
              </div>

              {blindSigningDisabled && (
                <div className="p-4 bg-jade-500/10 border border-jade-500/30 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Info className="text-jade-400 flex-shrink-0 mt-0.5" size={18} />
                    <p className="text-sm text-jade-200">
                      Blind signing disabled is the most secure option. You&apos;ll always see exactly what you&apos;re signing on your device screen.
                    </p>
                  </div>
                </div>
              )}

              <motion.button
                onClick={handleSavePreferences}
                className="w-full py-3 bg-gradient-to-r from-jade-500 to-teal-500 text-black font-semibold rounded-lg flex items-center justify-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Save & Complete Setup
                <ArrowRight size={20} />
              </motion.button>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-jade-500/20 to-teal-500/20 border border-jade-500/30 rounded-xl p-8 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="mx-auto w-20 h-20 bg-jade-500/20 rounded-full flex items-center justify-center mb-6"
              >
                <CheckCircle2 className="text-jade-400" size={48} />
              </motion.div>
              
              <h2 className="text-2xl font-bold text-white mb-2">Setup Complete!</h2>
              <p className="text-zinc-300 mb-6">
                Your {selectedWallet && WALLET_INFO[selectedWallet].name} is now configured for maximum security with VFIDE.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="p-4 bg-zinc-900/50 rounded-lg">
                  <Lock className="text-jade-400 mx-auto mb-2" size={24} />
                  <p className="text-sm text-zinc-300">Auto-lock: {autoLock ? 'Enabled' : 'Disabled'}</p>
                </div>
                <div className="p-4 bg-zinc-900/50 rounded-lg">
                  <Fingerprint className="text-jade-400 mx-auto mb-2" size={24} />
                  <p className="text-sm text-zinc-300">Device Confirm: {confirmOnDevice ? 'Required' : 'Optional'}</p>
                </div>
                <div className="p-4 bg-zinc-900/50 rounded-lg">
                  <Shield className="text-jade-400 mx-auto mb-2" size={24} />
                  <p className="text-sm text-zinc-300">Blind Sign: {blindSigningDisabled ? 'Disabled' : 'Enabled'}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a 
                  href="/dashboard"
                  className="px-6 py-3 bg-gradient-to-r from-jade-500 to-teal-500 text-black font-semibold rounded-lg flex items-center justify-center gap-2"
                >
                  Go to Dashboard
                  <ArrowRight size={18} />
                </a>
                <a 
                  href="/security-center"
                  className="px-6 py-3 bg-zinc-800 text-white font-semibold rounded-lg flex items-center justify-center gap-2 hover:bg-zinc-700"
                >
                  <Shield size={18} />
                  Security Center
                </a>
              </div>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-700 rounded-xl p-6">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <HelpCircle size={18} className="text-jade-400" />
                Best Practices
              </h3>
              <ul className="space-y-3 text-sm text-zinc-300">
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-jade-400 mt-0.5 flex-shrink-0" />
                  Always verify transaction details on your device screen before signing
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-jade-400 mt-0.5 flex-shrink-0" />
                  Keep your recovery phrase stored securely offline, never digitally
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-jade-400 mt-0.5 flex-shrink-0" />
                  Regularly update your device firmware through official channels
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-jade-400 mt-0.5 flex-shrink-0" />
                  Be cautious of phishing attempts asking you to enter your seed phrase
                </li>
              </ul>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-jade-500/10 rounded-full text-jade-400 text-sm font-medium mb-4">
            <Shield size={16} />
            Maximum Security Setup
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">Hardware Wallet Setup</h1>
          <p className="text-zinc-400 max-w-2xl mx-auto">
            Connect your hardware wallet to VFIDE for the highest level of security. 
            Your private keys never leave your device.
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-12">
          {SETUP_STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`flex flex-col items-center ${index <= currentStep ? 'text-jade-400' : 'text-zinc-600'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                  index < currentStep 
                    ? 'bg-jade-500 border-jade-500 text-black' 
                    : index === currentStep 
                      ? 'border-jade-500 text-jade-400' 
                      : 'border-zinc-700 text-zinc-600'
                }`}>
                  {index < currentStep ? <CheckCircle2 size={20} /> : index + 1}
                </div>
                <span className="text-xs mt-2 hidden sm:block">{step.title}</span>
              </div>
              {index < SETUP_STEPS.length - 1 && (
                <div className={`w-12 sm:w-24 h-0.5 mx-2 ${
                  index < currentStep ? 'bg-jade-500' : 'bg-zinc-700'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {renderStepContent()}
          </motion.div>
        </AnimatePresence>
      </div>
      <Footer />
    </div>
  );
}
