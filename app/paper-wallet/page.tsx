'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Footer } from '@/components/layout/Footer';
import QRCode from 'qrcode';
import { bytesToHex } from 'viem';
import { generateMnemonic, mnemonicToAccount, english } from 'viem/accounts';
import { 
  FileText,
  AlertTriangle,
  Shield,
  Printer,
  RefreshCw,
  Copy,
  Check,
  Eye,
  EyeOff,
  Lock,
  Key,
  Wallet,
  AlertCircle,
  CheckCircle,
  Fingerprint,
  Flame
} from 'lucide-react';


// Types
type WalletType = 'ethereum' | 'bitcoin' | 'multi';

interface GeneratedWallet {
  type: WalletType;
  address: string;
  privateKey: string;
  mnemonic: string;
  createdAt: Date;
}

const QRCodeDisplay = ({ data, size = 200, label }: { data: string; size?: number; label?: string }) => {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let mounted = true;
    setHasError(false);
    setDataUrl(null);

    QRCode.toDataURL(data, { width: size, margin: 1 })
      .then((url) => {
        if (mounted) setDataUrl(url);
      })
      .catch(() => {
        if (mounted) setHasError(true);
      });

    return () => {
      mounted = false;
    };
  }, [data, size]);

  return (
    <div className="flex flex-col items-center">
      <div className="bg-white rounded-lg p-2" style={{ width: size, height: size }}>
        {dataUrl ? (
          <img src={dataUrl} alt="QR code" width={size} height={size} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-zinc-500">
            {hasError ? 'QR unavailable' : 'Generating QR...'}
          </div>
        )}
      </div>
      {label && <p className="text-xs text-zinc-500 mt-2">{label}</p>}
    </div>
  );
};

