import React, { useState } from 'react';
import { useTwoFactorAuth } from '@/hooks/useTwoFactorAuth';
import { TOTPSetup, TwoFactorMethod } from '@/config/security-advanced';

interface TwoFactorSetupProps {
  userEmail?: string;
  onComplete?: () => void;
  _onCancel?: () => void; // Reserved for future cancel button implementation
  className?: string;
}

export function TwoFactorSetup({
  userEmail,
  onComplete,
  _onCancel,
  className = ''
}: TwoFactorSetupProps) {
  const twoFactor = useTwoFactorAuth(userEmail);
  const [selectedMethod, setSelectedMethod] = useState<TwoFactorMethod | null>(null);
  const [totpSetup, setTotpSetup] = useState<TOTPSetup | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState(userEmail || '');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleInitiateTOTP = async () => {
    setLoading(true);
    setError('');
    try {
      const setup = await twoFactor.initiateTOTP();
      setTotpSetup(setup);
      setSelectedMethod('totp');
    } catch {
      setError('Failed to initialize authenticator app');
    } finally {
      setLoading(false);
    }
  };

  const handleEnableTOTP = async () => {
    if (!verificationCode || !totpSetup) return;
    
    setLoading(true);
    setError('');
    try {
      const result = await twoFactor.enableTOTP(verificationCode);
      if (result) {
        setSuccess(true);
        setTimeout(() => onComplete?.(), 1500);
      } else {
        setError('Invalid verification code. Please try again.');
      }
    } catch {
      setError('Failed to enable authenticator app');
    } finally {
      setLoading(false);
    }
  };

  const handleEnableSMS = async () => {
    if (!phoneNumber) return;
    
    setLoading(true);
    setError('');
    try {
      const result = await twoFactor.enableSMS(phoneNumber);
      if (result) {
        setSuccess(true);
        setTimeout(() => onComplete?.(), 1500);
      } else {
        setError('Failed to enable SMS authentication');
      }
    } catch {
      setError('Failed to enable SMS authentication');
    } finally {
      setLoading(false);
    }
  };

  const handleEnableEmail = async () => {
    if (!email) return;
    
    setLoading(true);
    setError('');
    try {
      const result = await twoFactor.enableEmail(email);
      if (result) {
        setSuccess(true);
        setTimeout(() => onComplete?.(), 1500);
      } else {
        setError('Failed to enable email authentication');
      }
    } catch {
      setError('Failed to enable email authentication');
    } finally {
      setLoading(false);
    }
  };

  const downloadBackupCodes = () => {
    if (!totpSetup) return;
    const blob = new Blob([totpSetup.backupCodes.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vfide-backup-codes-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (twoFactor.isEnabled) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 ${className}`}>
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">✅</span>
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Two-Factor Authentication Enabled
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Your account is protected with {twoFactor.method} authentication
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={onComplete}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Done
            </button>
            <button
              onClick={() => twoFactor.disable()}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
            >
              Disable 2FA
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          Set Up Two-Factor Authentication
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Add an extra layer of security to your account by requiring a second verification method.
        </p>

        {!selectedMethod && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={handleInitiateTOTP}
              disabled={loading}
              className="p-6 border-2 border-gray-300 dark:border-gray-600 rounded-xl hover:border-blue-500 dark:hover:border-blue-500 transition-colors text-center group"
            >
              <div className="text-4xl mb-3">📱</div>
              <div className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Authenticator App</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Use Google Authenticator, Authy, or similar app
              </div>
            </button>

            <button
              onClick={() => setSelectedMethod('sms')}
              disabled={loading}
              className="p-6 border-2 border-gray-300 dark:border-gray-600 rounded-xl hover:border-blue-500 dark:hover:border-blue-500 transition-colors text-center group"
            >
              <div className="text-4xl mb-3">💬</div>
              <div className="font-semibold text-gray-900 dark:text-gray-100 mb-2">SMS Text Message</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Receive codes via text message
              </div>
            </button>

            <button
              onClick={() => setSelectedMethod('email')}
              disabled={loading}
              className="p-6 border-2 border-gray-300 dark:border-gray-600 rounded-xl hover:border-blue-500 dark:hover:border-blue-500 transition-colors text-center group"
            >
              <div className="text-4xl mb-3">📧</div>
              <div className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Email</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Receive codes via email
              </div>
            </button>
          </div>
        )}

        {selectedMethod === 'totp' && totpSetup && (
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Step 1: Scan QR Code</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Scan this QR code with your authenticator app:
              </p>
              <div className="bg-white p-4 rounded-lg inline-block">
                <img src={totpSetup.qrCode} alt="QR Code" className="w-48 h-48" />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Or enter this key manually: <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">{totpSetup.secret}</code>
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Step 2: Verify Code</h3>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter 6-digit code"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                maxLength={6}
              />
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">📝 Save Backup Codes</h3>
              <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
                Keep these codes in a safe place. You&apos;ll need them if you lose access to your authenticator app.
              </p>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {totpSetup.backupCodes.slice(0, 6).map((code, i) => (
                  <code key={i} className="bg-white dark:bg-gray-800 px-3 py-2 rounded text-xs font-mono">
                    {code}
                  </code>
                ))}
              </div>
              <button
                onClick={downloadBackupCodes}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                💾 Download all backup codes
              </button>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-300">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleEnableTOTP}
                disabled={verificationCode.length !== 6 || loading}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? 'Verifying...' : 'Enable 2FA'}
              </button>
              <button
                onClick={() => {
                  setSelectedMethod(null);
                  setTotpSetup(null);
                  setVerificationCode('');
                }}
                className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-medium"
              >
                Back
              </button>
            </div>
          </div>
        )}

        {selectedMethod === 'sms' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+1 (555) 123-4567"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              />
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-300">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleEnableSMS}
                disabled={!phoneNumber || loading}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? 'Enabling...' : 'Enable SMS 2FA'}
              </button>
              <button
                onClick={() => setSelectedMethod(null)}
                className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-medium"
              >
                Back
              </button>
            </div>
          </div>
        )}

        {selectedMethod === 'email' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              />
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-300">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleEnableEmail}
                disabled={!email || loading}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? 'Enabling...' : 'Enable Email 2FA'}
              </button>
              <button
                onClick={() => setSelectedMethod(null)}
                className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-medium"
              >
                Back
              </button>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-green-700 dark:text-green-300 text-center">
            ✅ Two-factor authentication enabled successfully!
          </div>
        )}
      </div>
    </div>
  );
};
