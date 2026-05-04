import React from 'react';

interface TwoFactorSetupProps {
  userEmail?: string;
  onComplete?: () => void;
  _onCancel?: () => void;
  className?: string;
}

/**
 * P2-H-06: 2FA is not available in this release.
 * The backend verify endpoint was never implemented, so this component
 * renders a "coming soon" notice instead of a deceptive setup flow.
 */
export function TwoFactorSetup({
  onComplete,
  _onCancel,
  className = ''
}: TwoFactorSetupProps) {
  // Intentionally unused — 2FA feature is not implemented in this release.
  void onComplete;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 ${className}`}>
      <div className="text-center">
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">🔒</span>
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Two-Factor Authentication
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Two-factor authentication is not available in this release. It will be enabled in a future update.
        </p>
      </div>
    </div>
  );
}
