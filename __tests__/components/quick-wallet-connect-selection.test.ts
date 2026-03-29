import { describe, expect, it } from '@jest/globals';
import { selectPrimaryConnector } from '@/components/wallet/QuickWalletConnect';

describe('selectPrimaryConnector', () => {
  it('prefers WalletConnect on mobile when identified by name', () => {
    const connectors = [
      { id: 'custom-injected', name: 'Injected' },
      { id: 'custom-wc', name: 'WalletConnect' },
      { id: 'metaMask', name: 'Browser Wallet' },
    ];

    expect(selectPrimaryConnector(connectors, true)).toEqual(connectors[1]);
  });

  it('prefers MetaMask on desktop across known id variants', () => {
    const connectors = [
      { id: 'walletConnect', name: 'WalletConnect' },
      { id: 'io.metamask', name: 'Injected' },
      { id: 'injected', name: 'Injected Fallback' },
    ];

    expect(selectPrimaryConnector(connectors, false)).toEqual(connectors[1]);
  });

  it('falls back to injected when preferred wallet-specific connectors are unavailable', () => {
    const connectors = [
      { id: 'injected', name: 'Injected' },
      { id: 'rainbow', name: 'Rainbow' },
    ];

    expect(selectPrimaryConnector(connectors, false)).toEqual(connectors[0]);
    expect(selectPrimaryConnector(connectors, true)).toEqual(connectors[0]);
  });
});