export default function PaperWalletPage() {
  const [step, setStep] = useState<'intro' | 'generate' | 'display' | 'verify'>('intro');
  const [walletType, setWalletType] = useState<WalletType>('ethereum');
  const [wallet, setWallet] = useState<GeneratedWallet | null>(null);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [_copiedKey, setCopiedKey] = useState(false);
  const [_copiedMnemonic, setCopiedMnemonic] = useState(false);
  const [_verificationWords, setVerificationWords] = useState<string[]>([]);
  const [userVerification, setUserVerification] = useState<string[]>(['', '', '']);
  const [verificationError, setVerificationError] = useState(false);
  const [_isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // Security acknowledgments
  const [acknowledged, setAcknowledged] = useState({
    offline: false,
    secure: false,
    backup: false
  });

  const allAcknowledged = acknowledged.offline && acknowledged.secure && acknowledged.backup;

  // Generate wallet
  const handleGenerate = useCallback(() => {
    setIsGenerating(true);
    setGenerationError(null);
    setStep('generate');

    if (walletType === 'bitcoin') {
      setIsGenerating(false);
      setStep('intro');
      setGenerationError('Bitcoin address derivation is not available in this build.');
      return;
    }
    
    setTimeout(() => {
      const mnemonic = generateMnemonic(english);
      const account = mnemonicToAccount(mnemonic);
      const hdKey = account.getHdKey();
      const privateKeyBytes = hdKey.privateKey;

      if (!privateKeyBytes) {
        setIsGenerating(false);
        setStep('intro');
        setGenerationError('Failed to derive private key. Please try again.');
        return;
      }

      const privateKey = bytesToHex(privateKeyBytes);

      setWallet({
        type: walletType,
        address: account.address,
        privateKey,
        mnemonic,
        createdAt: new Date(),
      });

      const words = mnemonic.split(' ');
      const indices = [4, 12, 20];
      setVerificationWords(indices.map((i) => words[i] || ''));

      setIsGenerating(false);
      setStep('display');
    }, 500);
  }, [walletType]);

  // Copy to clipboard
  const handleCopy = useCallback((text: string, type: 'address' | 'key' | 'mnemonic') => {
    navigator.clipboard.writeText(text);
    if (type === 'address') {
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    } else if (type === 'key') {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } else {
      setCopiedMnemonic(true);
      setTimeout(() => setCopiedMnemonic(false), 2000);
    }
  }, []);

  // Print wallet
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // Verify mnemonic
  const handleVerify = useCallback(() => {
    if (!wallet) return;
    
    const words = wallet.mnemonic.split(' ');
    const indices = [4, 12, 20];
    const correct = indices.every((idx, i) => {
      const word = words[idx];
      return word && userVerification[i]?.toLowerCase().trim() === word.toLowerCase();
    });
    
    if (correct) {
      setStep('verify');
    } else {
      setVerificationError(true);
      setTimeout(() => setVerificationError(false), 3000);
    }
  }, [wallet, userVerification]);

  // Reset
  const handleReset = useCallback(() => {
    setWallet(null);
    setStep('intro');
    setShowPrivateKey(false);
    setShowMnemonic(false);
    setUserVerification(['', '', '']);
    setAcknowledged({ offline: false, secure: false, backup: false });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-area, .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
      
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-8 no-print">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 rounded-full text-amber-400 text-sm font-medium mb-4">
            <FileText size={16} />
            Offline Storage
          </div>
          <h1 className="text-4xl font-bold text-white">Paper Wallet Generator</h1>
          <p className="text-zinc-400 mt-2">Generate secure offline crypto storage</p>
        </div>

        {/* Security Warning Banner */}
        <div className="mb-8 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl no-print">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-amber-400 shrink-0 mt-1" size={20} />
            <div>
              <p className="font-semibold text-amber-300">Important Security Information</p>
              <p className="text-amber-200/80 text-sm mt-1">
                Paper wallets provide maximum security when generated offline. For best security,
                use this tool on an air-gapped computer that has never been connected to the internet.
              </p>
            </div>
          </div>
        </div>

        {/* Step 1: Introduction & Acknowledgments */}
        <AnimatePresence mode="wait">
          {step === 'intro' && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Wallet Type Selection */}
              <div className="p-6 bg-zinc-900/50 border border-zinc-700 rounded-xl">
                <h3 className="text-lg font-semibold text-white mb-4">Select Wallet Type</h3>
                {generationError && (
                  <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                    {generationError}
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { type: 'ethereum' as const, name: 'Ethereum', icon: '⟠', desc: 'ETH & ERC-20 tokens' },
                    { type: 'bitcoin' as const, name: 'Bitcoin', icon: '₿', desc: 'BTC' },
                    { type: 'multi' as const, name: 'Multi-Chain', icon: '🔗', desc: 'Universal seed phrase' }
                  ].map(({ type, name, icon, desc }) => (
                    <button
                      key={type}
                      onClick={() => setWalletType(type)}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        walletType === type
                          ? 'border-emerald-400 bg-emerald-500/10'
                          : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
                      }`}
                    >
                      <div className="text-3xl mb-2">{icon}</div>
                      <p className="font-semibold text-white">{name}</p>
                      <p className="text-sm text-zinc-400">{desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Security Acknowledgments */}
              <div className="p-6 bg-zinc-900/50 border border-zinc-700 rounded-xl">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Shield className="text-emerald-400" size={20} />
                  Security Checklist
                </h3>
                <p className="text-zinc-400 text-sm mb-4">
                  Please confirm you understand the following before generating your paper wallet:
                </p>
                
                <div className="space-y-3">
                  <label className="flex items-start gap-3 p-3 bg-zinc-800/50 rounded-lg cursor-pointer hover:bg-zinc-800">
                    <input
                      type="checkbox"
                      checked={acknowledged.offline}
                      onChange={(e) => setAcknowledged(prev => ({ ...prev, offline: e.target.checked }))}
                      className="mt-1 w-5 h-5 rounded border-zinc-600 text-emerald-500 focus:ring-emerald-500"
                    />
                    <div>
                      <p className="font-medium text-white">Generate Offline (Recommended)</p>
                      <p className="text-sm text-zinc-400">
                        For maximum security, use this on a device disconnected from the internet
                      </p>
                    </div>
                  </label>
                  
                  <label className="flex items-start gap-3 p-3 bg-zinc-800/50 rounded-lg cursor-pointer hover:bg-zinc-800">
                    <input
                      type="checkbox"
                      checked={acknowledged.secure}
                      onChange={(e) => setAcknowledged(prev => ({ ...prev, secure: e.target.checked }))}
                      className="mt-1 w-5 h-5 rounded border-zinc-600 text-emerald-500 focus:ring-emerald-500"
                    />
                    <div>
                      <p className="font-medium text-white">I understand private key security</p>
                      <p className="text-sm text-zinc-400">
                        Anyone with the private key or seed phrase can access my funds
                      </p>
                    </div>
                  </label>
                  
                  <label className="flex items-start gap-3 p-3 bg-zinc-800/50 rounded-lg cursor-pointer hover:bg-zinc-800">
                    <input
                      type="checkbox"
                      checked={acknowledged.backup}
                      onChange={(e) => setAcknowledged(prev => ({ ...prev, backup: e.target.checked }))}
                      className="mt-1 w-5 h-5 rounded border-zinc-600 text-emerald-500 focus:ring-emerald-500"
                    />
                    <div>
                      <p className="font-medium text-white">I will store this securely</p>
                      <p className="text-sm text-zinc-400">
                        I will keep my paper wallet in a secure, fireproof location and consider making multiple backups
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={!allAcknowledged}
                className={`w-full py-4 rounded-xl font-semibold text-lg flex items-center justify-center gap-2 ${
                  allAcknowledged
                    ? 'bg-linear-to-r from-emerald-500 to-teal-500 text-black'
                    : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                }`}
              >
                <Key size={20} />
                Generate Paper Wallet
              </button>

              {/* Best Practices */}
              <div className="p-6 bg-zinc-900/50 border border-zinc-700 rounded-xl">
                <h3 className="text-lg font-semibold text-white mb-4">Best Practices</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-emerald-500/10 rounded-lg">
                      <Flame className="text-emerald-400" size={18} />
                    </div>
                    <div>
                      <p className="font-medium text-white text-sm">Fireproof Storage</p>
                      <p className="text-xs text-zinc-400">Store in a fireproof safe</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-emerald-500/10 rounded-lg">
                      <Copy className="text-emerald-400" size={18} />
                    </div>
                    <div>
                      <p className="font-medium text-white text-sm">Multiple Copies</p>
                      <p className="text-xs text-zinc-400">Store backups in different locations</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-emerald-500/10 rounded-lg">
                      <Lock className="text-emerald-400" size={18} />
                    </div>
                    <div>
                      <p className="font-medium text-white text-sm">Laminate</p>
                      <p className="text-xs text-zinc-400">Protect from water damage</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-emerald-500/10 rounded-lg">
                      <EyeOff className="text-emerald-400" size={18} />
                    </div>
                    <div>
                      <p className="font-medium text-white text-sm">Private Printing</p>
                      <p className="text-xs text-zinc-400">Use a non-WiFi printer</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Generating Animation */}
          {step === 'generate' && (
            <motion.div
              key="generate"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-12 bg-zinc-900/50 border border-zinc-700 rounded-xl text-center"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="inline-block mb-6"
              >
                <RefreshCw className="text-emerald-400" size={48} />
              </motion.div>
              <h3 className="text-xl font-semibold text-white mb-2">Generating Secure Keys...</h3>
              <p className="text-zinc-400">Using cryptographically secure random number generation</p>
            </motion.div>
          )}

          {/* Display Wallet */}
          {step === 'display' && wallet && (
            <motion.div
              key="display"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Success Banner */}
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3">
                <CheckCircle className="text-emerald-400" size={24} />
                <div>
                  <p className="font-semibold text-emerald-300">Wallet Generated Successfully</p>
                  <p className="text-emerald-200/80 text-sm">
                    Created at {wallet.createdAt.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Printable Wallet */}
              <div ref={printRef} className="print-area p-8 bg-white rounded-xl text-black">
                <div className="border-4 border-black p-6">
                  {/* Header */}
                  <div className="text-center border-b-2 border-black pb-4 mb-6">
                    <h2 className="text-2xl font-bold">
                      {walletType.toUpperCase()} PAPER WALLET
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Generated: {wallet.createdAt.toLocaleDateString()}
                    </p>
                  </div>

                  {/* Public Address */}
                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold flex items-center gap-2">
                          <Wallet size={20} />
                          PUBLIC ADDRESS
                        </h3>
                        <p className="text-xs text-gray-500">Safe to share - for receiving funds</p>
                      </div>
                      <QRCodeDisplay data={wallet.address} size={120} />
                    </div>
                    <div className="p-3 bg-gray-100 rounded font-mono text-sm break-all">
                      {wallet.address}
                    </div>
                  </div>

                  {/* Private Key */}
                  <div className="mb-8 bg-red-50 p-4 rounded-lg border-2 border-red-200">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-red-800 flex items-center gap-2">
                          <Key size={20} />
                          PRIVATE KEY
                        </h3>
                        <p className="text-xs text-red-600">NEVER SHARE - Full control of funds</p>
                      </div>
                      <div className={showPrivateKey ? '' : 'no-print blur-lg'}>
                        <QRCodeDisplay data={wallet.privateKey} size={120} />
                      </div>
                    </div>
                    <div className={`p-3 bg-white rounded font-mono text-sm break-all border border-red-300 ${showPrivateKey ? '' : 'no-print blur-lg select-none'}`}>
                      {wallet.privateKey}
                    </div>
                    {!showPrivateKey && (
                      <div className="no-print mt-2 p-2 bg-yellow-100 border border-yellow-300 rounded text-xs text-yellow-800">
                        🔒 Private key hidden for security. Click &quot;Show Private Key&quot; below to reveal.
                      </div>
                    )}
                  </div>

                  {/* Seed Phrase */}
                  <div className="bg-amber-50 p-4 rounded-lg border-2 border-amber-200">
                    <h3 className="text-lg font-bold text-amber-800 flex items-center gap-2 mb-2">
                      <Fingerprint size={20} />
                      24-WORD RECOVERY PHRASE
                    </h3>
                    <p className="text-xs text-amber-600 mb-4">
                      Write these words in order. This recovers your wallet.
                    </p>
                    <div className={`grid grid-cols-4 gap-2 ${showMnemonic ? '' : 'no-print blur-lg select-none'}`}>
                      {wallet.mnemonic.split(' ').map((word, idx) => (
                        <div key={idx} className="p-2 bg-white rounded border border-amber-300 text-center">
                          <span className="text-xs text-amber-600">{idx + 1}.</span>{' '}
                          <span className="font-mono font-medium">{word}</span>
                        </div>
                      ))}
                    </div>
                    {!showMnemonic && (
                      <div className="no-print mt-2 p-2 bg-yellow-100 border border-yellow-300 rounded text-xs text-yellow-800">
                        🔒 Recovery phrase hidden for security. Click &quot;Show Seed Phrase&quot; below to reveal.
                      </div>
                    )}
                  </div>

                  {/* Security Notice */}
                  <div className="mt-6 p-4 border-2 border-dashed border-gray-400 text-center text-sm text-gray-600">
                    <AlertTriangle className="inline-block mb-1" size={16} />
                    <p className="font-semibold">SECURITY WARNING</p>
                    <p>Store this paper wallet in a secure location. Anyone with access to the private key or recovery phrase can steal your funds. Never take a photo or store digitally.</p>
                  </div>
                </div>
              </div>

              {/* Screen-Only Controls */}
              <div className="no-print space-y-4">
                {/* Quick Copy Buttons */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    onClick={() => handleCopy(wallet.address, 'address')}
                    className="p-4 bg-zinc-800 rounded-xl flex items-center justify-center gap-2 hover:bg-zinc-700"
                  >
                    {copiedAddress ? <Check className="text-emerald-400" size={18} /> : <Copy size={18} className="text-zinc-400" />}
                    <span className="text-white">Copy Address</span>
                  </button>
                  
                  <button
                    onClick={() => setShowPrivateKey(!showPrivateKey)}
                    className="p-4 bg-zinc-800 rounded-xl flex items-center justify-center gap-2 hover:bg-zinc-700"
                  >
                    {showPrivateKey ? <EyeOff size={18} className="text-zinc-400" /> : <Eye size={18} className="text-zinc-400" />}
                    <span className="text-white">{showPrivateKey ? 'Hide' : 'Show'} Private Key</span>
                  </button>
                  
                  <button
                    onClick={() => setShowMnemonic(!showMnemonic)}
                    className="p-4 bg-zinc-800 rounded-xl flex items-center justify-center gap-2 hover:bg-zinc-700"
                  >
                    {showMnemonic ? <EyeOff size={18} className="text-zinc-400" /> : <Eye size={18} className="text-zinc-400" />}
                    <span className="text-white">{showMnemonic ? 'Hide' : 'Show'} Seed Phrase</span>
                  </button>
                </div>

                {/* Print & Download */}
                <div className="flex gap-4">
                  <button
                    onClick={handlePrint}
                    className="flex-1 py-4 bg-linear-to-r from-emerald-500 to-teal-500 text-black font-semibold rounded-xl flex items-center justify-center gap-2"
                  >
                    <Printer size={20} />
                    Print Wallet
                  </button>
                  <button
                    onClick={handleReset}
                    className="px-6 py-4 bg-zinc-800 text-white rounded-xl flex items-center justify-center gap-2 hover:bg-zinc-700"
                  >
                    <RefreshCw size={20} />
                    New Wallet
                  </button>
                </div>

                {/* Verification Prompt */}
                <div className="p-6 bg-zinc-900/50 border border-zinc-700 rounded-xl">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <CheckCircle className="text-emerald-400" size={20} />
                    Verify Your Backup
                  </h3>
                  <p className="text-zinc-400 text-sm mb-4">
                    Before storing your paper wallet, verify you&apos;ve written down the recovery phrase correctly.
                    Enter words 5, 13, and 21 from your seed phrase:
                  </p>
                  
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    {[5, 13, 21].map((wordNum, idx) => (
                      <div key={wordNum}>
                        <label className="block text-sm text-zinc-400 mb-1">Word #{wordNum}</label>
                        <input
                          type="text"
                          value={userVerification[idx]}
                          onChange={(e) => {
                            const newVer = [...userVerification];
                            newVer[idx] = e.target.value;
                            setUserVerification(newVer);
                          }}
                          placeholder="Enter word"
                          className={`w-full px-4 py-2 bg-zinc-800 border rounded-lg text-white placeholder-zinc-500 focus:outline-none ${
                            verificationError ? 'border-red-500' : 'border-zinc-700 focus:border-emerald-500'
                          }`}
                        />
                      </div>
                    ))}
                  </div>
                  
                  {verificationError && (
                    <p className="text-red-400 text-sm mb-4 flex items-center gap-2">
                      <AlertCircle size={16} />
                      Words don&apos;t match. Please check your backup.
                    </p>
                  )}
                  
                  <button
                    onClick={handleVerify}
                    className="px-6 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30"
                  >
                    Verify Backup
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Verified */}
          {step === 'verify' && wallet && (
            <motion.div
              key="verify"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
              <div className="p-8 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.2 }}
                >
                  <CheckCircle className="text-emerald-400 mx-auto mb-4" size={64} />
                </motion.div>
                <h2 className="text-2xl font-bold text-white mb-2">Backup Verified!</h2>
                <p className="text-emerald-200">
                  Your paper wallet is ready for secure storage
                </p>
              </div>

              <div className="p-6 bg-zinc-900/50 border border-zinc-700 rounded-xl">
                <h3 className="text-lg font-semibold text-white mb-4">Your Wallet Summary</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg">
                    <span className="text-zinc-400">Type</span>
                    <span className="text-white font-medium capitalize">{wallet.type}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg">
                    <span className="text-zinc-400">Address</span>
                    <span className="text-white font-mono text-sm">
                      {wallet.address.slice(0, 10)}...{wallet.address.slice(-8)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg">
                    <span className="text-zinc-400">Created</span>
                    <span className="text-white">{wallet.createdAt.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={handlePrint}
                  className="flex-1 py-4 bg-linear-to-r from-emerald-500 to-teal-500 text-black font-semibold rounded-xl flex items-center justify-center gap-2"
                >
                  <Printer size={20} />
                  Print Again
                </button>
                <button
                  onClick={handleReset}
                  className="flex-1 py-4 bg-zinc-800 text-white rounded-xl flex items-center justify-center gap-2"
                >
                  <RefreshCw size={20} />
                  Generate New Wallet
                </button>
              </div>

              {/* Final Checklist */}
              <div className="p-6 bg-zinc-900/50 border border-zinc-700 rounded-xl">
                <h3 className="text-lg font-semibold text-white mb-4">Before You Go - Final Checklist</h3>
                <div className="space-y-2">
                  {[
                    'I have printed my paper wallet',
                    'I have stored the printout in a secure location',
                    'I have verified my backup is correct',
                    'I have cleared my browser history',
                    'I understand not to store this digitally'
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-2">
                      <div className="w-5 h-5 rounded border border-emerald-400 flex items-center justify-center">
                        <Check className="text-emerald-400" size={14} />
                      </div>
                      <span className="text-zinc-300 text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <Footer />
    </div>
  );
}
