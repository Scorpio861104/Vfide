'use client';

import { useEffect, useState } from 'react';
import { useAppLock } from './AppLockProvider';
import { useBiometricAuth } from '@/hooks/useBiometricAuth';
import {
  clearPinMaterial,
  DEFAULT_PIN_POLICY,
  endSession,
  hashPin,
  thresholdWeiToVfide,
  validatePin,
  vfideToThresholdWei,
} from '@/lib/security/appLock';
import { Fingerprint, KeyRound, Lock, Settings as SettingsIcon, Info } from 'lucide-react';

export function AppLockSettings() {
  const { config, setConfig, lock } = useAppLock();
  const biometric = useBiometricAuth();

  const [thresholdInput, setThresholdInput] = useState(() => thresholdWeiToVfide(config.thresholdWei));
  const [sessionMinutes, setSessionMinutes] = useState(() => Math.round(config.sessionTimeoutMs / 60000));
  const [thresholdError, setThresholdError] = useState<string | null>(null);

  const [showPinSetup, setShowPinSetup] = useState(false);
  const [pin1, setPin1] = useState('');
  const [pin2, setPin2] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinSaving, setPinSaving] = useState(false);

  useEffect(() => {
    setThresholdInput(thresholdWeiToVfide(config.thresholdWei));
  }, [config.thresholdWei]);

  useEffect(() => {
    setSessionMinutes(Math.round(config.sessionTimeoutMs / 60000));
  }, [config.sessionTimeoutMs]);

  const webAuthnReady =
    biometric.platformSupport?.webauthn === true && biometric.hasCredentials;
  const webAuthnSelected = config.methods.includes('webauthn');
  const pinReady = !!config.pinHashB64;
  const pinSelected = config.methods.includes('pin');

  const toggleEnabled = () => {
    setConfig({ ...config, enabled: !config.enabled });
  };

  const toggleWebAuthn = () => {
    if (!webAuthnReady) return;
    const methods = webAuthnSelected
      ? config.methods.filter((m) => m !== 'webauthn')
      : Array.from(new Set([...config.methods, 'webauthn' as const]));
    setConfig({ ...config, methods });
  };

  const togglePin = () => {
    if (pinSelected) {
      // Removing PIN: wipe the hash too.
      const next = clearPinMaterial(config);
      setConfig(next);
    } else if (pinReady) {
      setConfig({
        ...config,
        methods: Array.from(new Set([...config.methods, 'pin' as const])),
      });
    } else {
      // No PIN configured yet — open the setup form.
      setShowPinSetup(true);
      setPin1('');
      setPin2('');
      setPinError(null);
    }
  };

  const saveThreshold = () => {
    try {
      const wei = vfideToThresholdWei(thresholdInput);
      setConfig({ ...config, thresholdWei: wei });
      setThresholdError(null);
    } catch (err) {
      setThresholdError(err instanceof Error ? err.message : 'Invalid threshold.');
    }
  };

  const saveSessionTimeout = (minutes: number) => {
    const clamped = Math.max(1, Math.min(60 * 24, Math.round(minutes)));
    setConfig({ ...config, sessionTimeoutMs: clamped * 60 * 1000 });
    setSessionMinutes(clamped);
  };

  const submitPinSetup = async () => {
    const v = validatePin(pin1);
    if (v) {
      setPinError(v);
      return;
    }
    if (pin1 !== pin2) {
      setPinError('PINs do not match.');
      return;
    }
    setPinSaving(true);
    try {
      const material = await hashPin(pin1);
      setConfig({
        ...config,
        ...material,
        methods: Array.from(new Set([...config.methods, 'pin' as const])),
        failureCount: 0,
        lockedUntilMs: 0,
      });
      setShowPinSetup(false);
      setPin1('');
      setPin2('');
      setPinError(null);
    } catch (err) {
      setPinError(err instanceof Error ? err.message : 'Failed to set PIN.');
    } finally {
      setPinSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/8 to-white/2 backdrop-blur-xl p-6 space-y-6">
      <div className="flex items-center gap-3">
        <SettingsIcon className="w-6 h-6 text-cyan-400" />
        <h2 className="text-2xl font-bold text-white">App Lock</h2>
      </div>

      <div className="rounded-lg bg-cyan-500/10 border border-cyan-500/30 p-3 text-xs text-cyan-100 flex gap-2">
        <Info size={14} className="flex-shrink-0 mt-0.5" />
        <span>
          App Lock is a <em>device-only</em> speed-bump. It prompts on this device
          before signing transactions above your threshold. It does <em>not</em>{' '}
          stop an attacker who has imported your wallet key into their own app —
          the 7-day withdrawal queue and your guardians are what handles that
          threat.
        </span>
      </div>

      {/* Master switch */}
      <ToggleRow
        title="Require App Lock for large transactions"
        description="Off by default. When on, transactions above your threshold prompt for verification on this device."
        checked={config.enabled}
        onChange={toggleEnabled}
        disabled={config.methods.length === 0}
        disabledHint={
          config.methods.length === 0
            ? 'Add at least one method (biometric or PIN) below first.'
            : undefined
        }
      />

      {/* Biometric method */}
      <div className="space-y-2">
        <ToggleRow
          title="Use device biometric (WebAuthn)"
          description={
            webAuthnReady
              ? 'Face ID / Touch ID / Windows Hello on this device.'
              : 'No passkey enrolled yet on this device. Set one up in Wallet → Biometric first.'
          }
          checked={webAuthnSelected}
          onChange={toggleWebAuthn}
          disabled={!webAuthnReady}
          icon={<Fingerprint size={18} />}
        />
      </div>

      {/* PIN method */}
      <div className="space-y-2">
        <ToggleRow
          title="Use PIN"
          description={
            pinReady
              ? '6+ characters, alphanumeric or numeric. Stored locally as a PBKDF2 hash with 600k iterations.'
              : 'No PIN set yet. Toggle on to create one.'
          }
          checked={pinSelected}
          onChange={togglePin}
          icon={<KeyRound size={18} />}
        />
        {pinReady && (
          <button
            className="text-xs text-cyan-400 hover:text-cyan-300 underline"
            onClick={() => {
              setShowPinSetup(true);
              setPin1('');
              setPin2('');
              setPinError(null);
            }}
          >
            Change PIN
          </button>
        )}

        {showPinSetup && (
          <div className="rounded-lg border border-cyan-500/30 bg-gray-900/60 p-4 space-y-3">
            <div className="text-sm text-white font-medium">
              {pinReady ? 'Change your PIN' : 'Create a PIN'}
            </div>
            <input
              type="password"
              inputMode="text"
              autoComplete="new-password"
              placeholder={`PIN (${DEFAULT_PIN_POLICY.minLength}–${DEFAULT_PIN_POLICY.maxLength} chars)`}
              value={pin1}
              onChange={(e) => setPin1(e.target.value)}
              className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-white"
            />
            <input
              type="password"
              autoComplete="new-password"
              placeholder="Confirm PIN"
              value={pin2}
              onChange={(e) => setPin2(e.target.value)}
              className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-white"
            />
            {pinError && <div className="text-xs text-red-400">{pinError}</div>}
            <div className="flex gap-2">
              <button
                onClick={submitPinSetup}
                disabled={pinSaving}
                className="flex-1 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium disabled:opacity-50"
              >
                {pinSaving ? 'Saving…' : 'Save PIN'}
              </button>
              <button
                onClick={() => {
                  setShowPinSetup(false);
                  setPin1('');
                  setPin2('');
                  setPinError(null);
                }}
                className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm"
              >
                Cancel
              </button>
            </div>
            <div className="text-[10px] text-gray-500">
              Forget your PIN? Remove it from this panel on another logged-in
              device, or clear browser storage to wipe AppLock on this device.
              There&apos;s no server-side recovery — that&apos;s intentional.
            </div>
          </div>
        )}
      </div>

      {/* Threshold */}
      <div className="space-y-2">
        <div className="text-sm font-medium text-white">Threshold</div>
        <div className="text-xs text-gray-400">
          Transactions at or above this amount prompt for unlock. Set to 0 to
          always require unlock (most strict).
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            inputMode="decimal"
            value={thresholdInput}
            onChange={(e) => setThresholdInput(e.target.value)}
            className="flex-1 rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-white"
            placeholder="e.g. 100"
          />
          <span className="self-center text-gray-400 text-sm">VFIDE</span>
          <button
            onClick={saveThreshold}
            className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium"
          >
            Save
          </button>
        </div>
        {thresholdError && <div className="text-xs text-red-400">{thresholdError}</div>}
      </div>

      {/* Session timeout */}
      <div className="space-y-2">
        <div className="text-sm font-medium text-white">Session timeout</div>
        <div className="text-xs text-gray-400">
          How long an unlock stays valid before you&apos;re prompted again. Default
          15 minutes. Range 1 minute – 24 hours.
        </div>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={1}
            max={120}
            step={1}
            value={Math.min(sessionMinutes, 120)}
            onChange={(e) => saveSessionTimeout(Number(e.target.value))}
            className="flex-1"
          />
          <input
            type="number"
            min={1}
            max={60 * 24}
            value={sessionMinutes}
            onChange={(e) => saveSessionTimeout(Number(e.target.value))}
            className="w-20 rounded-lg bg-gray-800 border border-gray-700 px-2 py-1 text-white text-sm"
          />
          <span className="text-gray-400 text-sm">min</span>
        </div>
      </div>

      {/* Lock now */}
      <button
        onClick={() => {
          endSession();
          lock();
        }}
        className="w-full py-3 rounded-lg bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium flex items-center justify-center gap-2"
      >
        <Lock size={16} /> Lock now (end current session)
      </button>
    </div>
  );
}

interface ToggleRowProps {
  title: string;
  description: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  disabledHint?: string;
  icon?: React.ReactNode;
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
  disabled,
  disabledHint,
  icon,
}: ToggleRowProps) {
  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg border ${
        disabled ? 'border-gray-800 opacity-60' : 'border-gray-700'
      } bg-gray-900/40`}
    >
      {icon && <div className="text-cyan-400 mt-1">{icon}</div>}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-white">{title}</div>
        <div className="text-xs text-gray-400 mt-0.5">{description}</div>
        {disabled && disabledHint && (
          <div className="text-xs text-amber-400 mt-1">{disabledHint}</div>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
          checked ? 'bg-cyan-600' : 'bg-gray-700'
        } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span
          className={`inline-block h-5 w-5 rounded-full bg-white transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
}
