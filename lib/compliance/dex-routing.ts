/**
 * DEX Routing — Multi-currency acceptance via third-party DEX
 * 
 * When a buyer wants to pay with USDC but the merchant receives VFIDE:
 * 1. Frontend builds a swap tx (USDC → VFIDE) using Uniswap/1inch router
 * 2. The user's wallet signs and submits the tx DIRECTLY to the DEX
 * 3. VFIDE is NOT a counterparty — it's a UI that routes to existing DEX contracts
 * 4. The swapped VFIDE goes directly to the merchant's vault
 * 
 * This is the same model as any DEX aggregator frontend (1inch, Paraswap).
 * The frontend is just a UI. The swap happens between the user and the DEX contract.
 * 
 * VFIDE never holds tokens in transit. The atomic swap goes:
 * buyer wallet → DEX contract → merchant vault (in one transaction)
 */

// ── Types ───────────────────────────────────────────────────────────────────

export interface SwapRoute {
  dex: string;                // 'uniswap-v3' | '1inch' | 'paraswap'
  inputToken: string;         // Token the buyer is paying with
  outputToken: string;        // Always VFIDE (or what merchant receives)
  inputAmount: bigint;
  expectedOutput: bigint;
  minimumOutput: bigint;      // After slippage
  priceImpact: number;        // Percentage
  routerAddress: string;      // On-chain DEX router address
  calldata: string;           // Encoded swap calldata
  gasEstimate: bigint;
}

export interface SwapQuoteRequest {
  fromToken: string;          // Token address or symbol
  toToken: string;
  amount: string;             // In fromToken decimals
  slippageBps: number;        // e.g., 50 = 0.5%
  recipient: string;          // Merchant vault address (funds go directly there)
  chainId: number;
}

// ── DEX Integration ─────────────────────────────────────────────────────────

/**
 * Get swap quote from DEX aggregator.
 * 
 * IMPORTANT: This calls the DEX's API, not VFIDE's.
 * VFIDE is just relaying the request to get a quote.
 * The actual swap is signed by the user and submitted to the DEX contract.
 */
export async function getSwapQuote(request: SwapQuoteRequest): Promise<SwapRoute | null> {
  // Option 1: 1inch API (recommended — best aggregation)
  try {
    const response = await fetch(
      `https://api.1inch.dev/swap/v6.0/${request.chainId}/swap?` +
      new URLSearchParams({
        src: request.fromToken,
        dst: request.toToken,
        amount: request.amount,
        from: request.recipient, // Will be replaced with user address at sign time
        receiver: request.recipient,
        slippage: (request.slippageBps / 100).toString(),
        disableEstimate: 'true',
      }),
      {
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_1INCH_API_KEY || ''}`,
        },
      }
    );

    if (!response.ok) return null;
    const data = await response.json();

    return {
      dex: '1inch',
      inputToken: request.fromToken,
      outputToken: request.toToken,
      inputAmount: BigInt(request.amount),
      expectedOutput: BigInt(data.toAmount || '0'),
      minimumOutput: BigInt(data.toAmount || '0') * BigInt(10000 - request.slippageBps) / BigInt(10000),
      priceImpact: 0, // 1inch doesn't always return this
      routerAddress: data.tx?.to || '',
      calldata: data.tx?.data || '',
      gasEstimate: BigInt(data.tx?.gas || '300000'),
    };
  } catch {
    return null;
  }
}

/**
 * Check if a direct VFIDE transfer is possible (no swap needed).
 * If the buyer already holds VFIDE, skip the DEX entirely.
 */
export function isDirectTransferPossible(
  buyerToken: string,
  merchantReceiveToken: string
): boolean {
  // If buyer is paying with the same token the merchant wants, no swap needed
  return buyerToken.toLowerCase() === merchantReceiveToken.toLowerCase();
}

/**
 * Build the final transaction for the user's wallet to sign.
 * 
 * Two paths:
 * 1. Direct transfer: buyer has VFIDE, send directly to merchant vault
 * 2. Swap + transfer: buyer has USDC, swap via DEX, output goes to merchant vault
 * 
 * In BOTH cases, VFIDE (the entity) never touches the funds.
 * The user's wallet signs the tx directly with the target contract.
 */
export function buildPaymentTransaction(
  route: SwapRoute | null,
  directTransfer: {
    tokenAddress: string;
    amount: bigint;
    recipientVault: string;
  } | null
): { to: string; data: string; value: bigint } | null {
  if (directTransfer) {
    // ERC20 transfer — user → merchant vault
    // ABI encode: transfer(address to, uint256 amount)
    const transferSelector = '0xa9059cbb';
    const paddedAddress = directTransfer.recipientVault.slice(2).padStart(64, '0');
    const paddedAmount = directTransfer.amount.toString(16).padStart(64, '0');

    return {
      to: directTransfer.tokenAddress,
      data: `${transferSelector}${paddedAddress}${paddedAmount}`,
      value: BigInt(0),
    };
  }

  if (route) {
    // DEX swap — user → DEX router → merchant vault
    // The calldata already encodes the swap with the merchant as recipient
    return {
      to: route.routerAddress,
      data: route.calldata,
      value: BigInt(0), // For ERC20→ERC20 swaps, no ETH value
    };
  }

  return null;
}
