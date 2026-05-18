'use client';

import { useState } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { OWNER_CONTROL_PANEL_ADDRESS } from '../config/contracts';

/**
 * Hook to verify if connected wallet is the owner
 */
export function useOwnerVerification() {
  const { address, isConnected } = useAccount();
  
  const { data: contractOwner } = useReadContract({
    address: OWNER_CONTROL_PANEL_ADDRESS,
    abi: [
      {
        name: 'owner',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'address' }],
      },
    ] as const,
    functionName: 'owner',
  });

  const isOwner = isConnected && address && contractOwner && 
    address.toLowerCase() === contractOwner.toLowerCase();

  return {
    isOwner,
    ownerAddress: contractOwner,
    connectedAddress: address,
    isConnected,
  };
}

/**
 * OwnerGuard component - shows warning if not owner
 */
export function OwnerGuard({ children }: { children: React.ReactNode }) {
  const { isOwner, isConnected, ownerAddress, connectedAddress } = useOwnerVerification();

  if (!isConnected) {
    return (
      <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <span className="text-4xl">🔒</span>
          <div>
            <h3 className="text-xl font-bold text-white mb-2">Wallet Not Connected</h3>
            <p className="text-slate-300">
              Please connect your wallet to access the control panel.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <span className="text-4xl">⚠️</span>
          <div>
            <h3 className="text-xl font-bold text-white mb-2">Access Denied</h3>
            <p className="text-slate-300 mb-4">
              You are not the owner of this contract. Only the owner can access control panel functions.
            </p>
            <div className="bg-black/30 rounded-lg p-4 font-mono text-sm">
              <div className="text-slate-400">Owner Address:</div>
              <div className="text-white break-all">{ownerAddress || 'Loading...'}</div>
              <div className="text-slate-400 mt-3">Your Address:</div>
              <div className="text-yellow-400 break-all">{connectedAddress}</div>
            </div>
            <p className="text-slate-400 text-sm mt-4">
              💡 If you believe this is an error, please contact the contract administrator.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Dangerous action warning banner
 */
export function DangerWarning({ message }: { message: string }) {
  return (
    <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6">
      <div className="flex items-center gap-3">
        <span className="text-3xl">⚠️</span>
        <div>
          <div className="text-white font-bold">Dangerous Operation</div>
          <div className="text-slate-300 text-sm">{message}</div>
        </div>
      </div>
    </div>
  );
}

/**
 * Confirmation modal component
 */
export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDangerous = false,
  details,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
  details?: Array<{ label: string; value: string }>;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-slate-900 border border-white/10 rounded-xl p-6 max-w-md w-full">
        <h3 className="text-2xl font-bold text-white mb-4">{title}</h3>
        
        {isDangerous && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2 text-red-400">
              <span className="text-xl">⚠️</span>
              <span className="font-bold">Warning</span>
            </div>
          </div>
        )}

        <p className="text-slate-300 mb-6">{message}</p>

        {details && details.length > 0 && (
          <div className="bg-black/30 rounded-lg p-4 mb-6 space-y-2">
            {details.map((detail, index) => (
              <div key={index} className="flex justify-between">
                <span className="text-slate-400">{detail.label}:</span>
                <span className="text-white font-mono text-sm">{detail.value}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors ${
              isDangerous
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-purple-600 hover:bg-purple-700'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Input validation utilities
 */
export const validateAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

export const validateBPS = (value: number): boolean => {
  return value >= 0 && value <= 10000 && Number.isInteger(value);
};

export const validatePercentage = (value: number): boolean => {
  return value >= 0 && value <= 100;
};

/**
 * Address input component with validation
 */
export function AddressInput({
  label,
  value,
  onChange,
  placeholder: _placeholder = '0x...',
  required = false,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  const [touched, setTouched] = useState(false);
  const isValid = !value || validateAddress(value);
  const showError = touched && value && !isValid;

  return (
    <div className="space-y-2">
      <label className="text-white font-medium">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) =>  onChange(e.target.value)}
        onBlur={() => setTouched(true)}
       
        disabled={disabled}
        className={`w-full px-4 py-2 bg-white/5 border rounded-lg text-white font-mono text-sm 
          focus:outline-none focus:ring-2 transition-all
          ${showError 
            ? 'border-red-500 focus:ring-red-500' 
            : 'border-white/10 focus:ring-purple-500'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      />
      {showError && (
        <p className="text-red-400 text-sm">Invalid Ethereum address format</p>
      )}
    </div>
  );
}

/**
 * Number input component with validation
 */
export function NumberInput({
  label,
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  placeholder: _placeholder,
  suffix,
  required = false,
  disabled = false,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  suffix?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  const [touched, setTouched] = useState(false);
  const isValid = value >= min && (!max || value <= max);
  const showError = touched && !isValid;

  return (
    <div className="space-y-2">
      <label className="text-white font-medium">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <div className="relative">
        <input
          type="number"
          value={value}
          onChange={(e) =>  onChange(Number(e.target.value))}
          onBlur={() => setTouched(true)}
          min={min}
          max={max}
          step={step}
         
          disabled={disabled}
          className={`w-full px-4 py-2 bg-white/5 border rounded-lg text-white 
            focus:outline-none focus:ring-2 transition-all
            ${showError 
              ? 'border-red-500 focus:ring-red-500' 
              : 'border-white/10 focus:ring-purple-500'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            ${suffix ? 'pr-16' : ''}
          `}
        />
        {suffix && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
            {suffix}
          </span>
        )}
      </div>
      {showError && (
        <p className="text-red-400 text-sm">
          Value must be between {min} and {max || '∞'}
        </p>
      )}
    </div>
  );
}

/**
 * Loading spinner component
 */
export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className={`animate-spin rounded-full border-2 border-white/20 border-t-white ${sizeClasses[size]}`} />
  );
}

/**
 * Transaction status component
 */
export function TransactionStatus({
  status,
  hash,
  error,
}: {
  status: 'idle' | 'pending' | 'success' | 'error';
  hash?: string;
  error?: string;
}) {
  if (status === 'idle') return null;

  return (
    <div className={`p-4 rounded-lg border ${
      status === 'pending' ? 'bg-blue-500/20 border-blue-500/50' :
      status === 'success' ? 'bg-green-500/20 border-green-500/50' :
      'bg-red-500/20 border-red-500/50'
    }`}>
      <div className="flex items-center gap-3">
        {status === 'pending' && <LoadingSpinner size="sm" />}
        {status === 'success' && <span className="text-2xl">✅</span>}
        {status === 'error' && <span className="text-2xl">❌</span>}
        <div className="flex-1">
          <div className="text-white font-medium">
            {status === 'pending' && 'Transaction Pending...'}
            {status === 'success' && 'Transaction Successful!'}
            {status === 'error' && 'Transaction Failed'}
          </div>
          {hash && (
            <div className="text-sm text-slate-300 font-mono mt-1">
              {hash.slice(0, 10)}...{hash.slice(-8)}
            </div>
          )}
          {error && (
            <div className="text-sm text-red-300 mt-1">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
