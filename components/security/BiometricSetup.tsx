import React, { useState } from 'react';
import { useBiometricAuth } from '@/hooks/useBiometricAuth';
import { BiometricType } from '@/config/security-advanced';

interface BiometricSetupProps {
  userId?: string;
  onComplete?: () => void;
  _onCancel?: () => void; // Reserved for future cancel button implementation
  className?: string;
}

export function BiometricSetup({
  userId,
  onComplete,
  _onCancel,
  className = ''
}: BiometricSetupProps) {
  const biometric = useBiometricAuth(userId);
  const [credentialName, setCredentialName] = useState('');
  const [selectedType, setSelectedType] = useState<BiometricType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEnroll = async () => {
    if (!credentialName || !selectedType) return;
    
    setLoading(true);
    setError('');
    try {
      const credential = await biometric.enroll(credentialName, selectedType);
      if (credential) {
        setCredentialName('');
        setSelectedType(null);
      } else {
        setError('Failed to enroll biometric. Please try again.');
      }
    } catch {
      setError('Biometric enrollment failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (credentialId: string) => {
    await biometric.remove(credentialId);
  };

  if (!biometric.platformSupport.webauthn) {
    return (
      <div className={`bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6 ${className}`}>
        <div className="text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <h3 className="text-xl font-bold text-yellow-900 dark:text-yellow-100 mb-2">
            Biometric Authentication Not Supported
          </h3>
          <p className="text-yellow-800 dark:text-yellow-200">
            Your browser or device does not support biometric authentication (WebAuthn).
            Please use a modern browser or device with biometric capabilities.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          Biometric Authentication
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Use your fingerprint, face, or hardware security key to sign in securely.
        </p>

        {/* Platform Support */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className={`p-3 rounded-lg text-center ${biometric.platformSupport.fingerprint ? 'bg-green-50 dark:bg-green-900/20' : 'bg-gray-50 dark:bg-gray-900'}`}>
            <div className="text-2xl mb-1">{biometric.platformSupport.fingerprint ? '✅' : '❌'}</div>
            <div className="text-xs font-medium">Fingerprint</div>
          </div>
          <div className={`p-3 rounded-lg text-center ${biometric.platformSupport.faceId ? 'bg-green-50 dark:bg-green-900/20' : 'bg-gray-50 dark:bg-gray-900'}`}>
            <div className="text-2xl mb-1">{biometric.platformSupport.faceId ? '✅' : '❌'}</div>
            <div className="text-xs font-medium">Face ID</div>
          </div>
          <div className={`p-3 rounded-lg text-center ${biometric.platformSupport.hardwareKey ? 'bg-green-50 dark:bg-green-900/20' : 'bg-gray-50 dark:bg-gray-900'}`}>
            <div className="text-2xl mb-1">{biometric.platformSupport.hardwareKey ? '✅' : '❌'}</div>
            <div className="text-xs font-medium">Hardware Key</div>
          </div>
          <div className={`p-3 rounded-lg text-center ${biometric.platformSupport.webauthn ? 'bg-green-50 dark:bg-green-900/20' : 'bg-gray-50 dark:bg-gray-900'}`}>
            <div className="text-2xl mb-1">{biometric.platformSupport.webauthn ? '✅' : '❌'}</div>
            <div className="text-xs font-medium">Passkeys</div>
          </div>
        </div>

        {/* Enrolled Credentials */}
        {biometric.credentials.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Enrolled Credentials</h3>
            <div className="space-y-2">
              {biometric.credentials.map((cred) => (
                <div
                  key={cred.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-gray-100">{cred.name}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {cred.type} • Added {cred.createdAt.toLocaleDateString()}
                      {cred.lastUsed && ` • Last used ${cred.lastUsed.toLocaleDateString()}`}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemove(cred.id)}
                    className="px-3 py-1 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add New Credential */}
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Add New Credential</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Credential Name
            </label>
            <input
              type="text"
              value={credentialName}
              onChange={(e) =>  setCredentialName(e.target.value)}
             
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setSelectedType('passkey')}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  selectedType === 'passkey'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
                }`}
              >
                <div className="text-2xl mb-2">🔑</div>
                <div className="font-medium text-gray-900 dark:text-gray-100">Passkey</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Platform biometric</div>
              </button>
              <button
                onClick={() => setSelectedType('hardware-key')}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  selectedType === 'hardware-key'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
                }`}
              >
                <div className="text-2xl mb-2">🔐</div>
                <div className="font-medium text-gray-900 dark:text-gray-100">Hardware Key</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">YubiKey, etc.</div>
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleEnroll}
              disabled={!credentialName || !selectedType || loading}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? 'Enrolling...' : 'Add Credential'}
            </button>
            {onComplete && (
              <button
                onClick={onComplete}
                className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-medium"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
