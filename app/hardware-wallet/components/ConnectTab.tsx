'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Usb, CheckCircle, AlertCircle, Loader2, Bluetooth } from 'lucide-react';

type DeviceType = 'ledger' | 'trezor';
type ConnectStatus = 'idle' | 'connecting' | 'connected' | 'error' | 'unsupported';

export function ConnectTab() {
  const { address } = useAccount();
  const [deviceType, setDeviceType] = useState<DeviceType>('ledger');
  const [status, setStatus] = useState<ConnectStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [hidSupported, setHidSupported] = useState<boolean | null>(null);

  useEffect(() => {
    setHidSupported(typeof navigator !== 'undefined' && 'hid' in navigator);
  }, []);

  async function handleConnect() {
    if (!hidSupported) {
      setStatus('unsupported');
      return;
    }
    setStatus('connecting');
    setErrorMsg('');
    try {
      const filters: { vendorId?: number }[] =
        deviceType === 'ledger'
          ? [{ vendorId: 0x2c97 }]
          : [{ vendorId: 0x534c }, { vendorId: 0x1209 }];
       
      const devices = await (navigator as any).hid.requestDevice({ filters });
      if (devices && devices.length > 0) {
        setStatus('connected');
      } else {
        setStatus('idle');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Connection cancelled';
      setErrorMsg(msg);
      setStatus('error');
    }
  }

  return (
    <div className="space-y-6">
      {hidSupported === false && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <AlertCircle size={18} className="text-red-400 flex-shrink-0" />
          <div>
            <p className="text-sm text-red-300 font-medium">WebHID not supported</p>
            <p className="text-xs text-red-400/70 mt-0.5">Use Chrome or Edge on desktop for hardware wallet support.</p>
          </div>
        </div>
      )}

      <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
        <p className="text-sm font-semibold text-white mb-4">Select Device Type</p>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {(['ledger', 'trezor'] as DeviceType[]).map((d) => (
            <button
              key={d}
              onClick={() => setDeviceType(d)}
              className={`p-4 rounded-xl border text-sm font-semibold capitalize transition-colors ${
                deviceType === d
                  ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400'
                  : 'bg-white/3 border-white/10 text-gray-400 hover:border-white/20'
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        {status === 'connected' ? (
          <div className="flex flex-col items-center justify-center py-6 gap-3">
            <CheckCircle size={36} className="text-green-400" />
            <p className="text-green-400 font-semibold">Device Connected</p>
            <p className="text-xs text-gray-400">Your {deviceType} wallet is ready to sign transactions.</p>
          </div>
        ) : (
          <>
            <div className="flex gap-3">
              <button
                onClick={handleConnect}
                disabled={status === 'connecting' || hidSupported === false}
                className="flex items-center gap-2 flex-1 justify-center px-4 py-2.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {status === 'connecting' ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Usb size={14} />
                )}
                {status === 'connecting' ? 'Connecting…' : 'Connect via USB'}
              </button>
              <button
                disabled
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white/3 border border-white/10 text-gray-500 text-sm transition-colors cursor-not-allowed"
                title="Bluetooth pairing unavailable in this build"
              >
                <Bluetooth size={14} />
              </button>
            </div>

            {address && (
              <p className="text-xs text-gray-500 mt-3">
                Connected wallet: <span className="font-mono">{address.slice(0, 10)}…{address.slice(-6)}</span>
              </p>
            )}
          </>
        )}

        {status === 'error' && (
          <div className="flex items-center gap-2 mt-3 text-red-400 text-sm">
            <AlertCircle size={14} /> {errorMsg}
          </div>
        )}
      </div>

      <div className="bg-white/3 border border-white/10 rounded-xl p-4">
        <p className="text-xs text-gray-400 mb-2">Requirements</p>
        <ul className="space-y-1 text-xs text-gray-500">
          <li>• Chrome or Edge browser (desktop)</li>
          <li>• USB cable or Bluetooth pairing</li>
          <li>• Device unlocked with Ethereum app open (Ledger)</li>
          <li>• Device unlocked and on home screen (Trezor)</li>
        </ul>
      </div>
    </div>
  );
}
