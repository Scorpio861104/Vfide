export interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
}

export function getEthereumProvider(): EthereumProvider | null {
  if (typeof window === 'undefined') return null;
  const { ethereum } = window as Window & { ethereum?: EthereumProvider };
  return ethereum ?? null;
}

export async function requestEthereum<T>(
  provider: EthereumProvider,
  args: { method: string; params?: unknown[] },
  coerce: (value: unknown) => T
): Promise<T> {
  return coerce(await provider.request(args));
}

export function getProviderErrorCode(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return undefined;
  }

  const { code } = error as { code?: unknown };
  return typeof code === 'number' ? code : undefined;
}