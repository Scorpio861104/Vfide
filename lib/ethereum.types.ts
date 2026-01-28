/**
 * Ethereum Provider Type Definitions
 * 
 * Proper TypeScript interfaces for window.ethereum
 * Ensures type safety when interacting with MetaMask and other providers
 */

export interface EthereumProvider {
  isMetaMask?: boolean;
  isCoinbaseWallet?: boolean;
  isTrust?: boolean;
  isRabby?: boolean;
  isConnected(): boolean;
  request(args: { method: string; params?: Array<unknown> }): Promise<unknown>;
  on(event: string, handler: (...args: unknown[]) => void): void;
  removeListener(event: string, handler: (...args: unknown[]) => void): void;
  selectedAddress: string | null;
  chainId: string | null;
  networkVersion: string | null;
}

export interface WindowWithEthereum extends Window {
  ethereum?: EthereumProvider;
}

/**
 * Type guard to check if window has ethereum provider
 */
export function hasEthereumProvider(
  window: Window
): window is WindowWithEthereum {
  return 'ethereum' in window && window.ethereum !== undefined;
}

/**
 * Safely get ethereum provider with type checking
 */
export function getEthereumProvider(): EthereumProvider | null {
  if (typeof window === 'undefined') return null;
  if (!hasEthereumProvider(window)) return null;
  return window.ethereum ?? null;
}

/**
 * Check if MetaMask is installed
 */
export function isMetaMaskInstalled(): boolean {
  const provider = getEthereumProvider();
  return provider?.isMetaMask === true;
}

/**
 * Check if any ethereum provider is available
 */
export function isEthereumAvailable(): boolean {
  return getEthereumProvider() !== null;
}
